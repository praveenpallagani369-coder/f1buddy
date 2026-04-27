"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string; icon: string; top?: boolean };
type NavSection = { label: string | null; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "🏠" },
      { href: "/dashboard/visa-timeline", label: "Visa Timeline", icon: "🗓️" },
      { href: "/dashboard/deadlines", label: "Deadlines", icon: "📅" },
    ],
  },
  {
    label: "OPT Suite",
    items: [
      { href: "/dashboard/opt", label: "OPT Tracker", icon: "💼", top: true },
      { href: "/dashboard/opt/timeline", label: "Application Steps", icon: "📆" },
      { href: "/dashboard/opt/stem-timeline", label: "STEM Steps", icon: "🔬" },
      { href: "/dashboard/opt/stem-reports", label: "STEM Reports", icon: "📋" },
      { href: "/dashboard/opt/h1b", label: "H-1B Timeline", icon: "🏢" },
      { href: "/dashboard/opt/calculator", label: "Auth Calculator", icon: "🧮" },
      { href: "/dashboard/opt/i983", label: "I-983 Guide", icon: "📄" },
    ],
  },
  {
    label: null,
    items: [{ href: "/dashboard/cpt", label: "CPT Tracker", icon: "📚", top: true }],
  },
  {
    label: "Travel",
    items: [
      { href: "/dashboard/travel", label: "Travel", icon: "✈️", top: true },
      { href: "/dashboard/travel/checklist", label: "Pre-Travel Checklist", icon: "🗂️" },
    ],
  },
  {
    label: null,
    items: [
      { href: "/dashboard/documents", label: "Documents", icon: "📁", top: true },
      { href: "/dashboard/tax", label: "Tax", icon: "🧾", top: true },
      { href: "/dashboard/dso-email", label: "DSO Emails", icon: "✉️", top: true },
      { href: "/dashboard/ai", label: "AI Assistant", icon: "🤖", top: true },
      { href: "/dashboard/community", label: "Community", icon: "💬", top: true },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/currency", label: "Currency", icon: "💱" },
      { href: "/dashboard/holidays", label: "Holidays", icon: "🗓️" },
      { href: "/dashboard/news", label: "News", icon: "📰" },
      { href: "/dashboard/guides", label: "Guides", icon: "📖" },
      { href: "/dashboard/emergency", label: "Emergency", icon: "🆘" },
    ],
  },
];

export function Sidebar({ user }: { user: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col shadow-sm">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-base shadow-md shadow-indigo-200">
            🎓
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">F1Buddy</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-none">Student Manager</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon, top }) => {
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
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    <span className={cn("flex-shrink-0", isTop ? "text-base" : "text-sm")}>{icon}</span>
                    <span className="truncate">{label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile */}
      <div className="px-2 py-3 border-t border-gray-100">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full mt-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <span className="text-sm">🚪</span> Sign out
        </button>
      </div>
    </aside>
  );
}
