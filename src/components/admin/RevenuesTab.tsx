import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BellRing, CalendarDays, HandCoins, Pencil, Plus, Trash2, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { billingReminders } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const METHODS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];
const methodLabel = (v: string) => METHODS.find((m) => m.value === v)?.label ?? v;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (d: string) => d.split("-").reverse().join("/");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const NONE = "__none";

const tooltipStyle = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" },
  labelStyle: { color: "var(--muted-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--primary)", fontWeight: 600 },
};

interface Revenue {
  id: string;
  media_id: string | null;
  client_name: string;
  description: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  recurrence_days: number;
  recurring: boolean;
  notes: string | null;
}

type Form = {
  id?: string;
  media_id: string;
  client_name: string;
  description: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  recurring: boolean;
  notes: string;
};

const emptyForm = (): Form => ({
  media_id: NONE, client_name: "", description: "", amount: "", payment_date: today(),
  payment_method: "pix", recurring: true, notes: "",
});

export function RevenuesTab({ year }: { year: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["revenues"],
    queryFn: async () => {
      const [rev, media] = await Promise.all([
        supabase.from("revenues").select("*").order("payment_date", { ascending: false }),
        supabase.from("media").select("id,title").order("title"),
      ]);
      if (rev.error) throw rev.error;
      return {
        revenues: (rev.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Revenue[],
        media: (media.data ?? []) as { id: string; title: string }[],
      };
    },
  });
  const revenues = data?.revenues ?? [];
  const media = data?.media ?? [];
  const mediaTitle = (id: string | null) => media.find((m) => m.id === id)?.title;

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const amount = Number(f.amount.replace(/\./g, "").replace(",", ".")) || Number(f.amount);
      if (!f.client_name.trim()) throw new Error("Informe o cliente.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor inválido.");
      const row = {
        media_id: f.media_id === NONE ? null : f.media_id,
        client_name: f.client_name.trim(),
        description: f.description.trim() || null,
        amount,
        payment_date: f.payment_date,
        payment_method: f.payment_method,
        recurring: f.recurring,
        recurrence_days: 30,
        notes: f.notes.trim() || null,
      };
      const { error } = f.id
        ? await supabase.from("revenues").update(row).eq("id", f.id)
        : await supabase.from("revenues").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento salvo.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["revenues"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento removido.");
      qc.invalidateQueries({ queryKey: ["revenues"] });
    },
    onError: () => toast.error("Não foi possível remover."),
  });

  const pickMedia = (f: Form, id: string): Form => {
    if (id === NONE) return { ...f, media_id: id };
    const last = revenues.find((r) => r.media_id === id);
    return {
      ...f,
      media_id: id,
      client_name: last?.client_name ?? mediaTitle(id) ?? f.client_name,
      amount: last ? String(last.amount) : f.amount,
      payment_method: last?.payment_method ?? f.payment_method,
    };
  };

  const reminders = useMemo(() => billingReminders(revenues, today()), [revenues]);
  const filtered = revenues.filter((r) => r.payment_date.startsWith(year));
  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const month = today().slice(0, 7);
  const monthTotal = revenues.filter((r) => r.payment_date.startsWith(month)).reduce((s, r) => s + r.amount, 0);
  const clients = new Set(filtered.map((r) => r.media_id ?? r.client_name.toLowerCase())).size;
  const upcoming = billingReminders(revenues, today(), 30).reduce((s, r) => s + r.last.amount, 0);

  const monthly = useMemo(() => {
    const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const arr = names.map((m) => ({ mes: m, total: 0 }));
    filtered.forEach((r) => {
      const m = arr[Number(r.payment_date.slice(5, 7)) - 1];
      if (m) m.total += r.amount;
    });
    return arr;
  }, [filtered]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setForm(emptyForm())}><Plus className="mr-2 h-4 w-4" /> Novo recebimento</Button>
      </div>

      {reminders.length > 0 && (
        <div className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <BellRing className="h-4 w-4 text-primary" /> Lembretes de cobrança
          </h3>
          <ul className="grid gap-2">
            {reminders.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                <div>
                  <div className="font-medium">{r.last.client_name}{r.last.media_id && mediaTitle(r.last.media_id) ? ` — ${mediaTitle(r.last.media_id)}` : ""}</div>
                  <div className={`text-sm ${r.daysLeft < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {r.daysLeft < 0 ? `Venceu há ${-r.daysLeft} dia(s)` : r.daysLeft === 0 ? "Vence hoje" : `Vence em ${r.daysLeft} dia(s)`} · {fmt(r.dueDate)} · último {brl(r.last.amount)}
                  </div>
                </div>
                <Button size="sm" onClick={() => setForm({
                  ...emptyForm(),
                  media_id: r.last.media_id ?? NONE,
                  client_name: r.last.client_name,
                  description: r.last.description ?? "",
                  amount: String(r.last.amount),
                  payment_method: r.last.payment_method,
                })}>Registrar pagamento</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={HandCoins} label={`Recebido ${year}`} value={brl(total)} />
        <Kpi icon={CalendarDays} label="Recebido este mês" value={brl(monthTotal)} />
        <Kpi icon={TrendingUp} label="A receber (30 dias)" value={brl(upcoming)} />
        <Kpi icon={Users} label="Ticket médio por cliente" value={brl(clients ? total / clients : 0)} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-display font-semibold">Recebimentos por mês</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => brl(v)} {...tooltipStyle} />
              <Bar dataKey="total" name="Recebido" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Cliente / anúncio</th>
              <th className="p-3">Forma</th>
              <th className="p-3">Próxima cobrança</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum recebimento. Clique em "Novo recebimento".</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3 whitespace-nowrap">{fmt(r.payment_date)}</td>
                <td className="p-3">
                  {r.client_name}
                  {r.media_id && mediaTitle(r.media_id) && <div className="text-xs text-muted-foreground">Anúncio: {mediaTitle(r.media_id)}</div>}
                  {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                </td>
                <td className="p-3">{methodLabel(r.payment_method)}</td>
                <td className="p-3">{r.recurring ? fmt(new Date(Date.parse(`${r.payment_date}T00:00:00Z`) + r.recurrence_days * 86_400_000).toISOString().slice(0, 10)) : "Avulso"}</td>
                <td className="p-3 text-right font-medium">{brl(r.amount)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setForm({
                      id: r.id, media_id: r.media_id ?? NONE, client_name: r.client_name,
                      description: r.description ?? "", amount: String(r.amount), payment_date: r.payment_date,
                      payment_method: r.payment_method, recurring: r.recurring, notes: r.notes ?? "",
                    })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => {
                      if (confirm("Excluir este recebimento?")) remove.mutate(r.id);
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Editar recebimento" : "Novo recebimento"}</DialogTitle></DialogHeader>
          {form && (
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
              <div className="grid gap-2">
                <Label>Anúncio vinculado</Label>
                <Select value={form.media_id} onValueChange={(v) => setForm(pickMedia(form, v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem anúncio (avulso)</SelectItem>
                    {media.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Ao escolher, preenchemos cliente, valor e forma do último pagamento.</p>
              </div>
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Descrição (opcional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Mensalidade de novembro" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Valor (R$)</Label>
                  <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                </div>
                <div className="grid gap-2">
                  <Label>Data pago</Label>
                  <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Forma</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                Lembrar cobrança a cada 30 dias
                <Switch checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: v })} />
              </label>
              <div className="grid gap-2">
                <Label>Observações (opcional)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof HandCoins; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-primary" /> {label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
