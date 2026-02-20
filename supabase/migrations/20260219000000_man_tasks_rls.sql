ALTER TABLE public.man_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access"
ON public.man_tasks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "operator_select"
ON public.man_tasks
FOR SELECT
TO operator_role
USING (true);

CREATE POLICY "operator_update"
ON public.man_tasks
FOR UPDATE
TO operator_role
USING (true)
WITH CHECK (true);
