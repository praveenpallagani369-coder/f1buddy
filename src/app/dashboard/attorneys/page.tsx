"use client";

import { useState } from "react";
import { AttorneyCard } from "@/components/shared/AttorneyCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShieldCheck, MessageSquare } from "lucide-react";

// Mock data for initial UI build
const MOCK_ATTORNEYS = [
  {
    id: "1",
    name: "Atty. Sarah Jenkins",
    bio: "Specializing in F-1 to H-1B transitions and EB-2/3 green card processing. 12+ years of experience helping international students navigate complex USCIS requirements.",
    barNumber: "CA-882910",
    statesLicensed: ["CA", "NY"],
    consultationUrl: "https://example.com/book/sarah",
    hourlyRate: 350,
    isVerified: true,
  },
  {
    id: "2",
    name: "Atty. Michael Chen",
    bio: "Expert in O-1 and EB-1 extraordinary ability visas. Former USCIS officer with deep knowledge of STEM OPT and cap-gap regulations.",
    barNumber: "TX-442109",
    statesLicensed: ["TX"],
    consultationUrl: "https://example.com/book/michael",
    hourlyRate: 400,
    isVerified: true,
  },
  {
    id: "3",
    name: "Atty. Priya Sharma",
    bio: "Dedicated to helping students with status reinstatement and travel-related issues. Special expertise in DTAA tax treaty implications for NRIs.",
    barNumber: "IL-772334",
    statesLicensed: ["IL", "FL"],
    consultationUrl: "https://example.com/book/priya",
    hourlyRate: 275,
    isVerified: true,
  },
];

export default function AttorneysPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_ATTORNEYS.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.bio.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Immigration Attorneys</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Connect with verified experts for legal advice and consultations.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Verified Credentials</p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5 leading-relaxed">
              Every attorney on this list has been manually verified by VisaBuddy for active bar standing and immigration expertise.
            </p>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Consultation Discounts</p>
            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-0.5 leading-relaxed">
              Book through VisaBuddy to get 15% off your first 30-minute consultation with any participating attorney.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search by name, state, or specialty..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((attorney) => (
          <AttorneyCard key={attorney.id} {...attorney} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No attorneys found matching your search.</p>
          <button onClick={() => setSearch("")} className="text-orange-600 dark:text-orange-400 text-sm mt-2 hover:underline">Clear search</button>
        </div>
      )}
    </div>
  );
}
