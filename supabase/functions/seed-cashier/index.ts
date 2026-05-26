// Idempotently provisions the default cashier account.
// Public endpoint but only ever creates/updates the one preconfigured email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_EMAIL = "arushascience@gmail.com";
const DEFAULT_PASSWORD = "Arusha2026";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find existing user
  let userId: string | null = null;
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email?.toLowerCase() === ALLOWED_EMAIL);

  if (existing) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, {
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: ALLOWED_EMAIL,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = data.user!.id;
  }

  // Ensure cashier role
  const { data: existingRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "cashier")
    .maybeSingle();
  if (!existingRole) {
    await admin.from("user_roles").insert({ user_id: userId, role: "cashier" });
  }

  return new Response(JSON.stringify({ ok: true, user_id: userId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
