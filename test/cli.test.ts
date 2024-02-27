import child_process from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const exec = promisify(child_process.exec)

const cli = async (args: string[], cwd: string = process.cwd()) => {
  return await exec(`node dist/cli.js ${args.join(" ")}`, { cwd })
}

describe("cli", () => {
  beforeAll(async () => {
    await exec(`npm run build`)
  })

  test("should", async () => {
    const inputFilePath = path.join(
      import.meta.dirname,
      "..",
      "examples",
      "basicUsage.ts"
    )

    const inputFile = await fs.readFile(inputFilePath, "utf8")

    await cli([inputFilePath])
  })
})
