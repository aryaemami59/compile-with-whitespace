import path from "path"
import { compileTSWithWhitespace } from "./compileTSWithWhitespace"

export { compileTSWithWhitespace } from "./compileTSWithWhitespace"

export const run = () => {
  const args = process.argv.slice(2)
  const [directory] = args
  compileTSWithWhitespace(path.resolve(directory))
}

run()
