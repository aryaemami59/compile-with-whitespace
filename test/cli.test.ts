import child_process from 'child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { pathIsFile } from '../src/utils'

const exec = promisify(child_process.exec)

const cli = async (args: string[], cwd: string = process.cwd()) => {
  return await exec(`node dist/cli.js ${args.join(' ')}`, { cwd })
}

describe('cli', () => {
  beforeAll(async () => {
    await exec(`npm run clean:test`)
    await exec(`npm run build`)
  })

  beforeEach(async () => {
    await exec(`npm run clean:test`)
  })

  test('should work on a single file with relative path', async () => {
    const inputFilePath = path.join('examples', 'basicUsage.ts')
    expect(path.isAbsolute(inputFilePath)).toBeFalse()
    const out = await cli([inputFilePath])
    console.log(out.stdout)
  })

  test('should work on a single file with absolute path', async () => {
    const inputFilePath = path.resolve('examples', 'basicUsage.ts')
    expect(path.isAbsolute(inputFilePath)).toBeTrue()
    const out = await cli([inputFilePath])
    console.log(out.stdout)
  })

  test('should work on .tsx files', async () => {
    const inputFilePath = path.resolve(
      'examples',
      'weakMapMemoize',
      'withUseCallback.tsx',
    )
    expect(path.isAbsolute(inputFilePath)).toBeTrue()
    const out = await cli([inputFilePath])
    console.log(out.stdout)
    expect(
      await pathIsFile(
        path.resolve(
          path.dirname(inputFilePath),
          'dist',
          path.basename(inputFilePath).replace('.tsx', '.jsx'),
        ),
      ),
    ).toBeTrue()
  })

  test('should work on .cts files', async () => {
    const inputFilePath = path.join('examples', 'basicUsage.cts')
    expect(path.isAbsolute(inputFilePath)).toBeFalse()
    const out = await cli([inputFilePath])
    console.log(out.stdout)
    expect(
      await pathIsFile(
        path.resolve(
          path.dirname(inputFilePath),
          'dist',
          path.basename(inputFilePath).replace('.cts', '.cjs'),
        ),
      ),
    ).toBeTrue()
  })

  test('should work on .mts files', async () => {
    const inputFilePath = path.join('examples', 'basicUsage.mts')
    expect(path.isAbsolute(inputFilePath)).toBeFalse()
    const out = await cli([inputFilePath])
    console.log(out.stdout)
    expect(
      await pathIsFile(
        path.resolve(
          path.dirname(inputFilePath),
          'dist',
          path.basename(inputFilePath).replace('.mts', '.mjs'),
        ),
      ),
    ).toBeTrue()
  })

  test('should work on a directory with relative path', async () => {
    const inputDirPath = 'examples'
    expect(path.isAbsolute(inputDirPath)).toBeFalse()
    const out = await cli([inputDirPath])
    console.log(out.stdout)
  })

  test('should work on a directory with absolute path', async () => {
    const inputDirPath = path.resolve('examples')
    expect(path.isAbsolute(inputDirPath)).toBeTrue()
    const out = await cli([inputDirPath])
    console.log(out.stdout)
  })

  test.todo('should work on glob pattern', () => {})
})
