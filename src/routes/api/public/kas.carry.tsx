import { createFileRoute } from "@tanstack/react-router";

/** Saldo warisan kas acara untuk halaman publik (hanya angka, tanpa data pribadi). */
export const Route = createFileRoute("/api/public/kas/carry")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("balance_carry")
          .select("target, amount")
          .eq("target", "acara");
        const acara = Number(data?.[0]?.amount ?? 0);
        return Response.json(
          { acara },
          { headers: { "cache-control": "public, max-age=60" } },
        );
      },
    },
  },
});
