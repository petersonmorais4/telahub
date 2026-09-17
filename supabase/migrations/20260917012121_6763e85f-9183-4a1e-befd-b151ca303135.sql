ALTER TABLE public.app_settings
ADD COLUMN weather_city TEXT NOT NULL DEFAULT 'São Paulo';

ALTER TABLE public.app_settings
ADD CONSTRAINT app_settings_weather_city_length
CHECK (char_length(trim(weather_city)) BETWEEN 2 AND 80);