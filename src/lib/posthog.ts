import posthog from "posthog-js";

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
  if (!key || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // handled manually per route
    persistence: "localStorage",
  });
}

export { posthog };
