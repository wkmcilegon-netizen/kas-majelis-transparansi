import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { BackButton, BrandHeader } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatRupiah, isWithinWindow, type Transaction } from "@/lib/kas";
import type { ActivityLog } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/anggota")({
  head: () => ({
    meta: [
      { title: "Halaman Anggota — Kas MT JSI" },
      {
        name: "description",
        content: "Ajukan pembelian, input pemasukan, dan pantau laporan kas majelis secara transparan.",
      },
      { property: "og:title", content: "Halaman Anggota — Kas MT JSI" },
      { property: "og:description", content: "Pengajuan pembelian dan pemasukan anggota majelis." },
    ],
  }),
  component: HalamanAnggota,
});

function HalamanAnggota() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session } = useSessionInfo();

  const { data: trx } = useQuery({
    queryKey: ["member-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Transaction[];
    },
  });

  const approved = (trx ?? []).filter((t) => t.status === "approved");
  const acara = approved.filter((t) => t.target === "acara" && isWithinWindow(t.created_at));
  const internal = approved.filter((t) => t.target === "internal");
  const sum = (list: Transaction[], kind: Transaction["kind"]) =>
    list.filter((t) => t.kind === kind).reduce((s, t) => s + Number(t.amount), 0);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <BrandHeader subtitle={`Anggota • ${session?.name ?? ""}`} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <BackButton to="/" label="Kembali ke Beranda" />
          <Button variant="ghost" size="sm" className="gap-2" onClick={signOut}>
            <LogOut className="size-4" /> Keluar
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-navy px-4 py-4 text-primary-foreground shadow-soft">
            <p className="text-[0.65rem] uppercase tracking-widest text-gold-soft">Kas Acara</p>
            <p className="mt-1 text-xl font-bold">
              {formatRupiah(sum(acara, "income") - sum(acara, "expense"))}
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-navy px-4 py-4 text-primary-foreground shadow-soft">
            <p className="text-[0.65rem] uppercase tracking-widest text-gold-soft">Kas Internal</p>
            <p className="mt-1 text-xl font-bold">
              {formatRupiah(sum(internal, "income") - sum(internal, "expense"))}
            </p>
          </div>
        </div>

        <FormPemasukan userId={session?.userId} />
        <FormPengajuan userId={session?.userId} />
        <RiwayatList transactions={trx ?? []} />
        <InfoAdmin />
        <UbahPassword />
      </main>
    </div>
  );
}

function FormPemasukan({ userId }: { userId: string | undefined }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState<"acara" | "internal">("acara");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase.from("transactions").insert({
      kind: "income",
      target,
      person_name: name.trim(),
      amount: Number(amount),
      status: "pending",
      created_by: userId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pemasukan dikirim, menunggu konfirmasi admin.");
    setName("");
    setAmount("");
    qc.invalidateQueries();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-bold uppercase tracking-wide">Input Pemasukan</h2>
      <div className="space-y-1.5">
        <Label htmlFor="in-name">Nama</Label>
        <Input id="in-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="in-amount">Nominal (Rp)</Label>
        <Input
          id="in-amount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="in-target">Tujuan</Label>
        <select
          id="in-target"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={target}
          onChange={(e) => setTarget(e.target.value as "acara" | "internal")}
        >
          <option value="acara">Acara</option>
          <option value="internal">Kas Internal</option>
        </select>
      </div>
      <Button type="submit">Kirim</Button>
    </form>
  );
}

function FormPengajuan({ userId }: { userId: string | undefined }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase.from("transactions").insert({
      kind: "expense",
      target: "acara",
      note: note.trim(),
      amount: Number(amount),
      status: "pending",
      created_by: userId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pengajuan pembelian dikirim ke admin.");
    setNote("");
    setAmount("");
    qc.invalidateQueries();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-bold uppercase tracking-wide">Pengajuan Pembelian</h2>
      <div className="space-y-1.5">
        <Label htmlFor="ex-note">Keterangan</Label>
        <Input id="ex-note" value={note} onChange={(e) => setNote(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ex-amount">Nominal (Rp)</Label>
        <Input
          id="ex-amount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <Button type="submit">Ajukan</Button>
    </form>
  );
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function RiwayatList({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const years = Array.from(
    new Set([now.getFullYear(), ...transactions.map((t) => new Date(t.created_at).getFullYear())]),
  ).sort((a, b) => b - a);

  const periode = transactions.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const pemasukan = periode.filter((t) => t.kind === "income");
  const pengeluaran = periode.filter((t) => t.kind === "expense");

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-bold uppercase tracking-wide">Laporan per Periode</h2>
      <div className="grid grid-cols-2 gap-3">
        <select
          aria-label="Bulan"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {BULAN.map((b, i) => (
            <option key={b} value={i}>
              {b}
            </option>
          ))}
        </select>
        <select
          aria-label="Tahun"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <TrxGroup title="Pemasukan" items={pemasukan} />
      <TrxGroup title="Pengeluaran" items={pengeluaran} />
    </section>
  );
}

function TrxGroup({ title, items }: { title: string; items: Transaction[] }) {
  const label: Record<Transaction["status"], string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
  };
  return (
    <div className="rounded-xl border border-border">
      <h3 className="border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-wide">
        {title} <span className="text-muted-foreground">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="px-3 py-5 text-center text-sm text-muted-foreground">Belum ada data.</p>
      ) : (
        <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
          {items.map((t) => (
            <li key={t.id} className="flex h-[3.9rem] items-center justify-between gap-3 px-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {(t.kind === "income" ? t.person_name : t.note) ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.target === "acara" ? "Acara" : "Kas Internal"} • {label[t.status]} •{" "}
                  {formatDate(t.created_at)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatRupiah(Number(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InfoAdmin() {
  const { data } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as ActivityLog[];
    },
  });
  const logs = data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card shadow-soft">
      <h2 className="border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-wide">
        Informasi Perubahan Admin
      </h2>
      {logs.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada informasi.</p>
      ) : (
        <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
          {logs.map((l) => (
            <li key={l.id} className="flex h-[3.9rem] flex-col justify-center px-4">
              <p className="truncate text-sm font-medium">{l.action}</p>
              <p className="truncate text-xs text-muted-foreground">
                {l.detail ? `${l.detail} • ` : ""}
                {formatDate(l.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-border px-4 py-2 text-[0.7rem] text-muted-foreground">
        Informasi tersimpan maksimal 6 bulan, setelah itu terhapus otomatis.
      </p>
    </section>
  );
}


function UbahPassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: next,
      current_password: current,
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password berhasil diubah.");
    setCurrent("");
    setNext("");
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-bold uppercase tracking-wide">Pengaturan Password</h2>
      <div className="space-y-1.5">
        <Label htmlFor="a-cur">Password Saat Ini</Label>
        <Input id="a-cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="a-new">Password Baru</Label>
        <Input id="a-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
      </div>
      <Button type="submit">Simpan Password</Button>
    </form>
  );
}
