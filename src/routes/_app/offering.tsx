import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ContributionPanel } from "@/components/ContributionPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DENOMINATIONS, type Denomination } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/_app/offering")({
  component: OfferingPage,
  head: () => ({ meta: [{ title: "Offering — E-Money" }] }),
});

function OfferingPage() {
  const [totals, setTotals] = useState<Record<string, number>>({});

  const loadTotals = useCallback(async () => {
    const { data } = await supabase
      .from("contributions")
      .select("amount, denomination")
      .eq("category", "offering");
    const t: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      const k = r.denomination || "Unspecified";
      t[k] = (t[k] ?? 0) + Number(r.amount);
    });
    setTotals(t);
  }, []);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Offering</h1>
        <p className="text-sm text-muted-foreground">
          Collect offerings per denomination. Totals are tracked separately.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DENOMINATIONS.map((d) => (
          <Card key={d}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{d}</div>
              <div className="text-xl font-bold text-primary">{fmt(totals[d] ?? 0)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue={DENOMINATIONS[0]}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          {DENOMINATIONS.map((d) => (
            <TabsTrigger key={d} value={d}>
              {d}
            </TabsTrigger>
          ))}
        </TabsList>
        {DENOMINATIONS.map((d: Denomination) => (
          <TabsContent key={d} value={d} className="mt-4">
            <ContributionPanel
              category="offering"
              denomination={d}
              description={`Enter the ${d} offering amount, then verify with fingerprint.`}
              onRecorded={loadTotals}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
