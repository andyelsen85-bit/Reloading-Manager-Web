import { useRoute, useLocation } from "wouter";
import { useGetLoad, getGetLoadQueryKey, useUpdateLoad, useCompleteLoad, useFireLoad, useListPrimers, useListPowders, useListBullets, useListCartridges, getListLoadsQueryKey, getGetDashboardOverviewQueryKey, getListCartridgesQueryKey } from "@workspace/api-client-react";
import type { Load } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle2, Circle, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const WORKFLOW_STEPS = [
  { key: "washing", label: "1. Washing" },
  { key: "calibration", label: "2. Calibration" },
  { key: "trim", label: "3. Trim" },
  { key: "second_washing", label: "4. Second Washing" },
  { key: "priming", label: "5. Priming" },
  { key: "powder", label: "6. Powder" },
  { key: "bullet_seating", label: "7. Bullet Seating" },
  { key: "complete", label: "8. Complete" },
];

function isStepDone(load: Load | undefined, step: string): boolean {
  if (!load) return false;
  switch (step) {
    case "washing": return load.washingMinutes != null && load.washingMinutes > 0;
    case "calibration": return !!load.calibrationType;
    case "trim": return load.l6In != null;
    case "second_washing": return load.secondWashingMinutes != null && load.secondWashingMinutes > 0;
    case "priming": return load.primerId != null;
    case "powder": return load.powderId != null;
    case "bullet_seating": return load.bulletId != null && load.coalIn != null && load.oalIn != null;
    case "complete": return load.completed;
    default: return false;
  }
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
  const [secondWashingMinutes, setSecondWashingMinutes] = useState("");
  const [primerId, setPrimerId] = useState("");
  const [powderId, setPowderId] = useState("");
  const [powderChargeGr, setPowderChargeGr] = useState("");
  const [bulletId, setBulletId] = useState("");
  const [coalIn, setCoalIn] = useState("");
  const [oalIn, setOalIn] = useState("");

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-16 rounded" /><Skeleton className="h-64 rounded" /></div>;
  }
  if (!load) return <div className="text-center py-16 text-muted-foreground">Load not found.</div>;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetLoadQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListLoadsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
    qc.invalidateQueries({ queryKey: getListCartridgesQueryKey() });
  };

  const cart = cartridges.find((c) => c.id === load.cartridgeId);

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
    await fireMutation.mutateAsync({ id });
    invalidate();
    toast({ title: "Load marked as fired!" });
  };

  const powderCharge = load.powderChargeGr;
  const powderTotal = powderCharge != null ? (powderCharge * load.cartridgeQuantityUsed).toFixed(2) : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/loads")} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Load #{load.id} — {load.userLoadId}</h1>
          <p className="text-sm text-muted-foreground">{load.caliber} · {load.cartridgeQuantityUsed} rounds · Cycle {load.reloadingCycle} · {load.date}</p>
        </div>
      </div>

      {/* Summary card */}
      <Card className="border-card-border">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Cartridge</p><p className="font-semibold">{cart?.manufacturer ?? "—"} {load.caliber}</p></div>
          <div><p className="text-xs text-muted-foreground">Qty Used</p><p className="font-mono">{load.cartridgeQuantityUsed}</p></div>
          <div><p className="text-xs text-muted-foreground">Reloading Cycle</p><p className="font-mono">{load.reloadingCycle}</p></div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className={cn("font-semibold", load.completed ? "text-green-400" : load.fired ? "text-amber-400" : "text-muted-foreground")}>
              {load.completed ? "Completed" : load.fired ? "Fired" : "In Progress"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step progress indicator */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Workflow Steps</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
          {WORKFLOW_STEPS.map((s, i) => {
            const done = isStepDone(load, s.key);
            return (
              <div key={s.key} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  done ? "bg-green-700 text-green-100" : "bg-muted text-muted-foreground border border-border"
                )}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <p className="text-xs text-center text-muted-foreground leading-tight">{s.label.split(". ")[1]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {/* Washing */}
        <StepCard
          label="1. Washing"
          done={isStepDone(load, "washing")}
          summary={load.washingMinutes != null ? `${load.washingMinutes} min` : null}
          open={activeStep === "washing"}
          onToggle={() => setActiveStep(activeStep === "washing" ? null : "washing")}
        >
          <div className="space-y-2">
            <Label>Washing Duration (minutes)</Label>
            <Input type="number" placeholder="e.g. 30" defaultValue={load.washingMinutes ?? ""} onChange={(e) => setWashingMinutes(e.target.value)} />
            <Button size="sm" onClick={handleSaveWashing} disabled={updateMutation.isPending}>Save</Button>
          </div>
        </StepCard>

        {/* Calibration */}
        <StepCard
          label="2. Calibration"
          done={isStepDone(load, "calibration")}
          summary={load.calibrationType}
          open={activeStep === "calibration"}
          onToggle={() => setActiveStep(activeStep === "calibration" ? null : "calibration")}
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

        {/* Trim */}
        <StepCard
          label="3. Trim"
          done={isStepDone(load, "trim")}
          summary={load.l6In != null ? `L6: ${load.l6In} in` : null}
          open={activeStep === "trim"}
          onToggle={() => setActiveStep(activeStep === "trim" ? null : "trim")}
        >
          <div className="space-y-2">
            <Label>L6 Measurement (inches)</Label>
            <Input type="number" step="0.001" placeholder="e.g. 2.105" defaultValue={load.l6In ?? ""} onChange={(e) => setL6In(e.target.value)} />
            <Button size="sm" onClick={handleSaveTrim} disabled={updateMutation.isPending}>Save</Button>
          </div>
        </StepCard>

        {/* Second Washing */}
        <StepCard
          label="4. Second Washing"
          done={isStepDone(load, "second_washing")}
          summary={load.secondWashingMinutes != null ? `${load.secondWashingMinutes} min` : null}
          open={activeStep === "second_washing"}
          onToggle={() => setActiveStep(activeStep === "second_washing" ? null : "second_washing")}
        >
          <div className="space-y-2">
            <Label>Second Washing Duration (minutes)</Label>
            <Input type="number" placeholder="e.g. 20" defaultValue={load.secondWashingMinutes ?? ""} onChange={(e) => setSecondWashingMinutes(e.target.value)} />
            <Button size="sm" onClick={handleSaveSecondWashing} disabled={updateMutation.isPending}>Save</Button>
          </div>
        </StepCard>

        {/* Priming */}
        <StepCard
          label="5. Priming"
          done={isStepDone(load, "priming")}
          summary={load.primerId != null ? `Primer #${load.primerId} · ${load.primerQuantityUsed} pcs` : null}
          open={activeStep === "priming"}
          onToggle={() => setActiveStep(activeStep === "priming" ? null : "priming")}
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

        {/* Powder */}
        <StepCard
          label="6. Powder"
          done={isStepDone(load, "powder")}
          summary={load.powderId != null ? `Powder #${load.powderId} · ${load.powderChargeGr} gr/round · ${powderTotal} gr total` : null}
          open={activeStep === "powder"}
          onToggle={() => setActiveStep(activeStep === "powder" ? null : "powder")}
        >
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
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 43.5"
              defaultValue={load.powderChargeGr ?? ""}
              onChange={(e) => setPowderChargeGr(e.target.value)}
            />
            {powderChargeGr && (
              <p className="text-xs text-muted-foreground">
                Total powder: {(Number(powderChargeGr) * load.cartridgeQuantityUsed).toFixed(2)} gr
              </p>
            )}
            <Button size="sm" onClick={handleSavePowder} disabled={updateMutation.isPending}>Save</Button>
          </div>
        </StepCard>

        {/* Bullet Seating */}
        <StepCard
          label="7. Bullet Seating"
          done={isStepDone(load, "bullet_seating")}
          summary={load.bulletId != null ? `Bullet #${load.bulletId} · COAL ${load.coalIn}" · OAL ${load.oalIn}"` : null}
          open={activeStep === "bullet_seating"}
          onToggle={() => setActiveStep(activeStep === "bullet_seating" ? null : "bullet_seating")}
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
            <p className="text-xs text-muted-foreground">Quantity: {load.cartridgeQuantityUsed} bullets (matches round count)</p>
            <Button size="sm" onClick={handleSaveBulletSeating} disabled={updateMutation.isPending}>Save</Button>
          </div>
        </StepCard>

        {/* Complete / Fire */}
        <Card className={cn("border-card-border", load.completed ? "border-green-700/40 bg-green-950/10" : "")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">
                  {load.completed ? "Load Completed" : "8. Complete Load"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {load.completed
                    ? "Inventory has been deducted. Ready to fire."
                    : "Requires: primer, powder, bullet, COAL, and OAL data."}
                </p>
              </div>
              {!load.completed ? (
                <Button
                  onClick={handleComplete}
                  disabled={completeMutation.isPending || !isStepDone(load, "priming") || !isStepDone(load, "powder") || !isStepDone(load, "bullet_seating")}
                  className="gap-2"
                >
                  {completeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Mark Complete
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  {!load.fired ? (
                    <Button
                      variant="outline"
                      onClick={handleFire}
                      disabled={fireMutation.isPending}
                      className="gap-2 border-amber-600/50 text-amber-400 hover:bg-amber-950/30"
                    >
                      {fireMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Mark as Fired
                    </Button>
                  ) : (
                    <span className="text-sm text-amber-400 font-semibold">Fired</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepCard({
  label,
  done,
  summary,
  open,
  onToggle,
  children,
}: {
  label: string;
  done: boolean;
  summary: string | null | undefined;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("border-card-border transition-colors", done ? "border-green-700/30" : "")}>
      <button
        className="w-full text-left p-4 flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {done ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className={cn("text-sm font-medium", done ? "text-green-300" : "text-foreground")}>{label}</span>
          {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
        </div>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
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
