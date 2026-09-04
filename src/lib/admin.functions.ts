import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_USERNAME, DEFAULT_PASSWORD, usernameToEmail } from "./kas";

const RECOVERY_CODE = "gh1gh415";

async function assertAdmin(context: { userId: string }) {
  // userId berasal dari bearer token yang sudah divalidasi middleware.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Akses ditolak: khusus admin.");
}

/** Membuat akun admin bawaan bila belum ada. Idempoten. */
export const ensureAdminAccount = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", ADMIN_USERNAME)
    .maybeSingle();
  if (existing) return { ok: true, created: false };

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: usernameToEmail(ADMIN_USERNAME),
    password: DEFAULT_PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(error?.message ?? "Gagal membuat admin");

  await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    name: "Administrator",
    username: ADMIN_USERNAME,
  });
  await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
  return { ok: true, created: true };
});

/** Admin lupa password: dengan kode pemulihan, password kembali ke 123456. */
export const recoverAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    if (data.code.trim() !== RECOVERY_CODE) throw new Error("Kode pemulihan salah.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", ADMIN_USERNAME)
      .maybeSingle();
    if (!profile) throw new Error("Akun admin belum tersedia.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: DEFAULT_PASSWORD,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; password: string }) => {
    if (!data.name.trim()) throw new Error("Nama wajib diisi.");
    if (data.password.length < 6) throw new Error("Password minimal 6 karakter.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const username = data.name.trim();
    const { data: dup } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (dup) throw new Error("Nama anggota sudah terdaftar.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Gagal membuat akun.");
    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      name: username,
      username,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "member" });
    return { ok: true };
  });

export const renameMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; name: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const name = data.name.trim();
    if (!name) throw new Error("Nama wajib diisi.");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ name, username: name })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: usernameToEmail(name),
    });
    return { ok: true };
  });

export const resetMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: DEFAULT_PASSWORD,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Membersihkan data yang sudah tidak terpakai secara permanen:
 * - file pamflet yatim di storage (tidak lagi dirujuk acara mana pun)
 * - pengajuan yang ditolak
 * - catatan informasi/aktivitas lebih dari 6 bulan
 */
export const purgeUnusedData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: events } = await supabaseAdmin.from("events").select("pamphlet_url");
    const used = new Set((events ?? []).map((e) => e.pamphlet_url).filter(Boolean) as string[]);
    const { data: files } = await supabaseAdmin.storage.from("pamflet").list("", { limit: 1000 });
    const orphans = (files ?? []).map((f) => f.name).filter((n) => !used.has(n));
    if (orphans.length) await supabaseAdmin.storage.from("pamflet").remove(orphans);

    await supabaseAdmin.from("transactions").delete().eq("status", "rejected");
    const cutoff = new Date(Date.now() - 182 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("activity_logs").delete().lt("created_at", cutoff);

    // Rincian transaksi lebih dari 1 tahun dihapus, tetapi nilainya dipindah
    // ke saldo warisan agar total kas tidak berubah.
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: old } = await supabaseAdmin
      .from("transactions")
      .select("id, kind, amount, target")
      .eq("status", "approved")
      .lt("created_at", yearAgo);
    if (old?.length) {
      const net: Record<string, number> = { acara: 0, internal: 0 };
      for (const t of old) {
        const delta = (t.kind === "income" ? 1 : -1) * Number(t.amount);
        net[t.target] = (net[t.target] ?? 0) + delta;
      }
      const { data: carries } = await supabaseAdmin.from("balance_carry").select("target, amount");
      for (const target of Object.keys(net)) {
        const prev = Number(carries?.find((c) => c.target === target)?.amount ?? 0);
        await supabaseAdmin
          .from("balance_carry")
          .upsert({ target, amount: prev + (net[target] ?? 0), updated_at: new Date().toISOString() });
      }
      await supabaseAdmin
        .from("transactions")
        .delete()
        .in("id", old.map((t) => t.id));
    }

    return { ok: true, removedFiles: orphans.length, archived: old?.length ?? 0 };
  });

