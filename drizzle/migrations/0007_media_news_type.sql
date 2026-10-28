ALTER TABLE public.media DROP CONSTRAINT media_type_check;
ALTER TABLE public.media ADD CONSTRAINT media_type_check CHECK (type IN ('image', 'video', 'weather', 'market', 'news'));