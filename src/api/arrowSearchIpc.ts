import { tableFromIPC } from "apache-arrow";

import type {
  AutocompleteSuggestion,
  AttachmentSearchHit,
  AstSearchHit,
  ReferenceSearchHit,
  SearchBacklinkItem,
  SearchHit,
  StudioNavigationTarget,
  SymbolSearchHit,
} from "./bindings";
import type {
  RepoDocCoverageDoc,
  RepoIndexStatusResponse,
  RepoOverviewResponse,
  RepoSyncResponse,
} from "./apiContracts";
import { isArrowIpcPayloadEmpty, type ArrowIpcPayload } from "./arrowIpcPayload";

type ArrowRowRecord = Record<string, unknown>;

function requireString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Arrow search payload is missing required string field "${key}"`);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function parseJsonArrayOfStrings(value: unknown): string[] {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

function parseOptionalJson<T>(value: unknown): T | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return JSON.parse(value) as T;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (value && typeof value === "object" && Symbol.iterator in value) {
    return Array.from(value as Iterable<unknown>).filter(
      (item): item is string => typeof item === "string",
    );
  }
  return [];
}

function decodeArrowRows<T>(payload: ArrowIpcPayload, mapRow: (record: ArrowRowRecord) => T): T[] {
  if (isArrowIpcPayloadEmpty(payload)) {
    return [];
  }
  const table = tableFromIPC(payload);
  return table.toArray().map((row) => mapRow(row as ArrowRowRecord));
}

export function decodeSearchHitsFromArrowIpc(payload: ArrowIpcPayload): SearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const title = toOptionalString(record.title);
    const docType = toOptionalString(record.docType);
    const bestSection = toOptionalString(record.bestSection);
    const matchReason = toOptionalString(record.matchReason);
    const hierarchicalUri = toOptionalString(record.hierarchicalUri);
    const saliencyScore = toOptionalNumber(record.saliencyScore);
    const auditStatus = toOptionalString(record.auditStatus);
    const verificationState = toOptionalString(record.verificationState);
    const hierarchy = parseOptionalJson<string[]>(record.hierarchyJson);
    const implicitBacklinks = parseOptionalJson<string[]>(record.implicitBacklinksJson);
    const implicitBacklinkItems = parseOptionalJson<SearchBacklinkItem[]>(
      record.implicitBacklinkItemsJson,
    );
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      stem: requireString(record, "stem"),
      ...(title ? { title } : {}),
      path: requireString(record, "path"),
      ...(docType ? { docType } : {}),
      tags: parseJsonArrayOfStrings(record.tagsJson),
      score: toOptionalNumber(record.score) ?? 0,
      ...(bestSection ? { bestSection } : {}),
      ...(matchReason ? { matchReason } : {}),
      ...(hierarchicalUri ? { hierarchicalUri } : {}),
      ...(hierarchy && hierarchy.length > 0 ? { hierarchy } : {}),
      ...(typeof saliencyScore === "number" ? { saliencyScore } : {}),
      ...(auditStatus ? { auditStatus } : {}),
      ...(verificationState ? { verificationState } : {}),
      ...(implicitBacklinks && implicitBacklinks.length > 0 ? { implicitBacklinks } : {}),
      ...(implicitBacklinkItems && implicitBacklinkItems.length > 0
        ? { implicitBacklinkItems }
        : {}),
      ...(navigationTarget ? { navigationTarget } : {}),
    };
  });
}

export function decodeRepoSearchHitsFromArrowIpc(
  payload: ArrowIpcPayload,
  fallbackRepoId: string,
): SearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const path = requireString(record, "path");
    const language = toOptionalString(record.language)?.toLowerCase();
    const tags = toStringArray(record.tags);
    const normalizedTags =
      language && !tags.some((tag) => tag.toLowerCase() === `lang:${language}`)
        ? [...tags, `lang:${language}`]
        : tags;
    const hierarchy = toStringArray(record.hierarchy);
    const navigationPath = toOptionalString(record.navigation_path) || path;
    const navigationLine = toOptionalNumber(record.navigation_line);
    const navigationLineEnd = toOptionalNumber(record.navigation_line_end);
    const navigationTarget: StudioNavigationTarget = {
      path: navigationPath,
      category: "repo_code",
      projectName: fallbackRepoId,
      ...(navigationLine && navigationLine > 0 ? { line: navigationLine } : {}),
      ...(navigationLineEnd && navigationLineEnd > 0 ? { lineEnd: navigationLineEnd } : {}),
    };

    return {
      stem: requireString(record, "doc_id"),
      ...(toOptionalString(record.title) ? { title: toOptionalString(record.title) } : {}),
      path,
      docType: "file",
      tags: normalizedTags,
      score: toOptionalNumber(record.score) ?? 0,
      ...(toOptionalString(record.best_section)
        ? { bestSection: toOptionalString(record.best_section) }
        : {}),
      ...(toOptionalString(record.match_reason)
        ? { matchReason: toOptionalString(record.match_reason) }
        : {}),
      ...(hierarchy.length > 0 ? { hierarchy } : {}),
      navigationTarget,
    };
  });
}

export function decodeRepoDocCoverageDocsFromArrowIpc(
  payload: ArrowIpcPayload,
  fallbackRepoId: string,
): RepoDocCoverageDoc[] {
  return decodeArrowRows(payload, (record) => {
    const targetKind = toOptionalString(record.targetKind);
    const targetName = toOptionalString(record.targetName);
    const targetPath = toOptionalString(record.targetPath);
    const targetLineStart = toOptionalNumber(record.targetLineStart);
    const targetLineEnd = toOptionalNumber(record.targetLineEnd);

    return {
      repoId: toOptionalString(record.repoId) ?? fallbackRepoId,
      docId: requireString(record, "docId"),
      title: requireString(record, "title"),
      path: requireString(record, "path"),
      format: toOptionalString(record.format) ?? "unknown",
      ...(targetKind && targetName
        ? {
            docTarget: {
              kind: targetKind,
              name: targetName,
              ...(targetPath ? { path: targetPath } : {}),
              ...(typeof targetLineStart === "number" ? { lineStart: targetLineStart } : {}),
              ...(typeof targetLineEnd === "number" ? { lineEnd: targetLineEnd } : {}),
            },
          }
        : {}),
    };
  });
}

export function decodeRepoOverviewResponseFromArrowIpc(
  payload: ArrowIpcPayload,
  fallbackRepoId: string,
): RepoOverviewResponse {
  const [overview] = decodeArrowRows(payload, (record) => ({
    repoId: toOptionalString(record.repoId) ?? fallbackRepoId,
    displayName: requireString(record, "displayName"),
    ...(toOptionalString(record.revision) ? { revision: toOptionalString(record.revision) } : {}),
    moduleCount: toOptionalNumber(record.moduleCount) ?? 0,
    symbolCount: toOptionalNumber(record.symbolCount) ?? 0,
    exampleCount: toOptionalNumber(record.exampleCount) ?? 0,
    docCount: toOptionalNumber(record.docCount) ?? 0,
    ...(toOptionalString(record.hierarchicalUri)
      ? { hierarchicalUri: toOptionalString(record.hierarchicalUri) }
      : {}),
  }));

  if (!overview) {
    throw new Error("Arrow repo overview payload must contain one summary row");
  }

  return overview;
}

export function decodeRepoIndexStatusResponseFromArrowIpc(
  payload: ArrowIpcPayload,
): RepoIndexStatusResponse {
  const [status] = decodeArrowRows(payload, (record) => ({
    total: toOptionalNumber(record.total) ?? 0,
    queued: toOptionalNumber(record.queued) ?? 0,
    checking: toOptionalNumber(record.checking) ?? 0,
    syncing: toOptionalNumber(record.syncing) ?? 0,
    indexing: toOptionalNumber(record.indexing) ?? 0,
    ready: toOptionalNumber(record.ready) ?? 0,
    unsupported: toOptionalNumber(record.unsupported) ?? 0,
    failed: toOptionalNumber(record.failed) ?? 0,
    targetConcurrency: toOptionalNumber(record.targetConcurrency) ?? 0,
    maxConcurrency: toOptionalNumber(record.maxConcurrency) ?? 0,
    syncConcurrencyLimit: toOptionalNumber(record.syncConcurrencyLimit) ?? 0,
    ...(toOptionalString(record.currentRepoId)
      ? { currentRepoId: toOptionalString(record.currentRepoId) }
      : {}),
    repos: parseOptionalJson<RepoIndexStatusResponse["repos"]>(record.reposJson) ?? [],
  }));

  if (!status) {
    throw new Error("Arrow repo index status payload must contain one summary row");
  }

  return status;
}

export function decodeRepoSyncResponseFromArrowIpc(payload: ArrowIpcPayload): RepoSyncResponse {
  const [status] = decodeArrowRows(payload, (record) => ({
    repoId: requireString(record, "repoId"),
    mode: requireString(record, "mode"),
    ...(toOptionalString(record.sourceKind)
      ? { sourceKind: toOptionalString(record.sourceKind) }
      : {}),
    ...(toOptionalString(record.refresh) ? { refresh: toOptionalString(record.refresh) } : {}),
    ...(toOptionalString(record.mirrorState)
      ? { mirrorState: toOptionalString(record.mirrorState) }
      : {}),
    ...(toOptionalString(record.checkoutState)
      ? { checkoutState: toOptionalString(record.checkoutState) }
      : {}),
    ...(toOptionalString(record.revision) ? { revision: toOptionalString(record.revision) } : {}),
    checkoutPath: requireString(record, "checkoutPath"),
    ...(toOptionalString(record.mirrorPath)
      ? { mirrorPath: toOptionalString(record.mirrorPath) }
      : { mirrorPath: null }),
    checkedAt: requireString(record, "checkedAt"),
    ...(toOptionalString(record.lastFetchedAt)
      ? { lastFetchedAt: toOptionalString(record.lastFetchedAt) }
      : {}),
    ...(toOptionalString(record.upstreamUrl)
      ? { upstreamUrl: toOptionalString(record.upstreamUrl) }
      : { upstreamUrl: null }),
    ...(toOptionalString(record.healthState)
      ? { healthState: toOptionalString(record.healthState) }
      : {}),
    ...(toOptionalString(record.stalenessState)
      ? { stalenessState: toOptionalString(record.stalenessState) }
      : {}),
    ...(toOptionalString(record.driftState)
      ? { driftState: toOptionalString(record.driftState) }
      : {}),
    ...(typeof record.statusSummaryJson === "string"
      ? {
          statusSummary:
            parseOptionalJson<Record<string, unknown>>(record.statusSummaryJson) ?? undefined,
        }
      : {}),
  }));

  if (!status) {
    throw new Error("Arrow repo sync payload must contain one summary row");
  }

  return status;
}

export function decodeAttachmentSearchHitsFromArrowIpc(
  payload: ArrowIpcPayload,
): AttachmentSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const name = toOptionalString(record.name);
    const sourceTitle = toOptionalString(record.sourceTitle);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);
    const visionSnippet = toOptionalString(record.visionSnippet);

    return {
      ...(name ? { name } : {}),
      path: requireString(record, "path"),
      sourceId: requireString(record, "sourceId"),
      sourceStem: requireString(record, "sourceStem"),
      ...(sourceTitle ? { sourceTitle } : {}),
      ...(navigationTarget ? { navigationTarget } : {}),
      sourcePath: requireString(record, "sourcePath"),
      attachmentId: requireString(record, "attachmentId"),
      attachmentPath: requireString(record, "attachmentPath"),
      attachmentName: requireString(record, "attachmentName"),
      attachmentExt: requireString(record, "attachmentExt"),
      kind: requireString(record, "kind") as AttachmentSearchHit["kind"],
      score: toOptionalNumber(record.score) ?? 0,
      ...(visionSnippet ? { visionSnippet } : {}),
    };
  });
}

export function decodeAutocompleteSuggestionsFromArrowIpc(
  payload: ArrowIpcPayload,
): AutocompleteSuggestion[] {
  return decodeArrowRows(payload, (record) => ({
    text: requireString(record, "text"),
    suggestionType: requireString(
      record,
      "suggestionType",
    ) as AutocompleteSuggestion["suggestionType"],
  }));
}

export function decodeSymbolSearchHitsFromArrowIpc(payload: ArrowIpcPayload): SymbolSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, "name"),
      kind: requireString(record, "kind"),
      path: requireString(record, "path"),
      line: toOptionalNumber(record.line) ?? 1,
      location: requireString(record, "location"),
      language: requireString(record, "language"),
      source: requireString(record, "source") as SymbolSearchHit["source"],
      crateName: requireString(record, "crateName"),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, "path"),
        category: "doc",
      },
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}

export function decodeReferenceSearchHitsFromArrowIpc(
  payload: ArrowIpcPayload,
): ReferenceSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, "name"),
      path: requireString(record, "path"),
      language: requireString(record, "language"),
      crateName: requireString(record, "crateName"),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, "path"),
        category: "doc",
      },
      line: toOptionalNumber(record.line) ?? 1,
      column: toOptionalNumber(record.column) ?? 1,
      lineText: requireString(record, "lineText"),
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}

export function decodeAstSearchHitsFromArrowIpc(payload: ArrowIpcPayload): AstSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const nodeKind = toOptionalString(record.nodeKind);
    const ownerTitle = toOptionalString(record.ownerTitle);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, "name"),
      signature: requireString(record, "signature"),
      path: requireString(record, "path"),
      language: requireString(record, "language"),
      crateName: requireString(record, "crateName"),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      ...(nodeKind ? { nodeKind } : {}),
      ...(ownerTitle ? { ownerTitle } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, "path"),
        category: "doc",
      },
      lineStart: toOptionalNumber(record.lineStart) ?? 1,
      lineEnd: toOptionalNumber(record.lineEnd) ?? 1,
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}

export function decodeDefinitionHitsFromArrowIpc(payload: ArrowIpcPayload): AstSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const nodeKind = toOptionalString(record.nodeKind);
    const ownerTitle = toOptionalString(record.ownerTitle);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, "name"),
      signature: requireString(record, "signature"),
      path: requireString(record, "path"),
      language: requireString(record, "language"),
      crateName: requireString(record, "crateName"),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      ...(nodeKind ? { nodeKind } : {}),
      ...(ownerTitle ? { ownerTitle } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, "path"),
        category: "doc",
      },
      lineStart: toOptionalNumber(record.lineStart) ?? 1,
      lineEnd: toOptionalNumber(record.lineEnd) ?? 1,
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}
