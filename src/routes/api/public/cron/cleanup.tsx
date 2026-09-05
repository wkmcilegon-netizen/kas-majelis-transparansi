import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Pembersihan berkala (mingguan/bulanan):
 * - hapus acara yang lebih dari 1 tahun beserta file pamfletnya
 * - hapus file pamflet yatim di storage
 * - hapus pengajuan yang ditolak
 * - hapus catatan aktivitas lebih dari 6 bulan
 * - hapus rincian transaksi lebih dari 1 tahun, nilainya dipindah ke saldo warisan
 */
export const Route = createFileRoute("/api/public/cron/cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();
        const yearAgo = new Date(now - YEAR_MS).toISOString();
        const sixMonthsAgo = new Date(now - 182 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Acara lama + pamfletnya
        const { data: oldEvents } = await supabaseAdmin
          .from("events")
          .select("id, pamphlet_url")
          .lt("created_at", yearAgo);
        const oldFiles = (oldEvents ?? [])
          .map((e) => e.pamphlet_url)
          .filter(Boolean) as string[];
        if (oldFiles.length) await supabaseAdmin.storage.from("pamflet").remove(oldFiles);
        if (oldEvents?.length) {
          await supabaseAdmin
            .from("events")
            .delete()
            .in("id", oldEvents.map((e) => e.id));
        }

        // 2. File pamflet yatim
        const { data: events } = await supabaseAdmin.from("events").select("pamphlet_url");
        const used = new Set((events ?? []).map((e) => e.pamphlet_url).filter(Boolean) as string[]);
        const { data: files } = await supabaseAdmin.storage.from("pamflet").list("", { limit: 1000 });
        const orphans = (files ?? []).map((f) => f.name).filter((n) => !used.has(n));
        if (orphans.length) await supabaseAdmin.storage.from("pamflet").remove(orphans);

        // 3. Pengajuan ditolak + catatan aktivitas lama
        const { count: rejected } = await supabaseAdmin
          .from("transactions")
          .delete({ count: "exact" })
          .eq("status", "rejected");
        const { count: logs } = await supabaseAdmin
          .from("activity_logs")
          .delete({ count: "exact" })
          .lt("created_at", sixMonthsAgo);

        // 4. Transaksi lama -> saldo warisan
        const { data: old } = await supabaseAdmin
          .from("transactions")
          .select("id, kind, amount, target")
          .eq("status", "approved")
          .lt("created_at", yearAgo);
        if (old?.length) {
          const net: Record<string, number> = { acara: 0, internal: 0 };
          for (const t of old) {
            net[t.target] = (net[t.target] ?? 0) + (t.kind === "income" ? 1 : -1) * Number(t.amount);
          }
          const { data: carries } = await supabaseAdmin.from("balance_carry").select("target, amount");
          for (const target of Object.keys(net)) {
            const prev = Number(carries?.find((c) => c.target === target)?.amount ?? 0);
            await supabaseAdmin.from("balance_carry").upsert({
              target,
              amount: prev + (net[target] ?? 0),
              updated_at: new Date().toISOString(),
            });
          }
          await supabaseAdmin
            .from("transactions")
            .delete()
            .in("id", old.map((t) => t.id));
        }

        const report = {
          ok: true,
          ranAt: new Date().toISOString(),
          deletedEvents: oldEvents?.length ?? 0,
          deletedEventFiles: oldFiles.length,
          deletedOrphanFiles: orphans.length,
          deletedRejected: rejected ?? 0,
          deletedActivityLogs: logs ?? 0,
          archivedTransactions: old?.length ?? 0,
        };
        console.log("[cleanup]", JSON.stringify(report));

        await supabaseAdmin.from("activity_logs").insert({
          action: "Pembersihan otomatis",
          detail: `Acara ${report.deletedEvents}, file ${report.deletedEventFiles + report.deletedOrphanFiles}, transaksi lama ${report.archivedTransactions}`,
          actor_name: "Sistem",
        });

        return Response.json(report);
      },
    },
  },
});
