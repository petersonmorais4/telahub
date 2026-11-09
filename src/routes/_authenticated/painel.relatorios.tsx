import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Download, FileBarChart, Images, MonitorPlay, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import telahubLogo from "@/assets/telahub-logo-oficial-pdf.png.asset.json";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterReportScreens } from "@/lib/report-screen-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { MediaRow, ScreenRow } from "@/lib/signage";

export const Route = createFileRoute("/_authenticated/painel/relatorios")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Relatórios" },
      {
        name: "description",
        content: "Consulte e exporte o histórico de exibições por anúncio, tela e período.",
      },
      { property: "og:title", content: "TelaHUB — Relatórios" },
      {
        property: "og:description",
        content: "Relatórios de anúncios exibidos nas telas da rede.",
      },
      { name: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RelatoriosPage,
});

type Period = "daily" | "weekly" | "monthly";

interface ReportLog {
  id: string;
  played_at: string;
  media_id: string | null;
  screen_id: string | null;
  media: { title: string } | null;
  screens: { name: string; location: string | null } | null;
}

const ALL = "__all__";
const PAGE_SIZE = 50;
const periodNames: Record<Period, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

function saoPauloDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function getPeriodRange(period: Period) {
  const today = saoPauloDateParts();
  const daysBack = period === "daily" ? 0 : period === "weekly" ? 6 : 29;
  const startDay = new Date(Date.UTC(today.year, today.month - 1, today.day - daysBack));
  const year = startDay.getUTCFullYear();
  const month = String(startDay.getUTCMonth() + 1).padStart(2, "0");
  const day = String(startDay.getUTCDate()).padStart(2, "0");
  return {
    start: `${year}-${month}-${day}T03:00:00.000Z`,
    end: new Date().toISOString(),
  };
}

function formatPlayedAt(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date),
  };
}

function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [mediaId, setMediaId] = useState(ALL);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[] | null>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const range = useMemo(() => getPeriodRange(period), [period]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["reports", period, mediaId],
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [mediaResult, screensResult] = await Promise.all([
        supabase.from("media").select("*").in("type", ["image", "video"]).order("title"),
        supabase.from("screens").select("*").order("name"),
      ]);
      if (mediaResult.error) throw mediaResult.error;
      if (screensResult.error) throw screensResult.error;

      const logs: ReportLog[] = [];
      const selection: string =
        "id, played_at, media_id, screen_id, media(title), screens(name, location)";
      for (let from = 0; ; from += 1000) {
        let query = supabase
          .from("play_logs")
          .select(selection)
          .gte("played_at", range.start)
          .lte("played_at", new Date().toISOString())
          .order("played_at", { ascending: false })
          .range(from, from + 999);
        if (mediaId !== ALL) query = query.eq("media_id", mediaId);
        const result = await query.returns<ReportLog[]>();
        if (result.error) throw result.error;
        logs.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 1000) break;
      }

      return {
        logs,
        media: (mediaResult.data ?? []) as MediaRow[],
        screens: (screensResult.data ?? []) as ScreenRow[],
      };
    },
  });

  const screens = (data?.screens ?? []).filter((screen) => !/teste/i.test(screen.name));
  const logs = useMemo(() => filterReportScreens(data?.logs ?? [], selectedScreenIds), [data?.logs, selectedScreenIds]);
  const screenLabel = selectedScreenIds === null ? "Todos os pontos"
    : selectedScreenIds.length === 0 ? "Nenhum ponto selecionado"
    : selectedScreenIds.length === 1 ? screens.find((screen) => screen.id === selectedScreenIds[0])?.name ?? "1 ponto selecionado"
    : `${selectedScreenIds.length} pontos selecionados`;

  function changeScreens(ids: string[] | null) {
    setSelectedScreenIds(ids);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const visibleLogs = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const uniqueMedia = new Set(logs.map((log) => log.media_id).filter(Boolean)).size;
  const uniqueScreens = new Set(logs.map((log) => log.screen_id).filter(Boolean)).size;

  function changePeriod(value: Period) {
    setPeriod(value);
    setPage(1);
  }

  async function exportPdf() {
    if (logs.length === 0) return;
    setExporting(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const logoResponse = await fetch(telahubLogo.url);
      if (!logoResponse.ok) throw new Error("Não foi possível carregar o logo da TelaHUB.");
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Formato de logo inválido."));
        reader.onerror = () => reject(new Error("Não foi possível ler o logo da TelaHUB."));
        reader.readAsDataURL(logoBlob);
      });
      const selectedMedia = data?.media.find((item) => item.id === mediaId)?.title ?? "Todos";
      const selectedScreen = selectedScreenIds === null ? "Todos os pontos"
        : screens.filter((screen) => selectedScreenIds.includes(screen.id)).map((screen) => screen.name).join(", ");
      const generatedAt = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date());

      document.setFillColor(5, 12, 11);
      document.rect(0, 0, 297, 23, "F");
      const logoProperties = document.getImageProperties(logoDataUrl);
      const logoScale = Math.min(48 / logoProperties.width, 17 / logoProperties.height);
      const logoWidth = logoProperties.width * logoScale;
      const logoHeight = logoProperties.height * logoScale;
      document.addImage(logoDataUrl, "PNG", 14, (23 - logoHeight) / 2, logoWidth, logoHeight);
      document.setTextColor(255, 255, 255);
      document.setFont("helvetica", "bold");
      document.setFontSize(18);
      document.text("Relatório de exibições", 72, 14);
      document.setTextColor(31, 41, 39);
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      const filterLines = document.splitTextToSize(`Período: ${periodNames[period]}  |  Anúncio: ${selectedMedia}  |  Pontos: ${selectedScreen}`, 269);
      document.text(filterLines, 14, 29);
      const summaryY = 29 + filterLines.length * 4.5;
      document.text(`Exibições: ${logs.length}  |  Anúncios: ${uniqueMedia}  |  Telas: ${uniqueScreens}  |  Gerado em: ${generatedAt}`, 14, summaryY);

      autoTable(document, {
        startY: summaryY + 6,
        head: [["Anúncio", "Tela", "Local", "Data", "Horário"]],
        body: logs.map((log) => {
          const played = formatPlayedAt(log.played_at);
          return [
            log.media?.title ?? "Anúncio removido",
            log.screens?.name ?? "Tela removida",
            log.screens?.location ?? "—",
            played.date,
            played.time,
          ];
        }),
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 158, 122], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [242, 247, 246] },
        margin: { left: 14, right: 14 },
      });

      const fileDate = new Date().toISOString().slice(0, 10);
      document.save(`telahub-relatorio-${period}-${fileDate}.pdf`);
    } catch (error) {
      toast.error("Não foi possível gerar o PDF", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminShell
      title="Relatórios"
      description="Histórico de exibições registrado pelas TVs."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Atualizando…" : "Atualizar agora"}
          </Button>
          <Button onClick={exportPdf} disabled={logs.length === 0 || exporting || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Gerando…" : "Exportar PDF"}
          </Button>
        </div>
      }
    >
      <section className="panel p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="grid grid-cols-3 rounded-md border border-border p-1">
              {(["daily", "weekly", "monthly"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={period === value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => changePeriod(value)}
                >
                  {periodNames[value]}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Anúncio</Label>
            <Select value={mediaId} onValueChange={(value) => { setMediaId(value); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os anúncios</SelectItem>
                {(data?.media ?? []).map((media) => (
                  <SelectItem key={media.id} value={media.id}>{media.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-points">Pontos</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="report-points" variant="outline" className="w-full justify-between gap-2" disabled={isLoading}>
                  <span className="truncate">{screenLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-2rem)] p-2">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                  <Button size="sm" variant="ghost" onClick={() => changeScreens(null)}>Marcar todos</Button>
                  <Button size="sm" variant="ghost" onClick={() => changeScreens([])}>Desmarcar todos</Button>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {screens.map((screen) => (
                    <Label key={screen.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-3 hover:bg-accent">
                      <Checkbox
                        checked={selectedScreenIds === null || selectedScreenIds.includes(screen.id)}
                        onCheckedChange={(checked) => {
                          const current = selectedScreenIds ?? screens.map((item) => item.id);
                          changeScreens(checked === true ? [...current.filter((id) => id !== screen.id), screen.id] : current.filter((id) => id !== screen.id));
                        }}
                      />
                      <span className="min-w-0 break-words">{screen.name || screen.code}</span>
                    </Label>
                  ))}
                  {screens.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nenhum ponto disponível.</p> : null}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Exibições", value: logs.length, icon: FileBarChart },
          { label: "Anúncios exibidos", value: uniqueMedia, icon: Images },
          { label: "Telas utilizadas", value: uniqueScreens, icon: MonitorPlay },
        ].map((item) => (
          <div key={item.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <item.icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{isLoading ? "—" : item.value}</p>
          </div>
        ))}
      </div>

      <section className="panel mt-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-semibold">Exibições no período</h2>
        </div>
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Carregando relatório…</p> : null}
        {isError ? <p className="p-8 text-center text-sm text-destructive">Não foi possível carregar o relatório.</p> : null}
        {!isLoading && !isError && logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma exibição encontrada com estes filtros.</p>
        ) : null}
        {!isLoading && !isError && logs.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5">Anúncio</TableHead>
                  <TableHead>Tela</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="pr-5">Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLogs.map((log) => {
                  const played = formatPlayedAt(log.played_at);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="px-5 font-medium">{log.media?.title ?? "Anúncio removido"}</TableCell>
                      <TableCell>{log.screens?.name ?? "Tela removida"}</TableCell>
                      <TableCell className="text-muted-foreground">{log.screens?.location ?? "—"}</TableCell>
                      <TableCell>{played.date}</TableCell>
                      <TableCell className="pr-5 font-mono">{played.time}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, logs.length)} de {logs.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>Próxima</Button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}