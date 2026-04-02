import { tableFromIPC } from 'apache-arrow';

import type {
  AutocompleteSuggestion,
  AttachmentSearchHit,
  AstSearchHit,
  ReferenceSearchHit,
  SearchBacklinkItem,
  SearchHit,
  StudioNavigationTarget,
  SymbolSearchHit,
} from './bindings';

type ArrowRowRecord = Record<string, unknown>;

function requireString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Arrow search payload is missing required string field "${key}"`);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function parseJsonArrayOfStrings(value: unknown): string[] {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

function parseOptionalJson<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  return JSON.parse(value) as T;
}

function decodeArrowRows<T>(
  payload: ArrayBuffer,
  mapRow: (record: ArrowRowRecord) => T
): T[] {
  if (payload.byteLength === 0) {
    return [];
  }
  const table = tableFromIPC(payload);
  return table.toArray().map((row) => mapRow(row as ArrowRowRecord));
}

export function decodeSearchHitsFromArrowIpc(payload: ArrayBuffer): SearchHit[] {
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
    const implicitBacklinkItems = parseOptionalJson<SearchBacklinkItem[]>(record.implicitBacklinkItemsJson);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      stem: requireString(record, 'stem'),
      ...(title ? { title } : {}),
      path: requireString(record, 'path'),
      ...(docType ? { docType } : {}),
      tags: parseJsonArrayOfStrings(record.tagsJson),
      score: toOptionalNumber(record.score) ?? 0,
      ...(bestSection ? { bestSection } : {}),
      ...(matchReason ? { matchReason } : {}),
      ...(hierarchicalUri ? { hierarchicalUri } : {}),
      ...(hierarchy && hierarchy.length > 0 ? { hierarchy } : {}),
      ...(typeof saliencyScore === 'number' ? { saliencyScore } : {}),
      ...(auditStatus ? { auditStatus } : {}),
      ...(verificationState ? { verificationState } : {}),
      ...(implicitBacklinks && implicitBacklinks.length > 0 ? { implicitBacklinks } : {}),
      ...(implicitBacklinkItems && implicitBacklinkItems.length > 0 ? { implicitBacklinkItems } : {}),
      ...(navigationTarget ? { navigationTarget } : {}),
    };
  });
}

export function decodeAttachmentSearchHitsFromArrowIpc(
  payload: ArrayBuffer
): AttachmentSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const name = toOptionalString(record.name);
    const sourceTitle = toOptionalString(record.sourceTitle);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);
    const visionSnippet = toOptionalString(record.visionSnippet);

    return {
      ...(name ? { name } : {}),
      path: requireString(record, 'path'),
      sourceId: requireString(record, 'sourceId'),
      sourceStem: requireString(record, 'sourceStem'),
      ...(sourceTitle ? { sourceTitle } : {}),
      ...(navigationTarget ? { navigationTarget } : {}),
      sourcePath: requireString(record, 'sourcePath'),
      attachmentId: requireString(record, 'attachmentId'),
      attachmentPath: requireString(record, 'attachmentPath'),
      attachmentName: requireString(record, 'attachmentName'),
      attachmentExt: requireString(record, 'attachmentExt'),
      kind: requireString(record, 'kind') as AttachmentSearchHit['kind'],
      score: toOptionalNumber(record.score) ?? 0,
      ...(visionSnippet ? { visionSnippet } : {}),
    };
  });
}

export function decodeAutocompleteSuggestionsFromArrowIpc(
  payload: ArrayBuffer
): AutocompleteSuggestion[] {
  return decodeArrowRows(payload, (record) => ({
    text: requireString(record, 'text'),
    suggestionType: requireString(record, 'suggestionType') as AutocompleteSuggestion['suggestionType'],
  }));
}

export function decodeSymbolSearchHitsFromArrowIpc(payload: ArrayBuffer): SymbolSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, 'name'),
      kind: requireString(record, 'kind'),
      path: requireString(record, 'path'),
      line: toOptionalNumber(record.line) ?? 1,
      location: requireString(record, 'location'),
      language: requireString(record, 'language'),
      source: requireString(record, 'source'),
      crateName: requireString(record, 'crateName'),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, 'path'),
        category: 'doc',
      },
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}

export function decodeReferenceSearchHitsFromArrowIpc(payload: ArrayBuffer): ReferenceSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, 'name'),
      path: requireString(record, 'path'),
      language: requireString(record, 'language'),
      crateName: requireString(record, 'crateName'),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, 'path'),
        category: 'doc',
      },
      line: toOptionalNumber(record.line) ?? 1,
      column: toOptionalNumber(record.column) ?? 1,
      lineText: requireString(record, 'lineText'),
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}

export function decodeAstSearchHitsFromArrowIpc(payload: ArrayBuffer): AstSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const nodeKind = toOptionalString(record.nodeKind);
    const ownerTitle = toOptionalString(record.ownerTitle);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, 'name'),
      signature: requireString(record, 'signature'),
      path: requireString(record, 'path'),
      language: requireString(record, 'language'),
      crateName: requireString(record, 'crateName'),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      ...(nodeKind ? { nodeKind } : {}),
      ...(ownerTitle ? { ownerTitle } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, 'path'),
        category: 'doc',
      },
      lineStart: toOptionalNumber(record.lineStart) ?? 1,
      lineEnd: toOptionalNumber(record.lineEnd) ?? 1,
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}

export function decodeDefinitionHitsFromArrowIpc(payload: ArrayBuffer): AstSearchHit[] {
  return decodeArrowRows(payload, (record) => {
    const projectName = toOptionalString(record.projectName);
    const rootLabel = toOptionalString(record.rootLabel);
    const nodeKind = toOptionalString(record.nodeKind);
    const ownerTitle = toOptionalString(record.ownerTitle);
    const navigationTarget = parseOptionalJson<StudioNavigationTarget>(record.navigationTargetJson);

    return {
      name: requireString(record, 'name'),
      signature: requireString(record, 'signature'),
      path: requireString(record, 'path'),
      language: requireString(record, 'language'),
      crateName: requireString(record, 'crateName'),
      ...(projectName ? { projectName } : {}),
      ...(rootLabel ? { rootLabel } : {}),
      ...(nodeKind ? { nodeKind } : {}),
      ...(ownerTitle ? { ownerTitle } : {}),
      navigationTarget: navigationTarget ?? {
        path: requireString(record, 'path'),
        category: 'doc',
      },
      lineStart: toOptionalNumber(record.lineStart) ?? 1,
      lineEnd: toOptionalNumber(record.lineEnd) ?? 1,
      score: toOptionalNumber(record.score) ?? 0,
    };
  });
}
