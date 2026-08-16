import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?:
      | "default"
      | "secondary"
      | "outline"
      | "health-green"
      | "health-yellow"
      | "health-red"
      | "health-unknown";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default: "border-transparent bg-sky-500/20 text-sky-300",
    secondary: "border-transparent bg-white/10 text-slate-200",
    outline: "border border-white/15 bg-transparent text-slate-200",
    "health-green":
      "border border-green-500/30 bg-green-500/20 text-green-400",
    "health-yellow":
      "border border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
    "health-red": "border border-red-500/30 bg-red-500/20 text-red-400",
    "health-unknown":
      "border border-slate-500/30 bg-slate-500/20 text-slate-400",
  };
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-all",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
