import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/dashboard-view";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: DashboardView,
});
