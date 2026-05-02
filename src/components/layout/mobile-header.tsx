"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { AppIcon } from "@/components/icons/AppIcon";

interface MobileHeaderProps {
  user: { name: string; email: string };
  deadlineCount?: number;
}

export function MobileHeader({ user, deadlineCount = 0 }: MobileHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-20 h-14 flex items-center justify-between px-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80">
      <Link href="/dashboard" className="flex items-center gap-2 active:opacity-70 transition-opacity">
        <AppIcon size={28} />
        <span className="font-bold text-gray-900 dark:text-gray-100 text-[15px] tracking-tight">VisaBuddy</span>
      </Link>

      <div className="flex items-center gap-1.5">
        <Link
          href="/dashboard/deadlines"
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 active:scale-90 transition-all"
          aria-label="Deadlines"
        >
          <Bell className="w-[19px] h-[19px]" />
          {deadlineCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full border-2 border-white dark:border-gray-900" />
          )}
        </Link>

        <Link
          href="/dashboard/profile"
          className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs active:scale-90 transition-transform shadow-sm shadow-orange-200/60 dark:shadow-orange-900/40"
          aria-label="Profile"
        >
          {user.name.charAt(0).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
