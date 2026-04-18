import { useGetDashboardOverview, useGetReloadHistory, useExportData, getGetDashboardOverviewQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { AlertTriangle, Download, Boxes, Crosshair, Flame, Zap, ClipboardList, CheckCircle, Circle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
      <Card className="border-card-border">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
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
          <StatCard label="Cartridge Batches" value={overview?.cartridgeBatches ?? 0} icon={Boxes} color="bg-slate-700 text-slate-200" />
          <StatCard label="Bullet Types" value={overview?.bulletTypes ?? 0} icon={Crosshair} color="bg-amber-800 text-amber-200" />
          <StatCard label="Powder Types" value={overview?.powderTypes ?? 0} icon={Flame} color="bg-orange-800 text-orange-200" />
          <StatCard label="Primer Types" value={overview?.primerTypes ?? 0} icon={Zap} color="bg-yellow-800 text-yellow-200" />
        </div>
      </div>

      {/* Load stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Load Records</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Loads" value={overview?.loadRecords ?? 0} icon={ClipboardList} color="bg-blue-800 text-blue-200" />
          <StatCard label="Active" value={overview?.activeLoads ?? 0} icon={Circle} color="bg-slate-700 text-slate-200" />
          <StatCard label="Completed" value={overview?.completedLoads ?? 0} icon={CheckCircle} color="bg-green-800 text-green-200" />
          <StatCard label="Fired" value={overview?.firedLoads ?? 0} icon={Target} color="bg-red-800 text-red-200" />
        </div>
      </div>

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
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">Bullets (&lt; 100 units)</p>
                  <div className="space-y-1">
                    {overview!.lowStockBullets.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{b.manufacturer} {b.model}</span>
                        <span className="font-mono text-amber-400">{b.quantityAvailable} remaining</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(overview?.lowStockPowders?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">Powders (&lt; 500 grains)</p>
                  <div className="space-y-1">
                    {overview!.lowStockPowders.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{p.manufacturer} {p.name}</span>
                        <span className="font-mono text-amber-400">{p.grainsAvailable.toFixed(1)} gr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(overview?.lowStockPrimers?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">Primers (&lt; 100 units)</p>
                  <div className="space-y-1">
                    {overview!.lowStockPrimers.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
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
