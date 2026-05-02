// Bump this string on every production deploy to force clients to re-fetch
// all cached assets. Old caches are deleted in the activate event below.
const CACHE_NAME = "visabuddy-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  "/",
  "/dashboard",
  "/offline.html",
  "/icon.svg",
  "/manifest.json",
];

// Install: precache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets, offline fallback for pages
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API calls: network only (no cache)
  if (url.pathname.startsWith("/api/")) return;

  // Pages: network-first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // Assets: cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && url.pathname.match(/\.(js|css|svg|png|jpg|ico|woff2)$/)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});

// Push: show notification
self.addEventListener("push", (event) => {
  let data = { title: "VisaBuddy", body: "You have a new update.", url: "/dashboard" };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url },
      vibrate: [100, 50, 100],
      tag: "visabuddy",
      renotify: true,
    })
  );
});

// Notification click: open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus().then((c) => c.navigate(targetUrl));
        return self.clients.openWindow(targetUrl);
      })
  );
});
