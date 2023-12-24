import type { Options } from "tsup"
import { defineConfig } from "tsup"

export default defineConfig(options => {
  const commonOptions: Options = {
    entry: ["src/index.ts"],
    sourcemap: true,
    clean: true,
    dts: true,
    ...options,
  }

  return [
    {
      ...commonOptions,
      format: ["esm"],
      outExtension: () => ({ js: ".mjs" }),
    },

    {
      ...commonOptions,
      format: ["cjs"],
      outExtension: () => ({ js: ".cjs" }),
    },
  ]
})
