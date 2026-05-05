import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const runtimeOutDir = path.resolve("dist/runtime");

renameRuntimeJavaScriptFiles(runtimeOutDir);
rewriteRuntimeModuleSpecifiers(runtimeOutDir);

function renameRuntimeJavaScriptFiles(rootDir) {
  for (const filePath of walkFiles(rootDir)) {
    if (filePath.endsWith(".js")) {
      const nextPath = `${filePath.slice(0, -".js".length)}.mjs`;
      renameSync(filePath, nextPath);
    }
  }
}

function rewriteRuntimeModuleSpecifiers(rootDir) {
  for (const filePath of walkFiles(rootDir)) {
    if (!filePath.endsWith(".mjs") && !filePath.endsWith(".d.ts")) {
      continue;
    }
    rewriteFileModuleSpecifiers(filePath);
  }
}

function rewriteFileModuleSpecifiers(filePath) {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".mjs") ? ts.ScriptKind.JS : ts.ScriptKind.TS,
  );
  const replacements = [];

  visit(sourceFile, (node) => {
    const specifier = staticModuleSpecifier(node);
    if (specifier === undefined || !ts.isStringLiteral(specifier)) {
      return;
    }
    const nextSpecifier = runtimeRelativeSpecifier(filePath, specifier.text);
    if (nextSpecifier === specifier.text) {
      return;
    }
    replacements.push({
      start: specifier.getStart(sourceFile) + 1,
      end: specifier.getEnd() - 1,
      value: nextSpecifier,
    });
  });

  if (replacements.length === 0) {
    return;
  }

  let nextText = sourceText;
  for (const replacement of replacements.toSorted((left, right) => right.start - left.start)) {
    nextText =
      nextText.slice(0, replacement.start) +
      replacement.value +
      nextText.slice(replacement.end);
  }
  writeFileSync(filePath, nextText);
}

function runtimeRelativeSpecifier(filePath, specifier) {
  if (!specifier.startsWith(".") || path.extname(specifier) !== "") {
    return specifier;
  }

  const currentDir = path.dirname(filePath);
  const targetPath = path.resolve(currentDir, specifier);
  if (existsSync(`${targetPath}.mjs`)) {
    return `${specifier}.mjs`;
  }
  if (existsSync(path.join(targetPath, "index.mjs"))) {
    return `${specifier}/index.mjs`;
  }
  return specifier;
}

function staticModuleSpecifier(node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier;
  }
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference)
  ) {
    return node.moduleReference.expression;
  }
  return undefined;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function* walkFiles(rootDir) {
  for (const entry of readdirSync(rootDir)) {
    const entryPath = path.join(rootDir, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      yield* walkFiles(entryPath);
    } else if (stats.isFile()) {
      yield entryPath;
    }
  }
}
