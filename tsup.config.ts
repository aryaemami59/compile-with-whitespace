import { resolve } from 'node:path'
import type { Options } from 'tsup'
import { defineConfig } from 'tsup'

export default defineConfig(options => {
  const commonOptions: Options = {
    sourcemap: true,
    clean: true,
    format: ['cjs', 'esm'],
    tsconfig: resolve('tsconfig.build.json'),
    ...options,
  }

  return [
    {
      ...commonOptions,
      dts: true,
      entry: ['src/index.ts'],
    },
    {
      ...commonOptions,
      entry: ['src/bin/cli.ts'],
    },
  ]
})
