/* DTZ-Puls service worker: makes the site installable and shows daily reminders.
   No caching on purpose: the app always loads the newest version from the network. */
self.addEventListener('install', function () {
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (e) {
  var d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (x) {
    d = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'DTZ-Puls', {
      body: d.body || '',
      icon: 'img/app/icon-192.png',
      badge: 'img/app/badge-96.png',
      tag: d.tag || 'dtz-daily',
      renotify: true,
      data: { url: d.url || './#path' }
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || './#path', self.registration.scope)
    .href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) {
          list[i].navigate(url).catch(function () {});
          return list[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
