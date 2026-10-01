import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Poolabs" },
      { name: "description", content: "Get in touch with the Poolabs team." },
      { property: "og:title", content: "Contact — Poolabs" },
      { property: "og:description", content: "Get in touch with the Poolabs team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const field = "w-full rounded-xl border-2 border-ink bg-paper px-4 py-2.5";

function Contact() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the form"); return; }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data as { name: string; email: string; message: string });
    setBusy(false);
    if (error) { toast.error("Could not send your message. Please try again."); return; }
    form.reset();
    setSent(true);
  }

  return (
    <PageShell title="Contact">
      <p>Questions, feedback or need help with a test? Send us a message.</p>
      {sent ? (
        <p className="rounded-2xl bg-pop-green p-5 font-semibold">Thanks — your message was received.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input name="name" placeholder="Your name" maxLength={100} className={field} />
          <input name="email" type="email" placeholder="Email" maxLength={255} className={field} />
          <textarea name="message" placeholder="Message" rows={6} maxLength={2000} className={field} />
          <button disabled={busy} className="rounded-full bg-primary px-7 py-3 font-bold uppercase text-primary-foreground disabled:opacity-60">
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </PageShell>
  );
}
