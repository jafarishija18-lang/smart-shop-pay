import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export function ClearButton({
  label = "Clear",
  title,
  description,
  onConfirm,
  size = "sm",
  className,
}: {
  label?: string;
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return null;

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      toast.success("Cleared");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to clear");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size={size} variant="outline" className={`text-destructive hover:bg-destructive hover:text-destructive-foreground ${className ?? ""}`} onClick={() => setOpen(true)}>
        <Trash2 /> {label}
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description} This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); run(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Clearing…" : "Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
