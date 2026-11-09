ALTER TABLE public.screens ADD COLUMN business_hours jsonb;
COMMENT ON COLUMN public.screens.business_hours IS 'Weekly opening intervals indexed Sunday=0 through Saturday=6; [] means closed day, null means not configured; times use America/Sao_Paulo. An end before start continues into the following day.';
CREATE OR REPLACE FUNCTION public.valid_business_hours(value jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE day_value jsonb; interval_value jsonb;
BEGIN
  IF value IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(value) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(value) <> 7 THEN RETURN false; END IF;
  FOR day_value IN SELECT jsonb_array_elements(value) LOOP
    IF jsonb_typeof(day_value) <> 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(day_value) > 4 THEN RETURN false; END IF;
    FOR interval_value IN SELECT jsonb_array_elements(day_value) LOOP
      IF jsonb_typeof(interval_value) <> 'object' THEN RETURN false; END IF;
      IF NOT (interval_value ? 'start' AND interval_value ? 'end') THEN RETURN false; END IF;
      IF jsonb_typeof(interval_value->'start') <> 'string' OR jsonb_typeof(interval_value->'end') <> 'string' THEN RETURN false; END IF;
      IF (interval_value->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR (interval_value->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR interval_value->>'start' = interval_value->>'end' THEN RETURN false; END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END;
$$;
ALTER TABLE public.screens ADD CONSTRAINT screens_business_hours_valid CHECK (public.valid_business_hours(business_hours));