// @lovable.dev/vite-tanstack-config already includes:
// - tanstackStart
// - viteReact
// - tailwindcss
// - tsConfigPaths
// - cloudflare build integration
// - componentTagger in dev
// - VITE_* env injection
// - @ path alias
// - React/TanStack dedupe
// - error logger plugins
// - sandbox detection
//
// Do not add those plugins manually, or the app may break with duplicate plugins.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: {
      proxy: {
        // Proxy OAuth requests to the Lovable Auth service during local dev
        "/~oauth": "http://localhost:8080",
      },
    },
  },

  vite: {
    server: {
      proxy: {
        "/~oauth": {
          target: "http://localhost:8080",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
