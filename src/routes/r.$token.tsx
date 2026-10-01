import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { getSharedReport } from "@/lib/report.functions";
import { reportToMarkdown, type ReportDoc } from "@/lib/report-format";
import { ReportView } from "@/components/report-view";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "Shared test report — Poolabs" },
      { name: "description", content: "A read-only Poolabs test report from a real multi-user browser run." },
      { property: "og:title", content: "Shared test report — Poolabs" },
      { property: "og:description", content: "A read-only Poolabs test report from a real multi-user browser run." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Shared,
});

function Shared() {
  const { token } = Route.useParams();
  const q = useQuery({ queryKey: ["shared-report", token], queryFn: async () => (await getSharedReport({ data: { token } })) as unknown as { report: ReportDoc | null; evidenceUrls: Record<string, string> } });

  return (
    <div className="min-h-screen bg-sun p-3 md:p-6">
      <div className="overflow-hidden rounded-[2rem] bg-ink text-paper">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Link to="/"><Logo /></Link>
          <span className="font-mono text-[11px] uppercase tracking-widest text-paper/60">Read-only report</span>
        </header>
        <div className="mx-2 mt-4 rounded-t-[2rem] border-t-[10px] border-accent bg-background px-6 pb-16 pt-10 text-foreground md:mx-10">
          <div className="mx-auto max-w-5xl">
            {q.isLoading && <p className="font-mono text-xs text-muted-foreground">Loading report…</p>}
            {!q.isLoading && !q.data?.report && (
              <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                This share link is not valid, or sharing was turned off.
              </p>
            )}
            {q.data?.report && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-4xl">{q.data.report.scenario.name ?? "Test report"}</h1>
                  <Button
                    variant="outline" size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(reportToMarkdown(q.data!.report!));
                        toast.success("Report copied");
                      } catch { toast.error("Your browser blocked clipboard access"); }
                    }}
                  >
                    <Copy className="h-4 w-4" /> Copy report
                  </Button>
                </div>
                <div className="mt-6">
                  <ReportView report={q.data.report} evidenceUrls={q.data.evidenceUrls} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
