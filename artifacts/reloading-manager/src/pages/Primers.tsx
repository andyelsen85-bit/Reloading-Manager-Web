import { useState, useRef } from "react";
import { useListPrimers, useCreatePrimer, useUpdatePrimer, useDeletePrimer, getListPrimersQueryKey } from "@workspace/api-client-react";
import { RefCombobox } from "@/components/RefCombobox";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Search, AlertTriangle, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type PrimerForm = { manufacturer: string; type: string; quantityAvailable: string; notes: string; photoBase64: string | null };
const empty: PrimerForm = { manufacturer: "", type: "", quantityAvailable: "", notes: "", photoBase64: null };

function PhotoCell({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
    setHovered(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  };

  if (!src) {
    return (
      <div className="w-9 h-9 rounded border border-border bg-muted flex items-center justify-center">
        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)} onMouseMove={handleMouseMove}>
      <img src={src} alt={alt} className="w-9 h-9 object-cover rounded border border-border cursor-zoom-in" />
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{ left: pos.x + 16, top: pos.y + 16 }}
          >
            <img src={src} alt={alt} className="max-w-[280px] max-h-[280px] object-contain rounded-lg border border-border shadow-2xl bg-background" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Primers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: primers = [], isLoading } = useListPrimers({ query: { queryKey: getListPrimersQueryKey() } });
  const createMutation = useCreatePrimer();
  const updateMutation = useUpdatePrimer();
  const deleteMutation = useDeletePrimer();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<(typeof primers)[0] | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<PrimerForm>(empty);
  const [formErrors, setFormErrors] = useState<Set<string>>(new Set());

  const filtered = primers.filter((p) =>
    p.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
    p.type.toLowerCase().includes(search.toLowerCase())
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: getListPrimersQueryKey() });

  const validate = () => {
    const e = new Set<string>();
    if (!form.manufacturer) e.add("manufacturer");
    if (!form.type) e.add("type");
    if (!form.quantityAvailable) e.add("quantityAvailable");
    setFormErrors(e);
    return e.size === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    await createMutation.mutateAsync({ data: { manufacturer: form.manufacturer, type: form.type, quantityAvailable: Number(form.quantityAvailable), notes: form.notes || undefined, photoBase64: form.photoBase64 ?? undefined } });
    invalidate(); setAddOpen(false); setForm(empty); setFormErrors(new Set());
    toast({ title: "Primer added" });
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!validate()) return;
    await updateMutation.mutateAsync({ id: editItem.id, data: { manufacturer: form.manufacturer, type: form.type, quantityAvailable: Number(form.quantityAvailable), notes: form.notes || undefined, photoBase64: form.photoBase64 } });
    invalidate(); setEditItem(null); setForm(empty); setFormErrors(new Set());
    toast({ title: "Primer updated" });
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId });
    invalidate(); setDeleteId(null);
    toast({ title: "Deleted" });
  };

  const openEdit = (p: (typeof primers)[0]) => {
    setEditItem(p);
    setForm({ manufacturer: p.manufacturer, type: p.type, quantityAvailable: String(p.quantityAvailable), notes: p.notes ?? "", photoBase64: p.photoBase64 ?? null });
    setFormErrors(new Set());
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Primer Inventory</h1>
          <p className="text-sm text-muted-foreground">{primers.length} types</p>
        </div>
        <Button size="sm" onClick={() => { setForm(empty); setFormErrors(new Set()); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Primer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search primers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No primers found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Photo","ID","Manufacturer","Type","Qty Available","Notes",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2">
                    <PhotoCell src={p.photoBase64} alt={p.type} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{p.id}</td>
                  <td className="px-3 py-2.5">{p.manufacturer}</td>
                  <td className="px-3 py-2.5 font-semibold">{p.type}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono ${p.quantityAvailable < 100 ? "text-amber-400" : ""}`}>
                      {p.quantityAvailable < 100 && <AlertTriangle className="inline w-3 h-3 mr-1" />}
                      {p.quantityAvailable}
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

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setFormErrors(new Set()); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Primer</DialogTitle></DialogHeader>
          <PrimerFormFields form={form} setForm={setForm} errors={formErrors} setErrors={setFormErrors} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setFormErrors(new Set()); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Primer</DialogTitle></DialogHeader>
          <PrimerFormFields form={form} setForm={setForm} errors={formErrors} setErrors={setFormErrors} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditItem(null); setFormErrors(new Set()); }}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete primer?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PrimerFormFields({ form, setForm, errors, setErrors }: { form: PrimerForm; setForm: (f: PrimerForm) => void; errors: Set<string>; setErrors: (e: Set<string>) => void }) {
  const set = (key: keyof PrimerForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors.has(key)) { const ne = new Set(errors); ne.delete(key); setErrors(ne); }
  };
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, photoBase64: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Manufacturer <span className="text-destructive">*</span></Label>
          <div className={errors.has("manufacturer") ? "ring-1 ring-destructive rounded-md" : ""}>
            <RefCombobox category="primer_manufacturer" value={form.manufacturer} onValueChange={(v) => { setForm({ ...form, manufacturer: v }); if (errors.has("manufacturer")) { const ne = new Set(errors); ne.delete("manufacturer"); setErrors(ne); } }} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Type <span className="text-destructive">*</span></Label>
          <div className={errors.has("type") ? "ring-1 ring-destructive rounded-md" : ""}>
            <RefCombobox category="primer_type" value={form.type} onValueChange={(v) => { setForm({ ...form, type: v }); if (errors.has("type")) { const ne = new Set(errors); ne.delete("type"); setErrors(ne); } }} placeholder="e.g. Small Rifle, Large Pistol" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Qty Available <span className="text-destructive">*</span></Label><Input type="number" value={form.quantityAvailable} onChange={set("quantityAvailable")} className={errors.has("quantityAvailable") ? "border-destructive" : ""} /></div>
        <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Photo (optional)</Label>
        {form.photoBase64 ? (
          <div className="flex items-center gap-3">
            <img src={form.photoBase64} alt="Primer" className="w-16 h-16 object-cover rounded border border-border" />
            <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setForm({ ...form, photoBase64: null })}>
              <X className="w-3.5 h-3.5" /> Remove
            </Button>
          </div>
        ) : (
          <div
            className="border border-dashed border-border rounded p-3 flex items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => photoRef.current?.click()}
          >
            <Camera className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upload photo</span>
          </div>
        )}
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>
    </div>
  );
}
