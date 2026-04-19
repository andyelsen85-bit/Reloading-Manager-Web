import { useState } from "react";
import { useListChargeLadders, useCreateChargeLadder, useDeleteChargeLadder, getListChargeLaddersQueryKey, useListCartridges, getListCartridgesQueryKey, useListBullets, getListBulletsQueryKey, useListPrimers, getListPrimersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronRight, FlaskConical, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-900/40 text-blue-300 border-blue-800",
  active: "bg-amber-900/40 text-amber-300 border-amber-800",
  fired: "bg-orange-900/40 text-orange-300 border-orange-800",
  complete: "bg-green-900/40 text-green-300 border-green-800",
};

export default function ChargeLadders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: ladders = [], isLoading } = useListChargeLadders({ query: { queryKey: getListChargeLaddersQueryKey() } });
  const { data: cartridges = [] } = useListCartridges({ query: { queryKey: getListCartridgesQueryKey() } });
  const { data: bullets = [] } = useListBullets({ query: { queryKey: getListBulletsQueryKey() } });
  const { data: primers = [] } = useListPrimers({ query: { queryKey: getListPrimersQueryKey() } });
  const createMutation = useCreateChargeLadder();
  const deleteMutation = useDeleteChargeLadder();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", cartridgeId: "", bulletId: "", primerId: "", cartridgesPerLevel: "3", notes: "" });
  const [levelRows, setLevelRows] = useState<{ chargeGr: string; cartridgeCount: string }[]>([{ chargeGr: "", cartridgeCount: "3" }, { chargeGr: "", cartridgeCount: "3" }, { chargeGr: "", cartridgeCount: "3" }]);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListChargeLaddersQueryKey() });

  const addLevelRow = () => setLevelRows([...levelRows, { chargeGr: "", cartridgeCount: form.cartridgesPerLevel }]);
  const removeLevelRow = (i: number) => setLevelRows(levelRows.filter((_, idx) => idx !== i));

  const handleAdd = async () => {
    if (!form.name || !form.cartridgeId) {
      toast({ title: "Name and cartridge are required", variant: "destructive" }); return;
    }
    const cart = cartridges.find((c) => c.id === Number(form.cartridgeId));
    const validLevels = levelRows.filter((r) => r.chargeGr !== "").map((r, i) => ({
      chargeGr: Number(r.chargeGr),
      cartridgeCount: Number(r.cartridgeCount) || Number(form.cartridgesPerLevel),
      sortOrder: i,
    }));

    await createMutation.mutateAsync({
      data: {
        name: form.name,
        caliber: cart?.caliber ?? "",
        cartridgeId: Number(form.cartridgeId),
        bulletId: form.bulletId ? Number(form.bulletId) : undefined,
        primerId: form.primerId ? Number(form.primerId) : undefined,
        cartridgesPerLevel: Number(form.cartridgesPerLevel),
        notes: form.notes || undefined,
        levels: validLevels,
      },
    });
    invalidate();
    setAddOpen(false);
    setForm({ name: "", cartridgeId: "", bulletId: "", primerId: "", cartridgesPerLevel: "3", notes: "" });
    setLevelRows([{ chargeGr: "", cartridgeCount: "3" }, { chargeGr: "", cartridgeCount: "3" }, { chargeGr: "", cartridgeCount: "3" }]);
    toast({ title: "Charge ladder created" });
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId });
    invalidate(); setDeleteId(null);
    toast({ title: "Deleted" });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" /> Load Development
          </h1>
          <p className="text-sm text-muted-foreground">Charge ladder planning — compare multiple powder charges in a single session</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Ladder
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>
      ) : ladders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No charge ladders yet.</p>
          <p className="text-xs mt-1">Create one to start load development sessions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ladders.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/charge-ladders/${l.id}`)}
            >
              <FlaskConical className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{l.name}</span>
                  {l.bestLevelId && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                </div>
                <p className="text-xs text-muted-foreground">{l.caliber} · {l.cartridgesPerLevel} cartridges/level</p>
              </div>
              <Badge variant="outline" className={STATUS_COLORS[l.status] ?? ""}>{l.status}</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/charge-ladders/${l.id}`); }}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(l.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Charge Ladder</DialogTitle>
            <DialogDescription>Plan multiple powder charges to test in a single session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Session Name</Label>
                <Input placeholder="e.g. 6.5 Creedmoor Berger 140gr Ladder" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Cartridge Batch</Label>
                <Select value={form.cartridgeId} onValueChange={(v) => { const c = cartridges.find((x) => x.id === Number(v)); setForm({ ...form, cartridgeId: v }); }}>
                  <SelectTrigger><SelectValue placeholder="Select batch..." /></SelectTrigger>
                  <SelectContent>
                    {cartridges.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>#{c.id} {c.caliber} — {c.manufacturer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cartridges per Level</Label>
                <Input type="number" min={1} value={form.cartridgesPerLevel} onChange={(e) => setForm({ ...form, cartridgesPerLevel: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Bullet (optional)</Label>
                <Select value={form.bulletId} onValueChange={(v) => setForm({ ...form, bulletId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select bullet..." /></SelectTrigger>
                  <SelectContent>
                    {bullets.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.manufacturer} {b.model} {b.weightGr}gr</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Primer (optional)</Label>
                <Select value={form.primerId} onValueChange={(v) => setForm({ ...form, primerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select primer..." /></SelectTrigger>
                  <SelectContent>
                    {primers.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.manufacturer} {p.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Charge Levels (powder charge per level)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLevelRow}>+ Add Level</Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {levelRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                    <div className="flex items-center gap-1">
                      <Input placeholder="Charge (gr)" type="number" step="0.1" className="w-28 h-8 text-sm" value={row.chargeGr} onChange={(e) => setLevelRows(levelRows.map((r, i) => i === idx ? { ...r, chargeGr: e.target.value } : r))} />
                      <span className="text-xs text-muted-foreground">gr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input placeholder="Qty" type="number" className="w-20 h-8 text-sm" value={row.cartridgeCount} onChange={(e) => setLevelRows(levelRows.map((r, i) => i === idx ? { ...r, cartridgeCount: e.target.value } : r))} />
                      <span className="text-xs text-muted-foreground">rds</span>
                    </div>
                    {levelRows.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => removeLevelRow(idx)}>×</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Create Ladder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete charge ladder?</AlertDialogTitle><AlertDialogDescription>All charge levels will be deleted. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
