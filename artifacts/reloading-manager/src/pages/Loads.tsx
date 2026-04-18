import { useState } from "react";
import { useListLoads, useCreateLoad, useDeleteLoad, getListLoadsQueryKey, useListCartridges, getListCartridgesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import StepBadge from "@/components/StepBadge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Loads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: loads = [], isLoading } = useListLoads({ query: { queryKey: getListLoadsQueryKey() } });
  const { data: cartridges = [] } = useListCartridges({ query: { queryKey: getListCartridgesQueryKey() } });
  const createMutation = useCreateLoad();
  const deleteMutation = useDeleteLoad();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ cartridgeId: "", userLoadId: "", cartridgeQuantityUsed: "", notes: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListLoadsQueryKey() });

  const handleAdd = async () => {
    if (!form.cartridgeId || !form.userLoadId || !form.cartridgeQuantityUsed) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync({ data: { cartridgeId: Number(form.cartridgeId), userLoadId: form.userLoadId, cartridgeQuantityUsed: Number(form.cartridgeQuantityUsed), notes: form.notes || undefined } });
    invalidate(); setAddOpen(false); setForm({ cartridgeId: "", userLoadId: "", cartridgeQuantityUsed: "", notes: "" });
    toast({ title: "Load created" });
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId });
    invalidate(); setDeleteId(null);
    toast({ title: "Deleted" });
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
                {["Inv#","Load ID","Caliber","Qty","Cycle","Date","Step","Status",""].map((h) => (
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
                    <td className="px-3 py-2.5 font-semibold">{l.userLoadId}</td>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Load</DialogTitle></DialogHeader>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>User Load ID</Label><Input value={form.userLoadId} onChange={(e) => setForm({ ...form, userLoadId: e.target.value })} placeholder="e.g. 308-A1" /></div>
              <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={form.cartridgeQuantityUsed} onChange={(e) => setForm({ ...form, cartridgeQuantityUsed: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Create Load</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete load?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
