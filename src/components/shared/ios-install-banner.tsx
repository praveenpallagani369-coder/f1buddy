"use client";
import { useState, useEffect } from "react";

// Shows only on iOS Safari where the standard BeforeInstallPromptEvent is unavailable.
// Detects: iOS device + Safari (not Chrome/Firefox in-app browser) + not already installed as PWA.
export function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
    const isStandalone = ("standalone" in navigator) && (navigator as { standalone?: boolean }).standalone;
    const dismissed = sessionStorage.getItem("ios_banner_dismissed") === "1";

    if (isIOS && isSafari && !isStandalone && !dismissed) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    sessionStorage.setItem("ios_banner_dismissed", "1");
    setShow(false);
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/20 p-4">
        <div className="flex items-start gap-3">
          {/* App icon placeholder */}
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
            VB
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Install VisaBuddy</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              Tap{" "}
              <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 0 1 .707.293l3 3a1 1 0 0 1-1.414 1.414L11 5.414V13a1 1 0 1 1-2 0V5.414L7.707 6.707A1 1 0 0 1 6.293 5.293l3-3A1 1 0 0 1 10 2z" />
                  <path d="M3 14a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1zm10 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1z" />
                  <path d="M3 17a1 1 0 0 1 1-1h12a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1z" />
                </svg>
                Share
              </span>{" "}
              then{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">&ldquo;Add to Home Screen&rdquo;</span>{" "}
              for the best experience.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 p-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Arrow pointing down toward bottom nav */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-700 rotate-45" />
      </div>
    </div>
  );
}
