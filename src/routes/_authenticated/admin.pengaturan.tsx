import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_USERNAME } from "@/lib/kas";
import { BackButton, BrandHeader } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan Admin — Kas MT JSI" },
      { name: "description", content: "Ubah password akun admin pengelola kas majelis." },
      { property: "og:title", content: "Pengaturan Admin — Kas MT JSI" },
      { property: "og:description", content: "Ubah password akun admin pengelola kas majelis." },
    ],
  }),
  component: PengaturanAdmin,
});

function PengaturanAdmin() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: next,
      // @ts-expect-error current_password is supported by Lovable Cloud auth
      current_password: current,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password admin berhasil diubah.");
    setCurrent("");
    setNext("");
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <BrandHeader subtitle="Pengaturan Admin" />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <BackButton to="/admin" label="Kembali ke Dashboard" />
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wide">Ubah Password</h2>
          <div className="space-y-1.5">
            <Label>Nama Pengguna</Label>
            <Input value={ADMIN_USERNAME} disabled />
            <p className="text-xs text-muted-foreground">Nama pengguna admin tidak dapat diubah.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cur">Password Saat Ini</Label>
            <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">Password Baru</Label>
            <Input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Menyimpan…" : "Simpan Password"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Lupa password? Gunakan kode pemulihan di halaman masuk untuk mengembalikan password ke 123456.
          </p>
        </form>
      </main>
    </div>
  );
}
