import type { Options } from "tsup"
import { defineConfig } from "tsup"

export default defineConfig(options => {
  const commonOptions: Options = {
    sourcemap: true,
    clean: true,
    dts: true,

    ...options,
  }

  return [
    {
      ...commonOptions,
      entry: ["src/index.ts"],
      format: ["esm", "cjs"],
      // outExtension: ({ format }) => ({
      //   js: format === "esm" ? `.mjs` : ".cjs",
      //   dts: format === "cjs" ? ".d.cts" : ".d.mts",
      // }),
    },

    // {
    //   ...commonOptions,
    //   format: ["cjs"],
    //   outExtension: () => ({ js: ".cjs" }),
    // },
    {
      entry: ["src/bin/cli.ts"],
      sourcemap: true,
      clean: true,
      dts: true,
      format: ["esm", "cjs"],
      outExtension: ({ format }) => ({ js: format === "esm" ? ".mjs" : ".js" }),
    },
  ]
})
