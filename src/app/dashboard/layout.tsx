import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SeedButton } from "@/components/shared/seed-button";
import { IOSInstallBanner } from "@/components/shared/ios-install-banner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url, onboarding_completed, role")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <>
      <DashboardShell
        user={{ name: profile?.name ?? user.email ?? "Student", email: user.email ?? "", role: profile?.role ?? "student" }}
        showSeedButton={process.env.NODE_ENV !== "production" ? <SeedButton /> : undefined}
      >
        {children}
      </DashboardShell>
      <IOSInstallBanner />
    </>
  );
}
