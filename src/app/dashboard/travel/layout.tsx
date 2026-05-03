"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TRAVEL_TABS = [
  { label: "Tracker",              href: "/dashboard/travel" },
  { label: "Pre-Travel Checklist", href: "/dashboard/travel/checklist" },
];

export default function TravelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700">
        {TRAVEL_TABS.map((tab) => {
          const active = tab.href === "/dashboard/travel"
            ? pathname === "/dashboard/travel"
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                active
                  ? "border-orange-500 text-orange-600 dark:text-orange-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
