import fs from 'node:fs/promises'
import path from 'node:path'
import { format, resolveConfig } from 'prettier'
import ts from 'typescript'

export const collectAllFiles = async (directory: string) => {
  const directoryEntry = await fs.readdir(directory, {
    withFileTypes: true,
    recursive: true,
    encoding: 'utf8',
  })

  const files = directoryEntry
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.path, entry.name))

  return files
}

export const exists = async (filePath: string) => {
  try {
    await fs.access(filePath)
    return true
  } catch (error) {
    return false
  }
}

export const pathIsFile = async (filePath: string) => {
  if (await exists(filePath)) {
    return (await fs.lstat(filePath)).isFile()
  }
}

export const pathIsDirectory = async (filePath: string) => {
  if (await exists(filePath)) {
    return (await fs.lstat(filePath)).isDirectory()
  }
}

export const hasTSXExtension = (fileName: string) => /\.tsx$/.test(fileName)

export const defaultTSConfig = {
  compilerOptions: {
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    isolatedModules: true,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    outDir: 'dist',
    jsx: ts.JsxEmit.None,
  },
} satisfies { compilerOptions: ts.CompilerOptions }

export const getOutputFileExtension = (filePath: string) => {
  const TSFileName = path.basename(filePath)
  const isTSX = hasTSXExtension(TSFileName)
  const outputFileExtension = isTSX ? '.jsx' : '.js'
  return outputFileExtension
}

export const getJSX = (filePath: string) => {
  const TSFileName = path.basename(filePath)
  const isTSX = hasTSXExtension(TSFileName)
  const JSX = isTSX ? ts.JsxEmit.Preserve : ts.JsxEmit.None
  return JSX
}

export const tsExtensionRegex = /\.c?m?(t)sx?$/

export const getJSFileName = (filePath: string) => {
  const TSFileName = path.basename(filePath)
  const JSFileName = TSFileName.replace(tsExtensionRegex, (e, r) =>
    e.replace(r, 'j'),
  )
  return JSFileName
}

export const formatFile = async (filePath: string) => {
  const prettierConfig = await resolveConfig(filePath)
  const fileContent = await fs.readFile(filePath, 'utf8')
  if (prettierConfig == null) {
    return await format(fileContent, { filepath: filePath })
  }
  return await format(fileContent)
}
