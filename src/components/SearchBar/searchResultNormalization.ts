import type {
  AttachmentSearchHit,
  AstSearchHit,
  RepoDocCoverageDoc,
  ReferenceSearchHit,
  SearchHit,
  SymbolSearchHit,
} from "../../api";
import {
  normalizeSelectionPathForGraph,
  normalizeSelectionPathForVfs,
  preferMoreCanonicalSelectionPath,
} from "../../utils/selectionPath";
import type { ResultCategory, SearchResult, SearchSelection } from "./types";

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function stripPathFragment(path: string): string {
  const fragmentIndex = path.indexOf("#");
  return fragmentIndex >= 0 ? path.slice(0, fragmentIndex) : path;
}

function inferCodeLanguageFromPath(path: string): string | undefined {
  const lower = stripPathFragment(path).toLowerCase();
  if (lower.endsWith(".jl")) return "julia";
  if (lower.endsWith(".mo")) return "modelica";
  if (lower.endsWith(".rs")) return "rust";
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".go")) return "go";
  return undefined;
}

const KNOWN_CODE_LANGUAGES = new Set([
  "julia",
  "rust",
  "python",
  "typescript",
  "javascript",
  "go",
  "modelica",
]);
const KNOWN_CODE_KIND_TAGS = new Set([
  "symbol",
  "module",
  "function",
  "method",
  "struct",
  "class",
  "trait",
  "interface",
  "enum",
  "constant",
  "const",
  "macro",
  "example",
  "doc",
  "reference",
]);
const SYMBOLIC_CODE_KINDS = new Set([
  "symbol",
  "module",
  "function",
  "method",
  "struct",
  "class",
  "trait",
  "interface",
  "enum",
  "constant",
  "const",
  "macro",
  "type",
]);
const NON_CODE_DOC_TYPES = new Set(["knowledge", "skill", "tag", "doc", "document"]);

interface ResolveCodeTagValueOptions {
  preserveCase?: boolean;
}

function resolveCodeTagValue(
  tags: string[] | undefined,
  prefixes: string[],
  options: ResolveCodeTagValueOptions = {},
): string | undefined {
  if (!tags || tags.length === 0) {
    return undefined;
  }

  for (const tag of tags) {
    const normalized = tag.trim();
    const normalizedLower = normalized.toLowerCase();
    for (const prefix of prefixes) {
      if (!normalizedLower.startsWith(`${prefix}:`)) {
        continue;
      }
      const rawValue = normalized.slice(prefix.length + 1).trim();
      const value = options.preserveCase ? rawValue : rawValue.toLowerCase();
      if (value.length > 0) {
        return value;
      }
    }
  }

  return undefined;
}

function resolveBareRepoTag(tags: string[] | undefined): string | undefined {
  if (!tags || tags.length === 0) {
    return undefined;
  }

  return tags.find((tag) => {
    const normalized = tag.trim();
    const normalizedLower = normalized.toLowerCase();
    if (!normalized || normalized.includes(":")) {
      return false;
    }
    if (normalizedLower === "code") {
      return false;
    }
    if (KNOWN_CODE_LANGUAGES.has(normalizedLower)) {
      return false;
    }
    if (KNOWN_CODE_KIND_TAGS.has(normalizedLower)) {
      return false;
    }
    return true;
  });
}

function resolveCodeLanguageFromHit(hit: SearchHit): string | undefined {
  const explicitLanguage = resolveCodeTagValue(hit.tags, ["lang", "language"]);
  if (explicitLanguage) {
    return explicitLanguage;
  }

  const languageTag = hit.tags.find((tag) => KNOWN_CODE_LANGUAGES.has(tag.toLowerCase()));
  if (languageTag) {
    return languageTag.toLowerCase();
  }

  return inferCodeLanguageFromPath(hit.path);
}

function looksFunctionLikeCodeHit(hit: SearchHit): boolean {
  const functionLikeCandidates = [hit.bestSection, hit.title, hit.stem];
  return functionLikeCandidates.some((candidate) => {
    const normalized = candidate?.trim();
    if (!normalized) {
      return false;
    }

    if (/^(module|struct|class|trait|interface|enum)\b/i.test(normalized)) {
      return false;
    }

    return /\(/.test(normalized);
  });
}

function resolveCodeKindFromHit(hit: SearchHit): string | undefined {
  const explicitKind = resolveCodeTagValue(hit.tags, ["kind"]);
  if (explicitKind) {
    if (explicitKind === "symbol" && looksFunctionLikeCodeHit(hit)) {
      return "function";
    }
    return explicitKind;
  }

  const normalizedDocType = hit.docType?.trim().toLowerCase();
  if (normalizedDocType && !NON_CODE_DOC_TYPES.has(normalizedDocType)) {
    return normalizedDocType;
  }

  const kindTag = hit.tags.find((tag) => KNOWN_CODE_KIND_TAGS.has(tag.toLowerCase()));
  if (kindTag) {
    return kindTag.toLowerCase();
  }

  return undefined;
}

function resolveCodeRepoFromHit(hit: SearchHit, repoHint?: string): string | undefined {
  const projectName = hit.navigationTarget?.projectName?.trim();
  if (projectName) {
    return projectName;
  }

  const explicitRepo = resolveCodeTagValue(hit.tags, ["repo", "project"], { preserveCase: true });
  if (explicitRepo) {
    return explicitRepo;
  }

  const bareRepoTag = resolveBareRepoTag(hit.tags)?.trim();
  if (bareRepoTag) {
    return bareRepoTag;
  }

  const normalizedHint = repoHint?.trim();
  if (normalizedHint) {
    return normalizedHint;
  }

  return undefined;
}

function resolveCodeCategoryFromKind(
  codeKind: string | undefined,
  docType: string | undefined,
): ResultCategory {
  const normalizedKind = codeKind?.toLowerCase() ?? "";
  const normalizedDocType = docType?.trim().toLowerCase() ?? "";

  if (
    normalizedKind.includes("reference") ||
    normalizedKind.includes("usage") ||
    normalizedDocType === "reference"
  ) {
    return "reference";
  }

  if (SYMBOLIC_CODE_KINDS.has(normalizedKind) || SYMBOLIC_CODE_KINDS.has(normalizedDocType)) {
    return "symbol";
  }

  return "ast";
}

function knowledgeResultCategory(hit: SearchHit): ResultCategory {
  const navigationCategory =
    hit.navigationTarget?.category ??
    (hit.docType === "knowledge" || hit.docType === "skill" || hit.docType === "tag"
      ? hit.docType
      : (hit.tags?.length ?? 0) > 0
        ? "tag"
        : "doc");

  switch (navigationCategory) {
    case "knowledge":
      return "knowledge";
    case "skill":
      return "skill";
    case "tag":
      return "tag";
    default:
      return "document";
  }
}

function canonicalizeSearchSelection(selection: SearchSelection): SearchSelection {
  const canonicalPath = normalizeSelectionPathForVfs({
    path: selection.path,
    category: selection.category,
    projectName: selection.projectName,
  });
  const canonicalGraphPath = normalizeSelectionPathForGraph({
    path: selection.graphPath ?? selection.path,
    category: selection.category,
    projectName: selection.projectName,
  });

  return {
    ...selection,
    path: canonicalPath,
    graphPath: canonicalGraphPath,
  };
}

export function isCodeSearchResult(result: SearchResult): boolean {
  return (
    result.category === "ast" || result.category === "symbol" || result.category === "reference"
  );
}

export function canOpenGraphForSearchResult(result: SearchResult): boolean {
  return (
    result.category === "document" ||
    result.category === "knowledge" ||
    result.category === "skill" ||
    result.category === "tag"
  );
}

export function toSearchSelection(result: SearchResult): SearchSelection {
  if (result.navigationTarget) {
    const canonicalPathSource = preferMoreCanonicalSelectionPath(
      result.path,
      result.navigationTarget.path,
    );
    return canonicalizeSearchSelection({
      ...result.navigationTarget,
      path: canonicalPathSource,
      projectName: result.navigationTarget.projectName ?? result.projectName,
      rootLabel: result.navigationTarget.rootLabel ?? result.rootLabel,
      line: result.navigationTarget.line ?? result.line,
      lineEnd: result.navigationTarget.lineEnd ?? result.lineEnd,
      column: result.navigationTarget.column ?? result.column,
      graphPath: result.navigationTarget.graphPath ?? canonicalPathSource,
    });
  }

  return canonicalizeSearchSelection({
    path: result.path,
    category:
      result.category === "knowledge" || result.category === "skill" ? result.category : "doc",
    ...(result.projectName ? { projectName: result.projectName } : {}),
    ...(result.rootLabel ? { rootLabel: result.rootLabel } : {}),
    ...(typeof result.line === "number" ? { line: result.line } : {}),
    ...(typeof result.lineEnd === "number" ? { lineEnd: result.lineEnd } : {}),
    ...(typeof result.column === "number" ? { column: result.column } : {}),
    graphPath: result.path,
  });
}

export function normalizeKnowledgeHit(hit: SearchHit): SearchResult {
  const category = knowledgeResultCategory(hit);
  const navigationTarget = hit.navigationTarget ?? {
    path: hit.path,
    category: category === "document" ? "doc" : category,
  };

  return {
    ...hit,
    category,
    projectName: navigationTarget.projectName,
    rootLabel: navigationTarget.rootLabel,
    searchSource: "search-index",
    navigationTarget,
  };
}

export function normalizeCodeSearchHit(hit: SearchHit, repoHint?: string): SearchResult {
  const base = normalizeKnowledgeHit(hit);
  const codeKind = resolveCodeKindFromHit(hit);
  const codeLanguage = resolveCodeLanguageFromHit(hit);
  const codeRepo = resolveCodeRepoFromHit(hit, repoHint);

  return {
    ...base,
    category: resolveCodeCategoryFromKind(codeKind, hit.docType),
    projectName: codeRepo ?? base.projectName,
    codeLanguage,
    codeKind,
    codeRepo,
    searchSource: "search-index",
  };
}

export function normalizeSymbolHit(hit: SymbolSearchHit): SearchResult {
  const sourceLabel = hit.source === "project" ? "Project" : "External";

  return {
    stem: hit.name,
    title: hit.name,
    path: hit.path,
    docType: "symbol",
    tags: [hit.kind, hit.language, hit.crateName].filter(isNonEmptyString),
    score: hit.score,
    bestSection: `${hit.kind} · ${hit.language} · line ${hit.line}`,
    matchReason: `${sourceLabel} symbol in ${hit.crateName}`,
    category: "symbol",
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.line,
    codeLanguage: hit.language,
    codeKind: hit.kind,
    codeRepo: hit.projectName ?? hit.crateName,
    searchSource: "search-index",
    navigationTarget: hit.navigationTarget,
  };
}

export function normalizeRepoDocCoverageHit(hit: RepoDocCoverageDoc): SearchResult {
  const targetPath = hit.docTarget?.path?.trim();
  const lineStart = hit.docTarget?.lineStart;
  const lineEnd = hit.docTarget?.lineEnd;
  const lineLabel =
    typeof lineStart === "number"
      ? typeof lineEnd === "number" && lineEnd !== lineStart
        ? `lines ${lineStart}-${lineEnd}`
        : `line ${lineStart}`
      : null;
  const bestSectionParts = (
    hit.docTarget
      ? ["doc", hit.docTarget.kind, hit.docTarget.name, lineLabel ?? undefined]
      : ["doc", hit.repoId]
  ).filter((part): part is string => typeof part === "string" && part.length > 0);
  const bestSection = bestSectionParts.join(" · ");
  const navigationTarget: SearchSelection = canonicalizeSearchSelection({
    path: hit.path,
    category: hit.docTarget ? "repo_code" : "doc",
    projectName: hit.repoId,
    ...(typeof lineStart === "number" ? { line: lineStart } : {}),
    ...(typeof lineEnd === "number" ? { lineEnd } : {}),
    graphPath: hit.path,
  });

  return {
    stem: hit.title || hit.path,
    title: hit.title || hit.path,
    path: hit.path,
    docType: "ast",
    tags: ["doc", hit.format, hit.repoId].filter(isNonEmptyString),
    score: 0.95,
    bestSection,
    matchReason: targetPath || hit.docId,
    category: "ast",
    projectName: hit.repoId,
    codeLanguage: inferCodeLanguageFromPath(hit.path) ?? "markdown",
    codeKind: "doc",
    codeRepo: hit.repoId,
    searchSource: "repo-intelligence",
    ...(typeof lineStart === "number" ? { line: lineStart } : {}),
    ...(typeof lineEnd === "number" ? { lineEnd } : {}),
    ...(hit.docTarget ? { docTarget: hit.docTarget } : {}),
    navigationTarget,
  };
}

export function normalizeAstHit(hit: AstSearchHit): SearchResult {
  const isMarkdownOutline = hit.language.toLowerCase() === "markdown";
  const markdownNodeKind = hit.nodeKind?.toLowerCase();
  const lineSubject = !isMarkdownOutline
    ? hit.language
    : markdownNodeKind === "property"
      ? "property drawer"
      : markdownNodeKind === "observation"
        ? "code observation"
        : markdownNodeKind === "task"
          ? "markdown task"
          : "markdown outline";
  const ownerSuffix = hit.ownerTitle ? ` · ${hit.ownerTitle}` : "";
  const lineLabel =
    hit.lineStart === hit.lineEnd
      ? `${lineSubject}${ownerSuffix} · line ${hit.lineStart}`
      : `${lineSubject}${ownerSuffix} · lines ${hit.lineStart}-${hit.lineEnd}`;

  return {
    stem: hit.name,
    title: hit.name,
    path: hit.path,
    docType: "ast",
    tags: isMarkdownOutline
      ? [hit.language, hit.nodeKind, hit.rootLabel ?? hit.crateName].filter(isNonEmptyString)
      : [hit.language, hit.crateName].filter(isNonEmptyString),
    score: hit.score,
    bestSection: lineLabel,
    matchReason: hit.signature,
    category: "ast",
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.lineStart,
    lineEnd: hit.lineEnd,
    codeLanguage: hit.language,
    codeKind: isMarkdownOutline ? hit.nodeKind : hit.nodeKind || "symbol",
    codeRepo: hit.projectName ?? hit.crateName,
    searchSource: "search-index",
    navigationTarget: hit.navigationTarget,
  };
}

export function normalizeReferenceHit(hit: ReferenceSearchHit): SearchResult {
  return {
    stem: hit.name,
    title: `${hit.name} reference`,
    path: hit.path,
    docType: "reference",
    tags: [hit.language, hit.crateName].filter(Boolean),
    score: hit.score,
    bestSection: `${hit.language} · line ${hit.line} · col ${hit.column}`,
    matchReason: hit.lineText,
    category: "reference",
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.line,
    column: hit.column,
    codeLanguage: hit.language,
    codeKind: "reference",
    codeRepo: hit.projectName ?? hit.crateName,
    searchSource: "search-index",
    navigationTarget: hit.navigationTarget,
  };
}

export function normalizeAttachmentHit(hit: AttachmentSearchHit): SearchResult {
  const sourceLabel = hit.sourceTitle?.trim() || hit.sourceStem;
  const navigationTarget = hit.navigationTarget ?? {
    path: hit.sourcePath,
    category: "doc",
  };
  return {
    stem: hit.attachmentName,
    title: hit.attachmentName,
    path: hit.path,
    docType: "attachment",
    tags: [`kind:${hit.kind}`, `ext:${hit.attachmentExt}`, `org:${hit.sourceId}`],
    score: hit.score,
    bestSection: hit.attachmentPath,
    matchReason: hit.visionSnippet || `Attached to ${sourceLabel}`,
    category: "attachment",
    projectName: navigationTarget.projectName,
    rootLabel: navigationTarget.rootLabel,
    searchSource: "search-index",
    navigationTarget,
  };
}

export function resolveDefinitionSelection(
  result: SearchResult,
  response: {
    navigationTarget?: SearchSelection;
    definition?: {
      path: string;
      crateName?: string;
      projectName?: string;
      rootLabel?: string;
      lineStart?: number;
      lineEnd?: number;
      navigationTarget?: SearchSelection;
    };
  },
): SearchSelection {
  if (response.navigationTarget) {
    return canonicalizeSearchSelection({
      ...response.navigationTarget,
      graphPath: response.navigationTarget.path,
    });
  }

  if (response.definition?.navigationTarget) {
    return canonicalizeSearchSelection({
      ...response.definition.navigationTarget,
      graphPath: response.definition.navigationTarget.path,
    });
  }

  return canonicalizeSearchSelection({
    path: response.definition?.path ?? result.path,
    category: "doc",
    ...(response.definition?.projectName
      ? { projectName: response.definition.projectName }
      : response.definition?.crateName
        ? { projectName: response.definition.crateName }
        : {}),
    ...(response.definition?.rootLabel ? { rootLabel: response.definition.rootLabel } : {}),
    ...(typeof response.definition?.lineStart === "number"
      ? { line: response.definition.lineStart }
      : {}),
    ...(typeof response.definition?.lineEnd === "number"
      ? { lineEnd: response.definition.lineEnd }
      : {}),
    graphPath: response.definition?.path ?? result.path,
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Search failed";
}
