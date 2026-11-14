CREATE INDEX IF NOT EXISTS play_logs_played_at_idx ON public.play_logs (played_at DESC);
CREATE INDEX IF NOT EXISTS play_logs_media_played_at_idx ON public.play_logs (media_id, played_at DESC);