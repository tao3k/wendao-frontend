import type { RepoIndexIssue, RepoIndexUnsupportedReason } from "../statusBar/types";
import type { RepoDiagnosticsCopy, RepoDiagnosticsLocale } from "./types";

export type RepoDiagnosticsFilter = "all" | "unsupported" | "failed";

export interface RepoIndexFailureReasonSummary {
  reasonKey: string;
  machineKey: string;
  label: string;
  count: number;
  repoIds: string[];
  sampleErrors: string[];
}

export interface RepoIndexFailureRemediation {
  category: "transient_transport" | "auth_access" | "generic";
  retryable: boolean;
  guidance: string;
}

export interface RepoIndexFailureActionPreset {
  actionKey:
    | "retry_with_lower_sync_concurrency"
    | "verify_git_credentials_and_remote_access"
    | "inspect_failure_and_repo_configuration";
  retryScope: "repo" | "failure_family" | "manual";
  envOverrides: Record<string, string>;
  followUpChecks: string[];
}

export const MAX_DIAGNOSTIC_FAILURE_PREVIEW = 3;
const MAX_FAILURE_ERROR_SAMPLES = 3;
export const EMPTY_UNSUPPORTED_REASONS: RepoIndexUnsupportedReason[] = [];
export const EMPTY_REPO_INDEX_ISSUES: RepoIndexIssue[] = [];

const UNKNOWN_FAILURE_REASON_KEY = "__unknown_failure__";
const UNKNOWN_FAILURE_MACHINE_KEY = "unknown_failure";
const GITHUB_CONNECT_ADDRESS_REASON_KEY =
  "failed to connect to github.com: can't assign requested address";
const GITHUB_CONNECT_FAILED_REASON_KEY = "failed to connect to github.com";
const SOCKET_TIMEOUT_REASON_KEY = "socket timeout";
const CONNECTION_RESET_REASON_KEY = "connection reset";
const NETWORK_UNREACHABLE_REASON_KEY = "network is unreachable";
const AUTH_FAILED_REASON_KEY = "auth failed";
const PERMISSION_DENIED_REASON_KEY = "permission denied";
const REPOSITORY_NOT_FOUND_REASON_KEY = "repository not found";
const GITHUB_CONNECT_ADDRESS_MACHINE_KEY = "github_connect_address_unavailable";
const GITHUB_CONNECT_FAILED_MACHINE_KEY = "github_connect_failed";
const SOCKET_TIMEOUT_MACHINE_KEY = "socket_timeout";
const CONNECTION_RESET_MACHINE_KEY = "connection_reset";
const NETWORK_UNREACHABLE_MACHINE_KEY = "network_unreachable";
const AUTH_FAILED_MACHINE_KEY = "auth_failed";
const PERMISSION_DENIED_MACHINE_KEY = "permission_denied";
const REPOSITORY_NOT_FOUND_MACHINE_KEY = "repository_not_found";
const REPO_DIAGNOSTICS_OPEN_KEY = "wendao-repo-diagnostics-open";
const REPO_DIAGNOSTICS_DRAWER_OPEN_KEY = "wendao-repo-diagnostics-drawer-open";
const REPO_DIAGNOSTICS_EXPANDED_UNSUPPORTED_REASONS_KEY =
  "wendao-repo-diagnostics-expanded-unsupported-reasons";
const REPO_DIAGNOSTICS_FILTER_KEY = "wendao-repo-diagnostics-filter";
const REPO_DIAGNOSTICS_REASON_KEY = "wendao-repo-diagnostics-reason";
const REPO_DIAGNOSTICS_FAILED_REASON_KEY = "wendao-repo-diagnostics-failed-reason";
const LEGACY_REPO_DIAGNOSTICS_OPEN_KEY = "wendao-file-tree-diagnostics-open";
const LEGACY_REPO_DIAGNOSTICS_DRAWER_OPEN_KEY = "wendao-file-tree-diagnostics-drawer-open";
const LEGACY_REPO_DIAGNOSTICS_EXPANDED_UNSUPPORTED_REASONS_KEY =
  "wendao-file-tree-diagnostics-expanded-unsupported-reasons";
const LEGACY_FILE_TREE_DIAGNOSTICS_FILTER_KEY = "wendao-file-tree-diagnostics-filter";
const LEGACY_FILE_TREE_DIAGNOSTICS_REASON_KEY = "wendao-file-tree-diagnostics-reason";
const LEGACY_FILE_TREE_DIAGNOSTICS_FAILED_REASON_KEY = "wendao-file-tree-diagnostics-failed-reason";

function readLocalStorageItem(...keys: string[]): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    for (const key of keys) {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function readBooleanLocalStorageItem(...keys: string[]): boolean {
  return readLocalStorageItem(...keys) === "true";
}

function writeBooleanLocalStorageItem(key: string, value: boolean): void {
  writeLocalStorageItem(key, value ? "true" : "false");
}

function readStringArrayLocalStorageItem(...keys: string[]): string[] {
  const rawValue = readLocalStorageItem(...keys);
  if (rawValue === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStringArrayLocalStorageItem(key: string, value: string[]): void {
  if (value.length === 0) {
    removeLocalStorageItem(key);
    return;
  }
  writeLocalStorageItem(key, JSON.stringify(value));
}

export function readRepoDiagnosticsOpenState(): boolean {
  return readBooleanLocalStorageItem(REPO_DIAGNOSTICS_OPEN_KEY, LEGACY_REPO_DIAGNOSTICS_OPEN_KEY);
}

export function persistRepoDiagnosticsOpenState(next: boolean): void {
  writeBooleanLocalStorageItem(REPO_DIAGNOSTICS_OPEN_KEY, next);
}

export function readRepoDiagnosticsDrawerOpenState(): boolean {
  return readBooleanLocalStorageItem(
    REPO_DIAGNOSTICS_DRAWER_OPEN_KEY,
    LEGACY_REPO_DIAGNOSTICS_DRAWER_OPEN_KEY,
  );
}

export function persistRepoDiagnosticsDrawerOpenState(next: boolean): void {
  writeBooleanLocalStorageItem(REPO_DIAGNOSTICS_DRAWER_OPEN_KEY, next);
}

export function readExpandedUnsupportedReasonsState(): string[] {
  return readStringArrayLocalStorageItem(
    REPO_DIAGNOSTICS_EXPANDED_UNSUPPORTED_REASONS_KEY,
    LEGACY_REPO_DIAGNOSTICS_EXPANDED_UNSUPPORTED_REASONS_KEY,
  );
}

export function persistExpandedUnsupportedReasonsState(next: string[]): void {
  writeStringArrayLocalStorageItem(REPO_DIAGNOSTICS_EXPANDED_UNSUPPORTED_REASONS_KEY, next);
}

export function readRepoDiagnosticsFilterState(): RepoDiagnosticsFilter {
  const stored = readLocalStorageItem(
    REPO_DIAGNOSTICS_FILTER_KEY,
    LEGACY_FILE_TREE_DIAGNOSTICS_FILTER_KEY,
  );
  return stored === "unsupported" || stored === "failed" || stored === "all" ? stored : "all";
}

export function persistRepoDiagnosticsFilterState(next: RepoDiagnosticsFilter): void {
  writeLocalStorageItem(REPO_DIAGNOSTICS_FILTER_KEY, next);
}

export function readRepoDiagnosticsReasonState(): string | null {
  const stored =
    readLocalStorageItem(
      REPO_DIAGNOSTICS_REASON_KEY,
      LEGACY_FILE_TREE_DIAGNOSTICS_REASON_KEY,
    )?.trim() ?? "";
  return stored.length > 0 ? stored : null;
}

export function persistRepoDiagnosticsReasonState(next: string | null): void {
  if (next === null) {
    removeLocalStorageItem(REPO_DIAGNOSTICS_REASON_KEY);
    return;
  }
  writeLocalStorageItem(REPO_DIAGNOSTICS_REASON_KEY, next);
}

export function readRepoDiagnosticsFailedReasonState(): string | null {
  const stored =
    readLocalStorageItem(
      REPO_DIAGNOSTICS_FAILED_REASON_KEY,
      LEGACY_FILE_TREE_DIAGNOSTICS_FAILED_REASON_KEY,
    )?.trim() ?? "";
  return stored.length > 0 ? stored : null;
}

export function persistRepoDiagnosticsFailedReasonState(next: string | null): void {
  if (next === null) {
    removeLocalStorageItem(REPO_DIAGNOSTICS_FAILED_REASON_KEY);
    return;
  }
  writeLocalStorageItem(REPO_DIAGNOSTICS_FAILED_REASON_KEY, next);
}

export function formatFailedIssueLine(issue: RepoIndexIssue, copy: RepoDiagnosticsCopy): string {
  return `${copy.failed} ${issue.repoId}${issue.lastError ? ` · ${issue.lastError}` : ""}`;
}

export function unsupportedReasonGuidance(
  reason: RepoIndexUnsupportedReason,
  copy: RepoDiagnosticsCopy,
): string {
  if (reason.reason === "missing Project.toml") {
    return copy.fixHintMissingProject;
  }
  return copy.fixHintGeneric;
}

interface FailureReasonDescriptor {
  label: string;
  machineKey: string;
}

function compactFailureReasonText(reason: string): string {
  return reason.trim().replace(/\s+/g, " ");
}

function machineKeyFromGenericFailureLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
  return slug.length > 0 ? `generic_${slug}` : "generic_failure";
}

function describeFailureReason(reason: string): FailureReasonDescriptor {
  const compacted = compactFailureReasonText(reason);
  if (compacted.length === 0) {
    return {
      label: UNKNOWN_FAILURE_REASON_KEY,
      machineKey: UNKNOWN_FAILURE_MACHINE_KEY,
    };
  }

  const normalized = compacted.toLowerCase();
  if (
    normalized.includes("can't assign requested address") &&
    normalized.includes("failed to connect") &&
    normalized.includes("github.com")
  ) {
    return {
      label: GITHUB_CONNECT_ADDRESS_REASON_KEY,
      machineKey: GITHUB_CONNECT_ADDRESS_MACHINE_KEY,
    };
  }
  if (normalized.includes("failed to connect") && normalized.includes("github.com")) {
    return {
      label: GITHUB_CONNECT_FAILED_REASON_KEY,
      machineKey: GITHUB_CONNECT_FAILED_MACHINE_KEY,
    };
  }
  if (normalized.includes("socket timeout") || normalized.includes("timed out")) {
    return {
      label: SOCKET_TIMEOUT_REASON_KEY,
      machineKey: SOCKET_TIMEOUT_MACHINE_KEY,
    };
  }
  if (normalized.includes("connection reset")) {
    return {
      label: CONNECTION_RESET_REASON_KEY,
      machineKey: CONNECTION_RESET_MACHINE_KEY,
    };
  }
  if (normalized.includes("network is unreachable")) {
    return {
      label: NETWORK_UNREACHABLE_REASON_KEY,
      machineKey: NETWORK_UNREACHABLE_MACHINE_KEY,
    };
  }
  if (normalized.includes("auth failed") || normalized.includes("authentication failed")) {
    return {
      label: AUTH_FAILED_REASON_KEY,
      machineKey: AUTH_FAILED_MACHINE_KEY,
    };
  }
  if (
    normalized.includes("permission denied") ||
    normalized.includes("access denied") ||
    normalized.includes("could not read username")
  ) {
    return {
      label: PERMISSION_DENIED_REASON_KEY,
      machineKey: PERMISSION_DENIED_MACHINE_KEY,
    };
  }
  if (normalized.includes("repository not found")) {
    return {
      label: REPOSITORY_NOT_FOUND_REASON_KEY,
      machineKey: REPOSITORY_NOT_FOUND_MACHINE_KEY,
    };
  }
  return {
    label: compacted,
    machineKey: machineKeyFromGenericFailureLabel(compacted),
  };
}

export function failedReasonKey(issue: RepoIndexIssue): string {
  const reason = issue.lastError?.trim();
  return reason && reason.length > 0
    ? describeFailureReason(reason).label
    : UNKNOWN_FAILURE_REASON_KEY;
}

export function failedReasonMachineKey(issue: RepoIndexIssue): string {
  const reason = issue.lastError?.trim();
  return reason && reason.length > 0
    ? describeFailureReason(reason).machineKey
    : UNKNOWN_FAILURE_MACHINE_KEY;
}

function classifyFailureReason(reasonKey: string): RepoIndexFailureRemediation["category"] {
  const machineKey = describeFailureReason(reasonKey).machineKey;
  if (
    machineKey === GITHUB_CONNECT_ADDRESS_MACHINE_KEY ||
    machineKey === GITHUB_CONNECT_FAILED_MACHINE_KEY ||
    machineKey === SOCKET_TIMEOUT_MACHINE_KEY ||
    machineKey === CONNECTION_RESET_MACHINE_KEY ||
    machineKey === NETWORK_UNREACHABLE_MACHINE_KEY
  ) {
    return "transient_transport";
  }
  if (
    machineKey === AUTH_FAILED_MACHINE_KEY ||
    machineKey === PERMISSION_DENIED_MACHINE_KEY ||
    machineKey === REPOSITORY_NOT_FOUND_MACHINE_KEY
  ) {
    return "auth_access";
  }
  return "generic";
}

export function failureReasonRemediation(
  reasonKey: string,
  copy: RepoDiagnosticsCopy,
): RepoIndexFailureRemediation {
  switch (classifyFailureReason(reasonKey)) {
    case "transient_transport":
      return {
        category: "transient_transport",
        retryable: true,
        guidance: copy.fixHintTransientFailure,
      };
    case "auth_access":
      return {
        category: "auth_access",
        retryable: false,
        guidance: copy.fixHintAuthFailure,
      };
    case "generic":
    default:
      return {
        category: "generic",
        retryable: false,
        guidance: copy.fixHintGenericFailure,
      };
  }
}

export function failureReasonActionPreset(
  reasonKey: string,
  syncConcurrencyLimit: number | null,
  retryScope: "repo" | "failure_family",
): RepoIndexFailureActionPreset {
  switch (classifyFailureReason(reasonKey)) {
    case "transient_transport":
      return {
        actionKey: "retry_with_lower_sync_concurrency",
        retryScope,
        envOverrides: {
          XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY: String(
            Math.max(1, (syncConcurrencyLimit ?? 2) - 1),
          ),
        },
        followUpChecks: [
          "outbound_github_connectivity",
          "ephemeral_port_pressure",
          "managed_mirror_retry_queue",
        ],
      };
    case "auth_access":
      return {
        actionKey: "verify_git_credentials_and_remote_access",
        retryScope: "manual",
        envOverrides: {},
        followUpChecks: ["git_credential", "repository_visibility", "remote_url_access"],
      };
    case "generic":
    default:
      return {
        actionKey: "inspect_failure_and_repo_configuration",
        retryScope: "manual",
        envOverrides: {},
        followUpChecks: ["raw_failure_message", "repo_configuration"],
      };
  }
}

function failedReasonLabel(reasonKey: string, locale: RepoDiagnosticsLocale): string {
  if (reasonKey === UNKNOWN_FAILURE_REASON_KEY) {
    return locale === "zh" ? "未知失败" : "unknown failure";
  }
  return reasonKey;
}

export function collectFailureReasons(
  issues: RepoIndexIssue[],
  locale: RepoDiagnosticsLocale,
): RepoIndexFailureReasonSummary[] {
  const groupedReasons = new Map<string, RepoIndexFailureReasonSummary>();
  for (const issue of issues) {
    const reasonKey = failedReasonKey(issue);
    const machineKey = failedReasonMachineKey(issue);
    const rawReason = issue.lastError?.trim();
    const existing = groupedReasons.get(reasonKey);
    if (existing) {
      existing.count += 1;
      existing.repoIds.push(issue.repoId);
      if (
        rawReason &&
        rawReason.length > 0 &&
        !existing.sampleErrors.includes(rawReason) &&
        existing.sampleErrors.length < MAX_FAILURE_ERROR_SAMPLES
      ) {
        existing.sampleErrors.push(rawReason);
      }
      continue;
    }
    groupedReasons.set(reasonKey, {
      reasonKey,
      machineKey,
      label: failedReasonLabel(reasonKey, locale),
      count: 1,
      repoIds: [issue.repoId],
      sampleErrors: rawReason && rawReason.length > 0 ? [rawReason] : [],
    });
  }
  return Array.from(groupedReasons.values()).toSorted((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.label.localeCompare(right.label);
  });
}

export function buildUnsupportedManifest(reasons: RepoIndexUnsupportedReason[]): string {
  const lines = ["# Repo index unsupported remediation manifest"];
  for (const reason of reasons) {
    lines.push("[[unsupported_groups]]");
    lines.push(`reason = ${JSON.stringify(reason.reason)}`);
    lines.push(`count = ${reason.count}`);
    lines.push(
      `repos = [${(reason.repoIds ?? []).map((repoId) => JSON.stringify(repoId)).join(", ")}]`,
    );
    if (reason.reason === "missing Project.toml") {
      lines.push(
        'suggestion = "If docs-only, move these repos to link_graph.projects.* with plugins = []"',
      );
    } else {
      lines.push('suggestion = "Inspect repo layout and plugin assignment before retrying"');
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
