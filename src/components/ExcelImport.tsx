import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  label?: string;
  /** Process parsed rows. Return number of successful rows or throw. */
  onRows: (rows: Record<string, any>[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  templateHint?: string;
}

export function ExcelImport({ label = "Import Excel", onRows, templateHint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      if (!rows.length) {
        toast.error("File is empty");
        return;
      }
      const result = await onRows(rows);
      if (result.failed > 0) {
        toast.warning(`Imported ${result.success}, failed ${result.failed}`, {
          description: result.errors?.slice(0, 3).join(" • "),
        });
      } else {
        toast.success(`Imported ${result.success} row(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import file");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={templateHint}
      >
        {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
        {label}
      </Button>
    </>
  );
}
