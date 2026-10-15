import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/signup")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.poolabs.in/signup" }],
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://www.poolabs.in/signup" },
      { title: "Create account — Poolabs" },
      { name: "description", content: "Create a Poolabs account and put AI users inside your app." },
      { property: "og:title", content: "Create account — Poolabs" },
      { property: "og:description", content: "Create a Poolabs account and put AI users inside your app." },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
