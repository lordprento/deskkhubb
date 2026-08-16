import { Badge } from "@/components/ui/badge";
import type { HealthStatus } from "@/lib/deal-math";
import { cn } from "@/lib/utils";

const healthStyles: Record<HealthStatus, string> = {
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  unknown: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function HealthBadge({ health }: { health: HealthStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("uppercase tracking-wide", healthStyles[health])}
    >
      {health}
    </Badge>
  );
}
