# Poolabs browser worker

Runs each AI user in its own isolated Playwright browser context and reports every action back to Poolabs.

## Deploy (one click)
Render: New → Blueprint → pick this repo. It reads `render.yaml`, builds `worker/Dockerfile`, and asks for `WORKER_SECRET`.
Any Docker host works the same way (Railway, Fly.io).

## Run locally
```
npm install && npx playwright install chromium
WORKER_SECRET=... LLM_API_KEY=... node server.mjs
```

Env:
- `WORKER_SECRET` — shared secret; set the same value as `WORKER_SECRET` in the Poolabs app.
- `LLM_API_KEY` — optional. Without it, the worker asks the Poolabs app for AI decisions (built-in AI, no key needed). Set it only to use your own OpenAI-compatible API.
- `LLM_BASE_URL` — default `https://api.openai.com/v1`.
- `LLM_MODEL` — default `gpt-4o-mini`.
- `PORT` — default 8787.
- `MAX_STEPS` — per agent, default 25.
- Test account passwords: `ACCOUNT_PASSWORD__<email with non-alphanumerics as _>`, e.g. `ACCOUNT_PASSWORD__buyer_example_com`. Passwords never leave the worker.

Then set `BROWSER_WORKER_URL` (e.g. `https://worker.example.com`) in the Poolabs app.
