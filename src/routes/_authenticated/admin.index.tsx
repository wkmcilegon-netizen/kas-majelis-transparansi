import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, ImagePlus, LogOut, Pencil, Trash2, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { BackButton, BrandHeader } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/activity";
import { formatRupiah, isWithinWindow, type EventInfo, type Transaction } from "@/lib/kas";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — Kas MT JSI" },
      { name: "description", content: "Kelola kas acara, kas internal, pamflet, dan anggota majelis." },
      { property: "og:title", content: "Dashboard Admin — Kas MT JSI" },
      { property: "og:description", content: "Kelola kas acara, kas internal, pamflet, dan anggota majelis." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session, isLoading: loadingSession } = useSessionInfo();

  useEffect(() => {
    if (!loadingSession && session && !session.isAdmin) navigate({ to: "/anggota" });
  }, [loadingSession, session, navigate]);

  const { data: trx } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Transaction[];
    },
  });

  const { data: event } = useQuery({
    queryKey: ["admin-event"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      return (data?.[0] ?? null) as EventInfo | null;
    },
  });

  const approved = (trx ?? []).filter((t) => t.status === "approved");
  const acara = approved.filter((t) => t.target === "acara" && isWithinWindow(t.created_at));
  const internal = approved.filter((t) => t.target === "internal");
  const pending = (trx ?? []).filter((t) => t.status === "pending");

  const sum = (list: Transaction[], kind: Transaction["kind"]) =>
    list.filter((t) => t.kind === kind).reduce((s, t) => s + Number(t.amount), 0);
  const totalAcara = sum(acara, "income") - sum(acara, "expense");
  const totalInternal = sum(internal, "income") - sum(internal, "expense");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <BrandHeader subtitle={`Admin • ${session?.name ?? ""}`} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <BackButton to="/" label="Kembali ke Beranda" />
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link to="/admin/persetujuan">
              <CheckCircle2 className="size-4" /> Persetujuan
              {pending.length > 0 ? (
                <span className="rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                  {pending.length}
                </span>
              ) : null}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link to="/admin/anggota">
              <Users className="size-4" /> Anggota
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link to="/admin/pengaturan">
              <Settings className="size-4" /> Pengaturan
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={signOut}>
            <LogOut className="size-4" /> Keluar
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Kas Acara" value={formatRupiah(totalAcara)} />
          <StatCard label="Kas Internal" value={formatRupiah(totalInternal)} />
        </div>

        <EventEditor event={event ?? null} />
        <TransactionAdminList transactions={(trx ?? []).filter((t) => t.status !== "pending")} />

      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gradient-navy px-4 py-4 text-primary-foreground shadow-soft">
      <p className="text-[0.65rem] uppercase tracking-widest text-gold-soft">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function EventEditor({ event }: { event: EventInfo | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventDate, setEventDate] = useState(event?.event_date ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setEventDate(event?.event_date ?? "");
  }, [event]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let path = event?.pamphlet_url ?? null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const newPath = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pamflet").upload(newPath, file);
        if (upErr) throw new Error(upErr.message);
        path = newPath;
      }
      const payload = {
        title: title.trim() || "Acara Majelis",
        description: description.trim() || null,
        event_date: eventDate || null,
        pamphlet_url: path,
      };
      const { error } = event
        ? await supabase.from("events").update(payload).eq("id", event.id)
        : await supabase.from("events").insert(payload);
      if (error) throw new Error(error.message);
      await logActivity("Informasi acara diperbarui", payload.title);
      toast.success("Informasi acara tersimpan.");
      setFile(null);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent() {
    if (!event) return;
    await supabase.from("events").delete().eq("id", event.id);
    await logActivity("Informasi acara dihapus", event.title);
    toast.success("Informasi acara dihapus.");
    qc.invalidateQueries();
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <ImagePlus className="size-4 text-accent-foreground" /> Pamflet &amp; Informasi Acara
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="ev-title">Judul Acara</Label>
        <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-date">Tanggal Acara</Label>
        <Input id="ev-date" type="date" value={eventDate ?? ""} onChange={(e) => setEventDate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-desc">Deskripsi</Label>
        <Textarea id="ev-desc" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-file">Pamflet (dari galeri)</Label>
        <Input
          id="ev-file"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan"}
        </Button>
        {event ? (
          <Button type="button" variant="outline" onClick={removeEvent}>
            Hapus Acara
          </Button>
        ) : null}
      </div>
    </form>
  );
}



function TransactionAdminList({ transactions }: { transactions: Transaction[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editLabel, setEditLabel] = useState("");

  function startEdit(t: Transaction) {
    setEditing(t);
    setEditAmount(String(t.amount));
    setEditLabel((t.kind === "income" ? t.person_name : t.note) ?? "");
  }

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase
      .from("transactions")
      .update({
        amount: Number(editAmount),
        person_name: editing.kind === "income" ? editLabel : null,
        note: editing.kind === "expense" ? editLabel : null,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logActivity(
      "Transaksi diubah",
      `${editLabel} • ${formatRupiah(Number(editAmount))}`,
    );
    toast.success("Transaksi diperbarui.");
    setEditing(null);
    qc.invalidateQueries();
  }

  async function remove(t: Transaction) {
    await supabase.from("transactions").delete().eq("id", t.id);
    await logActivity(
      "Transaksi dihapus",
      `${(t.kind === "income" ? t.person_name : t.note) ?? "-"} • ${formatRupiah(Number(t.amount))}`,
    );
    toast.success("Transaksi dihapus.");
    qc.invalidateQueries();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-soft">
      <h2 className="border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-wide">
        Daftar Transaksi
      </h2>
      {transactions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada transaksi.</p>
      ) : (
        <ul className="divide-y divide-border">
          {transactions.map((t) => (
            <li key={t.id} className="px-4 py-3">
              {editing?.id === t.id ? (
                <div className="space-y-2">
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      Simpan
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {(t.kind === "income" ? t.person_name : t.note) ?? "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.kind === "income" ? "Pemasukan" : "Pengeluaran"} •{" "}
                      {t.target === "acara" ? "Acara" : "Kas Internal"} •{" "}
                      {t.status === "approved" ? "Disetujui" : "Ditolak"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatRupiah(Number(t.amount))}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
