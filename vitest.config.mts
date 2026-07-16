import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Vitest owns the unit suite; Playwright specs (tests/playwright/**) run via
    // `npm run test:e2e` and must not be collected here or they crash on import.
    include: ["tests/unit/**/*.{test,spec}.ts"],
    exclude: ["node_modules/**", "tests/playwright/**"],
  },
});
