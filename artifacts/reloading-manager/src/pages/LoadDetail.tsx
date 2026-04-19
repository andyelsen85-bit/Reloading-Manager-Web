import { useRoute, useLocation } from "wouter";
import { useGetLoad, getGetLoadQueryKey, useUpdateLoad, useCompleteLoad, useFireLoad, useListPrimers, useListPowders, useListBullets, useListCartridges, getListLoadsQueryKey, getGetDashboardOverviewQueryKey, getListCartridgesQueryKey, useGetChargeLadder, getGetChargeLadderQueryKey, useCreateChargeLadder, useAddChargeLevel, useSelectBestChargeLevel } from "@workspace/api-client-react";
import type { Load } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { CheckCircle2, Circle, ChevronLeft, Loader2, SkipForward, Printer, Camera, X, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
    case "powder": return load.powderId != null || load.chargeLadderId != null;
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
  const [calibrationType, setCalibrationType] = useState("");
  const [l6In, setL6In] = useState("");
  const [_annealingMinutes, _setAnnealingMinutes] = useState("");
  const [secondWashingMinutes, setSecondWashingMinutes] = useState("");
  const [primerId, setPrimerId] = useState("");
  const [powderId, setPowderId] = useState("");
  const [powderChargeGr, setPowderChargeGr] = useState("");
  const [bulletId, setBulletId] = useState("");
  const [coalIn, setCoalIn] = useState("");
  const [oalIn, setOalIn] = useState("");

  const [fireDialogOpen, setFireDialogOpen] = useState(false);
  const [h2oWeightGr, setH2oWeightGr] = useState("");
  const [selectedBestLevelId, setSelectedBestLevelId] = useState("");

  const [ladderMode, setLadderMode] = useState(false);
  const [ladderCartCount, setLadderCartCount] = useState("5");
  const [addLevelChargeGr, setAddLevelChargeGr] = useState("");
  const [addLevelCartridgeCount, setAddLevelCartridgeCount] = useState("5");
  const [addLevelPowderId, setAddLevelPowderId] = useState("");

  const createLadderMutation = useCreateChargeLadder();
  const addLevelMutation = useAddChargeLevel();
  const selectBestMutation = useSelectBestChargeLevel();

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
    const ladder = await createLadderMutation.mutateAsync({
      data: {
        name: `Load #${load.id} Charge Ladder`,
        caliber: load.caliber,
        cartridgeId: load.cartridgeId,
        bulletId: load.bulletId ?? undefined,
        primerId: load.primerId ?? undefined,
        cartridgesPerLevel: Number(ladderCartCount) || 5,
      },
    });
    await updateMutation.mutateAsync({ id, data: { chargeLadderId: ladder.id } });
    invalidate();
    toast({ title: "Charge ladder initialized" });
  };

  const handleAddLevel = async () => {
    if (!load.chargeLadderId || !addLevelChargeGr) { toast({ title: "Enter charge weight", variant: "destructive" }); return; }
    await addLevelMutation.mutateAsync({
      id: load.chargeLadderId,
      data: {
        chargeGr: Number(addLevelChargeGr),
        cartridgeCount: Number(addLevelCartridgeCount) || 5,
        powderId: addLevelPowderId ? Number(addLevelPowderId) : undefined,
      },
    });
    qc.invalidateQueries({ queryKey: getGetChargeLadderQueryKey(load.chargeLadderId) });
    setAddLevelChargeGr(""); setAddLevelCartridgeCount("5"); setAddLevelPowderId("");
    toast({ title: "Charge level added" });
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
    await updateMutation.mutateAsync({ id, data: { washingMinutes: Number(washingMinutes) } });
    invalidate(); setActiveStep(null);
    toast({ title: "Washing recorded" });
  };

  const handleSaveCalibration = async () => {
    if (!calibrationType) { toast({ title: "Select calibration type", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { calibrationType } });
    invalidate(); setActiveStep(null);
    toast({ title: "Calibration recorded" });
  };

  const handleSaveTrim = async () => {
    if (!l6In) { toast({ title: "Enter L6 measurement", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { l6In: Number(l6In) } });
    invalidate(); setActiveStep(null);
    toast({ title: "Trim recorded" });
  };

  const handleMarkAnnealingDone = async () => {
    await updateMutation.mutateAsync({ id, data: { annealingDone: true } });
    invalidate(); setActiveStep(null);
    toast({ title: "Annealing marked done" });
  };

  const handleMarkAnnealingUndone = async () => {
    await updateMutation.mutateAsync({ id, data: { annealingDone: false } });
    invalidate();
    toast({ title: "Annealing unmarked" });
  };

  const handleSaveSecondWashing = async () => {
    if (!secondWashingMinutes) { toast({ title: "Enter minutes", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { secondWashingMinutes: Number(secondWashingMinutes) } });
    invalidate(); setActiveStep(null);
    toast({ title: "Second washing recorded" });
  };

  const handleSavePriming = async () => {
    if (!primerId) { toast({ title: "Select a primer", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { primerId: Number(primerId), primerQuantityUsed: load.cartridgeQuantityUsed } });
    invalidate(); setActiveStep(null);
    toast({ title: "Priming recorded" });
  };

  const handleSavePowder = async () => {
    if (!powderId || !powderChargeGr) { toast({ title: "Select powder and charge", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { powderId: Number(powderId), powderChargeGr: Number(powderChargeGr) } });
    invalidate(); setActiveStep(null);
    toast({ title: "Powder recorded" });
  };

  const handleSaveBulletSeating = async () => {
    if (!bulletId || !coalIn || !oalIn) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    await updateMutation.mutateAsync({ id, data: { bulletId: Number(bulletId), bulletQuantityUsed: load.cartridgeQuantityUsed, coalIn: Number(coalIn), oalIn: Number(oalIn) } });
    invalidate(); setActiveStep(null);
    toast({ title: "Bullet seating recorded" });
  };

  const handleComplete = async () => {
    await completeMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Load marked as completed! Inventory deducted." });
  };

  const handleFire = async () => {
    const fireData: { h2oWeightGr?: number; bestChargeLevelId?: number } = {};
    if (h2oWeightGr) fireData.h2oWeightGr = Number(h2oWeightGr);
    if (selectedBestLevelId) fireData.bestChargeLevelId = Number(selectedBestLevelId);
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
            summary={!isStepSkipped(load, "washing") && load.washingMinutes != null ? `${load.washingMinutes} min` : null}
            open={activeStep === "washing"} onToggle={() => setActiveStep(activeStep === "washing" ? null : "washing")}
            onSkip={() => handleSkipStep("washing")} onUnskip={() => handleUnskipStep("washing")}
          >
            <div className="space-y-2">
              <Label>Washing Duration (minutes)</Label>
              <Input type="number" placeholder="e.g. 30" defaultValue={load.washingMinutes ?? ""} onChange={(e) => setWashingMinutes(e.target.value)} />
              <Button size="sm" onClick={handleSaveWashing} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="2. Calibration" done={isStepDone(load, "calibration")} skipped={isStepSkipped(load, "calibration")}
            summary={!isStepSkipped(load, "calibration") ? load.calibrationType : null}
            open={activeStep === "calibration"} onToggle={() => setActiveStep(activeStep === "calibration" ? null : "calibration")}
            onSkip={() => handleSkipStep("calibration")} onUnskip={() => handleUnskipStep("calibration")}
          >
            <div className="space-y-2">
              <Label>Calibration Type</Label>
              <Select defaultValue={load.calibrationType ?? ""} onValueChange={setCalibrationType}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Size">Full Size</SelectItem>
                  <SelectItem value="Neck Size">Neck Size</SelectItem>
                  <SelectItem value="Shoulder Bump">Shoulder Bump</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSaveCalibration} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="3. Trim" done={isStepDone(load, "trim")} skipped={isStepSkipped(load, "trim")}
            summary={!isStepSkipped(load, "trim") && load.l6In != null ? `L6: ${load.l6In} in` : null}
            open={activeStep === "trim"} onToggle={() => setActiveStep(activeStep === "trim" ? null : "trim")}
            onSkip={() => handleSkipStep("trim")} onUnskip={() => handleUnskipStep("trim")}
          >
            <div className="space-y-2">
              <Label>L6 Measurement (inches)</Label>
              <Input type="number" step="0.001" placeholder="e.g. 2.105" defaultValue={load.l6In ?? ""} onChange={(e) => setL6In(e.target.value)} />
              <Button size="sm" onClick={handleSaveTrim} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="4. Annealing" done={isStepDone(load, "annealing")} skipped={isStepSkipped(load, "annealing")}
            summary={!isStepSkipped(load, "annealing") && load.annealingDone ? "Done" : null}
            open={activeStep === "annealing"} onToggle={() => setActiveStep(activeStep === "annealing" ? null : "annealing")}
            onSkip={() => handleSkipStep("annealing")} onUnskip={() => handleUnskipStep("annealing")}
          >
            <div className="flex items-center gap-3">
              {load.annealingDone ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-400 font-medium">Annealing completed</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={handleMarkAnnealingUndone} disabled={updateMutation.isPending}>Undo</Button>
                </>
              ) : (
                <>
                  <Circle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Mark annealing as done when finished</span>
                  <Button size="sm" className="ml-auto" onClick={handleMarkAnnealingDone} disabled={updateMutation.isPending}>Mark Done</Button>
                </>
              )}
            </div>
          </StepCard>

          <StepCard label="5. Second Washing" done={isStepDone(load, "second_washing")} skipped={isStepSkipped(load, "second_washing")}
            summary={!isStepSkipped(load, "second_washing") && load.secondWashingMinutes != null ? `${load.secondWashingMinutes} min` : null}
            open={activeStep === "second_washing"} onToggle={() => setActiveStep(activeStep === "second_washing" ? null : "second_washing")}
            onSkip={() => handleSkipStep("second_washing")} onUnskip={() => handleUnskipStep("second_washing")}
          >
            <div className="space-y-2">
              <Label>Second Washing Duration (minutes)</Label>
              <Input type="number" placeholder="e.g. 20" defaultValue={load.secondWashingMinutes ?? ""} onChange={(e) => setSecondWashingMinutes(e.target.value)} />
              <Button size="sm" onClick={handleSaveSecondWashing} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard label="6. Priming" done={isStepDone(load, "priming")} skipped={isStepSkipped(load, "priming")}
            summary={!isStepSkipped(load, "priming") && load.primerId != null ? `Primer #${load.primerId} · ${load.primerQuantityUsed} pcs` : null}
            open={activeStep === "priming"} onToggle={() => setActiveStep(activeStep === "priming" ? null : "priming")}
            onSkip={() => handleSkipStep("priming")} onUnskip={() => handleUnskipStep("priming")}
          >
            <div className="space-y-2">
              <Label>Select Primer</Label>
              <Select defaultValue={load.primerId != null ? String(load.primerId) : ""} onValueChange={setPrimerId}>
                <SelectTrigger><SelectValue placeholder="Select primer..." /></SelectTrigger>
                <SelectContent>
                  {primers.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      #{p.id} — {p.manufacturer} {p.type} ({p.quantityAvailable} avail.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Quantity used: {load.cartridgeQuantityUsed} (matches round count)</p>
              <Button size="sm" onClick={handleSavePriming} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </StepCard>

          <StepCard
            label="7. Powder"
            done={isStepDone(load, "powder")}
            skipped={isStepSkipped(load, "powder")}
            summary={!isStepSkipped(load, "powder") && load.chargeLadderId != null
              ? `Charge Ladder #${load.chargeLadderId} · ${ladderDetail?.levels?.length ?? "?"} levels`
              : !isStepSkipped(load, "powder") && load.powderId != null
              ? `Powder #${load.powderId} · ${load.powderChargeGr} gr/round · ${powderTotal} gr total`
              : null}
            open={activeStep === "powder"}
            onToggle={() => setActiveStep(activeStep === "powder" ? null : "powder")}
            onSkip={() => handleSkipStep("powder")}
            onUnskip={() => handleUnskipStep("powder")}
          >
            <div className="space-y-3">
              {/* Mode Toggle — only show if no ladder linked yet */}
              {!load.chargeLadderId && (
                <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
                  <button
                    onClick={() => setLadderMode(false)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                      !ladderMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    Single Load
                  </button>
                  <button
                    onClick={() => setLadderMode(true)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                      ladderMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Layers className="w-3 h-3" /> Ladder Load
                  </button>
                </div>
              )}

              {effectiveLadderMode ? (
                /* LADDER MODE */
                load.chargeLadderId ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium text-foreground">Charge Ladder #{load.chargeLadderId}</span>
                      {ladderDetail?.ladder && <span>· {ladderDetail.ladder.caliber} · {ladderDetail.ladder.cartridgesPerLevel} rounds/level</span>}
                    </div>

                    {/* Charge levels list */}
                    {(ladderDetail?.levels ?? []).length > 0 ? (
                      <div className="space-y-1.5">
                        {(ladderDetail?.levels ?? []).map((lvl, i) => (
                          <div key={lvl.id} className={cn(
                            "flex items-center gap-3 p-2.5 rounded border text-sm",
                            ladderDetail?.ladder?.bestLevelId === lvl.id
                              ? "border-green-600/50 bg-green-950/20 text-green-300"
                              : "border-border bg-muted/20"
                          )}>
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                            <span className="font-mono font-semibold">{lvl.chargeGr} gr</span>
                            <span className="text-muted-foreground text-xs">· {lvl.cartridgeCount} rds</span>
                            {lvl.powderId && <span className="text-muted-foreground text-xs">· Powder #{lvl.powderId}</span>}
                            <span className={cn("ml-auto text-xs capitalize", lvl.status === "fired" ? "text-amber-400" : "text-muted-foreground")}>{lvl.status}</span>
                            {ladderDetail?.ladder?.bestLevelId === lvl.id && <span className="text-xs text-green-400 font-medium">✓ Best</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No charge levels yet — add the first one below.</p>
                    )}

                    {/* Add level form */}
                    <div className="border border-dashed border-border rounded p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Charge Level</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Charge (gr) *</Label>
                          <Input type="number" step="0.1" placeholder="e.g. 43.5" value={addLevelChargeGr} onChange={(e) => setAddLevelChargeGr(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Rounds</Label>
                          <Input type="number" placeholder="5" value={addLevelCartridgeCount} onChange={(e) => setAddLevelCartridgeCount(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Powder</Label>
                          <Select value={addLevelPowderId} onValueChange={setAddLevelPowderId}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
                            <SelectContent>
                              {powders.map((p) => <SelectItem key={p.id} value={String(p.id)}>#{p.id} — {p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button size="sm" onClick={handleAddLevel} disabled={addLevelMutation.isPending} className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add Level
                      </Button>
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
                  <Label>Select Powder</Label>
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
            summary={!isStepSkipped(load, "bullet_seating") && load.bulletId != null ? `Bullet #${load.bulletId} · COAL ${load.coalIn}" · OAL ${load.oalIn}"` : null}
            open={activeStep === "bullet_seating"} onToggle={() => setActiveStep(activeStep === "bullet_seating" ? null : "bullet_seating")}
            onSkip={() => handleSkipStep("bullet_seating")} onUnskip={() => handleUnskipStep("bullet_seating")}
          >
            <div className="space-y-2">
              <Label>Select Bullet</Label>
              <Select defaultValue={load.bulletId != null ? String(load.bulletId) : ""} onValueChange={setBulletId}>
                <SelectTrigger><SelectValue placeholder="Select bullet..." /></SelectTrigger>
                <SelectContent>
                  {bullets.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      #{b.id} — {b.manufacturer} {b.model} {b.weightGr}gr ({b.quantityAvailable} avail.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    {!load.fired ? (
                      <Button
                        variant="outline"
                        onClick={() => setFireDialogOpen(true)}
                        className="gap-2 border-amber-600/50 text-amber-400 hover:bg-amber-950/30"
                      >
                        Mark as Fired
                      </Button>
                    ) : (
                      <div className="text-right">
                        <span className="text-sm text-amber-400 font-semibold block">Fired</span>
                        {load.h2oWeightGr != null && (
                          <span className="text-xs text-muted-foreground">H₂O: {load.h2oWeightGr} gr</span>
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

            <div className="space-y-1.5">
              <Label>H₂O Weight (grains) — optional</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 53.40"
                value={h2oWeightGr}
                onChange={(e) => setH2oWeightGr(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Water weight measurement at time of firing</p>
            </div>
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
  summary,
  open,
  onToggle,
  onSkip,
  onUnskip,
  children,
}: {
  label: string;
  done: boolean;
  skipped: boolean;
  summary: string | null | undefined;
  open: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(
      "border-card-border transition-colors",
      skipped ? "border-slate-600/30 bg-slate-900/20" : done ? "border-green-700/30" : ""
    )}>
      <button className="w-full text-left p-4 flex items-center justify-between" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {skipped ? (
            <SkipForward className="w-4 h-4 text-slate-500 shrink-0" />
          ) : done ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className={cn("text-sm font-medium",
            skipped ? "text-slate-500 line-through" : done ? "text-green-300" : "text-foreground"
          )}>{label}</span>
          {skipped && <span className="text-xs text-slate-500">Skipped</span>}
          {!skipped && summary && <span className="text-xs text-muted-foreground">{summary}</span>}
        </div>
        <div className="flex items-center gap-2">
          {skipped ? (
            <span
              className="text-xs text-slate-400 hover:text-foreground cursor-pointer px-1 py-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onUnskip(); }}
            >
              Undo skip
            </span>
          ) : !done ? (
            <span
              className="text-xs text-muted-foreground hover:text-amber-400 cursor-pointer flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
            >
              <SkipForward className="w-3 h-3" /> Skip
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && !skipped && (
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
