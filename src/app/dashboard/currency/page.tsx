"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const POPULAR_CURRENCIES = [
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "PHP", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "VND", name: "Vietnamese Dong", flag: "🇻🇳" },
  { code: "BDT", name: "Bangladeshi Taka", flag: "🇧🇩" },
  { code: "PKR", name: "Pakistani Rupee", flag: "🇵🇰" },
  { code: "TWD", name: "Taiwanese Dollar", flag: "🇹🇼" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦" },
  { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭" },
  { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬" },
  { code: "LKR", name: "Sri Lankan Rupee", flag: "🇱🇰" },
  { code: "NPR", name: "Nepalese Rupee", flag: "🇳🇵" },
  { code: "TRY", name: "Turkish Lira", flag: "🇹🇷" },
  { code: "IDR", name: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "COP", name: "Colombian Peso", flag: "🇨🇴" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪" },
];

const TRANSFER_SERVICES = [
  { name: "Wise (TransferWise)", url: "https://wise.com", note: "Usually lowest fees, mid-market rate" },
  { name: "Remitly", url: "https://www.remitly.com", note: "Fast delivery, good for smaller amounts" },
  { name: "Western Union", url: "https://www.westernunion.com", note: "Wide network, cash pickup available" },
  { name: "Xoom (PayPal)", url: "https://www.xoom.com", note: "Integrates with PayPal, no SSN needed for some" },
];

export default function CurrencyPage() {
  const [amount, setAmount] = useState("100");
  const [from] = useState("USD");
  const [to, setTo] = useState("INR");
  const [result, setResult] = useState<{ rate: number; converted: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { convert(); }, [to]);

  async function convert() {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/currency?from=${from}&to=${to}&amount=${numAmount}`);
      const data = await res.json();
      if (data.success) {
        setResult({ rate: data.data.rate, converted: data.data.converted });
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  const selectedCurrency = POPULAR_CURRENCIES.find((c) => c.code === to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Currency Converter</h1>
        <p className="text-slate-400 text-sm">Live exchange rates for sending money home</p>
      </div>

      {/* Converter */}
      <Card className="border-indigo-800/30">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Amount (USD)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={convert}
                onKeyDown={(e) => e.key === "Enter" && convert()}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="flex items-center justify-center text-2xl text-slate-500 pb-1">&rarr;</div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">To Currency</label>
              <Select value={to} onChange={(e) => setTo(e.target.value)}>
                {POPULAR_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {result && !loading && (
            <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
              <p className="text-3xl font-bold text-white">
                {selectedCurrency?.flag} {result.converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {to}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                1 USD = {result.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {to}
              </p>
              <p className="text-xs text-slate-500 mt-2">Mid-market rate via Frankfurter API (ECB data)</p>
            </div>
          )}
          {loading && (
            <div className="mt-6 text-center text-slate-400 py-4">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Fetching rates...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick conversions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Quick Reference</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[100, 500, 1000, 5000].map((amt) => (
              <div key={amt} className="p-3 rounded-lg bg-slate-800/50 border border-slate-800 text-center">
                <p className="text-sm text-slate-400">${amt.toLocaleString()} USD</p>
                <p className="text-lg font-semibold text-white mt-1">
                  {result ? (amt * result.rate).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"} {to}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transfer services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Money Transfer Services</CardTitle>
          <p className="text-xs text-slate-500">Compare services to find the best rate and lowest fees</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {TRANSFER_SERVICES.map((svc) => (
            <a
              key={svc.name}
              href={svc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800 hover:border-indigo-800/50 transition-colors"
            >
              <div>
                <p className="text-sm text-white font-medium">{svc.name}</p>
                <p className="text-xs text-slate-400">{svc.note}</p>
              </div>
              <span className="text-indigo-400 text-sm">&rarr;</span>
            </a>
          ))}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tips for International Students</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          <p>&#8226; Banks often add 2-4% markup on exchange rates. Wise typically offers the mid-market rate with a small flat fee.</p>
          <p>&#8226; Avoid airport currency exchanges — they have the worst rates (5-10% markup).</p>
          <p>&#8226; For recurring transfers, set up a Wise or Remitly account linked to your US bank for quick transfers.</p>
          <p>&#8226; You do NOT need an SSN to open a bank account at most US banks. Bring your passport, I-20, and I-94.</p>
          <p>&#8226; Consider a no-foreign-transaction-fee credit card (Discover, Capital One) for purchases in your home currency.</p>
        </CardContent>
      </Card>
    </div>
  );
}
