/* Liebesstrauß – Service Worker: Offline-Hülle, Push-Benachrichtigungen, Badge */
const CACHE = 'liebesstrauss-v1';
const SHELL = ['/', '/manifest.webmanifest', '/theme-init.js', '/icons/icon.svg', '/icons/icon-192.png'];
// Im Entwicklungsmodus (sw.js?dev) wird nichts zwischengespeichert – nur Push.
const DEV = new URL(self.location.href).searchParams.has('dev');

self.addEventListener('install', (event) => {
  event.waitUntil(
    (DEV ? caches.delete(CACHE) : caches.open(CACHE).then((c) => c.addAll(SHELL))).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (DEV || req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Seiten: zuerst Netzwerk, offline die zwischengespeicherte App-Hülle
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Gehashte Build-Dateien ändern sich nie: Cache zuerst
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
    return;
  }

  // Icons & Manifest: aus dem Cache liefern und im Hintergrund auffrischen
  if (!/^\/(icons\/|manifest\.webmanifest|theme-init\.js)/.test(url.pathname)) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    }),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }

  event.waitUntil((async () => {
    if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
      try { await self.navigator.setAppBadge(data.badge); } catch {}
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focused = windows.some((w) => w.visibilityState === 'visible' && w.focused);
    if (focused) {
      windows.forEach((w) => w.postMessage({ type: 'push', data }));
      return;
    }
    await self.registration.showNotification(data.title || 'Liebesstrauß', {
      body: data.body || 'Eine neue Blume wartet auf dich.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || 'liebesstrauss',
      renotify: true,
      data: { url: data.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of windows) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
