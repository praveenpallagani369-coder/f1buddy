"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ShieldCheck, Mail } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  visa_type: string | null;
  sevisId: string | null;
  school_name: string | null;
  program_name: string | null;
  degree_level: string | null;
  program_start_date: string | null;
  program_end_date: string | null;
  dso_name: string | null;
  dso_email: string | null;
  dso_phone: string | null;
  home_country: string | null;
  passport_expiry: string | null;
  role: string | null;
  created_at: string | null;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/user");
      if (!res.ok) return;
      const { data } = await res.json();
      setProfile(data);
      setForm({
        name: data?.name ?? "",
        school_name: data?.school_name ?? "",
        program_name: data?.program_name ?? "",
        degree_level: data?.degree_level ?? "",
        program_start_date: data?.program_start_date ?? "",
        program_end_date: data?.program_end_date ?? "",
        dso_name: data?.dso_name ?? "",
        dso_email: data?.dso_email ?? "",
        dso_phone: data?.dso_phone ?? "",
        home_country: data?.home_country ?? "",
        passport_expiry: data?.passport_expiry ?? "",
        sevisId: "",
      });
      setLoading(false);
    }
    load();
    if (searchParams.get("edit") === "true") {
      setEditing(true);
    }
  }, [searchParams]);

  async function save() {
    setSaving(true);
    const body: Record<string, string | null> = {
      name: form.name || null,
      schoolName: form.school_name || null,
      programName: form.program_name || null,
      degreeLevel: form.degree_level || null,
      programStartDate: form.program_start_date || null,
      programEndDate: form.program_end_date || null,
      dsoName: form.dso_name || null,
      dsoEmail: form.dso_email || null,
      dsoPhone: form.dso_phone || null,
      homeCountry: form.home_country || null,
      passportExpiry: form.passport_expiry || null,
    };
    if (form.sevisId) body.sevisId = form.sevisId;

    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const reload = await fetch("/api/user");
      if (reload.ok) {
        const { data } = await reload.json();
        setProfile(data);
      }
    }
    setEditing(false);
    setSaving(false);
  }

  if (loading) return <div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading profile...</div>;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline font-medium">
            Edit
          </button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const Field = ({ label, field, type = "text", placeholder }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {editing ? (
        <Input type={type} placeholder={placeholder} value={form[field] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
      ) : (
        <p className="text-sm text-gray-900 dark:text-gray-100">{(profile as unknown as Record<string, string | null>)?.[field] || <span className="text-gray-400 dark:text-gray-500">—</span>}</p>
      )}
    </div>
  );

  function maskSevisId(id: string | null) {
    if (!id) return "—";
    if (id.length <= 4) return "N•••••••••••";
    return id.slice(0, 4) + "•".repeat(Math.max(0, id.length - 4));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Your student and visa information</p>
        </div>
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save Changes</Button>
          </div>
        )}
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
          {(profile?.name ?? "S").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{profile?.name ?? "Student"}</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{profile?.email}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant="info">{profile?.visa_type ?? "F-1"}</Badge>
            <Badge variant={profile?.role === "premium" ? "warning" : "outline"}>{profile?.role ?? "student"}</Badge>
          </div>
        </div>
      </div>

      <Section title="Visa & Identity">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">SEVIS ID</label>
            {editing ? (
              <div className="space-y-1">
                <Input
                  type="text"
                  placeholder="N00xxxxxxxxx (leave blank to keep existing)"
                  value={form.sevisId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, sevisId: e.target.value }))}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Stored encrypted — only enter if changing
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{maskSevisId(profile?.sevisId ?? null)}</p>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Encrypted
                </span>
              </div>
            )}
          </div>
          <Field label="Home Country" field="home_country" />
          <Field label="Passport Expiry" field="passport_expiry" type="date" />
        </div>
      </Section>

      <Section title="Personal Info">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Full Name" field="name" /></div>
        </div>
      </Section>

      <Section title="Academic Info">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="University / School" field="school_name" /></div>
          <Field label="Program / Major" field="program_name" />
          <Field label="Degree Level" field="degree_level" />
          <Field label="Program Start" field="program_start_date" type="date" />
          <Field label="Program End" field="program_end_date" type="date" />
        </div>
      </Section>

      <Section title="DSO Contact">
        <div className="grid grid-cols-2 gap-4">
          <Field label="DSO Name" field="dso_name" />
          <Field label="DSO Email" field="dso_email" type="email" />
          <Field label="DSO Phone" field="dso_phone" />
        </div>
        {profile?.dso_email && !editing && (
          <a href={`mailto:${profile.dso_email}`} className="inline-flex items-center gap-1.5 mt-3 text-sm text-indigo-600 hover:underline">
            <Mail className="w-4 h-4" /> Email DSO
          </a>
        )}
      </Section>

      {/* Address quick link */}
      <Link href="/dashboard/profile/address"
        className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors group">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">🏠</div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">US Address & SEVIS Reporting</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your address and 10-day DSO reporting requirement</p>
          </div>
        </div>
        <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">→</span>
      </Link>

      <Section title="Account">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Subscription</span>
            <Badge variant="outline">{profile?.role === "premium" ? "Premium" : "Free"}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Member since</span>
            <span className="text-gray-600 dark:text-gray-300">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
