// flood-sw.js — Service Worker ของแผนที่น้ำท่วม (scope: /flood เท่านั้น ไม่แตะหน้าอื่นของ prspa.net)
// กลยุทธ์: หน้าเว็บ = network-first (ได้เวอร์ชันใหม่เสมอ ถ้าออฟไลน์ค่อยใช้ cache) · tile แผนที่ = cache-first · API/ข้อมูลสด = ไม่ cache
const VER = 'flood-sw-1';
const SHELL = ['/flood.html', '/flood-manifest.json', '/flood-icon-192.png', '/flood-icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('flood-sw-') && k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // ข้อมูลสด: Worker / Firestore / Traffy / กล้อง / Windy → ตรงไป ไม่ cache
  if (/workers\.dev|firestore|googleapis|traffy|thaiclouderp|windy|open-meteo|thaiwater/.test(u.host)) return;
  // tile แผนที่: cache-first (ประหยัดเน็ต ใช้ซ้ำได้)
  if (/tile\.openstreetmap|basemaps\.cartocdn/.test(u.host)) {
    e.respondWith(caches.open('flood-tiles').then(async c => { const hit = await c.match(e.request); if (hit) return hit; const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }));
    return;
  }
  // หน้าเว็บ/ไฟล์ของเรา: network-first
  if (u.origin === location.origin && u.pathname.startsWith('/flood')) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) caches.open(VER).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
