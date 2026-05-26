import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Wallet, Search, Fingerprint, Crown, Trash2, Minus, Pencil } from "lucide-react";
import { ClearButton } from "@/components/ClearButton";
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
import { toast } from "sonner";
import { fmt } from "@/lib/format";
import { FORM_LEVELS, COMBINATIONS } from "@/lib/constants";
import { ExcelImport } from "@/components/ExcelImport";

export const Route = createFileRoute("/_app/students")({
  component: StudentsPage,
  head: () => ({ meta: [{ title: "Students — E-Money" }] }),
});

interface Student {
  id: string;
  student_code: string;
  name: string;
  email: string;
  balance: number;
  weekly_spent: number;
  initial_balance: number;
  form_level: string | null;
  combination: string | null;
  is_jaffary: boolean;
  fingerprint_count: number;
}

function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classList, setClassList] = useState<string[]>([...FORM_LEVELS]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [topup, setTopup] = useState<{ id: string; name: string } | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [deduct, setDeduct] = useState<{ id: string; name: string } | null>(null);
  const [deductAmount, setDeductAmount] = useState("");
  const [enrolling, setEnrolling] = useState<Student | null>(null);
  const [enrollInput, setEnrollInput] = useState("");
  const [filterForm, setFilterForm] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", student_code: "", form_level: "", combination: "", is_jaffary: false });
  const [savingEdit, setSavingEdit] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    initial_balance: "0",
    form_level: "",
    form_level_other: "",
    combination: "",
    combination_other: "",
    is_jaffary: false,
  });

  const isOtherClass = form.form_level === "OTHER";
  const effectiveFormLevel = isOtherClass ? form.form_level_other.trim() : form.form_level;
  const showCombination = effectiveFormLevel === "Form 5" || effectiveFormLevel === "Form 6";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, student_code, name, email, balance, weekly_spent, initial_balance, form_level, combination, is_jaffary, student_credentials(id)")
      .order("form_level", { ascending: true })
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    setStudents(
      ((data ?? []) as any[]).map((s) => ({
        ...s,
        fingerprint_count: Array.isArray(s.student_credentials) ? s.student_credentials.length : 0,
      })) as Student[],
    );
    setLoading(false);
  };

  const loadClasses = async () => {
    const { data } = await supabase.from("classes" as any).select("name").order("name");
    const names = ((data as any) ?? []).map((r: any) => r.name as string);
    const merged = Array.from(new Set([...FORM_LEVELS, ...names]));
    setClassList(merged);
  };

  useEffect(() => { load(); loadClasses(); }, []);

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || !effectiveFormLevel)
      return toast.error("Name, email and class are required");

    const combo: string | undefined = showCombination
      ? (form.combination === "OTHER" ? form.combination_other.trim() : form.combination) || undefined
      : undefined;

    const autoCode = `S${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    const { error } = await supabase.rpc("register_student", {
      _student_code: autoCode,
      _name: form.name.trim(),
      _email: form.email.trim(),
      _initial_balance: Number(form.initial_balance) || 0,
      _form_level: effectiveFormLevel,
      _combination: combo,
      _is_jaffary: form.is_jaffary,
    });
    if (error) return toast.error(error.message);
    toast.success("Student registered — now enroll their fingerprint");
    setOpen(false);
    setForm({
      name: "", email: "", initial_balance: "0",
      form_level: "", form_level_other: "", combination: "", combination_other: "", is_jaffary: false,
    });
    load();
  };

  const addFunds = async () => {
    if (!topup) return;
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) return toast.error("Enter a positive amount");
    const { error } = await supabase.rpc("add_funds", {
      _student_id: topup.id,
      _amount: amt,
    });
    if (error) return toast.error(error.message);
    toast.success(`Added ${fmt(amt)} to ${topup.name}`);
    setTopup(null);
    setTopupAmount("");
    load();
  };

  const deductFunds = async () => {
    if (!deduct) return;
    const amt = Number(deductAmount);
    if (!amt || amt <= 0) return toast.error("Enter a positive amount");
    const { error } = await supabase.rpc("deduct_funds" as any, {
      _student_id: deduct.id,
      _amount: amt,
    } as any);
    if (error) return toast.error(error.message);
    toast.success(`Deducted ${fmt(amt)} from ${deduct.name}`);
    setDeduct(null);
    setDeductAmount("");
    load();
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setEditForm({
      name: s.name,
      email: s.email,
      student_code: s.student_code,
      form_level: s.form_level || "",
      combination: s.combination || "",
      is_jaffary: s.is_jaffary,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.name.trim()) return toast.error("Name is required");
    setSavingEdit(true);
    const { error } = await supabase
      .from("students")
      .update({
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        student_code: editForm.student_code.trim(),
        form_level: editForm.form_level.trim() || null,
        combination: editForm.combination.trim() || null,
        is_jaffary: editForm.is_jaffary,
      })
      .eq("id", editing.id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success("Student updated");
    setEditing(null);
    load();
  };

  const enroll = (s: Student) => {
    setEnrolling(s);
    setEnrollInput("");
  };

  const handleEnrollSubmit = async () => {
    if (!enrolling || !enrollInput.trim()) return;
    try {
      const { error } = await supabase.from("student_credentials").insert({
        student_id: enrolling.id,
        credential_id: enrollInput.trim(),
        public_key: "USB_SCANNER",
      });
      if (error) throw error;
      toast.success(`Fingerprint enrolled for ${enrolling.name}`);
      setEnrolling(null);
      setEnrollInput("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Enrollment failed");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_student" as any, {
      _student_id: confirmDelete.id,
    });
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(`${confirmDelete.name} removed`);
    setConfirmDelete(null);
    load();
  };

  const filtered = students.filter(
    (s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_code.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchForm = filterForm === "all" || s.form_level === filterForm;
      return matchSearch && matchForm;
    },
  );

  // Group by form
  const grouped = classList.reduce<Record<string, Student[]>>((acc, lvl) => {
    acc[lvl] = filtered.filter((s) => s.form_level === lvl);
    return acc;
  }, {});
  const unclassified = filtered.filter((s) => !s.form_level || !classList.includes(s.form_level as string));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} registered</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <ClearButton
          label="Clear all balances"
          title="Reset every student's balance to 0?"
          description="This sets balance, initial balance and weekly spent to 0 for every student in the database."
          onConfirm={async () => {
            const { error } = await supabase.rpc("clear_all_student_balances" as any);
            if (error) throw error;
            await load();
          }}
        />
        <ExcelImport
          label="Import students"
          templateHint="Any of: name, email, initial_balance, form_level, combination, student_code. Only name is required."
          onRows={async (rows) => {
            let success = 0, failed = 0;
            const errors: string[] = [];
            for (const r of rows) {
              const name = String(r.name || r.Name || r["Full Name"] || r.full_name || "").trim();
              if (!name) { failed++; errors.push("Skip: row missing name"); continue; }
              const email = String(r.email || r.Email || "").trim() || `${name.toLowerCase().replace(/\s+/g, ".")}.${Date.now().toString(36)}@placeholder.local`;
              const form_level = String(r.form_level || r["Form Level"] || r.class || r.Class || "").trim() || null;
              const code = String(r.student_code || r.code || r.Code || "").trim() ||
                `S${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
              const { error } = await supabase.rpc("register_student", {
                _student_code: code,
                _name: name,
                _email: email,
                _initial_balance: Number(r.initial_balance ?? r.balance ?? 0) || 0,
                _form_level: form_level as any,
                _combination: String(r.combination || r.Combination || "").trim() || undefined,
                _is_jaffary: false,
              });
              if (error) { failed++; errors.push(`${name}: ${error.message}`); }
              else success++;
            }
            await load();
            return { success, failed, errors };
          }}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus /> Register student</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New student</DialogTitle>
              <DialogDescription>
                After registering, click <strong>Enroll fingerprint</strong> on the student row.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={form.form_level} onValueChange={(v) => setForm({ ...form, form_level: v, combination: "", combination_other: "", form_level_other: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classList.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    <SelectItem value="OTHER">Other…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isOtherClass && (
                <div className="space-y-1.5">
                  <Label>Custom class name</Label>
                  <Input value={form.form_level_other} onChange={(e) => setForm({ ...form, form_level_other: e.target.value })} placeholder="e.g. Form 7" />
                </div>
              )}
              {showCombination && (
                <>
                  <div className="space-y-1.5">
                    <Label>Combination</Label>
                    <Select value={form.combination} onValueChange={(v) => setForm({ ...form, combination: v })}>
                      <SelectTrigger><SelectValue placeholder="Select combination" /></SelectTrigger>
                      <SelectContent>
                        {COMBINATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        <SelectItem value="OTHER">Other…</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.combination === "OTHER" && (
                    <div className="space-y-1.5">
                      <Label>Custom combination</Label>
                      <Input value={form.combination_other} onChange={(e) => setForm({ ...form, combination_other: e.target.value })} placeholder="e.g. HKL" />
                    </div>
                  )}
                </>
              )}
              <div className="space-y-1.5">
                <Label>Starting balance</Label>
                <Input type="number" min="0" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label className="cursor-pointer">Jaffary recipient</Label>
                  <p className="text-xs text-muted-foreground">Receives weekly 100/= transfers from under-limit students</p>
                </div>
                <Switch checked={form.is_jaffary} onCheckedChange={(v) => setForm({ ...form, is_jaffary: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={create}>Register</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, code, or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterForm} onValueChange={setFilterForm}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classList.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No students</CardContent></Card>
      ) : (
        <>
          {classList.map((lvl) =>
            grouped[lvl].length > 0 ? <ClassTable key={lvl} title={lvl} rows={grouped[lvl]} onEnroll={enroll} onTopup={(s) => setTopup({ id: s.id, name: s.name })} onDeduct={(s) => setDeduct({ id: s.id, name: s.name })} onDelete={(s) => setConfirmDelete(s)} onEdit={openEdit} enrolling={enrolling} /> : null,
          )}
          {unclassified.length > 0 && (
            <ClassTable title="Unassigned" rows={unclassified} onEnroll={enroll} onTopup={(s) => setTopup({ id: s.id, name: s.name })} onDeduct={(s) => setDeduct({ id: s.id, name: s.name })} onDelete={(s) => setConfirmDelete(s)} onEdit={openEdit} enrolling={enrolling} />
          )}
        </>
      )}

      <Dialog open={!!topup} onOpenChange={(o) => !o && setTopup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Top up — {topup?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" min="0" step="0.01" autoFocus value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopup(null)}>Cancel</Button>
            <Button variant="hero" onClick={addFunds}>Add funds</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deduct} onOpenChange={(o) => !o && setDeduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deduct money — {deduct?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Amount to deduct</Label>
            <Input type="number" min="0" step="0.01" autoFocus value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeduct(null)}>Cancel</Button>
            <Button variant="hero" onClick={deductFunds}>Deduct</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>Update any student details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Student code</Label>
              <Input value={editForm.student_code} onChange={(e) => setEditForm({ ...editForm, student_code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={editForm.form_level || "__none"} onValueChange={(v) => setEditForm({ ...editForm, form_level: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {classList.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Combination</Label>
              <Input value={editForm.combination} onChange={(e) => setEditForm({ ...editForm, combination: e.target.value })} placeholder="e.g. PCB" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label className="cursor-pointer">Jaffary recipient</Label>
              <Switch checked={editForm.is_jaffary} onCheckedChange={(v) => setEditForm({ ...editForm, is_jaffary: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancel</Button>
            <Button variant="hero" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!enrolling} onOpenChange={(o) => !o && setEnrolling(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enroll Fingerprint — {enrolling?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Please scan the fingerprint now</Label>
            <Input autoFocus value={enrollInput} onChange={(e) => setEnrollInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleEnrollSubmit(); }} placeholder="Waiting for scanner..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrolling(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleEnrollSubmit} disabled={!enrollInput}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the student, their fingerprints, transactions, contributions and weekly transfers. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClassTable({
  title,
  rows,
  onEnroll,
  onTopup,
  onDeduct,
  onDelete,
  onEdit,
  enrolling,
}: {
  title: string;
  rows: Student[];
  onEnroll: (s: Student) => void;
  onTopup: (s: Student) => void;
  onDeduct: (s: Student) => void;
  onDelete: (s: Student) => void;
  onEdit: (s: Student) => void;
  enrolling: Student | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-primary">{title}</span>
          <span className="text-xs font-normal text-muted-foreground">({rows.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Combination</th>
              <th className="text-right px-4 py-3">Balance</th>
              <th className="text-right px-4 py-3 hidden sm:table-cell">Weekly spent</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const lowPct = s.initial_balance > 0 ? Number(s.balance) / Number(s.initial_balance) : 1;
              return (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {s.name}
                      {s.is_jaffary && <Crown className="h-3.5 w-3.5 text-primary" aria-label="Jaffary recipient" />}
                    </div>
                    <div className={`text-[10px] uppercase tracking-wide flex items-center gap-1 mt-0.5 ${s.fingerprint_count > 0 ? "text-success" : "text-muted-foreground"}`}>
                      <Fingerprint className="h-3 w-3" />
                      {s.fingerprint_count > 0 ? `${s.fingerprint_count} fingerprint${s.fingerprint_count === 1 ? "" : "s"}` : "Not enrolled"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{s.combination || "—"}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(s.balance) === 0 ? "text-destructive" : lowPct <= 0.25 ? "text-warning" : ""}`}>
                    {fmt(s.balance)}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">{fmt(s.weekly_spent)} / 10,000</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" disabled={enrolling?.id === s.id} onClick={() => onEnroll(s)}>
                        <Fingerprint /> {enrolling?.id === s.id ? "Enrolling…" : "Enroll"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onTopup(s)}>
                        <Wallet /> Top up
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDeduct(s)} title="Deduct money">
                        <Minus /> Deduct
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEdit(s)} title="Edit student">
                        <Pencil /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(s)}
                        disabled={s.is_jaffary}
                        title={s.is_jaffary ? "Reassign Jaffary first" : "Remove student"}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
