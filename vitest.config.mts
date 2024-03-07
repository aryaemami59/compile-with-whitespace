import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    testTimeout: 10_000,
    setupFiles: ["jest-extended/all"],
    dir: "test",
  },
})
