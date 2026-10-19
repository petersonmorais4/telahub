import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

interface MessageRow {
  id: string;
  conversation_id: string;
  direction: string;
  body: string;
  status: string;
  created_at: string;
}

const toMessageJson = (m: MessageRow) => ({
  id: m.id,
  conversationId: m.conversation_id,
  direction: m.direction,
  body: m.body,
  status: m.status,
  createdAt: m.created_at,
});

export default defineTool({
  name: "get_whatsapp_messages",
  title: "Ver mensagens de uma conversa",
  description: "Lista as mensagens de uma conversa do WhatsApp, em ordem cronológica. Use o id devolvido por list_whatsapp_conversations.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("Identificador da conversa."),
    limit: z.number().int().min(1).max(200).optional().describe("Quantidade máxima de mensagens (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const limit = typeof args.limit === "number" ? args.limit : 50;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id, conversation_id, direction, body, status, created_at")
      .eq("conversation_id", args.conversation_id)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []) as unknown as MessageRow[];
    return {
      content: [{
        type: "text",
        text: rows.length === 0
          ? "Nenhuma mensagem nesta conversa."
          : rows.map((m) => `${m.direction === "outbound" ? "TelaHUB" : "Contato"}: ${m.body}`).join("\n"),
      }],
      structuredContent: { messages: rows.map(toMessageJson) },
    };
  },
});
