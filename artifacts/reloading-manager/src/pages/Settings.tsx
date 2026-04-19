import { useState, useRef } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey, useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetUserPassword, getListUsersQueryKey, useListReferenceData, getListReferenceDataQueryKey, useCreateReferenceItem, useDeleteReferenceItem, useUpdateReferenceItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Save, Upload, X, Image, Hash, Mail, Users, List, ShieldCheck, Pencil, Trash2, Plus, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";
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

  if (settings && !smtp.loaded) {
    setSmtp({ host: settings.smtpHost ?? "", port: String(settings.smtpPort ?? 587), user: settings.smtpUser ?? "", pass: settings.smtpPass ?? "", from: settings.smtpFrom ?? "", enabled: settings.smtpEnabled ?? false, loaded: true });
  }

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-1.5 text-xs"><Hash className="w-3.5 h-3.5" /> General</TabsTrigger>
          <TabsTrigger value="mail" className="gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> Mail</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="lists" className="gap-1.5 text-xs"><List className="w-3.5 h-3.5" /> Lists</TabsTrigger>
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
      </Tabs>
    </motion.div>
  );
}
