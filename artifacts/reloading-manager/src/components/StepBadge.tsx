import { cn } from "@/lib/utils";

const STEP_COLORS: Record<string, string> = {
  New: "bg-slate-600 text-slate-200",
  Fired: "bg-orange-700 text-orange-100",
  Washing: "bg-blue-700 text-blue-100",
  Calibration: "bg-purple-700 text-purple-100",
  Trim: "bg-yellow-700 text-yellow-100",
  "Second Washing": "bg-cyan-700 text-cyan-100",
  Priming: "bg-pink-700 text-pink-100",
  Powder: "bg-amber-600 text-amber-100",
  "Bullet Seating": "bg-teal-700 text-teal-100",
  Completed: "bg-green-700 text-green-100",
};

export default function StepBadge({ step }: { step: string }) {
  const classes = STEP_COLORS[step] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium", classes)}>
      {step}
    </span>
  );
}
