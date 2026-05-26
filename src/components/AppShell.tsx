import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Package,
  ScanLine,
  Receipt,
  LogOut,
  HandCoins,
  HeartHandshake,
  Scissors,
  Sparkles,
  KeyRound,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/emoney-logo.png";
import { APP_NAME } from "@/lib/constants";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { to: "/pos", label: "Point of Sale", icon: ScanLine, adminOnly: false },
  { to: "/students", label: "Students", icon: Users, adminOnly: true },
  { to: "/products", label: "Products", icon: Package, adminOnly: true },
  { to: "/transactions", label: "Transactions", icon: Receipt, adminOnly: false },
  { to: "/asasco", label: "Asasco", icon: HandCoins, adminOnly: false },
  { to: "/offering", label: "Offering", icon: HeartHandshake, adminOnly: false },
  { to: "/trimming", label: "Trimming", icon: Scissors, adminOnly: false },
  { to: "/plaiting", label: "Plaiting", icon: Sparkles, adminOnly: false },
  { to: "/classes", label: "Classes", icon: GraduationCap, adminOnly: true },
  { to: "/cashiers", label: "Cashiers", icon: KeyRound, adminOnly: true },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin } = useAuth();
  const loc = useLocation();
  const nav = NAV.filter((n) => isAdmin || !n.adminOnly);

  return (
    <div className="flex min-h-screen bg-background">
      <style>{`
        .logo-glow {
          filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.5)) drop-shadow(0 0 2px rgba(0, 255, 255, 0.8));
        }
      `}</style>
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={logo} alt="E-Money" width={40} height={40} className="logo-glow h-10 w-10 rounded-md object-contain" />
            <div>
              <div className="font-semibold tracking-tight text-primary">{APP_NAME}</div>
              <div className="text-xs text-sidebar-foreground/60">Royal Wallet</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border border-transparent",
                  active
                    ? "bg-sidebar-accent text-primary border-primary/40"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-primary hover:border-primary/20",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60 mb-2 truncate">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="" width={28} height={28} className="logo-glow h-7 w-7 object-contain" />
            <span className="font-semibold text-primary">{APP_NAME}</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-sidebar-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex overflow-x-auto px-2 pb-2 gap-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap border",
                  active
                    ? "bg-sidebar-accent text-primary border-primary/40"
                    : "text-sidebar-foreground/70 border-transparent",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 md:pl-0 pt-28 md:pt-0">
        <div key={loc.pathname} className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
