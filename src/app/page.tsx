import Link from "next/link";

export default function LandingPage() {
  const features = [
    { icon: "📅", title: "Deadline Tracker", desc: "Never miss OPT, SEVIS, or tax deadlines. Smart alerts at 30, 14, 7, and 1 day." },
    { icon: "💼", title: "OPT Employment", desc: "Track unemployment days in real-time. Get alerted before you hit the 90-day limit." },
    { icon: "✈️", title: "Travel Tracker", desc: "Log trips, track days outside the US, and get warned before the 5-month limit." },
    { icon: "📁", title: "Document Vault", desc: "Store I-20, EAD, passport scans with expiration tracking and alerts." },
    { icon: "🧾", title: "Tax Guide", desc: "1040-NR vs 1040, Form 8843 reminders, and treaty benefit lookup." },
    { icon: "🤖", title: "AI Assistant", desc: "Ask any F-1 question. Powered by Groq + Llama 3.3 with CFR citations." },
  ];

  return (
    <div className="min-h-screen bg-[#020817]">
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">🎓</div>
          <span className="font-bold text-white">F1Buddy</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
          <Link href="/auth/register" className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Get Started Free</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 text-xs font-medium mb-6">
          🎓 Built for 1.1M F-1 International Students
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
          Never miss an <span className="text-indigo-400">immigration</span> deadline again
        </h1>
        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          F1Buddy tracks your OPT unemployment days, visa deadlines, travel limits, and tax obligations so you can focus on studying.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/register" className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors text-lg">Start Free — No Credit Card</Link>
          <Link href="/auth/login" className="px-8 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-lg">Sign In</Link>
        </div>
        <p className="text-sm text-slate-500 mt-4">Free plan · Premium $6.99/mo · University licenses</p>
      </div>

      <div className="max-w-5xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Everything to stay in F-1 status</h2>
        <p className="text-slate-400 text-center mb-10">All your compliance tools in one dashboard</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-800/50 transition-colors">
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="bg-indigo-600/10 border border-indigo-600/30 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to stop worrying about deadlines?</h2>
          <p className="text-slate-400 mb-6">Join thousands of F-1 students staying in compliance</p>
          <Link href="/auth/register" className="inline-block px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">Create Free Account →</Link>
        </div>
      </div>

      <footer className="border-t border-slate-800 px-6 py-6 text-center text-slate-500 text-sm">
        F1Buddy · Not affiliated with USCIS or DHS · Always consult your DSO for immigration advice
      </footer>
    </div>
  );
}
