"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, CreditCard, User, Bell, Trash2, AlertTriangle } from "lucide-react";

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

  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error?.message ?? "Failed to delete account.");
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.push("/?deleted=1");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

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

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete account</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Permanently deletes your account, all documents, deadlines, travel records, and encrypted data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirm(""); setDeleteError(null); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete your account?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-3 mb-5 text-xs text-red-700 dark:text-red-300 space-y-1">
              <p className="font-medium">Everything below will be permanently deleted:</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li>Your profile and visa information</li>
                <li>All uploaded documents</li>
                <li>OPT, travel, and tax records</li>
                <li>Compliance deadlines and notifications</li>
                <li>AI conversation history</li>
              </ul>
            </div>

            <div className="mb-5">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                Type <strong className="text-gray-900 dark:text-gray-100">DELETE</strong> to confirm
              </label>
              <Input
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="font-mono"
              />
            </div>

            {deleteError && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                onClick={handleDeleteAccount}
                loading={deleting}
                disabled={deleteConfirm !== "DELETE"}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
              >
                Delete My Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
