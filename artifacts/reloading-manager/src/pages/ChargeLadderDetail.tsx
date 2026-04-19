import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetChargeLadder, useUpdateChargeLadder, useAddChargeLevel, useUpdateChargeLevel, useDeleteChargeLevel, useSelectBestChargeLevel,
  getGetChargeLadderQueryKey,
  useListCartridges, useListBullets, useListPrimers, useListPowders,
  getListCartridgesQueryKey, getListBulletsQueryKey, getListPrimersQueryKey, getListPowdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Star, Trash2, CheckCircle2, FlaskConical, Target, Wind, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ChargeLevel = {
  id: number; ladderId: number; chargeGr: number; cartridgeCount: number; powderId?: number | null;
  sortOrder: number; status: string; notes?: string | null; oalIn?: number | null; coalIn?: number | null;
  groupSizeMm?: number | null; velocityFps?: number | null; createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-blue-900/40 text-blue-300 border-blue-800" },
  built: { label: "Built", color: "bg-amber-900/40 text-amber-300 border-amber-800" },
  fired: { label: "Fired", color: "bg-orange-900/40 text-orange-300 border-orange-800" },
  completed: { label: "Results Recorded", color: "bg-green-900/40 text-green-300 border-green-800" },
};

export default function ChargeLadderDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const queryKey = getGetChargeLadderQueryKey(id);
  const { data, isLoading } = useGetChargeLadder(id, { query: { queryKey } });
  const { data: cartridges = [] } = useListCartridges({ query: { queryKey: getListCartridgesQueryKey() } });
  const { data: bullets = [] } = useListBullets({ query: { queryKey: getListBulletsQueryKey() } });
  const { data: primers = [] } = useListPrimers({ query: { queryKey: getListPrimersQueryKey() } });
  const { data: powders = [] } = useListPowders({ query: { queryKey: getListPowdersQueryKey() } });

  const updateLadder = useUpdateChargeLadder();
  const addLevel = useAddChargeLevel();
  const updateLevel = useUpdateChargeLevel();
  const deleteLevel = useDeleteChargeLevel();
  const selectBest = useSelectBestChargeLevel();

  const [addLevelOpen, setAddLevelOpen] = useState(false);
  const [editLevel, setEditLevel] = useState<ChargeLevel | null>(null);
  const [deleteLevelId, setDeleteLevelId] = useState<number | null>(null);
  const [selectBestOpen, setSelectBestOpen] = useState(false);

  const [newLevel, setNewLevel] = useState({ chargeGr: "", cartridgeCount: "3", powderId: "", notes: "" });
  const [editForm, setEditForm] = useState({ status: "", notes: "", oalIn: "", coalIn: "", groupSizeMm: "", velocityFps: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded" />)}</div>;
  if (!data) return <div className="text-muted-foreground">Ladder not found.</div>;

  const { ladder, levels } = data;
  const cartridge = cartridges.find((c) => c.id === ladder.cartridgeId);
  const bullet = ladder.bulletId ? bullets.find((b) => b.id === ladder.bulletId) : null;
  const primer = ladder.primerId ? primers.find((p) => p.id === ladder.primerId) : null;

  const handleAddLevel = async () => {
    if (!newLevel.chargeGr) return;
    await addLevel.mutateAsync({ id, data: { chargeGr: Number(newLevel.chargeGr), cartridgeCount: Number(newLevel.cartridgeCount) || 3, powderId: newLevel.powderId ? Number(newLevel.powderId) : undefined, sortOrder: levels.length, notes: newLevel.notes || undefined } });
    invalidate(); setAddLevelOpen(false); setNewLevel({ chargeGr: "", cartridgeCount: "3", powderId: "", notes: "" });
    toast({ title: "Level added" });
  };

  const openEditLevel = (level: ChargeLevel) => {
    setEditLevel(level);
    setEditForm({ status: level.status, notes: level.notes ?? "", oalIn: level.oalIn?.toString() ?? "", coalIn: level.coalIn?.toString() ?? "", groupSizeMm: level.groupSizeMm?.toString() ?? "", velocityFps: level.velocityFps?.toString() ?? "" });
  };

  const handleEditLevel = async () => {
    if (!editLevel) return;
    await updateLevel.mutateAsync({
      id, levelId: editLevel.id, data: {
        status: editForm.status || undefined,
        notes: editForm.notes || undefined,
        oalIn: editForm.oalIn ? Number(editForm.oalIn) : undefined,
        coalIn: editForm.coalIn ? Number(editForm.coalIn) : undefined,
        groupSizeMm: editForm.groupSizeMm ? Number(editForm.groupSizeMm) : undefined,
        velocityFps: editForm.velocityFps ? Number(editForm.velocityFps) : undefined,
      },
    });
    invalidate(); setEditLevel(null);
    toast({ title: "Level updated" });
  };

  const handleDeleteLevel = async () => {
    if (!deleteLevelId) return;
    await deleteLevel.mutateAsync({ id, levelId: deleteLevelId });
    invalidate(); setDeleteLevelId(null);
    toast({ title: "Level deleted" });
  };

  const handleSelectBest = async (levelId: number) => {
    await selectBest.mutateAsync({ id, data: { levelId } });
    invalidate(); setSelectBestOpen(false);
    toast({ title: "Best charge selected!", description: "Ladder marked as complete." });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/charge-ladders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            {ladder.name}
            {ladder.bestLevelId && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
          </h1>
          <p className="text-sm text-muted-foreground">{ladder.caliber}</p>
        </div>
        <Badge variant="outline" className={STATUS_LABELS[ladder.status]?.color ?? ""}>{STATUS_LABELS[ladder.status]?.label ?? ladder.status}</Badge>
      </div>

      {/* Session info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Cartridge", value: cartridge ? `${cartridge.manufacturer} ${cartridge.caliber}` : `ID ${ladder.cartridgeId}` },
          { label: "Bullet", value: bullet ? `${bullet.manufacturer} ${bullet.model} ${bullet.weightGr}gr` : "Not set" },
          { label: "Primer", value: primer ? `${primer.manufacturer} ${primer.type}` : "Not set" },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Charge levels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Charge Levels ({levels.length})</h2>
          <div className="flex gap-2">
            {levels.length >= 2 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-amber-400 border-amber-800 hover:bg-amber-900/20" onClick={() => setSelectBestOpen(true)}>
                <Star className="w-3.5 h-3.5" /> Select Best
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddLevelOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Level
            </Button>
          </div>
        </div>

        {levels.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No levels yet. Add charge levels to begin.</div>
        ) : (
          <div className="space-y-2">
            {levels.map((level, i) => {
              const isBest = level.id === ladder.bestLevelId;
              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    isBest ? "border-amber-600 bg-amber-950/20" : "border-border bg-card"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                        <span className="font-bold text-primary text-lg font-mono">{level.chargeGr}gr</span>
                        <span className="text-xs text-muted-foreground">· {level.cartridgeCount} rds</span>
                        {level.powderId && (() => { const p = powders.find((pw) => pw.id === level.powderId); return p ? <span className="text-xs text-muted-foreground">· {p.manufacturer} {p.name}</span> : null; })()}
                        {isBest && <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold"><Star className="w-3 h-3 fill-amber-400" /> BEST</span>}
                        <Badge variant="outline" className={`ml-auto ${STATUS_LABELS[level.status]?.color ?? ""}`}>{STATUS_LABELS[level.status]?.label ?? level.status}</Badge>
                      </div>
                      {(level.oalIn || level.coalIn || level.groupSizeMm || level.velocityFps) && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {level.oalIn && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> OAL: {level.oalIn}"</span>}
                          {level.coalIn && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> COAL: {level.coalIn}"</span>}
                          {level.groupSizeMm && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Group: {level.groupSizeMm}mm</span>}
                          {level.velocityFps && <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> Vel: {level.velocityFps}fps</span>}
                        </div>
                      )}
                      {level.notes && <p className="text-xs text-muted-foreground mt-1 italic">{level.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditLevel(level as ChargeLevel)}>Record Results</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteLevelId(level.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Level Dialog */}
      <Dialog open={addLevelOpen} onOpenChange={setAddLevelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Charge Level</DialogTitle><DialogDescription>Specify the powder, charge weight, and cartridge count for this level.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Powder (optional override)</Label>
              <Select value={newLevel.powderId} onValueChange={(v) => setNewLevel({ ...newLevel, powderId: v })}>
                <SelectTrigger><SelectValue placeholder="Use session powder or select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Inherit from session —</SelectItem>
                  {powders.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.manufacturer} {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <div className="space-y-1 flex-1"><Label>Powder Charge (gr) <span className="text-destructive">*</span></Label><Input type="number" step="0.1" placeholder="42.5" value={newLevel.chargeGr} onChange={(e) => setNewLevel({ ...newLevel, chargeGr: e.target.value })} /></div>
              <div className="space-y-1 w-24"><Label>Qty (rds)</Label><Input type="number" value={newLevel.cartridgeCount} onChange={(e) => setNewLevel({ ...newLevel, cartridgeCount: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes (optional)</Label><Input value={newLevel.notes} onChange={(e) => setNewLevel({ ...newLevel, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLevelOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLevel} disabled={addLevel.isPending}>Add Level</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Results Dialog */}
      <Dialog open={!!editLevel} onOpenChange={(o) => !o && setEditLevel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Results — {editLevel?.chargeGr}gr</DialogTitle><DialogDescription>Update status and enter shooting results for this charge level.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="built">Built (loaded)</SelectItem>
                  <SelectItem value="fired">Fired</SelectItem>
                  <SelectItem value="completed">Results Recorded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>OAL (in)</Label><Input type="number" step="0.001" value={editForm.oalIn} onChange={(e) => setEditForm({ ...editForm, oalIn: e.target.value })} /></div>
              <div className="space-y-1"><Label>COAL (in)</Label><Input type="number" step="0.001" value={editForm.coalIn} onChange={(e) => setEditForm({ ...editForm, coalIn: e.target.value })} /></div>
              <div className="space-y-1"><Label>Group Size (mm)</Label><Input type="number" step="0.1" value={editForm.groupSizeMm} onChange={(e) => setEditForm({ ...editForm, groupSizeMm: e.target.value })} /></div>
              <div className="space-y-1"><Label>Velocity (fps)</Label><Input type="number" value={editForm.velocityFps} onChange={(e) => setEditForm({ ...editForm, velocityFps: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLevel(null)}>Cancel</Button>
            <Button onClick={handleEditLevel} disabled={updateLevel.isPending}>Save Results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Best Dialog */}
      <Dialog open={selectBestOpen} onOpenChange={setSelectBestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select Best Performing Charge</DialogTitle><DialogDescription>Which charge level produced the best results? This will mark the ladder as complete.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => handleSelectBest(level.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded border text-left transition-colors hover:border-amber-600 hover:bg-amber-950/20",
                  level.id === ladder.bestLevelId ? "border-amber-600 bg-amber-950/20" : "border-border"
                )}
              >
                <Star className={cn("w-4 h-4", level.id === ladder.bestLevelId ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
                <div>
                  <p className="font-bold text-primary font-mono">{level.chargeGr}gr</p>
                  <p className="text-xs text-muted-foreground">
                    {[level.groupSizeMm && `${level.groupSizeMm}mm group`, level.velocityFps && `${level.velocityFps}fps`].filter(Boolean).join(" · ") || "No results recorded"}
                  </p>
                </div>
                {level.id === ladder.bestLevelId && <CheckCircle2 className="w-4 h-4 text-amber-400 ml-auto" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectBestOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete level confirmation */}
      <AlertDialog open={!!deleteLevelId} onOpenChange={(o) => !o && setDeleteLevelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this charge level?</AlertDialogTitle><AlertDialogDescription>All recorded results will be lost.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLevel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
