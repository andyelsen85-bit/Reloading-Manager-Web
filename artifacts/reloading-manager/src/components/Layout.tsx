import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard, CircleDot, Crosshair, Flame, Zap, ClipboardList,
  History, Menu, X, Settings, LogOut, User, ChevronDown, Bell, BellOff, Users, PackageOpen, Shield, BookOpen,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useGetSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

function buildNav(isAdmin: boolean) {
  const items = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cartridges", label: "Cartridges", icon: CircleDot },
    { href: "/bullets", label: "Bullets", icon: Crosshair },
    { href: "/powders", label: "Powders", icon: Flame },
    { href: "/primers", label: "Primers", icon: Zap },
    { href: "/loads", label: "Loads", icon: ClipboardList },
    { href: "/buy-in", label: "Buy-In", icon: PackageOpen },
    { href: "/history", label: "History", icon: History },
    { href: "/weapons", label: "Weapons", icon: Shield },
    { href: "/licenses", label: "Licenses", icon: BookOpen },
  ];
  if (isAdmin) {
    items.push({ href: "/users", label: "Users", icon: Users });
    items.push({ href: "/settings", label: "Settings", icon: Settings });
  }
  return items;
}

function UserMenuDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout, refresh } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [email, setEmail] = useState(user?.email ?? "");
  const [notif, setNotif] = useState(user?.notificationsEnabled ?? true);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || null, notificationsEnabled: notif }),
      });
      if (!res.ok) throw new Error("Failed");
      await refresh();
      toast({ title: "Profile updated" });
      onClose();
    } catch {
      toast({ title: "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (newPw !== confirmPw) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (newPw.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Password changed" });
      setNewPw(""); setConfirmPw("");
      onClose();
    } catch {
      toast({ title: "Failed to change password", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" /> My Account
          </DialogTitle>
          <DialogDescription>Manage your profile and password</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 border-b border-border pb-2 mb-3">
          <button className={cn("px-3 py-1.5 text-sm rounded transition-colors", tab === "profile" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setTab("profile")}>Profile</button>
          <button className={cn("px-3 py-1.5 text-sm rounded transition-colors", tab === "password" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setTab("password")}>Password</button>
        </div>
        {tab === "profile" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={user?.username ?? ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
              {notif ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              <div className="flex-1">
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts for low stock and completed loads</p>
              </div>
              <button
                onClick={() => setNotif(!notif)}
                className={cn("w-10 h-5 rounded-full transition-colors relative", notif ? "bg-primary" : "bg-muted")}
              >
                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", notif ? "left-5.5 translate-x-0" : "left-0.5")} style={{ left: notif ? "calc(100% - 18px)" : "2px" }} />
              </button>
            </div>
          </div>
        )}
        {tab === "password" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { logout(); onClose(); }} className="gap-1.5 mr-auto text-destructive border-destructive/30 hover:bg-destructive/10">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={tab === "profile" ? handleSaveProfile : handleChangePassword} disabled={saving}>
            {tab === "profile" ? "Save" : "Change Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: settings } = useGetSettings({});
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const nav = buildNav(isAdmin);

  return (
    <div
      className="flex min-h-screen bg-background"
      style={settings?.backgroundBase64 ? {
        backgroundImage: `url(${settings.backgroundBase64})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      } : undefined}
    >
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            {settings?.logoBase64 ? (
              <img src={settings.logoBase64} alt="Logo" className="w-7 h-7 rounded object-contain" />
            ) : (
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Crosshair className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            <span className="text-sm font-semibold tracking-wide text-sidebar-foreground">
              Reloading Manager
            </span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors cursor-pointer",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                         : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => setUserMenuOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <Crosshair className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">Reloading Manager</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setUserMenuOpen(true)} className="text-sidebar-foreground">
            <User className="w-5 h-5" />
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-sidebar pt-12">
          <nav className="p-3 space-y-0.5">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href}>
                  <div
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-colors cursor-pointer",
                      active ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                               : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto md:p-6 p-4 pt-16 md:pt-6">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {children}
        </motion.div>
      </main>

      <UserMenuDialog open={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
    </div>
  );
}
