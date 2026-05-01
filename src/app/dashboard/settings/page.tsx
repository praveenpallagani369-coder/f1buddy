"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CreditCard, User, Bell } from "lucide-react";

type SubRow = {
  plan: string;
  status: string;
  current_period_end: string | null;
};

export default function SettingsPage() {
  const supabase = createClient();
  const [sub, setSub] = useState<SubRow | null>(null);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const [{ data: profile }, { data: subData }] = await Promise.all([
        supabase.from("users").select("name").eq("id", authUser.id).single(),
        supabase.from("subscriptions").select("plan,status,current_period_end").eq("user_id", authUser.id).single(),
      ]);

      setUser({ email: authUser.email ?? "", name: profile?.name ?? "" });
      setSub(subData);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPremium = sub?.plan === "premium" && sub?.status === "active";

  if (loading) return <div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage your account and subscription</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Name</span>
            <span className="text-gray-900 dark:text-gray-100">{user?.name || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span className="text-gray-900 dark:text-gray-100">{user?.email}</span>
          </div>
          <div className="pt-2">
            <a href="/dashboard/profile" className="text-sm text-indigo-600 hover:underline">
              Edit profile →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                {sub?.plan ?? "Free"} Plan
              </p>
              {sub?.current_period_end && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Renews {new Date(sub.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <Badge variant={isPremium ? "success" : "outline"}>
              {isPremium ? "Active" : sub?.status ?? "Free"}
            </Badge>
          </div>

          {isPremium ? (
            <a href="/api/payments/portal">
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="w-4 h-4" />
                Manage Subscription
              </Button>
            </a>
          ) : (
            <a href="/pricing">
              <Button className="w-full">Upgrade to Premium →</Button>
            </a>
          )}

          {isPremium && (
            <p className="text-xs text-gray-400 text-center">
              Cancel, change plan, or update payment method via the billing portal.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Email reminders are sent at 30, 14, 7, 3, and 1 day before each deadline.{" "}
            {!isPremium && (
              <a href="/pricing" className="text-indigo-600 hover:underline">Upgrade to Premium</a>
            )}{" "}
            {!isPremium && "to enable email notifications."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
