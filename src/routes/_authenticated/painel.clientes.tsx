import { createFileRoute, Link } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Mail, Phone, Image as ImageIcon, Video, MonitorPlay, Wallet, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { canSeeFinance, useMyRoles } from "@/lib/my-role";
import { groupClients, isInternalMedia, type ClientType, type ClientGroup, type ClientMedia, type ClientRevenue } from "@/lib/clients";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/painel/clientes")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Clientes" },
      { name: "description", content: "Visão central de cada cliente: contatos, artes em exibição e financeiro." },
      { property: "og:title", content: "TelaHUB — Clientes" },
      { property: "og:description", content: "Central de clientes do TelaHUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
const today = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const isLive = (m: ClientMedia) => m.active && (!m.end_date || m.end_date >= today()) && (!m.start_date || m.start_date <= today());

function ClientsPage() {
  const roles = useMyRoles().data ?? [];
  const finance = canSeeFinance(roles);
  const staff = roles.some((r) => r !== "viewer");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ClientType | "none">("all");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const dataQ = useQuery({
    queryKey: ["clients-overview", finance],
    queryFn: async () => {
      const [mediaR, contactsR, itemsR, screensR, revR] = await Promise.all([
        supabase.from("media").select("id, title, type, active, start_date, end_date"),
        supabase.from("media_contacts").select("media_id, client_name, client_email, client_phone, client_notes, client_type, send_report"),
        supabase.from("playlist_items").select("media_id, playlist_id"),
        supabase.from("screens").select("id, name, playlist_id"),
        finance
          ? supabase.from("revenues").select("id, client_name, amount, payment_date, payment_method, recurring, recurrence_days, media_id, description")
          : Promise.resolve({ data: [], error: null }),
      ]);
      const err = mediaR.error ?? contactsR.error ?? itemsR.error ?? screensR.error ?? revR.error;
      if (err) throw err;
      const contacts = new Map((contactsR.data ?? []).map((c) => [c.media_id, c]));
      const media: ClientMedia[] = (mediaR.data ?? []).map((m) => {
        const c = contacts.get(m.id);
        return { ...m, client_name: c?.client_name ?? null, client_email: c?.client_email ?? null, client_phone: c?.client_phone ?? null, client_notes: c?.client_notes ?? null, client_type: c?.client_type ?? null, send_report: c?.send_report ?? false };
      });
      const screensByMedia = new Map<string, string[]>();
      for (const it of itemsR.data ?? []) {
        const names = (screensR.data ?? []).filter((s) => s.playlist_id === it.playlist_id).map((s) => s.name);
        const cur = screensByMedia.get(it.media_id) ?? [];
        screensByMedia.set(it.media_id, [...new Set([...cur, ...names])]);
      }
      return { clients: groupClients(media, (revR.data ?? []) as ClientRevenue[]), screensByMedia, allMedia: media.filter((x) => !isInternalMedia(x.title)) };
    },
    staleTime: 60_000,
  });

  const clients = useMemo(() => {
    const all = dataQ.data?.clients ?? [];
    const t = q.trim().toLowerCase();
    const byType = typeFilter === "all" ? all : all.filter((c) => (typeFilter === "none" ? !c.type : c.type === typeFilter));
    return t ? byType.filter((c) => c.name.toLowerCase().includes(t) || c.emails.some((e) => e.toLowerCase().includes(t)) || c.arts.some((a) => a.title.toLowerCase().includes(t))) : byType;
  }, [dataQ.data, q, typeFilter]);
  const open = (dataQ.data?.clients ?? []).find((c) => c.key === openKey || (!!openKey && c.media.some((m) => `m:${m.id}` === openKey))) ?? null;
  const screensOf = (id: string) => dataQ.data?.screensByMedia.get(id) ?? [];

  return (
    <AdminShell title="Clientes" description="Tudo de cada cliente em um só lugar: contato, artes e pagamentos.">
      {dataQ.data && <TypeDashboard clients={dataQ.data.clients} finance={finance} />}
      <div className="mb-3 flex flex-wrap gap-2">
        {([["all", "Todos"], ["pagante", "Pagantes"], ["parceiro", "Parceiros"], ["none", "Sem tipo"]] as const).map(([v, l]) => (
          <Button key={v} size="sm" variant={typeFilter === v ? "default" : "outline"} onClick={() => setTypeFilter(v)}>{l}</Button>
        ))}
      </div>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nome, e-mail ou anúncio" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{clients.length} clientes</span>
      </div>

      {dataQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {dataQ.error && <p className="text-sm text-destructive">Não foi possível carregar os clientes.</p>}
      {!dataQ.isLoading && clients.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum cliente encontrado. Preencha o nome do cliente nos anúncios ou nas receitas.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => (
          <ClientCard key={c.key} c={c} finance={finance} onOpen={() => setOpenKey(c.media[0] ? `m:${c.media[0].id}` : c.key)} />
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenKey(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader><SheetTitle>{open.name}</SheetTitle></SheetHeader>
              <TypeSelector group={open} canEdit={staff} />
              <section className="mt-4 space-y-1 text-sm">
                <h3 className="font-semibold">Contato</h3>
                {open.emails.length ? open.emails.map((e) => (
                  <a key={e} href={`mailto:${e}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="h-4 w-4" />{e}</a>
                )) : <p className="text-muted-foreground">Sem e-mail cadastrado</p>}
                {open.phones.map((ph) => (
                  <a key={ph} href={`tel:${ph.replace(/\D/g, "")}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4" />{ph}</a>
                ))}
                {open.notes && <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">{open.notes}</p>}
                {staff && <EditClientForm key={open.key} group={open} />}
                {!open.hasContact && (
                  <p className="mt-2 flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4" />Sem contato cadastrado. Use "Editar cliente" para completar.</p>
                )}
              </section>
              <section className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">Artes ({open.arts.length})</h3>
                  {staff && <AddMediaPicker group={open} all={dataQ.data?.allMedia ?? []} />}
                </div>
                {open.arts.length === 0 && <p className="text-muted-foreground">Nenhuma arte vinculada.</p>}
                {open.arts.map((a) => (
                  <div key={a.key} className="space-y-2 rounded-md border border-border p-3">
                    <p className="font-semibold">{a.title}{a.versions.length > 1 ? ` · ${a.versions.length} versões` : ""}</p>
                {a.versions.map((m) => (
                  <div key={m.id} className="rounded-md bg-muted/50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        {m.type === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}{m.title}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-xs ${isLive(m) ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {isLive(m) ? "Em exibição" : "Pausada"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Período: {fmtDate(m.start_date)} a {fmtDate(m.end_date)} · Relatório semanal: {m.send_report ? "sim" : "não"}</p>
                    <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                      <MonitorPlay className="mt-0.5 h-3 w-3 shrink-0" />{screensOf(m.id).join(", ") || "Fora das grades"}
                    </p>
                    {staff && <MediaEditor m={m} canRemove={open.media.length > 1} />}
                  </div>
                ))}
                  </div>
                ))}
              </section>
              {finance && (
                <section className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Financeiro</h3>
                    <Link to="/painel/financeiro" className="text-xs text-primary hover:underline">Ver em Receitas</Link>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Kpi label="Total recebido" value={brl(open.total)} />
                    <Kpi label="Último pagamento" value={fmtDate(open.lastPayment)} />
                    <Kpi label="Próxima cobrança" value={fmtDate(open.nextDue)} />
                  </div>
                  {[...open.revenues].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).map((r) => (
                    <div key={r.id} className="flex justify-between rounded-md border border-border px-3 py-2">
                      <span>{fmtDate(r.payment_date)} · {r.payment_method}{r.description ? ` · ${r.description}` : ""}</span>
                      <b>{brl(Number(r.amount))}</b>
                    </div>
                  ))}
                  {open.revenues.length === 0 && <p className="text-muted-foreground">Nenhuma receita lançada.</p>}
                </section>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function ClientCard({ c, finance, onOpen }: { c: ClientGroup; finance: boolean; onOpen: () => void }) {
  const live = c.media.filter(isLive).length;
  const overdue = c.nextDue && c.nextDue < today();
  return (
    <button onClick={onOpen} className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary">
      <div className="flex items-start justify-between gap-2"><p className="font-semibold">{c.name}</p><TypeBadge type={c.type} /></div>
      <p className="truncate text-xs text-muted-foreground">{c.emails[0] ?? "Sem e-mail"}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-muted px-1.5 py-0.5">{live} em exibição / {c.arts.length} artes</span>
        {!c.hasContact && <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">Sem contato</span>}
        {finance && (
          <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"><Wallet className="h-3 w-3" />{brl(c.total)}</span>
        )}
        {finance && overdue && <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-destructive">Cobrança vencida</span>}
      </div>
    </button>
  );
}

type ContactFields = { client_name: string | null; client_email: string | null; client_phone: string | null; client_notes: string | null; client_type?: string | null; send_report: boolean };
async function saveContacts(ids: string[], f: ContactFields) {
  const res = await Promise.all(ids.map((media_id) => supabase.from("media_contacts").upsert({ media_id, ...f }, { onConflict: "media_id" })));
  return !res.some((r) => r.error);
}
const useRefresh = () => { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: ["clients-overview"] }); };

function EditClientForm({ group }: { group: ClientGroup }) {
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: group.hasContact ? group.name : "",
    email: group.emails[0] ?? "",
    phone: group.phones[0] ?? "",
    notes: group.notes ?? "",
    report: group.media.some((m) => m.send_report),
  });
  if (!editing) return <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing(true)}>Editar cliente</Button>;
  const save = async () => {
    setSaving(true);
    const ok = await saveContacts(group.media.map((m) => m.id), {
      client_name: f.name.trim() || null, client_email: f.email.trim() || null, client_phone: f.phone.trim() || null,
      client_notes: f.notes.trim() || null, send_report: f.report,
    });
    setSaving(false);
    if (!ok) { toast.error("Não foi possível salvar o cliente."); return; }
    toast.success("Cliente atualizado.");
    setEditing(false);
    refresh();
  };
  return (
    <div className="mt-3 space-y-2 rounded-md border border-border p-3">
      <div><Label>Nome do cliente</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><Label>Telefone</Label><Input inputMode="tel" placeholder="(11) 99999-9999" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div><Label>Observações</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <div className="flex items-center gap-2"><Switch checked={f.report} onCheckedChange={(v) => setF({ ...f, report: v })} /><Label>Receber relatório semanal</Label></div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || group.media.length === 0}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

function AddMediaPicker({ group, all }: { group: ClientGroup; all: ClientMedia[] }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState("");
  const inGroup = new Set(group.media.map((m) => m.id));
  const list = all.filter((m) => !inGroup.has(m.id) && m.title.toLowerCase().includes(t.toLowerCase())).slice(0, 30);
  const base = group.media[0];
  const add = async (m: ClientMedia) => {
    const ok = await saveContacts([m.id, ...(group.hasContact ? [] : group.media.map((x) => x.id))], {
      client_name: group.name, client_email: group.emails[0] ?? null, client_phone: group.phones[0] ?? null,
      client_notes: group.notes, client_type: group.explicitType ? group.type : null, send_report: base?.send_report ?? false,
    });
    if (!ok) { toast.error("Não foi possível adicionar o anúncio."); return; }
    toast.success(`"${m.title}" adicionado a ${group.name}.`);
    refresh();
  };
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Adicionar anúncio a este cliente</Button>;
  return (
    <div className="w-full space-y-2 rounded-md border border-border p-2">
      <Input autoFocus placeholder="Buscar anúncio" value={t} onChange={(e) => setT(e.target.value)} />
      <div className="max-h-56 overflow-y-auto">
        {list.map((m) => (
          <button key={m.id} onClick={() => add(m)} className="flex w-full justify-between rounded px-2 py-1.5 text-left hover:bg-muted">
            <span>{m.title}</span><span className="text-xs text-muted-foreground">{m.client_name ?? "sem cliente"}</span>
          </button>
        ))}
        {list.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhum anúncio encontrado.</p>}
      </div>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
    </div>
  );
}

function MediaEditor({ m, canRemove }: { m: ClientMedia; canRemove: boolean }) {
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ start: m.start_date ?? "", end: m.end_date ?? "", active: m.active });
  const save = async () => {
    const { error } = await supabase.from("media").update({ start_date: f.start || null, end_date: f.end || null, active: f.active }).eq("id", m.id);
    if (error) { toast.error("Não foi possível salvar a arte."); return; }
    toast.success("Arte atualizada."); setEditing(false); refresh();
  };
  const remove = async () => {
    const ok = await saveContacts([m.id], { client_name: null, client_email: null, client_phone: null, client_notes: null, send_report: false });
    if (!ok) { toast.error("Não foi possível remover."); return; }
    toast.success("Anúncio removido deste cliente."); refresh();
  };
  if (!editing) return (
    <div className="mt-2 flex gap-2">
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>Editar arte</Button>
      {canRemove && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={remove}>Remover deste cliente</Button>}
    </div>
  );
  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Início</Label><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
        <div><Label className="text-xs">Fim</Label><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><Label className="text-xs">Ativa</Label></div>
      <div className="flex gap-2"><Button size="sm" onClick={save}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></div>
    </div>
  );
}

const TYPE_LABEL = { pagante: "Pagante", parceiro: "Parceiro" } as const;

function TypeBadge({ type }: { type: ClientType | null }) {
  if (!type) return <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Sem tipo</span>;
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${type === "pagante" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"}`}>
      {TYPE_LABEL[type]}
    </span>
  );
}

function TypeSelector({ group, canEdit }: { group: ClientGroup; canEdit: boolean }) {
  const refresh = useRefresh();
  const set = async (t: ClientType) => {
    const res = await Promise.all(group.media.map((m) =>
      supabase.from("media_contacts").upsert(
        { media_id: m.id, client_type: t, client_name: m.client_name ?? (group.hasContact ? group.name : group.name), send_report: m.send_report },
        { onConflict: "media_id" },
      ),
    ));
    if (res.some((r) => r.error)) { toast.error("Não foi possível alterar o tipo."); return; }
    toast.success(`Cliente marcado como ${TYPE_LABEL[t]}.`);
    refresh();
  };
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Tipo:</span>
      {canEdit && group.media.length > 0 ? (
        (["pagante", "parceiro"] as const).map((t) => (
          <Button key={t} size="sm" variant={group.type === t ? "default" : "outline"} onClick={() => set(t)}>{TYPE_LABEL[t]}</Button>
        ))
      ) : <TypeBadge type={group.type} />}
      {!group.explicitType && group.type && <span className="text-xs text-muted-foreground">(automático)</span>}
    </div>
  );
}

function TypeDashboard({ clients, finance }: { clients: ClientGroup[]; finance: boolean }) {
  const pag = clients.filter((c) => c.type === "pagante");
  const par = clients.filter((c) => c.type === "parceiro");
  const none = clients.length - pag.length - par.length;
  const liveOf = (list: ClientGroup[]) => list.reduce((n, c) => n + c.media.filter(isLive).length, 0);
  const month = today().slice(0, 7);
  const monthRevenue = pag.reduce((s, c) => s + c.revenues.filter((r) => r.payment_date.startsWith(month)).reduce((a, r) => a + (Number(r.amount) || 0), 0), 0);
  const pie = [
    { name: "Pagantes", value: pag.length, color: "var(--primary)" },
    { name: "Parceiros", value: par.length, color: "var(--chart-2)" },
    { name: "Sem tipo", value: none, color: "var(--muted-foreground)" },
  ].filter((d) => d.value > 0);
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Clientes" value={String(clients.length)} />
        <Kpi label="Pagantes" value={String(pag.length)} />
        <Kpi label="Parceiros" value={String(par.length)} />
        <Kpi label="Sem tipo" value={String(none)} />
        <Kpi label="Artes no ar (pagantes)" value={String(liveOf(pag))} />
        <Kpi label="Artes no ar (parceiros)" value={String(liveOf(par))} />
        {finance && <Kpi label="Receita dos pagantes no mês" value={brl(monthRevenue)} />}
        {finance && <Kpi label="Média por pagante" value={brl(pag.length ? monthRevenue / pag.length : 0)} />}
      </div>
      <div className="h-[180px] rounded-md bg-muted p-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
              {pie.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
