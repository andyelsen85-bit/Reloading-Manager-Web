import { useState, useRef } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey, useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetUserPassword, getListUsersQueryKey, useListReferenceData, getListReferenceDataQueryKey, useCreateReferenceItem, useDeleteReferenceItem, useUpdateReferenceItem } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Save, Upload, X, Image, Hash, Mail, Users, List, Send, History, Download, HardDriveDownload, RotateCcw, Pencil, Trash2, Plus, Eye, EyeOff, ToggleLeft, ToggleRight, BadgeCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function ImageUpload({ label, value, onChange, onClear, hint }: { label: string; value: string | null | undefined; onChange: (b64: string) => void; onClear: () => void; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt={label} className="w-16 h-16 object-contain rounded border border-border bg-muted" />
          <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onClear}><X className="w-4 h-4" /> Remove</Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => ref.current?.click()}>
          <Image className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Click to upload image</p>
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF supported</p>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Reference List Editor ──────────────────────────────────────
const REFERENCE_CATEGORIES = [
  { key: "caliber", label: "Calibers" },
  { key: "cartridge_manufacturer", label: "Cartridge Manufacturers" },
  { key: "bullet_manufacturer", label: "Bullet Manufacturers" },
  { key: "powder_manufacturer", label: "Powder Manufacturers" },
  { key: "primer_manufacturer", label: "Primer Manufacturers" },
  { key: "powder_type", label: "Powder Types" },
  { key: "primer_type", label: "Primer Types" },
];

function ReferenceListEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("caliber");
  const [newValue, setNewValue] = useState("");
  const [editItem, setEditItem] = useState<{ id: number; value: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const qKey = getListReferenceDataQueryKey(activeCategory);
  const { data: items = [], isLoading } = useListReferenceData(activeCategory, { query: { queryKey: qKey } });
  const createMutation = useCreateReferenceItem();
  const updateMutation = useUpdateReferenceItem();
  const deleteMutation = useDeleteReferenceItem();

  const invalidate = () => qc.invalidateQueries({ queryKey: qKey });

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    await createMutation.mutateAsync({ category: activeCategory, data: { value: newValue.trim(), sortOrder: items.length * 10 } });
    invalidate(); setNewValue("");
    toast({ title: "Added" });
  };

  const handleEdit = async () => {
    if (!editItem || !editValue.trim()) return;
    await updateMutation.mutateAsync({ category: activeCategory, id: editItem.id, data: { value: editValue.trim() } });
    invalidate(); setEditItem(null);
    toast({ title: "Updated" });
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ category: activeCategory, id });
    invalidate();
    toast({ title: "Deleted" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {REFERENCE_CATEGORIES.map((cat) => (
          <Button key={cat.key} size="sm" variant={activeCategory === cat.key ? "default" : "outline"} onClick={() => setActiveCategory(cat.key)} className="text-xs h-7">
            {cat.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder={`Add ${REFERENCE_CATEGORIES.find((c) => c.key === activeCategory)?.label.slice(0, -1)}...`} value={newValue} onChange={(e) => setNewValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="flex-1" />
        <Button onClick={handleAdd} disabled={!newValue.trim() || createMutation.isPending}><Plus className="w-4 h-4" /></Button>
      </div>
      {isLoading ? (
        <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-card hover:bg-muted/20 transition-colors">
              <span className="flex-1 text-sm text-foreground">{item.value}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem({ id: item.id, value: item.value }); setEditValue(item.value); }}><Pencil className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">No items yet.</p>}
        </div>
      )}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEdit()} />
          <DialogFooter><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button onClick={handleEdit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── User Management ────────────────────────────────────────────
function UserManagement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: users = [], isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();

  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user", notificationsEnabled: true });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleAdd = async () => {
    if (!form.username || !form.email || !form.password) { toast({ title: "All fields required", variant: "destructive" }); return; }
    await createUser.mutateAsync({ data: { username: form.username, email: form.email, password: form.password, role: form.role, notificationsEnabled: form.notificationsEnabled } });
    invalidate(); setAddOpen(false); setForm({ username: "", email: "", password: "", role: "user", notificationsEnabled: true });
    toast({ title: "User created" });
  };

  const handleToggle = async (id: number, active: boolean) => {
    await updateUser.mutateAsync({ id, data: { active } });
    invalidate();
  };

  const handleReset = async () => {
    if (!resetOpen || !newPassword) return;
    await resetPassword.mutateAsync({ id: resetOpen, data: { newPassword } });
    setResetOpen(null); setNewPassword("");
    toast({ title: "Password reset" });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteUser.mutateAsync({ id: deleteId });
    invalidate(); setDeleteId(null);
    toast({ title: "User deleted" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Add User</Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">No users yet. Add the first user to enable authentication.</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{u.username}</span>
                  <Badge variant="outline" className="text-xs">{u.role}</Badge>
                  {!u.active && <Badge variant="outline" className="text-xs bg-destructive/20 text-destructive border-destructive/50">Inactive</Badge>}
                  {u.notificationsEnabled && <Mail className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setResetOpen(u.id); setNewPassword(""); }}>Reset PW</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title={u.active ? "Deactivate" : "Activate"} onClick={() => handleToggle(u.id, !u.active)}>
                  {u.active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add User</DialogTitle><DialogDescription>Create a new user account.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div className="space-y-1"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="user">User</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-9" />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.notificationsEnabled} onCheckedChange={(c) => setForm({ ...form, notificationsEnabled: c })} />
              <Label className="text-sm font-normal">Email notifications enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createUser.isPending}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetOpen} onOpenChange={(o) => !o && setResetOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>New Password (min 6 chars)</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(null)}>Cancel</Button>
            <Button onClick={handleReset} disabled={!newPassword || resetPassword.isPending}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete user?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────────
export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateMutation = useUpdateSettings();

  const [bulletThreshold, setBulletThreshold] = useState("");
  const [powderThreshold, setPowderThreshold] = useState("");
  const [primerThreshold, setPrimerThreshold] = useState("");
  const [nextLoadNumber, setNextLoadNumber] = useState("");
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [background, setBackground] = useState<string | null | undefined>(undefined);

  const [smtp, setSmtp] = useState({ host: "", port: "", user: "", pass: "", from: "", enabled: false, loaded: false });
  const [testMailTo, setTestMailTo] = useState("");
  const [testMailBusy, setTestMailBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  const { data: mailHistory, refetch: refetchHistory } = useQuery<any[]>({
    queryKey: ["mail-history"],
    queryFn: async () => {
      const res = await fetch("/api/settings/mail-history", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch mail history");
      return res.json();
    },
    initialData: [],
  });

  const { data: auditLog = [], refetch: refetchAudit } = useQuery<any[]>({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const res = await fetch("/api/auth/audit-log", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const defaultPrefs = { loadCreated: true, loadCompleted: true, loadFired: true, lowStock: true };
  const { data: notifPrefs, refetch: refetchPrefs } = useQuery<typeof defaultPrefs>({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const res = await fetch("/api/auth/notification-prefs", { credentials: "include" });
      if (!res.ok) return defaultPrefs;
      return res.json();
    },
    initialData: defaultPrefs,
  });
  const [localPrefs, setLocalPrefs] = useState<typeof defaultPrefs | null>(null);
  const prefs = localPrefs ?? notifPrefs ?? defaultPrefs;

  const handleSavePrefs = async () => {
    await fetch("/api/auth/notification-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(prefs),
    });
    await refetchPrefs();
    setLocalPrefs(null);
    toast({ title: "Notification preferences saved" });
  };

  if (settings && !smtp.loaded) {
    setSmtp({ host: settings.smtpHost ?? "", port: String(settings.smtpPort ?? 587), user: settings.smtpUser ?? "", pass: settings.smtpPass ?? "", from: settings.smtpFrom ?? "", enabled: settings.smtpEnabled ?? false, loaded: true });
  }

  const handleTestMail = async () => {
    if (!testMailTo) return;
    setTestMailBusy(true);
    try {
      const res = await fetch("/api/settings/test-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: testMailTo }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Test email sent", description: `Email sent to ${testMailTo}` });
        refetchHistory();
      } else {
        toast({ title: "Failed to send", description: data.error, variant: "destructive" });
      }
    } finally {
      setTestMailBusy(false);
    }
  };

  const handleDownloadBackup = async () => {
    const res = await fetch("/api/backup", { credentials: "include" });
    if (!res.ok) { toast({ title: "Backup failed", variant: "destructive" }); return; }
    const blob = await res.blob();
    const filename = `reloading-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup downloaded", description: filename });
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let data: any;
    try { data = JSON.parse(text); } catch { toast({ title: "Invalid file", description: "Not a valid JSON backup", variant: "destructive" }); return; }
    if (!window.confirm("This will REPLACE all your data with the backup. Are you sure?")) return;
    setRestoreBusy(true);
    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        toast({ title: "Restore complete", description: "Data has been restored from backup" });
        qc.invalidateQueries();
      } else {
        toast({ title: "Restore failed", description: result.error, variant: "destructive" });
      }
    } finally {
      setRestoreBusy(false);
      if (restoreRef.current) restoreRef.current.value = "";
    }
  };

  const current = {
    bulletThreshold: bulletThreshold !== "" ? Number(bulletThreshold) : settings?.bulletLowStockThreshold ?? 100,
    powderThreshold: powderThreshold !== "" ? Number(powderThreshold) : settings?.powderLowStockThreshold ?? 500,
    primerThreshold: primerThreshold !== "" ? Number(primerThreshold) : settings?.primerLowStockThreshold ?? 100,
    nextLoadNumber: nextLoadNumber !== "" ? Number(nextLoadNumber) : settings?.nextLoadNumber ?? 1,
    logo: logo !== undefined ? logo : settings?.logoBase64,
    background: background !== undefined ? background : settings?.backgroundBase64,
  };

  const handleSaveGeneral = async () => {
    await updateMutation.mutateAsync({ data: { bulletLowStockThreshold: current.bulletThreshold, powderLowStockThreshold: current.powderThreshold, primerLowStockThreshold: current.primerThreshold, nextLoadNumber: current.nextLoadNumber, logoBase64: current.logo ?? null, backgroundBase64: current.background ?? null } });
    qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    setBulletThreshold(""); setPowderThreshold(""); setPrimerThreshold(""); setNextLoadNumber(""); setLogo(undefined); setBackground(undefined);
    toast({ title: "Settings saved" });
  };

  const handleSaveSmtp = async () => {
    await updateMutation.mutateAsync({ data: { smtpHost: smtp.host || null, smtpPort: smtp.port ? Number(smtp.port) : null, smtpUser: smtp.user || null, smtpPass: smtp.pass || null, smtpFrom: smtp.from || null, smtpEnabled: smtp.enabled } });
    qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    toast({ title: "Mail server settings saved" });
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure thresholds, users, mail server, and reference lists</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="gap-1.5 text-xs"><Hash className="w-3.5 h-3.5" /> General</TabsTrigger>
          <TabsTrigger value="mail" className="gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> Mail</TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 text-xs"><HardDriveDownload className="w-3.5 h-3.5" /> Backup</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="lists" className="gap-1.5 text-xs"><List className="w-3.5 h-3.5" /> Lists</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs"><ShieldCheck className="w-3.5 h-3.5" /> Audit</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Inventory Health Thresholds</CardTitle>
              <p className="text-xs text-muted-foreground">Low stock warnings appear on the dashboard when quantities fall below these values</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>Bullets (units)</Label><Input type="number" value={bulletThreshold || String(settings?.bulletLowStockThreshold ?? 100)} onChange={(e) => setBulletThreshold(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Powder (grains)</Label><Input type="number" value={powderThreshold || String(settings?.powderLowStockThreshold ?? 500)} onChange={(e) => setPowderThreshold(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Primers (units)</Label><Input type="number" value={primerThreshold || String(settings?.primerLowStockThreshold ?? 100)} onChange={(e) => setPrimerThreshold(e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Hash className="w-4 h-4" /> Load Numbering</CardTitle>
              <p className="text-xs text-muted-foreground">New loads will be assigned sequential numbers starting from this value</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5 flex-1 max-w-xs"><Label>Next Load Number</Label><Input type="number" min={1} value={nextLoadNumber || String(settings?.nextLoadNumber ?? 1)} onChange={(e) => setNextLoadNumber(e.target.value)} /></div>
                <div className="pt-6"><p className="text-sm text-muted-foreground">Next load: <span className="font-mono font-bold text-foreground">#{String(current.nextLoadNumber).padStart(5, "0")}</span></p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Branding</CardTitle>
              <p className="text-xs text-muted-foreground">Customize the app's appearance with your own logo and background</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload label="Logo" hint="Shown in the sidebar header. Best results with square images." value={current.logo} onChange={(b64) => setLogo(b64)} onClear={() => setLogo(null)} />
              <ImageUpload label="Background Image" hint="Applied as a full-screen background. Works best with dark, subtle textures." value={current.background} onChange={(b64) => setBackground(b64)} onClear={() => setBackground(null)} />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={handleSaveGeneral} disabled={updateMutation.isPending} className="gap-2"><Save className="w-4 h-4" /> Save Settings</Button>
          </div>
        </TabsContent>

        {/* Mail Tab */}
        <TabsContent value="mail" className="space-y-4 mt-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> Mail Server (SMTP)</CardTitle>
              <p className="text-xs text-muted-foreground">Email notifications are sent when loads are created or inventory is low</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={smtp.enabled} onCheckedChange={(c) => setSmtp({ ...smtp, enabled: c })} />
                <Label className="text-sm font-normal">Enable email notifications</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>SMTP Host</Label><Input placeholder="smtp.gmail.com" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Port</Label><Input type="number" placeholder="587" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Username</Label><Input placeholder="user@example.com" value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={smtp.pass} onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>From Address</Label><Input placeholder="reloading@example.com" value={smtp.from} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={handleSaveSmtp} disabled={updateMutation.isPending} className="gap-2"><Save className="w-4 h-4" /> Save Mail Settings</Button>
          </div>

          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Send className="w-4 h-4" /> Test Email</CardTitle>
              <p className="text-xs text-muted-foreground">Send a test message to verify your SMTP settings are working</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input type="email" placeholder="test@example.com" value={testMailTo} onChange={(e) => setTestMailTo(e.target.value)} className="flex-1" />
                <Button onClick={handleTestMail} disabled={testMailBusy || !testMailTo} className="gap-2 shrink-0">
                  <Send className="w-4 h-4" />{testMailBusy ? "Sending…" : "Send Test"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> My Notification Preferences</CardTitle>
              <p className="text-xs text-muted-foreground">Choose which events send you an email (requires email to be set on your account)</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["loadCreated", "loadCompleted", "loadFired", "lowStock"] as const).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={(c) => setLocalPrefs({ ...prefs, [key]: c })}
                  />
                  <Label className="text-sm font-normal">
                    {key === "loadCreated" ? "New load created" :
                     key === "loadCompleted" ? "Load completed (inventory deducted)" :
                     key === "loadFired" ? "Load marked as fired" :
                     "Low inventory alerts"}
                  </Label>
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={handleSavePrefs} className="gap-2 h-8 text-xs">
                  <Save className="w-3.5 h-3.5" /> Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Mail History</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Last 100 emails sent by the system</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => refetchHistory()}>
                <Download className="w-3 h-3" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {(!mailHistory || mailHistory.length === 0) ? (
                <p className="text-xs text-muted-foreground px-6 pb-4">No emails sent yet.</p>
              ) : (
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {mailHistory.map((row: any) => (
                    <div key={row.id} className="px-6 py-2.5 flex items-start gap-3">
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${row.status === "sent" ? "bg-green-500" : "bg-destructive"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium truncate">{row.subject}</span>
                          <span className="text-xs text-muted-foreground">→ {row.toAddress}</span>
                        </div>
                        {row.error && <p className="text-xs text-destructive mt-0.5">{row.error}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(row.sentAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4 mt-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Download className="w-4 h-4" /> Download Backup</CardTitle>
              <p className="text-xs text-muted-foreground">Download a full JSON backup of all your data — cartridges, bullets, powders, primers, loads, settings, and charge ladders</p>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadBackup} className="gap-2">
                <HardDriveDownload className="w-4 h-4" /> Download Backup
              </Button>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Restore from Backup</CardTitle>
              <p className="text-xs text-muted-foreground text-amber-500 font-medium">Warning: this will replace all existing data with the backup. This cannot be undone.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
              <Button variant="outline" onClick={() => restoreRef.current?.click()} disabled={restoreBusy} className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
                <Upload className="w-4 h-4" />{restoreBusy ? "Restoring…" : "Choose Backup File"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> User Management</CardTitle>
              <p className="text-xs text-muted-foreground">Manage accounts. Users with notifications enabled receive email alerts.</p>
            </CardHeader>
            <CardContent><UserManagement /></CardContent>
          </Card>
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="mt-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><List className="w-4 h-4" /> Reference Lists</CardTitle>
              <p className="text-xs text-muted-foreground">Manage calibers and manufacturer lists used in forms throughout the app</p>
            </CardHeader>
            <CardContent><ReferenceListEditor /></CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border-card-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Login Audit Log</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Last 200 login and logout events across all users</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => refetchAudit()}>
                <Download className="w-3 h-3" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {auditLog.length === 0 ? (
                <p className="text-xs text-muted-foreground px-6 pb-4">No login events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date & Time</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">User</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Event</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {auditLog.map((row: any) => (
                        <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            {" "}
                            {new Date(row.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td className="px-4 py-2 font-medium">{row.username}</td>
                          <td className="px-4 py-2">
                            {row.action === "login_success" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">Login</span>
                            )}
                            {row.action === "login_failure" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">Failed login</span>
                            )}
                            {row.action === "logout" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Logout</span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono text-muted-foreground">{row.ipAddress ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
