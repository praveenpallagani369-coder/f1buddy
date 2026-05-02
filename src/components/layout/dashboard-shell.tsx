"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileHeader } from "./mobile-header";

interface DashboardShellProps {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
  showSeedButton?: React.ReactNode;
}

export function DashboardShell({ user, children, showSeedButton }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — always visible on lg+, drawer on mobile */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-30 lg:static lg:z-auto lg:flex",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <Sidebar user={user} onMobileClose={() => setMobileOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          {/* App-style top header — mobile only */}
          <MobileHeader user={user} />
          <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav + floating AI button */}
      <MobileBottomNav onMoreClick={() => setMobileOpen(true)} />

      {showSeedButton}
    </div>
  );
}
