import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crosshair, Loader2 } from "lucide-react";
import { useGetSettings } from "@workspace/api-client-react";

export default function Login() {
  const { login } = useAuth();
  const { data: settings } = useGetSettings({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4"
      style={settings?.backgroundBase64 ? {
        backgroundImage: `url(${settings.backgroundBase64})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}
    >
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
              <p className="text-sm text-muted-foreground">Sign in to continue</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && username && password && !loading) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{error}</p>
            )}
            <Button type="submit" className="w-full gap-2" disabled={loading || !username || !password}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
