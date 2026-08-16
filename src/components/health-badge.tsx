import { Badge } from "@/components/ui/badge";
import type { HealthStatus } from "@/lib/deal-math";

const map: Record<
  HealthStatus,
  "health-green" | "health-yellow" | "health-red" | "health-unknown"
> = {
  green: "health-green",
  yellow: "health-yellow",
  red: "health-red",
  unknown: "health-unknown",
};

export function HealthBadge({ health }: { health: HealthStatus }) {
  return (
    <Badge variant={map[health]} className="uppercase tracking-wide">
      {health}
    </Badge>
  );
}
