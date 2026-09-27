/* eslint-env serviceworker */
/**
 * §10.1's push handlers (9.4 Task 8), imported into the generated Workbox
 * worker via `workbox.importScripts` — one service worker, not two.
 *
 * The payload contract is 6.2's, unchanged for Web Push: `{title, body, data}`
 * where `data.click_action` is an SPA route. Nothing here reads or stores post
 * or comment text (T-6.2-03): the server already sends a zero-PII payload, and
 * this worker only displays it.
 *
 * Not bundled or transpiled (`public/` is copied as-is), so it is written in
 * plain ES5-compatible JavaScript and guarded with feature checks.
 */

self.addEventListener("push", (event) => {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    // A non-JSON push still deserves a visible notification rather than
    // silence; the notification must never carry unparsed bytes.
    payload = {};
  }

  var title = payload.title || "TCS Joining Tracker";
  var body = payload.body || "";
  var data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || undefined,
      data: data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  var target = (event.notification.data && event.notification.data.click_action) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Prefer an already-open tab: focus it and route it to the deep link.
        for (var i = 0; i < clientList.length; i += 1) {
          var client = clientList[i];
          if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
            client.postMessage({ type: "push-click", clickAction: target });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
        return undefined;
      }),
  );
});
