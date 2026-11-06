// Builds the PDF attached to the weekly advertiser report (pure JS, runs on the Worker).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { summarize } from "./client-report";

export interface PdfPlay {
  playedAt: string;
  screen: string;
}

const GREEN = rgb(0.18, 0.9, 0.62);
const DARK = rgb(0.03, 0.05, 0.04);
const TEXT = rgb(0.12, 0.14, 0.13);
const MUTED = rgb(0.42, 0.47, 0.45);
const LINE = rgb(0.86, 0.89, 0.88);

// Helvetica (WinAnsi) covers Portuguese accents; drop anything else so drawing never throws.
const safe = (s: string) => s.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");

function fit(text: string, font: PDFFont, size: number, max: number) {
  let t = safe(text);
  if (font.widthOfTextAtSize(t, size) <= max) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
  return `${t}…`;
}

export async function reportPdf(input: {
  clientName: string | null;
  adTitle: string;
  periodLabel: string;
  summary: ReturnType<typeof summarize>;
  plays: PdfPlay[];
  logoPng: Uint8Array | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Relatório de exibição - ${input.adTitle}`);
  doc.setAuthor("TelaHUB");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  if (input.logoPng) {
    try {
      logo = await doc.embedPng(input.logoPng);
    } catch {
      logo = null;
    }
  }

  const W = 595.28;
  const H = 841.89;
  const M = 40;
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  let page: PDFPage;
  let y = 0;

  const header = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: DARK });
    if (logo) {
      const h = 40;
      const w = (logo.width / logo.height) * h;
      page.drawImage(logo, { x: M, y: H - 55, width: w, height: h });
    } else {
      page.drawText("TelaHUB", { x: M, y: H - 45, size: 22, font: bold, color: GREEN });
    }
    page.drawText("Relatório de exibição", { x: W - M - bold.widthOfTextAtSize("Relatório de exibição", 12), y: H - 40, size: 12, font: bold, color: GREEN });
    y = H - 100;
  };
  const footer = () => {
    doc.getPages().forEach((p, i, all) => {
      const t = `TelaHUB · telahub.app · Página ${i + 1} de ${all.length}`;
      p.drawText(t, { x: W / 2 - font.widthOfTextAtSize(t, 8) / 2, y: 20, size: 8, font, color: MUTED });
    });
  };

  header();
  page = page!;
  page.drawText(fit(input.adTitle, bold, 18, W - 2 * M), { x: M, y, size: 18, font: bold, color: TEXT });
  y -= 20;
  const sub = `${input.clientName ? `${input.clientName} · ` : ""}Período: ${input.periodLabel}`;
  page.drawText(fit(sub, font, 11, W - 2 * M), { x: M, y, size: 11, font, color: MUTED });
  y -= 30;

  // KPI cards
  const cards: [string, string][] = [
    [fmt(input.summary.total), "exibições"],
    [fmt(input.summary.minutes), "minutos em tela"],
    [fmt(input.summary.screens), "telas"],
  ];
  const gap = 10;
  const cw = (W - 2 * M - 2 * gap) / 3;
  cards.forEach(([v, l], i) => {
    const x = M + i * (cw + gap);
    page.drawRectangle({ x, y: y - 60, width: cw, height: 60, color: rgb(0.94, 0.98, 0.96), borderColor: GREEN, borderWidth: 1 });
    page.drawText(v, { x: x + cw / 2 - bold.widthOfTextAtSize(v, 20) / 2, y: y - 30, size: 20, font: bold, color: rgb(0.05, 0.55, 0.36) });
    page.drawText(l, { x: x + cw / 2 - font.widthOfTextAtSize(l, 9) / 2, y: y - 48, size: 9, font, color: MUTED });
  });
  y -= 90;

  const ensure = (needed: number, onNew?: () => void) => {
    if (y - needed < 45) {
      header();
      onNew?.();
    }
  };
  const tableHead = (cols: [string, number, "left" | "right"][]) => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: DARK });
    for (const [t, x, align] of cols) {
      const tx = align === "right" ? x - bold.widthOfTextAtSize(t, 9) : x;
      page.drawText(t, { x: tx, y: y, size: 9, font: bold, color: GREEN });
    }
    y -= 22;
  };

  // Per-location summary
  page.drawText("Exibições por local", { x: M, y, size: 13, font: bold, color: TEXT });
  y -= 22;
  const locCols: [string, number, "left" | "right"][] = [["LOCAL", M + 8, "left"], ["EXIBIÇÕES", W - M - 8, "right"]];
  tableHead(locCols);
  if (input.summary.rows.length === 0) {
    page.drawText("Sem exibições no período.", { x: M + 8, y, size: 10, font, color: MUTED });
    y -= 18;
  }
  for (const r of input.summary.rows) {
    ensure(20, () => tableHead(locCols));
    const name = r.location ? `${r.name} — ${r.location}` : r.name;
    page.drawText(fit(name, font, 10, W - 2 * M - 90), { x: M + 8, y, size: 10, font, color: TEXT });
    const c = fmt(r.count);
    page.drawText(c, { x: W - M - 8 - bold.widthOfTextAtSize(c, 10), y, size: 10, font: bold, color: TEXT });
    page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.5, color: LINE });
    y -= 20;
  }
  y -= 20;

  // Detailed log
  ensure(70);
  page.drawText("Histórico detalhado de exibições", { x: M, y, size: 13, font: bold, color: TEXT });
  y -= 22;
  const detCols: [string, number, "left" | "right"][] = [["DATA", M + 8, "left"], ["HORÁRIO", M + 90, "left"], ["LOCAL", M + 170, "left"]];
  tableHead(detCols);
  const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" });
  for (const p of input.plays) {
    ensure(15, () => tableHead(detCols));
    const d = new Date(p.playedAt);
    page.drawText(dateFmt.format(d), { x: M + 8, y, size: 9, font, color: TEXT });
    page.drawText(timeFmt.format(d), { x: M + 90, y, size: 9, font, color: TEXT });
    page.drawText(fit(p.screen, font, 9, W - M - 8 - (M + 170)), { x: M + 170, y, size: 9, font, color: TEXT });
    y -= 15;
  }

  footer();
  return doc.save();
}
