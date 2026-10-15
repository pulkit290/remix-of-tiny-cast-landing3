import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/login")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.poolabs.in/login" }],
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://www.poolabs.in/login" },
      { title: "Sign in — Poolabs" },
      { name: "description", content: "Sign in to Poolabs to run multi-user AI tests." },
      { property: "og:title", content: "Sign in — Poolabs" },
      { property: "og:description", content: "Sign in to Poolabs to run multi-user AI tests." },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
