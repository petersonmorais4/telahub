import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAdsTool from "./tools/list_ads";
import listExhibitionsTool from "./tools/list_exhibitions";
import listPlaylistsTool from "./tools/list_playlists";
import listScreensTool from "./tools/list_screens";
import listWhatsAppConversationsTool from "./tools/list_whatsapp_conversations";
import getWhatsAppMessagesTool from "./tools/get_whatsapp_messages";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "telahub",
  title: "TelaHUB",
  version: "0.1.0",
  instructions:
    "Ferramentas do TelaHUB, painel de mídia indoor. Use list_screens para ver as telas (TVs) cadastradas e seu status, list_ads para os anúncios, list_playlists para as playlists e seus itens, list_exhibitions para as exibições recentes, e list_whatsapp_conversations/get_whatsapp_messages para acompanhar as conversas do WhatsApp. É preciso entrar com a conta para ler os dados.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listScreensTool,
    listAdsTool,
    listPlaylistsTool,
    listExhibitionsTool,
    listWhatsAppConversationsTool,
    getWhatsAppMessagesTool,
  ],
});
