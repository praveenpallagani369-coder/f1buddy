"use client";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium py-2 px-4 animate-in slide-in-from-top duration-300">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>You&apos;re offline — some features may be unavailable</span>
    </div>
  );
}
