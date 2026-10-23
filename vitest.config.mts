import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit and component test configuration.
 *
 * - Default environment is `node` (pure utility tests need no DOM).
 * - Component tests switch to jsdom via a per-file docblock:
 *   `/** @vitest-environment jsdom *\/`
 * - JSX uses the automatic runtime picked up from tsconfig
 *   (`"jsx": "react-jsx"`), matching application code.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
