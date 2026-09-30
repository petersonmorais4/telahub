CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage WhatsApp conversations" ON public.whatsapp_conversations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  provider_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'accepted', 'sent', 'delivered', 'read', 'failed')),
  provider_timestamp TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage WhatsApp messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX whatsapp_messages_conversation_created_idx ON public.whatsapp_messages (conversation_id, created_at DESC);

CREATE TABLE public.whatsapp_message_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  provider_timestamp TIMESTAMPTZ,
  error_details JSONB,
  delivery_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (delivery_id, provider_message_id, status)
);
GRANT SELECT ON public.whatsapp_message_statuses TO authenticated;
GRANT ALL ON public.whatsapp_message_statuses TO service_role;
ALTER TABLE public.whatsapp_message_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read WhatsApp statuses" ON public.whatsapp_message_statuses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX whatsapp_message_statuses_provider_idx ON public.whatsapp_message_statuses (provider_message_id, provider_timestamp DESC);

CREATE TABLE public.whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id TEXT NOT NULL UNIQUE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read WhatsApp webhook events" ON public.whatsapp_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX whatsapp_webhook_events_pending_idx ON public.whatsapp_webhook_events (received_at) WHERE processed_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;