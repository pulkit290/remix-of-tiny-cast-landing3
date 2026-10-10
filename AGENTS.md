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
- Teams share data via team_owner(uid) in RLS helpers; team rows are written only by server fns in src/lib/team.functions.ts — keeps one write path.
- Sign-in is Google-only (email provider disabled), via supabase.auth.signInWithOAuth with the project's own Google credentials — so it works on non-Lovable hosts like Vercel; don't switch back to the Lovable-managed flow.
- Large public media (demo video) is served from public/ as static files, not Lovable asset pointers — so it plays on any host.
- Admin access is checked server-side via user_roles + has_role(); admin data is read only through src/lib/admin.functions.ts — never trust client-side flags.
- Build target: Lovable/Cloudflare by default; vite.config.ts switches nitro to the `vercel` preset only when VERCEL is set — so one codebase deploys to both.
