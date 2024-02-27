import child_process from "child_process"
import path from "node:path"
import { promisify } from "node:util"

const exec = promisify(child_process.exec)

const cli = async (args: string[], cwd: string = process.cwd()) => {
  return await exec(`node dist/cli.js ${args.join(" ")}`, { cwd })
}

describe("cli", () => {
  beforeAll(async () => {
    await exec(`npm run clean:test`)
    await exec(`npm run build`)
  })

  beforeEach(async () => {
    await exec(`npm run clean:test`)
  })

  test("should work on a single file", async () => {
    const inputFilePath = path.join(
      import.meta.dirname,
      "..",
      "examples",
      "basicUsage.ts"
    )

    // console.log(inputFilePath)

    // const inputFile = await fs.readFile(inputFilePath, "utf8")
    // console.log(inputFile)

    const out = await cli([inputFilePath])
    // console.log(out.stdout)
  })

  test("should work on a directory", async () => {
    const inputDirPath = path.join(import.meta.dirname, "..", "examples")
    const out = await cli([inputDirPath])
    console.log(out.stdout)
  })
})
