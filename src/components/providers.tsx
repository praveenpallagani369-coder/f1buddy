"use client";
import { ThemeProvider } from "next-themes";
import { PostHogProvider } from "@/components/posthog-provider";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { PwaInstallPrompt } from "@/components/shared/pwa-install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PostHogProvider>
        <ServiceWorkerRegister />
        <OfflineBanner />
        <PwaInstallPrompt />
        {children}
      </PostHogProvider>
    </ThemeProvider>
  );
}
