import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wallet, TrendingUp, Receipt, CalendarDays } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/painel/financeiro")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Financeiro" },
      { name: "description", content: "Controle de custos e despesas do projeto TelaHUB." },
      { property: "og:title", content: "TelaHUB — Financeiro" },
      { property: "og:description", content: "Custos e dashboards financeiros do TelaHUB." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinancePage,
});

const CATEGORIES = [
  { value: "suporte_tv", label: "Suportes para TV" },
  { value: "tv", label: "TVs" },
  { value: "tv_box", label: "TV box / Fire Stick" },
  { value: "plaquinha", label: "Plaquinhas para TV" },
  { value: "desenvolvimento", label: "Créditos de desenvolvimento" },
  { value: "patrocinado", label: "Patrocinado / anúncios" },
  { value: "instalacao", label: "Instalação / mão de obra" },
  { value: "outros", label: "Outros" },
] as const;

const COLORS = [
  "var(--chart-cat-1)",
  "var(--chart-cat-2)",
  "var(--chart-cat-3)",
  "var(--chart-cat-4)",
  "var(--chart-cat-5)",
  "var(--chart-cat-6)",
  "var(--chart-cat-7)",
  "var(--chart-cat-8)",
];

const tooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--primary)", fontWeight: 600 },
};

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? "Outros";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  quantity: number;
  supplier: string | null;
  notes: string | null;
}

type Form = {
  id?: string;
  description: string;
  category: string;
  amount: string;
  expense_date: string;
  quantity: string;
  supplier: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): Form => ({
  description: "",
  category: "tv_box",
  amount: "",
  expense_date: today(),
  quantity: "1",
  supplier: "",
  notes: "",
});

function FinancePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [cat, setCat] = useState("all");

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as Expense[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const amount = Number(f.amount.replace(",", "."));
      if (!f.description.trim()) throw new Error("Informe a descrição.");
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Valor inválido.");
      const row = {
        description: f.description.trim(),
        category: f.category,
        amount,
        expense_date: f.expense_date,
        quantity: Math.max(1, Number(f.quantity) || 1),
        supplier: f.supplier.trim() || null,
        notes: f.notes.trim() || null,
      };
      const { error } = f.id
        ? await supabase.from("expenses").update(row).eq("id", f.id)
        : await supabase.from("expenses").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo salvo.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo removido.");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: () => toast.error("Não foi possível remover."),
  });

  const years = useMemo(() => {
    const s = new Set(expenses.map((e) => e.expense_date.slice(0, 4)));
    s.add(String(new Date().getFullYear()));
    return [...s].sort().reverse();
  }, [expenses]);

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) => e.expense_date.startsWith(year) && (cat === "all" || e.category === cat),
      ),
    [expenses, year, cat],
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const allTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = today().slice(0, 7);
  const monthTotal = expenses
    .filter((e) => e.expense_date.startsWith(thisMonth))
    .reduce((s, e) => s + e.amount, 0);

  const monthly = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const arr = months.map((m) => ({ mes: m, total: 0 }));
    filtered.forEach((e) => {
      const m = arr[Number(e.expense_date.slice(5, 7)) - 1];
      if (m) m.total += e.amount;
    });
    return arr;
  }, [filtered]);

  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return [...map.entries()]
      .map(([k, v]) => ({ name: catLabel(k), value: v }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const activeMonths = monthly.filter((m) => m.total > 0).length || 1;

  return (
    <AdminShell
      title="Financeiro"
      description="Registre os custos do TelaHUB e acompanhe para onde o dinheiro vai."
      actions={
        <Button onClick={() => setForm(emptyForm())}>
          <Plus className="mr-2 h-4 w-4" /> Novo custo
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Wallet} label={`Total ${year}`} value={brl(total)} />
        <Kpi icon={CalendarDays} label="Este mês" value={brl(monthTotal)} />
        <Kpi icon={TrendingUp} label="Média mensal" value={brl(total / activeMonths)} />
        <Kpi icon={Receipt} label="Total investido (geral)" value={brl(allTotal)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
          <h3 className="mb-4 font-display font-semibold">Custos por mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  {...tooltipStyle}
                />
                <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 font-display font-semibold">Por categoria</h3>
          {byCat.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">Sem custos no período.</p>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                      {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => brl(v)}
                      {...tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {byCat.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="font-medium">{brl(c.value)} <span className="text-muted-foreground">({total ? Math.round((c.value / total) * 100) : 0}%)</span></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Qtd.</th>
              <th className="p-3">Fornecedor</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum custo registrado. Clique em "Novo custo".</td></tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="p-3 whitespace-nowrap">{e.expense_date.split("-").reverse().join("/")}</td>
                  <td className="p-3">{e.description}{e.notes && <div className="text-xs text-muted-foreground">{e.notes}</div>}</td>
                  <td className="p-3">{catLabel(e.category)}</td>
                  <td className="p-3">{e.quantity}</td>
                  <td className="p-3">{e.supplier ?? "—"}</td>
                  <td className="p-3 text-right font-medium">{brl(e.amount)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setForm({
                        id: e.id, description: e.description, category: e.category,
                        amount: String(e.amount), expense_date: e.expense_date,
                        quantity: String(e.quantity), supplier: e.supplier ?? "", notes: e.notes ?? "",
                      })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => {
                        if (confirm("Excluir este custo?")) remove.mutate(e.id);
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Editar custo" : "Novo custo"}</DialogTitle></DialogHeader>
          {form && (
            <form
              className="grid gap-4"
              onSubmit={(ev) => { ev.preventDefault(); save.mutate(form); }}
            >
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: 5 suportes articulados" />
              </div>
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Valor total (R$)</Label>
                  <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade</Label>
                  <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Fornecedor (opcional)</Label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </div>
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
    </AdminShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
