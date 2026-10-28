import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
  const del = useServerFn(deleteMyAccount);
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const m = useMutation({
    mutationFn: () => del({ data: { confirm: "DELETE" } }),
    onSuccess: async () => { await supabase.auth.signOut(); toast.success("Your account was deleted."); navigate({ to: "/" }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete account"),
  });
  return (
    <section className="rounded-xl border border-destructive/50 bg-card p-6">
      <h2 className="font-medium text-destructive">Delete account</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This permanently deletes your account, projects, tests, reports and team. Unused runs and credits are lost, and it can't be undone. Cancel any subscription first so you aren't charged again.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm"
          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" />
        <Button variant="destructive" size="sm" disabled={text !== "DELETE" || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </section>
  );
}
