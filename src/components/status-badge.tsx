import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  passed: "text-success border-success/30 bg-success/10",
  completed: "text-success border-success/30 bg-success/10",
  failed: "text-destructive border-destructive/30 bg-destructive/10",
  error: "text-destructive border-destructive/30 bg-destructive/10",
  running: "text-accent border-accent/30 bg-accent/10",
  queued: "text-warning border-warning/30 bg-warning/10",
  starting: "text-accent border-accent/30 bg-accent/10",
  draft: "text-muted-foreground border-border bg-muted",
  cancelled: "text-muted-foreground border-border bg-muted",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "none";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
        styles[s] ?? "text-muted-foreground border-border bg-muted",
      )}
    >
      {s === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
      {s === "none" ? "no runs" : s}
    </span>
  );
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
