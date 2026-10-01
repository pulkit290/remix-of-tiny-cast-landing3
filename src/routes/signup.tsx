import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Poolabs" },
      { name: "description", content: "Create a Poolabs account and put AI users inside your app." },
      { property: "og:title", content: "Create account — Poolabs" },
      { property: "og:description", content: "Create a Poolabs account and put AI users inside your app." },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
