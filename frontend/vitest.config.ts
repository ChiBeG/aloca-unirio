import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    exclude: ["tests/**", "node_modules/**", ".next/**"],
    globals: true,
    include: ["components/**/*.test.tsx", "lib/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
