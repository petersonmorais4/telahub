import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

interface ScreenRow {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
  last_seen: string | null;
  playlist_id: string | null;
  playlists: { name: string } | null;
}

const toScreenJson = (s: ScreenRow) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  location: s.location,
  status: s.status,
  lastSeen: s.last_seen,
  playlistName: s.playlists?.name ?? null,
});

export default defineTool({
  name: "list_screens",
  title: "Listar telas",
  description: "Lista as telas (TVs) cadastradas com código, local, status e última sincronização.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("screens")
      .select("id, code, name, location, status, last_seen, playlist_id, playlists(name)")
      .order("created_at");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []) as unknown as ScreenRow[];
    return {
      content: [{
        type: "text",
        text: rows.length === 0
          ? "Nenhuma tela cadastrada."
          : rows.map((s) => `${s.name} (código ${s.code}, ${s.status}${s.playlists ? `, playlist ${s.playlists.name}` : ""})`).join("\n"),
      }],
      structuredContent: { screens: rows.map(toScreenJson) },
    };
  },
});
