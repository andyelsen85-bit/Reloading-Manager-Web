import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Camera, X, Crosshair, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefCombobox } from "@/components/RefCombobox";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

type AmmoItem = {
  id: number;
  manufacturer: string;
  caliber: string;
  model: string;
  bulletWeightGr: number | null;
  countTotal: number;
  countFired: number;
  notes: string | null;
  photoBase64: string | null;
  createdAt: string;
};

type AmmoForm = {
  manufacturer: string;
  caliber: string;
  model: string;
  bulletWeightGr: string;
  countTotal: string;
  notes: string;
  photoBase64: string | null;
};

const emptyForm: AmmoForm = {
  manufacturer: "", caliber: "", model: "", bulletWeightGr: "", countTotal: "", notes: "", photoBase64: null,
};

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

const QUERY_KEY = ["ammo-inventory"];

export default function BuyIn() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery<AmmoItem[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch("/ammo-inventory"),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => apiFetch("/ammo-inventory", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Ammo batch added" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => apiFetch(`/ammo-inventory/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const fireMutation = useMutation({
    mutationFn: ({ id, count }: { id: number; count: number }) => apiFetch(`/ammo-inventory/${id}/fire`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Fired rounds recorded" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/ammo-inventory/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Deleted" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<AmmoItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [fireItem, setFireItem] = useState<AmmoItem | null>(null);
  const [fireCount, setFireCount] = useState("");
  const [form, setForm] = useState<AmmoForm>(emptyForm);

  const filtered = items.filter((a) =>
    a.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
    a.caliber.toLowerCase().includes(search.toLowerCase()) ||
    a.model.toLowerCase().includes(search.toLowerCase())
  );

  const totalRemaining = items.reduce((sum, a) => sum + (a.countTotal - a.countFired), 0);

  const handleAdd = async () => {
    if (!form.manufacturer || !form.caliber || !form.model || !form.countTotal) {
      toast({ title: "Manufacturer, caliber, model and count are required", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync({
      manufacturer: form.manufacturer,
      caliber: form.caliber,
      model: form.model,
      bulletWeightGr: form.bulletWeightGr ? Number(form.bulletWeightGr) : null,
      countTotal: Number(form.countTotal),
      notes: form.notes || null,
      photoBase64: form.photoBase64,
    });
    setAddOpen(false); setForm(emptyForm);
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({
      id: editItem.id,
      data: {
        manufacturer: form.manufacturer,
        caliber: form.caliber,
        model: form.model,
        bulletWeightGr: form.bulletWeightGr ? Number(form.bulletWeightGr) : null,
        countTotal: Number(form.countTotal),
        notes: form.notes || null,
        photoBase64: form.photoBase64,
      },
    });
    setEditItem(null); setForm(emptyForm);
  };

  const handleFire = async () => {
    if (!fireItem || !fireCount) return;
    const count = parseInt(fireCount, 10);
    if (isNaN(count) || count < 1) { toast({ title: "Enter a valid count", variant: "destructive" }); return; }
    await fireMutation.mutateAsync({ id: fireItem.id, count });
    setFireItem(null); setFireCount("");
  };

  const openEdit = (a: AmmoItem) => {
    setEditItem(a);
    setForm({
      manufacturer: a.manufacturer,
      caliber: a.caliber,
      model: a.model,
      bulletWeightGr: a.bulletWeightGr != null ? String(a.bulletWeightGr) : "",
      countTotal: String(a.countTotal),
      notes: a.notes ?? "",
      photoBase64: a.photoBase64,
    });
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Buy-In Ammunition</h1>
          <p className="text-sm text-muted-foreground">{items.length} batches · {totalRemaining} rounds remaining</p>
        </div>
        <Button size="sm" onClick={() => { setForm(emptyForm); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Batch
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by caliber, manufacturer or model..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No ammunition batches found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Photo", "Caliber", "Manufacturer", "Model", "Wt (gr)", "Remaining", "Total / Fired", "Notes", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const remaining = a.countTotal - a.countFired;
                const pct = a.countTotal > 0 ? Math.round((remaining / a.countTotal) * 100) : 0;
                return (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-2">
                      {a.photoBase64 ? (
                        <img src={a.photoBase64} alt={a.model} className="w-9 h-9 object-cover rounded border border-border" />
                      ) : (
                        <div className="w-9 h-9 rounded border border-border bg-muted flex items-center justify-center">
                          <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{a.caliber}</td>
                    <td className="px-3 py-2.5">{a.manufacturer}</td>
                    <td className="px-3 py-2.5">{a.model}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{a.bulletWeightGr ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-semibold ${remaining === 0 ? "text-red-400" : remaining < a.countTotal * 0.2 ? "text-amber-400" : "text-green-400"}`}>
                          {remaining}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${remaining === 0 ? "bg-red-500" : remaining < a.countTotal * 0.2 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{a.countTotal} / {a.countFired}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[100px] truncate">{a.notes}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => { setFireItem(a); setFireCount(""); }} disabled={remaining === 0}>
                          <Target className="w-3 h-3" /> Fire
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Ammunition Batch</DialogTitle><DialogDescription>Record a new batch of factory ammunition.</DialogDescription></DialogHeader>
          <AmmoFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Batch</DialogTitle></DialogHeader>
          <AmmoFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fire dialog */}
      <Dialog open={!!fireItem} onOpenChange={(o) => !o && setFireItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-amber-400" /> Record Fired Rounds</DialogTitle>
            <DialogDescription>
              {fireItem && `${fireItem.caliber} · ${fireItem.manufacturer} ${fireItem.model} — ${fireItem.countTotal - fireItem.countFired} remaining`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>How many rounds did you fire?</Label>
              <Input
                type="number"
                min={1}
                max={fireItem ? fireItem.countTotal - fireItem.countFired : undefined}
                value={fireCount}
                onChange={(e) => setFireCount(e.target.value)}
                placeholder="e.g. 50"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleFire()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFireItem(null)}>Cancel</Button>
            <Button onClick={handleFire} disabled={fireMutation.isPending} className="bg-amber-600 hover:bg-amber-500 text-white">
              <Target className="w-4 h-4 mr-1.5" /> Record Fired
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete batch?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AmmoFormFields({ form, setForm }: { form: AmmoForm; setForm: (f: AmmoForm) => void }) {
  const set = (key: keyof AmmoForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
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
      <div className="space-y-1">
        <Label>Caliber</Label>
        <RefCombobox category="caliber" value={form.caliber} onValueChange={(v) => setForm({ ...form, caliber: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Manufacturer</Label>
          <Input value={form.manufacturer} onChange={set("manufacturer")} placeholder="e.g. Federal" />
        </div>
        <div className="space-y-1">
          <Label>Model</Label>
          <Input value={form.model} onChange={set("model")} placeholder="e.g. Gold Medal Match" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Bullet Weight (gr)</Label>
          <Input type="number" step="0.1" value={form.bulletWeightGr} onChange={set("bulletWeightGr")} placeholder="e.g. 175" />
        </div>
        <div className="space-y-1">
          <Label>Count (total rounds)</Label>
          <Input type="number" min={0} value={form.countTotal} onChange={set("countTotal")} placeholder="e.g. 200" />
        </div>
      </div>
      <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} placeholder="Optional" /></div>
      <div className="space-y-1.5">
        <Label>Photo (optional)</Label>
        {form.photoBase64 ? (
          <div className="flex items-center gap-3">
            <img src={form.photoBase64} alt="Ammo" className="w-16 h-16 object-cover rounded border border-border" />
            <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setForm({ ...form, photoBase64: null })}>
              <X className="w-3.5 h-3.5" /> Remove
            </Button>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded p-3 flex items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => photoRef.current?.click()}>
            <Camera className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upload photo</span>
          </div>
        )}
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>
    </div>
  );
}
