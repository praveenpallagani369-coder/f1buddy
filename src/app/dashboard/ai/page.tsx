"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED = [
  "Can I work off-campus on F-1 visa?",
  "How does the 90-day OPT unemployment limit work?",
  "What happens if my STEM OPT extension is pending when my OPT expires?",
  "Do I need to file taxes if I had no US income?",
  "What documents do I need to re-enter the US after travel?",
  "How do I get an SSN as an international student?",
  "What's the cheapest way to send money home?",
  "How do I build credit history in the US?",
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((m) => [...m, { role: "assistant", content: data.data.answer }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `❌ ${data.error?.message ?? "Error getting response"}` }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "❌ Network error. Please check your connection." }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Immigration Assistant</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Powered by Groq + Llama 3.3 · Ask any F-1 compliance question</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ask anything about F-1 compliance</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm">
              Get quick answers about OPT, travel, taxes, SEVIS, and more — with CFR references.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="text-left p-3 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors hover:border-indigo-200">
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
                    ? "bg-indigo-600 text-gray-900 rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="space-y-2 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 text-center mb-3">
        AI responses are informational only and not legal advice. Verify with your DSO or immigration attorney.
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
