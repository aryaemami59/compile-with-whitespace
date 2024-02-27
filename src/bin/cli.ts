#!/usr/bin/env node

import path from "node:path"
import { compileTSWithWhitespace } from ".."

export const run = async () => {
  const args = process.argv.slice(2)
  const [directory] = args
  compileTSWithWhitespace(path.resolve(directory))
}

run()
