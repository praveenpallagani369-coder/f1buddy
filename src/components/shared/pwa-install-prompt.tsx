"use client";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { AppIcon } from "@/components/icons/AppIcon";
import { X, Download } from "lucide-react";

export function PwaInstallPrompt() {
  const { canInstall, install, dismiss } = usePwaInstall();
  if (!canInstall) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 lg:hidden">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 flex items-center gap-3">
        <div className="flex-shrink-0">
          <AppIcon size={40} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">Add to Home Screen</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Install VisaBuddy for a faster, app-like experience</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={install}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={dismiss}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
