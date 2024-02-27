import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    testTimeout: 10_000,
    dir: "test",
  },
})
