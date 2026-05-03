"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const OPT_TABS = [
  { label: "Overview",    href: "/dashboard/opt" },
  { label: "OPT Steps",   href: "/dashboard/opt/timeline" },
  { label: "STEM Steps",  href: "/dashboard/opt/stem-timeline" },
  { label: "H-1B",        href: "/dashboard/opt/h1b" },
  { label: "Calculator",  href: "/dashboard/opt/calculator" },
  { label: "I-983 Guide", href: "/dashboard/opt/i983" },
];

export default function OPTLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700">
        {OPT_TABS.map((tab) => {
          const active = tab.href === "/dashboard/opt"
            ? pathname === "/dashboard/opt"
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
