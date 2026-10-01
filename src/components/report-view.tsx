import { AlertTriangle, Camera, CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import type { ReportDoc, ReportVerdict } from "@/lib/report-format";
import { fmtDuration, verdictLabel } from "@/lib/report-format";
import { cn } from "@/lib/utils";

const verdictStyle: Record<ReportVerdict, string> = {
  passed: "border-primary/40 bg-primary/10 text-primary",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  partial: "border-warning/40 bg-warning/10 text-warning",
  cancelled: "border-border bg-muted text-muted-foreground",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};
const VerdictIcon = { passed: CheckCircle2, failed: XCircle, partial: AlertTriangle, error: CircleSlash, cancelled: CircleSlash };

export function VerdictBadge({ verdict }: { verdict: ReportVerdict }) {
  const Icon = VerdictIcon[verdict];
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest", verdictStyle[verdict])}>
      <Icon className="h-3.5 w-3.5" /> {verdictLabel[verdict]}
    </span>
  );
}

const H = ({ children }: { children: string }) => (
  <h2 className="mt-10 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{children}</h2>
);

export function ReportView({ report: r, evidenceUrls }: { report: ReportDoc; evidenceUrls: Record<string, string> }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={r.verdict} />
        <span className="font-mono text-[11px] text-muted-foreground">
          {r.runId.slice(0, 8)} · {fmtDuration(r.durationMs)} ·{" "}
          {r.completedAt ? new Date(r.completedAt).toLocaleString() : "not completed"}
        </span>
      </div>
      {r.project.appUrl && (
        <p className="mt-3 font-mono text-xs text-accent break-all">{r.project.appUrl}</p>
      )}
      {r.summary && <div className="mt-5 rounded-xl border bg-card p-4 text-sm whitespace-pre-line">{r.summary}</div>}
      {r.failureReason && (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">{r.failureReason}</div>
      )}

      <H>AI users and results</H>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {r.agents.length === 0 && <p className="text-sm text-muted-foreground">No AI user sessions were recorded.</p>}
        {r.agents.map((a) => (
          <div key={a.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{a.name}</span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{a.role} · {a.status}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Goal: {a.goal}</p>
            <p className="mt-1 text-sm">Result: {a.outcome ?? "no result reported"}</p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {a.actionCount} actions{a.lastUrl ? ` · ${a.lastUrl}` : ""}
            </p>
          </div>
        ))}
      </div>

      {r.expectedVsActual.length > 0 && (
        <>
          <H>Expected vs actual</H>
          <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b font-mono text-[10px] uppercase text-muted-foreground">
                <tr><th className="p-3 text-left">AI user</th><th className="p-3 text-left">Expected</th><th className="p-3 text-left">Actual</th></tr>
              </thead>
              <tbody className="divide-y">
                {r.expectedVsActual.map((e) => (
                  <tr key={e.agent}><td className="p-3">{e.agent}</td><td className="p-3 text-muted-foreground">{e.expected}</td><td className="p-3">{e.actual}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <H>Action timeline</H>
      <div className="mt-3 rounded-xl border bg-card">
        {r.timeline.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No actions were reported by the browser worker.</p>
        ) : (
          <ol className="divide-y">
            {r.timeline.map((a) => (
              <li key={a.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[92px_130px_1fr]">
                <span className="font-mono text-[11px] text-muted-foreground">{new Date(a.at).toLocaleTimeString()}</span>
                <span className={cn("truncate font-mono text-[11px]", a.failed ? "text-destructive" : "text-primary")}>
                  {a.agent} · {a.type}
                </span>
                <div>
                  <div>{a.description}</div>
                  {a.target && <div className="font-mono text-[11px] text-muted-foreground">{a.target}</div>}
                  {a.result && <div className={cn("mt-1 text-xs", a.failed ? "text-destructive" : "text-muted-foreground")}>→ {a.result}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {r.failures.length > 0 && (
        <>
          <H>Failed actions</H>
          <ul className="mt-3 space-y-2">
            {r.failures.map((f) => (
              <li key={f.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <div className="font-mono text-[11px] text-destructive">{f.agent} · {f.type} · {new Date(f.at).toLocaleTimeString()}</div>
                <div className="mt-1">{f.description}</div>
                {f.result && <div className="mt-1 text-xs text-muted-foreground">{f.result}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {r.issues.length > 0 && (
        <>
          <H>Issues and reproduction steps</H>
          <div className="mt-3 space-y-3">
            {r.issues.map((i) => (
              <div key={i.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase text-warning">{i.severity}</span>
                  <span className="text-sm font-medium">{i.title}</span>
                </div>
                {i.description && <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>}
                {i.reproductionSteps.length > 0 && (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 font-mono text-[11px] text-muted-foreground">
                    {i.reproductionSteps.map((s, n) => <li key={n}>{s}</li>)}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <H>Evidence</H>
      {r.evidence.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No screenshots were captured by the browser worker for this run.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {r.evidence.map((e) => {
            const url = e.storagePath ? evidenceUrls[e.storagePath] : undefined;
            return (
              <figure key={e.id} className="overflow-hidden rounded-xl border bg-card">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`${e.agent ?? "AI user"} step ${e.sequence ?? ""}`} className="aspect-video w-full object-cover object-top" loading="lazy" />
                  </a>
                ) : (
                  <div className="flex aspect-video items-center justify-center text-muted-foreground"><Camera className="h-5 w-5" /></div>
                )}
                <figcaption className="border-t px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground">
                  {e.agent ?? "AI user"}{e.sequence != null ? ` · step ${e.sequence}` : ""}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <p className="mt-10 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Generated {new Date(r.generatedAt).toLocaleString()} from the recorded browser session
      </p>
    </div>
  );
}
