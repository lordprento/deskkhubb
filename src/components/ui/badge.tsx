import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "outline" | "health-green" | "health-yellow" | "health-red" | "health-unknown";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default: "bg-slate-900 text-stone-50",
    secondary: "bg-stone-200 text-stone-800",
    outline: "border border-stone-300 text-stone-700",
    "health-green": "bg-emerald-600 text-white",
    "health-yellow": "bg-amber-500 text-stone-900",
    "health-red": "bg-red-700 text-white",
    "health-unknown": "bg-stone-300 text-stone-700",
  };
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
