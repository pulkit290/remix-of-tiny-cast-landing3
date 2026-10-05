-- A team is identified by its owner's user id. Each user is in at most one team besides their own.
CREATE TABLE public.team_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id <> owner_id)
);
GRANT SELECT ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, email)
);
GRANT SELECT ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.team_owner(_uid uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT owner_id FROM public.team_members WHERE user_id = _uid), _uid)
$$;

CREATE POLICY "team sees members" ON public.team_members FOR SELECT TO authenticated
  USING (owner_id = public.team_owner(auth.uid()));
CREATE POLICY "team sees invites" ON public.team_invites FOR SELECT TO authenticated
  USING (owner_id = public.team_owner(auth.uid()) OR lower(email) = lower(auth.jwt() ->> 'email'));

CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id
    AND public.team_owner(owner_id) = public.team_owner(auth.uid()))
$$;
CREATE OR REPLACE FUNCTION public.owns_scenario(_scenario_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.test_scenarios s JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = _scenario_id AND public.team_owner(p.owner_id) = public.team_owner(auth.uid()))
$$;

DROP POLICY "own projects" ON public.projects;
CREATE POLICY "team projects" ON public.projects FOR ALL TO authenticated
  USING (public.team_owner(owner_id) = public.team_owner(auth.uid()))
  WITH CHECK (owner_id = auth.uid());

-- Teammates read the team owner's plan (shared runs).
DROP POLICY "Users read own billing" ON public.billing_accounts;
CREATE POLICY "Team reads billing" ON public.billing_accounts FOR SELECT TO authenticated
  USING (user_id = public.team_owner(auth.uid()));