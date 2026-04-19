import { useState } from "react";
import { useListLoads, useCreateLoad, useDeleteLoad, getListLoadsQueryKey, useListCartridges, getListCartridgesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronRight, Package, Flame, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import StepBadge from "@/components/StepBadge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type LoadRow = ReturnType<typeof useListLoads>["data"] extends Array<infer T> | undefined ? T : never;

export default function Loads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: loads = [], isLoading } = useListLoads({ query: { queryKey: getListLoadsQueryKey() } });
  const { data: cartridges = [] } = useListCartridges({ query: { queryKey: getListCartridgesQueryKey() } });
  const createMutation = useCreateLoad();
  const deleteMutation = useDeleteLoad();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteLoad, setDeleteLoad] = useState<LoadRow | null>(null);
  const [restockOpts, setRestockOpts] = useState({ primers: false, powder: false, bullets: false, primerQty: 0, powderGr: 0, bulletQty: 0, note: "" });
  const [form, setForm] = useState({ cartridgeId: "", cartridgeQuantityUsed: "", notes: "" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListLoadsQueryKey() });
    qc.invalidateQueries({ queryKey: getListCartridgesQueryKey() });
  };

  const formatLoadNum = (n: number | null | undefined) =>
    n == null ? "—" : "#" + String(n).padStart(5, "0");

  const handleAdd = async () => {
    if (!form.cartridgeId || !form.cartridgeQuantityUsed) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync({ data: { cartridgeId: Number(form.cartridgeId), cartridgeQuantityUsed: Number(form.cartridgeQuantityUsed), notes: form.notes || undefined } });
    invalidate(); setAddOpen(false); setForm({ cartridgeId: "", cartridgeQuantityUsed: "", notes: "" });
    toast({ title: "Load created" });
  };

  const openDelete = (l: LoadRow) => {
    setDeleteLoad(l);
    setRestockOpts({
      primers: false, powder: false, bullets: false,
      primerQty: l.primerQuantityUsed ?? l.cartridgeQuantityUsed,
      powderGr: l.powderTotalUsedGr ?? 0,
      bulletQty: l.bulletQuantityUsed ?? l.cartridgeQuantityUsed,
      note: "",
    });
  };

  const handleDelete = async () => {
    if (!deleteLoad) return;
    await deleteMutation.mutateAsync({
      id: deleteLoad.id,
      data: {
        restockPrimers: restockOpts.primers && deleteLoad.primerId ? restockOpts.primerQty : undefined,
        restockPowderGr: restockOpts.powder && deleteLoad.powderId ? restockOpts.powderGr : undefined,
        restockBullets: restockOpts.bullets && deleteLoad.bulletId ? restockOpts.bulletQty : undefined,
        note: restockOpts.note || undefined,
      },
    });
    invalidate(); setDeleteLoad(null);
    toast({ title: "Load deleted" });
  };

  const getCartridge = (id: number) => cartridges.find((c) => c.id === id);

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Load Records</h1>
          <p className="text-sm text-muted-foreground">{loads.length} loads total</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Load
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
      ) : loads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No loads yet. Create your first load to begin.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Inv#","Load #","Caliber","Qty","Cycle","Date","Step","Status",""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loads.map((l, i) => {
                const cart = getCartridge(l.cartridgeId);
                const rowClass = l.completed
                  ? "border-b border-border/50 bg-green-950/10 hover:bg-green-950/20 transition-colors"
                  : l.fired
                  ? "border-b border-border/50 bg-amber-950/10 hover:bg-amber-950/20 transition-colors"
                  : "border-b border-border/50 hover:bg-muted/20 transition-colors";
                return (
                  <motion.tr
                    key={l.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={rowClass}
                  >
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">#{l.id}</td>
                    <td className="px-3 py-2.5 font-semibold font-mono">{formatLoadNum(l.loadNumber)}</td>
                    <td className="px-3 py-2.5">{l.caliber}</td>
                    <td className="px-3 py-2.5 font-mono">{l.cartridgeQuantityUsed}</td>
                    <td className="px-3 py-2.5 font-mono">{l.reloadingCycle}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{l.date}</td>
                    <td className="px-3 py-2.5"><StepBadge step={cart?.currentStep ?? "New"} /></td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-xs font-medium", l.completed ? "text-green-400" : l.fired ? "text-amber-400" : "text-muted-foreground")}>
                        {l.completed ? "Completed" : l.fired ? "Fired" : "Active"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => navigate(`/loads/${l.id}`)}>
                          Workflow <ChevronRight className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDelete(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Load Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Load</DialogTitle><DialogDescription>Select a cartridge batch to begin the reloading workflow.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Cartridge Batch</Label>
              <Select value={form.cartridgeId} onValueChange={(v) => setForm({ ...form, cartridgeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select cartridge..." /></SelectTrigger>
                <SelectContent>
                  {cartridges.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      #{c.id} — {c.caliber} ({c.manufacturer}) | {c.quantityTotal - c.quantityLoaded} avail.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={form.cartridgeQuantityUsed} onChange={(e) => setForm({ ...form, cartridgeQuantityUsed: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notes (optional)</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Load number is assigned automatically. Cartridge quantity is adjusted immediately on creation.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Create Load</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete with Restock Dialog */}
      <Dialog open={!!deleteLoad} onOpenChange={(o) => !o && setDeleteLoad(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Load {formatLoadNum(deleteLoad?.loadNumber)}</DialogTitle>
            <DialogDescription>Would you like to restock any components back to inventory before deleting?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {deleteLoad?.primerId && (
              <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
                <Checkbox checked={restockOpts.primers} onCheckedChange={(c) => setRestockOpts({ ...restockOpts, primers: !!c })} />
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm flex-1">Restock Primers</span>
                {restockOpts.primers && (
                  <Input type="number" className="w-24 h-7 text-xs" value={restockOpts.primerQty} onChange={(e) => setRestockOpts({ ...restockOpts, primerQty: Number(e.target.value) })} />
                )}
              </div>
            )}
            {deleteLoad?.powderId && (
              <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
                <Checkbox checked={restockOpts.powder} onCheckedChange={(c) => setRestockOpts({ ...restockOpts, powder: !!c })} />
                <Flame className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm flex-1">Restock Powder</span>
                {restockOpts.powder && (
                  <div className="flex items-center gap-1">
                    <Input type="number" step="0.1" className="w-24 h-7 text-xs" value={restockOpts.powderGr} onChange={(e) => setRestockOpts({ ...restockOpts, powderGr: Number(e.target.value) })} />
                    <span className="text-xs text-muted-foreground">gr</span>
                  </div>
                )}
              </div>
            )}
            {deleteLoad?.bulletId && (
              <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
                <Checkbox checked={restockOpts.bullets} onCheckedChange={(c) => setRestockOpts({ ...restockOpts, bullets: !!c })} />
                <Crosshair className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm flex-1">Restock Bullets</span>
                {restockOpts.bullets && (
                  <Input type="number" className="w-24 h-7 text-xs" value={restockOpts.bulletQty} onChange={(e) => setRestockOpts({ ...restockOpts, bulletQty: Number(e.target.value) })} />
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Reason / Note (optional)</Label>
              <Input placeholder="e.g. Wrong primer used, restarting batch" value={restockOpts.note} onChange={(e) => setRestockOpts({ ...restockOpts, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLoad(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Delete Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
