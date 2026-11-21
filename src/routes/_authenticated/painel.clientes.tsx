import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Mail, Phone, Image as ImageIcon, Video, MonitorPlay, Wallet, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { canSeeFinance, useMyRoles } from "@/lib/my-role";
import { groupClients, type ClientGroup, type ClientMedia, type ClientRevenue } from "@/lib/clients";
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
  const [openKey, setOpenKey] = useState<string | null>(null);

  const dataQ = useQuery({
    queryKey: ["clients-overview", finance],
    queryFn: async () => {
      const [mediaR, contactsR, itemsR, screensR, revR] = await Promise.all([
        supabase.from("media").select("id, title, type, active, start_date, end_date"),
        supabase.from("media_contacts").select("media_id, client_name, client_email, client_phone, send_report"),
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
        return { ...m, client_name: c?.client_name ?? null, client_email: c?.client_email ?? null, client_phone: c?.client_phone ?? null, send_report: c?.send_report ?? false };
      });
      const screensByMedia = new Map<string, string[]>();
      for (const it of itemsR.data ?? []) {
        const names = (screensR.data ?? []).filter((s) => s.playlist_id === it.playlist_id).map((s) => s.name);
        const cur = screensByMedia.get(it.media_id) ?? [];
        screensByMedia.set(it.media_id, [...new Set([...cur, ...names])]);
      }
      return { clients: groupClients(media, (revR.data ?? []) as ClientRevenue[]), screensByMedia };
    },
    staleTime: 60_000,
  });

  const clients = useMemo(() => {
    const all = dataQ.data?.clients ?? [];
    const t = q.trim().toLowerCase();
    return t ? all.filter((c) => c.name.toLowerCase().includes(t) || c.emails.some((e) => e.toLowerCase().includes(t)) || c.arts.some((a) => a.title.toLowerCase().includes(t))) : all;
  }, [dataQ.data, q]);
  const open = clients.find((c) => c.key === openKey) ?? null;
  const screensOf = (id: string) => dataQ.data?.screensByMedia.get(id) ?? [];

  return (
    <AdminShell title="Clientes" description="Tudo de cada cliente em um só lugar: contato, artes e pagamentos.">
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
          <ClientCard key={c.key} c={c} finance={finance} onOpen={() => setOpenKey(c.key)} />
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenKey(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader><SheetTitle>{open.name}</SheetTitle></SheetHeader>
              <section className="mt-4 space-y-1 text-sm">
                <h3 className="font-semibold">Contato</h3>
                {open.emails.length ? open.emails.map((e) => (
                  <a key={e} href={`mailto:${e}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="h-4 w-4" />{e}</a>
                )) : <p className="text-muted-foreground">Sem e-mail cadastrado</p>}
                {open.phones.map((ph) => (
                  <a key={ph} href={`tel:${ph.replace(/\D/g, "")}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4" />{ph}</a>
                ))}
                {staff && <PhoneForm group={open} />}
                {!open.hasContact && (
                  <p className="mt-2 flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4" />Sem contato cadastrado. Complete nome e e-mail no anúncio.</p>
                )}
              </section>
              <section className="mt-5 space-y-2 text-sm">
                <h3 className="font-semibold">Artes ({open.arts.length})</h3>
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
                  </div>
                ))}
                  </div>
                ))}
              </section>
              {finance && (
                <section className="mt-5 space-y-2 text-sm">
                  <h3 className="font-semibold">Financeiro</h3>
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
      <p className="font-semibold">{c.name}</p>
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

function PhoneForm({ group }: { group: ClientGroup }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(group.phones[0] ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const value = phone.trim() || null;
    const results = await Promise.all(group.media.map((m) =>
      supabase.from("media_contacts").upsert(
        { media_id: m.id, client_phone: value, client_name: m.client_name, client_email: m.client_email, send_report: m.send_report },
        { onConflict: "media_id" },
      ),
    ));
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast.error("Não foi possível salvar o telefone.");
      return;
    }
    toast.success("Telefone salvo.");
    qc.invalidateQueries({ queryKey: ["clients-overview"] });
  };
  return (
    <div className="mt-2 flex gap-2">
      <Input placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      <Button size="sm" onClick={save} disabled={saving || group.media.length === 0}>{group.phones.length ? "Atualizar" : "Adicionar"}</Button>
    </div>
  );
}
