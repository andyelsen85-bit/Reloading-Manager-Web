import { useState, useRef, Fragment } from "react";
import { useListCartridges, useCreateCartridge, useUpdateCartridge, useDeleteCartridge, getListCartridgesQueryKey, useListLoads, getListLoadsQueryKey } from "@workspace/api-client-react";
import { RefCombobox } from "@/components/RefCombobox";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Camera, X, ChevronDown, ChevronRight } from "lucide-react";
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

type CartridgeForm = {
  manufacturer: string; caliber: string; productionCharge: string; quantityTotal: string;
  currentStep: string; l6In: string; notes: string; photoBase64: string | null;
  primerType: string; avgEmptyWeightGr: string; avgInternalVolumeGr: string;
  avgShoulderDiameterIn: string; avgBaseDiameterIn: string; avgNeckWallThicknessIn: string;
  ampAztecCode: string; ampPilotNumber: string;
};
const empty: CartridgeForm = {
  manufacturer: "", caliber: "", productionCharge: "", quantityTotal: "",
  currentStep: "New", l6In: "", notes: "", photoBase64: null,
  primerType: "", avgEmptyWeightGr: "", avgInternalVolumeGr: "",
  avgShoulderDiameterIn: "", avgBaseDiameterIn: "", avgNeckWallThicknessIn: "",
  ampAztecCode: "", ampPilotNumber: "",
};

const formatBatchId = (loadNumber: number | null | undefined, cycle: number | null | undefined) => {
  const batch = loadNumber != null ? String(loadNumber).padStart(5, "0") : "00000";
  const cyc = cycle != null ? String(cycle).padStart(3, "0") : "001";
  return `#${batch}-${cyc}`;
};

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

export default function Cartridges() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: cartridges = [], isLoading } = useListCartridges({ query: { queryKey: getListCartridgesQueryKey() } });
  const { data: allLoads = [] } = useListLoads({ query: { queryKey: getListLoadsQueryKey() } });
  const createMutation = useCreateCartridge();
  const updateMutation = useUpdateCartridge();
  const deleteMutation = useDeleteCartridge();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<(typeof cartridges)[0] | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<CartridgeForm>(empty);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFiredFor, setShowFiredFor] = useState<Set<number>>(new Set());
  const toggleShowFired = (id: number) =>
    setShowFiredFor((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = cartridges.filter((c) =>
    c.caliber.toLowerCase().includes(search.toLowerCase()) ||
    c.manufacturer.toLowerCase().includes(search.toLowerCase())
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCartridgesQueryKey() });

  const cartridgeExtraData = (f: CartridgeForm) => ({
    primerType: f.primerType || undefined,
    avgEmptyWeightGr: f.avgEmptyWeightGr ? Number(f.avgEmptyWeightGr) : undefined,
    avgInternalVolumeGr: f.avgInternalVolumeGr ? Number(f.avgInternalVolumeGr) : undefined,
    avgShoulderDiameterIn: f.avgShoulderDiameterIn ? Number(f.avgShoulderDiameterIn) : undefined,
    avgBaseDiameterIn: f.avgBaseDiameterIn ? Number(f.avgBaseDiameterIn) : undefined,
    avgNeckWallThicknessIn: f.avgNeckWallThicknessIn ? Number(f.avgNeckWallThicknessIn) : undefined,
    ampAztecCode: f.ampAztecCode || undefined,
    ampPilotNumber: f.ampPilotNumber || undefined,
  });

  const handleAdd = async () => {
    if (!form.manufacturer || !form.caliber || !form.productionCharge || !form.quantityTotal) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync({ data: { manufacturer: form.manufacturer, caliber: form.caliber, productionCharge: form.productionCharge, quantityTotal: Number(form.quantityTotal), notes: form.notes || undefined, photoBase64: form.photoBase64 ?? undefined, ...cartridgeExtraData(form) } });
    invalidate(); setAddOpen(false); setForm(empty);
    toast({ title: "Cartridge batch added" });
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, data: { manufacturer: form.manufacturer, caliber: form.caliber, productionCharge: form.productionCharge, quantityTotal: Number(form.quantityTotal), currentStep: form.currentStep, l6In: form.l6In || undefined, notes: form.notes || undefined, photoBase64: form.photoBase64, ...cartridgeExtraData(form) } });
    invalidate(); setEditItem(null); setForm(empty);
    toast({ title: "Cartridge updated" });
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync({ id: deleteId! });
    invalidate(); setDeleteId(null);
    toast({ title: "Deleted" });
  };

  const openEdit = (c: (typeof cartridges)[0]) => {
    setEditItem(c);
    setForm({
      manufacturer: c.manufacturer, caliber: c.caliber, productionCharge: c.productionCharge,
      quantityTotal: String(c.quantityTotal), currentStep: c.currentStep,
      l6In: c.l6In ?? "", notes: c.notes ?? "", photoBase64: c.photoBase64 ?? null,
      primerType: c.primerType ?? "", avgEmptyWeightGr: c.avgEmptyWeightGr != null ? String(c.avgEmptyWeightGr) : "",
      avgInternalVolumeGr: c.avgInternalVolumeGr != null ? String(c.avgInternalVolumeGr) : "",
      avgShoulderDiameterIn: c.avgShoulderDiameterIn != null ? String(c.avgShoulderDiameterIn) : "",
      avgBaseDiameterIn: c.avgBaseDiameterIn != null ? String(c.avgBaseDiameterIn) : "",
      avgNeckWallThicknessIn: c.avgNeckWallThicknessIn != null ? String(c.avgNeckWallThicknessIn) : "",
      ampAztecCode: c.ampAztecCode ?? "", ampPilotNumber: c.ampPilotNumber ?? "",
    });
  };

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Cartridge Inventory</h1>
          <p className="text-sm text-muted-foreground">{cartridges.length} batches</p>
        </div>
        <Button size="sm" onClick={() => { setForm(empty); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Batch
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by caliber or manufacturer..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No cartridge batches found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-8 px-2 py-2.5"></th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Photo</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manufacturer</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caliber</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prod. Charge</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loaded/Total</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const batchLoads = allLoads.filter((l) => l.cartridgeId === c.id);
                const isExpanded = expandedId === c.id;
                return (
                  <Fragment key={c.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors", isExpanded && "bg-muted/10")}
                    >
                      <td className="px-2 py-2">
                        {batchLoads.length > 0 ? (
                          <button
                            onClick={() => toggleExpand(c.id)}
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors text-muted-foreground"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <span className="w-6 h-6 block" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <PhotoCell src={c.photoBase64} alt={c.caliber} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{c.id}</td>
                      <td className="px-3 py-2.5 text-foreground">{c.manufacturer}</td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">{c.caliber}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{c.productionCharge}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{c.quantityLoaded}/{c.quantityTotal}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate">{c.notes}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </motion.tr>
                    {isExpanded && batchLoads.length > 0 && (() => {
                      const firedLoads = batchLoads.filter((l) => l.fired);
                      const nonFiredLoads = batchLoads.filter((l) => !l.fired);
                      const showFired = showFiredFor.has(c.id);
                      const visibleLoads = showFired ? batchLoads : nonFiredLoads;
                      return (
                        <tr className="border-b border-border/30 bg-muted/5">
                          <td colSpan={10} className="px-0 py-0">
                            <div className="pl-12 pr-4 py-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Reload workflows ({batchLoads.length} total)
                              </p>
                              <div className="space-y-1">
                                {visibleLoads.map((l) => (
                                  <div
                                    key={l.id}
                                    className="flex items-center gap-3 px-3 py-2 rounded border border-border/50 bg-card hover:border-primary/30 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/loads/${l.id}`)}
                                  >
                                    <span className="font-mono text-xs text-muted-foreground">{formatBatchId(l.loadNumber, l.reloadingCycle)}</span>
                                    <span className="text-xs text-muted-foreground w-16">{l.date}</span>
                                    <span className="font-mono text-xs text-muted-foreground">{l.cartridgeQuantityUsed} rds</span>
                                    <span className={cn(
                                      "text-xs font-semibold px-2 py-0.5 rounded",
                                      l.fired ? "bg-amber-900/40 text-amber-300" : l.completed ? "bg-green-900/40 text-green-300" : "bg-blue-900/40 text-blue-300"
                                    )}>
                                      {l.fired ? "Fired" : l.completed ? "Completed" : "Active"}
                                    </span>
                                    {l.firedDate && <span className="text-xs text-muted-foreground">Fired: {l.firedDate}</span>}
                                    <span className="text-muted-foreground text-xs ml-auto">View →</span>
                                  </div>
                                ))}
                              </div>
                              {firedLoads.length > 0 && (
                                <button
                                  className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                                  onClick={() => toggleShowFired(c.id)}
                                >
                                  {showFired ? "Hide fired loads" : `Show ${firedLoads.length} fired load${firedLoads.length > 1 ? "s" : ""}`}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Cartridge Batch</DialogTitle></DialogHeader>
          <CartridgeFormFields form={form} setForm={setForm} showStep={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Cartridge Batch</DialogTitle></DialogHeader>
          <CartridgeFormFields form={form} setForm={setForm} showStep={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cartridge batch?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CartridgeFormFields({ form, setForm, showStep }: { form: CartridgeForm; setForm: (f: CartridgeForm) => void; showStep: boolean }) {
  const set = (key: keyof CartridgeForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  const photoRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
          <RefCombobox category="cartridge_manufacturer" value={form.manufacturer} onValueChange={(v) => setForm({ ...form, manufacturer: v })} />
        </div>
        <div className="space-y-1">
          <Label>Caliber</Label>
          <RefCombobox category="caliber" value={form.caliber} onValueChange={(v) => setForm({ ...form, caliber: v })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Production Charge</Label><Input value={form.productionCharge} onChange={set("productionCharge")} /></div>
        <div className="space-y-1"><Label>Total Quantity</Label><Input type="number" value={form.quantityTotal} onChange={set("quantityTotal")} /></div>
      </div>
      {showStep && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Current Step</Label>
            <Select value={form.currentStep} onValueChange={(v) => setForm({ ...form, currentStep: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["New","Fired","Washing","Calibration","Trim","Second Washing","Priming","Powder","Bullet Seating","Completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>L6 (in)</Label><Input value={form.l6In} onChange={set("l6In")} /></div>
        </div>
      )}
      <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} /></div>
      <div className="space-y-1.5">
        <Label>Photo (optional)</Label>
        {form.photoBase64 ? (
          <div className="flex items-center gap-3">
            <img src={form.photoBase64} alt="Cartridge" className="w-16 h-16 object-cover rounded border border-border" />
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

      <div className="border-t border-border pt-3">
        <button
          type="button"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-90")} />
          Ballistic &amp; Identification Fields (optional)
        </button>
        {showAdvanced && (
          <div className="mt-3 grid gap-3">
            <div className="space-y-1">
              <Label>Primer Type</Label>
              <RefCombobox category="primer_type" value={form.primerType} onValueChange={(v) => setForm({ ...form, primerType: v })} placeholder="e.g. Large Rifle (LR)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Avg Empty Weight (gr)</Label><Input type="number" step="0.1" value={form.avgEmptyWeightGr} onChange={set("avgEmptyWeightGr")} /></div>
              <div className="space-y-1"><Label>Avg Internal Volume (gr H₂O)</Label><Input type="number" step="0.1" value={form.avgInternalVolumeGr} onChange={set("avgInternalVolumeGr")} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Shoulder Dia. (in)</Label><Input type="number" step="0.001" value={form.avgShoulderDiameterIn} onChange={set("avgShoulderDiameterIn")} /></div>
              <div className="space-y-1"><Label>Base Dia. (in)</Label><Input type="number" step="0.001" value={form.avgBaseDiameterIn} onChange={set("avgBaseDiameterIn")} /></div>
              <div className="space-y-1"><Label>Neck Wall Thickness (in)</Label><Input type="number" step="0.0001" value={form.avgNeckWallThicknessIn} onChange={set("avgNeckWallThicknessIn")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>AMP Aztec Code</Label><Input value={form.ampAztecCode} onChange={set("ampAztecCode")} /></div>
              <div className="space-y-1"><Label>AMP Pilot Number</Label><Input value={form.ampPilotNumber} onChange={set("ampPilotNumber")} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
