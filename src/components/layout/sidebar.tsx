"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", group: null },
  { href: "/dashboard/visa-timeline", label: "Visa Timeline", icon: "🗓️", group: null },
  { href: "/dashboard/deadlines", label: "Deadlines", icon: "📅", group: null },
  // OPT group
  { href: "/dashboard/opt", label: "OPT Tracker", icon: "💼", group: "OPT" },
  { href: "/dashboard/opt/timeline", label: "Application Timeline", icon: "📆", group: "OPT" },
  { href: "/dashboard/opt/calculator", label: "Auth Calculator", icon: "🧮", group: "OPT" },
  { href: "/dashboard/opt/stem-reports", label: "STEM Reports", icon: "🔬", group: "OPT" },
  { href: "/dashboard/opt/i983", label: "I-983 Guide", icon: "📋", group: "OPT" },
  // Travel group
  { href: "/dashboard/travel", label: "Travel", icon: "✈️", group: "Travel" },
  { href: "/dashboard/travel/checklist", label: "Pre-Travel Checklist", icon: "🗂️", group: "Travel" },
  // Other
  { href: "/dashboard/documents", label: "Documents", icon: "📁", group: null },
  { href: "/dashboard/tax", label: "Tax", icon: "🧾", group: null },
  { href: "/dashboard/dso-email", label: "DSO Emails", icon: "✉️", group: null },
  { href: "/dashboard/ai", label: "AI Assistant", icon: "🤖", group: null },
  { href: "/dashboard/community", label: "Community", icon: "💬", group: null },
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
    <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg">🎓</div>
          <div>
            <p className="font-bold text-white text-sm">F1Buddy</p>
            <p className="text-xs text-slate-500">Student Manager</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon, group }) => {
          const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          const isSubItem = group !== null;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm transition-colors",
                isSubItem ? "px-3 py-1.5 ml-4 text-xs" : "px-3 py-2.5",
                active
                  ? "bg-indigo-600/20 text-indigo-300 font-medium"
                  : isSubItem
                  ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className={isSubItem ? "text-sm" : "text-base"}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-3 border-t border-slate-800">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-900/10 transition-colors"
        >
          <span>🚪</span> Sign out
        </button>
      </div>
    </aside>
  );
}
