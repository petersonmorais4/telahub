import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

interface PlaylistRow {
  id: string;
  name: string;
  loop: boolean;
  created_at: string;
  playlist_items: { position: number; media: { title: string } | null }[];
}

const toPlaylistJson = (p: PlaylistRow) => ({
  id: p.id,
  name: p.name,
  loop: p.loop,
  createdAt: p.created_at,
  items: (p.playlist_items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => item.media?.title ?? null),
});

export default defineTool({
  name: "list_playlists",
  title: "Listar playlists",
  description: "Lista as playlists e os anúncios que compõem cada uma, na ordem de exibição.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("playlists")
      .select("id, name, loop, created_at, playlist_items(position, media(title))")
      .order("created_at");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []) as unknown as PlaylistRow[];
    return {
      content: [{
        type: "text",
        text: rows.length === 0
          ? "Nenhuma playlist cadastrada."
          : rows.map((p) => `${p.name}: ${(p.playlist_items ?? []).length} itens`).join("\n"),
      }],
      structuredContent: { playlists: rows.map(toPlaylistJson) },
    };
  },
});
