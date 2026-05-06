"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarDays, parseISO } from "date-fns";

const DOC_LABELS: Record<string, string> = { i20:"I-20", ead:"EAD Card", passport:"Passport", visa_stamp:"Visa Stamp", i94:"I-94", ssn_card:"SSN Card", offer_letter:"Offer Letter", pay_stub:"Pay Stub", tax_return:"Tax Return", transcript:"Transcript", other:"Other" };
const DOC_ICONS: Record<string, string> = { i20:"📋", ead:"💳", passport:"🛂", visa_stamp:"🔖", i94:"📄", ssn_card:"🪪", offer_letter:"📝", pay_stub:"💵", tax_return:"🧾", transcript:"📜", other:"📎" };

interface DocumentRecord {
  id: string;
  user_id: string;
  doc_type: string;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ docType: "i20", expirationDate: "", notes: "", customLabel: "" });
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/documents");
    const json = await res.json();
    if (json.success) setDocs(json.data);
    setLoading(false);
  }

  async function saveDocument() {
    if (form.docType === "other" && !form.customLabel.trim()) {
      setFileError("Please enter a document name for 'Other' type.");
      return;
    }
    setSaving(true);
    setFileError(null);

    // For "other" type, store the custom label in notes
    const notesValue = form.docType === "other"
      ? form.customLabel.trim() + (form.notes.trim() ? `\n${form.notes.trim()}` : "")
      : form.notes.trim() || null;

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: form.docType,
          expirationDate: form.expirationDate || null,
          notes: notesValue,
        }),
      });
      const json = await res.json();
      if (!json.success) { setFileError(json.error?.message ?? "Failed to save record"); setSaving(false); return; }

      await load();
      resetForm();
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : "Failed to save record. Please try again.");
    }
    setSaving(false);
  }

  function resetForm() {
    setShowForm(false);
    setForm({ docType: "i20", expirationDate: "", notes: "", customLabel: "" });
    setFileError(null);
  }

  async function deleteDoc(id: string) {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocs(d => d.filter(doc => doc.id !== id));
  }

  const today = new Date();
  const expiringSoon = docs.filter(d => d.expiration_date
    && differenceInCalendarDays(parseISO(d.expiration_date), today) <= 90
    && differenceInCalendarDays(parseISO(d.expiration_date), today) >= 0);



  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">Loading documents...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Document Records</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Track expiration dates of your important immigration documents without uploading files.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add Record</Button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-600 mb-2">⚠️ {expiringSoon.length} document{expiringSoon.length > 1 ? "s" : ""} expiring within 90 days</p>
          <div className="flex flex-wrap gap-2">
            {expiringSoon.map(d => (
              <Badge key={d.id} variant="warning">{DOC_LABELS[d.doc_type]} — {d.expiration_date}</Badge>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-base">Add Document Record</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Document Type *</label>
                <Select
                  value={form.docType}
                  onChange={(e) => setForm(f => ({ ...f, docType: e.target.value }))}
                >
                  {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Expiration Date</label>
                <Input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                />
                {!form.expirationDate && (
                  <p className="text-xs text-gray-400 mt-1">Leave blank if document has no expiry date</p>
                )}
              </div>
            </div>

            {form.docType === "other" && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Document Name *</label>
                <Input
                  placeholder="e.g., Green Card, Work Permit, CPT Letter, Lease Agreement..."
                  value={form.customLabel}
                  onChange={(e) => setForm(f => ({ ...f, customLabel: e.target.value }))}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Notes (optional)</label>
              <Input placeholder="Issued date, version, or any notes..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {fileError && <p className="text-red-600 text-xs mt-1">{fileError}</p>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={saveDocument} loading={saving}>Save Record</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {docs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No records yet</p>
            <p className="text-gray-500 text-sm mb-4">Add your I-20, EAD, and passport details to track their expirations</p>
            <Button onClick={() => setShowForm(true)}>Add First Record</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => {
            const daysToExp = d.expiration_date ? differenceInCalendarDays(parseISO(d.expiration_date), today) : null;
            const expStatus = daysToExp === null ? null : daysToExp < 0 ? "expired" : daysToExp <= 30 ? "critical" : daysToExp <= 90 ? "warning" : "valid";
            const displayLabel = d.doc_type === "other" && d.notes
              ? d.notes.split("\n")[0]
              : DOC_LABELS[d.doc_type] ?? "Other";
            return (
              <Card key={d.id} className={expStatus === "expired" ? "border-red-200" : expStatus === "critical" ? "border-amber-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{DOC_ICONS[d.doc_type]}</span>
                    <button onClick={() => deleteDoc(d.id)} className="text-gray-500 hover:text-red-600 text-xs transition-colors p-1">✕</button>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{displayLabel}</p>
                  {d.expiration_date && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Expires: {d.expiration_date}</p>
                      {daysToExp !== null && (
                        <Badge variant={expStatus === "expired" || expStatus === "critical" ? "critical" : expStatus === "warning" ? "warning" : "success"} className="text-xs mt-1">
                          {daysToExp < 0 ? "Expired" : daysToExp === 0 ? "Expires today" : `${daysToExp}d left`}
                        </Badge>
                      )}
                    </div>
                  )}
                  {d.notes && d.doc_type !== "other" && <p className="text-xs text-gray-500 mt-2 italic">{d.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
