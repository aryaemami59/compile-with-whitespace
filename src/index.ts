import path from "path"
import { compileTSWithWhitespace } from "./compileTSWithWhitespace"

export { compileTSWithWhitespace } from "./compileTSWithWhitespace"

export const run = () => {
  const args = process.argv.slice(2)
  const [directory, tsconfigPath] = args
  compileTSWithWhitespace(path.resolve(directory), path.resolve(tsconfigPath))
}

run()
