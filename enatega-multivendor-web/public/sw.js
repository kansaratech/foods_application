/*
 * Padharo no longer uses a service worker.
 *
 * The previous file here was a pre-built Workbox bundle with a hard-coded
 * precache manifest pointing at specific `/_next/static/chunks/*.js?v=…` URLs.
 * Every production rebuild changes those chunk hashes, so the stale SW then
 * answered chunk requests with `net::ERR_FAILED` ("could not generate a
 * response") and the app shell could never hydrate — an infinite spinner.
 *
 * This replacement installs immediately, wipes every Cache Storage entry the
 * old SW created, unregisters itself, and reloads open tabs. Browsers that
 * still have the old worker pick this up on their normal update check and
 * self-heal with no user action.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (err) {
        // Cache Storage may be unavailable; nothing to clean up then.
      }

      try {
        await self.registration.unregister();
      } catch (err) {
        /* already gone */
      }

      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch (err) {
          /* client may not allow navigation */
        }
      }
    })(),
  );
});

// Never intercept fetches — let the network/HTTP cache do its job.
