import { CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface AttorneyCardProps {
  name: string;
  avatarUrl?: string;
  bio: string;
  barNumber: string;
  statesLicensed: string[];
  consultationUrl?: string;
  hourlyRate?: number;
  isVerified: boolean;
}

export function AttorneyCard({
  name,
  avatarUrl,
  bio,
  barNumber,
  statesLicensed,
  consultationUrl,
  hourlyRate,
  isVerified,
}: AttorneyCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Verification Glow */}
      {isVerified && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
      )}

      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-700">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
            {isVerified && (
              <span title="Verified Attorney">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-3">
            Licensed in: {statesLicensed.join(", ")}
          </p>
        </div>

        {hourlyRate && (
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">${hourlyRate}</p>
            <p className="text-[10px] text-gray-500 uppercase">per hour</p>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
        {bio}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] font-medium text-gray-600 dark:text-gray-400">
          Bar #: {barNumber}
        </div>
        <div className="px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-[11px] font-medium text-orange-700 dark:text-orange-400">
          Immigration Law
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        {consultationUrl ? (
          <Link 
            href={consultationUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white h-10 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center active:scale-[0.98] shadow-sm shadow-orange-200/60"
          >
            Book Consultation
          </Link>
        ) : (
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-400 h-10 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center cursor-not-allowed">
            Booking Unavailable
          </div>
        )}
        <Link 
          href="#"
          className="w-10 h-10 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Mail className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
