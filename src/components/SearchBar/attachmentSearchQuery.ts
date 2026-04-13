interface AttachmentSearchRequestOptions {
  ext?: string[];
  kind?: string[];
  caseSensitive?: boolean;
}

export interface ResolvedAttachmentSearchRequest {
  query: string;
  options?: AttachmentSearchRequestOptions;
}

const EXT_PREFIXES = new Set(["ext", "extension"]);
const KIND_PREFIXES = new Set(["kind"]);
const CASE_PREFIXES = new Set(["case", "case_sensitive", "casesensitive"]);
const CASE_SENSITIVE_TRUE_VALUES = new Set(["1", "exact", "on", "sensitive", "true", "yes"]);
const CASE_SENSITIVE_FALSE_VALUES = new Set(["0", "false", "fold", "insensitive", "no", "off"]);

function pushUniqueNormalized(target: string[], values: string[], stripLeadingDot: boolean): void {
  values.forEach((value) => {
    const normalized = stripLeadingDot ? value.replace(/^\./, "") : value;
    const candidate = normalized.trim().toLowerCase();
    if (!candidate || target.includes(candidate)) {
      return;
    }
    target.push(candidate);
  });
}

function splitFilterValues(rawValue: string): string[] {
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function resolveAttachmentSearchRequest(rawQuery: string): ResolvedAttachmentSearchRequest {
  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) {
    return { query: "" };
  }

  const ext: string[] = [];
  const kind: string[] = [];
  const queryTokens: string[] = [];
  let caseSensitive = false;
  let sawAttachmentFilter = false;

  trimmedQuery.split(/\s+/).forEach((token) => {
    const separatorIndex = token.indexOf(":");
    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
      queryTokens.push(token);
      return;
    }

    const prefix = token.slice(0, separatorIndex).toLowerCase();
    const rawValue = token.slice(separatorIndex + 1);

    if (EXT_PREFIXES.has(prefix)) {
      const parsedValues = splitFilterValues(rawValue);
      if (parsedValues.length === 0) {
        queryTokens.push(token);
        return;
      }
      sawAttachmentFilter = true;
      pushUniqueNormalized(ext, parsedValues, true);
      return;
    }

    if (KIND_PREFIXES.has(prefix)) {
      const parsedValues = splitFilterValues(rawValue);
      if (parsedValues.length === 0) {
        queryTokens.push(token);
        return;
      }
      sawAttachmentFilter = true;
      pushUniqueNormalized(kind, parsedValues, false);
      return;
    }

    if (CASE_PREFIXES.has(prefix)) {
      const normalizedValue = rawValue.trim().toLowerCase();
      if (CASE_SENSITIVE_TRUE_VALUES.has(normalizedValue)) {
        sawAttachmentFilter = true;
        caseSensitive = true;
        return;
      }
      if (CASE_SENSITIVE_FALSE_VALUES.has(normalizedValue)) {
        sawAttachmentFilter = true;
        return;
      }
    }

    queryTokens.push(token);
  });

  const strippedQuery = queryTokens.join(" ").trim();
  if (!sawAttachmentFilter || !strippedQuery) {
    return { query: trimmedQuery };
  }

  const options: AttachmentSearchRequestOptions = {};
  if (ext.length > 0) {
    options.ext = ext;
  }
  if (kind.length > 0) {
    options.kind = kind;
  }
  if (caseSensitive) {
    options.caseSensitive = true;
  }

  return Object.keys(options).length > 0
    ? { query: strippedQuery, options }
    : { query: strippedQuery };
}
