CREATE TABLE public.billing_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'none' CHECK (plan IN ('none','pro','team')),
  subscription_status text,
  dodo_customer_id text,
  dodo_subscription_id text,
  period_end timestamptz,
  runs_included int NOT NULL DEFAULT 0,
  runs_used int NOT NULL DEFAULT 0,
  run_credits int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_accounts TO authenticated;
GRANT ALL ON public.billing_accounts TO service_role;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own billing" ON public.billing_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.payment_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.test_runs ADD COLUMN unlocked_at timestamptz;