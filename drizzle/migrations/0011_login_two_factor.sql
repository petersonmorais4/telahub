CREATE TABLE public.login_mfa (
  session_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  code_hash text,
  expires_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_mfa TO service_role;
ALTER TABLE public.login_mfa ENABLE ROW LEVEL SECURITY;