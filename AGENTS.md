<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules
- Browser automation runs in the separate Node service in `worker/`, never in the app — the app's server runtime can't run Playwright.
- The worker gets AI decisions from the app's `/api/public/worker/ai` (WORKER_SECRET-auth, built-in AI gateway) unless it has its own LLM key — so deploying the worker needs only one shared secret.
- App starts runs via `startRun` server fn → POST `${BROWSER_WORKER_URL}/runs`; worker reports back to `/api/public/worker/events` with `WORKER_SECRET` — single write path for run data.
- Missing/unreachable worker marks the run failed with "Browser worker unavailable…" — never simulate results.
- Authenticated pages live under `src/routes/_authenticated/` (client-only gate) and read data via the browser client with RLS.
- agent_runs/agent_actions/test_issues are written only by the server (service role); users have read-only access.
- Run status lifecycle: queued → starting (worker accepted) → running → passed/failed/error, or cancelled via `cancelRun`; worker events for a cancelled run are ignored — the app's cancel is final.
- Payments use Dodo Payments: checkout via `createCheckout` server fn, billing state written only by the signed webhook `/api/public/dodo/webhook`; a run's report unlocks (test_runs.unlocked_at) by spending one plan run or prepaid credit — single source of paywall truth.
