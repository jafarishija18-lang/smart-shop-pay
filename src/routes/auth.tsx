import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/emoney-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — E-Money" },
      { name: "description", content: "Admin sign in for the E-Money royal cashless wallet." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading, isAdmin, isCashier } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) return;
    if (isAdmin) navigate({ to: "/dashboard" });
    else if (isCashier) navigate({ to: "/pos" });
  }, [session, loading, isAdmin, isCashier, navigate]);

  const submit = async (mode: "signin" | "signup") => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in now.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 [background-image:var(--gradient-hero)]">
      <Card className="w-full max-w-md shadow-[var(--shadow-glow)] border-primary/40">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 mb-3">
            <img src={logo} alt="E-Money" className="h-full w-full object-contain" />
          </div>
          <CardTitle className="text-primary text-2xl">E-Money</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="cashier">Cashier</TabsTrigger>
            </TabsList>
            {(["admin", "cashier"] as const).map((role) => (
              <TabsContent key={role} value={role} className="space-y-4 mt-4">
                <p className="text-xs text-muted-foreground text-center">
                  {role === "admin"
                    ? "Full access to manage students, products and transactions."
                    : "Restricted to POS, Asasco, Offering, Trimming and Plaiting."}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`${role}-email`}>Email</Label>
                  <Input
                    id={`${role}-email`}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${role}-pw`}>Password</Label>
                  <Input
                    id={`${role}-pw`}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => submit("signin")}
                >
                  {busy ? "Please wait…" : `Sign in as ${role}`}
                </Button>
                {role === "admin" && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer text-center">First-time admin? Create account</summary>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      disabled={busy}
                      onClick={() => submit("signup")}
                    >
                      Create admin account
                    </Button>
                    <p className="mt-2 text-center">The first account becomes admin automatically. Cashier accounts are created from the Cashiers page.</p>
                  </details>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
