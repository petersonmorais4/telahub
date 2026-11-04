import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "operator" | "viewer" | "operacional";

export async function fetchMyRoles(): Promise<AppRole[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  return (data ?? []).map((r) => r.role as AppRole);
}

/** Financial screens are hidden from the Operacional profile (also enforced by RLS). */
export function canSeeFinance(roles: AppRole[]) {
  return roles.length > 0 && !roles.includes("operacional");
}
export function canUseSales(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("operacional");
}

export function useMyRoles() {
  return useQuery({ queryKey: ["my-roles"], queryFn: fetchMyRoles, staleTime: 60_000 });
}
