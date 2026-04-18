import { useGetReloadHistory, getGetReloadHistoryQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function History() {
  const { data: history = [], isLoading } = useGetReloadHistory({ query: { queryKey: getGetReloadHistoryQueryKey() } });

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Reload History</h1>
        <p className="text-sm text-muted-foreground">Summary per cartridge batch</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No history yet. Create and complete loads to see history.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Cart. ID","Caliber","Manufacturer","Times Fired","Loads Completed","Total Rounds Reloaded"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <motion.tr
                  key={h.cartridgeId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{h.cartridgeId}</td>
                  <td className="px-3 py-2.5 font-semibold">{h.caliber}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{h.manufacturer}</td>
                  <td className="px-3 py-2.5 font-mono text-center">{h.timesFired}</td>
                  <td className="px-3 py-2.5 font-mono text-center text-green-400">{h.loadsCompleted}</td>
                  <td className="px-3 py-2.5 font-mono text-center font-semibold text-primary">{h.totalRoundsReloaded}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
