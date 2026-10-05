import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTeam, inviteMember, cancelInvite, acceptInvite, removeMember, setMemberRole } from "@/lib/team.functions";

export function TeamSection() {
  const qc = useQueryClient();
  const load = useServerFn(getTeam);
  const invite = useServerFn(inviteMember);
  const cancel = useServerFn(cancelInvite);
  const accept = useServerFn(acceptInvite);
  const remove = useServerFn(removeMember);
  const setRole = useServerFn(setMemberRole);
  const { data } = useQuery({ queryKey: ["team"], queryFn: () => load() });
  const [email, setEmail] = useState("");
  const [role, setR] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  if (!data) return <section className="rounded-xl border bg-card p-6"><h2 className="font-medium">Team</h2><p className="mt-2 text-sm text-muted-foreground">Loading…</p></section>;
  const canManage = data.role !== "member";

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Team</h2>
        <span className="font-mono text-xs text-muted-foreground">{data.used} of {data.seats} users</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Everyone in the team shares projects, casts, runs, reports and the plan's runs. People sign in with the Google account you invite.</p>

      {data.incoming.map((i) => (
        <div key={i.id} className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 p-3 text-sm">
          <span><b>{i.from}</b> invited you to their team as {i.role}.</span>
          <span className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => act(() => accept({ data: { id: i.id } }), "You joined the team")}>Accept</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => cancel({ data: { id: i.id } }))}>Decline</Button>
          </span>
        </div>
      ))}

      <ul className="mt-4 divide-y rounded-lg border text-sm">
        <li className="flex items-center justify-between p-3"><span>{data.ownerEmail}</span><span className="font-mono text-xs text-muted-foreground">owner</span></li>
        {data.members.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>{m.email ?? "Member"}{m.user_id === data.me && " (you)"}</span>
            <span className="flex items-center gap-2">
              {data.role === "owner" ? (
                <select className="rounded-md border bg-background px-2 py-1 text-xs" value={m.role} disabled={busy}
                  onChange={(e) => act(() => setRole({ data: { userId: m.user_id, role: e.target.value as "admin" | "member" } }))}>
                  <option value="member">member</option><option value="admin">admin</option>
                </select>
              ) : <span className="font-mono text-xs text-muted-foreground">{m.role}</span>}
              {(m.user_id === data.me || data.role === "owner" || (data.role === "admin" && m.role === "member")) && (
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => act(() => remove({ data: { userId: m.user_id } }), m.user_id === data.me ? "You left the team" : "Removed")}>
                  {m.user_id === data.me ? "Leave" : "Remove"}
                </Button>
              )}
            </span>
          </li>
        ))}
        {data.invites.map((i) => (
          <li key={i.id} className="flex items-center justify-between p-3 text-muted-foreground">
            <span>{i.email} · invited as {i.role}</span>
            {canManage && <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => cancel({ data: { id: i.id } }))}>Cancel</Button>}
          </li>
        ))}
      </ul>

      {canManage && (data.plan === "none"
        ? <p className="mt-4 text-sm text-muted-foreground">Get Pro (3 users) or Team (5 users) to invite people.</p>
        : (
          <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); act(() => invite({ data: { email, role } }), "Invite sent").then(() => setEmail("")); }}>
            <Input type="email" required placeholder="teammate@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1" />
            <select className="rounded-full border bg-background px-3 text-sm" value={role} onChange={(e) => setR(e.target.value as "member" | "admin")}>
              <option value="member">Member</option><option value="admin">Admin</option>
            </select>
            <Button disabled={busy || data.used >= data.seats}>Invite</Button>
          </form>
        ))}
      {canManage && data.plan !== "none" && <p className="mt-2 text-xs text-muted-foreground">They'll see the invite here in Settings after signing in with that Google account.</p>}
    </section>
  );
}
