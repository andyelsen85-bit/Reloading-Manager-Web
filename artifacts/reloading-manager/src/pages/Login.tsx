import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crosshair, Loader2, Eye, EyeOff } from "lucide-react";
import { useGetSettings } from "@workspace/api-client-react";

type Mode = "login" | "setup";

export default function Login() {
  const { login } = useAuth();
  const { data: settings } = useGetSettings({});
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    fetch("/api/auth/setup-status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup) setMode("setup");
      })
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Setup failed");
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.message ?? "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = settings?.backgroundBase64
    ? { backgroundImage: `url(${settings.backgroundBase64})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={bgStyle}>
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg space-y-6">
          <div className="flex flex-col items-center gap-3">
            {settings?.logoBase64 ? (
              <img src={settings.logoBase64} alt="Logo" className="w-12 h-12 rounded object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                <Crosshair className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">Reloading Manager</h1>
              {mode === "setup" ? (
                <p className="text-sm text-muted-foreground">Create your admin password</p>
              ) : (
                <p className="text-sm text-muted-foreground">Sign in to continue</p>
              )}
            </div>
          </div>

          {mode === "setup" ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
                First-time setup: create a password for the <strong>admin</strong> account.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPw ? "text" : "password"}
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="At least 6 characters"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Re-enter password"
                    className="pr-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password && confirmPassword && !loading) {
                        e.preventDefault();
                        handleSetup(e as unknown as React.FormEvent);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{error}</p>
              )}
              <Button type="submit" className="w-full gap-2" disabled={loading || !password || !confirmPassword}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Password &amp; Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && username && password && !loading) {
                        e.preventDefault();
                        handleLogin(e as unknown as React.FormEvent);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{error}</p>
              )}
              <Button type="submit" className="w-full gap-2" disabled={loading || !username || !password}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
