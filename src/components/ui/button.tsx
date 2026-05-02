"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium " +
      "transition-all duration-150 " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 " +
      "disabled:pointer-events-none disabled:opacity-50 " +
      "active:scale-[0.98]";

    const variants = {
      default:     "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 shadow-sm shadow-orange-200/60",
      destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
      outline:     "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 active:bg-gray-100 dark:active:bg-gray-600 shadow-sm",
      ghost:       "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700",
      link:        "text-orange-600 underline-offset-4 hover:underline hover:text-orange-700 p-0 h-auto",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm:      "h-8 rounded-md px-3 text-xs",
      lg:      "h-12 px-8 text-base rounded-xl",
      icon:    "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{children}</span>
          </>
        ) : children}
      </button>
    );
  }
);
Button.displayName = "Button";
export { Button };
