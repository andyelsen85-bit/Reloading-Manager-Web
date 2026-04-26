import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Search, Camera, X,
  BookOpen, CalendarClock, AlertTriangle, CheckCircle2, Clock,
  Shield, FileText, ImagePlus, Tag,
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

type LicensePhoto = { id: number; licenseId: number; photoBase64: string; caption: string | null; sortOrder: number };
type LicenseWeapon = { id: number; name: string; manufacturer: string; type: string; caliber: string | null; serialNumber: string | null };
type License = {
  id: number; name: string; licenseNumber: string | null; licenseType: string | null;
  issueDate: string | null; expiryDate: string | null; notes: string | null;
  createdAt: string; photos: LicensePhoto[]; weapons: LicenseWeapon[];
};
type LicenseForm = {
  name: string; licenseNumber: string; licenseType: string;
  issueDate: string; expiryDate: string; notes: string; weaponIds: number[];
};
type Weapon = { id: number; name: string; manufacturer: string; type: string; caliber: string | null; sold: boolean };

const emptyLicenseForm: LicenseForm = {
  name: "", licenseNumber: "", licenseType: "",
  issueDate: "", expiryDate: "", notes: "", weaponIds: [],
};

function getExpiryStatus(expiryDate: string | null): { label: string; cls: string; icon: React.ElementType } | null {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: "Expired", cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertTriangle };
  if (diffDays <= 60) return { label: `Expires in ${diffDays}d`, cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock };
  return { label: "Valid", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 };
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function PhotoHoverCell({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  if (!src) return null;

  const PREVIEW = 320;
  const OFFSET = 16;

  const getStyle = (x: number, y: number): React.CSSProperties => {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const left = x + OFFSET + PREVIEW > vpW ? x - PREVIEW - OFFSET : x + OFFSET;
    const top = Math.min(Math.max(y - PREVIEW / 2, 8), vpH - PREVIEW - 8);
    return { left, top, width: PREVIEW, height: PREVIEW };
  };

  return (
    <div
      className="relative"
      onMouseEnter={(e) => { setHovered(true); setPos({ x: e.clientX, y: e.clientY }); }}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={src} alt={alt}
        className="w-8 h-8 object-cover rounded border border-border cursor-zoom-in"
        onClick={() => { const w = window.open(); if (w) { w.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${src}" style="max-width:none" /></body>`); w.document.close(); } }}
      />
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[200] pointer-events-none rounded-xl border-2 border-primary shadow-2xl overflow-hidden bg-black"
            style={getStyle(pos.x, pos.y)}
          >
            <img src={src} alt={alt} className="w-full h-full object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
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

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => { await onAdd(reader.result as string); resolve(); };
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
            <img src={p.photoBase64} alt={`Photo ${p.id}`}
              className="w-20 h-20 object-cover rounded border border-border cursor-zoom-in hover:border-primary/50 transition-colors"
              onClick={() => { const w = window.open(); if (w) { w.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${p.photoBase64}" style="max-width:none" /></body>`); w.document.close(); } }} />
            <button onClick={() => setDeletePhotoId(p.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-20 h-20 rounded border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-foreground">
          {uploading ? <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /> : <><Camera className="w-5 h-5" /><span className="text-xs">Add</span></>}
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

    </div>
  );
}

function LicenseFormFields({ form, setForm, weapons, licenseTypes }: {
  form: LicenseForm; setForm: (f: LicenseForm) => void;
  weapons: Weapon[]; licenseTypes: string[];
}) {
  const set = (key: keyof LicenseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
        <div className="space-y-1.5">
          <Label>License Number</Label>
          <Input placeholder="e.g. FL-1234567" value={form.licenseNumber} onChange={set("licenseNumber")} />
        </div>
        <div className="space-y-1.5">
          <Label>License Type</Label>
          <select
            value={form.licenseType}
            onChange={set("licenseType")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Select type —</option>
            {licenseTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
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
                <button key={w.id} type="button" onClick={() => toggleWeapon(w.id)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium border transition-colors",
                    selected
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                  )}>
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
    licenseType: form.licenseType || null,
    issueDate: form.issueDate || null,
    expiryDate: form.expiryDate || null,
    notes: form.notes || null,
    weaponIds: form.weaponIds,
  };
}

const LICENSE_TYPE_COLORS: Record<string, string> = {
  "National": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "European": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "International": "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function Licenses() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: licenses = [], isLoading } = useQuery<License[]>({
    queryKey: ["weapon-licenses"],
    queryFn: async () => {
      const res = await fetch(`${API}/weapon-licenses`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load licenses");
      return res.json();
    },
  });

  const { data: weapons = [] } = useQuery<Weapon[]>({
    queryKey: ["weapons"],
    queryFn: async () => {
      const res = await fetch(`${API}/weapons`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: licenseTypeItems = [] } = useQuery<{ id: number; value: string }[]>({
    queryKey: ["reference", "license_type"],
    queryFn: async () => {
      const res = await fetch(`${API}/reference/license_type`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const licenseTypes = licenseTypeItems.map((i) => i.value);

  const createMutation = useMutation({
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

  const updateMutation = useMutation({
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/weapon-licenses/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weapon-licenses"] }); toast({ title: "License deleted" }); },
    onError: () => toast({ title: "Failed to delete license", variant: "destructive" }),
  });

  const addPhotoMutation = useMutation({
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

  const deletePhotoMutation = useMutation({
    mutationFn: async ({ licenseId, photoId }: { licenseId: number; photoId: number }) => {
      const res = await fetch(`${API}/weapon-licenses/${licenseId}/photos/${photoId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weapon-licenses"] }),
    onError: () => toast({ title: "Failed to delete photo", variant: "destructive" }),
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<License | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<LicenseForm>(emptyLicenseForm);

  const filtered = licenses.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) ||
      (l.licenseNumber ?? "").toLowerCase().includes(q) ||
      (l.licenseType ?? "").toLowerCase().includes(q) ||
      l.weapons.some((w) => w.name.toLowerCase().includes(q));
    const matchType = typeFilter === "All" || l.licenseType === typeFilter;
    return matchSearch && matchType;
  });

  const handleAdd = async () => {
    if (!form.name) { toast({ title: "License name is required", variant: "destructive" }); return; }
    await createMutation.mutateAsync(form);
    setAddOpen(false); setForm(emptyLicenseForm);
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, data: form });
    setEditItem(null); setForm(emptyLicenseForm);
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEdit = (lic: License) => {
    setEditItem(lic);
    setForm({
      name: lic.name, licenseNumber: lic.licenseNumber ?? "",
      licenseType: lic.licenseType ?? "",
      issueDate: lic.issueDate ?? "", expiryDate: lic.expiryDate ?? "",
      notes: lic.notes ?? "", weaponIds: lic.weapons.map((w) => w.id),
    });
  };

  const allTypes = [...new Set(licenses.map((l) => l.licenseType).filter(Boolean) as string[])];

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Licenses & Permits
          </h1>
          <p className="text-sm text-muted-foreground">{licenses.length} license{licenses.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Button size="sm" onClick={() => { setForm(emptyLicenseForm); setAddOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add License
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, number, type, weapon…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {(licenseTypes.length > 0 || allTypes.length > 0) && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Types</option>
            {[...new Set([...licenseTypes, ...allTypes])].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
          {licenses.length === 0 ? "No licenses registered yet." : "No licenses match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((lic, i) => {
            const expiry = getExpiryStatus(lic.expiryDate);
            const ExpiryIcon = expiry?.icon;
            const typeCls = lic.licenseType ? (LICENSE_TYPE_COLORS[lic.licenseType] ?? "bg-muted/30 text-muted-foreground border-border") : null;
            return (
              <motion.div
                key={lic.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(lic)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(lic.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {lic.licenseType && typeCls && (
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", typeCls)}>
                      <Tag className="w-3 h-3" /> {lic.licenseType}
                    </span>
                  )}
                  {expiry && ExpiryIcon && (
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", expiry.cls)}>
                      <ExpiryIcon className="w-3 h-3" /> {expiry.label}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {lic.issueDate && (
                    <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Issued: {lic.issueDate}</span>
                  )}
                  {lic.expiryDate && (
                    <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Expires: {lic.expiryDate}</span>
                  )}
                </div>

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
                      <PhotoHoverCell key={p.id} src={p.photoBase64} alt="License photo" />
                    ))}
                  </div>
                )}

                {lic.notes && (
                  <p className="text-xs text-muted-foreground italic line-clamp-2">{lic.notes}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Add License</DialogTitle></DialogHeader>
          <LicenseFormFields form={form} setForm={setForm} weapons={weapons} licenseTypes={licenseTypes} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Add License</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Edit License</DialogTitle></DialogHeader>
          <LicenseFormFields form={form} setForm={setForm} weapons={weapons} licenseTypes={licenseTypes} />
          {editItem && (
            <PhotoGallery
              onAdd={(photoBase64) => addPhotoMutation.mutateAsync({ id: editItem.id, photoBase64 })}
              onDelete={(photoId) => deletePhotoMutation.mutateAsync({ licenseId: editItem.id, photoId })}
              photos={licenses.find((l) => l.id === editItem.id)?.photos ?? []}
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
            <AlertDialogTitle>Delete license?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the license and all its photos. This cannot be undone.</AlertDialogDescription>
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
