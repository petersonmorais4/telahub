import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  createTeamUser, listTeamUsers, removeTeamUser, updateTeamUserRole, type Role,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/painel/usuarios")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Usuários" },
      { name: "description", content: "Convide colaboradores e defina se são administradores, operacionais, operadores ou visualizadores." },
      { property: "og:title", content: "TelaHUB — Usuários" },
      { property: "og:description", content: "Gestão da equipe do TelaHUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsuariosPage,
});

const roleLabels: Record<Role, { label: string; hint: string }> = {
  admin: { label: "Administrador", hint: "Acesso total, inclusive usuários" },
  operacional: { label: "Operacional", hint: "Acesso total ao painel, exceto financeiro" },
  operator: { label: "Operador", hint: "Gerencia telas, anúncios e playlists" },
  viewer: { label: "Visualizador", hint: "Apenas consulta" },
};

function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled ?? false}>
      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(roleLabels) as Role[]).map((r) => (
          <SelectItem key={r} value={r}>{roleLabels[r].label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UsuariosPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTeamUsers);
  const create = useServerFn(createTeamUser);
  const update = useServerFn(updateTeamUserRole);
  const remove = useServerFn(removeTeamUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" as Role });

  const users = useQuery({ queryKey: ["team-users"], queryFn: () => list(), retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["team-users"] });
  const onErr = (e: Error) => toast.error(e.message);

  const createMut = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success("Usuário adicionado. Envie o e-mail e a senha para a pessoa entrar.");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "viewer" });
      refresh();
    },
    onError: onErr,
  });
  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => update({ data: v }),
    onSuccess: () => { toast.success("Permissão atualizada."); refresh(); },
    onError: onErr,
  });
  const removeMut = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => { toast.success("Usuário removido."); refresh(); },
    onError: onErr,
  });

  return (
    <AdminShell
      title="Usuários"
      description="Pessoas que colaboram com o TelaHUB e o que cada uma pode fazer."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" />Adicionar usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar usuário</DialogTitle>
              <DialogDescription>Defina uma senha inicial e envie para a pessoa entrar no painel.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
            >
              <div className="space-y-2"><Label htmlFor="u-name">Nome</Label>
                <Input id="u-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="u-email">E-mail</Label>
                <Input id="u-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="u-pass">Senha inicial (mín. 8 caracteres)</Label>
                <Input id="u-pass" type="text" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div className="space-y-2"><Label>Permissão</Label>
                <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />
                <p className="text-xs text-muted-foreground">{roleLabels[form.role].hint}</p></div>
              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Salvando…" : "Adicionar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {users.isError ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">{(users.error as Error).message}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Permissão</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {users.isLoading && <tr><td className="p-3 text-muted-foreground" colSpan={4}>Carregando…</td></tr>}
              {users.data?.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3 font-medium">{u.name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <RoleSelect value={u.role ?? "viewer"} disabled={roleMut.isPending}
                      onChange={(role) => roleMut.mutate({ userId: u.id, role })} />
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" aria-label={`Remover ${u.email}`}
                      onClick={() => { if (confirm(`Remover ${u.email}?`)) removeMut.mutate(u.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
