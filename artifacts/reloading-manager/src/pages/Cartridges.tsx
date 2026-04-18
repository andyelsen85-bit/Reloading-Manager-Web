import { useState } from "react";
import { useListCartridges, useCreateCartridge, useUpdateCartridge, useDeleteCartridge, getListCartridgesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import StepBadge from "@/components/StepBadge";
import { useToast } from "@/hooks/use-toast";

const STEPS = ["New", "Fired", "Washing", "Calibration", "Trim", "Second Washing", "Priming", "Powder", "Bullet Seating", "Completed"];

type CartridgeForm = { manufacturer: string; caliber: string; productionCharge: string; quantityTotal: string; currentStep: string; l6In: string; notes: string };
const empty: CartridgeForm = { manufacturer: "", caliber: "", productionCharge: "", quantityTotal: "", currentStep: "New", l6In: "", notes: "" };

export default function Cartridges() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: cartridges = [], isLoading } = useListCartridges({ query: { queryKey: getListCartridgesQueryKey() } });
  const createMutation = useCreateCartridge();
  const updateMutation = useUpdateCartridge();
  const deleteMutation = useDeleteCartridge();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<(typeof cartridges)[0] | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<CartridgeForm>(empty);

  const filtered = cartridges.filter((c) =>
    c.caliber.toLowerCase().includes(search.toLowerCase()) ||
    c.manufacturer.toLowerCase().includes(search.toLowerCase())
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCartridgesQueryKey() });

  const handleAdd = async () => {
    if (!form.manufacturer || !form.caliber || !form.productionCharge || !form.quantityTotal) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync({ data: { manufacturer: form.manufacturer, caliber: form.caliber, productionCharge: form.productionCharge, quantityTotal: Number(form.quantityTotal), notes: form.notes || undefined } });
    invalidate(); setAddOpen(false); setForm(empty);
    toast({ title: "Cartridge batch added" });
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, data: { manufacturer: form.manufacturer, caliber: form.caliber, productionCharge: form.productionCharge, quantityTotal: Number(form.quantityTotal), currentStep: form.currentStep, l6In: form.l6In || undefined, notes: form.notes || undefined } });
    invalidate(); setEditItem(null); setForm(empty);
    toast({ title: "Cartridge updated" });
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId! });
    invalidate(); setDeleteId(null);
    toast({ title: "Deleted" });
  };

  const openEdit = (c: (typeof cartridges)[0]) => {
    setEditItem(c);
    setForm({ manufacturer: c.manufacturer, caliber: c.caliber, productionCharge: c.productionCharge, quantityTotal: String(c.quantityTotal), currentStep: c.currentStep, l6In: c.l6In ?? "", notes: c.notes ?? "" });
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Cartridge Inventory</h1>
          <p className="text-sm text-muted-foreground">{cartridges.length} batches</p>
        </div>
        <Button size="sm" onClick={() => { setForm(empty); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Batch
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by caliber or manufacturer..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No cartridge batches found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manufacturer</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caliber</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prod. Charge</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fired</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loaded/Total</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{c.id}</td>
                  <td className="px-3 py-2.5 text-foreground">{c.manufacturer}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{c.caliber}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.productionCharge}</td>
                  <td className="px-3 py-2.5"><StepBadge step={c.currentStep} /></td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.timesFired}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.quantityLoaded}/{c.quantityTotal}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate">{c.notes}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Cartridge Batch</DialogTitle></DialogHeader>
          <CartridgeFormFields form={form} setForm={setForm} showStep={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Cartridge Batch</DialogTitle></DialogHeader>
          <CartridgeFormFields form={form} setForm={setForm} showStep={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cartridge batch?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CartridgeFormFields({ form, setForm, showStep }: { form: CartridgeForm; setForm: (f: CartridgeForm) => void; showStep: boolean }) {
  const set = (key: keyof CartridgeForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  return (
    <div className="grid gap-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={set("manufacturer")} /></div>
        <div className="space-y-1"><Label>Caliber</Label><Input value={form.caliber} onChange={set("caliber")} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Production Charge</Label><Input value={form.productionCharge} onChange={set("productionCharge")} /></div>
        <div className="space-y-1"><Label>Total Quantity</Label><Input type="number" value={form.quantityTotal} onChange={set("quantityTotal")} /></div>
      </div>
      {showStep && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Current Step</Label>
            <Select value={form.currentStep} onValueChange={(v) => setForm({ ...form, currentStep: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["New","Fired","Washing","Calibration","Trim","Second Washing","Priming","Powder","Bullet Seating","Completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>L6 (in)</Label><Input value={form.l6In} onChange={set("l6In")} /></div>
        </div>
      )}
      <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} /></div>
    </div>
  );
}
