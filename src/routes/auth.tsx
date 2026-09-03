import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminAccount, recoverAdminPassword } from "@/lib/admin.functions";
import { usernameToEmail } from "@/lib/kas";
import { BackButton, Logo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Kas MT Jam'iyyah Simthuddurar Al-Istiqomah" },
      { name: "description", content: "Halaman masuk admin dan anggota pengelola kas majelis." },
      { property: "og:title", content: "Masuk — Kas MT Jam'iyyah Simthuddurar Al-Istiqomah" },
      { property: "og:description", content: "Halaman masuk admin dan anggota pengelola kas majelis." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    ensureAdminAccount().catch(() => undefined);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);
    if (error || !data.user) {
      toast.error("Nama pengguna atau password salah.");
      return;
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    toast.success("Berhasil masuk.");
    navigate({ to: isAdmin ? "/admin" : "/anggota" });
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    try {
      await recoverAdminPassword({ data: { code } });
      toast.success("Password admin dikembalikan ke 123456.");
      setShowRecover(false);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulihkan password.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-navy px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-gold-soft/40 bg-card p-6 shadow-gold">
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-3 text-lg font-bold">Masuk</h1>
          <p className="text-xs text-muted-foreground">Khusus admin dan anggota majelis</p>
        </div>

        {showRecover ? (
          <form onSubmit={handleRecover} className="space-y-3">
            <Label htmlFor="code">Kode pemulihan admin</Label>
            <PasswordInput id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kode" />
            <Button type="submit" className="w-full">
              Pulihkan Password Admin
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setShowRecover(false)}>
              Batal
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Nama Pengguna</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="MT-JSI atau nama anggota"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline"
              onClick={() => setShowRecover(true)}
            >
              Admin lupa password?
            </button>
          </form>
        )}
      </div>
      <div className="mt-6">
        <BackButton to="/" label="Kembali ke Beranda" />
      </div>
    </div>
  );
}
