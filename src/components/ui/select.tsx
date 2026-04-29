"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2",
        "text-sm text-gray-900 cursor-pointer",
        "ring-offset-white transition-all duration-150",
        "hover:border-gray-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:border-indigo-500",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        "appearance-none bg-no-repeat bg-right",
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 12px center",
        paddingRight: "36px",
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
export { Select };
