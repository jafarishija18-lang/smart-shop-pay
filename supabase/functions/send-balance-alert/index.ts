import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { student_id, student_name, new_balance, alert_type } = await req.json();

    if (!RESEND_API_KEY) {
      console.warn("No RESEND_API_KEY found, skipping email.");
      return new Response(JSON.stringify({ success: true, mock: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: student, error } = await supabase
      .from("students")
      .select("email")
      .eq("id", student_id)
      .single();

    if (error || !student?.email) {
      throw new Error("Student not found or no email");
    }

    const isZero = alert_type === "zero";
    const subject = isZero ? "Balance Depleted - Action Required" : "Low Balance Alert";
    const body = `Hello ${student_name},\n\nYour account balance is ${isZero ? "now exactly 0" : "running low"}. Current balance is ${new_balance}/=.\n\nPlease top up your account to continue making purchases.\n\nThank you,\nBioPay Smart Shop`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BioPay <onboarding@resend.dev>", // default testing address for resend
        to: student.email,
        subject: subject,
        text: body,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend API error: ${await res.text()}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
