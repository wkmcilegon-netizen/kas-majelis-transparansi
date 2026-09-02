import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SessionInfo = {
  userId: string;
  name: string;
  username: string;
  isAdmin: boolean;
};

export function useSessionInfo() {
  return useQuery({
    queryKey: ["session-info"],
    queryFn: async (): Promise<SessionInfo | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("name, username").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return {
        userId: user.id,
        name: profile?.name ?? "Anggota",
        username: profile?.username ?? "",
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}
