import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Trash2, X, CheckCircle2, AlertTriangle, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/pos")({
  component: POS,
  head: () => ({ meta: [{ title: "Point of Sale — BioPay" }] }),
});

interface CartLine {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

function POS() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [scanningFingerprint, setScanningFingerprint] = useState(false);
  const [fingerprintInput, setFingerprintInput] = useState("");
  const [lastReceipt, setLastReceipt] = useState<{
    name: string;
    total: number;
    new_balance: number;
  } | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const addByBarcode = async (code: string) => {
    const c = code.trim();
    if (!c) return;
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .eq("barcode", c)
      .maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!data) { toast.error(`No product with barcode ${c}`); return; }
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product_id === data.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
        return copy;
      }
      return [...prev, { product_id: data.id, name: data.name, price: Number(data.price), quantity: 1 }];
    });
    setBarcode("");
  };

  const onBarcodeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addByBarcode(barcode);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.product_id === id ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    );
  };
  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.product_id !== id));

  const clearAll = () => {
    setCart([]);
    setBarcode("");
    barcodeRef.current?.focus();
  };

  const checkout = () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setScanningFingerprint(true);
    setFingerprintInput("");
  };

  const processPayment = async () => {
    if (!fingerprintInput.trim()) return;
    setScanningFingerprint(false);
    setBusy(true);
    try {
      const matchedCredId = fingerprintInput.trim();

      // 2. Resolve which student this credential belongs to
      const { data: cred, error: cErr } = await supabase
        .from("student_credentials")
        .select("student_id, students:student_id(student_code, name)")
        .eq("credential_id", matchedCredId)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!cred || !(cred as any).students) {
        toast.error("Fingerprint not recognised — student not found");
        return;
      }
      const studentCode = (cred as any).students.student_code as string;

      // 3. Process checkout server-side using the verified credential id
      const { data, error } = await supabase.rpc("process_checkout", {
        _student_code: studentCode,
        _credential_id: matchedCredId,
        _items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      });
      if (error) throw error;
      const r = data as any;
      if (!r.success) {
        toast.error(r.error || "Transaction failed");
        return;
      }
      setLastReceipt({
        name: r.student_name,
        total: Number(r.total),
        new_balance: Number(r.new_balance),
      });

      if (r.zero_balance_alert || r.low_balance_alert) {
        supabase.functions.invoke("send-balance-alert", {
          body: { 
            student_id: (cred as any).student_id,
            student_name: r.student_name,
            new_balance: Number(r.new_balance),
            alert_type: r.zero_balance_alert ? "zero" : "low"
          }
        }).catch(console.error);

        if (r.zero_balance_alert) {
          toast.warning("Student balance is now 0 — top-up reminder will be sent to their email.");
        } else {
          toast.warning("Student balance is low — alert will be sent to their email.");
        }
      } else {
        toast.success("Payment successful");
      }
      setCart([]);
      barcodeRef.current?.focus();
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Scan products, then take payment with fingerprint</p>
        </div>
        {cart.length > 0 && (
          <Button variant="outline" onClick={clearAll}><X /> Clear</Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Left — scanner + cart */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Scan or type barcode</Label>
              <div className="mt-2 relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                <Input
                  ref={barcodeRef}
                  className="pl-11 h-14 text-lg font-mono"
                  placeholder="Awaiting scan…"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={onBarcodeKey}
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ScanLine className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  Cart is empty — scan an item to begin
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Item</th>
                      <th className="text-right px-4 py-3">Price</th>
                      <th className="text-center px-4 py-3">Qty</th>
                      <th className="text-right px-4 py-3">Subtotal</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => (
                      <tr key={l.product_id} className="border-t">
                        <td className="px-4 py-3 font-medium">{l.name}</td>
                        <td className="px-4 py-3 text-right">{fmt(l.price)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.product_id, -1)}>−</Button>
                            <span className="w-8 text-center font-semibold">{l.quantity}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.product_id, 1)}>+</Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{fmt(l.price * l.quantity)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="icon" variant="ghost" onClick={() => removeLine(l.product_id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — total + payment */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="px-6 py-5 [background-image:var(--gradient-primary)] text-primary-foreground">
              <div className="text-xs uppercase tracking-wider opacity-80">Total due</div>
              <div className="text-5xl font-bold tracking-tight mt-1">{fmt(total)}</div>
              <div className="text-xs opacity-70 mt-1">{cart.length} item{cart.length === 1 ? "" : "s"}</div>
            </div>
            <CardContent className="p-5 space-y-3">
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                disabled={busy || cart.length === 0}
                onClick={checkout}
              >
                <Fingerprint />
                {busy ? "Verifying…" : `Pay with fingerprint`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                The student will be prompted to verify their fingerprint on this device.
              </p>
            </CardContent>
          </Card>

          {lastReceipt && (
            <Card className="border-success/40 bg-success/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-semibold">Last payment</span>
                </div>
                <div className="text-sm space-y-0.5">
                  <div><span className="text-muted-foreground">Student:</span> {lastReceipt.name}</div>
                  <div><span className="text-muted-foreground">Paid:</span> {fmt(lastReceipt.total)}</div>
                  <div><span className="text-muted-foreground">New balance:</span> <span className="font-semibold">{fmt(lastReceipt.new_balance)}</span></div>
                </div>
                {lastReceipt.new_balance === 0 && (
                  <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-warning/10 text-xs text-warning-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Balance depleted — top up needed
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={scanningFingerprint} onOpenChange={setScanningFingerprint}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify Fingerprint</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Please scan the fingerprint to confirm payment</Label>
            <Input autoFocus value={fingerprintInput} onChange={(e) => setFingerprintInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') processPayment(); }} placeholder="Waiting for scanner..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanningFingerprint(false)}>Cancel</Button>
            <Button variant="hero" onClick={processPayment} disabled={!fingerprintInput || busy}>Pay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
