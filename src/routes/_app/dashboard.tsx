import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, Receipt, AlertTriangle, ScanLine, HandCoins, HeartHandshake, Scissors, Sparkles, TrendingUp } from "lucide-react";
import { fmt } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — E-Money" }] }),
});

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/50" : ""}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-secondary border border-primary/20">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className={`text-3xl font-bold tracking-tight ${highlight ? "text-primary" : ""}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    products: 0,
    todayTxns: 0,
    todayRevenue: 0,
    totalSpent: 0,
    lowBalance: 0,
    asasco: 0,
    offering: 0,
    trimming: 0,
    plaiting: 0,
  });

  useEffect(() => {
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [students, products, todayTxns, allTxns, low, contribs] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("total_amount, created_at").gte("created_at", today.toISOString()),
        supabase.from("transactions").select("total_amount"),
        supabase.from("students").select("id, balance, initial_balance"),
        supabase.from("contributions").select("category, amount"),
      ]);

      const todayRevenue = todayTxns.data?.reduce((s, t) => s + Number(t.total_amount), 0) ?? 0;
      const totalSpent = allTxns.data?.reduce((s, t) => s + Number(t.total_amount), 0) ?? 0;
      const lowCount =
        low.data?.filter((s) => Number(s.initial_balance) > 0 && Number(s.balance) <= Number(s.initial_balance) * 0.25).length ?? 0;

      const sumBy = (cat: string) =>
        contribs.data?.filter((c: any) => c.category === cat).reduce((s: number, c: any) => s + Number(c.amount), 0) ?? 0;

      setStats({
        students: students.count ?? 0,
        products: products.count ?? 0,
        todayTxns: todayTxns.data?.length ?? 0,
        todayRevenue,
        totalSpent,
        lowBalance: lowCount,
        asasco: sumBy("asasco"),
        offering: sumBy("offering"),
        trimming: sumBy("trimming"),
        plaiting: sumBy("plaiting"),
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-primary">E-Money</span> Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Royal cashless wallet — overview</p>
        </div>
        <Link to="/pos">
          <Button variant="hero" size="lg">
            <ScanLine /> Open Point of Sale
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label="Total spent in shop" value={fmt(stats.totalSpent)} hint="All-time shop revenue" highlight />
        <Stat icon={Receipt} label="Today's revenue" value={fmt(stats.todayRevenue)} />
        <Stat icon={ScanLine} label="Today's sales" value={String(stats.todayTxns)} />
        <Stat icon={Users} label="Students" value={String(stats.students)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Contributions ledger</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={HandCoins} label="Asasco" value={fmt(stats.asasco)} />
          <Stat icon={HeartHandshake} label="Offering" value={fmt(stats.offering)} />
          <Stat icon={Scissors} label="Trimming" value={fmt(stats.trimming)} />
          <Stat icon={Sparkles} label="Plaiting" value={fmt(stats.plaiting)} />
        </CardContent>
      </Card>



      <Card>
        <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Link to="/students"><Button variant="outline" className="w-full justify-start"><Users /> Manage students</Button></Link>
          <Link to="/products"><Button variant="outline" className="w-full justify-start"><Wallet /> Manage products</Button></Link>
          <Link to="/transactions"><Button variant="outline" className="w-full justify-start"><Receipt /> Transaction history</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
