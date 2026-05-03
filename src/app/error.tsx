"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-orange-100 p-4">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Something went wrong</h2>
        <p className="text-stone-500 mb-6 text-sm leading-relaxed">
          An unexpected error occurred on this page. The error has been reported.
          {error.digest && (
            <span className="block mt-1 text-xs text-stone-400">Error ID: {error.digest}</span>
          )}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
