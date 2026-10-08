self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || "" }; }

  const title = data.title || "SHB";
  const options = {
    body: data.body || "You have a new notification.",
    icon: data.icon || "/byte-icon-512.png.png",
    badge: data.badge || "/ic_stat_byte_96.png.png",
    image: data.image || "/byte-icon-512.png.png",
    data: { url: data.url || "/" },
    tag: data.tag || "shb-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== url) void client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    }),
  );
});