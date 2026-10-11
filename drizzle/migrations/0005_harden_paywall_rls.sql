-- Paywall: users may create queued runs but never change them (status/unlocked_at are server-only).
DROP POLICY IF EXISTS "own runs" ON public.test_runs;
CREATE POLICY "own runs select" ON public.test_runs FOR SELECT TO authenticated USING (public.owns_scenario(scenario_id));
CREATE POLICY "own runs insert" ON public.test_runs FOR INSERT TO authenticated
  WITH CHECK (public.owns_scenario(scenario_id) AND status = 'queued' AND unlocked_at IS NULL);
REVOKE UPDATE, DELETE ON public.test_runs FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.run_unlocked(_run_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.test_runs r WHERE r.id = _run_id AND r.unlocked_at IS NOT NULL AND public.owns_scenario(r.scenario_id))
$$;

-- Report contents, issues and evidence are readable only after the run is unlocked.
DROP POLICY IF EXISTS "own reports select" ON public.test_reports;
DROP POLICY IF EXISTS "own reports update" ON public.test_reports;
CREATE POLICY "own reports select" ON public.test_reports FOR SELECT TO authenticated USING (public.run_unlocked(test_run_id));
CREATE POLICY "own reports update" ON public.test_reports FOR UPDATE TO authenticated USING (public.run_unlocked(test_run_id)) WITH CHECK (public.run_unlocked(test_run_id));
DROP POLICY IF EXISTS "own issues select" ON public.test_issues;
DROP POLICY IF EXISTS "own issues update" ON public.test_issues;
CREATE POLICY "own issues select" ON public.test_issues FOR SELECT TO authenticated USING (public.run_unlocked(test_run_id));
CREATE POLICY "own issues update" ON public.test_issues FOR UPDATE TO authenticated USING (public.run_unlocked(test_run_id)) WITH CHECK (public.run_unlocked(test_run_id));
DROP POLICY IF EXISTS "own screenshots" ON public.screenshots;
CREATE POLICY "own screenshots" ON public.screenshots FOR SELECT TO authenticated USING (public.run_unlocked(test_run_id));
DROP POLICY IF EXISTS "own evidence read" ON storage.objects;
CREATE POLICY "own evidence read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'run-evidence' AND public.run_unlocked(((storage.foldername(name))[1])::uuid));

-- Contact form: only sane, new messages.
DROP POLICY IF EXISTS "Anyone can send a message" ON public.contact_messages;
CREATE POLICY "Anyone can send a message" ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(name,'')) BETWEEN 1 AND 200
    AND char_length(coalesce(email,'')) BETWEEN 3 AND 320 AND email LIKE '%@%'
    AND char_length(coalesce(message,'')) BETWEEN 1 AND 5000
    AND coalesce(status,'new') = 'new'
  );

-- Helper functions are for RLS only; signed-out visitors never need them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_project(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_run(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_scenario(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.team_owner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.run_unlocked(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.run_unlocked(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;