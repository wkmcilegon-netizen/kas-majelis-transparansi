import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_USERNAME, DEFAULT_PASSWORD, usernameToEmail } from "./kas";

const RECOVERY_CODE = "gh1gh415";

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Akses ditolak: khusus admin.");
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
