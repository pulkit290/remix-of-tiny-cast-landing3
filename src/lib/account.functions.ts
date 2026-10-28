import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Permanently deletes the caller's own account and the data they own. Requires typing DELETE.
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    await db.from("team_members").delete().or(`user_id.eq.${uid},owner_id.eq.${uid}`);
    await db.from("team_invites").delete().eq("owner_id", uid);
    await db.from("projects").delete().eq("owner_id", uid);
    await db.from("billing_accounts").delete().eq("user_id", uid);
    const { error } = await db.auth.admin.deleteUser(uid);
    if (error) throw new Error("Could not delete account. Please contact us.");
    return { ok: true };
  });
