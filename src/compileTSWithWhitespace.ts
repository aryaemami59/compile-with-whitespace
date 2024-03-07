import fs from 'node:fs/promises';
import path from 'node:path';
import { format, resolveConfig } from 'prettier';
import ts from 'typescript';
import {
  collectAllFiles,
  defaultTSConfig,
  getJSFileName,
  getJSX,
  pathIsDirectory,
  pathIsFile,
} from './utils';

// This is a modified version of the functionality provided by https://github.com/CarabusX/gulp-preserve-typescript-whitespace
// It has been modified and simplified to work with ts-node instead of gulp.

const preferredTags = {
  NEW_LINE_TAG: ['N', 'n'],
  SPACES_TAG: ['S', 's'],
  SPACES_BEFORE_COLON_TAG: ['C', 'c'],
  SAME_LINE_ELSE_TAG: ['E', 'e'],
};

type PreferredTags = typeof preferredTags;

interface PreserveTypescriptWhitespaceOptions {
  preserveNewLines: boolean;
  preserveMultipleSpaces: boolean;
  preserveSpacesBeforeColons: boolean;
  collapseSpacesBeforeRemovedColons: boolean;
  preserveSameLineElse: boolean;
  showDebugOutput: boolean;
}

interface Block {
  code: string;
  stringOrComment: string;
}

interface Metadata extends Record<keyof PreferredTags, string> {
  options: Partial<PreserveTypescriptWhitespaceOptions>;
}

class ParsedFileMetadata {
  public static FILE_METADATA_TAG: string;
  public declare startIndex: number;
  public declare endIndex: number;

  constructor(public metadata: Metadata) {}

  public serialize() {
    return `; /*${ParsedFileMetadata.FILE_METADATA_TAG}${JSON.stringify(
      this.metadata,
    )}${ParsedFileMetadata.FILE_METADATA_TAG}*/\n`;
  }

  static deserialize(fileContents: string) {
    const startTagRegex = `;? ?\\/\\*${ParsedFileMetadata.FILE_METADATA_TAG}`;
    const endTagRegex = `${ParsedFileMetadata.FILE_METADATA_TAG}\\*\\/\\r?\\n?`;

    const metadataMatch = fileContents.match(
      new RegExp(`${startTagRegex}([\\s\\S]*?)${endTagRegex}`),
    );

    if (metadataMatch === null) {
      console.error(`ERROR: Metadata tag not found in '${fileContents}' file.`);
      return;
    }

    const startTagIndex = metadataMatch.index ?? 0;
    const metadataWithTags = metadataMatch[0];
    const serializedMetadata = metadataMatch[1];

    const metadata = JSON.parse(serializedMetadata);

    const metadataObj = new ParsedFileMetadata(metadata);
    metadataObj.startIndex = startTagIndex;
    metadataObj.endIndex = startTagIndex + metadataWithTags.length;

    return metadataObj;
  }

  public removeFrom(fileContents: string) {
    return (
      fileContents.slice(0, this.startIndex) + fileContents.slice(this.endIndex)
    );
  }
}

const restoreWhitespace = (contents: string) => {
  const metadataObj = ParsedFileMetadata.deserialize(contents);

  if (metadataObj == null || !('metadata' in metadataObj)) {
    return;
  }

  const { metadata } = metadataObj;
  if (metadata == null) {
    return;
  }
  contents = metadataObj.removeFrom(contents);

  const {
    options,
    NEW_LINE_TAG,
    SPACES_TAG,
    SPACES_BEFORE_COLON_TAG,
    SAME_LINE_ELSE_TAG,
  } = metadata;

  if (options.preserveNewLines) {
    contents = contents.replace(
      new RegExp(`\\/\\*${NEW_LINE_TAG}\\*\\/`, 'g'),
      '',
    );
  }

  if (options.preserveSpacesBeforeColons) {
    contents = contents.replace(
      new RegExp(` ?\\/\\*${SPACES_BEFORE_COLON_TAG}([0-9]+)\\*\\/:`, 'g'),
      (match, group1: string) => {
        const spacesCount = Number(group1);
        return `${' '.repeat(spacesCount)}:`;
      },
    );

    if (options.collapseSpacesBeforeRemovedColons) {
      contents = contents.replace(
        new RegExp(
          ' ?\\/\\*' +
            SPACES_BEFORE_COLON_TAG +
            '([0-9]+)\\*\\/(?=[,;\\)\\} \\t\\r\\n])',
          'g',
        ),
        '',
      );
      contents = contents.replace(
        new RegExp(` ?\\/\\*${SPACES_BEFORE_COLON_TAG}([0-9]+)\\*\\/`, 'g'),
        ' ',
      );
    } else {
      contents = contents.replace(
        new RegExp(` ?\\/\\*${SPACES_BEFORE_COLON_TAG}([0-9]+)\\*\\/`, 'g'),
        (match, group1: string) => {
          const spacesCount = Number(group1);
          return ' '.repeat(spacesCount);
        },
      );
    }
  }

  if (options.preserveMultipleSpaces) {
    contents = contents.replace(
      new RegExp(`\\/\\*${SPACES_TAG}([0-9]+)\\*\\/`, 'g'),
      (match, group1: string) => {
        const spacesCount = Number(group1);
        return ' '.repeat(spacesCount - 2);
      },
    );
  }

  if (options.preserveSameLineElse) {
    return contents.replace(
      new RegExp(
        `\\} \\/\\*${SAME_LINE_ELSE_TAG}([0-9]+)\\*\\/\\r?\\n[ \\t]*else`,
        'g',
      ),
      (match, group1: string) => {
        const spacesCount = Number(group1);
        return `}${' '.repeat(spacesCount)}else`;
      },
    );
  }

  return contents;
};

const TAG_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const createTagForOrdinal = (ordinal: number) => {
  let tag = '';
  do {
    const tagChar = TAG_CHARS[ordinal % TAG_CHARS.length];
    tag = tagChar + tag;
    ordinal = Math.floor(ordinal / TAG_CHARS.length);
  } while (ordinal > 0);
  return tag;
};

const isSimpleTagPresent = (fileContents: string, tag: string) => {
  const index = fileContents.search(new RegExp(`\\/\\*${tag}\\*\\/`));
  return index !== -1;
};

const isTagWithCountPresent = (fileContents: string, tag: string) => {
  const index = fileContents.search(new RegExp(`\\/\\*${tag}([0-9]+)\\*\\/`));
  return index !== -1;
};

const PLUGIN_NAME = 'gulp-preserve-typescript-whitespace';

class UnusedTagsFinder {
  public checkedSimpleTags: Set<string>;
  public checkedTagsWithCount: Set<string>;

  constructor(
    public fileContents: string,
    public options: PreserveTypescriptWhitespaceOptions,
  ) {
    this.checkedSimpleTags = new Set<string>();
    this.checkedTagsWithCount = new Set<string>();
  }

  public findUnusedTag(preferredTags: string[], isTagWithCount: boolean) {
    const checkedTagsSet = isTagWithCount
      ? this.checkedTagsWithCount
      : this.checkedSimpleTags;
    const isTagPresentFunc = isTagWithCount
      ? isTagWithCountPresent
      : isSimpleTagPresent;

    for (const tag of preferredTags) {
      if (!checkedTagsSet.has(tag)) {
        checkedTagsSet.add(tag);

        if (!isTagPresentFunc(this.fileContents, tag)) {
          return tag;
        } else if (this.options.showDebugOutput) {
          console.debug(`[${PLUGIN_NAME}] Tag already present:`, tag);
        }
      }
    }

    for (let i = 0; ; i++) {
      const tag = createTagForOrdinal(i);
      if (!checkedTagsSet.has(tag)) {
        checkedTagsSet.add(tag);

        if (!isTagPresentFunc(this.fileContents, tag)) {
          return tag;
        } else if (this.options.showDebugOutput) {
          console.debug(`[${PLUGIN_NAME}] Tag already present:`, tag);
        }
      }
    }
  }
}

const options = {
  preserveNewLines: true,
  preserveMultipleSpaces: true,
  preserveSpacesBeforeColons: true,
  collapseSpacesBeforeRemovedColons: true,
  preserveSameLineElse: true,
  showDebugOutput: false,
};

const rebuildCodeFromBlocks = (blocks: Block[]) => {
  return blocks.map((block) => block.code + block.stringOrComment).join('');
};

const stringOrCommentEnd: Record<string, RegExp> = {
  "'": /(?<!(?:^|[^\\])(?:\\\\)*\\)'/,
  '"': /(?<!(?:^|[^\\])(?:\\\\)*\\)"/,
  '`': /(?<!(?:^|[^\\])(?:\\\\)*\\)`/,
  '//': /(?=\r?\n)/,
  '/*': /\*\//,
};

const parseStringAndComments = (
  codeToParse: string,
  skipEmptyCodeBlocks = true,
) => {
  const blocks: Block[] = [];

  while (codeToParse.length > 0) {
    let codeBlock: string;
    let commentBlock: string;

    const commentStartMatch = codeToParse.match(/['"`]|\/\/|\/\*/);
    if (commentStartMatch === null) {
      codeBlock = codeToParse;
      commentBlock = '';
      codeToParse = '';
    } else {
      const commentStartIndex = commentStartMatch.index ?? 0;
      codeBlock = codeToParse.slice(0, commentStartIndex);

      const commentStartChars = commentStartMatch[0];
      const commentContentsIndex = commentStartIndex + commentStartChars.length;
      const commentEndRegex = stringOrCommentEnd[commentStartChars];
      const commentEndMatch = codeToParse
        .slice(commentContentsIndex)
        .match(commentEndRegex);
      if (commentEndMatch === null) {
        commentBlock = codeToParse.slice(commentStartIndex);
        codeToParse = '';
      } else {
        const commentEndIndexRelative = commentEndMatch.index ?? 0;
        const commentEndChars = commentEndMatch[0];
        const nextCodeStartIndex =
          commentContentsIndex +
          commentEndIndexRelative +
          commentEndChars.length;
        commentBlock = codeToParse.slice(commentStartIndex, nextCodeStartIndex);
        codeToParse = codeToParse.slice(nextCodeStartIndex);
      }
    }

    if (skipEmptyCodeBlocks && codeBlock.length === 0 && blocks.length >= 1) {
      blocks[blocks.length - 1].stringOrComment += commentBlock;
    } else {
      blocks.push({ code: codeBlock, stringOrComment: commentBlock });
    }
  }

  return blocks;
};

export const saveWhitespace = (file: string) => {
  const unusedTagsFinder = new UnusedTagsFinder(file, options);
  const NEW_LINE_TAG = unusedTagsFinder.findUnusedTag(
    preferredTags.NEW_LINE_TAG,
    false,
  );
  const SPACES_TAG = unusedTagsFinder.findUnusedTag(
    preferredTags.SPACES_TAG,
    true,
  );
  const SPACES_BEFORE_COLON_TAG = unusedTagsFinder.findUnusedTag(
    preferredTags.SPACES_BEFORE_COLON_TAG,
    true,
  );
  const SAME_LINE_ELSE_TAG = unusedTagsFinder.findUnusedTag(
    preferredTags.SAME_LINE_ELSE_TAG,
    true,
  );

  const NEW_LINE_REPLACEMENT = `/*${NEW_LINE_TAG}*/$1`;

  const blocks = parseStringAndComments(file);
  let isFileStart = true;

  for (const block of blocks) {
    block.code = block.code.replace(/\}( *)else/g, (match, group1: string) => {
      return `} /*${SAME_LINE_ELSE_TAG}${group1.length}*/else`;
    });

    const regex = isFileStart ? /(?<=[^ \n])( +):/g : /(?<=^|[^ \n])( +):/g;

    block.code = block.code.replace(regex, (match, group1: string) => {
      return ` /*${SPACES_BEFORE_COLON_TAG}${group1.length}*/:`;
    });

    block.code = block.code.replace(
      isFileStart ? /(?<=[^ \n])(  +)(?![ :])/g : /(?<=^|[^ \n])(  +)(?![ :])/g,
      (match, group1: string) => ` /*${SPACES_TAG}${group1.length}*/ `,
    );

    block.code = block.code.replace(
      isFileStart ? /(?<=(?:^|\n)[ \t]*)(\r?\n)/g : /(?<=\n[ \t]*)(\r?\n)/g,
      NEW_LINE_REPLACEMENT,
    );

    isFileStart = false;
  }

  file = rebuildCodeFromBlocks(blocks);

  const metadataObj = new ParsedFileMetadata({
    options,
    NEW_LINE_TAG,
    SPACES_TAG,
    SPACES_BEFORE_COLON_TAG,
    SAME_LINE_ELSE_TAG,
  });

  return metadataObj.serialize() + file;
};

/**
 * Compiles a single TypeScript file to JavaScript, preserving whitespaces.
 * This function takes a path to a TypeScript file (.ts or .tsx),
 * compiles it into JavaScript (.js or .jsx), and maintains whitespace
 * formatting during the process. It applies TypeScript compilation with custom
 * configurations and handles the preservation and restoration of whitespaces.
 *
 * @param filePath - The file path of the TypeScript file to compile.
 */
export const compileTSFile = async (
  filePath: string,
  options: { root?: string } = {},
) => {
  const fileContents = await fs.readFile(filePath, 'utf8');
  const JSFileName = getJSFileName(filePath);
  const jsx = getJSX(filePath);

  const savedWhitespaceContents = saveWhitespace(fileContents);
  const config = {
    compilerOptions: { ...defaultTSConfig.compilerOptions, jsx },
  };
  const result = ts.transpileModule(savedWhitespaceContents, config);
  const { outDir } = config.compilerOptions;
  const outputFolder = outDir
    ? path.join(options.root ?? path.dirname(filePath), outDir)
    : path.dirname(filePath);

  const restoredWhitespaceContents = restoreWhitespace(result.outputText);
  const outputFilePath = path.join(outputFolder, JSFileName);

  console.log(`Generating ${outputFilePath}`);

  try {
    await fs.access(outputFolder);
  } catch (err) {
    console.error(err);
    await fs.mkdir(outputFolder, { recursive: true });
  }

  if (restoredWhitespaceContents == null) {
    throw new Error('restoredWhitespaceContents is null');
  }

  const prettierConfig = await resolveConfig(outputFilePath);

  const formatted = await format(
    restoredWhitespaceContents,
    prettierConfig == null
      ? { filepath: outputFilePath }
      : { ...prettierConfig, filepath: outputFilePath },
  );

  await fs.writeFile(outputFilePath, formatted, {
    encoding: 'utf8',
  });
};

/**
 * Recursively compiles TypeScript files to JavaScript, preserving whitespaces.
 * This function processes all TypeScript files (`.ts` and `.tsx`) in the given
 * directory and its subdirectories. It maintains the original whitespace formatting
 * during the compilation process to ensure the output closely mirrors the source format.
 *
 * @param fileOrDirectory - The directory path where TypeScript files are located.
 */
export const compileTSWithWhitespace = async (
  fileOrDirectory: string,
  options: { root?: string } = {},
) => {
  const isFile = await pathIsFile(fileOrDirectory);
  if (isFile) {
    await compileTSFile(fileOrDirectory, options);
    return;
  }

  const isDirectory = await pathIsDirectory(fileOrDirectory);

  if (isDirectory) {
    const files = await collectAllFiles(fileOrDirectory);

    files.forEach(async (file) => {
      await compileTSFile(file);
    });
  }

  // directoryEntry.forEach(async entry => {
  //   try {
  //     const filePath = path.join(fileOrDirectory, entry.name)
  //     console.log(path.join(entry.path, entry.name))
  //     // console.log(filePath)
  //     if (entry.isDirectory()) {
  //       await compileTSWithWhitespace(filePath)
  //     } else if (tsExtensionRegex.test(entry.name)) {
  //       await compileTSFile(filePath, options)
  //     }
  //   } catch (error) {
  //     console.error("error", error)
  //     throw error
  //   }
  // })
};
