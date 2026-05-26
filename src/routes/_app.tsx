import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const CASHIER_ALLOWED = ["/pos", "/asasco", "/offering", "/trimming", "/plaiting", "/transactions"];

function AppLayout() {
  const { session, loading, isAdmin, isCashier } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);

  // Redirect cashier off admin-only pages
  useEffect(() => {
    if (loading || !session) return;
    if (isAdmin) return;
    if (isCashier) {
      const allowed = CASHIER_ALLOWED.some(
        (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
      );
      if (!allowed) navigate({ to: "/pos" });
    }
  }, [isAdmin, isCashier, loading, session, location.pathname, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin && !isCashier) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Access pending</h2>
          <p className="text-sm text-muted-foreground">
            Your account does not have access yet. Ask an admin to grant you access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
