import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/format";
import { verifyFingerprint, isWebAuthnSupported } from "@/lib/webauthn";
import type { ContributionCategory } from "@/lib/constants";
import { CONTRIBUTION_LABELS } from "@/lib/constants";
import { ClearButton } from "@/components/ClearButton";

export function ContributionPanel({
  category,
  description,
  denomination,
  onRecorded,
}: {
  category: ContributionCategory;
  description: string;
  denomination?: string;
  onRecorded?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ name: string; amount: number; new_balance: number } | null>(null);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a positive amount");
    if (!isWebAuthnSupported()) return toast.error("This device doesn't support fingerprint");

    setBusy(true);
    try {
      const credentialId = await verifyFingerprint([]);

      const { data: cred, error: credErr } = await supabase
        .from("student_credentials")
        .select("student_id, students(student_code, name)")
        .eq("credential_id", credentialId)
        .maybeSingle();
      if (credErr) throw credErr;
      if (!cred || !(cred as any).students) return toast.error("Fingerprint not recognized");
      const studentCode = (cred as any).students.student_code as string;

      const { data, error } = await supabase.rpc("process_contribution", {
        _student_code: studentCode,
        _credential_id: credentialId,
        _category: category,
        _amount: amt,
        _denomination: denomination ?? null,
      } as any);
      if (error) throw error;
      const r = data as any;
      if (!r.success) return toast.error(r.error || "Contribution failed");

      setLast({ name: r.student_name, amount: Number(r.amount), new_balance: Number(r.new_balance) });
      toast.success(`${CONTRIBUTION_LABELS[category]} contribution recorded`);
      setAmount("");
      onRecorded?.();
    } catch (e: any) {
      toast.error(e.message || "Contribution failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="h-12 text-lg font-semibold"
            />
          </div>
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            disabled={busy}
            onClick={submit}
          >
            <Fingerprint />
            {busy ? "Verifying…" : `Confirm ${CONTRIBUTION_LABELS[category]} with fingerprint`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Money is deducted from the student whose fingerprint is verified.
          </p>
          <div className="flex justify-end pt-2 border-t">
            <ClearButton
              label={denomination ? `Clear ${denomination}` : `Clear ${CONTRIBUTION_LABELS[category]}`}
              title={`Clear ${denomination ? denomination + " " : ""}${CONTRIBUTION_LABELS[category]} records?`}
              description={`This deletes all ${denomination ? denomination + " " : ""}${CONTRIBUTION_LABELS[category]} contribution records and resets the total to zero.`}
              onConfirm={async () => {
                const { error } = await supabase.rpc("clear_contributions" as any, {
                  _category: category,
                  _denomination: denomination ?? null,
                } as any);
                if (error) throw error;
                setLast(null);
                onRecorded?.();
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {last && (
          <Card className="border-success/40 bg-success/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-semibold">Last contribution</span>
              </div>
              <div className="text-sm space-y-0.5">
                <div><span className="text-muted-foreground">Student:</span> {last.name}</div>
                <div><span className="text-muted-foreground">Amount:</span> {fmt(last.amount)}</div>
                <div><span className="text-muted-foreground">New balance:</span> <span className="font-semibold">{fmt(last.new_balance)}</span></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
