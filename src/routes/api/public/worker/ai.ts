import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

// AI decisions for the browser worker, so the worker needs no AI key of its own.
// Only the worker (holding WORKER_SECRET) may call this.
const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(60_000) })).min(1).max(20),
});

function authorized(req: Request) {
  const secret = process.env["WORKER_SECRET"];
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !token) return false;
  const a = Buffer.from(token), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/worker/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "AI not configured" }, { status: 500 });
        const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: { "content-type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            input: parsed.data.messages,
            store: false,
            stream: true,
            reasoning: { effort: "medium" },
            text: { format: { type: "json_object" } },
          }),
        });
        if (!r.ok) {
          const msg = r.status === 429 ? "AI rate limited" : r.status === 402 ? "AI credits exhausted" : `AI request failed (${r.status})`;
          return Response.json({ error: msg }, { status: r.status });
        }
        // Stream and accumulate the answer text (avoids buffered timeouts).
        let content = "", buf = "";
        const reader = r.body!.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const ev = JSON.parse(payload) as { type?: string; delta?: string; response?: { error?: { message?: string } } };
              if (ev.type === "response.output_text.delta" && ev.delta) content += ev.delta;
              if (ev.type === "response.failed" || ev.type === "error") {
                return Response.json({ error: ev.response?.error?.message ?? "AI request failed" }, { status: 502 });
              }
            } catch { /* partial frame */ }
          }
        }
        return Response.json({ content });
      },
    },
  },
});
