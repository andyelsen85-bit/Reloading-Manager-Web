import { useState, useRef } from "react";
import { useListBullets, useCreateBullet, useUpdateBullet, useDeleteBullet, getListBulletsQueryKey } from "@workspace/api-client-react";
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
import { RefCombobox } from "@/components/RefCombobox";

type BulletForm = { manufacturer: string; model: string; weightGr: string; diameterIn: string; quantityAvailable: string; notes: string; photoBase64: string | null };
const empty: BulletForm = { manufacturer: "", model: "", weightGr: "", diameterIn: "", quantityAvailable: "", notes: "", photoBase64: null };

function PhotoCell({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleMouseEnter = (e: React.MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setHovered(true); };
  const handleMouseMove = (e: React.MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); };
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="fixed z-50 pointer-events-none" style={{ left: pos.x + 16, top: pos.y + 16 }}>
            <img src={src} alt={alt} className="max-w-[280px] max-h-[280px] object-contain rounded-lg border border-border shadow-2xl bg-background" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Bullets() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: bullets = [], isLoading } = useListBullets({ query: { queryKey: getListBulletsQueryKey() } });
  const createMutation = useCreateBullet();
  const updateMutation = useUpdateBullet();
  const deleteMutation = useDeleteBullet();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<(typeof bullets)[0] | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<BulletForm>(empty);

  const filtered = bullets.filter((b) =>
    b.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
    b.model.toLowerCase().includes(search.toLowerCase())
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBulletsQueryKey() });

  const handleAdd = async () => {
    if (!form.manufacturer || !form.model || !form.weightGr || !form.diameterIn || !form.quantityAvailable) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync({ data: { manufacturer: form.manufacturer, model: form.model, weightGr: Number(form.weightGr), diameterIn: Number(form.diameterIn), quantityAvailable: Number(form.quantityAvailable), notes: form.notes || undefined, photoBase64: form.photoBase64 ?? undefined } });
    invalidate(); setAddOpen(false); setForm(empty);
    toast({ title: "Bullet added" });
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, data: { manufacturer: form.manufacturer, model: form.model, weightGr: Number(form.weightGr), diameterIn: Number(form.diameterIn), quantityAvailable: Number(form.quantityAvailable), notes: form.notes || undefined, photoBase64: form.photoBase64 } });
    invalidate(); setEditItem(null); setForm(empty);
    toast({ title: "Bullet updated" });
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId });
    invalidate(); setDeleteId(null);
    toast({ title: "Deleted" });
  };

  const openEdit = (b: (typeof bullets)[0]) => {
    setEditItem(b);
    setForm({ manufacturer: b.manufacturer, model: b.model, weightGr: String(b.weightGr), diameterIn: String(b.diameterIn), quantityAvailable: String(b.quantityAvailable), notes: b.notes ?? "", photoBase64: b.photoBase64 ?? null });
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Bullet Inventory</h1>
          <p className="text-sm text-muted-foreground">{bullets.length} types</p>
        </div>
        <Button size="sm" onClick={() => { setForm(empty); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Bullet
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search bullets..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No bullets found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Photo","ID","Manufacturer","Model","Weight (gr)","Diameter (in)","Qty Available","Notes",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2">
                    <PhotoCell src={b.photoBase64} alt={b.model} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{b.id}</td>
                  <td className="px-3 py-2.5 text-foreground">{b.manufacturer}</td>
                  <td className="px-3 py-2.5 font-semibold">{b.model}</td>
                  <td className="px-3 py-2.5 font-mono">{b.weightGr}</td>
                  <td className="px-3 py-2.5 font-mono">{b.diameterIn}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono ${b.quantityAvailable < 100 ? "text-amber-400" : ""}`}>
                      {b.quantityAvailable < 100 && <AlertTriangle className="inline w-3 h-3 mr-1" />}
                      {b.quantityAvailable}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate">{b.notes}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
          <DialogHeader><DialogTitle>Add Bullet</DialogTitle></DialogHeader>
          <BulletFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bullet</DialogTitle></DialogHeader>
          <BulletFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete bullet?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BulletFormFields({ form, setForm }: { form: BulletForm; setForm: (f: BulletForm) => void }) {
  const set = (key: keyof BulletForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
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
          <Label>Manufacturer</Label>
          <RefCombobox category="bullet_manufacturer" value={form.manufacturer} onValueChange={(v) => setForm({ ...form, manufacturer: v })} />
        </div>
        <div className="space-y-1"><Label>Model</Label><Input value={form.model} onChange={set("model")} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label>Weight (gr)</Label><Input type="number" step="0.1" value={form.weightGr} onChange={set("weightGr")} /></div>
        <div className="space-y-1"><Label>Diameter (in)</Label><Input type="number" step="0.001" value={form.diameterIn} onChange={set("diameterIn")} /></div>
        <div className="space-y-1"><Label>Qty Available</Label><Input type="number" value={form.quantityAvailable} onChange={set("quantityAvailable")} /></div>
      </div>
      <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} /></div>
      <div className="space-y-1.5">
        <Label>Photo (optional)</Label>
        {form.photoBase64 ? (
          <div className="flex items-center gap-3">
            <img src={form.photoBase64} alt="Bullet" className="w-16 h-16 object-cover rounded border border-border" />
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
