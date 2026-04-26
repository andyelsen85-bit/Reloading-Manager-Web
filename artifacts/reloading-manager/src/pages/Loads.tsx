import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListLoads, useCreateLoad, useDeleteLoad, getListLoadsQueryKey, useListCartridges, getListCartridgesQueryKey } from "@workspace/api-client-react";
import type { Load } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronRight, Package, Flame, Crosshair, ChevronDown } from "lucide-react";
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

type LoadRow = Load;

function getLoadCurrentStep(l: Load): string {
  if (l.fired) return "Fired";
  if (l.completed) return "Completed";
  const skipped: string[] = (() => { try { return l.skippedSteps ? JSON.parse(l.skippedSteps as string) : []; } catch { return []; } })();
  const done = (key: string) => skipped.includes(key) || (() => {
    switch (key) {
      case "washing": return l.washingMinutes != null && l.washingMinutes > 0;
      case "calibration": return !!l.calibrationType;
      case "trim": return l.l6In != null;
      case "annealing": return (l as any).annealingDone === true;
      case "second_washing": return l.secondWashingMinutes != null && l.secondWashingMinutes > 0;
      case "priming": return l.primerId != null;
      case "powder": return l.powderId != null;
      case "bullet_seating": return l.bulletId != null && l.coalIn != null && l.oalIn != null;
      default: return false;
    }
  })();
  const steps: { key: string; label: string }[] = [
    { key: "washing", label: "Washing" },
    { key: "calibration", label: "Calibration" },
    { key: "trim", label: "Trim" },
    { key: "annealing", label: "Annealing" },
    { key: "second_washing", label: "Second Washing" },
    { key: "priming", label: "Priming" },
    { key: "powder", label: "Powder" },
    { key: "bullet_seating", label: "Bullet Seating" },
  ];
  const first = steps.find((s) => !done(s.key));
  return first ? first.label : "Bullet Seating";
}

export default function Loads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: loads = [], isLoading } = useListLoads({ query: { queryKey: getListLoadsQueryKey() } });
  const { data: cartridges = [] } = useListCartridges({ query: { queryKey: getListCartridgesQueryKey() } });
  const createMutation = useCreateLoad();
  const deleteMutation = useDeleteLoad();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteLoad, setDeleteLoad] = useState<LoadRow | null>(null);
  const [restockOpts, setRestockOpts] = useState({ primers: false, powder: false, bullets: false, primerQty: 0, powderGr: 0, bulletQty: 0, note: "" });
  const [form, setForm] = useState({ cartridgeId: "", cartridgeQuantityUsed: "", notes: "" });
  const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const [showFiredFor, setShowFiredFor] = useState<Set<number>>(new Set());
  const [showDeletedFor, setShowDeletedFor] = useState<Set<number>>(new Set());

  const { data: deletedLoads = [] } = useQuery<Load[]>({
    queryKey: ["loads-with-deleted"],
    queryFn: () => fetch("/api/loads?includeDeleted=true", { credentials: "include" }).then(r => r.json()),
    enabled: showDeletedFor.size > 0,
    select: (data) => data.filter(l => l.deletedAt != null),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListLoadsQueryKey() });
    qc.invalidateQueries({ queryKey: getListCartridgesQueryKey() });
  };

  const formatBatchId = (loadNumber: number | null | undefined, cycle: number | null | undefined) => {
    const batch = loadNumber != null ? String(loadNumber).padStart(5, "0") : "00000";
    const cyc = cycle != null ? String(cycle).padStart(3, "0") : "001";
    return `#${batch}-${cyc}`;
  };

  const handleAdd = async () => {
    const e = new Set<string>();
    if (!form.cartridgeId) e.add("cartridgeId");
    if (!form.cartridgeQuantityUsed) e.add("cartridgeQuantityUsed");
    if (e.size > 0) { setFormErrors(e); return; }
    await createMutation.mutateAsync({ data: { cartridgeId: Number(form.cartridgeId), cartridgeQuantityUsed: Number(form.cartridgeQuantityUsed), notes: form.notes || undefined } });
    invalidate(); setAddOpen(false); setForm({ cartridgeId: "", cartridgeQuantityUsed: "", notes: "" }); setFormErrors(new Set());
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

  const toggleCollapse = (id: number) =>
    setCollapsedGroups((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleShowFired = (id: number) =>
    setShowFiredFor((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleShowDeleted = (id: number) =>
    setShowDeletedFor((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const grouped = cartridges
    .map((c) => ({ cartridge: c, loads: loads.filter((l) => l.cartridgeId === c.id) }))
    .filter((g) => g.loads.length > 0);

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Load Records</h1>
          <p className="text-sm text-muted-foreground">{loads.length} loads across {grouped.length} batches</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Load
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No loads yet. Create your first load to begin.</div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const isCollapsed = collapsedGroups.has(g.cartridge.id);
            const firedLoads = g.loads.filter((l) => l.fired);
            const nonFiredLoads = g.loads.filter((l) => !l.fired);
            const showFired = showFiredFor.has(g.cartridge.id);
            const visibleLoads = showFired ? g.loads : nonFiredLoads;
            const showDeleted = showDeletedFor.has(g.cartridge.id);
            const groupDeletedLoads = showDeleted ? deletedLoads.filter((l) => l.cartridgeId === g.cartridge.id) : [];
            const hasActive = nonFiredLoads.some((l) => !l.completed);
            return (
              <div key={g.cartridge.id} className="rounded-lg border border-border overflow-hidden">
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors",
                    isCollapsed ? "bg-muted/10" : "bg-muted/20 border-b border-border"
                  )}
                  onClick={() => toggleCollapse(g.cartridge.id)}
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <span className="font-semibold text-sm text-foreground">
                    {g.cartridge.caliber} — {g.cartridge.manufacturer}
                  </span>
                  <span className="text-xs text-muted-foreground">Batch #{g.cartridge.id}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {hasActive && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">
                        {nonFiredLoads.filter((l) => !l.completed).length} active
                      </span>
                    )}
                    {nonFiredLoads.filter((l) => l.completed).length > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-900/30 text-green-400">
                        {nonFiredLoads.filter((l) => l.completed).length} done
                      </span>
                    )}
                    {firedLoads.length > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-900/30 text-amber-400">
                        {firedLoads.length} fired
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{g.loads.length} total</span>
                  </div>
                </button>
                {!isCollapsed && (
                  <div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/10">
                          {["Load #","Qty","Cycle","Date","Step","Status",""].map((h) => (
                            <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLoads.map((l, i) => {
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
                              <td className="px-3 py-2.5 font-semibold font-mono">{formatBatchId(l.loadNumber, l.reloadingCycle)}</td>
                              <td className="px-3 py-2.5 font-mono">{l.cartridgeQuantityUsed}</td>
                              <td className="px-3 py-2.5 font-mono">{l.reloadingCycle}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{l.date}</td>
                              <td className="px-3 py-2.5"><StepBadge step={getLoadCurrentStep(l)} /></td>
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
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDelete(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                        {groupDeletedLoads.map((l, i) => (
                          <motion.tr
                            key={`del-${l.id}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border/50 bg-red-950/10 opacity-60"
                          >
                            <td className="px-3 py-2.5 font-semibold font-mono line-through text-muted-foreground">{formatBatchId(l.loadNumber, l.reloadingCycle)}</td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">{l.cartridgeQuantityUsed}</td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">{l.reloadingCycle}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{l.date}</td>
                            <td className="px-3 py-2.5">—</td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs font-medium text-red-400">Deleted</span>
                            </td>
                            <td className="px-3 py-2.5">
                              {l.deletedNote && <span className="text-xs text-muted-foreground italic">{l.deletedNote}</span>}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-2 border-t border-border/30 bg-muted/5 flex flex-wrap gap-x-4 gap-y-1">
                      {firedLoads.length > 0 && (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                          onClick={() => toggleShowFired(g.cartridge.id)}
                        >
                          {showFired ? "Hide fired loads" : `Show ${firedLoads.length} fired load${firedLoads.length > 1 ? "s" : ""}`}
                        </button>
                      )}
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                        onClick={() => toggleShowDeleted(g.cartridge.id)}
                      >
                        {showDeleted ? "Hide deleted loads" : "Show deleted loads"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Load Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setFormErrors(new Set()); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Load</DialogTitle><DialogDescription>Select a cartridge batch to begin the reloading workflow.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Cartridge Batch <span className="text-destructive">*</span></Label>
              <Select value={form.cartridgeId} onValueChange={(v) => { setForm({ ...form, cartridgeId: v }); if (formErrors.has("cartridgeId")) { const ne = new Set(formErrors); ne.delete("cartridgeId"); setFormErrors(ne); } }}>
                <SelectTrigger className={formErrors.has("cartridgeId") ? "border-destructive" : ""}><SelectValue placeholder="Select cartridge..." /></SelectTrigger>
                <SelectContent>
                  {cartridges.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      #{c.id} — {c.caliber} ({c.manufacturer}) | {c.quantityTotal - c.quantityLoaded} avail.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Quantity <span className="text-destructive">*</span></Label><Input type="number" value={form.cartridgeQuantityUsed} onChange={(e) => { setForm({ ...form, cartridgeQuantityUsed: e.target.value }); if (formErrors.has("cartridgeQuantityUsed")) { const ne = new Set(formErrors); ne.delete("cartridgeQuantityUsed"); setFormErrors(ne); } }} className={formErrors.has("cartridgeQuantityUsed") ? "border-destructive" : ""} /></div>
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
            <DialogTitle>Delete Load {formatBatchId(deleteLoad?.loadNumber, deleteLoad?.reloadingCycle)}</DialogTitle>
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
