import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { canUseSales, fetchMyRoles } from "@/lib/my-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/painel/funil")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Funil de Vendas" },
      { name: "description", content: "Acompanhe os leads comerciais do TelaHUB em um quadro Kanban." },
      { property: "og:title", content: "TelaHUB — Funil de Vendas" },
      { property: "og:description", content: "Funil comercial do TelaHUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    if (!canUseSales(await fetchMyRoles())) throw redirect({ to: "/painel" });
  },
  component: FunnelPage,
});

const STAGES = [
  { id: "prospeccao", label: "Prospecção" },
  { id: "contato", label: "Contato feito" },
  { id: "reuniao", label: "Reunião/Demonstração" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "ganho", label: "Fechado (ganho)" },
  { id: "perdido", label: "Perdido" },
] as const;
type Stage = (typeof STAGES)[number]["id"];
const stageLabel = (s: string | null) => STAGES.find((x) => x.id === s)?.label ?? s ?? "—";
const OPEN: Stage[] = ["prospeccao", "contato", "reuniao", "proposta", "negociacao"];
const ACTIVITIES = [
  { id: "nota", label: "Anotação" }, { id: "ligacao", label: "Ligação" }, { id: "visita", label: "Visita" },
  { id: "mensagem", label: "Mensagem" }, { id: "reuniao", label: "Reunião" },
];
const ALL = "__all";
const NONE = "__none";

interface Lead {
  id: string; business_name: string; segment: string | null; city: string | null; contact_name: string | null;
  phone: string | null; source: string | null; monthly_value: number; owner_id: string | null;
  next_action_date: string | null; notes: string | null; lost_reason: string | null; stage: Stage;
}
type LeadForm = Omit<Lead, "id" | "monthly_value"> & { id?: string; monthly_value: string };
const emptyForm: LeadForm = {
  business_name: "", segment: "", city: "", contact_name: "", phone: "", source: "", monthly_value: "",
  owner_id: null, next_action_date: "", notes: "", lost_reason: "", stage: "prospeccao",
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayStr = () => new Date().toLocaleDateString("en-CA");
const isOverdue = (l: Lead) => !!l.next_action_date && OPEN.includes(l.stage) && l.next_action_date < todayStr();
const fmtDate = (d: string) => d.split("-").reverse().join("/");

function FunnelPage() {
  const qc = useQueryClient();
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [form, setForm] = useState<LeadForm | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [lostMove, setLostMove] = useState<{ id: string; reason: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const leadsQ = useQuery({
    queryKey: ["sales-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_leads").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l) => ({ ...l, monthly_value: Number(l.monthly_value) })) as Lead[];
    },
  });
  const usersQ = useQuery({
    queryKey: ["sales-users"],
    queryFn: async () => {
      const { data } = await supabase.rpc("list_sales_users");
      return (data ?? []) as { id: string; name: string | null; email: string | null }[];
    },
  });
  const userName = (id: string | null) => {
    const u = usersQ.data?.find((x) => x.id === id);
    return u ? u.name || u.email || "—" : "—";
  };

  const leads = (leadsQ.data ?? []).filter((l) =>
    ownerFilter === ALL ? true : ownerFilter === NONE ? !l.owner_id : l.owner_id === ownerFilter);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sales-leads"] });
    qc.invalidateQueries({ queryKey: ["sales-events"] });
  };

  const kpi = useMemo(() => {
    const won = leads.filter((l) => l.stage === "ganho").length;
    const lost = leads.filter((l) => l.stage === "perdido").length;
    return {
      negotiating: leads.filter((l) => OPEN.includes(l.stage)).reduce((s, l) => s + l.monthly_value, 0),
      conversion: won + lost ? Math.round((won / (won + lost)) * 100) : null,
      overdue: leads.filter(isOverdue).length,
    };
  }, [leads]);

  const moveMut = useMutation({
    mutationFn: async (v: { id: string; stage: Stage; lost_reason?: string }) => {
      const { error } = await supabase.from("sales_leads")
        .update({ stage: v.stage, lost_reason: v.stage === "perdido" ? v.lost_reason : null }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  function drop(stage: Stage) {
    const lead = leadsQ.data?.find((l) => l.id === dragId);
    setDragId(null);
    if (!lead || lead.stage === stage) return;
    if (stage === "perdido") setLostMove({ id: lead.id, reason: "" });
    else moveMut.mutate({ id: lead.id, stage });
  }

  const saveMut = useMutation({
    mutationFn: async (f: LeadForm) => {
      if (f.business_name.trim().length < 2) throw new Error("Informe o nome do estabelecimento.");
      if (f.stage === "perdido" && !f.lost_reason?.trim()) throw new Error("Informe o motivo da perda.");
      const raw = f.monthly_value.trim();
      const value = raw ? Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw) : 0;
      if (!Number.isFinite(value) || value < 0) throw new Error("Valor mensal inválido.");
      const clean = (s: string | null) => (s?.trim() ? s.trim() : null);
      const row = {
        business_name: f.business_name.trim(), segment: clean(f.segment), city: clean(f.city),
        contact_name: clean(f.contact_name), phone: clean(f.phone), source: clean(f.source),
        monthly_value: value, owner_id: f.owner_id, next_action_date: clean(f.next_action_date),
        notes: clean(f.notes), stage: f.stage, lost_reason: f.stage === "perdido" ? clean(f.lost_reason) : null,
      };
      const { error } = f.id
        ? await supabase.from("sales_leads").update(row).eq("id", f.id)
        : await supabase.from("sales_leads").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lead salvo."); setForm(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openLead = leadsQ.data?.find((l) => l.id === openLeadId) ?? null;

  return (
    <AdminShell
      title="Funil de Vendas"
      description="Arraste os cards entre as etapas. Clique em um card para ver o histórico."
      actions={<Button onClick={() => setForm({ ...emptyForm })}><Plus className="mr-2 h-4 w-4" />Novo lead</Button>}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Leads por etapa</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {STAGES.map((s) => (
              <span key={s.id} className="rounded bg-muted px-1.5 py-0.5">
                {s.label.split(" ")[0]}: <b>{leads.filter((l) => l.stage === s.id).length}</b>
              </span>
            ))}
          </div>
        </div>
        <Kpi label="Valor total em negociação (mensal)" value={brl(kpi.negotiating)} />
        <Kpi label="Taxa de conversão (ganhos / encerrados)" value={kpi.conversion === null ? "—" : `${kpi.conversion}%`} />
        <Kpi label="Follow-ups atrasados" value={String(kpi.overdue)} alert={kpi.overdue > 0} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Label className="text-sm">Responsável</Label>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value={NONE}>Sem responsável</SelectItem>
            {usersQ.data?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {leadsQ.isError ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">{(leadsQ.error as Error).message}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const items = leads.filter((l) => l.stage === s.id);
            return (
              <div
                key={s.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(s.id)}
                className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex min-h-32 flex-col gap-2 p-2">
                  {items.map((l) => (
                    <button
                      key={l.id}
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onClick={() => setOpenLeadId(l.id)}
                      className={`rounded-md border bg-card p-3 text-left text-sm shadow-sm transition-colors hover:border-primary ${isOverdue(l) ? "border-destructive" : "border-border"}`}
                    >
                      <p className="font-medium">{l.business_name}</p>
                      <p className="text-xs text-muted-foreground">{[l.segment, l.city].filter(Boolean).join(" · ") || "—"}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-primary">{l.monthly_value ? brl(l.monthly_value) : ""}</span>
                        <span className="text-muted-foreground">{userName(l.owner_id)}</span>
                      </div>
                      {l.next_action_date && (
                        <p className={`mt-1 flex items-center gap-1 text-xs ${isOverdue(l) ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                          {isOverdue(l) ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                          {isOverdue(l) ? "Atrasado: " : "Próxima ação: "}{fmtDate(l.next_action_date)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!lostMove} onOpenChange={(o) => !o && setLostMove(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo da perda</DialogTitle></DialogHeader>
          <Textarea value={lostMove?.reason ?? ""} onChange={(e) => setLostMove((m) => m && { ...m, reason: e.target.value })} placeholder="Por que este lead foi perdido?" />
          <DialogFooter>
            <Button
              disabled={!lostMove?.reason.trim()}
              onClick={() => { if (lostMove) moveMut.mutate({ id: lostMove.id, stage: "perdido", lost_reason: lostMove.reason.trim() }); setLostMove(null); }}
            >Mover para Perdido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
          {form && (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }}>
              <Field label="Estabelecimento *" className="sm:col-span-2"><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></Field>
              <Field label="Segmento"><Input value={form.segment ?? ""} onChange={(e) => setForm({ ...form, segment: e.target.value })} /></Field>
              <Field label="Cidade"><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="Contato (nome)"><Input value={form.contact_name ?? ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
              <Field label="Telefone/WhatsApp"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Origem"><Input value={form.source ?? ""} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Indicação, Instagram…" /></Field>
              <Field label="Valor mensal estimado (R$)"><Input inputMode="decimal" value={form.monthly_value} onChange={(e) => setForm({ ...form, monthly_value: e.target.value })} placeholder="0,00" /></Field>
              <Field label="Responsável">
                <Select value={form.owner_id ?? NONE} onValueChange={(v) => setForm({ ...form, owner_id: v === NONE ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem responsável</SelectItem>
                    {usersQ.data?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Próxima ação"><Input type="date" value={form.next_action_date ?? ""} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} /></Field>
              <Field label="Etapa">
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {form.stage === "perdido" && (
                <Field label="Motivo da perda *"><Input value={form.lost_reason ?? ""} onChange={(e) => setForm({ ...form, lost_reason: e.target.value })} /></Field>
              )}
              <Field label="Observações" className="sm:col-span-2"><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Salvando…" : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={!!openLead} onOpenChange={(o) => !o && setOpenLeadId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {openLead && (
            <LeadDetail
              lead={openLead}
              userName={userName}
              onEdit={() => {
                setForm({ ...openLead, monthly_value: openLead.monthly_value ? String(openLead.monthly_value) : "" });
                setOpenLeadId(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}

function Kpi({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label>{label}</Label>{children}</div>;
}

function LeadDetail({ lead, userName, onEdit }: { lead: Lead; userName: (id: string | null) => string; onEdit: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState("nota");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 16));

  const events = useQuery({
    queryKey: ["sales-events", lead.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_lead_events").select("*").eq("lead_id", lead.id).order("event_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const addMut = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Escreva a anotação.");
      const { error } = await supabase.from("sales_lead_events").insert({
        lead_id: lead.id, kind, body: body.trim(), event_date: new Date(when).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["sales-events", lead.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const kindLabel = (k: string) => (k === "etapa" ? "Mudança de etapa" : ACTIVITIES.find((a) => a.id === k)?.label ?? k);

  return (
    <div className="space-y-5">
      <SheetHeader><SheetTitle>{lead.business_name}</SheetTitle></SheetHeader>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {[
          ["Etapa", stageLabel(lead.stage)], ["Responsável", userName(lead.owner_id)],
          ["Segmento", lead.segment], ["Cidade", lead.city], ["Contato", lead.contact_name], ["Telefone", lead.phone],
          ["Origem", lead.source], ["Valor mensal", lead.monthly_value ? brl(lead.monthly_value) : null],
          ["Próxima ação", lead.next_action_date ? fmtDate(lead.next_action_date) : null],
          ["Motivo da perda", lead.lost_reason],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {lead.notes && <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{lead.notes}</p>}
      <Button variant="outline" onClick={onEdit}>Editar lead</Button>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-semibold">Registrar atividade</p>
        <div className="flex gap-2">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{ACTIVITIES.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="O que aconteceu?" />
        <Button size="sm" disabled={addMut.isPending} onClick={() => addMut.mutate()}>Adicionar</Button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Histórico</p>
        <ol className="space-y-2">
          {events.data?.map((ev) => (
            <li key={ev.id} className="rounded-md border border-border p-2 text-sm">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{kindLabel(ev.kind)} · {userName(ev.user_id)}</span>
                <span>{new Date(ev.event_date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              {ev.kind === "etapa" && (
                <p>{ev.from_stage ? `${stageLabel(ev.from_stage)} → ` : "Criado em "}{stageLabel(ev.to_stage)}</p>
              )}
              {ev.body && <p className="whitespace-pre-wrap">{ev.body}</p>}
            </li>
          ))}
          {events.data?.length === 0 && <li className="text-sm text-muted-foreground">Sem registros.</li>}
        </ol>
      </div>
    </div>
  );
}
