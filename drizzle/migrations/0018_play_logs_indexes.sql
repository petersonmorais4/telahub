CREATE INDEX IF NOT EXISTS play_logs_played_at_idx ON public.play_logs (played_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS play_logs_screen_played_idx ON public.play_logs (screen_id, played_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS play_logs_media_played_idx ON public.play_logs (media_id, played_at DESC);
