import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/cashiers")({
  component: CashiersPage,
});

// Isolated client for creating accounts without replacing the admin session.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const signupClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface CashierRow {
  id: string;
  user_id: string;
  created_at: string;
}

function CashiersPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<CashierRow[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("id, user_id, created_at")
      .eq("role", "cashier")
      .order("created_at", { ascending: false });
    setRows((data as CashierRow[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    setBusy(true);
    try {
      // Create the auth user (no auto-login since admin is currently signed in)
      // We use signUp; if email confirmation is on, the user must confirm.
      // To preserve admin session, use a fresh client-less call via edge fn would be ideal,
      // but signUp does NOT switch sessions when called by an authenticated client.
      const { data, error } = await signupClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      const newUserId = data.user?.id;
      if (!newUserId) throw new Error("Could not create user");

      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: newUserId, role: "cashier" });
      if (roleErr) throw roleErr;

      toast.success("Cashier account created");
      setEmail("");
      setPassword("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create cashier");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke cashier access for this account?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Access revoked");
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-primary">Cashier accounts</h1>
        <p className="text-sm text-muted-foreground">
          Cashiers can use Point of Sale, Asasco, Offering, Trimming, and Plaiting only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add cashier
          </CardTitle>
          <CardDescription>Create a sign-in for staff who only operate sales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>
          <Button onClick={create} disabled={busy} variant="hero">
            {busy ? "Creating…" : "Create cashier"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing cashiers</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cashier accounts yet.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <div className="text-sm">
                    <div className="font-mono text-xs text-muted-foreground">{r.user_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => revoke(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
