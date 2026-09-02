CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  detail text,
  actor_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete activity logs" ON public.activity_logs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.prune_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_logs WHERE created_at < now() - interval '6 months';
  RETURN NULL;
END;
$$;

CREATE TRIGGER prune_activity_logs_trigger
AFTER INSERT ON public.activity_logs
FOR EACH STATEMENT EXECUTE FUNCTION public.prune_activity_logs();