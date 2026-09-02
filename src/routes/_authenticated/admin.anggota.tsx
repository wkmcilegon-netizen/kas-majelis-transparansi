import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createMember, deleteMember, renameMember, resetMemberPassword } from "@/lib/admin.functions";
import { ADMIN_USERNAME } from "@/lib/kas";
import { BackButton, BrandHeader } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/anggota")({
  head: () => ({
    meta: [
      { title: "Kelola Anggota — Kas MT JSI" },
      { name: "description", content: "Buat akun anggota, ubah nama, reset password, atau hapus anggota." },
      { property: "og:title", content: "Kelola Anggota — Kas MT JSI" },
      { property: "og:description", content: "Buat dan kelola akun anggota majelis." },
    ],
  }),
  component: KelolaAnggota,
});

function KelolaAnggota() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, username")
        .neq("username", ADMIN_USERNAME)
        .order("name");
      return data ?? [];
    },
  });

  async function run(fn: () => Promise<unknown>, message: string) {
    try {
      await fn();
      toast.success(message);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <BrandHeader subtitle="Kelola Anggota" />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <BackButton to="/admin" label="Kembali ke Dashboard" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await createMember({ data: { name, password } });
              setName("");
              setPassword("");
            }, "Akun anggota dibuat.");
          }}
          className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <UserPlus className="size-4 text-accent-foreground" /> Buat Akun Anggota
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="m-name">Nama</Label>
            <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-pass">Password</Label>
            <Input id="m-pass" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit">Buat Akun</Button>
        </form>

        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <h2 className="border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-wide">
            Daftar Anggota
          </h2>
          {(members ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada anggota.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(members ?? []).map((m) => (
                <li key={m.id} className="px-4 py-3">
                  {editId === m.id ? (
                    <div className="space-y-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            run(async () => {
                              await renameMember({ data: { userId: m.id, name: editName } });
                              setEditId(null);
                            }, "Nama anggota diperbarui.")
                          }
                        >
                          Simpan
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditId(m.id);
                            setEditName(m.name);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            run(
                              () => resetMemberPassword({ data: { userId: m.id } }),
                              "Password direset ke 123456.",
                            )
                          }
                        >
                          <KeyRound className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            run(() => deleteMember({ data: { userId: m.id } }), "Anggota dihapus.")
                          }
                        >
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
      </main>
    </div>
  );
}
