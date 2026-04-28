import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { SeedButton } from "@/components/shared/seed-button";

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
    <div className="flex h-screen bg-gray-50/80 overflow-hidden">
      <Sidebar user={{ name: profile?.name ?? user.email ?? "Student", email: user.email ?? "", role: profile?.role ?? "student" }} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      {process.env.NODE_ENV !== "production" && <SeedButton />}
    </div>
  );
}
