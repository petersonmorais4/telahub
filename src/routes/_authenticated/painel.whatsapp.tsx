import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCheck, MessageCircle, Send, Users, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { markWhatsAppConversationRead, sendWhatsAppMessage } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/painel/whatsapp")({
  head: () => ({
    meta: [
      { title: "TelaHUB — WhatsApp" },
      { name: "description", content: "Acompanhamento de conversas e entregas do WhatsApp da TelaHUB." },
      { property: "og:title", content: "TelaHUB — WhatsApp" },
      { property: "og:description", content: "Conversas, respostas e indicadores do WhatsApp." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhatsAppPage,
});

type Conversation = {
  id: string;
  phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type Message = {
  id: string;
  conversation_id: string;
  direction: string;
  body: string;
  status: string;
  created_at: string;
  provider_timestamp: string | null;
};

function formatTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function deliveryLabel(status: string) {
  const labels: Record<string, string> = {
    accepted: "Aceita",
    sent: "Enviada",
    delivered: "Entregue",
    read: "Lida",
    failed: "Falhou",
  };
  return labels[status] ?? "Recebida";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "failed") return <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />;
  if (status === "delivered" || status === "read") {
    return <CheckCheck className={cn("h-3.5 w-3.5", status === "read" ? "text-primary" : "text-muted-foreground")} aria-hidden />;
  }
  return <Check className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
}

function WhatsAppPage() {
  const queryClient = useQueryClient();
  const sendMessage = useServerFn(sendWhatsAppMessage);
  const markRead = useServerFn(markWhatsAppConversationRead);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const conversationsQuery = useQuery({
    queryKey: ["whatsapp-conversations"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("id, phone, contact_name, last_message, last_message_at, unread_count")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });

  useEffect(() => {
    if (!selectedId && conversationsQuery.data?.[0]) setSelectedId(conversationsQuery.data[0].id);
  }, [conversationsQuery.data, selectedId]);

  const messagesQuery = useQuery({
    queryKey: ["whatsapp-messages", selectedId],
    enabled: Boolean(selectedId),
    refetchInterval: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("id, conversation_id, direction, body, status, created_at, provider_timestamp")
        .eq("conversation_id", selectedId ?? "")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  const selectConversation = useMutation({
    mutationFn: async (id: string) => {
      setSelectedId(id);
      await markRead({ data: { conversationId: id } });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] }),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !reply.trim()) return;
      await sendMessage({ data: { conversationId: selectedId, body: reply.trim() } });
    },
    onSuccess: () => {
      setReply("");
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", selectedId] });
    },
    onError: () => toast.error("Não foi possível enviar a mensagem."),
  });

  const conversations = conversationsQuery.data ?? [];
  const selected = conversations.find((item) => item.id === selectedId) ?? null;
  const indicators = useMemo(() => {
    const messages = messagesQuery.data ?? [];
    return {
      conversations: conversations.length,
      unread: conversations.reduce((sum, item) => sum + item.unread_count, 0),
      delivered: messages.filter((item) => item.direction === "outbound" && ["delivered", "read"].includes(item.status)).length,
    };
  }, [conversations, messagesQuery.data]);

  return (
    <AdminShell title="WhatsApp" description="Acompanhe novas mensagens, responda clientes e confira as entregas.">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="panel p-4"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Conversas</span><Users className="h-4 w-4" /></div><p className="mt-2 text-2xl font-bold">{indicators.conversations}</p></div>
        <div className="panel p-4"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Não lidas</span><MessageCircle className="h-4 w-4" /></div><p className="mt-2 text-2xl font-bold">{indicators.unread}</p></div>
        <div className="panel p-4"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>Entregues nesta conversa</span><CheckCheck className="h-4 w-4" /></div><p className="mt-2 text-2xl font-bold">{indicators.delivered}</p></div>
      </div>

      <div className="grid min-h-[36rem] overflow-hidden rounded-md border border-border bg-card lg:grid-cols-[20rem_1fr]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Conversas</h2></div>
          <ScrollArea className="h-[20rem] lg:h-[34rem]">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation.mutate(conversation.id)}
                className={cn("flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent", selectedId === conversation.id && "bg-accent")}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><MessageCircle className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{conversation.contact_name || conversation.phone}</p><span className="shrink-0 text-[0.7rem] text-muted-foreground">{formatTime(conversation.last_message_at)}</span></div>
                  <div className="mt-1 flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{conversation.last_message || "Nova conversa"}</p>{conversation.unread_count > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-bold text-primary-foreground">{conversation.unread_count}</span> : null}</div>
                </div>
              </button>
            ))}
            {!conversationsQuery.isLoading && conversations.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted-foreground">As novas mensagens aparecerão aqui.</p> : null}
          </ScrollArea>
        </aside>

        <section className="flex min-h-[34rem] flex-col">
          {selected ? (
            <>
              <header className="border-b border-border px-5 py-3"><h2 className="font-semibold">{selected.contact_name || selected.phone}</h2><p className="text-xs text-muted-foreground">{selected.phone}</p></header>
              <ScrollArea className="min-h-0 flex-1 bg-muted/20 px-5 py-4">
                <div className="space-y-3">
                  {(messagesQuery.data ?? []).map((message) => (
                    <div key={message.id} className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[82%] rounded-md px-3 py-2 text-sm", message.direction === "outbound" ? "bg-primary text-primary-foreground" : "border border-border bg-card")}>
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <div className={cn("mt-1 flex items-center justify-end gap-1 text-[0.68rem]", message.direction === "outbound" ? "text-primary-foreground/75" : "text-muted-foreground")}>
                          <span>{formatTime(message.provider_timestamp || message.created_at)}</span>
                          {message.direction === "outbound" ? <><StatusIcon status={message.status} /><span>{deliveryLabel(message.status)}</span></> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <form className="flex items-end gap-3 border-t border-border p-4" onSubmit={(event) => { event.preventDefault(); sendMutation.mutate(); }}>
                <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Escreva uma resposta" className="max-h-32 min-h-10 resize-none" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMutation.mutate(); } }} />
                <Button type="submit" size="icon" disabled={!reply.trim() || sendMutation.isPending} aria-label="Enviar mensagem"><Send /></Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><MessageCircle className="h-10 w-10 text-muted-foreground" /><h2 className="mt-3 font-semibold">Nenhuma conversa selecionada</h2><p className="mt-1 text-sm text-muted-foreground">As mensagens recebidas após a ativação aparecerão aqui.</p></div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
