import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: {
      proxy: {
        "/~oauth": "http://localhost:8080",
      },
    },
  },
});
