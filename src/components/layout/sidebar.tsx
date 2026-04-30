"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Route, CalendarClock, Briefcase, ListChecks,
  FlaskConical, ClipboardList, Building2, Calculator, FileText,
  BookOpen, Plane, ClipboardCheck, FolderOpen, Receipt, Mail,
  Sparkles, MessageCircle, ArrowLeftRight, CalendarDays, Newspaper,
  BookMarked, ShieldAlert, LogOut, GraduationCap, X, Sun, Moon,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; top?: boolean };
type NavSection = { label: string | null; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/visa-timeline", label: "Visa Timeline", icon: Route },
      { href: "/dashboard/deadlines", label: "Deadlines", icon: CalendarClock },
    ],
  },
  {
    label: "Work Auth",
    items: [
      { href: "/dashboard/opt", label: "OPT Tracker", icon: Briefcase, top: true },
      { href: "/dashboard/cpt", label: "CPT Tracker", icon: BookOpen, top: true },
      { href: "/dashboard/opt/timeline", label: "OPT Steps", icon: ListChecks },
      { href: "/dashboard/opt/stem-timeline", label: "STEM Steps", icon: FlaskConical },
      { href: "/dashboard/opt/stem-reports", label: "STEM Reports", icon: ClipboardList },
      { href: "/dashboard/opt/h1b", label: "H-1B Timeline", icon: Building2 },
      { href: "/dashboard/opt/calculator", label: "Auth Calculator", icon: Calculator },
      { href: "/dashboard/opt/i983", label: "I-983 Guide", icon: FileText },
    ],
  },
  {
    label: "Travel",
    items: [
      { href: "/dashboard/travel", label: "Travel", icon: Plane, top: true },
      { href: "/dashboard/travel/checklist", label: "Pre-Travel Checklist", icon: ClipboardCheck },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/dashboard/documents", label: "Documents", icon: FolderOpen, top: true },
      { href: "/dashboard/tax", label: "Tax", icon: Receipt, top: true },
      { href: "/dashboard/dso-email", label: "DSO Emails", icon: Mail, top: true },
      { href: "/dashboard/ai", label: "AI Assistant", icon: Sparkles, top: true },
      { href: "/dashboard/community", label: "Community", icon: MessageCircle, top: true },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/currency", label: "Currency", icon: ArrowLeftRight },
      { href: "/dashboard/holidays", label: "Holidays", icon: CalendarDays },
      { href: "/dashboard/news", label: "News", icon: Newspaper },
      { href: "/dashboard/guides", label: "Guides", icon: BookMarked },
      { href: "/dashboard/emergency", label: "Emergency", icon: ShieldAlert },
    ],
  },
];

export function Sidebar({ user, onMobileClose }: { user: { name: string; email: string; role: string }; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  function isSectionOpen(section: NavSection) {
    if (!section.label) return true;
    if (section.label in openSections) return openSections[section.label];
    return section.items.some(
      (item) => item.href === pathname || pathname.startsWith(item.href + "/")
    );
  }

  function toggleSection(label: string) {
    setOpenSections((prev) => ({
      ...prev,
      [label]: !(prev[label] ?? SECTIONS.find((s) => s.label === label)?.items.some(
        (item) => item.href === pathname || pathname.startsWith(item.href + "/")
      )),
    }));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col shadow-sm h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-none">F1Buddy</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-none">Student Manager</p>
          </div>
        </Link>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-3">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <button
                onClick={() => toggleSection(section.label!)}
                className="flex items-center justify-between w-full text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-3 mb-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <span>{section.label}</span>
                <span className={cn("text-[9px] transition-transform", isSectionOpen(section) && "rotate-90")}>▸</span>
              </button>
            )}
            {isSectionOpen(section) && <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, top }) => {
                const active = href === "/dashboard"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");
                const isTop = top ?? (section.label === null);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg transition-all duration-150",
                      isTop ? "px-3 py-2 text-sm" : "px-3 py-1.5 ml-3 text-xs",
                      active
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <Icon className={cn("flex-shrink-0", isTop ? "w-[18px] h-[18px]" : "w-4 h-4")} />
                    <span className="truncate">{label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>}
          </div>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          </div>
        </Link>
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={handleSignOut}
            className="flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
