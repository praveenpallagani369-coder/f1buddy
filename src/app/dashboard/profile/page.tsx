"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
      setProfile(data);
      setForm({ name: data?.name ?? "", school_name: data?.school_name ?? "", program_name: data?.program_name ?? "", degree_level: data?.degree_level ?? "", program_start_date: data?.program_start_date ?? "", program_end_date: data?.program_end_date ?? "", dso_name: data?.dso_name ?? "", dso_email: data?.dso_email ?? "", dso_phone: data?.dso_phone ?? "", home_country: data?.home_country ?? "", passport_expiry: data?.passport_expiry ?? "" });
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("users").update({ ...form, updated_at: new Date().toISOString() }).eq("id", user.id);
    const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
    setProfile(data);
    setEditing(false);
    setSaving(false);
  }

  if (loading) return <div className="text-slate-400 text-center py-20">Loading profile...</div>;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const Field = ({ label, value, field, type = "text" }: { label: string; value: string; field: string; type?: string }) => (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {editing ? (
        <Input type={type} value={form[field] ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, [field]: e.target.value }))} />
      ) : (
        <p className="text-sm text-white">{value || <span className="text-slate-500">—</span>}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400 text-sm">Your student and visa information</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save Changes</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>Edit Profile</Button>
        )}
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 p-5 bg-slate-900 rounded-xl border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
          {(profile?.name ?? "S").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold text-lg">{profile?.name ?? "Student"}</p>
          <p className="text-slate-400 text-sm">{profile?.email}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant="info">{profile?.visa_type ?? "F-1"}</Badge>
            <Badge variant={profile?.role === "premium" ? "warning" : "outline"}>{profile?.role ?? "student"}</Badge>
          </div>
        </div>
      </div>

      <Section title="Personal Info">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={profile?.name} field="name" />
          <Field label="Home Country" value={profile?.home_country} field="home_country" />
          <Field label="Passport Expiry" value={profile?.passport_expiry} field="passport_expiry" type="date" />
        </div>
      </Section>

      <Section title="Academic Info">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="University / School" value={profile?.school_name} field="school_name" /></div>
          <Field label="Program / Major" value={profile?.program_name} field="program_name" />
          <Field label="Degree Level" value={profile?.degree_level} field="degree_level" />
          <Field label="Program Start" value={profile?.program_start_date} field="program_start_date" type="date" />
          <Field label="Program End" value={profile?.program_end_date} field="program_end_date" type="date" />
        </div>
      </Section>

      <Section title="DSO Contact">
        <div className="grid grid-cols-2 gap-4">
          <Field label="DSO Name" value={profile?.dso_name} field="dso_name" />
          <Field label="DSO Email" value={profile?.dso_email} field="dso_email" type="email" />
          <Field label="DSO Phone" value={profile?.dso_phone} field="dso_phone" />
        </div>
        {profile?.dso_email && !editing && (
          <a href={`mailto:${profile.dso_email}`} className="inline-block mt-3 text-sm text-indigo-400 hover:underline">
            📧 Email DSO
          </a>
        )}
      </Section>

      {/* Address quick link */}
      <Link href="/dashboard/profile/address"
        className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-800/50 transition-colors group">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏠</span>
          <div>
            <p className="text-sm font-medium text-white">US Address & SEVIS Reporting</p>
            <p className="text-xs text-slate-500">Manage your address and 10-day DSO reporting requirement</p>
          </div>
        </div>
        <span className="text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
      </Link>

      <Section title="Account">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subscription</span>
            <Badge variant="outline">{profile?.role === "premium" ? "Premium" : "Free"}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Member since</span>
            <span className="text-slate-300">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
