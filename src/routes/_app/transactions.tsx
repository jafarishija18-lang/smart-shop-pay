import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ClearButton } from "@/components/ClearButton";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/transactions")({
  component: TxnsPage,
  head: () => ({ meta: [{ title: "Transactions — BioPay" }] }),
});

interface Txn {
  id: string;
  total_amount: number;
  created_at: string;
  students: { name: string; student_code: string } | null;
  transaction_items: { product_name: string; price: number; quantity: number }[];
}

function TxnsPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("id, total_amount, created_at, students(name, student_code), transaction_items(product_name, price, quantity)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Txn[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const exportCsv = () => {
    const header = ["Date", "Student code", "Student name", "Items", "Total"];
    const lines = rows.map((r) => [
      new Date(r.created_at).toISOString(),
      r.students?.student_code ?? "",
      r.students?.name ?? "",
      r.transaction_items.map((i) => `${i.quantity}x ${i.product_name}`).join("; "),
      Number(r.total_amount).toFixed(2),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biopay-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = rows.reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} records · Total {fmt(total)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download /> Export CSV
          </Button>
          {isAdmin && (
            <ClearButton
              label="Clear transactions"
              title="Clear all transactions?"
              description="This permanently deletes all POS transactions and their line items."
              onConfirm={async () => {
                const { error } = await supabase.rpc("clear_transactions" as any);
                if (error) throw error;
                await reload();
              }}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent (last 200)</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Items</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No transactions yet</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.students?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.students?.student_code}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {r.transaction_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(r.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
