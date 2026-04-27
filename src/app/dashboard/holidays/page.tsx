"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarDays, parseISO, format } from "date-fns";

interface Holiday {
  date: string;
  name: string;
  localName: string;
  types: string[];
}

const F1_NOTES: Record<string, string> = {
  "New Year's Day": "Banks, post offices, and most government offices closed. USCIS closed.",
  "Martin Luther King, Jr. Day": "Federal holiday. Universities may have day off. USCIS closed.",
  "Washington's Birthday": "Also known as Presidents' Day. Federal offices and USCIS closed.",
  "Memorial Day": "Summer unofficially begins. Banks and federal offices closed.",
  "Juneteenth": "Federal holiday since 2021. Federal offices closed.",
  "Independence Day": "July 4th. Fireworks and celebrations. Everything closed.",
  "Labour Day": "First Monday of September. Marks end of summer. Banks/offices closed.",
  "Labor Day": "First Monday of September. Marks end of summer. Banks/offices closed.",
  "Columbus Day": "Some states call it Indigenous Peoples' Day. Federal offices closed, most businesses open.",
  "Veterans Day": "Federal offices closed. Most universities remain open.",
  "Thanksgiving Day": "Fourth Thursday of November. Major holiday — most places closed Thu-Fri. Great for travel if planned early.",
  "Christmas Day": "December 25. Nearly everything closed. Plan groceries in advance.",
};

const SCHOOL_BREAKS = [
  { name: "Spring Break", period: "Usually March", note: "1-2 weeks off. Good time for domestic travel or campus activities." },
  { name: "Summer Break", period: "May - August", note: "If on OPT, you must be employed. If not on OPT, you can travel or take summer classes." },
  { name: "Thanksgiving Break", period: "Late November", note: "Usually Wed-Sun. Flights are expensive — book 2+ months early." },
  { name: "Winter Break", period: "Mid Dec - Mid Jan", note: "3-4 weeks. If traveling internationally, ensure I-20 travel signature is current." },
];

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  const year = new Date().getFullYear();
  const today = new Date();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/holidays?year=${year}&country=US`);
        const data = await res.json();
        if (data.success) setHolidays(data.data);
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, [year]);

  const upcoming = holidays.filter((h) => {
    const days = differenceInCalendarDays(parseISO(h.date), today);
    return days >= -1;
  });

  const nextHoliday = upcoming[0];
  const daysToNext = nextHoliday ? differenceInCalendarDays(parseISO(nextHoliday.date), today) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">US Holidays & School Breaks</h1>
        <p className="text-slate-400 text-sm">Know when banks, USCIS, and schools are closed</p>
      </div>

      {/* Next holiday */}
      {nextHoliday && (
        <Card className="border-indigo-800/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Next Holiday</p>
                <p className="text-xl font-bold text-white">{nextHoliday.name}</p>
                <p className="text-sm text-slate-400">{format(parseISO(nextHoliday.date), "EEEE, MMMM d, yyyy")}</p>
                {F1_NOTES[nextHoliday.name] && (
                  <p className="text-xs text-indigo-300 mt-2">{F1_NOTES[nextHoliday.name]}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-indigo-400">
                  {daysToNext === 0 ? "Today!" : `${daysToNext}d`}
                </p>
                <p className="text-xs text-slate-500">{daysToNext === 0 ? "" : "away"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* School breaks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Typical University Breaks</CardTitle>
          <p className="text-xs text-slate-500">Check your school&apos;s academic calendar for exact dates</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {SCHOOL_BREAKS.map((b) => (
            <div key={b.name} className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-white font-medium">{b.name}</p>
                <Badge variant="info" className="text-xs">{b.period}</Badge>
              </div>
              <p className="text-xs text-slate-400">{b.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">US Federal Holidays {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading holidays...</p>
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Could not load holidays</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => {
                const days = differenceInCalendarDays(parseISO(h.date), today);
                const isPast = days < 0;
                return (
                  <div
                    key={h.date}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isPast
                        ? "bg-slate-900/30 border-slate-800/50 opacity-50"
                        : days <= 7
                        ? "bg-indigo-900/10 border-indigo-800/30"
                        : "bg-slate-800/50 border-slate-800"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isPast ? "text-slate-500" : "text-white"}`}>{h.name}</p>
                      <p className="text-xs text-slate-500">{format(parseISO(h.date), "EEEE, MMMM d")}</p>
                      {F1_NOTES[h.name] && !isPast && (
                        <p className="text-xs text-slate-400 mt-0.5">{F1_NOTES[h.name]}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {isPast ? (
                        <span className="text-xs text-slate-600">Passed</span>
                      ) : days === 0 ? (
                        <Badge variant="success" className="text-xs">Today</Badge>
                      ) : (
                        <span className="text-sm text-slate-400">{days}d</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
