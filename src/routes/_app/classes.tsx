import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/classes")({
  component: ClassesPage,
  head: () => ({ meta: [{ title: "Classes — E-Money" }] }),
});

interface ClassRow {
  id: string;
  name: string;
}

function ClassesPage() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("classes" as any)
      .select("id, name")
      .order("name");
    if (error) toast.error(error.message);
    setRows((data as any as ClassRow[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("classes" as any).insert({ name: name.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Class added");
    setName("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this class?")) return;
    const { error } = await supabase.from("classes" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
        <p className="text-sm text-muted-foreground">Add or remove classes available when registering students.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add class</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="e.g. Form 7"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={busy} variant="hero">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing classes ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes yet.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{c.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
