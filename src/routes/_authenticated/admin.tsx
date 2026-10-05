import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminOverview, setMessageStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

const d = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

function Admin() {
  const load = useServerFn(getAdminOverview);
  const mark = useServerFn(setMessageStatus);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin"], queryFn: () => load(), retry: false, refetchInterval: 15000 });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <div className="rounded-xl border bg-card p-6"><h1 className="text-2xl">Admins only</h1><p className="mt-2 text-sm text-muted-foreground">This page is only for the site owner.</p></div>;

  const open = data.messages.filter((m) => m.status !== "done").length;
  const stats = [["Users", data.users.length], ["Projects", data.projectCount], ["Recent runs", data.runs.length], ["Open messages", open]] as const;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Admin</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => <div key={k} className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">{k}</div><div className="text-3xl font-semibold">{v}</div></div>)}
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-medium">Support messages</h2>
        <div className="mt-3 space-y-3">
          {data.messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {data.messages.map((m) => (
            <div key={m.id} className={`rounded-lg border p-4 ${m.status === "done" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm"><b>{m.name}</b> · <span className="text-muted-foreground">{m.email}</span></div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{d(m.created_at)}</span>
                  <Button size="sm" variant="outline" onClick={async () => { await mark({ data: { id: m.id, status: m.status === "done" ? "new" : "done" } }); qc.invalidateQueries({ queryKey: ["admin"] }); }}>
                    {m.status === "done" ? "Reopen" : "Mark done"}
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
            </div>
          ))}
        </div>
      </section>

      <Table title="Users" head={["Email", "Joined", "Last sign-in"]} rows={data.users.map((u) => [u.email, d(u.created_at), d(u.last_sign_in_at)])} />
      <Table title="Billing" head={["Account", "Plan", "Status", "Runs used", "Credits"]} rows={data.billing.map((b) => [b.email, b.plan, b.subscription_status ?? "—", `${b.runs_used}/${b.runs_included}`, String(b.run_credits)])} />
      <Table title="Payments" head={["Event", "Account", "When"]} rows={data.payments.map((p) => [p.event_type, p.email, d(p.created_at)])} />
      <Table title="Recent runs" head={["Cast", "Status", "Duration", "When"]} rows={data.runs.map((r) => [r.name, r.status, r.duration_ms ? `${Math.round(r.duration_ms / 1000)}s` : "—", d(r.created_at)])} />
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-medium">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground">{head.map((h) => <th key={h} className="py-2 pr-4 font-normal">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="py-2 text-muted-foreground" colSpan={head.length}>Nothing yet.</td></tr>}
            {rows.map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="py-2 pr-4">{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
