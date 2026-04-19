import { useRoute, useLocation } from "wouter";
import { useGetLoad, getGetLoadQueryKey, useUpdateLoad, useCompleteLoad, useFireLoad, useListPrimers, useListPowders, useListBullets, useListCartridges, getListLoadsQueryKey, getGetDashboardOverviewQueryKey, getListCartridgesQueryKey, useGetChargeLadder, getGetChargeLadderQueryKey, useCreateChargeLadder, useAddChargeLevel, useUpdateChargeLevel, useDeleteChargeLevel, useSelectBestChargeLevel } from "@workspace/api-client-react";
import type { Load } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { CheckCircle2, Circle, ChevronLeft, Loader2, SkipForward, Printer, Camera, X, Layers, Plus, Trash2, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DateInput } from "@/components/DateInput";
import { toEUDate, todayISO } from "@/lib/dateUtils";

const WORKFLOW_STEPS = [
  { key: "washing", label: "Washing", num: 1 },
  { key: "calibration", label: "Calibration", num: 2 },
  { key: "trim", label: "Trim", num: 3 },
  { key: "annealing", label: "Annealing", num: 4 },
  { key: "second_washing", label: "2nd Washing", num: 5 },
  { key: "priming", label: "Priming", num: 6 },
  { key: "powder", label: "Powder", num: 7 },
  { key: "bullet_seating", label: "Bullet Seating", num: 8 },
];

function getSkippedSteps(load: Load): string[] {
  try {
    return load.skippedSteps ? JSON.parse(load.skippedSteps as string) : [];
  } catch {
    return [];
  }
}

function isStepSkipped(load: Load, step: string): boolean {
  return getSkippedSteps(load).includes(step);
}

function isStepDone(load: Load | undefined, step: string): boolean {
  if (!load) return false;
  if (isStepSkipped(load, step)) return true;
  switch (step) {
    case "washing": return load.washingMinutes != null && load.washingMinutes > 0;
    case "calibration": return !!load.calibrationType;
    case "trim": return load.l6In != null;
    case "annealing": return load.annealingDone === true;
    case "second_washing": return load.secondWashingMinutes != null && load.secondWashingMinutes > 0;
    case "priming": return load.primerId != null;
    case "powder": return load.powderId != null || (load.chargeLadderId != null && load.powderDate != null);
    case "bullet_seating": return load.bulletId != null && load.coalIn != null && load.oalIn != null;
    case "complete": return load.completed;
    default: return false;
  }
}

function formatLoadNum(n: number | null | undefined) {
  if (n == null) return "—";
  return "#" + String(n).padStart(5, "0");
}

export default function LoadDetail() {
  const [, params] = useRoute("/loads/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = Number(params?.id);

  const { data: load, isLoading } = useGetLoad(id, { query: { queryKey: getGetLoadQueryKey(id), enabled: !isNaN(id) } });
  const { data: primers = [] } = useListPrimers({});
  const { data: powders = [] } = useListPowders({});
  const { data: bullets = [] } = useListBullets({});
  const { data: cartridges = [] } = useListCartridges({});

  const updateMutation = useUpdateLoad();
  const completeMutation = useCompleteLoad();
  const fireMutation = useFireLoad();

  const [activeStep, setActiveStep] = useState<string | null>(null);

  const [washingMinutes, setWashingMinutes] = useState("");
  const [washingDate, setWashingDate] = useState("");
  const [calibrationType, setCalibrationType] = useState("");
  const [calibrationDate, setCalibrationDate] = useState("");
  const [l6In, setL6In] = useState("");
  const [trimDate, setTrimDate] = useState("");
  const [_annealingMinutes, _setAnnealingMinutes] = useState("");
  const [annealingDate, setAnnealingDate] = useState("");
  const [secondWashingMinutes, setSecondWashingMinutes] = useState("");
  const [secondWashingDate, setSecondWashingDate] = useState("");
  const [primerId, setPrimerId] = useState("");
  const [primingDate, setPrimingDate] = useState("");
  const [powderId, setPowderId] = useState("");
  const [powderChargeGr, setPowderChargeGr] = useState("");
  const [powderDate, setPowderDate] = useState("");
  const [bulletId, setBulletId] = useState("");
  const [coalIn, setCoalIn] = useState("");
  const [oalIn, setOalIn] = useState("");
  const [bulletSeatingDate, setBulletSeatingDate] = useState("");

  const [fireDialogOpen, setFireDialogOpen] = useState(false);
  const [h2oWeightGr, setH2oWeightGr] = useState("");
  const [firedDate, setFiredDate] = useState(() => todayISO());
  const [selectedBestLevelId, setSelectedBestLevelId] = useState("");
  const [startingNewCycle, setStartingNewCycle] = useState(false);

  const [ladderMode, setLadderMode] = useState(false);
  const [ladderCartCount, setLadderCartCount] = useState("5");

  const createLadderMutation = useCreateChargeLadder();
  const addLevelMutation = useAddChargeLevel();
  const updateLevelMutation = useUpdateChargeLevel();
  const deleteLevelMutation = useDeleteChargeLevel();
  const selectBestMutation = useSelectBestChargeLevel();

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const ladderId = load?.chargeLadderId ?? 0;
  const { data: ladderDetail } = useGetChargeLadder(ladderId, {
    query: { enabled: !!ladderId, queryKey: getGetChargeLadderQueryKey(ladderId) },
  });

  const photoRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-16 rounded" /><Skeleton className="h-64 rounded" /></div>;
  }
  if (!load) return <div className="text-center py-16 text-muted-foreground">Load not found.</div>;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetLoadQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListLoadsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
    qc.invalidateQueries({ queryKey: getListCartridgesQueryKey() });
    if (load?.chargeLadderId) qc.invalidateQueries({ queryKey: getGetChargeLadderQueryKey(load.chargeLadderId) });
  };

  const effectiveLadderMode = !!load.chargeLadderId || ladderMode;

  const handleInitLadder = async () => {
    const rds = Number(ladderCartCount) || 5;
    const defaultLevels = Array.from({ length: 5 }, (_, i) => ({
      chargeGr: 0,
      cartridgeCount: rds,
      sortOrder: i,
    }));
    const ladder = await createLadderMutation.mutateAsync({
      data: {
        name: `Load #${load.id} Charge Ladder`,
        caliber: load.caliber,
        cartridgeId: load.cartridgeId,
        bulletId: load.bulletId ?? undefined,
        primerId: load.primerId ?? undefined,
        cartridgesPerLevel: rds,
        levels: defaultLevels,
      },
    });
    await updateMutation.mutateAsync({ id, data: { chargeLadderId: ladder.id } });
    invalidate();
    toast({ title: "Charge ladder initialized with 5 levels" });
  };

  const handleAddLevel = async () => {
    if (!load.chargeLadderId) return;
    const currentCount = ladderDetail?.levels?.length ?? 0;
    await addLevelMutation.mutateAsync({
      id: load.chargeLadderId,
      data: { chargeGr: 0, cartridgeCount: Number(ladderCartCount) || 5, sortOrder: currentCount },
    });
    qc.invalidateQueries({ queryKey: getGetChargeLadderQueryKey(load.chargeLadderId) });
    toast({ title: "Level added" });
  };

  const handleUpdateLevel = async (levelId: number, chargeGr: number, cartridgeCount: number, powderId?: number | null) => {
    if (!load.chargeLadderId) return;
    const data: Record<string, unknown> = { chargeGr, cartridgeCount };
    if (powderId !== undefined) data.powderId = powderId;
    await updateLevelMutation.mutateAsync({
      id: load.chargeLadderId,
      levelId,
      data: data as any,
    });
    qc.invalidateQueries({ queryKey: getGetChargeLadderQueryKey(load.chargeLadderId) });
  };

  const handleDeleteLevel = async (levelId: number) => {
    if (!load.chargeLadderId) return;
    await deleteLevelMutation.mutateAsync({ id: load.chargeLadderId, levelId });
    qc.invalidateQueries({ queryKey: getGetChargeLadderQueryKey(load.chargeLadderId) });
    toast({ title: "Level removed" });
  };

  const cart = cartridges.find((c) => c.id === load.cartridgeId);

  const handleSkipStep = async (step: string) => {
    const skipped = getSkippedSteps(load);
    if (!skipped.includes(step)) skipped.push(step);
    await updateMutation.mutateAsync({ id, data: { skippedSteps: JSON.stringify(skipped) } });
    invalidate();
    setActiveStep(null);
    toast({ title: "Step skipped" });
  };

  const handleUnskipStep = async (step: string) => {
    const skipped = getSkippedSteps(load).filter((s) => s !== step);
    await updateMutation.mutateAsync({ id, data: { skippedSteps: JSON.stringify(skipped) } });
    invalidate();
    toast({ title: "Step unskipped" });
  };

  const handleUndoStep = async (step: string) => {
    const undoData: Record<string, unknown> = {};
    switch (step) {
      case "washing": undoData.washingMinutes = null; break;
      case "calibration": undoData.calibrationType = null; break;
      case "trim": undoData.l6In = null; break;
      case "annealing": undoData.annealingDone = false; break;
      case "second_washing": undoData.secondWashingMinutes = null; break;
      case "priming": undoData.primerId = null; undoData.primerQuantityUsed = null; break;
      case "powder":
        if (load.chargeLadderId != null) {
          undoData.chargeLadderId = null; undoData.powderDate = null;
        } else {
          undoData.powderId = null; undoData.powderChargeGr = null; undoData.powderDate = null;
        }
        break;
      case "bullet_seating": undoData.bulletId = null; undoData.coalIn = null; undoData.oalIn = null; break;
    }
    await updateMutation.mutateAsync({ id, data: undoData as any });
    invalidate();
    toast({ title: `Step "${step}" undone` });
  };

  const isStepBlocked = (step: string): boolean => {
    const order = ["washing", "calibration", "trim", "annealing", "second_washing", "priming", "powder", "bullet_seating"];
    const idx = order.indexOf(step);
    if (idx <= 0) return false;
    for (let i = 0; i < idx; i++) {
      if (!isStepDone(load, order[i])) return true;
    }
    return false;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await updateMutation.mutateAsync({ id, data: { photoBase64: reader.result as string } });
      invalidate();
      toast({ title: "Photo saved" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    await updateMutation.mutateAsync({ id, data: { photoBase64: null } });
    invalidate();
    toast({ title: "Photo removed" });
  };

  const handleSaveWashing = async () => {
    if (!washingMinutes) { toast({ title: "Enter washing minutes", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { washingMinutes: Number(washingMinutes), washingDate: washingDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Washing recorded" });
  };

  const handleSaveCalibration = async () => {
    if (!calibrationType) { toast({ title: "Select calibration type", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { calibrationType, calibrationDate: calibrationDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Calibration recorded" });
  };

  const handleSaveTrim = async () => {
    if (!l6In) { toast({ title: "Enter L6 measurement", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { l6In: Number(l6In), trimDate: trimDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Trim recorded" });
  };

  const handleMarkAnnealingDone = async () => {
    await updateMutation.mutateAsync({ id, data: { annealingDone: true, annealingDate: annealingDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Annealing marked done" });
  };

  const handleMarkAnnealingUndone = async () => {
    await updateMutation.mutateAsync({ id, data: { annealingDone: false, annealingDate: null } });
    invalidate();
    toast({ title: "Annealing unmarked" });
  };

  const handleSaveSecondWashing = async () => {
    if (!secondWashingMinutes) { toast({ title: "Enter minutes", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { secondWashingMinutes: Number(secondWashingMinutes), secondWashingDate: secondWashingDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Second washing recorded" });
  };

  const handleSavePriming = async () => {
    if (!primerId) { toast({ title: "Select a primer", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { primerId: Number(primerId), primerQuantityUsed: load.cartridgeQuantityUsed, primingDate: primingDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Priming recorded" });
  };

  const handleSavePowder = async () => {
    if (!powderId || !powderChargeGr) { toast({ title: "Select powder and charge", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { powderId: Number(powderId), powderChargeGr: Number(powderChargeGr), powderDate: powderDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Powder recorded" });
  };

  const handleSaveBulletSeating = async () => {
    if (!bulletId || !coalIn || !oalIn) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { bulletId: Number(bulletId), bulletQuantityUsed: load.cartridgeQuantityUsed, coalIn: Number(coalIn), oalIn: Number(oalIn), bulletSeatingDate: bulletSeatingDate || todayISO() } });
    invalidate(); setActiveStep(null);
    toast({ title: "Bullet seating recorded" });
  };

  const handleStartNewCycle = async () => {
    if (!window.confirm(`Start a new reload cycle for this cartridge batch? A new load record will be created (Cycle ${(load.reloadingCycle ?? 1) + 1}).`)) return;
    setStartingNewCycle(true);
    try {
      const res = await fetch("/api/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cartridgeId: load.cartridgeId, cartridgeQuantityUsed: load.cartridgeQuantityUsed }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      const newLoad = await res.json();
      invalidate();
      toast({ title: `New cycle started — Load #${newLoad.id}` });
      navigate(`/loads/${newLoad.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setStartingNewCycle(false);
    }
  };

  const handleComplete = async () => {
    await completeMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Load marked as completed! Inventory deducted." });
  };

  const handleUndoComplete = async () => {
    if (!window.confirm("Undo completion? The load will return to In Progress status.")) return;
    const res = await fetch(`/api/loads/${id}/undo-complete`, { method: "POST", credentials: "include" });
    if (res.ok) { invalidate(); toast({ title: "Completion undone" }); }
    else { const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" }); }
  };

  const handleUndoFire = async () => {
    if (!window.confirm("Undo fired status? H₂O weight and fired flag will be cleared.")) return;
    const res = await fetch(`/api/loads/${id}/undo-fire`, { method: "POST", credentials: "include" });
    if (res.ok) { invalidate(); toast({ title: "Fired status undone" }); }
    else { const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" }); }
  };

  const handleFire = async () => {
    const fireData: { h2oWeightGr?: number; bestChargeLevelId?: number; firedDate?: string } = {};
    if (h2oWeightGr) fireData.h2oWeightGr = Number(h2oWeightGr);
    if (selectedBestLevelId) fireData.bestChargeLevelId = Number(selectedBestLevelId);
    if (firedDate) fireData.firedDate = firedDate;
    await fireMutation.mutateAsync({ id, data: fireData });
    if (load.chargeLadderId && selectedBestLevelId) {
      await selectBestMutation.mutateAsync({ id: load.chargeLadderId, data: { levelId: Number(selectedBestLevelId) } });
    }
    invalidate();
    setFireDialogOpen(false);
    setH2oWeightGr("");
    setSelectedBestLevelId("");
    toast({ title: "Load marked as fired!" });
  };

  const powderTotal = load.powderChargeGr != null ? (load.powderChargeGr * load.cartridgeQuantityUsed).toFixed(2) : null;
  const allStepsDone = WORKFLOW_STEPS.every((s) => isStepDone(load, s.key));

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #a4-print, #a4-print * { visibility: visible !important; }
          #a4-print {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 210mm !important; min-height: 297mm !important;
            background: white !important; color: black !important;
            padding: 18mm 20mm !important;
            font-family: Arial, Helvetica, sans-serif !important;
            box-sizing: border-box !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div id="a4-print" style={{ display: "none" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid black", paddingBottom: "6mm", marginBottom: "6mm" }}>
          <div>
            <div style={{ fontSize: "22pt", fontWeight: "bold", fontFamily: "monospace" }}>{formatLoadNum(load.loadNumber)}</div>
            <div style={{ fontSize: "12pt", color: "#333" }}>Load Record — {load.date}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: "10pt", color: "#555" }}>
            <div>Caliber: <strong>{load.caliber}</strong></div>
            <div>Rounds: <strong>{load.cartridgeQuantityUsed}</strong></div>
            <div>Cycle #<strong>{load.reloadingCycle}</strong></div>
          </div>
        </div>

        {/* Two-column detail grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6mm", fontSize: "10pt" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4mm" }}>
            <Section title="Cartridge">
              <Row label="Manufacturer" value={cart?.manufacturer ?? "—"} />
              <Row label="Caliber" value={load.caliber} />
              <Row label="Qty Used" value={String(load.cartridgeQuantityUsed)} />
            </Section>
            <Section title="Preparation">
              <Row label="Calibration" value={load.calibrationType ?? "—"} />
              <Row label="L6 (trim)" value={load.l6In != null ? `${load.l6In} in` : "—"} />
              <Row label="Washing" value={load.washingMinutes != null ? `${load.washingMinutes} min` : "—"} />
              <Row label="2nd Washing" value={load.secondWashingMinutes != null ? `${load.secondWashingMinutes} min` : "—"} />
              <Row label="Annealing" value={load.annealingDone ? "Done" : "—"} />
            </Section>
          </div>
          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4mm" }}>
            <Section title="Primer">
              {(() => { const p = primers.find((x) => x.id === load.primerId); return <><Row label="Primer" value={p ? `${p.manufacturer} ${p.type}` : load.primerId != null ? `#${load.primerId}` : "—"} /><Row label="Qty" value={load.primerQuantityUsed != null ? String(load.primerQuantityUsed) : "—"} /></>; })()}
            </Section>
            <Section title="Powder">
              {(() => { const p = powders.find((x) => x.id === load.powderId); return <><Row label="Powder" value={p ? `${p.manufacturer} ${p.name}` : load.powderId != null ? `#${load.powderId}` : "—"} /><Row label="Charge / rd" value={load.powderChargeGr != null ? `${load.powderChargeGr} gr` : "—"} /><Row label="Total charge" value={powderTotal != null ? `${powderTotal} gr` : "—"} /></>; })()}
            </Section>
            <Section title="Bullet Seating">
              {(() => { const b = bullets.find((x) => x.id === load.bulletId); return <><Row label="Bullet" value={b ? `${b.manufacturer} ${b.model} ${b.weightGr}gr` : load.bulletId != null ? `#${load.bulletId}` : "—"} /><Row label="COAL" value={load.coalIn != null ? `${load.coalIn} in` : "—"} /><Row label="OAL" value={load.oalIn != null ? `${load.oalIn} in` : "—"} /></>; })()}
            </Section>
          </div>
        </div>

        {/* Notes */}
        {load.notes && (
          <div style={{ marginTop: "6mm", fontSize: "10pt" }}>
            <div style={{ fontWeight: "bold", borderBottom: "1px solid #bbb", paddingBottom: "1mm", marginBottom: "2mm" }}>Notes</div>
            <div>{load.notes}</div>
          </div>
        )}

        {/* Photo */}
        {load.photoBase64 && (
          <div style={{ marginTop: "6mm" }}>
            <div style={{ fontWeight: "bold", fontSize: "10pt", borderBottom: "1px solid #bbb", paddingBottom: "1mm", marginBottom: "2mm" }}>Photo</div>
            <img src={load.photoBase64} alt="Load" style={{ maxHeight: "60mm", maxWidth: "80mm", objectFit: "contain", border: "1px solid #ccc" }} />
          </div>
        )}

        {/* Footer */}
        <div style={{ position: "absolute", bottom: "12mm", left: "20mm", right: "20mm", borderTop: "1px solid #ccc", paddingTop: "3mm", display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#888" }}>
          <span>Reloading Manager</span>
          <span>Printed {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/loads")} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight font-mono">
              {formatLoadNum(load.loadNumber)}
              <span className="font-sans font-normal text-muted-foreground text-base ml-2">· Load #{load.id}</span>
            </h1>
            <p className="text-sm text-muted-foreground">{load.caliber} · {load.cartridgeQuantityUsed} rounds · Cycle {load.reloadingCycle} · {load.date}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 shrink-0">
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>

        {/* Summary */}
        <Card className="border-card-border">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Cartridge</p><p className="font-semibold">{cart?.manufacturer ?? "—"} {load.caliber}</p></div>
            <div><p className="text-xs text-muted-foreground">Qty Used</p><p className="font-mono">{load.cartridgeQuantityUsed}</p></div>
            <div><p className="text-xs text-muted-foreground">Reloading Cycle</p><p className="font-mono">{load.reloadingCycle}</p></div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={cn("font-semibold", load.fired ? "text-amber-400" : load.completed ? "text-green-400" : "text-muted-foreground")}>
                {load.fired ? "Fired" : load.completed ? "Completed" : "In Progress"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Photo */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Load Photo</h2>
          {load.photoBase64 ? (
            <div className="flex items-start gap-3">
              <img src={load.photoBase64} alt="Load" className="w-32 h-32 object-cover rounded-lg border border-border" />
              <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleRemovePhoto}>
                <X className="w-4 h-4" /> Remove
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors max-w-xs"
              onClick={() => photoRef.current?.click()}
            >
              <Camera className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload load photo</p>
            </div>
          )}
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Step progress */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Workflow Steps</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
            {WORKFLOW_STEPS.map((s) => {
              const done = isStepDone(load, s.key);
              const skipped = isStepSkipped(load, s.key);
              return (
                <div key={s.key} className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    skipped ? "bg-slate-700 text-slate-300 border border-dashed border-slate-500" :
                    done ? "bg-green-700 text-green-100" : "bg-muted text-muted-foreground border border-border"
                  )}>
                    {skipped ? <SkipForward className="w-3.5 h-3.5" /> : done ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <p className="text-xs text-center text-muted-foreground leading-tight">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <StepCard label="1. Washing" done={isStepDone(load, "washing")} skipped={isStepSkipped(load, "washing")}
            summary={!isStepSkipped(load, "washing") && load.washingMinutes != null ? `${load.washingMinutes} min${load.washingDate ? ` · ${toEUDate(load.washingDate)}` : ""}` : null}
            open={activeStep === "washing"} onToggle={() => setActiveStep(activeStep === "washing" ? null : "washing")}
            onSkip={() => handleSkipStep("washing")} onUnskip={() => handleUnskipStep("washing")}
            onUndo={isAdmin && isStepDone(load, "washing") && !isStepSkipped(load, "washing") ? () => handleUndoStep("washing") : undefined}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Duration (minutes)</Label>
                  <Input type="number" placeholder="e.g. 30" defaultValue={load.washingMinutes ?? ""} onChange={(e) => setWashingMinutes(e.target.value)} /></div>
                <div><Label>Date</Label>
                  <DateInput value={washingDate || load.washingDate} onChange={setWashingDate} /></div>
              </div>
              <Button size="sm" onClick={handleSaveWashing} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="2. Calibration" done={isStepDone(load, "calibration")} skipped={isStepSkipped(load, "calibration")}
            blocked={isStepBlocked("calibration")}
            summary={!isStepSkipped(load, "calibration") ? `${load.calibrationType ?? ""}${load.calibrationDate ? ` · ${toEUDate(load.calibrationDate)}` : ""}` || null : null}
            open={activeStep === "calibration"} onToggle={() => setActiveStep(activeStep === "calibration" ? null : "calibration")}
            onSkip={() => handleSkipStep("calibration")} onUnskip={() => handleUnskipStep("calibration")}
            onUndo={isAdmin && isStepDone(load, "calibration") && !isStepSkipped(load, "calibration") ? () => handleUndoStep("calibration") : undefined}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Calibration Type</Label>
                  <Select defaultValue={load.calibrationType ?? ""} onValueChange={setCalibrationType}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full Size">Full Size</SelectItem>
                      <SelectItem value="Neck Size">Neck Size</SelectItem>
                      <SelectItem value="Shoulder Bump">Shoulder Bump</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label>Date</Label>
                  <DateInput value={calibrationDate || load.calibrationDate} onChange={setCalibrationDate} /></div>
              </div>
              <Button size="sm" onClick={handleSaveCalibration} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="3. Trim" done={isStepDone(load, "trim")} skipped={isStepSkipped(load, "trim")}
            blocked={isStepBlocked("trim")}
            summary={!isStepSkipped(load, "trim") && load.l6In != null ? `L6: ${load.l6In} in${load.trimDate ? ` · ${toEUDate(load.trimDate)}` : ""}` : null}
            open={activeStep === "trim"} onToggle={() => setActiveStep(activeStep === "trim" ? null : "trim")}
            onSkip={() => handleSkipStep("trim")} onUnskip={() => handleUnskipStep("trim")}
            onUndo={isAdmin && isStepDone(load, "trim") && !isStepSkipped(load, "trim") ? () => handleUndoStep("trim") : undefined}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>L6 Measurement (inches)</Label>
                  <Input type="number" step="0.001" placeholder="e.g. 2.105" defaultValue={load.l6In ?? ""} onChange={(e) => setL6In(e.target.value)} /></div>
                <div><Label>Date</Label>
                  <DateInput value={trimDate || load.trimDate} onChange={setTrimDate} /></div>
              </div>
              <Button size="sm" onClick={handleSaveTrim} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="4. Annealing" done={isStepDone(load, "annealing")} skipped={isStepSkipped(load, "annealing")}
            blocked={isStepBlocked("annealing")}
            summary={!isStepSkipped(load, "annealing") && load.annealingDone ? `Done${load.annealingDate ? ` · ${toEUDate(load.annealingDate)}` : ""}` : null}
            open={activeStep === "annealing"} onToggle={() => setActiveStep(activeStep === "annealing" ? null : "annealing")}
            onSkip={() => handleSkipStep("annealing")} onUnskip={() => handleUnskipStep("annealing")}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {load.annealingDone ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-400 font-medium">Annealing completed</span>
                    <Button size="sm" variant="outline" className="ml-auto" onClick={handleMarkAnnealingUndone} disabled={updateMutation.isPending}>Undo</Button>
                  </>
                ) : (
                  <>
                    <Circle className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Mark annealing as done</span>
                  </>
                )}
              </div>
              {!load.annealingDone && (
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div><Label>Date</Label>
                    <DateInput value={annealingDate} onChange={setAnnealingDate} /></div>
                  <Button size="sm" onClick={handleMarkAnnealingDone} disabled={updateMutation.isPending}>Mark Done</Button>
                </div>
              )}
              {load.annealingDate && <p className="text-xs text-muted-foreground">Date: {toEUDate(load.annealingDate)}</p>}
            </div>
          </StepCard>

          <StepCard label="5. Second Washing" done={isStepDone(load, "second_washing")} skipped={isStepSkipped(load, "second_washing")}
            blocked={isStepBlocked("second_washing")}
            summary={!isStepSkipped(load, "second_washing") && load.secondWashingMinutes != null ? `${load.secondWashingMinutes} min${load.secondWashingDate ? ` · ${toEUDate(load.secondWashingDate)}` : ""}` : null}
            open={activeStep === "second_washing"} onToggle={() => setActiveStep(activeStep === "second_washing" ? null : "second_washing")}
            onSkip={() => handleSkipStep("second_washing")} onUnskip={() => handleUnskipStep("second_washing")}
            onUndo={isAdmin && isStepDone(load, "second_washing") && !isStepSkipped(load, "second_washing") ? () => handleUndoStep("second_washing") : undefined}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Duration (minutes)</Label>
                  <Input type="number" placeholder="e.g. 20" defaultValue={load.secondWashingMinutes ?? ""} onChange={(e) => setSecondWashingMinutes(e.target.value)} /></div>
                <div><Label>Date</Label>
                  <DateInput value={secondWashingDate || load.secondWashingDate} onChange={setSecondWashingDate} /></div>
              </div>
              <Button size="sm" onClick={handleSaveSecondWashing} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="6. Priming" done={isStepDone(load, "priming")} skipped={isStepSkipped(load, "priming")}
            blocked={isStepBlocked("priming")}
            summary={!isStepSkipped(load, "priming") && load.primerId != null ? `Primer #${load.primerId} · ${load.primerQuantityUsed} pcs${load.primingDate ? ` · ${toEUDate(load.primingDate)}` : ""}` : null}
            open={activeStep === "priming"} onToggle={() => setActiveStep(activeStep === "priming" ? null : "priming")}
            onSkip={() => handleSkipStep("priming")} onUnskip={() => handleUnskipStep("priming")}
            onUndo={isAdmin && isStepDone(load, "priming") && !isStepSkipped(load, "priming") ? () => handleUndoStep("priming") : undefined}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Select Primer</Label>
                  <Select defaultValue={load.primerId != null ? String(load.primerId) : ""} onValueChange={setPrimerId}>
                    <SelectTrigger><SelectValue placeholder="Select primer..." /></SelectTrigger>
                    <SelectContent>
                      {primers.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          #{p.id} — {p.manufacturer} {p.type} ({p.quantityAvailable} avail.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select></div>
                <div><Label>Date</Label>
                  <DateInput value={primingDate || load.primingDate} onChange={setPrimingDate} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Quantity used: {load.cartridgeQuantityUsed} (matches round count)</p>
              <Button size="sm" onClick={handleSavePriming} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard
            label="7. Powder"
            done={isStepDone(load, "powder")}
            skipped={isStepSkipped(load, "powder")}
            blocked={isStepBlocked("powder")}
            summary={!isStepSkipped(load, "powder") && load.chargeLadderId != null
              ? `Charge Ladder #${load.chargeLadderId} · ${ladderDetail?.levels?.length ?? "?"} levels`
              : !isStepSkipped(load, "powder") && load.powderId != null
              ? `Powder #${load.powderId} · ${load.powderChargeGr} gr/round · ${powderTotal} gr total`
              : null}
            open={activeStep === "powder"}
            onToggle={() => setActiveStep(activeStep === "powder" ? null : "powder")}
            onSkip={() => handleSkipStep("powder")}
            onUnskip={() => handleUnskipStep("powder")}
            onUndo={isAdmin && isStepDone(load, "powder") && !isStepSkipped(load, "powder") ? () => handleUndoStep("powder") : undefined}
          >
            <div className="space-y-3">
              {/* Mode Toggle */}
              <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
                <button
                  onClick={() => {
                    if (load.chargeLadderId != null && effectiveLadderMode) {
                      if (!confirm("Switch to single powder? The ladder link will be removed from this load.")) return;
                      updateMutation.mutate({ id, data: { chargeLadderId: null, powderDate: null } as any }, {
                        onSuccess: () => { invalidate(); setLadderMode(false); toast({ title: "Switched to single powder" }); },
                      });
                    } else {
                      setLadderMode(false);
                    }
                  }}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                    !effectiveLadderMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Single Load
                </button>
                <button
                  onClick={() => setLadderMode(true)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                    effectiveLadderMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  <Layers className="w-3 h-3" /> Ladder Load
                </button>
              </div>

              {/* Date field — common to both modes */}
              <div className="w-48">
                <Label>Date</Label>
                <DateInput value={powderDate || load.powderDate} onChange={setPowderDate} />
              </div>

              {effectiveLadderMode ? (
                /* LADDER MODE */
                load.chargeLadderId ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium text-foreground">Charge Ladder #{load.chargeLadderId}</span>
                      {ladderDetail?.ladder && <span>· {ladderDetail.ladder.caliber}</span>}
                    </div>

                    {/* Editable levels table */}
                    <div className="rounded border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs text-muted-foreground w-8">#</th>
                            <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Charge (gr)</th>
                            <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Rounds</th>
                            <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Powder</th>
                            <th className="px-2 py-1.5 text-center text-xs text-muted-foreground w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(ladderDetail?.levels ?? []).map((lvl, i) => (
                            <LevelEditorRow
                              key={lvl.id}
                              index={i}
                              level={lvl}
                              powders={powders}
                              isBest={ladderDetail?.ladder?.bestLevelId === lvl.id}
                              onUpdate={handleUpdateLevel}
                              onDelete={handleDeleteLevel}
                              updating={updateLevelMutation.isPending || deleteLevelMutation.isPending}
                            />
                          ))}
                          {(ladderDetail?.levels ?? []).length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground italic">No charge levels yet</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={handleAddLevel} disabled={addLevelMutation.isPending} className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add Row
                      </Button>
                      {!isStepDone(load, "powder") && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const date = powderDate || todayISO();
                            updateMutation.mutate({ id, data: { powderDate: date } as any }, {
                              onSuccess: () => { invalidate(); toast({ title: "Powder step saved" }); },
                            });
                          }}
                          disabled={updateMutation.isPending}
                          className="gap-1.5"
                        >
                          Save
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* No ladder linked yet — show init form */
                  <div className="space-y-3 p-3 border border-dashed border-primary/40 rounded bg-primary/5">
                    <p className="text-sm text-muted-foreground">Initialize a charge ladder for this load. You'll add individual charge levels with different powder charges to test.</p>
                    <div className="flex items-center gap-3">
                      <div>
                        <Label className="text-xs">Rounds per level</Label>
                        <Input type="number" className="w-24 h-8" value={ladderCartCount} onChange={(e) => setLadderCartCount(e.target.value)} />
                      </div>
                    </div>
                    <Button size="sm" onClick={handleInitLadder} disabled={createLadderMutation.isPending || updateMutation.isPending} className="gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Initialize Ladder
                    </Button>
                  </div>
                )
              ) : (
                /* SINGLE MODE */
                <div className="space-y-2">
                  <div><Label>Select Powder</Label>
                    <Select defaultValue={load.powderId != null ? String(load.powderId) : ""} onValueChange={setPowderId}>
                      <SelectTrigger><SelectValue placeholder="Select powder..." /></SelectTrigger>
                      <SelectContent>
                        {powders.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            #{p.id} — {p.manufacturer} {p.name} ({p.grainsAvailable.toFixed(1)} gr avail.)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Label>Charge per round (grains)</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 43.5" defaultValue={load.powderChargeGr ?? ""} onChange={(e) => setPowderChargeGr(e.target.value)} />
                  {powderChargeGr && (
                    <p className="text-xs text-muted-foreground">Total: {(Number(powderChargeGr) * load.cartridgeQuantityUsed).toFixed(2)} gr</p>
                  )}
                  <Button size="sm" onClick={handleSavePowder} disabled={updateMutation.isPending}>Save</Button>
                </div>
              )}
            </div>
          </StepCard>

          <StepCard label="8. Bullet Seating" done={isStepDone(load, "bullet_seating")} skipped={isStepSkipped(load, "bullet_seating")}
            blocked={isStepBlocked("bullet_seating")}
            summary={!isStepSkipped(load, "bullet_seating") && load.bulletId != null ? `Bullet #${load.bulletId} · COAL ${load.coalIn}" · OAL ${load.oalIn}"${load.bulletSeatingDate ? ` · ${toEUDate(load.bulletSeatingDate)}` : ""}` : null}
            open={activeStep === "bullet_seating"} onToggle={() => setActiveStep(activeStep === "bullet_seating" ? null : "bullet_seating")}
            onSkip={() => handleSkipStep("bullet_seating")} onUnskip={() => handleUnskipStep("bullet_seating")}
            onUndo={isAdmin && isStepDone(load, "bullet_seating") && !isStepSkipped(load, "bullet_seating") ? () => handleUndoStep("bullet_seating") : undefined}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Select Bullet</Label>
                  <Select defaultValue={load.bulletId != null ? String(load.bulletId) : ""} onValueChange={setBulletId}>
                    <SelectTrigger><SelectValue placeholder="Select bullet..." /></SelectTrigger>
                    <SelectContent>
                      {bullets.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          #{b.id} — {b.manufacturer} {b.model} {b.weightGr}gr ({b.quantityAvailable} avail.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select></div>
                <div><Label>Date</Label>
                  <DateInput value={bulletSeatingDate || load.bulletSeatingDate} onChange={setBulletSeatingDate} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>COAL (inches)</Label>
                  <Input type="number" step="0.001" placeholder="e.g. 2.800" defaultValue={load.coalIn ?? ""} onChange={(e) => setCoalIn(e.target.value)} />
                </div>
                <div>
                  <Label>OAL (inches)</Label>
                  <Input type="number" step="0.001" placeholder="e.g. 2.810" defaultValue={load.oalIn ?? ""} onChange={(e) => setOalIn(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Quantity: {load.cartridgeQuantityUsed} (matches round count)</p>
              <Button size="sm" onClick={handleSaveBulletSeating} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          {/* Complete / Fire */}
          <Card className={cn("border-card-border", load.completed ? "border-green-700/40 bg-green-950/10" : "")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-sm">
                    {load.completed ? "9. Load Completed" : "9. Complete Load"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {load.completed
                      ? "Inventory deducted. Ready to fire."
                      : "Complete all steps (or skip them) to finish the load."}
                  </p>
                </div>
                {!load.completed ? (
                  <Button onClick={handleComplete} disabled={completeMutation.isPending || !allStepsDone} className="gap-2">
                    {completeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Mark Complete
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    {!load.fired ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          onClick={() => setFireDialogOpen(true)}
                          className="gap-2 border-amber-600/50 text-amber-400 hover:bg-amber-950/30"
                        >
                          Mark as Fired
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={handleUndoComplete}>
                            <RotateCcw className="w-3 h-3" /> Undo Complete
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-right">
                          <span className="text-sm text-amber-400 font-semibold block">Fired</span>
                          {load.firedDate && <span className="text-xs text-muted-foreground block">{load.firedDate}</span>}
                          {load.h2oWeightGr != null && (
                            <span className="text-xs text-muted-foreground">H₂O: {load.h2oWeightGr} gr</span>
                          )}
                        </div>
                        <Button
                          onClick={handleStartNewCycle}
                          disabled={startingNewCycle}
                          className="gap-2 bg-primary/80 hover:bg-primary text-white"
                          size="sm"
                        >
                          {startingNewCycle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Start New Reload Cycle
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={handleUndoFire}>
                            <RotateCcw className="w-3 h-3" /> Undo Fired
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fire dialog */}
      <Dialog open={fireDialogOpen} onOpenChange={setFireDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Load as Fired</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{formatLoadNum(load.loadNumber)} — {load.caliber} · {load.cartridgeQuantityUsed} rounds</p>

            {load.chargeLadderId && ladderDetail?.levels && ladderDetail.levels.length > 0 && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Best Charge Level — optional
                </Label>
                <Select value={selectedBestLevelId} onValueChange={setSelectedBestLevelId}>
                  <SelectTrigger><SelectValue placeholder="Select best charge level..." /></SelectTrigger>
                  <SelectContent>
                    {ladderDetail.levels.map((lvl, i) => (
                      <SelectItem key={lvl.id} value={String(lvl.id)}>
                        Level {i + 1} — {lvl.chargeGr} gr · {lvl.cartridgeCount} rds
                        {lvl.powderId ? ` · Powder #${lvl.powderId}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Mark which charge level performed best</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fired Date</Label>
                <DateInput value={firedDate} onChange={setFiredDate} />
              </div>
              <div className="space-y-1.5">
                <Label>H₂O Weight (grains) — optional</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 53.40"
                  value={h2oWeightGr}
                  onChange={(e) => setH2oWeightGr(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Water weight measurement at time of firing</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFireDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleFire}
              disabled={fireMutation.isPending || selectBestMutation.isPending}
              className="gap-2 bg-amber-700 hover:bg-amber-600 text-white"
            >
              {(fireMutation.isPending || selectBestMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Fired
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: "bold", borderBottom: "1px solid #bbb", paddingBottom: "1mm", marginBottom: "2mm" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1mm" }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "4mm" }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StepCard({
  label,
  done,
  skipped,
  blocked,
  summary,
  open,
  onToggle,
  onSkip,
  onUnskip,
  onUndo,
  children,
}: {
  label: string;
  done: boolean;
  skipped: boolean;
  blocked?: boolean;
  summary: string | null | undefined;
  open: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onUndo?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(
      "border-card-border transition-colors",
      blocked ? "opacity-60" :
      skipped ? "border-slate-600/30 bg-slate-900/20" : done ? "border-green-700/30" : ""
    )}>
      <button
        className="w-full text-left p-4 flex items-center justify-between"
        onClick={blocked ? undefined : onToggle}
        disabled={blocked}
      >
        <div className="flex items-center gap-3">
          {blocked ? (
            <Lock className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          ) : skipped ? (
            <SkipForward className="w-4 h-4 text-slate-500 shrink-0" />
          ) : done ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className={cn("text-sm font-medium",
            blocked ? "text-muted-foreground/60" :
            skipped ? "text-slate-500 line-through" : done ? "text-green-300" : "text-foreground"
          )}>{label}</span>
          {blocked && <span className="text-xs text-muted-foreground/50">Complete previous step first</span>}
          {!blocked && skipped && <span className="text-xs text-slate-500">Skipped</span>}
          {!blocked && !skipped && summary && <span className="text-xs text-muted-foreground">{summary}</span>}
        </div>
        <div className="flex items-center gap-2">
          {!blocked && skipped ? (
            <span
              className="text-xs text-slate-400 hover:text-foreground cursor-pointer px-1 py-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onUnskip(); }}
            >
              Undo skip
            </span>
          ) : !blocked && !done ? (
            <span
              className="text-xs text-muted-foreground hover:text-amber-400 cursor-pointer flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
            >
              <SkipForward className="w-3 h-3" /> Skip
            </span>
          ) : !blocked && done && onUndo ? (
            <span
              className="text-xs text-muted-foreground hover:text-destructive cursor-pointer flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onUndo(); }}
              title="Admin: undo this step"
            >
              <RotateCcw className="w-3 h-3" /> Undo
            </span>
          ) : null}
          {!blocked && <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>}
        </div>
      </button>
      {open && !skipped && !blocked && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <CardContent className="pt-0 pb-4 px-4 border-t border-border">
            <div className="pt-3">{children}</div>
          </CardContent>
        </motion.div>
      )}
    </Card>
  );
}

function LevelEditorRow({
  index,
  level,
  powders,
  isBest,
  onUpdate,
  onDelete,
  updating,
}: {
  index: number;
  level: { id: number; chargeGr: number; cartridgeCount: number; powderId?: number | null; status?: string };
  powders: { id: number; manufacturer: string; name: string; grainsAvailable: number }[];
  isBest: boolean;
  onUpdate: (id: number, chargeGr: number, cartridgeCount: number, powderId?: number | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  updating: boolean;
}) {
  const [chargeGr, setChargeGr] = useState(String(level.chargeGr === 0 ? "" : level.chargeGr));
  const [cartridgeCount, setCartridgeCount] = useState(String(level.cartridgeCount));
  const [selectedPowderId, setSelectedPowderId] = useState<string>(level.powderId != null ? String(level.powderId) : "");
  const [saving, setSaving] = useState(false);

  const commit = async (overrides?: { chargeGr?: number; cartridgeCount?: number; powderId?: number | null }) => {
    const newCharge = (overrides?.chargeGr ?? Number(chargeGr)) || 0;
    const newCount = (overrides?.cartridgeCount ?? Number(cartridgeCount)) || 1;
    const newPowder = overrides?.powderId !== undefined ? overrides.powderId : (selectedPowderId ? Number(selectedPowderId) : null);
    setSaving(true);
    try { await onUpdate(level.id, newCharge, newCount, newPowder); } finally { setSaving(false); }
  };

  const handleBlur = async () => {
    const newCharge = Number(chargeGr) || 0;
    const newCount = Number(cartridgeCount) || 1;
    if (newCharge === level.chargeGr && newCount === level.cartridgeCount) return;
    await commit();
  };

  const handlePowderChange = async (val: string) => {
    setSelectedPowderId(val);
    const newPowder = val ? Number(val) : null;
    await commit({ powderId: newPowder });
  };

  return (
    <tr className={cn(isBest ? "bg-green-950/20" : "")}>
      <td className="px-2 py-1">
        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{index + 1}</span>
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.1"
            placeholder="0.0"
            value={chargeGr}
            onChange={(e) => setChargeGr(e.target.value)}
            onBlur={handleBlur}
            className="h-7 w-20 text-sm font-mono"
            disabled={saving || updating}
          />
          <span className="text-xs text-muted-foreground">gr</span>
        </div>
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="1"
            placeholder="5"
            value={cartridgeCount}
            onChange={(e) => setCartridgeCount(e.target.value)}
            onBlur={handleBlur}
            className="h-7 w-16 text-sm"
            disabled={saving || updating}
          />
          <span className="text-xs text-muted-foreground">rds</span>
        </div>
      </td>
      <td className="px-2 py-1 min-w-[140px]">
        <Select value={selectedPowderId} onValueChange={handlePowderChange} disabled={saving || updating}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— none —</SelectItem>
            {powders.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.manufacturer} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-1 py-1 text-center">
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mx-auto" />
        ) : (
          <button
            onClick={() => onDelete(level.id)}
            disabled={updating}
            className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
