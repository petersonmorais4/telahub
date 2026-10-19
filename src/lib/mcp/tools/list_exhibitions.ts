import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

interface LogRow {
  id: string;
  played_at: string;
  media: { title: string } | null;
  screens: { name: string; code: string } | null;
}

const toLogJson = (log: LogRow) => ({
  id: log.id,
  playedAt: log.played_at,
  adTitle: log.media?.title ?? null,
  screenName: log.screens?.name ?? null,
  screenCode: log.screens?.code ?? null,
});

export default defineTool({
  name: "list_exhibitions",
  title: "Listar exibições",
  description: "Lista as exibições mais recentes de anúncios nas telas, com data e horário.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Quantidade máxima de exibições (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const limit = typeof args.limit === "number" ? args.limit : 50;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("play_logs")
      .select("id, played_at, media(title), screens(name, code)")
      .order("played_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []) as unknown as LogRow[];
    return {
      content: [{
        type: "text",
        text: rows.length === 0
          ? "Nenhuma exibição registrada."
          : rows.map((log) => `${log.played_at} — ${log.media?.title ?? "Anúncio removido"} em ${log.screens?.name ?? "tela removida"}`).join("\n"),
      }],
      structuredContent: { exhibitions: rows.map(toLogJson) },
    };
  },
});
