"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";
import {
  Receipt, Mail,
  Sparkles, MessageCircle, Settings,
  BookMarked, ShieldAlert,
  Sun, Moon, LogOut, X, BookOpen,
  CalendarClock, Gavel,
  type LucideIcon,
} from "lucide-react";

type SheetItem = { href: string; label: string; icon: LucideIcon; badge?: string };
type SheetSection = { heading: string; items: SheetItem[] };

const SHEET_SECTIONS: SheetSection[] = [
  {
    heading: "Compliance",
    items: [
      { href: "/dashboard/deadlines", label: "Deadlines", icon: CalendarClock },
      { href: "/dashboard/tax", label: "Tax Guide", icon: Receipt },
      { href: "/dashboard/cpt", label: "CPT Tracker", icon: BookOpen },
      { href: "/dashboard/dso-email", label: "DSO Emails", icon: Mail },
    ],
  },
  {
    heading: "Community",
    items: [
      { href: "/dashboard/ai", label: "AI Assistant", icon: Sparkles, badge: "AI" },
      { href: "/dashboard/community", label: "Community Q&A", icon: MessageCircle },
      // { href: "/dashboard/attorneys", label: "Attorneys", icon: Gavel },
    ],
  },
  {
    heading: "Resources",
    items: [
      { href: "/dashboard/guides", label: "Guides & Tools", icon: BookMarked },
      { href: "/dashboard/emergency", label: "Emergency & Rights", icon: ShieldAlert },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreSheet({ open, onClose }: MobileMoreSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    onClose();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "bg-white dark:bg-gray-900 rounded-t-2xl",
          "transition-transform duration-300 ease-out",
          "max-h-[85dvh] flex flex-col",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-modal="true"
        role="dialog"
        aria-label="More navigation"
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">More</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable nav list */}
        <div className="overflow-y-auto flex-1 px-3 pb-2">
          {SHEET_SECTIONS.map((section) => (
            <div key={section.heading} className="mb-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-1">
                {section.heading}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, badge }) => {
                  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]",
                        active
                          ? "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-semibold"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: theme toggle + sign out */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2.5 flex-1 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-[0.98]"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 flex-1 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
