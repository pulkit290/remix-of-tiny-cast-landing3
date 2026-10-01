import { createFileRoute } from "@tanstack/react-router";
import { ProjectsView } from "@/components/projects-view";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({ meta: [{ title: "Projects — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: () => <ProjectsView title="Projects" />,
});
