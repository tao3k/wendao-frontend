import type {
  AttachmentSearchHit,
  AstSearchHit,
  RepoDocCoverageDoc,
  RepoExampleSearchHit,
  RepoModuleSearchHit,
  RepoSymbolSearchHit,
  ReferenceSearchHit,
  SearchHit,
  SymbolSearchHit,
} from '../../api';
import { normalizeSelectionPathForVfs } from '../../utils/selectionPath';
import type { ResultCategory, SearchResult, SearchSelection } from './types';

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function inferCodeLanguageFromPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith('.jl')) return 'julia';
  if (lower.endsWith('.rs')) return 'rust';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.go')) return 'go';
  return undefined;
}

const KNOWN_CODE_LANGUAGES = new Set([
  'julia',
  'rust',
  'python',
  'typescript',
  'javascript',
  'go',
  'modelica',
]);
const KNOWN_CODE_KIND_TAGS = new Set([
  'symbol',
  'module',
  'function',
  'method',
  'struct',
  'class',
  'trait',
  'interface',
  'enum',
  'constant',
  'const',
  'macro',
  'example',
  'doc',
  'reference',
]);
const SYMBOLIC_CODE_KINDS = new Set([
  'symbol',
  'module',
  'function',
  'method',
  'struct',
  'class',
  'trait',
  'interface',
  'enum',
  'constant',
  'const',
  'macro',
  'type',
]);
const NON_CODE_DOC_TYPES = new Set(['knowledge', 'skill', 'tag', 'doc', 'document']);

function resolveCodeTagValue(tags: string[] | undefined, prefixes: string[]): string | undefined {
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
      const value = normalized.slice(prefix.length + 1).trim().toLowerCase();
      if (value.length > 0) {
        return value;
      }
    }
  }

  return undefined;
}

function resolveCodeLanguageFromHit(hit: SearchHit): string | undefined {
  const explicitLanguage = resolveCodeTagValue(hit.tags, ['lang', 'language']);
  if (explicitLanguage) {
    return explicitLanguage;
  }

  const languageTag = hit.tags.find((tag) => KNOWN_CODE_LANGUAGES.has(tag.toLowerCase()));
  if (languageTag) {
    return languageTag.toLowerCase();
  }

  return inferCodeLanguageFromPath(hit.path);
}

function resolveCodeKindFromHit(hit: SearchHit): string | undefined {
  const explicitKind = resolveCodeTagValue(hit.tags, ['kind']);
  if (explicitKind) {
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

  const explicitRepo = resolveCodeTagValue(hit.tags, ['repo', 'project']);
  if (explicitRepo) {
    return explicitRepo;
  }

  const normalizedHint = repoHint?.trim();
  if (normalizedHint) {
    return normalizedHint;
  }

  return undefined;
}

function resolveCodeCategoryFromKind(codeKind: string | undefined, docType: string | undefined): ResultCategory {
  const normalizedKind = codeKind?.toLowerCase() ?? '';
  const normalizedDocType = docType?.trim().toLowerCase() ?? '';

  if (
    normalizedKind.includes('reference')
    || normalizedKind.includes('usage')
    || normalizedDocType === 'reference'
  ) {
    return 'reference';
  }

  if (
    SYMBOLIC_CODE_KINDS.has(normalizedKind)
    || SYMBOLIC_CODE_KINDS.has(normalizedDocType)
  ) {
    return 'symbol';
  }

  return 'ast';
}

function normalizeRelevanceScore(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

function resolveRepoScore(
  hit: { saliencyScore?: number; score?: number },
  fallback: number
): number {
  return normalizeRelevanceScore(hit.saliencyScore ?? hit.score, fallback);
}

function renderHierarchyLabel(
  hit: { hierarchy?: string[]; hierarchicalUri?: string },
  fallback: string
): string {
  const hierarchy = hit.hierarchy?.filter((segment) => segment.trim().length > 0) ?? [];
  if (hierarchy.length > 0) {
    return hierarchy.join(' / ');
  }
  return hit.hierarchicalUri ?? fallback;
}

function appendBacklinkReason(
  baseReason: string,
  backlinks?: string[],
  backlinkItems?: Array<{ id: string }>
): string {
  const backlinkCount =
    backlinkItems && backlinkItems.length > 0
      ? backlinkItems.length
      : backlinks?.length ?? 0;
  if (backlinkCount === 0) {
    return baseReason;
  }
  return `${baseReason} · backlinks:${backlinkCount}`;
}

function knowledgeResultCategory(hit: SearchHit): ResultCategory {
  const navigationCategory =
    hit.navigationTarget?.category
    ?? (hit.docType === 'knowledge' || hit.docType === 'skill' || hit.docType === 'tag'
      ? hit.docType
      : (hit.tags?.length ?? 0) > 0
        ? 'tag'
        : 'doc');

  switch (navigationCategory) {
    case 'knowledge':
      return 'knowledge';
    case 'skill':
      return 'skill';
    case 'tag':
      return 'tag';
    default:
      return 'document';
  }
}

function canonicalizeSearchSelection(selection: SearchSelection): SearchSelection {
  const canonicalPath = normalizeSelectionPathForVfs({
    path: selection.path,
    category: selection.category,
    projectName: selection.projectName,
  });
  const canonicalGraphPath = normalizeSelectionPathForVfs({
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
  return result.category === 'ast' || result.category === 'symbol' || result.category === 'reference';
}

export function canOpenGraphForSearchResult(result: SearchResult): boolean {
  return result.category === 'document' || result.category === 'knowledge' || result.category === 'skill' || result.category === 'tag';
}

export function toSearchSelection(result: SearchResult): SearchSelection {
  if (result.navigationTarget) {
    return canonicalizeSearchSelection({
      ...result.navigationTarget,
      graphPath: result.navigationTarget.path ?? result.path,
    });
  }

  return canonicalizeSearchSelection({
    path: result.path,
    category: result.category === 'knowledge' || result.category === 'skill' ? result.category : 'doc',
    ...(result.projectName ? { projectName: result.projectName } : {}),
    ...(result.rootLabel ? { rootLabel: result.rootLabel } : {}),
    ...(typeof result.line === 'number' ? { line: result.line } : {}),
    ...(typeof result.lineEnd === 'number' ? { lineEnd: result.lineEnd } : {}),
    ...(typeof result.column === 'number' ? { column: result.column } : {}),
    graphPath: result.path,
  });
}

export function normalizeKnowledgeHit(hit: SearchHit): SearchResult {
  const category = knowledgeResultCategory(hit);
  const navigationTarget = hit.navigationTarget ?? {
    path: hit.path,
    category: category === 'document' ? 'doc' : category,
  };

  return {
    ...hit,
    category,
    projectName: navigationTarget.projectName,
    rootLabel: navigationTarget.rootLabel,
    searchSource: 'search-index',
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
    searchSource: 'search-index',
  };
}

export function normalizeSymbolHit(hit: SymbolSearchHit): SearchResult {
  const sourceLabel = hit.source === 'project' ? 'Project' : 'External';

  return {
    stem: hit.name,
    title: hit.name,
    path: hit.path,
    docType: 'symbol',
    tags: [hit.kind, hit.language, hit.crateName].filter(isNonEmptyString),
    score: hit.score,
    bestSection: `${hit.kind} · ${hit.language} · line ${hit.line}`,
    matchReason: `${sourceLabel} symbol in ${hit.crateName}`,
    category: 'symbol',
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.line,
    codeLanguage: hit.language,
    codeKind: hit.kind,
    codeRepo: hit.projectName ?? hit.crateName,
    searchSource: 'search-index',
    navigationTarget: hit.navigationTarget,
  };
}

export function normalizeRepoModuleHit(hit: RepoModuleSearchHit): SearchResult {
  const navigationTarget: SearchSelection = {
    path: hit.path,
    category: 'doc',
    projectName: hit.repoId,
  };

  return {
    stem: hit.qualifiedName,
    title: hit.qualifiedName,
    path: hit.path,
    docType: 'symbol',
    tags: ['module', hit.repoId],
    score: resolveRepoScore(hit, 0.7),
    bestSection: renderHierarchyLabel(hit, `module · ${hit.repoId}`),
    matchReason: appendBacklinkReason(hit.moduleId, hit.implicitBacklinks, hit.implicitBacklinkItems),
    category: 'symbol',
    projectName: hit.repoId,
    codeLanguage: inferCodeLanguageFromPath(hit.path),
    codeKind: 'module',
    codeRepo: hit.repoId,
    searchSource: 'repo-intelligence',
    hierarchicalUri: hit.hierarchicalUri,
    hierarchy: hit.hierarchy,
    saliencyScore: hit.saliencyScore ?? hit.score,
    implicitBacklinks: hit.implicitBacklinks,
    implicitBacklinkItems: hit.implicitBacklinkItems,
    projectionPageIds: hit.projectionPageIds,
    navigationTarget,
  };
}

export function normalizeRepoSymbolHit(hit: RepoSymbolSearchHit): SearchResult {
  const navigationTarget: SearchSelection = {
    path: hit.path,
    category: 'doc',
    projectName: hit.repoId,
  };

  return {
    stem: hit.name,
    title: hit.qualifiedName || hit.name,
    path: hit.path,
    docType: 'symbol',
    tags: [hit.kind, hit.repoId, hit.auditStatus, hit.verificationState].filter(isNonEmptyString),
    score: resolveRepoScore(hit, 0.72),
    bestSection: renderHierarchyLabel(hit, `${hit.kind} · ${hit.repoId}`),
    matchReason: appendBacklinkReason(
      hit.signature || hit.symbolId,
      hit.implicitBacklinks,
      hit.implicitBacklinkItems
    ),
    category: 'symbol',
    projectName: hit.repoId,
    codeLanguage: inferCodeLanguageFromPath(hit.path),
    codeKind: hit.kind,
    codeRepo: hit.repoId,
    searchSource: 'repo-intelligence',
    hierarchicalUri: hit.hierarchicalUri,
    hierarchy: hit.hierarchy,
    saliencyScore: hit.saliencyScore ?? hit.score,
    auditStatus: hit.auditStatus,
    verificationState: hit.verificationState,
    implicitBacklinks: hit.implicitBacklinks,
    implicitBacklinkItems: hit.implicitBacklinkItems,
    projectionPageIds: hit.projectionPageIds,
    navigationTarget,
  };
}

export function normalizeRepoExampleHit(hit: RepoExampleSearchHit): SearchResult {
  const navigationTarget: SearchSelection = {
    path: hit.path,
    category: 'doc',
    projectName: hit.repoId,
  };

  return {
    stem: hit.title,
    title: hit.title,
    path: hit.path,
    docType: 'ast',
    tags: ['example', hit.repoId],
    score: resolveRepoScore(hit, 0.68),
    bestSection: renderHierarchyLabel(hit, `example · ${hit.repoId}`),
    matchReason: appendBacklinkReason(
      hit.summary ?? hit.exampleId,
      hit.implicitBacklinks,
      hit.implicitBacklinkItems
    ),
    category: 'ast',
    projectName: hit.repoId,
    codeLanguage: inferCodeLanguageFromPath(hit.path),
    codeKind: 'example',
    codeRepo: hit.repoId,
    searchSource: 'repo-intelligence',
    hierarchicalUri: hit.hierarchicalUri,
    hierarchy: hit.hierarchy,
    saliencyScore: hit.saliencyScore ?? hit.score,
    implicitBacklinks: hit.implicitBacklinks,
    implicitBacklinkItems: hit.implicitBacklinkItems,
    projectionPageIds: hit.projectionPageIds,
    navigationTarget,
  };
}

export function normalizeRepoDocCoverageHit(hit: RepoDocCoverageDoc): SearchResult {
  const navigationTarget: SearchSelection = {
    path: hit.path,
    category: 'doc',
    projectName: hit.repoId,
  };

  return {
    stem: hit.title || hit.path,
    title: hit.title || hit.path,
    path: hit.path,
    docType: 'ast',
    tags: ['doc', hit.format, hit.repoId].filter(isNonEmptyString),
    score: 0.95,
    bestSection: `doc · ${hit.repoId}`,
    matchReason: hit.docId,
    category: 'ast',
    projectName: hit.repoId,
    codeLanguage: inferCodeLanguageFromPath(hit.path) ?? 'markdown',
    codeKind: 'doc',
    codeRepo: hit.repoId,
    searchSource: 'repo-intelligence',
    navigationTarget,
  };
}

export function normalizeAstHit(hit: AstSearchHit): SearchResult {
  const isMarkdownOutline = hit.language.toLowerCase() === 'markdown';
  const markdownNodeKind = hit.nodeKind?.toLowerCase();
  const lineSubject = !isMarkdownOutline
    ? hit.language
    : markdownNodeKind === 'property'
      ? 'property drawer'
      : markdownNodeKind === 'observation'
        ? 'code observation'
        : markdownNodeKind === 'task'
          ? 'markdown task'
          : 'markdown outline';
  const ownerSuffix = hit.ownerTitle ? ` · ${hit.ownerTitle}` : '';
  const lineLabel =
    hit.lineStart === hit.lineEnd
      ? `${lineSubject}${ownerSuffix} · line ${hit.lineStart}`
      : `${lineSubject}${ownerSuffix} · lines ${hit.lineStart}-${hit.lineEnd}`;

  return {
    stem: hit.name,
    title: hit.name,
    path: hit.path,
    docType: 'ast',
    tags: isMarkdownOutline
      ? [hit.language, hit.nodeKind, hit.rootLabel ?? hit.crateName].filter(isNonEmptyString)
      : [hit.language, hit.crateName].filter(isNonEmptyString),
    score: hit.score,
    bestSection: lineLabel,
    matchReason: hit.signature,
    category: 'ast',
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.lineStart,
    lineEnd: hit.lineEnd,
    codeLanguage: hit.language,
    codeKind: isMarkdownOutline ? hit.nodeKind : hit.nodeKind || 'symbol',
    codeRepo: hit.projectName ?? hit.crateName,
    searchSource: 'search-index',
    navigationTarget: hit.navigationTarget,
  };
}

export function normalizeReferenceHit(hit: ReferenceSearchHit): SearchResult {
  return {
    stem: hit.name,
    title: `${hit.name} reference`,
    path: hit.path,
    docType: 'reference',
    tags: [hit.language, hit.crateName].filter(Boolean),
    score: hit.score,
    bestSection: `${hit.language} · line ${hit.line} · col ${hit.column}`,
    matchReason: hit.lineText,
    category: 'reference',
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.line,
    column: hit.column,
    codeLanguage: hit.language,
    codeKind: 'reference',
    codeRepo: hit.projectName ?? hit.crateName,
    searchSource: 'search-index',
    navigationTarget: hit.navigationTarget,
  };
}

export function normalizeAttachmentHit(hit: AttachmentSearchHit): SearchResult {
  const sourceLabel = hit.sourceTitle?.trim() || hit.sourceStem;
  const navigationTarget = hit.navigationTarget ?? {
    path: hit.sourcePath,
    category: 'doc',
  };
  return {
    stem: hit.attachmentName,
    title: hit.attachmentName,
    path: hit.path,
    docType: 'attachment',
    tags: [`kind:${hit.kind}`, `ext:${hit.attachmentExt}`, `org:${hit.sourceId}`],
    score: hit.score,
    bestSection: hit.attachmentPath,
    matchReason: hit.visionSnippet || `Attached to ${sourceLabel}`,
    category: 'attachment',
    projectName: navigationTarget.projectName,
    rootLabel: navigationTarget.rootLabel,
    searchSource: 'search-index',
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
  }
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
    category: 'doc',
    ...(response.definition?.projectName
      ? { projectName: response.definition.projectName }
      : response.definition?.crateName
        ? { projectName: response.definition.crateName }
        : {}),
    ...(response.definition?.rootLabel ? { rootLabel: response.definition.rootLabel } : {}),
    ...(typeof response.definition?.lineStart === 'number' ? { line: response.definition.lineStart } : {}),
    ...(typeof response.definition?.lineEnd === 'number' ? { lineEnd: response.definition.lineEnd } : {}),
    graphPath: response.definition?.path ?? result.path,
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Search failed';
}
