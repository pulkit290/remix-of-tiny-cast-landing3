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
            reasoning: { effort: "low" },
            text: { format: { type: "json_object" } },
          }),
        });
        if (!r.ok) {
          const msg = r.status === 429 ? "AI rate limited" : r.status === 402 ? "AI credits exhausted" : `AI request failed (${r.status})`;
          return Response.json({ error: msg }, { status: r.status });
        }
        const j = (await r.json()) as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
        const content = (j.output ?? [])
          .filter((o) => o.type === "message")
          .flatMap((o) => o.content ?? [])
          .filter((c) => c.type === "output_text")
          .map((c) => c.text ?? "")
          .join("");
        return Response.json({ content });
      },
    },
  },
});
