-- The trigger function only uses NEW and built-in functions. An empty search
-- path prevents object shadowing without changing its behaviour.
ALTER FUNCTION public.set_updated_at() SET search_path = '';
