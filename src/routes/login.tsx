import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Poolabs" },
      { name: "description", content: "Sign in to Poolabs to run multi-user AI tests." },
      { property: "og:title", content: "Sign in — Poolabs" },
      { property: "og:description", content: "Sign in to Poolabs to run multi-user AI tests." },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
