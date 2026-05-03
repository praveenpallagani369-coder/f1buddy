"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, CalendarClock, Briefcase,
  BookOpen, Plane, FolderOpen, Receipt, Mail,
  Sparkles, MessageCircle, BookMarked,
  LogOut, X, Sun, Moon, Settings, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { AppIcon } from "@/components/icons/AppIcon";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavSection = { label: string | null; icon?: LucideIcon; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/deadlines", label: "Deadlines", icon: CalendarClock },
      { href: "/dashboard/travel", label: "Travel", icon: Plane },
    ],
  },
  {
    label: "Work Auth",
    icon: Briefcase,
    items: [
      { href: "/dashboard/opt", label: "OPT Tracker", icon: Briefcase },
      { href: "/dashboard/cpt", label: "CPT Tracker", icon: BookOpen },
    ],
  },
  {
    label: "Records",
    icon: FolderOpen,
    items: [
      { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
      { href: "/dashboard/tax", label: "Tax", icon: Receipt },
      { href: "/dashboard/dso-email", label: "DSO Emails", icon: Mail },
    ],
  },
  {
    label: null,
    items: [
      { href: "/dashboard/ai", label: "AI Assistant", icon: Sparkles },
      { href: "/dashboard/community", label: "Community Q&A", icon: MessageCircle },
      { href: "/dashboard/guides", label: "Guides & Tools", icon: BookMarked },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
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
          <AppIcon size={32} />
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-none">VisaBuddy</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-none">Immigration Manager</p>
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

      <nav className="flex-1 px-2 py-2 overflow-y-auto no-scrollbar space-y-3">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && section.icon && (
              <button
                onClick={() => toggleSection(section.label!)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-all duration-150 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <section.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronRight className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150", isSectionOpen(section) && "rotate-90")} />
              </button>
            )}
            {isSectionOpen(section) && <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = href === "/dashboard"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-150",
                      active
                        ? "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="truncate">{label}</span>
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
