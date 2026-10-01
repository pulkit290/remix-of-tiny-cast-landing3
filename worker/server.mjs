// Poolabs browser worker: one isolated Playwright context per AI user.
import http from "node:http";
import { chromium } from "playwright";

const SECRET = process.env.WORKER_SECRET;
const LLM_URL = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const LLM_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const MAX_STEPS = Number(process.env.MAX_STEPS || 25);
if (!SECRET) throw new Error("WORKER_SECRET is required");

const authed = (req) => req.headers.authorization === `Bearer ${SECRET}`;
const readJson = (req) => new Promise((ok, bad) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { ok(JSON.parse(b)); } catch (e) { bad(e); } });
});

const cancelled = new Set();

http.createServer(async (req, res) => {
  if (!authed(req)) { res.writeHead(401).end(); return; }
  if (req.method === "GET" && req.url === "/health") { res.writeHead(200).end("ok"); return; }
  if (req.method === "POST" && req.url === "/runs") {
    try {
      const job = await readJson(req);
      if (!job.runId || !job.appUrl || !Array.isArray(job.agents)) throw new Error("bad job");
      res.writeHead(202).end("accepted");
      runJob(job).catch((e) => console.error("run crashed", e));
    } catch { res.writeHead(400).end("bad request"); }
    return;
  }
  const m = req.method === "POST" && req.url.match(/^\/runs\/([0-9a-f-]{36})\/cancel$/);
  if (m) { cancelled.add(m[1]); res.writeHead(200).end("cancelling"); return; }
  res.writeHead(404).end();
}).listen(Number(process.env.PORT || 8787), () => console.log("worker ready"));

function reporter(callbackUrl) {
  return (event) => fetch(callbackUrl, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(event),
  }).catch((e) => console.error("report failed", e.message));
}

async function runJob(job) {
  const report = reporter(job.callbackUrl);
  if (!LLM_KEY) {
    await report({ type: "run_status", runId: job.runId, status: "error", failureReason: "AI model is not configured on the browser worker." });
    return;
  }
  await report({ type: "run_status", runId: job.runId, status: "running" });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    await report({ type: "run_status", runId: job.runId, status: "error", failureReason: "Browser could not start: " + e.message });
    return;
  }
  const board = []; // shared log so agents can see what others did
  try {
    const results = await Promise.all(job.agents.map((a) => runAgent(browser, job, a, board, report)));
    if (cancelled.has(job.runId)) return; // the app already marked this run cancelled
    const passed = results.every((r) => r.ok);
    await report({
      type: "run_status", runId: job.runId, status: passed ? "passed" : "failed",
      summary: results.map((r) => `${r.name}: ${r.ok ? "✓" : "✗"} ${r.reason}`).join("\n"),
      failureReason: passed ? undefined : results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.reason}`).join("; "),
    });
  } catch (e) {
    await report({ type: "run_status", runId: job.runId, status: "error", failureReason: "Browser session terminated unexpectedly." });
  } finally {
    await browser.close().catch(() => {});
  }
}

const SHOTS = process.env.SCREENSHOTS !== "0";
async function shot(page, report, job, agent, sequence) {
  if (!SHOTS) return;
  try {
    const buf = await page.screenshot({ type: "png", timeout: 8000 });
    await report({ type: "screenshot", runId: job.runId, agentRunId: agent.agentRunId, sequence, imageBase64: buf.toString("base64") });
  } catch (e) { console.error("screenshot failed", e.message); }
}

async function observe(page) {
  const elements = await page.evaluate(() => {
    const sel = "a,button,input,select,textarea,[role=button],[role=link],[contenteditable=true]";
    const out = [];
    document.querySelectorAll(sel).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || out.length >= 120) return;
      el.setAttribute("data-ct-id", String(i));
      out.push({
        id: String(i), tag: el.tagName.toLowerCase(), type: el.getAttribute("type") || undefined,
        text: (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name") || "").trim().slice(0, 80),
        value: "value" in el ? String(el.value).slice(0, 40) : undefined,
      });
    });
    return out;
  });
  const text = (await page.evaluate(() => document.body?.innerText || "")).slice(0, 3000);
  return { url: page.url(), title: await page.title(), elements, text };
}

async function decide(agent, job, obs, history, board) {
  const others = board.filter((b) => b.agent !== agent.name).slice(-10).map((b) => `${b.agent}: ${b.desc}`).join("\n") || "none yet";
  const messages = [
    { role: "system", content:
      `You are "${agent.name}", a ${agent.role} using a web app for a multi-user test. Goal: ${agent.goal}\n` +
      (agent.instructions ? `Instructions: ${agent.instructions}\n` : "") +
      (agent.accountEmail ? `Your account email: ${agent.accountEmail}. For a password field, use value "{{PASSWORD}}".\n` : "") +
      `Scenario: ${job.scenario?.name ?? ""} ${job.scenario?.description ?? ""}\n` +
      `Reply ONLY with JSON: {"action":"click|fill|select|goto|wait|done|fail","id":"<element id>","value":"<text>","reason":"<short>"}. ` +
      `Use "done" when your goal is verifiably achieved, "fail" if it is impossible (explain in reason). "wait" if waiting for another user.` },
    { role: "user", content:
      `URL: ${obs.url}\nTitle: ${obs.title}\nOther users recently:\n${others}\nYour last steps:\n${history.slice(-8).join("\n") || "none"}\n` +
      `Page text:\n${obs.text}\nInteractive elements:\n${JSON.stringify(obs.elements)}` },
  ];
  const r = await fetch(`${LLM_URL}/chat/completions`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, response_format: { type: "json_object" } }),
  });
  if (!r.ok) throw new Error(`AI model request failed (${r.status})`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

async function runAgent(browser, job, agent, board, report) {
  const context = await browser.newContext(); // isolated cookies/storage per AI user
  const page = await context.newPage();
  const sessionId = `ctx-${agent.agentRunId.slice(0, 8)}`;
  const history = [];
  let seq = 0;
  const pw = agent.accountEmail ? process.env[`ACCOUNT_PASSWORD__${agent.accountEmail.replace(/[^a-z0-9]/gi, "_")}`] : undefined;
  try {
    await page.goto(job.appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await report({ type: "agent_status", agentRunId: agent.agentRunId, status: "running", currentUrl: page.url(), browserSessionId: sessionId });
    await report({ type: "action", agentRunId: agent.agentRunId, sequence: seq++, actionType: "goto", description: "Opened app", target: job.appUrl, result: "ok" });
    await shot(page, report, job, agent, 0);

    for (let step = 0; step < MAX_STEPS; step++) {
      if (cancelled.has(job.runId)) return { name: agent.name, ok: false, reason: "cancelled" };
      const obs = await observe(page);
      const d = await decide(agent, job, obs, history, board);
      const el = d.id != null ? page.locator(`[data-ct-id="${String(d.id).replace(/"/g, "")}"]`).first() : null;
      const target = d.id != null ? obs.elements.find((e) => e.id === String(d.id))?.text : undefined;
      let result = "ok";
      try {
        if (d.action === "done") {
          await report({ type: "action", agentRunId: agent.agentRunId, sequence: seq++, actionType: "done", description: d.reason, result: "goal reached" });
          await shot(page, report, job, agent, seq - 1);
          await report({ type: "agent_status", agentRunId: agent.agentRunId, status: "completed", currentUrl: page.url() });
          return { name: agent.name, ok: true, reason: d.reason };
        }
        if (d.action === "fail") {
          await report({ type: "action", agentRunId: agent.agentRunId, sequence: seq++, actionType: "fail", description: d.reason, result: "gave up" });
          await shot(page, report, job, agent, seq - 1);
          await report({ type: "issue", runId: job.runId, severity: "high", title: `${agent.name} could not complete goal`, description: d.reason, evidence: { url: page.url() }, agentRunId: agent.agentRunId });
          await report({ type: "agent_status", agentRunId: agent.agentRunId, status: "failed", currentUrl: page.url() });
          return { name: agent.name, ok: false, reason: d.reason };
        }
        if (d.action === "click" && el) await el.click({ timeout: 8000 });
        else if (d.action === "fill" && el) await el.fill(d.value === "{{PASSWORD}}" ? (pw ?? "") : String(d.value ?? ""), { timeout: 8000 });
        else if (d.action === "select" && el) await el.selectOption(String(d.value ?? ""), { timeout: 8000 });
        else if (d.action === "goto" && d.value) await page.goto(new URL(d.value, job.appUrl).toString(), { waitUntil: "domcontentloaded" });
        else if (d.action === "wait") await page.waitForTimeout(3000);
        else result = "invalid action";
        await page.waitForLoadState("domcontentloaded").catch(() => {});
      } catch (e) {
        result = "error: " + e.message.split("\n")[0];
      }
      const desc = `${d.action}${target ? ` “${target}”` : ""}${d.action === "fill" && d.value !== "{{PASSWORD}}" ? ` = ${d.value}` : ""} — ${d.reason ?? ""}`;
      history.push(`${desc} → ${result}`);
      board.push({ agent: agent.name, desc });
      await report({ type: "action", agentRunId: agent.agentRunId, sequence: seq++, actionType: d.action, description: d.reason, target, inputData: d.action === "fill" && d.value !== "{{PASSWORD}}" ? { value: d.value } : null, result });
      await report({ type: "agent_status", agentRunId: agent.agentRunId, status: "running", currentUrl: page.url(), currentAction: desc.slice(0, 200) });
      await shot(page, report, job, agent, seq - 1);
    }
    await shot(page, report, job, agent, seq);
    await report({ type: "agent_status", agentRunId: agent.agentRunId, status: "failed", currentUrl: page.url() });
    await report({ type: "issue", runId: job.runId, severity: "medium", title: `${agent.name} ran out of steps`, description: `Goal not reached in ${MAX_STEPS} steps.`, agentRunId: agent.agentRunId });
    return { name: agent.name, ok: false, reason: "ran out of steps" };
  } catch (e) {
    await report({ type: "agent_status", agentRunId: agent.agentRunId, status: "error", currentUrl: page.url() });
    return { name: agent.name, ok: false, reason: e.message };
  } finally {
    await context.close().catch(() => {});
  }
}
