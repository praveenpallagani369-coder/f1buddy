"use client";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarDays, parseISO } from "date-fns";

const DOC_LABELS: Record<string, string> = { i20:"I-20", ead:"EAD Card", passport:"Passport", visa_stamp:"Visa Stamp", i94:"I-94", ssn_card:"SSN Card", offer_letter:"Offer Letter", pay_stub:"Pay Stub", tax_return:"Tax Return", transcript:"Transcript", other:"Other" };
const DOC_ICONS: Record<string, string> = { i20:"📋", ead:"💳", passport:"🛂", visa_stamp:"🔖", i94:"📄", ssn_card:"🪪", offer_letter:"📝", pay_stub:"💵", tax_return:"🧾", transcript:"📜", other:"📎" };
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function DocumentsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [form, setForm] = useState({ docType: "i20", expirationDate: "", notes: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/documents");
    const json = await res.json();
    if (json.success) setDocs(json.data);
    setLoading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!file) { setSelectedFile(null); return; }
    if (file.size > MAX_FILE_SIZE) { setFileError("File too large. Maximum size is 10 MB."); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) { setFileError("Only PDF, JPG, and PNG files are supported."); return; }
    setSelectedFile(file);
  }

  async function saveDocument() {
    if (!selectedFile) return;
    setSaving(true);
    setFileError(null);

    try {
      // Step 1: Create record + get signed upload URL
      setUploadProgress("Creating record...");
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: form.docType,
          fileName: selectedFile.name,
          expirationDate: form.expirationDate || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) { setFileError(json.error?.message ?? "Upload failed"); setSaving(false); setUploadProgress(null); return; }

      // Step 2: Upload to Supabase Storage if we got an upload URL
      if (json.data.uploadUrl) {
        setUploadProgress("Uploading file...");
        const uploadRes = await fetch(json.data.uploadUrl, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": selectedFile.type },
        });
        if (!uploadRes.ok) {
          // Upload failed but record was created — still show it
          if (process.env.NODE_ENV === "development") console.warn("Storage upload failed, record saved without file");
        }
      }

      setUploadProgress("Done!");
      await load();
      setShowForm(false);
      setSelectedFile(null);
      setForm({ docType: "i20", expirationDate: "", notes: "" });
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    }
    setSaving(false);
    setUploadProgress(null);
  }

  async function deleteDoc(id: string) {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocs(d => d.filter(doc => doc.id !== id));
  }

  const today = new Date();
  const expiringSoon = docs.filter(d => d.expiration_date && differenceInCalendarDays(parseISO(d.expiration_date), today) <= 90 && differenceInCalendarDays(parseISO(d.expiration_date), today) >= 0);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Document Vault</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Store and track expiration of your important documents (PDF, JPG, PNG — max 10 MB)</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add Document</Button>
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

      {/* Upload form */}
      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-base">Add Document</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Document Type *</label>
                <Select value={form.docType} onChange={(e) => setForm(f => ({ ...f, docType: e.target.value }))}>
                  {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Expiration Date (if applicable)</label>
                <Input type="date" value={form.expirationDate} onChange={(e) => setForm(f => ({ ...f, expirationDate: e.target.value }))} />
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Upload File * (PDF, JPG, PNG — max 10 MB)</label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${selectedFile ? "border-indigo-600 bg-indigo-600/5" : "border-gray-200 hover:border-slate-600"}`}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
                {selectedFile ? (
                  <div>
                    <p className="text-2xl mb-1">📎</p>
                    <p className="text-gray-900 font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                    <button className="text-xs text-indigo-600 mt-2 hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📁</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Click to select or drag & drop</p>
                    <p className="text-gray-500 text-xs mt-1">PDF, JPG, PNG up to 10 MB</p>
                  </div>
                )}
              </div>
              {fileError && <p className="text-red-600 text-xs mt-1">{fileError}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Notes (optional)</label>
              <Input placeholder="Issued date, version, or any notes..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-indigo-600">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                {uploadProgress}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowForm(false); setSelectedFile(null); setFileError(null); }}>Cancel</Button>
              <Button onClick={saveDocument} loading={saving} disabled={!selectedFile}>
                Upload Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document grid */}
      {docs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">📁</p>
            <p className="text-gray-900 font-medium mb-1">No documents yet</p>
            <p className="text-gray-500 text-sm mb-4">Upload your I-20, EAD, passport and other documents to track expirations</p>
            <Button onClick={() => setShowForm(true)}>Upload First Document</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => {
            const daysToExp = d.expiration_date ? differenceInCalendarDays(parseISO(d.expiration_date), today) : null;
            const expStatus = daysToExp === null ? null : daysToExp < 0 ? "expired" : daysToExp <= 30 ? "critical" : daysToExp <= 90 ? "warning" : "valid";
            return (
              <Card key={d.id} className={expStatus === "expired" ? "border-red-200" : expStatus === "critical" ? "border-amber-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{DOC_ICONS[d.doc_type]}</span>
                    <button onClick={() => deleteDoc(d.id)} className="text-gray-500 hover:text-red-600 text-xs transition-colors p-1">✕</button>
                  </div>
                  <p className="font-medium text-gray-900">{DOC_LABELS[d.doc_type]}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{d.file_name}</p>
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
                  {/* View link if we have a real URL */}
                  {d.file_url && !d.file_url.startsWith("pending://") && !d.file_url.startsWith("demo://") && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                      className="block text-xs text-indigo-600 hover:underline mt-2">
                      View document →
                    </a>
                  )}
                  {d.notes && <p className="text-xs text-gray-500 mt-2 italic">{d.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
