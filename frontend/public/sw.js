const CACHE = "levelup-v1";
const STATIC = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/") || e.request.url.includes(":3001")) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith("http")) {
        caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {});
      }
      return res;
    }).catch(() => cached))
  );
});

self.addEventListener("push", e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || "LevelUp", {
    body: data.body || "Пора выполнять задачи!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "levelup-reminder",
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/"));
});

// Schedule 9am/8pm reminders
function scheduleReminder() {
  const now = new Date();
  const targets = [9, 20];
  for (const hour of targets) {
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    setTimeout(() => {
      self.registration.showNotification("LevelUp — время квестов!", {
        body: hour === 9 ? "Доброе утро! Твои задания ждут ⚔️" : "Вечерний чекин: выполни оставшиеся квесты 🌙",
        icon: "/icon-192.png",
        tag: `reminder-${hour}`,
      });
      scheduleReminder();
    }, delay);
  }
}
scheduleReminder();
