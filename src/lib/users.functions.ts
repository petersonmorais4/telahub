import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ROLES = ["admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export interface TeamUser {
  id: string;
  name: string | null;
  email: string | null;
  role: Role | null;
  createdAt: string;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Apenas administradores podem gerenciar usuários.");
}

export const listTeamUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profiles, roles] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, created_at").order("created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    const rank: Record<string, number> = { admin: 3, operator: 2, viewer: 1 };
    const roleOf = new Map<string, Role>();
    for (const r of roles.data ?? []) {
      const cur = roleOf.get(r.user_id);
      if (!cur || (rank[r.role] ?? 0) > (rank[cur] ?? 0)) roleOf.set(r.user_id, r.role as Role);
    }
    return (profiles.data ?? []).map<TeamUser>((p) => ({
      id: p.id, name: p.name, email: p.email, role: roleOf.get(p.id) ?? null, createdAt: p.created_at,
    }));
  });

async function setRole(userId: string, role: Role) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const del = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  if (del.error) throw new Error(del.error.message);
  const ins = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (ins.error) throw new Error(ins.error.message);
}

export const createTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
    role: z.enum(ROLES),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { name: data.name },
    });
    if (error || !created.user) {
      throw new Error(error?.message?.includes("already") ? "Já existe um usuário com este e-mail." : "Não foi possível criar o usuário.");
    }
    await setRole(created.user.id, data.role);
    return { id: created.user.id };
  });

export const updateTeamUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    await setRole(data.userId, data.role);
    return { ok: true };
  });

export const removeTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode remover a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível remover o usuário.");
    return { ok: true };
  });
