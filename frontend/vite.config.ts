import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// D3 (CONTEXT): the dev SPA stays same-origin with the API — /api, /admin,
// /static and /media are proxied to the compose stack's nginx on :80, which
// forwards to web:8000. No CORS change anywhere in config/.
const NGINX_DEV_ORIGIN = "http://localhost:80";

/** Same-origin API access for both serving modes (dev and built preview). */
const PROXY = {
  "/api": { target: NGINX_DEV_ORIGIN, changeOrigin: true },
  "/admin": { target: NGINX_DEV_ORIGIN, changeOrigin: true },
  "/static": { target: NGINX_DEV_ORIGIN, changeOrigin: true },
  "/media": { target: NGINX_DEV_ORIGIN, changeOrigin: true },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // §10.1's installable shell (9.4 Task 8). generateSW mode per R5: the
    // plugin owns the Workbox service worker, and the push handlers come in
    // through `importScripts` (public/sw-push.js) rather than a second SW.
    VitePWA({
      registerType: "autoUpdate",
      // src/pwa/registerSW.ts registers the worker itself so the flow is
      // testable and has one code path; a plugin-injected registration would
      // be a second, invisible registration in index.html.
      injectRegister: null,
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "TCS Joining Tracker",
        short_name: "JL Tracker",
        description:
          "Community-reported TCS joining-letter tracking. Not affiliated with TCS.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        // §10.1: indigo in light (the dark variant rides index.html's
        // prefers-color-scheme meta, which the manifest format cannot express).
        theme_color: "#4F46E5",
        background_color: "#FFFFFF",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // SPA fallback for in-app routes; API/admin/static/media navigations
        // must reach the server, never the cached shell.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//, /^\/static\//, /^\/media\//],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // §10.1's push/notificationclick handlers, imported into the generated
        // worker (public/ ships at the site root, so this is a same-scope URL).
        importScripts: ["sw-push.js"],
        // Read-only caching. No POST/PATCH/DELETE pattern exists here on
        // purpose: a cached write would replay a mutation.
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/timeline\//,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "timeline-reads",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      // Dev mode serves a real worker at /sw.js so the drill (and any local
      // session) exercises the genuine registration path, not a 404 shim.
      devOptions: { enabled: true, type: "classic" },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: PROXY,
  },
  // `vite preview` serves the built bundle, which is the only way to exercise
  // §10.1's service worker offline (the built shell), so it needs the same API
  // proxy the dev server has — or the built app could not reach /api.
  preview: {
    port: 4173,
    strictPort: true,
    proxy: PROXY,
  },
  build: {
    outDir: "dist",
  },
});
