import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/format";
import { ExcelImport } from "@/components/ExcelImport";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Products — BioPay" }] }),
});

interface Product { id: string; name: string; barcode: string; price: number; stock: number; }

function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", barcode: "", price: "", stock: "0" });

  const load = async () => {
    const { data, error } = await supabase
      .from("products").select("id, name, barcode, price, stock").order("name");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Product[]);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim() || !form.barcode.trim()) return toast.error("Name and barcode required");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Invalid price");
    const { error } = await supabase.from("products").insert({
      name: form.name.trim(), barcode: form.barcode.trim(), price, stock: Number(form.stock) || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Product added");
    setOpen(false);
    setForm({ name: "", barcode: "", price: "", stock: "0" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{items.length} items</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <ExcelImport
          label="Import products"
          templateHint="Columns: name, barcode, price, stock"
          onRows={async (rows) => {
            const records = rows
              .map((r) => ({
                name: String(r.name || r.Name || "").trim(),
                barcode: String(r.barcode || r.Barcode || "").trim(),
                price: Number(r.price ?? r.Price ?? 0) || 0,
                stock: Number(r.stock ?? r.Stock ?? 0) || 0,
              }))
              .filter((r) => r.name && r.barcode);
            if (!records.length) return { success: 0, failed: rows.length, errors: ["No valid rows"] };
            const { error } = await supabase.from("products").insert(records);
            await load();
            if (error) return { success: 0, failed: records.length, errors: [error.message] };
            return { success: records.length, failed: rows.length - records.length };
          }}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero"><Plus /> Add product</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Barcode</Label><Input autoFocus={false} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or type UPC/EAN" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Price</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Stock</Label><Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={create}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Catalog</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Barcode</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No products yet</td></tr>
              ) : items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.barcode}</td>
                  <td className="px-4 py-3 text-right">{fmt(p.price)}</td>
                  <td className="px-4 py-3 text-right">{p.stock}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
