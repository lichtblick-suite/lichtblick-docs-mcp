import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import ts from "typescript";

export type ApiSymbol = {
  name: string;
  kind: string;
  file: string;
  /** Declaration source including its attached doc comment. */
  source: string;
};

export type LoadedApi = {
  version: string;
  symbols: Map<string, ApiSymbol>;
};

type ParsedModule = {
  declarations: Map<string, ApiSymbol>;
  reExports: { name: string; exportedAs: string; from: string }[];
};

const KINDS = new Map<ts.SyntaxKind, string>([
  [ts.SyntaxKind.InterfaceDeclaration, "interface"],
  [ts.SyntaxKind.TypeAliasDeclaration, "type"],
  [ts.SyntaxKind.FunctionDeclaration, "function"],
  [ts.SyntaxKind.ClassDeclaration, "class"],
  [ts.SyntaxKind.EnumDeclaration, "enum"],
  [ts.SyntaxKind.VariableStatement, "const"],
]);

/** Reads the public API of `@lichtblick/suite` from the TypeScript sources it ships. */
export class ExtensionApi {
  readonly #packageDir: string;
  #loaded: Promise<LoadedApi> | undefined;

  constructor(packageDir = resolveSuitePackageDir()) {
    this.#packageDir = packageDir;
  }

  load(): Promise<LoadedApi> {
    this.#loaded ??= loadSuiteApi(this.#packageDir);
    return this.#loaded;
  }

  async get(name: string): Promise<ApiSymbol | undefined> {
    const { symbols } = await this.load();
    const lower = name.toLowerCase();
    return symbols.get(name) ?? [...symbols.values()].find((symbol) => symbol.name.toLowerCase() === lower);
  }

  async suggest(query: string, max = 15): Promise<string[]> {
    const { symbols } = await this.load();
    const lower = query.toLowerCase();
    return [...symbols.keys()].filter((name) => name.toLowerCase().includes(lower)).slice(0, max);
  }
}

export function resolveSuitePackageDir(): string {
  return dirname(createRequire(import.meta.url).resolve("@lichtblick/suite/package.json"));
}

export async function loadSuiteApi(packageDir: string): Promise<LoadedApi> {
  const { version } = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8")) as { version: string };
  const srcDir = join(packageDir, "src");
  const modules = new Map<string, Promise<ParsedModule>>();
  const parse = (file: string) => {
    let parsed = modules.get(file);
    if (!parsed) {
      parsed = readFile(file, "utf8").then((text) => parseModule(file, text));
      modules.set(file, parsed);
    }
    return parsed;
  };

  const entry = await parse(join(srcDir, "index.ts"));
  const symbols = new Map(entry.declarations);
  const reExported = await Promise.all(
    entry.reExports.map(async ({ name, exportedAs, from }) => {
      const symbol = (await parse(resolve(srcDir, `${from}.ts`))).declarations.get(name);
      return symbol && { ...symbol, name: exportedAs };
    }),
  );
  for (const symbol of reExported) {
    if (symbol) {
      symbols.set(symbol.name, symbol);
    }
  }
  return { version, symbols };
}

export function parseModule(fileName: string, text: string): ParsedModule {
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const declarations = new Map<string, ApiSymbol>();
  const reExports: ParsedModule["reExports"] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      const { exportClause, moduleSpecifier } = statement;
      if (exportClause && ts.isNamedExports(exportClause) && moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        for (const element of exportClause.elements) {
          reExports.push({
            name: (element.propertyName ?? element.name).text,
            exportedAs: element.name.text,
            from: moduleSpecifier.text,
          });
        }
      }
      continue;
    }

    const kind = KINDS.get(statement.kind);
    if (!kind || !isExported(statement)) {
      continue;
    }
    const source = [attachedComments(sourceFile, statement), statement.getText(sourceFile)]
      .filter(Boolean)
      .join("\n");
    for (const name of declaredNames(statement)) {
      declarations.set(name, { name, kind, file: basename(fileName), source });
    }
  }

  return { declarations, reExports };
}

function isExported(statement: ts.Statement): boolean {
  return (
    ts.canHaveModifiers(statement) &&
    (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false)
  );
}

function declaredNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
    );
  }
  const { name } = statement as ts.DeclarationStatement;
  return name && ts.isIdentifier(name) ? [name.text] : [];
}

// Leading comments separated from the declaration by a blank line (e.g. license headers) are not attached.
function attachedComments(sourceFile: ts.SourceFile, node: ts.Node): string {
  const text = sourceFile.text;
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const attached: string[] = [];
  let next = node.getStart(sourceFile);
  for (const range of ranges.toReversed()) {
    if (text.slice(range.end, next).split("\n").length > 2) {
      break;
    }
    attached.unshift(text.slice(range.pos, range.end));
    next = range.pos;
  }
  return attached.join("\n");
}
