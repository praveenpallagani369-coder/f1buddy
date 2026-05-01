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
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface DocumentRecord {
  id: string;
  user_id: string;
  doc_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  expiration_date: string | null;
  is_current_version: boolean;
  notes: string | null;
  ai_extracted_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

type AiScanState = "idle" | "scanning" | "done" | "error" | "unsupported";

interface AiScanResult {
  expirationDate: string | null;
  documentNumber: string | null;
  holderName: string | null;
  sevisId?: string | null;
  category?: string | null;
  nationality?: string | null;
  fullName?: string | null;
  visaCategory?: string | null;
  classOfAdmission?: string | null;
  programEndDate?: string | null;
  studentName?: string | null;
  [key: string]: string | null | undefined;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [form, setForm] = useState({ docType: "i20", expirationDate: "", notes: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [aiScanState, setAiScanState] = useState<AiScanState>("idle");
  const [aiResult, setAiResult] = useState<AiScanResult | null>(null);
  const [aiFieldsConfirmed, setAiFieldsConfirmed] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/documents");
    const json = await res.json();
    if (json.success) setDocs(json.data);
    setLoading(false);
  }

  async function scanFile(file: File, docType: string) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setAiScanState("unsupported");
      return;
    }
    setAiScanState("scanning");
    setAiResult(null);
    setAiFieldsConfirmed(false);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch("/api/ai/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file.type, docType }),
      });
      const json = await res.json();
      if (json.success && json.data?.extracted) {
        const extracted = json.data.extracted as AiScanResult;
        setAiResult(extracted);
        setAiScanState("done");
        // Pre-fill expiry date if AI found one and user hasn't entered one
        const expiry = extracted.expirationDate ?? extracted.programEndDate ?? null;
        if (expiry) {
          setForm(f => ({ ...f, expirationDate: f.expirationDate || expiry }));
        }
      } else {
        setAiScanState("error");
      }
    } catch {
      setAiScanState("error");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    setAiScanState("idle");
    setAiResult(null);
    setAiFieldsConfirmed(false);
    if (!file) { setSelectedFile(null); return; }
    if (file.size > MAX_FILE_SIZE) { setFileError("File too large. Maximum size is 10 MB."); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) { setFileError("Only PDF, JPG, and PNG files are supported."); return; }
    setSelectedFile(file);
    scanFile(file, form.docType);
  }

  function handleDocTypeChange(newType: string) {
    setForm(f => ({ ...f, docType: newType }));
    // Re-scan if a file is already selected and it's an image
    if (selectedFile && IMAGE_TYPES.includes(selectedFile.type)) {
      scanFile(selectedFile, newType);
    }
  }

  function applyAiField(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function saveDocument() {
    if (!selectedFile) return;
    setSaving(true);
    setFileError(null);

    try {
      setUploadProgress("Creating record...");
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: form.docType,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          fileSizeBytes: selectedFile.size,
          expirationDate: form.expirationDate || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) { setFileError(json.error?.message ?? "Upload failed"); setSaving(false); setUploadProgress(null); return; }

      if (json.data.uploadUrl) {
        setUploadProgress("Uploading file...");
        const uploadRes = await fetch(json.data.uploadUrl, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": selectedFile.type },
        });
        if (!uploadRes.ok && process.env.NODE_ENV === "development") {
          console.warn("Storage upload failed, record saved without file");
        }
      }

      setUploadProgress("Done!");

      // If we already scanned and have results, save them to the doc record
      if (aiResult && json.data.document?.id) {
        try {
          await fetch("/api/ai/parse-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ docId: json.data.document.id }),
          });
        } catch { /* non-critical */ }
      }

      await load();
      resetForm();
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    }
    setSaving(false);
    setUploadProgress(null);
  }

  function resetForm() {
    setShowForm(false);
    setSelectedFile(null);
    setForm({ docType: "i20", expirationDate: "", notes: "" });
    setAiScanState("idle");
    setAiResult(null);
    setAiFieldsConfirmed(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function deleteDoc(id: string) {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocs(d => d.filter(doc => doc.id !== id));
  }

  const today = new Date();
  const expiringSoon = docs.filter(d => d.expiration_date && differenceInCalendarDays(parseISO(d.expiration_date), today) <= 90 && differenceInCalendarDays(parseISO(d.expiration_date), today) >= 0);

  // Build the useful fields from the AI result to show in review
  const reviewFields: { label: string; value: string; field?: keyof Pick<typeof form, "expirationDate"> }[] = [];
  if (aiResult) {
    const expiry = aiResult.expirationDate ?? aiResult.programEndDate ?? null;
    if (expiry) reviewFields.push({ label: "Expiry Date", value: expiry, field: "expirationDate" });
    const name = aiResult.fullName ?? aiResult.holderName ?? aiResult.studentName ?? null;
    if (name) reviewFields.push({ label: "Name on Document", value: name });
    if (aiResult.documentNumber) reviewFields.push({ label: "Document Number", value: aiResult.documentNumber });
    if (aiResult.sevisId) reviewFields.push({ label: "SEVIS ID", value: aiResult.sevisId });
    if (aiResult.nationality) reviewFields.push({ label: "Nationality", value: aiResult.nationality });
    if (aiResult.visaCategory) reviewFields.push({ label: "Visa Category", value: aiResult.visaCategory });
    if (aiResult.category) reviewFields.push({ label: "Card Category", value: aiResult.category });
    if (aiResult.classOfAdmission) reviewFields.push({ label: "Class of Admission", value: aiResult.classOfAdmission });
  }

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
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Document Type *</label>
                <Select value={form.docType} onChange={(e) => handleDocTypeChange(e.target.value)}>
                  {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                  Expiration Date
                  {aiScanState === "done" && (aiResult?.expirationDate ?? aiResult?.programEndDate) && (
                    <span className="ml-2 text-xs text-indigo-600 font-medium">✓ AI detected</span>
                  )}
                </label>
                <Input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                  placeholder="Leave blank if no expiry"
                />
                {!form.expirationDate && (
                  <p className="text-xs text-gray-400 mt-1">Leave blank if document has no expiry date</p>
                )}
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Upload File * (PDF, JPG, PNG — max 10 MB)</label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${selectedFile ? "border-indigo-600 bg-indigo-600/5" : "border-gray-200 dark:border-gray-700 hover:border-slate-600"}`}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
                {selectedFile ? (
                  <div>
                    <p className="text-2xl mb-1">📎</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                    <button className="text-xs text-indigo-600 mt-2 hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setAiScanState("idle"); setAiResult(null); if (fileRef.current) fileRef.current.value = ""; }}>
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

            {/* AI Scan Panel */}
            {aiScanState === "scanning" && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">🤖 AI scanning your document...</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Detecting expiry dates and key details automatically</p>
                </div>
              </div>
            )}

            {aiScanState === "done" && reviewFields.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-600 text-lg">🤖</span>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">AI found these details — review and confirm</p>
                </div>
                <div className="space-y-2">
                  {reviewFields.map(({ label, value, field }) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-1.5 border-b border-emerald-100 dark:border-emerald-900 last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{label}</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{value}</p>
                      </div>
                      {field && form[field] !== value && (
                        <button
                          onClick={() => applyAiField(field, value)}
                          className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          Use this
                        </button>
                      )}
                      {field && form[field] === value && (
                        <span className="flex-shrink-0 text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Applied</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">
                  ℹ️ AI results may have errors. Always verify against your actual document before saving.
                </p>
              </div>
            )}

            {aiScanState === "done" && reviewFields.length === 0 && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">🤖 AI scanned the document but could not detect any dates or details. Please enter them manually.</p>
              </div>
            )}

            {aiScanState === "error" && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">🤖 AI scan unavailable. Please enter the expiry date manually.</p>
              </div>
            )}

            {aiScanState === "unsupported" && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">📄 AI auto-scan works on image files (JPG, PNG). For PDFs, please enter the expiry date manually.</p>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Notes (optional)</label>
              <Input placeholder="Issued date, version, or any notes..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-indigo-600">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                {uploadProgress}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={saveDocument} loading={saving} disabled={!selectedFile || aiScanState === "scanning"}>
                {aiScanState === "scanning" ? "Scanning..." : "Upload Document"}
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
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No documents yet</p>
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
                  <p className="font-medium text-gray-900 dark:text-gray-100">{DOC_LABELS[d.doc_type]}</p>
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
                  {d.file_url && !d.file_url.startsWith("pending://") && !d.file_url.startsWith("demo://") && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                      className="block text-xs text-indigo-600 hover:underline mt-2">
                      View document →
                    </a>
                  )}
                  {d.ai_extracted_data && Object.keys(d.ai_extracted_data).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-indigo-500 font-medium mb-1">🤖 AI Extracted</p>
                      {Object.entries(d.ai_extracted_data).map(([k, v]) => {
                        const display = typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
                        return display && display !== "null" ? (
                          <p key={k} className="text-xs text-gray-500 truncate">
                            <span className="capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>: {display}
                          </p>
                        ) : null;
                      })}
                    </div>
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
