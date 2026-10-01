import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, Download, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getRunReport, regenerateRunReport, setReportSharing } from "@/lib/report.functions";
import { reportToMarkdown, type ReportDoc } from "@/lib/report-format";
import { ReportView } from "@/components/report-view";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/runs/$id/report")({
  head: () => ({ meta: [{ title: "Test report — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const load = useServerFn(getRunReport);
  const regen = useServerFn(regenerateRunReport);
  const share = useServerFn(setReportSharing);
  const [token, setToken] = useState<string | null | undefined>(undefined);

  const q = useQuery({ queryKey: ["report", id], queryFn: async () => (await load({ data: { runId: id } })) as unknown as { report: ReportDoc | null; reason?: string; shareToken?: string | null; evidenceUrls: Record<string, string> } });

  const regenM = useMutation({
    mutationFn: () => regen({ data: { runId: id } }),
    onSuccess: () => { q.refetch(); toast.success("Report rebuilt from the recorded run"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not rebuild report"),
  });
  const shareM = useMutation({
    mutationFn: (enabled: boolean) => share({ data: { runId: id, enabled } }),
    onSuccess: (r) => {
      setToken(r.shareToken);
      if (r.shareToken) {
        navigator.clipboard?.writeText(`${window.location.origin}/r/${r.shareToken}`).catch(() => {});
        toast.success("Share link created and copied");
      } else toast.success("Share link turned off");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update sharing"),
  });

  if (q.isLoading) return <p className="font-mono text-xs text-muted-foreground">Loading report…</p>;
  if (q.error) return <p className="text-sm text-destructive">{q.error instanceof Error ? q.error.message : "Could not load report"}</p>;
  const data = q.data!;
  if (!data.report)
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/runs/$id" params={{ id }} className="font-mono text-xs text-muted-foreground hover:text-foreground">← Back to run</Link>
        <p className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">{data.reason}</p>
      </div>
    );

  const report = data.report;
  const md = () => reportToMarkdown(report);
  const shareToken = token === undefined ? (data.shareToken ?? null) : token;

  async function copy() {
    try {
      await navigator.clipboard.writeText(md());
      toast.success("Report copied");
    } catch {
      toast.error("Your browser blocked clipboard access");
    }
  }
  function download(kind: "md" | "json") {
    const body = kind === "md" ? md() : JSON.stringify(report, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: kind === "md" ? "text/markdown" : "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `poolabs-report-${report.runId.slice(0, 8)}.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/runs/$id" params={{ id }} className="font-mono text-xs text-muted-foreground hover:text-foreground">← Back to run</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Test report</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> Copy report</Button>
          <Button variant="outline" size="sm" onClick={() => download("md")}><Download className="h-4 w-4" /> Export .md</Button>
          <Button variant="outline" size="sm" onClick={() => download("json")}><Download className="h-4 w-4" /> Export .json</Button>
          <Button variant="outline" size="sm" disabled={regenM.isPending} onClick={() => regenM.mutate()}>
            <RefreshCw className="h-4 w-4" /> {regenM.isPending ? "Rebuilding…" : "Rebuild"}
          </Button>
          <Button size="sm" disabled={shareM.isPending} onClick={() => shareM.mutate(!shareToken)}>
            <Link2 className="h-4 w-4" /> {shareToken ? "Turn off sharing" : "Share link"}
          </Button>
        </div>
      </div>
      {shareToken && (
        <p className="mt-3 break-all rounded-xl border bg-card p-3 font-mono text-[11px] text-accent">
          {typeof window !== "undefined" ? `${window.location.origin}/r/${shareToken}` : `/r/${shareToken}`}
        </p>
      )}
      <div className="mt-6">
        <ReportView report={report} evidenceUrls={data.evidenceUrls} />
      </div>
    </div>
  );
}
