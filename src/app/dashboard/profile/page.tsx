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
  const [profile, setProfile] = useState<Record<string, string | null> | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading) return <div className="text-gray-500 text-center py-20">Loading profile...</div>;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const Field = ({ label, value, field, type = "text" }: { label: string; value: string | null | undefined; field: string; type?: string }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {editing ? (
        <Input type={type} value={form[field] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
      ) : (
        <p className="text-sm text-gray-900">{value || <span className="text-gray-500">—</span>}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 text-sm">Your student and visa information</p>
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
      <div className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-bold text-gray-900">
          {(profile?.name ?? "S").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-gray-900 font-semibold text-lg">{profile?.name ?? "Student"}</p>
          <p className="text-gray-600 text-sm">{profile?.email}</p>
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
          <a href={`mailto:${profile.dso_email}`} className="inline-block mt-3 text-sm text-indigo-600 hover:underline">
            📧 Email DSO
          </a>
        )}
      </Section>

      {/* Address quick link */}
      <Link href="/dashboard/profile/address"
        className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 hover:border-indigo-200 transition-colors group">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏠</span>
          <div>
            <p className="text-sm font-medium text-gray-900">US Address & SEVIS Reporting</p>
            <p className="text-xs text-gray-500">Manage your address and 10-day DSO reporting requirement</p>
          </div>
        </div>
        <span className="text-gray-500 group-hover:text-gray-500 transition-colors">→</span>
      </Link>

      <Section title="Account">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subscription</span>
            <Badge variant="outline">{profile?.role === "premium" ? "Premium" : "Free"}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span className="text-gray-600">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
