import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/board/**/*.test.ts", "tests/board/**/*.test.tsx"],
    clearMocks: true,
    restoreMocks: true,
  },
})
