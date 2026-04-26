import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Search, Camera, X,
  Shield, Tag, DollarSign, FileText, ImagePlus,
  BookOpen, CalendarClock, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

const WEAPON_TYPES = ["Pistol", "Revolver", "Rifle", "Shotgun", "Silencer / Suppressor", "Air Gun", "Crossbow", "Other"];
const ACTION_TYPES = ["Semi-Automatic", "Bolt Action", "Lever Action", "Pump Action", "Single Shot", "Break Action", "Revolver", "Full Auto", "Other"];
const TYPE_COLORS: Record<string, string> = {
  "Pistol": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Revolver": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Rifle": "bg-green-500/15 text-green-400 border-green-500/30",
  "Shotgun": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Silencer / Suppressor": "bg-gray-500/15 text-gray-400 border-gray-500/30",
  "Air Gun": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Crossbow": "bg-red-500/15 text-red-400 border-red-500/30",
  "Other": "bg-muted text-muted-foreground border-border",
};

type WeaponPhoto = { id: number; weaponId: number; photoBase64: string; caption: string | null; sortOrder: number };
type Weapon = {
  id: number; name: string; manufacturer: string; model: string | null; type: string;
  caliber: string | null; serialNumber: string | null; actionType: string | null;
  barrelLengthIn: number | null; weightKg: number | null; color: string | null;
  countryOfOrigin: string | null; buyDate: string | null; buyPrice: number | null;
  buyFrom: string | null; sold: boolean; sellDate: string | null; sellPrice: number | null;
  soldTo: string | null; soldNotes: string | null; notes: string | null;
  createdAt: string; photos: WeaponPhoto[];
};

type WeaponForm = {
  name: string; manufacturer: string; model: string; type: string; caliber: string;
  serialNumber: string; actionType: string; barrelLengthIn: string; weightKg: string;
  color: string; countryOfOrigin: string; buyDate: string; buyPrice: string;
  buyFrom: string; sold: boolean; sellDate: string; sellPrice: string;
  soldTo: string; soldNotes: string; notes: string;
};

const emptyForm: WeaponForm = {
  name: "", manufacturer: "", model: "", type: "Pistol", caliber: "",
  serialNumber: "", actionType: "", barrelLengthIn: "", weightKg: "",
  color: "", countryOfOrigin: "", buyDate: "", buyPrice: "",
  buyFrom: "", sold: false, sellDate: "", sellPrice: "",
  soldTo: "", soldNotes: "", notes: "",
};

type LicensePhoto = { id: number; licenseId: number; photoBase64: string; caption: string | null; sortOrder: number };
type LicenseWeapon = { id: number; name: string; manufacturer: string; type: string; caliber: string | null; serialNumber: string | null };
type License = {
  id: number; name: string; licenseNumber: string | null;
  issueDate: string | null; expiryDate: string | null; notes: string | null;
  createdAt: string; photos: LicensePhoto[]; weapons: LicenseWeapon[];
};
type LicenseForm = { name: string; licenseNumber: string; issueDate: string; expiryDate: string; notes: string; weaponIds: number[] };
const emptyLicenseForm: LicenseForm = { name: "", licenseNumber: "", issueDate: "", expiryDate: "", notes: "", weaponIds: [] };

function getExpiryStatus(expiryDate: string | null): { label: string; cls: string; icon: React.ElementType } | null {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: "Expired", cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertTriangle };
  if (diffDays <= 60) return { label: `Expires in ${diffDays}d`, cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock };
  return { label: "Valid", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 };
}

function PhotoHoverCell({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  if (!src) {
    return (
      <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
        <Camera className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div
      className="relative inline-block"
      onMouseEnter={(e) => { setPos({ x: e.clientX, y: e.clientY }); setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
    >
      <img src={src} alt={alt} className="w-10 h-10 object-cover rounded border border-border cursor-zoom-in" />
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{ left: pos.x + 16, top: pos.y + 16 }}
          >
            <img src={src} alt={alt} className="max-w-[320px] max-h-[320px] object-contain rounded-lg border border-border shadow-2xl bg-background" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] ?? TYPE_COLORS["Other"];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", cls)}>
      {type}
    </span>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 pb-1 border-b border-border/50">
      <Icon className="w-3.5 h-3.5" />
      {title}
    </div>
  );
}

export default function Weapons() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: weapons = [], isLoading } = useQuery<Weapon[]>({
    queryKey: ["weapons"],
    queryFn: async () => {
      const res = await fetch(`${API}/weapons`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load weapons");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WeaponForm) => {
      const res = await fetch(`${API}/weapons`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(data)),
      });
      if (!res.ok) throw new Error("Failed to create weapon");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weapons"] }); toast({ title: "Weapon added" }); },
    onError: () => toast({ title: "Failed to add weapon", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WeaponForm }) => {
      const res = await fetch(`${API}/weapons/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(data)),
      });
      if (!res.ok) throw new Error("Failed to update weapon");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weapons"] }); toast({ title: "Weapon updated" }); },
    onError: () => toast({ title: "Failed to update weapon", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/weapons/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete weapon");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weapons"] }); toast({ title: "Weapon deleted" }); },
    onError: () => toast({ title: "Failed to delete weapon", variant: "destructive" }),
  });

  const addPhotoMutation = useMutation({
    mutationFn: async ({ id, photoBase64, caption }: { id: number; photoBase64: string; caption?: string }) => {
      const res = await fetch(`${API}/weapons/${id}/photos`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoBase64, caption: caption ?? null }),
      });
      if (!res.ok) throw new Error("Failed to add photo");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weapons"] }),
    onError: () => toast({ title: "Failed to upload photo", variant: "destructive" }),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async ({ weaponId, photoId }: { weaponId: number; photoId: number }) => {
      const res = await fetch(`${API}/weapons/${weaponId}/photos/${photoId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weapons"] }),
    onError: () => toast({ title: "Failed to delete photo", variant: "destructive" }),
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "owned" | "sold">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Weapon | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<WeaponForm>(emptyForm);

  const filtered = weapons.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch = !q || w.name.toLowerCase().includes(q) || w.manufacturer.toLowerCase().includes(q) ||
      (w.model ?? "").toLowerCase().includes(q) || (w.caliber ?? "").toLowerCase().includes(q) ||
      (w.serialNumber ?? "").toLowerCase().includes(q);
    const matchType = typeFilter === "All" || w.type === typeFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "owned" ? !w.sold : w.sold);
    return matchSearch && matchType && matchStatus;
  });

  const handleAdd = async () => {
    if (!form.name || !form.manufacturer || !form.type) {
      toast({ title: "Name, Manufacturer and Type are required", variant: "destructive" }); return;
    }
    await createMutation.mutateAsync(form);
    setAddOpen(false); setForm(emptyForm);
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, data: form });
    setEditItem(null); setForm(emptyForm);
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEdit = (w: Weapon) => {
    setEditItem(w);
    setForm({
      name: w.name, manufacturer: w.manufacturer, model: w.model ?? "", type: w.type,
      caliber: w.caliber ?? "", serialNumber: w.serialNumber ?? "", actionType: w.actionType ?? "",
      barrelLengthIn: w.barrelLengthIn != null ? String(w.barrelLengthIn) : "",
      weightKg: w.weightKg != null ? String(w.weightKg) : "",
      color: w.color ?? "", countryOfOrigin: w.countryOfOrigin ?? "",
      buyDate: w.buyDate ?? "", buyPrice: w.buyPrice != null ? String(w.buyPrice) : "",
      buyFrom: w.buyFrom ?? "", sold: w.sold,
      sellDate: w.sellDate ?? "", sellPrice: w.sellPrice != null ? String(w.sellPrice) : "",
      soldTo: w.soldTo ?? "", soldNotes: w.soldNotes ?? "", notes: w.notes ?? "",
    });
  };

  const ownedCount = weapons.filter((w) => !w.sold).length;
  const soldCount = weapons.filter((w) => w.sold).length;

  const { data: licenses = [], isLoading: licensesLoading } = useQuery<License[]>({
    queryKey: ["weapon-licenses"],
    queryFn: async () => {
      const res = await fetch(`${API}/weapon-licenses`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load licenses");
      return res.json();
    },
  });

  const createLicenseMutation = useMutation({
    mutationFn: async (data: LicenseForm) => {
      const res = await fetch(`${API}/weapon-licenses`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toLicensePayload(data)),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weapon-licenses"] }); toast({ title: "License added" }); },
    onError: () => toast({ title: "Failed to add license", variant: "destructive" }),
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LicenseForm }) => {
      const res = await fetch(`${API}/weapon-licenses/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toLicensePayload(data)),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weapon-licenses"] }); toast({ title: "License updated" }); },
    onError: () => toast({ title: "Failed to update license", variant: "destructive" }),
  });

  const deleteLicenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/weapon-licenses/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weapon-licenses"] }); toast({ title: "License deleted" }); },
    onError: () => toast({ title: "Failed to delete license", variant: "destructive" }),
  });

  const addLicensePhotoMutation = useMutation({
    mutationFn: async ({ id, photoBase64 }: { id: number; photoBase64: string }) => {
      const res = await fetch(`${API}/weapon-licenses/${id}/photos`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoBase64, caption: null }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weapon-licenses"] }),
    onError: () => toast({ title: "Failed to upload photo", variant: "destructive" }),
  });

  const deleteLicensePhotoMutation = useMutation({
    mutationFn: async ({ licenseId, photoId }: { licenseId: number; photoId: number }) => {
      const res = await fetch(`${API}/weapon-licenses/${licenseId}/photos/${photoId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weapon-licenses"] }),
    onError: () => toast({ title: "Failed to delete photo", variant: "destructive" }),
  });

  const [addLicenseOpen, setAddLicenseOpen] = useState(false);
  const [editLicense, setEditLicense] = useState<License | null>(null);
  const [deleteLicenseId, setDeleteLicenseId] = useState<number | null>(null);
  const [licenseForm, setLicenseForm] = useState<LicenseForm>(emptyLicenseForm);

  const handleAddLicense = async () => {
    if (!licenseForm.name) { toast({ title: "License name is required", variant: "destructive" }); return; }
    await createLicenseMutation.mutateAsync(licenseForm);
    setAddLicenseOpen(false); setLicenseForm(emptyLicenseForm);
  };

  const handleEditLicense = async () => {
    if (!editLicense) return;
    await updateLicenseMutation.mutateAsync({ id: editLicense.id, data: licenseForm });
    setEditLicense(null); setLicenseForm(emptyLicenseForm);
  };

  const handleDeleteLicense = async () => {
    if (deleteLicenseId == null) return;
    await deleteLicenseMutation.mutateAsync(deleteLicenseId);
    setDeleteLicenseId(null);
  };

  const openEditLicense = (lic: License) => {
    setEditLicense(lic);
    setLicenseForm({
      name: lic.name, licenseNumber: lic.licenseNumber ?? "",
      issueDate: lic.issueDate ?? "", expiryDate: lic.expiryDate ?? "",
      notes: lic.notes ?? "", weaponIds: lic.weapons.map((w) => w.id),
    });
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Weapons Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {ownedCount} owned · {soldCount} sold · {weapons.length} total
          </p>
        </div>
        <Button size="sm" onClick={() => { setForm(emptyForm); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Weapon
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, manufacturer, caliber, serial…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="All">All Types</option>
          {WEAPON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex rounded-md border border-input overflow-hidden">
          {(["all", "owned", "sold"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-2 text-sm transition-colors capitalize", statusFilter === s ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
          No weapons found.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Photo</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name / Model</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manufacturer</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caliber</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Serial #</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purchased</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <motion.tr
                  key={w.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <PhotoHoverCell src={w.photos[0]?.photoBase64} alt={w.name} />
                      {w.photos.length > 1 && (
                        <span className="self-end text-xs text-muted-foreground pb-0.5">+{w.photos.length - 1}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><TypeBadge type={w.type} /></td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-foreground">{w.name}</span>
                    {w.model && <span className="text-xs text-muted-foreground ml-1.5">{w.model}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{w.manufacturer}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{w.caliber ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{w.serialNumber ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">
                    {w.buyDate ?? "—"}
                    {w.buyPrice != null && <span className="block font-mono">{w.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {w.sold ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-red-500/15 text-red-400 border-red-500/30">Sold</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Owned</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(w.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> Add Weapon</DialogTitle></DialogHeader>
          <WeaponFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add Weapon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> Edit Weapon</DialogTitle></DialogHeader>
          <WeaponFormFields form={form} setForm={setForm} />

          {editItem && (
            <PhotoGallery
              onAdd={(photoBase64) => addPhotoMutation.mutateAsync({ id: editItem.id, photoBase64 })}
              onDelete={(photoId) => deletePhotoMutation.mutateAsync({ weaponId: editItem.id, photoId })}
              photos={weapons.find((w) => w.id === editItem.id)?.photos ?? []}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete weapon?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the weapon and all its photos. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Licenses Section ─────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Licenses & Permits
            </h2>
            <p className="text-sm text-muted-foreground">{licenses.length} license{licenses.length !== 1 ? "s" : ""} registered</p>
          </div>
          <Button size="sm" onClick={() => { setLicenseForm(emptyLicenseForm); setAddLicenseOpen(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add License
          </Button>
        </div>

        {licensesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
            No licenses registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {licenses.map((lic, i) => {
              const expiry = getExpiryStatus(lic.expiryDate);
              const ExpiryIcon = expiry?.icon;
              return (
                <motion.div
                  key={lic.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{lic.name}</p>
                      {lic.licenseNumber && (
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">#{lic.licenseNumber}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLicense(lic)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteLicenseId(lic.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {lic.issueDate && (
                      <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Issued: {lic.issueDate}</span>
                    )}
                    {lic.expiryDate && (
                      <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Expires: {lic.expiryDate}</span>
                    )}
                  </div>

                  {expiry && ExpiryIcon && (
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", expiry.cls)}>
                      <ExpiryIcon className="w-3 h-3" /> {expiry.label}
                    </span>
                  )}

                  {lic.weapons.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Covered Weapons</p>
                      <div className="flex flex-wrap gap-1">
                        {lic.weapons.map((w) => (
                          <span key={w.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-muted/30 border-border text-foreground">
                            <Shield className="w-3 h-3 text-muted-foreground" /> {w.name}
                            {w.caliber && <span className="text-muted-foreground">· {w.caliber}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {lic.photos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lic.photos.map((p) => (
                        <PhotoHoverCell key={p.id} src={p.photoBase64} alt="License" />
                      ))}
                    </div>
                  )}

                  {lic.notes && (
                    <p className="text-xs text-muted-foreground italic truncate">{lic.notes}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* License dialogs */}
      <Dialog open={addLicenseOpen} onOpenChange={setAddLicenseOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Add License</DialogTitle></DialogHeader>
          <LicenseFormFields form={licenseForm} setForm={setLicenseForm} weapons={weapons} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLicenseOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLicense} disabled={createLicenseMutation.isPending}>Add License</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLicense} onOpenChange={(o) => !o && setEditLicense(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Edit License</DialogTitle></DialogHeader>
          <LicenseFormFields form={licenseForm} setForm={setLicenseForm} weapons={weapons} />
          {editLicense && (
            <PhotoGallery
              onAdd={(photoBase64) => addLicensePhotoMutation.mutateAsync({ id: editLicense.id, photoBase64 })}
              onDelete={(photoId) => deleteLicensePhotoMutation.mutateAsync({ licenseId: editLicense.id, photoId })}
              photos={licenses.find((l) => l.id === editLicense.id)?.photos ?? []}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLicense(null)}>Cancel</Button>
            <Button onClick={handleEditLicense} disabled={updateLicenseMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteLicenseId != null} onOpenChange={(o) => !o && setDeleteLicenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete license?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the license and all its photos. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLicense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WeaponFormFields({ form, setForm }: { form: WeaponForm; setForm: (f: WeaponForm) => void }) {
  const set = (key: keyof WeaponForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });
  return (
    <div className="space-y-4 py-1">
      <SectionHeader icon={Shield} title="Identification" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Name <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. Glock 17 Gen5" value={form.name} onChange={set("name")} />
        </div>
        <div className="space-y-1.5">
          <Label>Manufacturer <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. Glock" value={form.manufacturer} onChange={set("manufacturer")} />
        </div>
        <div className="space-y-1.5">
          <Label>Model</Label>
          <Input placeholder="e.g. Gen5 MOS" value={form.model} onChange={set("model")} />
        </div>
        <div className="space-y-1.5">
          <Label>Type <span className="text-destructive">*</span></Label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {WEAPON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Action Type</Label>
          <select
            value={form.actionType}
            onChange={(e) => setForm({ ...form, actionType: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Select —</option>
            {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Caliber</Label>
          <Input placeholder="e.g. 9mm, .308 Win" value={form.caliber} onChange={set("caliber")} />
        </div>
        <div className="space-y-1.5">
          <Label>Serial Number</Label>
          <Input placeholder="e.g. ABC123456" value={form.serialNumber} onChange={set("serialNumber")} />
        </div>
        <div className="space-y-1.5">
          <Label>Barrel Length (in)</Label>
          <Input type="number" step="0.1" placeholder="e.g. 4.49" value={form.barrelLengthIn} onChange={set("barrelLengthIn")} />
        </div>
        <div className="space-y-1.5">
          <Label>Weight (kg)</Label>
          <Input type="number" step="0.01" placeholder="e.g. 0.625" value={form.weightKg} onChange={set("weightKg")} />
        </div>
        <div className="space-y-1.5">
          <Label>Color / Finish</Label>
          <Input placeholder="e.g. Black, FDE, Grey" value={form.color} onChange={set("color")} />
        </div>
        <div className="space-y-1.5">
          <Label>Country of Origin</Label>
          <Input placeholder="e.g. Austria" value={form.countryOfOrigin} onChange={set("countryOfOrigin")} />
        </div>
      </div>

      <SectionHeader icon={DollarSign} title="Purchase Details" />
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Buy Date</Label>
          <Input type="date" value={form.buyDate} onChange={set("buyDate")} />
        </div>
        <div className="space-y-1.5">
          <Label>Buy Price</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.buyPrice} onChange={set("buyPrice")} />
        </div>
        <div className="space-y-1.5">
          <Label>Purchased From</Label>
          <Input placeholder="Dealer / seller name" value={form.buyFrom} onChange={set("buyFrom")} />
        </div>
      </div>

      <SectionHeader icon={Tag} title="Sale Details" />
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
          <div className="flex-1">
            <p className="text-sm font-medium">Mark as Sold</p>
            <p className="text-xs text-muted-foreground">Enable to record sale information</p>
          </div>
          <button
            type="button"
            onClick={() => { const v = !form.sold; setForm({ ...form, sold: v }); }}
            className={cn("w-10 h-5 rounded-full transition-colors relative shrink-0", form.sold ? "bg-red-500" : "bg-muted")}
          >
            <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all")} style={{ left: form.sold ? "calc(100% - 18px)" : "2px" }} />
          </button>
        </div>
        <AnimatePresence>
          {form.sold && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Sell Date</Label>
                  <Input type="date" value={form.sellDate} onChange={set("sellDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sell Price</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.sellPrice} onChange={set("sellPrice")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sold To</Label>
                  <Input placeholder="Buyer name" value={form.soldTo} onChange={set("soldTo")} />
                </div>
                <div className="space-y-1.5 col-span-3">
                  <Label>Sale Notes</Label>
                  <Textarea placeholder="Any notes about the sale…" value={form.soldNotes} onChange={set("soldNotes")} className="resize-none h-16" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SectionHeader icon={FileText} title="Notes" />
      <Textarea placeholder="General notes, modifications, accessories…" value={form.notes} onChange={set("notes")} className="resize-none h-20" />
    </div>
  );
}

function PhotoGallery({
  photos, onAdd, onDelete,
}: {
  photos: Array<{ id: number; photoBase64: string }>;
  onAdd: (photoBase64: string) => Promise<unknown>;
  onDelete: (photoId: number) => Promise<unknown>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          await onAdd(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [onAdd]);

  return (
    <div className="space-y-2">
      <SectionHeader icon={ImagePlus} title={`Photos (${photos.length})`} />
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative group">
            <img
              src={p.photoBase64}
              alt={`Photo ${p.id}`}
              className="w-20 h-20 object-cover rounded border border-border cursor-zoom-in hover:border-primary/50 transition-colors"
              onClick={() => setLightbox(p.photoBase64)}
            />
            <button
              onClick={() => setDeletePhotoId(p.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-foreground"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="text-xs">Add</span>
            </>
          )}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />

      <AlertDialog open={deletePhotoId != null} onOpenChange={(o) => !o && setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this photo?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deletePhotoId) { await onDelete(deletePhotoId); setDeletePhotoId(null); } }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={lightbox} alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LicenseFormFields({ form, setForm, weapons }: {
  form: LicenseForm; setForm: (f: LicenseForm) => void; weapons: Weapon[];
}) {
  const set = (key: keyof LicenseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });
  const toggleWeapon = (id: number) => {
    const ids = form.weaponIds.includes(id) ? form.weaponIds.filter((x) => x !== id) : [...form.weaponIds, id];
    setForm({ ...form, weaponIds: ids });
  };
  return (
    <div className="space-y-4 py-1">
      <SectionHeader icon={BookOpen} title="License Details" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>License Name <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. Firearms License A" value={form.name} onChange={set("name")} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>License Number</Label>
          <Input placeholder="e.g. FL-1234567" value={form.licenseNumber} onChange={set("licenseNumber")} />
        </div>
        <div className="space-y-1.5">
          <Label>Issue Date</Label>
          <Input type="date" value={form.issueDate} onChange={set("issueDate")} />
        </div>
        <div className="space-y-1.5">
          <Label>Expiry Date</Label>
          <Input type="date" value={form.expiryDate} onChange={set("expiryDate")} />
        </div>
      </div>
      {weapons.length > 0 && (
        <>
          <SectionHeader icon={Shield} title="Covered Weapons" />
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
            {weapons.map((w) => {
              const selected = form.weaponIds.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWeapon(w.id)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium border transition-colors",
                    selected
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {w.name}{w.caliber ? ` · ${w.caliber}` : ""}
                </button>
              );
            })}
          </div>
        </>
      )}
      <SectionHeader icon={FileText} title="Notes" />
      <Textarea placeholder="Additional notes…" value={form.notes} onChange={set("notes")} className="resize-none h-16" />
    </div>
  );
}

function toLicensePayload(form: LicenseForm) {
  return {
    name: form.name,
    licenseNumber: form.licenseNumber || null,
    issueDate: form.issueDate || null,
    expiryDate: form.expiryDate || null,
    notes: form.notes || null,
    weaponIds: form.weaponIds,
  };
}

function toPayload(form: WeaponForm) {
  return {
    name: form.name,
    manufacturer: form.manufacturer,
    model: form.model || null,
    type: form.type,
    caliber: form.caliber || null,
    serialNumber: form.serialNumber || null,
    actionType: form.actionType || null,
    barrelLengthIn: form.barrelLengthIn ? Number(form.barrelLengthIn) : null,
    weightKg: form.weightKg ? Number(form.weightKg) : null,
    color: form.color || null,
    countryOfOrigin: form.countryOfOrigin || null,
    buyDate: form.buyDate || null,
    buyPrice: form.buyPrice ? Number(form.buyPrice) : null,
    buyFrom: form.buyFrom || null,
    sold: form.sold,
    sellDate: form.sellDate || null,
    sellPrice: form.sellPrice ? Number(form.sellPrice) : null,
    soldTo: form.soldTo || null,
    soldNotes: form.soldNotes || null,
    notes: form.notes || null,
  };
}
