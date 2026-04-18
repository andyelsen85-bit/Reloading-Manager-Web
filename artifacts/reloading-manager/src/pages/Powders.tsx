import { useState } from "react";
import { useListPowders, useCreatePowder, useUpdatePowder, useDeletePowder, getListPowdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type PowderForm = { manufacturer: string; name: string; type: string; grainsAvailable: string; notes: string };
const empty: PowderForm = { manufacturer: "", name: "", type: "", grainsAvailable: "", notes: "" };

export default function Powders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: powders = [], isLoading } = useListPowders({ query: { queryKey: getListPowdersQueryKey() } });
  const createMutation = useCreatePowder();
  const updateMutation = useUpdatePowder();
  const deleteMutation = useDeletePowder();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<(typeof powders)[0] | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<PowderForm>(empty);

  const filtered = powders.filter((p) =>
    p.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: getListPowdersQueryKey() });

  const handleAdd = async () => {
    if (!form.manufacturer || !form.name || !form.type || !form.grainsAvailable) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync({ data: { manufacturer: form.manufacturer, name: form.name, type: form.type, grainsAvailable: Number(form.grainsAvailable), notes: form.notes || undefined } });
    invalidate(); setAddOpen(false); setForm(empty);
    toast({ title: "Powder added" });
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, data: { manufacturer: form.manufacturer, name: form.name, type: form.type, grainsAvailable: Number(form.grainsAvailable), notes: form.notes || undefined } });
    invalidate(); setEditItem(null); setForm(empty);
    toast({ title: "Powder updated" });
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId });
    invalidate(); setDeleteId(null);
    toast({ title: "Deleted" });
  };

  const openEdit = (p: (typeof powders)[0]) => {
    setEditItem(p);
    setForm({ manufacturer: p.manufacturer, name: p.name, type: p.type, grainsAvailable: String(p.grainsAvailable), notes: p.notes ?? "" });
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Powder Inventory</h1>
          <p className="text-sm text-muted-foreground">{powders.length} types</p>
        </div>
        <Button size="sm" onClick={() => { setForm(empty); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Powder
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search powders..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No powders found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["ID","Manufacturer","Name","Type","Grains Available","Notes",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{p.id}</td>
                  <td className="px-3 py-2.5">{p.manufacturer}</td>
                  <td className="px-3 py-2.5 font-semibold">{p.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{p.type}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono ${p.grainsAvailable < 500 ? "text-amber-400" : ""}`}>
                      {p.grainsAvailable < 500 && <AlertTriangle className="inline w-3 h-3 mr-1" />}
                      {p.grainsAvailable.toFixed(1)} gr
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate">{p.notes}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Powder</DialogTitle></DialogHeader>
          <PowderFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Powder</DialogTitle></DialogHeader>
          <PowderFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete powder?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PowderFormFields({ form, setForm }: { form: PowderForm; setForm: (f: PowderForm) => void }) {
  const set = (key: keyof PowderForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  return (
    <div className="grid gap-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={set("manufacturer")} /></div>
        <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={set("name")} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Type</Label><Input value={form.type} onChange={set("type")} placeholder="e.g. Rifle, Pistol" /></div>
        <div className="space-y-1"><Label>Grains Available</Label><Input type="number" step="0.1" value={form.grainsAvailable} onChange={set("grainsAvailable")} /></div>
      </div>
      <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} /></div>
    </div>
  );
}
