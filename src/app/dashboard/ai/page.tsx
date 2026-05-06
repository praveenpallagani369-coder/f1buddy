"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { role: "user" | "assistant"; content: string; timestamp?: string };
type OPTPhase = "f1_active" | "opt_pending" | "opt_active" | "stem_opt_active" | "stem_180_extension" | "grace_period" | "program_ended";

const PHASE_QUESTIONS: Record<OPTPhase, string[]> = {
  f1_active: [
    "Can I work off-campus on F-1 visa?",
    "When should I apply for OPT?",
    "Do I need to file taxes if I had no US income?",
    "What documents do I need to re-enter the US after travel?",
    "How do I get an SSN as an international student?",
    "What's the 5-month travel rule for F-1 students?",
  ],
  opt_pending: [
    "Can I start working before my EAD card arrives?",
    "How long does USCIS take to process OPT applications?",
    "What do I do if my OPT is still pending and my program ends?",
    "Can I travel internationally while my OPT is pending?",
    "What happens if my OPT application is denied?",
    "Do I need to report my employer before my EAD arrives?",
  ],
  opt_active: [
    "How does the 90-day OPT unemployment limit work?",
    "Do days traveling abroad count toward OPT unemployment?",
    "When and how do I report a new employer to my DSO?",
    "Can I change jobs during OPT?",
    "Am I eligible to apply for STEM OPT extension?",
    "What documents do I need for re-entry as an OPT worker?",
  ],
  stem_opt_active: [
    "What are the STEM OPT validation report deadlines?",
    "What happens if my employer loses E-Verify enrollment?",
    "Can I change employers during STEM OPT?",
    "How does the 150-day STEM unemployment limit work?",
    "What is an I-983 Training Plan and how do I fill it out?",
    "Can I apply for H-1B while on STEM OPT?",
  ],
  stem_180_extension: [
    "Am I allowed to work during the 180-day auto-extension?",
    "What document proves my work authorization during the 180-day cap-gap?",
    "What do I do if my STEM extension is denied?",
    "Can I travel internationally during the 180-day extension?",
    "How long does STEM OPT extension take to process?",
    "When should I start looking for H-1B sponsorship?",
  ],
  grace_period: [
    "Can I work at all during the 60-day grace period?",
    "What are my options during the 60-day grace period?",
    "How do I file for a change of status from F-1?",
    "What happens if I overstay the 60-day grace period?",
    "Does H-1B cap-gap extend my work authorization?",
    "Should I depart the US or change status?",
  ],
  program_ended: [
    "What are my options now that my program has ended?",
    "Can I stay in the US and change my visa status?",
    "What are the consequences of overstaying my visa?",
    "How do I apply for reinstatement if I fell out of status?",
    "Can I reapply for a student visa from outside the US?",
    "What does 'voluntary departure' mean for immigration?",
  ],
};

export default function AIPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [phase, setPhase] = useState<OPTPhase>("f1_active");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
    loadPhase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadPhase() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: opt } = await supabase
        .from("opt_status")
        .select("opt_type,ead_start_date,ead_end_date,application_date")
        .eq("user_id", user.id)
        .single();

      if (!opt) { setPhase("f1_active"); return; }
      const today = new Date();
      if (opt.application_date && !opt.ead_start_date) { setPhase("opt_pending"); return; }
      if (!opt.ead_start_date || !opt.ead_end_date) { setPhase("f1_active"); return; }
      const eadStart = new Date(opt.ead_start_date);
      const eadEnd   = new Date(opt.ead_end_date);
      const graceEnd = new Date(eadEnd.getTime() + 60 * 24 * 60 * 60 * 1000);
      const stem180End = new Date(eadEnd.getTime() + 180 * 24 * 60 * 60 * 1000);
      if (today < eadStart) { setPhase(opt.application_date ? "opt_pending" : "f1_active"); return; }
      if (today <= eadEnd)  { setPhase(opt.opt_type === "stem_extension" ? "stem_opt_active" : "opt_active"); return; }
      if (opt.opt_type === "stem_extension" && opt.application_date && new Date(opt.application_date) <= eadEnd && today <= stem180End) {
        setPhase("stem_180_extension"); return;
      }
      setPhase(today <= graceEnd ? "grace_period" : "program_ended");
    } catch { /* use default */ }
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/ai");
      const data = await res.json();
      if (data.success && data.data.messages.length > 0) {
        setMessages(data.data.messages);
      }
    } catch {
      // non-critical — start fresh
    } finally {
      setHistoryLoaded(true);
    }
  }

  async function clearHistory() {
    setClearing(true);
    try {
      await fetch("/api/ai", { method: "DELETE" });
      setMessages([]);
    } finally {
      setClearing(false);
    }
  }

  async function send(question?: string) {
    const text = question ?? input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((m) => [...m, { role: "assistant", content: data.data.answer, timestamp: new Date().toISOString() }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `❌ ${data.error?.message ?? "Error getting response"}` }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "❌ Network error. Please check your connection." }]);
    }
    setLoading(false);
  }

  const isEmpty = historyLoaded && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-13rem)] lg:h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">AI Immigration Assistant</h1>
          <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">Knows your profile &amp; deadlines</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            disabled={clearing}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {clearing ? "Clearing..." : "Clear history"}
          </button>
        )}
      </div>

      {/* Legal disclaimer banner */}
      <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 mb-3">
        <span className="text-amber-500 flex-shrink-0 mt-0.5 text-base leading-none">⚠️</span>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Not legal advice.</strong> This AI provides general information about F-1 regulations only.
          Immigration rules change frequently. Always verify with your DSO or a licensed immigration attorney
          before making any visa-related decisions.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {!historyLoaded ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Ask anything about F-1 compliance</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm">
              I know your program, OPT status, travel history, and upcoming deadlines — so my answers are specific to your situation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
              {PHASE_QUESTIONS[phase].map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="text-left p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors hover:border-indigo-200">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-bl-sm"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="space-y-2 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about OPT, travel, taxes, SEVIS..."
          rows={2}
          className="resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button onClick={() => send()} loading={loading} disabled={!input.trim()} className="self-end px-5">
          Send
        </Button>
      </div>
    </div>
  );
}
