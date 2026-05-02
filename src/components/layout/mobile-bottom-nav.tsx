"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarClock, Briefcase, FolderOpen, Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/deadlines", label: "Deadlines", icon: CalendarClock, exact: false },
  { href: "/dashboard/opt", label: "Work Auth", icon: Briefcase, exact: false },
  { href: "/dashboard/documents", label: "Records", icon: FolderOpen, exact: false },
];

export function MobileBottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const pathname = usePathname();
  const isAI = pathname.startsWith("/dashboard/ai");

  return (
    <>
      {/* Floating AI button — always above the nav bar */}
      <Link
        href="/dashboard/ai"
        className={cn(
          "fixed right-4 z-40 lg:hidden",
          "w-14 h-14 rounded-full flex items-center justify-center",
          "shadow-lg transition-transform active:scale-95",
          isAI
            ? "bg-indigo-700 shadow-indigo-500/50"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/40",
        )}
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 10px)" }}
        aria-label="AI Assistant"
      >
        <Sparkles className="w-6 h-6 text-white" />
        {!isAI && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-orange-400 rounded-full border-2 border-white dark:border-gray-900" />
        )}
      </Link>

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around h-14">
          {TABS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  active
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "scale-110 transition-transform")} />
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </Link>
            );
          })}

          <button
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
