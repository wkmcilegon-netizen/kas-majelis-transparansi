import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogIn, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { formatDate, formatRupiah, isWithinWindow, type EventInfo, type Transaction } from "@/lib/kas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kas Acara — MT Jam'iyyah Simthuddurar Al-Istiqomah" },
      {
        name: "description",
        content:
          "Informasi transparan total kas acara, rincian pemasukan dan pengeluaran, serta pamflet kegiatan Majelis Ta'lim & Dzikir Jam'iyyah Simthuddurar Al-Istiqomah.",
      },
      { property: "og:title", content: "Kas Acara — MT Jam'iyyah Simthuddurar Al-Istiqomah" },
      {
        property: "og:description",
        content: "Total kas acara, rincian pemasukan & pengeluaran, dan informasi acara terbaru.",
      },
    ],
  }),
  component: Beranda,
});

function usePublicData() {
  return useQuery({
    queryKey: ["public-kas"],
    queryFn: async () => {
      const [{ data: ev }, { data: trx }] = await Promise.all([
        supabase.from("events").select("*").order("created_at", { ascending: false }).limit(1),
        supabase
          .from("transactions")
          .select("*")
          .eq("status", "approved")
          .eq("target", "acara")
          .order("created_at", { ascending: false }),
      ]);
      const event = (ev?.[0] ?? null) as EventInfo | null;
      if (event?.pamphlet_url) {
        const { data: signed } = await supabase.storage
          .from("pamflet")
          .createSignedUrl(event.pamphlet_url, 60 * 60 * 24 * 7);
        event.pamphlet_url = signed?.signedUrl ?? null;
      }
      return {
        event,
        transactions: ((trx ?? []) as Transaction[]).filter((t) => isWithinWindow(t.created_at)),
      };
    },
  });
}

function Beranda() {
  const { data, isLoading } = usePublicData();
  const transactions = data?.transactions ?? [];
  const income = transactions.filter((t) => t.kind === "income");
  const expense = transactions.filter((t) => t.kind === "expense");
  const total =
    income.reduce((s, t) => s + Number(t.amount), 0) - expense.reduce((s, t) => s + Number(t.amount), 0);
  const event = data?.event ?? null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <BrandHeader />

      {event ? (
        <section className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur shadow-soft">
          <div className="mx-auto max-w-3xl px-4 py-4">
            <div className="flex gap-3">
              {event.pamphlet_url ? (
                <img
                  src={event.pamphlet_url}
                  alt={`Pamflet acara ${event.title}`}
                  className="h-28 w-24 shrink-0 rounded-lg border border-gold-soft object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-accent-foreground">
                  Informasi Acara
                </p>
                <h2 className="text-base leading-snug font-bold">{event.title}</h2>
                {event.event_date ? (
                  <p className="text-xs text-muted-foreground">{formatDate(event.event_date)}</p>
                ) : null}
                {event.description ? (
                  <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{event.description}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-2xl bg-gradient-navy p-[1.5px] shadow-gold">
          <div className="rounded-2xl bg-gradient-navy px-5 py-6 text-center text-primary-foreground">
            <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-soft">
              <Wallet className="size-4" /> Total Kas Acara
            </div>
            <p className="text-3xl font-bold text-gradient-gold">
              {isLoading ? "…" : formatRupiah(total)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <p className="text-[0.7rem] text-primary-foreground/70">Pemasukan</p>
                <p className="font-semibold">
                  {formatRupiah(income.reduce((s, t) => s + Number(t.amount), 0))}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <p className="text-[0.7rem] text-primary-foreground/70">Pengeluaran</p>
                <p className="font-semibold">
                  {formatRupiah(expense.reduce((s, t) => s + Number(t.amount), 0))}
                </p>
              </div>
            </div>
          </div>
        </section>

        <TableCard
          title="Pemasukan"
          icon={<TrendingUp className="size-4 text-primary" />}
          headers={["Nama", "Nominal"]}
          rows={income.map((t) => [t.person_name ?? "-", formatRupiah(Number(t.amount))])}
          emptyText="Belum ada pemasukan acara."
        />

        <TableCard
          title="Pengeluaran"
          icon={<TrendingDown className="size-4 text-destructive" />}
          headers={["Keterangan Pembelian", "Nominal"]}
          rows={expense.map((t) => [t.note ?? "-", formatRupiah(Number(t.amount))])}
          emptyText="Belum ada pengeluaran acara."
        />

        <div className="pt-2 text-center">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/auth">
              <LogIn className="size-4" /> Masuk Admin / Anggota
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function TableCard({
  title,
  icon,
  headers,
  rows,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  headers: string[];
  rows: string[][];
  emptyText: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-3">
        {icon}
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              {headers.map((h, i) => (
                <th key={h} className={`px-4 py-2 ${i === 1 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2.5">{r[0]}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
