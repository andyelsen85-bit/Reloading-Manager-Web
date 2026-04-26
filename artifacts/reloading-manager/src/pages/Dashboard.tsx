import { useGetDashboardOverview, getGetDashboardOverviewQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { AlertTriangle, Download, Boxes, Crosshair, Flame, Zap, ClipboardList, CheckCircle, Circle, Target, ChevronRight, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const [, navigate] = useLocation();
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
      <Card
        className={cn("border-card-border transition-colors", href && "cursor-pointer hover:border-primary/40 hover:bg-muted/20")}
        onClick={href ? () => navigate(href) : undefined}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          {href && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatBatchId(loadNumber: number | null | undefined, cycle: number | null | undefined) {
  const batch = loadNumber != null ? String(loadNumber).padStart(5, "0") : "00000";
  const cyc = cycle != null ? String(cycle).padStart(3, "0") : "001";
  return `#${batch}-${cyc}`;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: overview, isLoading } = useGetDashboardOverview({
    query: { queryKey: getGetDashboardOverviewQueryKey() },
  });

  const handleExport = async () => {
    try {
      const res = await fetch("/api/dashboard/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reloading-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const hasLowStock =
    (overview?.lowStockBullets?.length ?? 0) > 0 ||
    (overview?.lowStockPowders?.length ?? 0) > 0 ||
    (overview?.lowStockPrimers?.length ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Reloading Manager Overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export JSON
        </Button>
      </div>

      {/* Inventory counts */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Cartridge Batches" value={overview?.cartridgeBatches ?? 0} icon={Boxes} color="bg-slate-700 text-slate-200" href="/cartridges" />
          <StatCard label="Bullet Types" value={overview?.bulletTypes ?? 0} icon={Crosshair} color="bg-amber-800 text-amber-200" href="/bullets" />
          <StatCard label="Powder Types" value={overview?.powderTypes ?? 0} icon={Flame} color="bg-orange-800 text-orange-200" href="/powders" />
          <StatCard label="Primer Types" value={overview?.primerTypes ?? 0} icon={Zap} color="bg-yellow-800 text-yellow-200" href="/primers" />
        </div>
      </div>

      {/* Load stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Load Records</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Loads" value={overview?.loadRecords ?? 0} icon={ClipboardList} color="bg-blue-800 text-blue-200" href="/loads" />
          <StatCard label="Active" value={overview?.activeLoads ?? 0} icon={Circle} color="bg-slate-700 text-slate-200" href="/loads" />
          <StatCard label="Completed" value={overview?.completedLoads ?? 0} icon={CheckCircle} color="bg-green-800 text-green-200" href="/loads" />
          <StatCard label="Fired" value={overview?.firedLoads ?? 0} icon={Target} color="bg-red-800 text-red-200" href="/history" />
        </div>
      </div>

      {/* Ready to fire */}
      {(() => {
        const rtf = (overview as any)?.readyToFireByCaliber as { caliber: string; fromLoads: number; fromBuyIn: number; total: number }[] | undefined;
        const total = (overview as any)?.totalReadyToFire as number | undefined;
        if (!rtf || rtf.length === 0) return null;
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-green-400" />
                Ready to Fire
                <span className="ml-1 px-1.5 py-0.5 rounded bg-green-900/50 text-green-300 font-mono text-xs">{total ?? 0} total</span>
              </h2>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/buy-in")}>
                Buy-In <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Card className="border-green-700/30">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Caliber", "Reloads (completed)", "Buy-In", "Total"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rtf.map((row, i) => (
                      <tr key={row.caliber} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i === rtf.length - 1 ? "border-0" : ""}`}>
                        <td className="px-4 py-2.5 font-semibold text-foreground">{row.caliber}</td>
                        <td className="px-4 py-2.5 font-mono text-blue-300">{row.fromLoads}</td>
                        <td className="px-4 py-2.5 font-mono text-purple-300 flex items-center gap-1.5">
                          <PackageOpen className="w-3.5 h-3.5 text-muted-foreground" />{row.fromBuyIn}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-green-400">{row.total}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Recent loads */}
      {(overview?.recentLoads?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Loads</h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/loads")}>
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Card className="border-card-border">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Load #", "Caliber", "Qty", "Date", "Status", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview!.recentLoads.map((l, i) => (
                    <tr
                      key={l.id}
                      className={cn(
                        "border-b border-border/50 transition-colors cursor-pointer",
                        l.fired ? "bg-amber-950/10 hover:bg-amber-950/20" :
                        l.completed ? "bg-green-950/10 hover:bg-green-950/20" :
                        "hover:bg-muted/20",
                        i === (overview!.recentLoads.length - 1) && "border-0"
                      )}
                      onClick={() => navigate(`/loads/${l.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold">{formatBatchId(l.loadNumber, l.reloadingCycle)}</td>
                      <td className="px-4 py-2.5">{l.caliber}</td>
                      <td className="px-4 py-2.5 font-mono">{l.cartridgeQuantityUsed}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.date}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-xs font-medium",
                          l.fired ? "text-amber-400" :
                          l.completed ? "text-green-400" :
                          "text-muted-foreground"
                        )}>
                          {l.fired ? "Fired" : l.completed ? "Completed" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Low stock */}
      {hasLowStock && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Low Stock Warnings
          </h2>
          <Card className="border-amber-600/30 bg-amber-950/20">
            <CardContent className="p-4 space-y-3">
              {(overview?.lowStockBullets?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">Bullets (below threshold)</p>
                  <div className="space-y-1">
                    {overview!.lowStockBullets.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between text-sm cursor-pointer hover:text-primary"
                        onClick={() => navigate("/bullets")}
                      >
                        <span className="text-foreground">{b.manufacturer} {b.model}</span>
                        <span className="font-mono text-amber-400">{b.quantityAvailable} remaining</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(overview?.lowStockPowders?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">Powders (below threshold)</p>
                  <div className="space-y-1">
                    {overview!.lowStockPowders.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm cursor-pointer hover:text-primary"
                        onClick={() => navigate("/powders")}
                      >
                        <span className="text-foreground">{p.manufacturer} {p.name}</span>
                        <span className="font-mono text-amber-400">{p.grainsAvailable.toFixed(1)} gr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(overview?.lowStockPrimers?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">Primers (below threshold)</p>
                  <div className="space-y-1">
                    {overview!.lowStockPrimers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm cursor-pointer hover:text-primary"
                        onClick={() => navigate("/primers")}
                      >
                        <span className="text-foreground">{p.manufacturer} {p.type}</span>
                        <span className="font-mono text-amber-400">{p.quantityAvailable} remaining</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!hasLowStock && overview && (
        <Card className="border-green-700/30 bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm text-green-300">All inventory levels are healthy.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
