import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Keep API requests same-origin to the browser by proxying through Vite.
const BACKEND_ORIGIN = "https://tcsjl-backend.bond";

const BACKEND_PROXY = {
  "/api": { target: BACKEND_ORIGIN, changeOrigin: true, secure: false },
  "/admin": { target: BACKEND_ORIGIN, changeOrigin: true, secure: false },
  "/static": { target: BACKEND_ORIGIN, changeOrigin: true, secure: false },
  "/media": { target: BACKEND_ORIGIN, changeOrigin: true, secure: false },
  "/ws": { target: BACKEND_ORIGIN, ws: true, secure: false },
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
        // §10.1 as amended in 9.5: v2 sky-700 (#0369A1) in light (the dark
        // variant rides index.html's prefers-color-scheme meta, which the
        // manifest format cannot express).
        theme_color: "#0369A1",
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
        //
        // The rule for what may be cached: only payloads that are **identical for
        // every visitor**. The §10.1 strip promises "Showing cached data", and a
        // cache entry outlives a logout inside the browser profile — so caching a
        // viewer-scoped payload (the feed carries `has_voted`, notifications and
        // the dashboard carry account content) could serve one account's state to
        // another while offline. Those stay uncached; these three endpoints are
        // public reads (9.3 D1, 7.2 D-08) and carry nothing account-specific.
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/(announcements|analytics|public)\//,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "public-reads",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Account-scoped, so this entry is a **recorded privacy question**
            // rather than a pattern to copy: after a logout it still holds the
            // previous session's timeline and could answer for a second account
            // on the same browser while offline (9.4 verification O-94-2). Left
            // exactly as 9.4 shipped it — the fix is a cache purge on logout or
            // dropping this entry, and that call is not this file's to make.
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
    proxy: BACKEND_PROXY,
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: BACKEND_PROXY,
  },
  build: {
    outDir: "dist",
  },
});
