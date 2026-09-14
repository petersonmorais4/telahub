ALTER TABLE public.media
ADD COLUMN content_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.media
ADD CONSTRAINT media_type_check
CHECK (type IN ('image', 'video', 'weather', 'market'));

ALTER TABLE public.media
ADD CONSTRAINT media_duration_positive
CHECK (duration >= 0);