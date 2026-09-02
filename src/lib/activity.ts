import { supabase } from "@/integrations/supabase/client";

export type ActivityLog = {
  id: string;
  action: string;
  detail: string | null;
  actor_name: string | null;
  created_at: string;
};

/** Catat perubahan yang dilakukan admin agar bisa dilihat anggota. */
export async function logActivity(action: string, detail?: string | null, actorName = "Admin") {
  await supabase.from("activity_logs").insert({
    action,
    detail: detail ?? null,
    actor_name: actorName,
  });
}
