import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

interface MediaRow {
  id: string;
  title: string;
  type: string;
  duration: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const toMediaJson = (m: MediaRow) => ({
  id: m.id,
  title: m.title,
  type: m.type,
  durationSeconds: m.duration,
  active: m.active,
  startDate: m.start_date,
  endDate: m.end_date,
  createdAt: m.created_at,
});

export default defineTool({
  name: "list_ads",
  title: "Listar anúncios",
  description: "Lista os anúncios (imagens e vídeos) cadastrados com tipo, duração e período de veiculação.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("media")
      .select("id, title, type, duration, active, start_date, end_date, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []) as unknown as MediaRow[];
    return {
      content: [{
        type: "text",
        text: rows.length === 0
          ? "Nenhum anúncio cadastrado."
          : rows.map((m) => `${m.title} (${m.type === "video" ? "vídeo" : "imagem"}, ${m.active ? "ativo" : "inativo"})`).join("\n"),
      }],
      structuredContent: { ads: rows.map(toMediaJson) },
    };
  },
});
