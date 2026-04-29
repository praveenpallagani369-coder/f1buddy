"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarDays, parseISO } from "date-fns";

export default function DeadlinesPage() {
  const supabase = createClient();
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", deadlineDate: "", category: "custom", severity: "warning" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("compliance_deadlines").select("*").eq("user_id", user.id).order("deadline_date");
    setDeadlines(data ?? []);
    setLoading(false);
  }

  async function saveDeadline() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("compliance_deadlines").insert({ user_id: user.id, ...form, status: "pending", is_system_generated: false });
    await load();
    setShowForm(false);
    setForm({ title: "", description: "", deadlineDate: "", category: "custom", severity: "warning" });
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("compliance_deadlines").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    await load();
  }

  const today = new Date();
  const filtered = filter === "all" ? deadlines : deadlines.filter(d => d.category === filter || d.status === filter);

  if (loading) return <div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading deadlines...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deadlines</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">All your F-1 compliance deadlines in one place</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add Deadline</Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all","pending","opt","visa","travel","tax","sevis","document","custom"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-base">Add Custom Deadline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Title *</label>
                <Input placeholder="e.g., Apply for STEM OPT Extension" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Deadline Date *</label>
                <Input type="date" value={form.deadlineDate} onChange={(e) => setForm(f => ({ ...f, deadlineDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Category</label>
                <Select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="opt">OPT</option>
                  <option value="visa">Visa</option>
                  <option value="travel">Travel</option>
                  <option value="tax">Tax</option>
                  <option value="sevis">SEVIS</option>
                  <option value="document">Document</option>
                  <option value="custom">Custom</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Severity</label>
                <Select value={form.severity} onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Description (optional)</label>
                <Textarea placeholder="What needs to be done..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveDeadline} loading={saving} disabled={!form.title || !form.deadlineDate}>Save Deadline</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deadlines list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            <p className="text-3xl mb-2">✅</p>
            <p>No deadlines in this category</p>
          </div>
        ) : (
          filtered.map((d) => {
            const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
            const isOverdue = days < 0;
            return (
              <Card key={d.id} className={d.status === "completed" ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      isOverdue ? "bg-red-400" :
                      d.severity === "critical" ? "bg-red-400" :
                      d.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${d.status === "completed" ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>{d.title}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={isOverdue ? "critical" : days <= 7 ? "critical" : days <= 30 ? "warning" : "info"}>
                            {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{d.category}</Badge>
                        </div>
                      </div>
                      {d.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{d.description}</p>}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Due: {d.deadline_date}</p>
                      {d.status !== "completed" && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => updateStatus(d.id, "acknowledged")}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded hover:border-gray-400 dark:hover:border-gray-400 transition-colors">
                            Acknowledge
                          </button>
                          <button onClick={() => updateStatus(d.id, "completed")}
                            className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded hover:border-emerald-600 transition-colors">
                            ✓ Mark Done
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
