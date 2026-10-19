import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

interface ConversationRow {
  id: string;
  phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

const toConversationJson = (c: ConversationRow) => ({
  id: c.id,
  phone: c.phone,
  contactName: c.contact_name,
  lastMessage: c.last_message,
  lastMessageAt: c.last_message_at,
  unreadCount: c.unread_count,
});

export default defineTool({
  name: "list_whatsapp_conversations",
  title: "Listar conversas do WhatsApp",
  description: "Lista as conversas do WhatsApp recebidas, com contato, última mensagem e não lidas.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Quantidade máxima de conversas (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const limit = typeof args.limit === "number" ? args.limit : 50;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("id, phone, contact_name, last_message, last_message_at, unread_count")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []) as unknown as ConversationRow[];
    return {
      content: [{
        type: "text",
        text: rows.length === 0
          ? "Nenhuma conversa registrada."
          : rows.map((c) => `${c.contact_name ?? c.phone} — ${c.last_message ?? "(sem mensagem)"}${c.unread_count > 0 ? ` — ${c.unread_count} não lidas` : ""}`).join("\n"),
      }],
      structuredContent: { conversations: rows.map(toConversationJson) },
    };
  },
});
