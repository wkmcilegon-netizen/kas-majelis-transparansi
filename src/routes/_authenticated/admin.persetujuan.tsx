import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BackButton, BrandHeader } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { formatDate, formatRupiah, type Transaction } from "@/lib/kas";

export const Route = createFileRoute("/_authenticated/admin/persetujuan")({
  head: () => ({
    meta: [
      { title: "Persetujuan Pengajuan — Kas MT JSI" },
      { name: "description", content: "Setujui atau tolak pengajuan pemasukan dan pembelian dari anggota." },
      { property: "og:title", content: "Persetujuan Pengajuan — Kas MT JSI" },
      { property: "og:description", content: "Setujui atau tolak pengajuan dari anggota majelis." },
    ],
  }),
  component: Persetujuan,
});

function Persetujuan() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["pending-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return (data ?? []) as Transaction[];
    },
  });

  async function decide(id: string, status: "approved" | "rejected") {
    const { error } = await supabase
      .from("transactions")
      .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
    qc.invalidateQueries();
  }

  const list = data ?? [];

  return (
    <div className="min-h-screen bg-background pb-16">
      <BrandHeader subtitle="Persetujuan Pengajuan" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <BackButton to="/admin" label="Kembali ke Dashboard" />
        {list.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Tidak ada pengajuan menunggu.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((t) => (
              <li key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <p className="text-sm font-semibold">
                  {(t.kind === "income" ? t.person_name : t.note) ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.kind === "income" ? "Pemasukan" : "Pengajuan pembelian"} •{" "}
                  {t.target === "acara" ? "Acara" : "Kas Internal"} • {formatDate(t.created_at)}
                </p>
                <p className="mt-1 text-lg font-bold">{formatRupiah(Number(t.amount))}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => decide(t.id, "approved")}>
                    Setujui
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(t.id, "rejected")}>
                    Tolak
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
