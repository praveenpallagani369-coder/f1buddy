import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

// Order matters — more specific patterns first (slash variants before base)
const replacements = [
  // ── Hardcoded hex backgrounds ──────────────────────────────────
  ["bg-\\[#070f1c\\]",   "bg-gray-50"],
  ["bg-\\[#020817\\]",   "bg-gray-50"],

  // ── Slate backgrounds (specific first) ────────────────────────
  ["bg-slate-950",       "bg-gray-50"],
  ["bg-slate-900\\/80",  "bg-white"],
  ["bg-slate-900\\/50",  "bg-gray-50"],
  ["bg-slate-900",       "bg-white"],
  ["bg-slate-800\\/70",  "bg-gray-100"],
  ["bg-slate-800\\/50",  "bg-gray-100"],
  ["bg-slate-800",       "bg-gray-100"],

  // ── Slate hover backgrounds ────────────────────────────────────
  ["hover:bg-slate-800\\/70", "hover:bg-gray-100"],
  ["hover:bg-slate-800",      "hover:bg-gray-100"],
  ["hover:bg-slate-900",      "hover:bg-gray-50"],

  // ── Slate borders (specific first) ────────────────────────────
  ["border-slate-800\\/50",   "border-gray-200"],
  ["border-slate-800\\/30",   "border-gray-200"],
  ["border-slate-800",        "border-gray-200"],
  ["border-slate-700",        "border-gray-200"],

  // ── Slate text ────────────────────────────────────────────────
  ["text-slate-100",     "text-gray-800"],
  ["text-slate-200",     "text-gray-700"],
  ["text-slate-300",     "text-gray-600"],
  ["text-slate-400",     "text-gray-500"],
  ["text-slate-500",     "text-gray-400"],
  ["text-slate-600",     "text-gray-400"],

  // ── White text → dark (headings, labels) ──────────────────────
  ["text-white",         "text-gray-900"],
  ["hover:text-white",   "hover:text-gray-900"],

  // ── Ring offset ───────────────────────────────────────────────
  ["ring-offset-slate-950", "ring-offset-white"],

  // ── Status backgrounds  (dark glows → light pastels) ──────────
  ["bg-red-900\\/20",        "bg-red-50"],
  ["bg-red-900\\/10",        "bg-red-50"],
  ["bg-emerald-900\\/20",    "bg-emerald-50"],
  ["bg-emerald-900\\/10",    "bg-emerald-50"],
  ["bg-amber-900\\/20",      "bg-amber-50"],
  ["bg-amber-900\\/10",      "bg-amber-50"],
  ["bg-blue-900\\/20",       "bg-blue-50"],
  ["bg-indigo-900\\/10",     "bg-indigo-50"],
  ["bg-indigo-600\\/20",     "bg-indigo-100"],
  ["bg-indigo-600\\/10",     "bg-indigo-50"],

  // ── Status borders ────────────────────────────────────────────
  ["border-red-800\\/50",    "border-red-200"],
  ["border-red-800\\/30",    "border-red-200"],
  ["border-emerald-800\\/50","border-emerald-200"],
  ["border-emerald-800\\/30","border-emerald-200"],
  ["border-amber-800\\/50",  "border-amber-200"],
  ["border-amber-800\\/30",  "border-amber-200"],
  ["border-blue-800\\/50",   "border-blue-200"],
  ["border-blue-800\\/30",   "border-blue-200"],
  ["border-indigo-800\\/50", "border-indigo-200"],
  ["border-indigo-600\\/30", "border-indigo-300"],
  ["border-indigo-700\\/30", "border-indigo-200"],

  // ── Status text (light pastels → dark for white bg) ───────────
  ["text-red-200",       "text-red-800"],
  ["text-red-300",       "text-red-700"],
  ["text-red-400",       "text-red-600"],
  ["text-red-500",       "text-red-600"],
  ["text-emerald-200",   "text-emerald-800"],
  ["text-emerald-300",   "text-emerald-700"],
  ["text-emerald-400",   "text-emerald-600"],
  ["text-amber-200",     "text-amber-800"],
  ["text-amber-300",     "text-amber-700"],
  ["text-amber-400",     "text-amber-600"],
  ["text-amber-500",     "text-amber-600"],
  ["text-blue-200",      "text-blue-800"],
  ["text-blue-300",      "text-blue-700"],
  ["text-blue-400",      "text-blue-600"],
  ["text-indigo-200",    "text-indigo-800"],
  ["text-indigo-300",    "text-indigo-700"],
  ["text-indigo-400",    "text-indigo-600"],

  // ── Shadow cleanup ─────────────────────────────────────────────
  ["shadow-indigo-900\\/40", "shadow-indigo-200\\/60"],
];

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if ([".tsx", ".ts", ".css"].includes(extname(full))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk("src");
let totalReplaced = 0;

for (const file of files) {
  let src = readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    const re = new RegExp(from, "g");
    const next = src.replace(re, to);
    if (next !== src) { src = next; changed = true; }
  }
  if (changed) {
    writeFileSync(file, src, "utf8");
    totalReplaced++;
    console.log("updated:", file);
  }
}
console.log(`\nDone — ${totalReplaced} files updated.`);
