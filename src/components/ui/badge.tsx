import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "critical" | "warning" | "info" | "success" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-indigo-100 text-indigo-600 border-indigo-300",
    critical: "bg-red-600/20 text-red-600 border-red-600/30",
    warning: "bg-amber-600/20 text-amber-600 border-amber-600/30",
    info: "bg-blue-600/20 text-blue-600 border-blue-600/30",
    success: "bg-emerald-600/20 text-emerald-600 border-emerald-600/30",
    outline: "border-gray-200 text-gray-500",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
