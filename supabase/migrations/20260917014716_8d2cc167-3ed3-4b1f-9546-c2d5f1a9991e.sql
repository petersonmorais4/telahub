GRANT INSERT ON TABLE public.play_logs TO anon;
GRANT SELECT, INSERT ON TABLE public.play_logs TO authenticated;
GRANT ALL ON TABLE public.play_logs TO service_role;