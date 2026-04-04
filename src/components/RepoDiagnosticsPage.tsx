import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { api } from "../api";
import { buildRepoDiagnosticsHash, parseRepoDiagnosticsHash } from "./repoDiagnosticsLocation";
import { REPO_DIAGNOSTICS_COPY } from "./repoDiagnostics/copy";
import { RepoDiagnosticsDrawer } from "./repoDiagnostics/RepoDiagnosticsDrawer";
import {
  collectFailureReasons,
  failureReasonActionPreset,
  failedReasonMachineKey,
  failureReasonRemediation,
  unsupportedReasonGuidance,
} from "./repoDiagnostics/state";
import type { RepoDiagnosticsCopy, RepoDiagnosticsLocale } from "./repoDiagnostics/types";
import { toRepoIndexStatusSnapshot } from "./panels/FileTree/repoIndexStatus";
import { useRepoDiagnostics } from "./repoDiagnostics/useRepoDiagnostics";
import type {
  RepoIndexIssue,
  RepoIndexStatus,
  RepoIndexUnsupportedReason,
} from "./statusBar/types";
import "../App.css";

interface RepoDiagnosticsPageProps {
  locale?: RepoDiagnosticsLocale;
  repoIndexStatus: RepoIndexStatus | null;
  onClose: () => void;
  onStatusChange: (status: RepoIndexStatus | null) => void;
}

interface RepoDiagnosticsMetric {
  label: string;
  value: number;
  tone: "default" | "warning" | "error" | "active";
}

function buildDiagnosticsSummary(
  copy: RepoDiagnosticsCopy,
  repoIndexStatus: RepoIndexStatus | null,
): string {
  return `${copy.unsupported} ${repoIndexStatus?.unsupported ?? 0} · ${copy.failed} ${repoIndexStatus?.failed ?? 0}`;
}

function buildSelectedRepoDiagnosticsBrief(input: {
  repoId: string;
  phase: "failed" | "unsupported";
  reason: string | null;
  attempts: number | null;
  guidance: string | null;
}): string {
  const lines = [
    "# Repo diagnostics brief",
    `repo = ${JSON.stringify(input.repoId)}`,
    `phase = ${JSON.stringify(input.phase)}`,
  ];
  if (input.reason !== null) {
    lines.push(`reason = ${JSON.stringify(input.reason)}`);
  }
  if (input.attempts !== null) {
    lines.push(`attempts = ${input.attempts}`);
  }
  if (input.guidance !== null) {
    lines.push(`guidance = ${JSON.stringify(input.guidance)}`);
  }
  return lines.join("\n");
}

function buildSelectedRepoDiagnosticsFilename(repoId: string): string {
  const sanitized = repoId
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sanitized || "repo";
}

function buildSelectedRepoFixTemplate(input: {
  repoId: string;
  reason: string;
  guidance: string | null;
}): string {
  const lines = [
    "# Repo remediation template",
    `repo = ${JSON.stringify(input.repoId)}`,
    `reason = ${JSON.stringify(input.reason)}`,
  ];
  if (input.reason === "missing Project.toml") {
    lines.push('primary_action = "Add Project.toml at the repository root"');
    lines.push(
      'alternate_action = "If docs-only, move this repo to link_graph.projects.* with plugins = []"',
    );
  } else {
    lines.push(
      'primary_action = "Inspect repository layout and plugin assignment before retrying"',
    );
  }
  if (input.guidance !== null) {
    lines.push(`guidance = ${JSON.stringify(input.guidance)}`);
  }
  return lines.join("\n");
}

function buildLinkGraphOnlyPreset(repoId: string): string {
  return [
    "# link-graph-only preset",
    `# Replace the placeholder root with the local checkout path for ${repoId}.`,
    `[link_graph.projects.${JSON.stringify(repoId)}]`,
    `root = ${JSON.stringify(`/absolute/path/to/${repoId}`)}`,
    'dirs = ["docs"]',
    "plugins = []",
  ].join("\n");
}

function buildWorkspaceContextLines(input: {
  repoIndexStatus: RepoIndexStatus | null;
  filter: "all" | "unsupported" | "failed";
  unsupportedReason: string | null;
  failedReason: string | null;
  selectedRepoId: string | null;
}): string[] {
  const lines = [`scope_filter = ${JSON.stringify(input.filter)}`];
  if (input.unsupportedReason !== null) {
    lines.push(`unsupported_reason = ${JSON.stringify(input.unsupportedReason)}`);
  }
  if (input.failedReason !== null) {
    lines.push(`failed_reason = ${JSON.stringify(input.failedReason)}`);
  }
  if (input.selectedRepoId !== null) {
    lines.push(`selected_repo = ${JSON.stringify(input.selectedRepoId)}`);
  }
  if (input.repoIndexStatus?.currentRepoId) {
    lines.push(`current_repo = ${JSON.stringify(input.repoIndexStatus.currentRepoId)}`);
  }
  if (typeof input.repoIndexStatus?.targetConcurrency === "number") {
    lines.push(`analysis_target_concurrency = ${input.repoIndexStatus.targetConcurrency}`);
  }
  if (typeof input.repoIndexStatus?.maxConcurrency === "number") {
    lines.push(`analysis_max_concurrency = ${input.repoIndexStatus.maxConcurrency}`);
  }
  if (typeof input.repoIndexStatus?.syncConcurrencyLimit === "number") {
    lines.push(`sync_concurrency_limit = ${input.repoIndexStatus.syncConcurrencyLimit}`);
  }
  return lines;
}

function buildLinkGraphOnlyConfigPatch(input: {
  repoIds: string[];
  repoIndexStatus: RepoIndexStatus | null;
  filter: "all" | "unsupported" | "failed";
  unsupportedReason: string | null;
  failedReason: string | null;
  selectedRepoId: string | null;
}): string {
  const sections: string[] = [
    "# Repo diagnostics config patch",
    ...buildWorkspaceContextLines(input),
  ];
  for (const repoId of input.repoIds) {
    sections.push("", buildLinkGraphOnlyPreset(repoId));
  }
  return sections.join("\n");
}

function buildSelectedRepoFailurePreset(input: {
  repoId: string;
  reason: string;
  reasonMachineKey: string;
  attempts: number | null;
  syncConcurrencyLimit: number | null;
  guidance: string;
  remediation: ReturnType<typeof failureReasonRemediation>;
}): string {
  const actionPreset = failureReasonActionPreset(input.reason, input.syncConcurrencyLimit, "repo");
  const lines = [
    "# Failed repo remediation preset",
    `repo = ${JSON.stringify(input.repoId)}`,
    `reason = ${JSON.stringify(input.reason)}`,
    `reason_key = ${JSON.stringify(input.reasonMachineKey)}`,
    `family = ${JSON.stringify(input.remediation.category)}`,
    `retryable = ${input.remediation.retryable}`,
    `guidance = ${JSON.stringify(input.guidance)}`,
    `action_key = ${JSON.stringify(actionPreset.actionKey)}`,
    `retry_scope = ${JSON.stringify(actionPreset.retryScope)}`,
  ];
  if (input.attempts !== null) {
    lines.push(`attempts = ${input.attempts}`);
  }
  if (Object.keys(actionPreset.envOverrides).length > 0) {
    lines.push(
      `env_overrides = { ${Object.entries(actionPreset.envOverrides)
        .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
        .join(", ")} }`,
    );
  }
  if (actionPreset.followUpChecks.length > 0) {
    lines.push(
      `follow_up_checks = [${actionPreset.followUpChecks.map((item) => JSON.stringify(item)).join(", ")}]`,
    );
  }
  switch (input.remediation.category) {
    case "transient_transport":
      lines.push(
        'suggested_action = "Retry the repo or failed family after checking remote sync pressure"',
      );
      if (input.syncConcurrencyLimit !== null) {
        lines.push(
          `suggested_sync_concurrency_limit = ${Math.max(1, input.syncConcurrencyLimit - 1)}`,
        );
      }
      break;
    case "auth_access":
      lines.push('suggested_action = "Verify git credentials and remote access before retrying"');
      lines.push(
        'credential_checklist = ["git credential", "repository visibility", "remote URL access"]',
      );
      break;
    case "generic":
    default:
      lines.push(
        'suggested_action = "Inspect the raw failure message and repository configuration before retrying"',
      );
      break;
  }
  return lines.join("\n");
}

function findFirstRemoteUrl(reason: string | null): string | null {
  if (reason === null) {
    return null;
  }
  const match = reason.match(/`(https?:\/\/[^`]+)`/);
  return match?.[1] ?? null;
}

function buildRetryRepoIndexCommand(input: {
  origin: string;
  repoId: string;
  envOverrides: Record<string, string>;
}): string {
  const envAssignments = Object.entries(input.envOverrides).map(
    ([key, value]) => `${key}=${JSON.stringify(value)}`,
  );
  const envPrefix = envAssignments.length > 0 ? `${envAssignments.join(" ")} ` : "";
  return [
    "# canonical_active_route = /analysis/repo-index (Arrow Flight)",
    "# manual_shell_fallback = /api/repo/index compatibility route",
    `${envPrefix}curl -sS -X POST ${JSON.stringify(`${input.origin}/api/repo/index`)} \\`,
    "  -H 'Content-Type: application/json' \\",
    `  -d '${JSON.stringify({ repo: input.repoId, refresh: true })}'`,
  ].join("\n");
}

function buildSelectedRepoRemediationCommand(input: {
  origin: string;
  repoId: string;
  reason: string;
  guidance: string;
  syncConcurrencyLimit: number | null;
}): string {
  const actionPreset = failureReasonActionPreset(input.reason, input.syncConcurrencyLimit, "repo");
  const remoteUrl = findFirstRemoteUrl(input.reason);
  const lines = [
    `# action_key = ${actionPreset.actionKey}`,
    `# retry_scope = ${actionPreset.retryScope}`,
    `# guidance = ${input.guidance}`,
  ];
  if (actionPreset.followUpChecks.length > 0) {
    lines.push(`# follow_up_checks = ${actionPreset.followUpChecks.join(", ")}`);
  }
  if (remoteUrl !== null) {
    lines.push(`# remote_url = ${remoteUrl}`);
  }

  switch (actionPreset.actionKey) {
    case "retry_with_lower_sync_concurrency":
      lines.push(
        buildRetryRepoIndexCommand({
          origin: input.origin,
          repoId: input.repoId,
          envOverrides: actionPreset.envOverrides,
        }),
      );
      break;
    case "verify_git_credentials_and_remote_access":
      lines.push(
        remoteUrl !== null
          ? `git ls-remote ${JSON.stringify(remoteUrl)}`
          : "git ls-remote <remote-url>",
      );
      lines.push("");
      lines.push("# Retry the repo index only after the access check succeeds:");
      lines.push(
        buildRetryRepoIndexCommand({
          origin: input.origin,
          repoId: input.repoId,
          envOverrides: {},
        }),
      );
      break;
    case "inspect_failure_and_repo_configuration":
    default:
      lines.push(`printf '%s\\n' ${JSON.stringify(input.reason)}`);
      lines.push("");
      lines.push(
        "# Retry the repo index after inspecting the failure message and repo configuration:",
      );
      lines.push(
        buildRetryRepoIndexCommand({
          origin: input.origin,
          repoId: input.repoId,
          envOverrides: {},
        }),
      );
      break;
  }

  return lines.join("\n");
}

function buildFailureFamilyRemediationCommand(input: {
  origin: string;
  reason: string;
  reasonMachineKey: string;
  repoIds: string[];
  sampleErrors: string[];
  guidance: string;
  syncConcurrencyLimit: number | null;
}): string {
  const actionPreset = failureReasonActionPreset(
    input.reason,
    input.syncConcurrencyLimit,
    "failure_family",
  );
  const remoteUrls = Array.from(
    new Set(
      input.sampleErrors
        .map((sample) => findFirstRemoteUrl(sample))
        .filter((value): value is string => value !== null),
    ),
  );
  const lines = [
    `# reason = ${input.reason}`,
    `# reason_key = ${input.reasonMachineKey}`,
    `# action_key = ${actionPreset.actionKey}`,
    `# retry_scope = ${actionPreset.retryScope}`,
    `# guidance = ${input.guidance}`,
    `# repos = ${input.repoIds.join(", ")}`,
  ];
  if (actionPreset.followUpChecks.length > 0) {
    lines.push(`# follow_up_checks = ${actionPreset.followUpChecks.join(", ")}`);
  }

  switch (actionPreset.actionKey) {
    case "retry_with_lower_sync_concurrency":
      for (const repoId of input.repoIds) {
        lines.push(
          buildRetryRepoIndexCommand({
            origin: input.origin,
            repoId,
            envOverrides: actionPreset.envOverrides,
          }),
        );
      }
      break;
    case "verify_git_credentials_and_remote_access":
      for (const remoteUrl of remoteUrls.length > 0 ? remoteUrls : ["<remote-url>"]) {
        lines.push(`git ls-remote ${JSON.stringify(remoteUrl)}`);
      }
      lines.push("");
      lines.push("# Retry the affected repos only after the access checks succeed:");
      for (const repoId of input.repoIds) {
        lines.push(
          buildRetryRepoIndexCommand({
            origin: input.origin,
            repoId,
            envOverrides: {},
          }),
        );
      }
      break;
    case "inspect_failure_and_repo_configuration":
    default:
      for (const sampleError of input.sampleErrors.slice(0, 3)) {
        lines.push(`printf '%s\\n' ${JSON.stringify(sampleError)}`);
      }
      lines.push("");
      lines.push("# Retry the affected repos after inspecting the failure details:");
      for (const repoId of input.repoIds) {
        lines.push(
          buildRetryRepoIndexCommand({
            origin: input.origin,
            repoId,
            envOverrides: {},
          }),
        );
      }
      break;
  }

  return lines.join("\n\n");
}

function buildCurrentFailureRemediationCommand(input: {
  origin: string;
  failedReason: string | null;
  families: Array<{
    reasonKey: string;
    machineKey: string;
    repoIds: string[];
    sampleErrors: string[];
    guidance: string;
  }>;
  syncConcurrencyLimit: number | null;
}): string {
  const lines = ["# Repo diagnostics remediation commands"];
  if (input.failedReason !== null) {
    lines.push(`# failed_reason = ${input.failedReason}`);
  }
  for (const family of input.families) {
    lines.push(
      "",
      buildFailureFamilyRemediationCommand({
        origin: input.origin,
        reason: family.reasonKey,
        reasonMachineKey: family.machineKey,
        repoIds: family.repoIds,
        sampleErrors: family.sampleErrors,
        guidance: family.guidance,
        syncConcurrencyLimit: input.syncConcurrencyLimit,
      }),
    );
  }
  return lines.join("\n");
}

function buildShellScriptDocument(input: { body: string; metadataLines?: string[] }): string {
  const metadataLines = input.metadataLines ?? [];
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    "# Repo diagnostics remediation script",
    ...metadataLines.map((line) => `# ${line}`),
    "",
    input.body,
  ].join("\n");
}

function buildScriptMetadataLines(input: {
  workspaceContextLines: string[];
  generatedAt: string;
  reasonMachineKeys?: string[];
  actionKeys?: string[];
  retryScopes?: string[];
  envOverrideSets?: Array<Record<string, string>>;
  followUpChecks?: string[];
}): string[] {
  const lines = [
    `generated_at = ${JSON.stringify(input.generatedAt)}`,
    ...input.workspaceContextLines,
  ];
  const reasonMachineKeys = Array.from(new Set(input.reasonMachineKeys ?? []));
  const actionKeys = Array.from(new Set(input.actionKeys ?? []));
  const retryScopes = Array.from(new Set(input.retryScopes ?? []));
  const mergedEnvOverrides = new Map<string, string>();
  const envOverridePairs = new Set<string>();
  for (const envOverrides of input.envOverrideSets ?? []) {
    for (const [key, value] of Object.entries(envOverrides)) {
      envOverridePairs.add(`${key}=${value}`);
      const previousValue = mergedEnvOverrides.get(key);
      if (previousValue === undefined || previousValue === value) {
        mergedEnvOverrides.set(key, value);
      }
    }
  }
  const followUpChecks = Array.from(new Set(input.followUpChecks ?? []));
  if (reasonMachineKeys.length === 1) {
    lines.push(`reason_key = ${JSON.stringify(reasonMachineKeys[0])}`);
  } else if (reasonMachineKeys.length > 1) {
    lines.push(`reason_keys = [${reasonMachineKeys.map((key) => JSON.stringify(key)).join(", ")}]`);
  }
  if (actionKeys.length === 1) {
    lines.push(`action_key = ${JSON.stringify(actionKeys[0])}`);
  } else if (actionKeys.length > 1) {
    lines.push(`action_keys = [${actionKeys.map((key) => JSON.stringify(key)).join(", ")}]`);
  }
  if (retryScopes.length === 1) {
    lines.push(`retry_scope = ${JSON.stringify(retryScopes[0])}`);
  } else if (retryScopes.length > 1) {
    lines.push(`retry_scopes = [${retryScopes.map((scope) => JSON.stringify(scope)).join(", ")}]`);
  }
  if (mergedEnvOverrides.size > 0) {
    lines.push(
      `env_overrides = { ${Array.from(mergedEnvOverrides.entries())
        .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
        .join(", ")} }`,
    );
  } else if (envOverridePairs.size > 0) {
    lines.push(
      `env_override_pairs = [${Array.from(envOverridePairs)
        .map((pair) => JSON.stringify(pair))
        .join(", ")}]`,
    );
  }
  if (followUpChecks.length > 0) {
    lines.push(
      `follow_up_checks = [${followUpChecks.map((item) => JSON.stringify(item)).join(", ")}]`,
    );
  }
  return lines;
}

function buildFailureFamilyPreset(input: {
  reason: string;
  reasonMachineKey: string;
  repoIds: string[];
  sampleErrors: string[];
  retryable: boolean;
  syncConcurrencyLimit: number | null;
  guidance: string;
  remediation: ReturnType<typeof failureReasonRemediation>;
}): string {
  const actionPreset = failureReasonActionPreset(
    input.reason,
    input.syncConcurrencyLimit,
    "failure_family",
  );
  const lines = [
    "# Failed family remediation preset",
    `reason = ${JSON.stringify(input.reason)}`,
    `reason_key = ${JSON.stringify(input.reasonMachineKey)}`,
    `family = ${JSON.stringify(input.remediation.category)}`,
    `retryable = ${input.retryable}`,
    `guidance = ${JSON.stringify(input.guidance)}`,
    `action_key = ${JSON.stringify(actionPreset.actionKey)}`,
    `retry_scope = ${JSON.stringify(actionPreset.retryScope)}`,
    `repos = [${input.repoIds.map((repoId) => JSON.stringify(repoId)).join(", ")}]`,
  ];
  if (input.sampleErrors.length > 0) {
    lines.push(
      `sample_errors = [${input.sampleErrors.map((sample) => JSON.stringify(sample)).join(", ")}]`,
    );
  }
  if (Object.keys(actionPreset.envOverrides).length > 0) {
    lines.push(
      `env_overrides = { ${Object.entries(actionPreset.envOverrides)
        .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
        .join(", ")} }`,
    );
  }
  if (actionPreset.followUpChecks.length > 0) {
    lines.push(
      `follow_up_checks = [${actionPreset.followUpChecks.map((item) => JSON.stringify(item)).join(", ")}]`,
    );
  }
  switch (input.remediation.category) {
    case "transient_transport":
      lines.push(
        'suggested_action = "Retry this failed family after checking remote sync pressure and outbound connectivity"',
      );
      if (input.syncConcurrencyLimit !== null) {
        lines.push(
          `suggested_sync_concurrency_limit = ${Math.max(1, input.syncConcurrencyLimit - 1)}`,
        );
      }
      break;
    case "auth_access":
      lines.push(
        'suggested_action = "Verify git credentials and remote access across this failed family before retrying"',
      );
      lines.push(
        'credential_checklist = ["git credential", "repository visibility", "remote URL access"]',
      );
      break;
    case "generic":
    default:
      lines.push(
        'suggested_action = "Inspect the raw failure message and repository configuration before retrying this family"',
      );
      break;
  }
  return lines.join("\n");
}

function buildFailurePlanBundle(input: {
  repoIndexStatus: RepoIndexStatus | null;
  filter: "all" | "unsupported" | "failed";
  unsupportedReason: string | null;
  failedReason: string | null;
  selectedRepoId: string | null;
  families: Array<{
    reasonKey: string;
    machineKey: string;
    repoIds: string[];
    sampleErrors: string[];
    category: "transient_transport" | "auth_access" | "generic";
    retryable: boolean;
    guidance: string;
  }>;
}): string {
  const sections: string[] = [
    "# Repo diagnostics failure plan",
    ...buildWorkspaceContextLines(input),
  ];
  for (const family of input.families) {
    sections.push(
      "",
      buildFailureFamilyPreset({
        reason: family.reasonKey,
        reasonMachineKey: family.machineKey,
        repoIds: family.repoIds,
        sampleErrors: family.sampleErrors,
        retryable: family.retryable,
        syncConcurrencyLimit: input.repoIndexStatus?.syncConcurrencyLimit ?? null,
        guidance: family.guidance,
        remediation: {
          category: family.category,
          retryable: family.retryable,
          guidance: family.guidance,
        },
      }),
    );
  }
  return sections.join("\n");
}

function buildFailureRemediationRunbook(input: {
  repoIndexStatus: RepoIndexStatus | null;
  filter: "all" | "unsupported" | "failed";
  unsupportedReason: string | null;
  failedReason: string | null;
  selectedRepoId: string | null;
  families: Array<{
    reasonKey: string;
    machineKey: string;
    repoIds: string[];
    sampleErrors: string[];
    category: "transient_transport" | "auth_access" | "generic";
    retryable: boolean;
    guidance: string;
  }>;
  remediationScript: string;
}): string {
  const affectedRepos = Array.from(new Set(input.families.flatMap((family) => family.repoIds)));
  const sections = [
    "# Repo diagnostics remediation runbook",
    "",
    "## Scope",
    ...buildWorkspaceContextLines(input),
    "",
    "## Summary",
    `failure_family_count = ${input.families.length}`,
    `affected_repo_count = ${affectedRepos.length}`,
    `affected_repos = [${affectedRepos.map((repoId) => JSON.stringify(repoId)).join(", ")}]`,
  ];

  sections.push("", "## Failure plan", "```toml", buildFailurePlanBundle(input), "```");
  sections.push("", "## Remediation script", "```bash", input.remediationScript, "```");

  return sections.join("\n");
}

function buildUnsupportedGroupPreset(
  reason: RepoIndexUnsupportedReason,
  copy: RepoDiagnosticsCopy,
): string {
  const lines = [
    "# Unsupported group remediation preset",
    `reason = ${JSON.stringify(reason.reason)}`,
    `count = ${reason.count}`,
    `repos = [${(reason.repoIds ?? []).map((repoId) => JSON.stringify(repoId)).join(", ")}]`,
    `guidance = ${JSON.stringify(unsupportedReasonGuidance(reason, copy))}`,
  ];
  if (reason.reason === "missing Project.toml") {
    lines.push('preset_kind = "link_graph_only"');
    lines.push(
      'suggested_action = "If these repositories are docs-only, move them to link_graph.projects.* with plugins = []"',
    );
    lines.push('alternate_action = "Add Project.toml at the repository root"');
    lines.push('template = "[link_graph.projects.\\"<repo>\\"]"');
    lines.push('template_dirs = ["docs"]');
    lines.push("template_plugins = []");
  } else {
    lines.push('preset_kind = "layout_review"');
    lines.push(
      'suggested_action = "Inspect repository layout and plugin assignment before retrying this unsupported group"',
    );
  }
  return lines.join("\n");
}

function buildSelectedRepoRemediationBundle(input: {
  repoId: string;
  phase: "failed" | "unsupported";
  reason: string | null;
  attempts: number | null;
  guidance: string | null;
  failurePreset: string | null;
}): string {
  const diagnosticsBrief = buildSelectedRepoDiagnosticsBrief(input);
  const sections = [
    "# Repo remediation bundle",
    "",
    "## Diagnostics brief",
    "```toml",
    diagnosticsBrief,
    "```",
  ];

  if (input.phase === "failed" && input.failurePreset !== null) {
    sections.push("", "## Failure preset", "```toml", input.failurePreset, "```");
  }

  if (input.phase === "unsupported" && input.reason !== null) {
    sections.push(
      "",
      "## Fix template",
      "```toml",
      buildSelectedRepoFixTemplate({
        repoId: input.repoId,
        reason: input.reason,
        guidance: input.guidance,
      }),
      "```",
    );
  }

  if (input.phase === "unsupported" && input.reason === "missing Project.toml") {
    sections.push(
      "",
      "## Link-graph-only preset",
      "```toml",
      buildLinkGraphOnlyPreset(input.repoId),
      "```",
    );
  }

  return sections.join("\n");
}

function buildTriageBundleFilename(input: {
  filter: "all" | "unsupported" | "failed";
  unsupportedReason: string | null;
  failedReason: string | null;
}): string {
  const basis = input.unsupportedReason ?? input.failedReason ?? input.filter;
  const sanitized = basis
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sanitized || "triage";
}

function buildFilteredTriageBundle(input: {
  copy: RepoDiagnosticsCopy;
  repoIndexStatus: RepoIndexStatus;
  diagnosticsSummary: string;
  filter: "all" | "unsupported" | "failed";
  unsupportedReason: string | null;
  failedReason: string | null;
  filteredUnsupportedReasons: RepoIndexUnsupportedReason[];
  filteredFailedIssues: RepoIndexIssue[];
  filteredFailureReasons: Array<{
    reasonKey: string;
    machineKey: string;
    count: number;
    repoIds: string[];
    sampleErrors: string[];
    category: "transient_transport" | "auth_access" | "generic";
    retryable: boolean;
    guidance: string;
  }>;
  unsupportedManifest: string;
  selectedRepoId: string | null;
}): string {
  const sections = [
    "# Repo diagnostics triage bundle",
    "",
    "## Scope",
    `filter = ${JSON.stringify(input.filter)}`,
  ];

  if (input.unsupportedReason !== null) {
    sections.push(`unsupported_reason = ${JSON.stringify(input.unsupportedReason)}`);
  }
  if (input.failedReason !== null) {
    sections.push(`failed_reason = ${JSON.stringify(input.failedReason)}`);
  }
  if (input.selectedRepoId !== null) {
    sections.push(`selected_repo = ${JSON.stringify(input.selectedRepoId)}`);
  }

  sections.push(
    "",
    "## Summary",
    `total = ${input.repoIndexStatus.total}`,
    `ready = ${input.repoIndexStatus.ready}`,
    `queued = ${input.repoIndexStatus.queued}`,
    `syncing = ${input.repoIndexStatus.syncing}`,
    `indexing = ${input.repoIndexStatus.indexing}`,
    `unsupported = ${input.repoIndexStatus.unsupported}`,
    `failed = ${input.repoIndexStatus.failed}`,
    `diagnostics_summary = ${JSON.stringify(input.diagnosticsSummary)}`,
  );

  sections.push("", "## Runtime context");
  if (input.repoIndexStatus.currentRepoId) {
    sections.push(`current_repo = ${JSON.stringify(input.repoIndexStatus.currentRepoId)}`);
  }
  if (typeof input.repoIndexStatus.targetConcurrency === "number") {
    sections.push(`analysis_target_concurrency = ${input.repoIndexStatus.targetConcurrency}`);
  }
  if (typeof input.repoIndexStatus.maxConcurrency === "number") {
    sections.push(`analysis_max_concurrency = ${input.repoIndexStatus.maxConcurrency}`);
  }
  if (typeof input.repoIndexStatus.syncConcurrencyLimit === "number") {
    sections.push(`sync_concurrency_limit = ${input.repoIndexStatus.syncConcurrencyLimit}`);
  }
  if ((input.repoIndexStatus.linkGraphOnlyProjectIds?.length ?? 0) > 0) {
    sections.push(
      `link_graph_only_project_count = ${input.repoIndexStatus.linkGraphOnlyProjectCount ?? input.repoIndexStatus.linkGraphOnlyProjectIds?.length ?? 0}`,
      `link_graph_only_projects = [${(input.repoIndexStatus.linkGraphOnlyProjectIds ?? []).map((projectId) => JSON.stringify(projectId)).join(", ")}]`,
    );
  }

  if (input.filteredUnsupportedReasons.length > 0) {
    sections.push("", "## Unsupported groups", "```toml", input.unsupportedManifest, "```");
    sections.push("", "## Unsupported presets");
    for (const reason of input.filteredUnsupportedReasons) {
      sections.push("```toml", buildUnsupportedGroupPreset(reason, input.copy), "```");
    }
  }

  if (input.filteredFailureReasons.length > 0) {
    sections.push("", "## Failure groups");
    for (const reason of input.filteredFailureReasons) {
      sections.push(
        "```toml",
        `reason = ${JSON.stringify(reason.reasonKey)}`,
        `reason_key = ${JSON.stringify(reason.machineKey)}`,
        `count = ${reason.count}`,
        `repos = [${reason.repoIds.map((repoId) => JSON.stringify(repoId)).join(", ")}]`,
        `retryable = ${reason.retryable}`,
        `guidance = ${JSON.stringify(reason.guidance)}`,
        ...(reason.sampleErrors.length > 0
          ? [
              `sample_errors = [${reason.sampleErrors.map((sample) => JSON.stringify(sample)).join(", ")}]`,
            ]
          : []),
        "```",
      );
    }

    sections.push("", "## Failure presets");
    for (const reason of input.filteredFailureReasons) {
      sections.push(
        "```toml",
        buildFailureFamilyPreset({
          reason: reason.reasonKey,
          reasonMachineKey: reason.machineKey,
          repoIds: reason.repoIds,
          sampleErrors: reason.sampleErrors,
          retryable: reason.retryable,
          syncConcurrencyLimit: input.repoIndexStatus.syncConcurrencyLimit ?? null,
          guidance: reason.guidance,
          remediation: {
            category: reason.category,
            retryable: reason.retryable,
            guidance: reason.guidance,
          },
        }),
        "```",
      );
    }
  }

  if (input.filteredFailedIssues.length > 0) {
    sections.push("", "## Failed repos");
    for (const issue of input.filteredFailedIssues) {
      sections.push(
        "```toml",
        `repo = ${JSON.stringify(issue.repoId)}`,
        'phase = "failed"',
        `reason = ${JSON.stringify(issue.lastError ?? "")}`,
        issue.attemptCount ? `attempts = ${issue.attemptCount}` : "",
        "```",
      );
    }
  }

  if (input.filteredUnsupportedReasons.length === 0 && input.filteredFailedIssues.length === 0) {
    sections.push(
      "",
      "## Diagnostics",
      "No filtered unsupported or failed repos in the current slice.",
    );
  }

  return sections.filter((line) => line.length > 0).join("\n");
}

function buildCurrentOperatorSummary(input: {
  copy: RepoDiagnosticsCopy;
  repoIndexStatus: RepoIndexStatus;
  failureFamilies: Array<{
    count: number;
    reasonKey: string;
    category: "transient_transport" | "auth_access" | "generic";
    retryable: boolean;
    guidance: string;
  }>;
  filteredUnsupportedReasons: RepoIndexUnsupportedReason[];
}): {
  failureFamilyCount: number;
  retryableFailureFamilyCount: number;
  manualFailureFamilyCount: number;
  unsupportedGroupCount: number;
  actionKeys: string[];
  actionTargets: Array<{
    actionKey: string;
    reasonKey: string;
    count: number;
  }>;
  followUpChecks: string[];
  suggestedSyncConcurrencyLimit: number | null;
  nextSteps: string[];
} {
  const actionTargets = input.failureFamilies
    .map((family) => {
      const preset = failureReasonActionPreset(
        family.reasonKey,
        input.repoIndexStatus.syncConcurrencyLimit ?? null,
        "failure_family",
      );
      return {
        actionKey: preset.actionKey,
        reasonKey: family.reasonKey,
        count: family.count,
        preset,
      };
    })
    .toSorted(
      (left, right) =>
        left.actionKey.localeCompare(right.actionKey) ||
        left.reasonKey.localeCompare(right.reasonKey),
    );
  const actionPresets = actionTargets.map((target) => target.preset);
  const actionKeys = Array.from(new Set(actionPresets.map((preset) => preset.actionKey))).toSorted();
  const followUpChecks = Array.from(
    new Set(actionPresets.flatMap((preset) => preset.followUpChecks)),
  ).toSorted();
  const nextSteps = Array.from(
    new Set([
      ...input.failureFamilies.map((family) => family.guidance),
      ...input.filteredUnsupportedReasons.map((reason) =>
        unsupportedReasonGuidance(reason, input.copy),
      ),
    ]),
  );
  const suggestedSyncConcurrencyLimit =
    input.failureFamilies.some((family) => family.category === "transient_transport") &&
    typeof input.repoIndexStatus.syncConcurrencyLimit === "number"
      ? Math.max(1, input.repoIndexStatus.syncConcurrencyLimit - 1)
      : null;

  return {
    failureFamilyCount: input.failureFamilies.length,
    retryableFailureFamilyCount: input.failureFamilies.filter((family) => family.retryable).length,
    manualFailureFamilyCount: input.failureFamilies.filter((family) => !family.retryable).length,
    unsupportedGroupCount: input.filteredUnsupportedReasons.length,
    actionKeys,
    actionTargets: actionTargets.map(({ actionKey, reasonKey, count }) => ({
      actionKey,
      reasonKey,
      count,
    })),
    followUpChecks,
    suggestedSyncConcurrencyLimit,
    nextSteps,
  };
}

function buildCurrentDiagnosticsPack(input: {
  copy: RepoDiagnosticsCopy;
  repoIndexStatus: RepoIndexStatus;
  filter: "all" | "unsupported" | "failed";
  unsupportedReason: string | null;
  failedReason: string | null;
  selectedRepoId: string | null;
  failureFamilies: Array<{
    reasonKey: string;
    category: "transient_transport" | "auth_access" | "generic";
    retryable: boolean;
    guidance: string;
  }>;
  filteredUnsupportedReasons: RepoIndexUnsupportedReason[];
  triageBundle: string;
  failureRunbook: string | null;
  configPatch: string | null;
}): string {
  const operatorSummary = buildCurrentOperatorSummary({
    copy: input.copy,
    repoIndexStatus: input.repoIndexStatus,
    failureFamilies: input.failureFamilies,
    filteredUnsupportedReasons: input.filteredUnsupportedReasons,
  });
  const sections = [
    "# Repo diagnostics pack",
    "",
    "## Scope",
    ...buildWorkspaceContextLines(input),
    "",
    "## Operator summary",
    `failure_family_count = ${operatorSummary.failureFamilyCount}`,
    `retryable_failure_family_count = ${operatorSummary.retryableFailureFamilyCount}`,
    `manual_failure_family_count = ${operatorSummary.manualFailureFamilyCount}`,
    `unsupported_group_count = ${operatorSummary.unsupportedGroupCount}`,
    ...(operatorSummary.actionKeys.length > 0
      ? [
          `action_keys = [${operatorSummary.actionKeys.map((item) => JSON.stringify(item)).join(", ")}]`,
        ]
      : []),
    ...(operatorSummary.followUpChecks.length > 0
      ? [
          `follow_up_checks = [${operatorSummary.followUpChecks.map((item) => JSON.stringify(item)).join(", ")}]`,
        ]
      : []),
    ...(operatorSummary.suggestedSyncConcurrencyLimit !== null
      ? [`suggested_sync_concurrency_limit = ${operatorSummary.suggestedSyncConcurrencyLimit}`]
      : []),
    ...(operatorSummary.nextSteps.length > 0
      ? [
          `next_steps = [${operatorSummary.nextSteps.map((item) => JSON.stringify(item)).join(", ")}]`,
        ]
      : []),
    "",
    "## Included artifacts",
    "triage_bundle = true",
    `failure_remediation_runbook = ${input.failureRunbook !== null}`,
    `config_patch = ${input.configPatch !== null}`,
    "",
    "## Triage bundle",
    "````markdown",
    input.triageBundle,
    "````",
  ];

  if (input.failureRunbook !== null) {
    sections.push(
      "",
      "## Failure remediation runbook",
      "````markdown",
      input.failureRunbook,
      "````",
    );
  }

  if (input.configPatch !== null) {
    sections.push("", "## Config patch", "```toml", input.configPatch, "```");
  }

  return sections.join("\n");
}

export function RepoDiagnosticsPage({
  locale = "en",
  repoIndexStatus,
  onClose,
  onStatusChange,
}: RepoDiagnosticsPageProps): JSX.Element {
  const copy = REPO_DIAGNOSTICS_COPY[locale];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [hasCopiedSelectedRepoDiagnostics, setHasCopiedSelectedRepoDiagnostics] = useState(false);
  const [hasCopiedSelectedRepoFailurePreset, setHasCopiedSelectedRepoFailurePreset] =
    useState(false);
  const [hasCopiedSelectedRepoRemediationCommand, setHasCopiedSelectedRepoRemediationCommand] =
    useState(false);
  const [hasCopiedCurrentRemediationCommand, setHasCopiedCurrentRemediationCommand] =
    useState(false);
  const [hasCopiedSelectedRepoFixTemplate, setHasCopiedSelectedRepoFixTemplate] = useState(false);
  const [hasCopiedSelectedRepoLinkGraphOnlyPreset, setHasCopiedSelectedRepoLinkGraphOnlyPreset] =
    useState(false);
  const [showFocusedFailedExports, setShowFocusedFailedExports] = useState(false);
  const [showFocusedUnsupportedExports, setShowFocusedUnsupportedExports] = useState(false);
  const diagnosticsSummary = buildDiagnosticsSummary(copy, repoIndexStatus);
  const metrics: RepoDiagnosticsMetric[] = useMemo(() => {
    if (!repoIndexStatus) {
      return [];
    }
    return [
      {
        label: locale === "zh" ? "Ready" : "Ready",
        value: repoIndexStatus.ready,
        tone: "active",
      },
      {
        label: locale === "zh" ? "Queued" : "Queued",
        value: repoIndexStatus.queued,
        tone: repoIndexStatus.queued > 0 ? "warning" : "default",
      },
      {
        label: locale === "zh" ? "Syncing" : "Syncing",
        value: repoIndexStatus.syncing,
        tone: repoIndexStatus.syncing > 0 ? "warning" : "default",
      },
      {
        label: locale === "zh" ? "Indexing" : "Indexing",
        value: repoIndexStatus.indexing,
        tone: repoIndexStatus.indexing > 0 ? "warning" : "default",
      },
      {
        label: copy.unsupported,
        value: repoIndexStatus.unsupported,
        tone: repoIndexStatus.unsupported > 0 ? "warning" : "default",
      },
      {
        label: copy.failed,
        value: repoIndexStatus.failed,
        tone: repoIndexStatus.failed > 0 ? "error" : "default",
      },
    ];
  }, [copy.failed, copy.unsupported, locale, repoIndexStatus]);

  const refreshRepoIndexStatus = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      const status = await api.getRepoIndexStatus();
      onStatusChange(
        toRepoIndexStatusSnapshot(status, {
          linkGraphOnlyProjectIds: repoIndexStatus?.linkGraphOnlyProjectIds ?? [],
        }),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [onStatusChange, repoIndexStatus?.linkGraphOnlyProjectIds]);

  const repoDiagnostics = useRepoDiagnostics({
    locale,
    repoIndexStatus,
    refreshRepoIndexStatus,
  });
  const {
    repoDiagnosticsFilter,
    selectedUnsupportedReason,
    selectedFailedReason,
    setRepoDiagnosticsFilterState,
    setSelectedUnsupportedReasonState,
    setSelectedFailedReasonState,
  } = repoDiagnostics;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const applyHashState = () => {
      const hashState = parseRepoDiagnosticsHash(window.location.hash);
      if (!hashState.isRepoDiagnosticsPage) {
        return;
      }

      setRepoDiagnosticsFilterState(hashState.filter);
      setSelectedUnsupportedReasonState(hashState.unsupportedReason);
      setSelectedFailedReasonState(hashState.failedReason);
      setSelectedRepoId(hashState.selectedRepoId);
    };

    applyHashState();
    window.addEventListener("hashchange", applyHashState);
    return () => {
      window.removeEventListener("hashchange", applyHashState);
    };
  }, [
    setRepoDiagnosticsFilterState,
    setSelectedFailedReasonState,
    setSelectedUnsupportedReasonState,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextHash = buildRepoDiagnosticsHash({
      filter: repoDiagnosticsFilter,
      unsupportedReason: selectedUnsupportedReason,
      failedReason: selectedFailedReason,
      selectedRepoId,
    });
    if (window.location.hash === nextHash) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.hash = nextHash;
    window.history.replaceState(window.history.state, "", nextUrl.toString());
  }, [
    repoDiagnosticsFilter,
    selectedFailedReason,
    selectedUnsupportedReason,
    selectedRepoId,
  ]);

  useEffect(() => {
    if (selectedRepoId === null || repoIndexStatus === null) {
      return;
    }

    const repoStillVisible =
      (repoIndexStatus.issues ?? []).some((issue) => issue.repoId === selectedRepoId) ||
      (repoIndexStatus.unsupportedReasons ?? []).some((reason) =>
        (reason.repoIds ?? []).includes(selectedRepoId),
      );
    if (!repoStillVisible) {
      setSelectedRepoId(null);
    }
  }, [repoIndexStatus, selectedRepoId]);

  const processed = repoIndexStatus
    ? repoIndexStatus.ready + repoIndexStatus.unsupported + repoIndexStatus.failed
    : 0;
  const currentRepoLine = repoIndexStatus?.currentRepoId
    ? locale === "zh"
      ? `当前仓库：${repoIndexStatus.currentRepoId}`
      : `Current repo: ${repoIndexStatus.currentRepoId}`
    : null;
  const concurrencyLine =
    repoIndexStatus &&
    typeof repoIndexStatus.targetConcurrency === "number" &&
    typeof repoIndexStatus.maxConcurrency === "number" &&
    typeof repoIndexStatus.syncConcurrencyLimit === "number"
      ? locale === "zh"
        ? `分析并发 ${repoIndexStatus.targetConcurrency}/${repoIndexStatus.maxConcurrency} · 同步上限 ${repoIndexStatus.syncConcurrencyLimit}`
        : `Analysis budget ${repoIndexStatus.targetConcurrency}/${repoIndexStatus.maxConcurrency} · Sync limit ${repoIndexStatus.syncConcurrencyLimit}`
      : null;
  const exclusionLine =
    repoIndexStatus?.linkGraphOnlyProjectCount &&
    (repoIndexStatus.linkGraphOnlyProjectIds?.length ?? 0) > 0
      ? locale === "zh"
        ? `未计入仓库索引（${repoIndexStatus.linkGraphOnlyProjectCount} 个仅 link-graph 项目，plugins=[]）：${repoIndexStatus.linkGraphOnlyProjectIds?.join(", ")}`
        : `Excluded from repo index (${repoIndexStatus.linkGraphOnlyProjectCount} link-graph-only projects, plugins=[]): ${repoIndexStatus.linkGraphOnlyProjectIds?.join(", ")}`
      : null;
  const selectedFailedIssue =
    selectedRepoId === null
      ? null
      : ((repoIndexStatus?.issues ?? []).find(
          (issue) => issue.repoId === selectedRepoId && issue.phase === "failed",
        ) ?? null);
  const selectedUnsupportedRepoReason =
    selectedRepoId === null
      ? null
      : ((repoIndexStatus?.unsupportedReasons ?? []).find((reason) =>
          (reason.repoIds ?? []).includes(selectedRepoId),
        ) ?? null);
  const selectedRepoPhase = selectedFailedIssue
    ? copy.failed
    : selectedUnsupportedRepoReason
      ? copy.unsupported
      : null;
  const selectedRepoReason =
    selectedFailedIssue?.lastError ?? selectedUnsupportedRepoReason?.reason ?? null;
  const selectedRepoPhaseKey = selectedFailedIssue
    ? "failed"
    : selectedUnsupportedRepoReason
      ? "unsupported"
      : null;
  const selectedRepoGuidance = selectedUnsupportedRepoReason
    ? unsupportedReasonGuidance(selectedUnsupportedRepoReason, copy)
    : selectedFailedIssue
      ? failureReasonRemediation(selectedFailedIssue.lastError ?? "", copy).guidance
      : null;
  const selectedFailureReasonMachineKey = selectedFailedIssue
    ? failedReasonMachineKey(selectedFailedIssue)
    : null;
  const selectedFailureRemediation = selectedFailedIssue
    ? failureReasonRemediation(selectedFailedIssue.lastError ?? "", copy)
    : null;
  const isRetryingSelectedRepo =
    selectedRepoId !== null && repoDiagnostics.retryingRepoIds.includes(selectedRepoId);
  const currentConfigPatchRepoIds = Array.from(
    new Set(
      repoDiagnostics.filteredUnsupportedReasons
        .filter((reason) => reason.reason === "missing Project.toml")
        .flatMap((reason) => reason.repoIds ?? []),
    ),
  );
  const canDownloadCurrentConfigPatch = currentConfigPatchRepoIds.length > 0;
  const currentFailureFamilies = collectFailureReasons(
    repoDiagnostics.fullFilteredFailedIssues,
    locale,
  ).map((reason) => {
    const remediation = failureReasonRemediation(reason.reasonKey, copy);
    return {
      count: reason.count,
      reasonKey: reason.reasonKey,
      machineKey: reason.machineKey,
      repoIds: reason.repoIds,
      sampleErrors: reason.sampleErrors,
      category: remediation.category,
      retryable: remediation.retryable,
      guidance: remediation.guidance,
    };
  });
  const canDownloadCurrentFailurePlan = currentFailureFamilies.length > 0;
  const currentOperatorSummary =
    repoIndexStatus === null
      ? null
      : buildCurrentOperatorSummary({
          copy,
          repoIndexStatus,
          failureFamilies: currentFailureFamilies,
          filteredUnsupportedReasons: repoDiagnostics.filteredUnsupportedReasons,
        });
  const hasCurrentOperatorSummary =
    currentOperatorSummary !== null &&
    (currentOperatorSummary.failureFamilyCount > 0 ||
      currentOperatorSummary.unsupportedGroupCount > 0);
  const isFocusedFailedSlice =
    repoDiagnostics.repoDiagnosticsFilter === "failed" && canDownloadCurrentFailurePlan;
  const isFocusedUnsupportedSlice =
    repoDiagnostics.repoDiagnosticsFilter === "unsupported" &&
    repoDiagnostics.filteredUnsupportedReasons.length > 0;
  const hasFocusedSliceActions = isFocusedFailedSlice || isFocusedUnsupportedSlice;
  const showHeaderCurrentTriageBundle = !isFocusedUnsupportedSlice;
  const showHeaderCurrentFailureActions = canDownloadCurrentFailurePlan && !isFocusedFailedSlice;
  const showHeaderCurrentConfigPatch = canDownloadCurrentConfigPatch && !isFocusedUnsupportedSlice;
  const focusedSliceTitle = isFocusedFailedSlice
    ? repoDiagnostics.selectedFailedReason !== null
      ? locale === "zh"
        ? `聚焦失败族：${repoDiagnostics.selectedFailedReason}`
        : `Focused failed family: ${repoDiagnostics.selectedFailedReason}`
      : locale === "zh"
        ? "聚焦失败分片"
        : "Focused failed slice"
    : repoDiagnostics.selectedUnsupportedReason !== null
      ? locale === "zh"
        ? `聚焦不支持原因：${repoDiagnostics.selectedUnsupportedReason}`
        : `Focused unsupported reason: ${repoDiagnostics.selectedUnsupportedReason}`
      : locale === "zh"
        ? "聚焦不支持分片"
        : "Focused unsupported slice";

  useEffect(() => {
    setHasCopiedSelectedRepoDiagnostics(false);
    setHasCopiedSelectedRepoFailurePreset(false);
    setHasCopiedSelectedRepoRemediationCommand(false);
    setHasCopiedCurrentRemediationCommand(false);
    setHasCopiedSelectedRepoFixTemplate(false);
    setHasCopiedSelectedRepoLinkGraphOnlyPreset(false);
    setShowFocusedFailedExports(false);
    setShowFocusedUnsupportedExports(false);
  }, [
    repoDiagnostics.repoDiagnosticsFilter,
    repoDiagnostics.selectedFailedReason,
    repoDiagnostics.selectedUnsupportedReason,
    selectedRepoGuidance,
    selectedRepoId,
    selectedRepoPhaseKey,
    selectedRepoReason,
  ]);

  const focusFailureActionTarget = useCallback((reasonKey: string): void => {
    repoDiagnostics.setRepoDiagnosticsFilterState("failed");
    repoDiagnostics.setSelectedUnsupportedReasonState(null);
    repoDiagnostics.setSelectedFailedReasonState(reasonKey);
    setSelectedRepoId(null);
  }, [repoDiagnostics]);

  const focusUnsupportedSlice = useCallback((): void => {
    repoDiagnostics.setRepoDiagnosticsFilterState("unsupported");
    repoDiagnostics.setSelectedFailedReasonState(null);
    repoDiagnostics.setSelectedUnsupportedReasonState(null);
    setSelectedRepoId(null);
  }, [repoDiagnostics]);

  const clearFocusedSlice = useCallback((): void => {
    repoDiagnostics.setRepoDiagnosticsFilterState("all");
    repoDiagnostics.setSelectedFailedReasonState(null);
    repoDiagnostics.setSelectedUnsupportedReasonState(null);
    setSelectedRepoId(null);
  }, [repoDiagnostics]);

  const copySelectedRepoDiagnostics = useCallback(async (): Promise<void> => {
    if (selectedRepoId === null || selectedRepoPhaseKey === null) {
      return;
    }
    const brief = buildSelectedRepoDiagnosticsBrief({
      repoId: selectedRepoId,
      phase: selectedRepoPhaseKey,
      reason: selectedRepoReason,
      attempts: selectedFailedIssue?.attemptCount ?? null,
      guidance: selectedRepoGuidance,
    });
    try {
      await navigator.clipboard.writeText(brief);
      setHasCopiedSelectedRepoDiagnostics(true);
    } catch (copyError) {
      console.warn(`Failed to copy repo diagnostics for ${selectedRepoId}`, copyError);
      setHasCopiedSelectedRepoDiagnostics(false);
    }
  }, [
    selectedRepoId,
    selectedRepoPhaseKey,
    selectedRepoReason,
    selectedFailedIssue?.attemptCount,
    selectedRepoGuidance,
  ]);

  const downloadSelectedRepoRemediationBundle = useCallback((): void => {
    if (selectedRepoId === null || selectedRepoPhaseKey === null || typeof window === "undefined") {
      return;
    }

    const failurePreset =
      selectedFailedIssue &&
      selectedRepoReason &&
      selectedRepoGuidance &&
      selectedFailureRemediation
        ? buildSelectedRepoFailurePreset({
            repoId: selectedRepoId,
            reason: selectedRepoReason,
            reasonMachineKey: selectedFailureReasonMachineKey,
            attempts: selectedFailedIssue.attemptCount ?? null,
            syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
            guidance: selectedRepoGuidance,
            remediation: selectedFailureRemediation,
          })
        : null;
    const bundle = buildSelectedRepoRemediationBundle({
      repoId: selectedRepoId,
      phase: selectedRepoPhaseKey,
      reason: selectedRepoReason,
      attempts: selectedFailedIssue?.attemptCount ?? null,
      guidance: selectedRepoGuidance,
      failurePreset,
    });
    const blob = new Blob([bundle], { type: "text/markdown;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-remediation-${buildSelectedRepoDiagnosticsFilename(selectedRepoId)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [
    selectedRepoId,
    selectedRepoPhaseKey,
    selectedRepoReason,
    selectedFailedIssue,
    selectedRepoGuidance,
    selectedFailureRemediation,
    selectedFailureReasonMachineKey,
    repoIndexStatus,
  ]);

  const copySelectedRepoFailurePreset = useCallback(async (): Promise<void> => {
    if (
      selectedRepoId === null ||
      selectedRepoReason === null ||
      selectedRepoGuidance === null ||
      selectedFailureRemediation === null
    ) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildSelectedRepoFailurePreset({
          repoId: selectedRepoId,
          reason: selectedRepoReason,
          reasonMachineKey: selectedFailureReasonMachineKey,
          attempts: selectedFailedIssue?.attemptCount ?? null,
          syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
          guidance: selectedRepoGuidance,
          remediation: selectedFailureRemediation,
        }),
      );
      setHasCopiedSelectedRepoFailurePreset(true);
    } catch (copyError) {
      console.warn(`Failed to copy failure preset for ${selectedRepoId}`, copyError);
      setHasCopiedSelectedRepoFailurePreset(false);
    }
  }, [
    repoIndexStatus?.syncConcurrencyLimit,
    selectedRepoGuidance,
    selectedRepoId,
    selectedRepoReason,
    selectedFailedIssue,
    selectedFailureReasonMachineKey,
    selectedFailureRemediation,
  ]);

  const copySelectedRepoRemediationCommand = useCallback(async (): Promise<void> => {
    if (
      selectedRepoId === null ||
      selectedRepoReason === null ||
      selectedRepoGuidance === null ||
      typeof window === "undefined"
    ) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildSelectedRepoRemediationCommand({
          origin: window.location.origin,
          repoId: selectedRepoId,
          reason: selectedRepoReason,
          guidance: selectedRepoGuidance,
          syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
        }),
      );
      setHasCopiedSelectedRepoRemediationCommand(true);
    } catch (copyError) {
      console.warn(`Failed to copy remediation command for ${selectedRepoId}`, copyError);
      setHasCopiedSelectedRepoRemediationCommand(false);
    }
  }, [repoIndexStatus?.syncConcurrencyLimit, selectedRepoGuidance, selectedRepoId, selectedRepoReason]);

  const copyCurrentFailureRemediationCommand = useCallback(async (): Promise<void> => {
    if (currentFailureFamilies.length === 0 || typeof window === "undefined") {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildCurrentFailureRemediationCommand({
          origin: window.location.origin,
          failedReason: repoDiagnostics.selectedFailedReason,
          families: currentFailureFamilies.map((family) => ({
            reasonKey: family.reasonKey,
            machineKey: family.machineKey,
            repoIds: family.repoIds,
            sampleErrors: family.sampleErrors,
            guidance: family.guidance,
          })),
          syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
        }),
      );
      setHasCopiedCurrentRemediationCommand(true);
    } catch (copyError) {
      console.warn("Failed to copy current remediation command", copyError);
      setHasCopiedCurrentRemediationCommand(false);
    }
  }, [currentFailureFamilies, repoDiagnostics, repoIndexStatus?.syncConcurrencyLimit]);

  const copySelectedRepoFixTemplate = useCallback(async (): Promise<void> => {
    if (selectedRepoId === null || selectedUnsupportedRepoReason === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildSelectedRepoFixTemplate({
          repoId: selectedRepoId,
          reason: selectedUnsupportedRepoReason.reason,
          guidance: selectedRepoGuidance,
        }),
      );
      setHasCopiedSelectedRepoFixTemplate(true);
    } catch (copyError) {
      console.warn(`Failed to copy fix template for ${selectedRepoId}`, copyError);
      setHasCopiedSelectedRepoFixTemplate(false);
    }
  }, [selectedRepoGuidance, selectedRepoId, selectedUnsupportedRepoReason]);

  const copySelectedRepoLinkGraphOnlyPreset = useCallback(async (): Promise<void> => {
    if (
      selectedRepoId === null ||
      selectedUnsupportedRepoReason?.reason !== "missing Project.toml"
    ) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildLinkGraphOnlyPreset(selectedRepoId));
      setHasCopiedSelectedRepoLinkGraphOnlyPreset(true);
    } catch (copyError) {
      console.warn(`Failed to copy link-graph-only preset for ${selectedRepoId}`, copyError);
      setHasCopiedSelectedRepoLinkGraphOnlyPreset(false);
    }
  }, [selectedRepoId, selectedUnsupportedRepoReason?.reason]);

  const downloadCurrentTriageBundle = useCallback((): void => {
    if (repoIndexStatus === null || typeof window === "undefined") {
      return;
    }

    const filteredFailureReasons = collectFailureReasons(
      repoDiagnostics.fullFilteredFailedIssues,
      locale,
    ).map((reason) => {
      const remediation = failureReasonRemediation(reason.reasonKey, copy);
      return {
        reasonKey: reason.reasonKey,
        machineKey: reason.machineKey,
        count: reason.count,
        repoIds: reason.repoIds,
        sampleErrors: reason.sampleErrors,
        category: remediation.category,
        retryable: remediation.retryable,
        guidance: remediation.guidance,
      };
    });

    const bundle = buildFilteredTriageBundle({
      copy,
      repoIndexStatus,
      diagnosticsSummary,
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
      filteredUnsupportedReasons: repoDiagnostics.filteredUnsupportedReasons,
      filteredFailedIssues: repoDiagnostics.fullFilteredFailedIssues,
      filteredFailureReasons,
      unsupportedManifest: repoDiagnostics.unsupportedManifest,
      selectedRepoId,
    });
    const blob = new Blob([bundle], { type: "text/markdown;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-diagnostics-${buildTriageBundleFilename({
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
    })}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [
    copy,
    diagnosticsSummary,
    locale,
    repoDiagnostics,
    repoIndexStatus,
    selectedRepoId,
  ]);

  const downloadCurrentDiagnosticsPack = useCallback((): void => {
    if (repoIndexStatus === null || typeof window === "undefined") {
      return;
    }

    const filteredFailureReasons = collectFailureReasons(
      repoDiagnostics.fullFilteredFailedIssues,
      locale,
    ).map((reason) => {
      const remediation = failureReasonRemediation(reason.reasonKey, copy);
      return {
        reasonKey: reason.reasonKey,
        machineKey: reason.machineKey,
        count: reason.count,
        repoIds: reason.repoIds,
        sampleErrors: reason.sampleErrors,
        category: remediation.category,
        retryable: remediation.retryable,
        guidance: remediation.guidance,
      };
    });

    const triageBundle = buildFilteredTriageBundle({
      copy,
      repoIndexStatus,
      diagnosticsSummary,
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
      filteredUnsupportedReasons: repoDiagnostics.filteredUnsupportedReasons,
      filteredFailedIssues: repoDiagnostics.fullFilteredFailedIssues,
      filteredFailureReasons,
      unsupportedManifest: repoDiagnostics.unsupportedManifest,
      selectedRepoId,
    });

    let failureRunbook: string | null = null;
    if (canDownloadCurrentFailurePlan) {
      const generatedAt = new Date().toISOString();
      const actionPresets = currentFailureFamilies.map((family) =>
        failureReasonActionPreset(
          family.reasonKey,
          repoIndexStatus.syncConcurrencyLimit ?? null,
          "failure_family",
        ),
      );
      const remediationScript = buildShellScriptDocument({
        body: buildCurrentFailureRemediationCommand({
          origin: window.location.origin,
          failedReason: repoDiagnostics.selectedFailedReason,
          families: currentFailureFamilies.map((family) => ({
            reasonKey: family.reasonKey,
            machineKey: family.machineKey,
            repoIds: family.repoIds,
            sampleErrors: family.sampleErrors,
            guidance: family.guidance,
          })),
          syncConcurrencyLimit: repoIndexStatus.syncConcurrencyLimit ?? null,
        }),
        metadataLines: buildScriptMetadataLines({
          workspaceContextLines: buildWorkspaceContextLines({
            repoIndexStatus,
            filter: repoDiagnostics.repoDiagnosticsFilter,
            unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
            failedReason: repoDiagnostics.selectedFailedReason,
            selectedRepoId: null,
          }),
          generatedAt,
          reasonMachineKeys: currentFailureFamilies.map((family) => family.machineKey),
          actionKeys: actionPresets.map((preset) => preset.actionKey),
          retryScopes: actionPresets.map((preset) => preset.retryScope),
          envOverrideSets: actionPresets.map((preset) => preset.envOverrides),
          followUpChecks: actionPresets.flatMap((preset) => preset.followUpChecks),
        }),
      });
      failureRunbook = buildFailureRemediationRunbook({
        repoIndexStatus,
        filter: repoDiagnostics.repoDiagnosticsFilter,
        unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
        failedReason: repoDiagnostics.selectedFailedReason,
        selectedRepoId: null,
        families: currentFailureFamilies,
        remediationScript,
      });
    }

    const configPatch = canDownloadCurrentConfigPatch
      ? buildLinkGraphOnlyConfigPatch({
          repoIds: currentConfigPatchRepoIds,
          repoIndexStatus,
          filter: repoDiagnostics.repoDiagnosticsFilter,
          unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
          failedReason: repoDiagnostics.selectedFailedReason,
          selectedRepoId: null,
        })
      : null;

    const diagnosticsPack = buildCurrentDiagnosticsPack({
      copy,
      repoIndexStatus,
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
      selectedRepoId,
      failureFamilies: currentFailureFamilies,
      filteredUnsupportedReasons: repoDiagnostics.filteredUnsupportedReasons,
      triageBundle,
      failureRunbook,
      configPatch,
    });
    const blob = new Blob([diagnosticsPack], { type: "text/markdown;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-diagnostics-pack-${buildTriageBundleFilename({
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
    })}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [
    copy,
    diagnosticsSummary,
    locale,
    repoDiagnostics,
    repoIndexStatus,
    selectedRepoId,
    canDownloadCurrentConfigPatch,
    canDownloadCurrentFailurePlan,
    currentConfigPatchRepoIds,
    currentFailureFamilies,
  ]);

  const downloadCurrentConfigPatch = useCallback((): void => {
    if (!canDownloadCurrentConfigPatch || typeof window === "undefined") {
      return;
    }
    const patch = buildLinkGraphOnlyConfigPatch({
      repoIds: currentConfigPatchRepoIds,
      repoIndexStatus,
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
      selectedRepoId: null,
    });
    const blob = new Blob([patch], { type: "text/plain;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-diagnostics-config-patch-${buildTriageBundleFilename({
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
    })}.toml`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [canDownloadCurrentConfigPatch, currentConfigPatchRepoIds, repoDiagnostics, repoIndexStatus]);

  const downloadCurrentFailurePlan = useCallback((): void => {
    if (!canDownloadCurrentFailurePlan || typeof window === "undefined") {
      return;
    }
    const plan = buildFailurePlanBundle({
      repoIndexStatus,
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
      selectedRepoId: null,
      families: currentFailureFamilies,
    });
    const blob = new Blob([plan], { type: "text/plain;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-diagnostics-failure-plan-${buildTriageBundleFilename({
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
    })}.toml`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [canDownloadCurrentFailurePlan, currentFailureFamilies, repoDiagnostics, repoIndexStatus]);

  const downloadCurrentFailureRemediationCommand = useCallback((): void => {
    if (!canDownloadCurrentFailurePlan || typeof window === "undefined") {
      return;
    }
    const generatedAt = new Date().toISOString();
    const actionPresets = currentFailureFamilies.map((family) =>
      failureReasonActionPreset(
        family.reasonKey,
        repoIndexStatus?.syncConcurrencyLimit ?? null,
        "failure_family",
      ),
    );
    const command = buildShellScriptDocument({
      body: buildCurrentFailureRemediationCommand({
        origin: window.location.origin,
        failedReason: repoDiagnostics.selectedFailedReason,
        families: currentFailureFamilies.map((family) => ({
          reasonKey: family.reasonKey,
          machineKey: family.machineKey,
          repoIds: family.repoIds,
          sampleErrors: family.sampleErrors,
          guidance: family.guidance,
        })),
        syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
      }),
      metadataLines: buildScriptMetadataLines({
        workspaceContextLines: buildWorkspaceContextLines({
          repoIndexStatus,
          filter: repoDiagnostics.repoDiagnosticsFilter,
          unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
          failedReason: repoDiagnostics.selectedFailedReason,
          selectedRepoId: null,
        }),
        generatedAt,
        reasonMachineKeys: currentFailureFamilies.map((family) => family.machineKey),
        actionKeys: actionPresets.map((preset) => preset.actionKey),
        retryScopes: actionPresets.map((preset) => preset.retryScope),
        envOverrideSets: actionPresets.map((preset) => preset.envOverrides),
        followUpChecks: actionPresets.flatMap((preset) => preset.followUpChecks),
      }),
    });
    const blob = new Blob([command], { type: "text/x-shellscript;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-diagnostics-remediation-${buildTriageBundleFilename({
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
    })}.sh`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [canDownloadCurrentFailurePlan, currentFailureFamilies, repoDiagnostics, repoIndexStatus]);

  const downloadCurrentFailureRemediationRunbook = useCallback((): void => {
    if (!canDownloadCurrentFailurePlan || typeof window === "undefined") {
      return;
    }
    const generatedAt = new Date().toISOString();
    const actionPresets = currentFailureFamilies.map((family) =>
      failureReasonActionPreset(
        family.reasonKey,
        repoIndexStatus?.syncConcurrencyLimit ?? null,
        "failure_family",
      ),
    );
    const remediationScript = buildShellScriptDocument({
      body: buildCurrentFailureRemediationCommand({
        origin: window.location.origin,
        failedReason: repoDiagnostics.selectedFailedReason,
        families: currentFailureFamilies.map((family) => ({
          reasonKey: family.reasonKey,
          machineKey: family.machineKey,
          repoIds: family.repoIds,
          sampleErrors: family.sampleErrors,
          guidance: family.guidance,
        })),
        syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
      }),
      metadataLines: buildScriptMetadataLines({
        workspaceContextLines: buildWorkspaceContextLines({
          repoIndexStatus,
          filter: repoDiagnostics.repoDiagnosticsFilter,
          unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
          failedReason: repoDiagnostics.selectedFailedReason,
          selectedRepoId: null,
        }),
        generatedAt,
        reasonMachineKeys: currentFailureFamilies.map((family) => family.machineKey),
        actionKeys: actionPresets.map((preset) => preset.actionKey),
        retryScopes: actionPresets.map((preset) => preset.retryScope),
        envOverrideSets: actionPresets.map((preset) => preset.envOverrides),
        followUpChecks: actionPresets.flatMap((preset) => preset.followUpChecks),
      }),
    });
    const runbook = buildFailureRemediationRunbook({
      repoIndexStatus,
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
      selectedRepoId: null,
      families: currentFailureFamilies,
      remediationScript,
    });
    const blob = new Blob([runbook], { type: "text/markdown;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-diagnostics-remediation-runbook-${buildTriageBundleFilename({
      filter: repoDiagnostics.repoDiagnosticsFilter,
      unsupportedReason: repoDiagnostics.selectedUnsupportedReason,
      failedReason: repoDiagnostics.selectedFailedReason,
    })}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [canDownloadCurrentFailurePlan, currentFailureFamilies, repoDiagnostics, repoIndexStatus]);

  const downloadSelectedRepoConfigPatch = useCallback((): void => {
    if (
      selectedRepoId === null ||
      selectedUnsupportedRepoReason?.reason !== "missing Project.toml" ||
      typeof window === "undefined"
    ) {
      return;
    }
    const patch = buildLinkGraphOnlyConfigPatch({
      repoIds: [selectedRepoId],
      repoIndexStatus,
      filter: "unsupported",
      unsupportedReason: selectedUnsupportedRepoReason.reason,
      failedReason: null,
      selectedRepoId,
    });
    const blob = new Blob([patch], { type: "text/plain;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-config-patch-${buildSelectedRepoDiagnosticsFilename(selectedRepoId)}.toml`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [repoIndexStatus, selectedRepoId, selectedUnsupportedRepoReason?.reason]);

  const downloadSelectedRepoFailurePlan = useCallback((): void => {
    if (
      selectedRepoId === null ||
      selectedRepoReason === null ||
      selectedRepoGuidance === null ||
      selectedFailureRemediation === null ||
      typeof window === "undefined"
    ) {
      return;
    }
    const plan = buildFailurePlanBundle({
      repoIndexStatus,
      filter: "failed",
      unsupportedReason: null,
      failedReason: selectedRepoReason,
      selectedRepoId,
      families: [
        {
          reasonKey: selectedRepoReason,
          machineKey: selectedFailureReasonMachineKey,
          repoIds: [selectedRepoId],
          sampleErrors: [selectedRepoReason],
          category: selectedFailureRemediation.category,
          retryable: selectedFailureRemediation.retryable,
          guidance: selectedRepoGuidance,
        },
      ],
    });
    const blob = new Blob([plan], { type: "text/plain;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-failure-plan-${buildSelectedRepoDiagnosticsFilename(selectedRepoId)}.toml`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [
    repoIndexStatus,
    selectedRepoGuidance,
    selectedRepoId,
    selectedRepoReason,
    selectedFailureReasonMachineKey,
    selectedFailureRemediation,
  ]);

  const downloadSelectedRepoRemediationCommand = useCallback((): void => {
    if (
      selectedRepoId === null ||
      selectedRepoReason === null ||
      selectedRepoGuidance === null ||
      typeof window === "undefined"
    ) {
      return;
    }
    const generatedAt = new Date().toISOString();
    const actionPreset = failureReasonActionPreset(
      selectedRepoReason,
      repoIndexStatus?.syncConcurrencyLimit ?? null,
      "repo",
    );
    const command = buildShellScriptDocument({
      body: buildSelectedRepoRemediationCommand({
        origin: window.location.origin,
        repoId: selectedRepoId,
        reason: selectedRepoReason,
        guidance: selectedRepoGuidance,
        syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
      }),
      metadataLines: buildScriptMetadataLines({
        workspaceContextLines: buildWorkspaceContextLines({
          repoIndexStatus,
          filter: "failed",
          unsupportedReason: null,
          failedReason: selectedRepoReason,
          selectedRepoId,
        }),
        generatedAt,
        reasonMachineKeys: [selectedFailureReasonMachineKey],
        actionKeys: [actionPreset.actionKey],
        retryScopes: [actionPreset.retryScope],
        envOverrideSets: [actionPreset.envOverrides],
        followUpChecks: actionPreset.followUpChecks,
      }),
    });
    const blob = new Blob([command], { type: "text/x-shellscript;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-remediation-command-${buildSelectedRepoDiagnosticsFilename(selectedRepoId)}.sh`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [repoIndexStatus, selectedRepoGuidance, selectedRepoId, selectedRepoReason, selectedFailureReasonMachineKey]);

  const downloadSelectedRepoRemediationRunbook = useCallback((): void => {
    if (
      selectedRepoId === null ||
      selectedRepoReason === null ||
      selectedRepoGuidance === null ||
      selectedFailureRemediation === null ||
      typeof window === "undefined"
    ) {
      return;
    }
    const generatedAt = new Date().toISOString();
    const actionPreset = failureReasonActionPreset(
      selectedRepoReason,
      repoIndexStatus?.syncConcurrencyLimit ?? null,
      "repo",
    );
    const remediationScript = buildShellScriptDocument({
      body: buildSelectedRepoRemediationCommand({
        origin: window.location.origin,
        repoId: selectedRepoId,
        reason: selectedRepoReason,
        guidance: selectedRepoGuidance,
        syncConcurrencyLimit: repoIndexStatus?.syncConcurrencyLimit ?? null,
      }),
      metadataLines: buildScriptMetadataLines({
        workspaceContextLines: buildWorkspaceContextLines({
          repoIndexStatus,
          filter: "failed",
          unsupportedReason: null,
          failedReason: selectedRepoReason,
          selectedRepoId,
        }),
        generatedAt,
        reasonMachineKeys: [selectedFailureReasonMachineKey],
        actionKeys: [actionPreset.actionKey],
        retryScopes: [actionPreset.retryScope],
        envOverrideSets: [actionPreset.envOverrides],
        followUpChecks: actionPreset.followUpChecks,
      }),
    });
    const runbook = buildFailureRemediationRunbook({
      repoIndexStatus,
      filter: "failed",
      unsupportedReason: null,
      failedReason: selectedRepoReason,
      selectedRepoId,
      families: [
        {
          reasonKey: selectedRepoReason,
          machineKey: selectedFailureReasonMachineKey,
          repoIds: [selectedRepoId],
          sampleErrors: [selectedRepoReason],
          category: selectedFailureRemediation.category,
          retryable: selectedFailureRemediation.retryable,
          guidance: selectedRepoGuidance,
        },
      ],
      remediationScript,
    });
    const blob = new Blob([runbook], { type: "text/markdown;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `repo-remediation-runbook-${buildSelectedRepoDiagnosticsFilename(selectedRepoId)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, [
    repoIndexStatus,
    selectedRepoGuidance,
    selectedRepoId,
    selectedRepoReason,
    selectedFailureReasonMachineKey,
    selectedFailureRemediation,
  ]);

  const handleRefreshRepoIndexStatus = refreshRepoIndexStatus;

  const handleCopyCurrentFailureRemediationCommand = useCallback(() => {
    void copyCurrentFailureRemediationCommand();
  }, [copyCurrentFailureRemediationCommand]);

  const handleToggleFocusedFailedExports = useCallback(() => {
    setShowFocusedFailedExports((current) => !current);
  }, []);

  const handleToggleFocusedUnsupportedExports = useCallback(() => {
    setShowFocusedUnsupportedExports((current) => !current);
  }, []);

  const handleClearSelectedRepo = useCallback(() => {
    setSelectedRepoId(null);
  }, []);

  const handleRetryFilteredFailed = useCallback(() => {
    void repoDiagnostics.retryFilteredFailedRepoIssues();
  }, [repoDiagnostics]);

  const handleCopyUnsupportedManifest = useCallback(() => {
    void repoDiagnostics.copyUnsupportedManifest();
  }, [repoDiagnostics]);

  const handleRetryRepoIndexIssue = useCallback((repoId: string) => {
    void repoDiagnostics.retryRepoIndexIssue(repoId);
  }, [repoDiagnostics]);

  const handleRetrySelectedRepo = useCallback(() => {
    if (!selectedFailedIssue) {
      return;
    }
    void repoDiagnostics.retryRepoIndexIssue(selectedFailedIssue.repoId);
  }, [repoDiagnostics, selectedFailedIssue]);

  const handleOperatorActionTargetClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const reasonKey = event.currentTarget.dataset.reasonKey;
      if (!reasonKey) {
        return;
      }
      focusFailureActionTarget(reasonKey);
    },
    [focusFailureActionTarget],
  );

  const renderUnsupportedGuidance = useCallback(
    (reason: string) => unsupportedReasonGuidance(reason, copy),
    [copy],
  );

  const handleSelectRepo = useCallback(
    (repoId: string, context: { phase: "unsupported" | "failed"; reason: string | null }) => {
      setSelectedRepoId(repoId);
      if (context.phase === "unsupported") {
        repoDiagnostics.setRepoDiagnosticsFilterState("unsupported");
        repoDiagnostics.setSelectedUnsupportedReasonState(context.reason);
        return;
      }
      repoDiagnostics.setRepoDiagnosticsFilterState("failed");
      repoDiagnostics.setSelectedFailedReasonState(context.reason);
    },
    [repoDiagnostics],
  );

  return (
    <div className="repo-diagnostics-page" data-testid="repo-diagnostics-page">
      <div className="repo-diagnostics-page__header">
        <div className="repo-diagnostics-page__heading">
          <div className="repo-diagnostics-page__eyebrow">
            {locale === "zh" ? "Diagnostics" : "Diagnostics"}
          </div>
          <h1 className="repo-diagnostics-page__title">
            {locale === "zh" ? "仓库索引诊断页面" : "Repo index diagnostics"}
          </h1>
          <p className="repo-diagnostics-page__summary">
            {repoIndexStatus
              ? locale === "zh"
                ? `已处理 ${processed}/${repoIndexStatus.total} 个仓库`
                : `Processed ${processed}/${repoIndexStatus.total} repositories`
              : locale === "zh"
                ? "仓库索引状态暂不可用"
                : "Repo index status is currently unavailable"}
          </p>
        </div>
        <div className="repo-diagnostics-page__actions">
          <button
            type="button"
            className="repo-diagnostics-page__button"
            onClick={handleRefreshRepoIndexStatus}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {isRefreshing
              ? locale === "zh"
                ? "刷新中..."
                : "Refreshing..."
              : locale === "zh"
                ? "刷新状态"
                : "Refresh status"}
          </button>
          <button
            type="button"
            className="repo-diagnostics-page__button"
            onClick={downloadCurrentDiagnosticsPack}
            disabled={repoIndexStatus === null}
          >
            {copy.downloadCurrentDiagnosticsPack}
          </button>
          {showHeaderCurrentTriageBundle ? (
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={downloadCurrentTriageBundle}
              disabled={repoIndexStatus === null}
            >
              {copy.downloadTriageBundle}
            </button>
          ) : null}
          {showHeaderCurrentFailureActions ? (
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={handleCopyCurrentFailureRemediationCommand}
            >
              {hasCopiedCurrentRemediationCommand
                ? copy.copiedCurrentRemediationCommand
                : copy.copyCurrentRemediationCommand}
            </button>
          ) : null}
          {showHeaderCurrentFailureActions ? (
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={downloadCurrentFailurePlan}
            >
              {copy.downloadCurrentFailurePlan}
            </button>
          ) : null}
          {showHeaderCurrentFailureActions ? (
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={downloadCurrentFailureRemediationRunbook}
            >
              {copy.downloadCurrentRemediationRunbook}
            </button>
          ) : null}
          {showHeaderCurrentFailureActions ? (
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={downloadCurrentFailureRemediationCommand}
            >
              {copy.downloadCurrentRemediationCommand}
            </button>
          ) : null}
          {showHeaderCurrentConfigPatch ? (
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={downloadCurrentConfigPatch}
            >
              {copy.downloadCurrentConfigPatch}
            </button>
          ) : null}
          <button
            type="button"
            className="repo-diagnostics-page__button repo-diagnostics-page__button--primary"
            onClick={onClose}
          >
            <ArrowLeft size={14} />
            {locale === "zh" ? "返回工作区" : "Back to workspace"}
          </button>
        </div>
      </div>

      <div className="repo-diagnostics-page__metrics">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`repo-diagnostics-page__metric repo-diagnostics-page__metric--${metric.tone}`}
          >
            <span className="repo-diagnostics-page__metric-label">{metric.label}</span>
            <strong className="repo-diagnostics-page__metric-value">{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className="repo-diagnostics-page__meta">
        {currentRepoLine ? (
          <span className="repo-diagnostics-page__meta-line">{currentRepoLine}</span>
        ) : null}
        {concurrencyLine ? (
          <span className="repo-diagnostics-page__meta-line">{concurrencyLine}</span>
        ) : null}
        {exclusionLine ? (
          <span className="repo-diagnostics-page__meta-line repo-diagnostics-page__meta-line--subtle">
            {exclusionLine}
          </span>
        ) : null}
      </div>

      {hasCurrentOperatorSummary && currentOperatorSummary ? (
        <div
          className="repo-diagnostics-page__operator-summary"
          data-testid="repo-diagnostics-operator-summary"
        >
          <div className="repo-diagnostics-page__operator-summary-header">
            <span className="repo-diagnostics-page__eyebrow">
              {locale === "zh" ? "Operator summary" : "Operator summary"}
            </span>
            <strong className="repo-diagnostics-page__operator-summary-title">
              {locale === "zh" ? "当前分片操作摘要" : "Current slice action summary"}
            </strong>
          </div>
          <div className="repo-diagnostics-page__operator-summary-facts">
            <span className="repo-diagnostics-page__repo-fact">
              {locale === "zh" ? "失败族" : "Failure families"}:{" "}
              {currentOperatorSummary.failureFamilyCount}
            </span>
            <span className="repo-diagnostics-page__repo-fact">
              {locale === "zh" ? "可重试" : "Retryable"}:{" "}
              {currentOperatorSummary.retryableFailureFamilyCount}
            </span>
            <span className="repo-diagnostics-page__repo-fact">
              {locale === "zh" ? "需人工处理" : "Manual"}:{" "}
              {currentOperatorSummary.manualFailureFamilyCount}
            </span>
            <span className="repo-diagnostics-page__repo-fact">
              {locale === "zh" ? "不支持分组" : "Unsupported groups"}:{" "}
              {currentOperatorSummary.unsupportedGroupCount}
            </span>
            {currentOperatorSummary.suggestedSyncConcurrencyLimit !== null ? (
              <span className="repo-diagnostics-page__repo-fact">
                {locale === "zh" ? "建议同步上限" : "Suggested sync limit"}:{" "}
                {currentOperatorSummary.suggestedSyncConcurrencyLimit}
              </span>
            ) : null}
          </div>
          {currentOperatorSummary.actionKeys.length > 0 ? (
            <p className="repo-diagnostics-page__operator-summary-line">
              <strong>{locale === "zh" ? "Actions" : "Actions"}:</strong>{" "}
              {currentOperatorSummary.actionKeys.join(", ")}
            </p>
          ) : null}
          {currentOperatorSummary.actionTargets.length > 0 ||
          currentOperatorSummary.unsupportedGroupCount > 0 ? (
            <div className="repo-diagnostics-page__operator-summary-actions">
              {currentOperatorSummary.actionTargets.map((target) => (
                <button
                  key={`${target.actionKey}:${target.reasonKey}`}
                  type="button"
                  className="repo-diagnostics-page__button"
                  data-reason-key={target.reasonKey}
                  onClick={handleOperatorActionTargetClick}
                >
                  {locale === "zh"
                    ? `聚焦 ${target.actionKey} · ${target.reasonKey} (${target.count})`
                    : `Focus ${target.actionKey} · ${target.reasonKey} (${target.count})`}
                </button>
              ))}
              {currentOperatorSummary.unsupportedGroupCount > 0 ? (
                <button
                  type="button"
                  className="repo-diagnostics-page__button"
                  onClick={focusUnsupportedSlice}
                >
                  {locale === "zh" ? "聚焦 unsupported 分片" : "Focus unsupported slice"}
                </button>
              ) : null}
            </div>
          ) : null}
          {currentOperatorSummary.followUpChecks.length > 0 ? (
            <p className="repo-diagnostics-page__operator-summary-line">
              <strong>{locale === "zh" ? "Checks" : "Checks"}:</strong>{" "}
              {currentOperatorSummary.followUpChecks.join(", ")}
            </p>
          ) : null}
          {currentOperatorSummary.nextSteps.length > 0 ? (
            <div className="repo-diagnostics-page__operator-summary-next-steps">
              <strong className="repo-diagnostics-page__operator-summary-subtitle">
                {locale === "zh" ? "Next steps" : "Next steps"}
              </strong>
              {currentOperatorSummary.nextSteps.map((step) => (
                <p key={step} className="repo-diagnostics-page__operator-summary-line">
                  {step}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {repoIndexStatus !== null && hasFocusedSliceActions ? (
        <div
          className="repo-diagnostics-page__focused-actions"
          data-testid="repo-diagnostics-focused-actions"
        >
          <div className="repo-diagnostics-page__focused-actions-header">
            <span className="repo-diagnostics-page__eyebrow">
              {locale === "zh" ? "Focused actions" : "Focused actions"}
            </span>
            <strong className="repo-diagnostics-page__focused-actions-title">
              {focusedSliceTitle}
            </strong>
          </div>
          <div className="repo-diagnostics-page__focused-actions-row">
            {isFocusedFailedSlice ? (
              <>
                <button
                  type="button"
                  className="repo-diagnostics-page__button"
                  onClick={handleRetryFilteredFailed}
                  disabled={repoDiagnostics.isRetryingFailedBatch}
                >
                  {repoDiagnostics.isRetryingFailedBatch
                    ? copy.retryingFilteredFailed
                    : copy.retryFilteredFailed}
                </button>
                <button
                  type="button"
                  className="repo-diagnostics-page__button"
                  onClick={downloadCurrentFailureRemediationRunbook}
                >
                  {copy.downloadCurrentRemediationRunbook}
                </button>
                <button
                  type="button"
                  className="repo-diagnostics-page__button"
                  onClick={handleToggleFocusedFailedExports}
                >
                  {locale === "zh"
                    ? showFocusedFailedExports
                      ? "收起导出"
                      : "更多导出"
                    : showFocusedFailedExports
                      ? "Less exports"
                      : "More exports"}
                </button>
              </>
            ) : null}
            {isFocusedUnsupportedSlice ? (
              <>
                <button
                  type="button"
                  className="repo-diagnostics-page__button"
                  onClick={
                    canDownloadCurrentConfigPatch
                      ? downloadCurrentConfigPatch
                      : downloadCurrentTriageBundle
                  }
                >
                  {canDownloadCurrentConfigPatch
                    ? copy.downloadCurrentConfigPatch
                    : copy.downloadTriageBundle}
                </button>
                <button
                  type="button"
                  className="repo-diagnostics-page__button"
                  onClick={handleToggleFocusedUnsupportedExports}
                >
                  {locale === "zh"
                    ? showFocusedUnsupportedExports
                      ? "收起导出"
                      : "更多导出"
                    : showFocusedUnsupportedExports
                      ? "Less exports"
                      : "More exports"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={clearFocusedSlice}
            >
              {locale === "zh" ? "回到全部诊断" : "Back to all diagnostics"}
            </button>
          </div>
          {isFocusedFailedSlice && showFocusedFailedExports ? (
            <div className="repo-diagnostics-page__focused-actions-secondary">
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={handleCopyCurrentFailureRemediationCommand}
              >
                {hasCopiedCurrentRemediationCommand
                  ? copy.copiedCurrentRemediationCommand
                  : copy.copyCurrentRemediationCommand}
              </button>
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={downloadCurrentFailurePlan}
              >
                {copy.downloadCurrentFailurePlan}
              </button>
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={downloadCurrentFailureRemediationCommand}
              >
                {copy.downloadCurrentRemediationCommand}
              </button>
            </div>
          ) : null}
          {isFocusedUnsupportedSlice && showFocusedUnsupportedExports ? (
            <div className="repo-diagnostics-page__focused-actions-secondary">
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={handleCopyUnsupportedManifest}
              >
                {repoDiagnostics.hasCopiedUnsupportedManifest
                  ? copy.copiedUnsupportedManifest
                  : copy.copyUnsupportedManifest}
              </button>
              {canDownloadCurrentConfigPatch ? (
                <button
                  type="button"
                  className="repo-diagnostics-page__button"
                  onClick={downloadCurrentTriageBundle}
                >
                  {copy.downloadTriageBundle}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedRepoId !== null && selectedRepoPhase !== null ? (
        <div
          className="repo-diagnostics-page__repo-detail"
          data-testid="repo-diagnostics-selected-repo"
        >
          <div className="repo-diagnostics-page__repo-detail-header">
            <div className="repo-diagnostics-page__repo-detail-heading">
              <span className="repo-diagnostics-page__eyebrow">
                {locale === "zh" ? "Selected repo" : "Selected repo"}
              </span>
              <h2 className="repo-diagnostics-page__repo-title">{selectedRepoId}</h2>
            </div>
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={handleClearSelectedRepo}
            >
              {locale === "zh" ? "清除选择" : "Clear selection"}
            </button>
          </div>
          <div className="repo-diagnostics-page__repo-facts">
            <span className="repo-diagnostics-page__repo-fact">
              {locale === "zh" ? "Phase" : "Phase"}: {selectedRepoPhase}
            </span>
            {selectedRepoReason ? (
              <span className="repo-diagnostics-page__repo-fact">
                {locale === "zh" ? "Reason" : "Reason"}: {selectedRepoReason}
              </span>
            ) : null}
            {selectedFailedIssue?.attemptCount ? (
              <span className="repo-diagnostics-page__repo-fact">
                {locale === "zh" ? "Attempts" : "Attempts"}: {selectedFailedIssue.attemptCount}
              </span>
            ) : null}
          </div>
          <div className="repo-diagnostics-page__repo-actions">
            {selectedFailedIssue ? (
              <button
                type="button"
                className="repo-diagnostics-page__button repo-diagnostics-page__button--primary"
                onClick={handleRetrySelectedRepo}
                disabled={repoDiagnostics.isRetryingFailedBatch || isRetryingSelectedRepo}
              >
                {isRetryingSelectedRepo ? copy.retrying : copy.retryRepo}
              </button>
            ) : null}
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={copySelectedRepoDiagnostics}
            >
              {hasCopiedSelectedRepoDiagnostics
                ? copy.copiedRepoDiagnostics
                : copy.copyRepoDiagnostics}
            </button>
            <button
              type="button"
              className="repo-diagnostics-page__button"
              onClick={downloadSelectedRepoRemediationBundle}
            >
              {copy.downloadRemediationBundle}
            </button>
            {selectedFailedIssue ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={downloadSelectedRepoFailurePlan}
              >
                {copy.downloadFailurePlan}
              </button>
            ) : null}
            {selectedFailedIssue ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={downloadSelectedRepoRemediationRunbook}
              >
                {copy.downloadRemediationRunbook}
              </button>
            ) : null}
            {selectedFailedIssue ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={downloadSelectedRepoRemediationCommand}
              >
                {copy.downloadRemediationCommand}
              </button>
            ) : null}
            {selectedFailedIssue ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={copySelectedRepoRemediationCommand}
              >
                {hasCopiedSelectedRepoRemediationCommand
                  ? copy.copiedRemediationCommand
                  : copy.copyRemediationCommand}
              </button>
            ) : null}
            {selectedFailedIssue ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={copySelectedRepoFailurePreset}
              >
                {hasCopiedSelectedRepoFailurePreset
                  ? copy.copiedFailurePreset
                  : copy.copyFailurePreset}
              </button>
            ) : null}
            {selectedUnsupportedRepoReason ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={copySelectedRepoFixTemplate}
              >
                {hasCopiedSelectedRepoFixTemplate ? copy.copiedFixTemplate : copy.copyFixTemplate}
              </button>
            ) : null}
            {selectedUnsupportedRepoReason?.reason === "missing Project.toml" ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={downloadSelectedRepoConfigPatch}
              >
                {copy.downloadConfigPatch}
              </button>
            ) : null}
            {selectedUnsupportedRepoReason?.reason === "missing Project.toml" ? (
              <button
                type="button"
                className="repo-diagnostics-page__button"
                onClick={copySelectedRepoLinkGraphOnlyPreset}
              >
                {hasCopiedSelectedRepoLinkGraphOnlyPreset
                  ? copy.copiedLinkGraphOnlyPreset
                  : copy.copyLinkGraphOnlyPreset}
              </button>
            ) : null}
          </div>
          {selectedRepoGuidance ? (
            <p className="repo-diagnostics-page__repo-guidance">{selectedRepoGuidance}</p>
          ) : null}
        </div>
      ) : null}

      {repoIndexStatus === null ? (
        <div className="repo-diagnostics-page__empty">
          <AlertCircle size={18} />
          <span>
            {locale === "zh"
              ? "等待 FileTree 完成工作区同步后再查看诊断，或者手动刷新状态。"
              : "Wait for FileTree to finish workspace sync, or refresh the repo-index status manually."}
          </span>
        </div>
      ) : repoDiagnostics.hasRepoDiagnostics ? (
        <RepoDiagnosticsDrawer
          copy={copy}
          diagnosticsSummary={diagnosticsSummary}
          filter={repoDiagnostics.repoDiagnosticsFilter}
          unsupportedReasons={repoDiagnostics.unsupportedReasons}
          filteredUnsupportedReasons={repoDiagnostics.filteredUnsupportedReasons}
          fullFilteredFailedIssues={repoDiagnostics.fullFilteredFailedIssues}
          failureReasons={repoDiagnostics.failureReasons}
          filteredFailedRepoIds={repoDiagnostics.filteredFailedRepoIds}
          retryingRepoIds={repoDiagnostics.retryingRepoIds}
          isRetryingFailedBatch={repoDiagnostics.isRetryingFailedBatch}
          showReasonFilters={repoDiagnostics.showReasonFilters}
          showFailureReasonFilters={repoDiagnostics.showFailureReasonFilters}
          selectedUnsupportedReason={repoDiagnostics.selectedUnsupportedReason}
          selectedFailedReason={repoDiagnostics.selectedFailedReason}
          hasCopiedUnsupportedManifest={repoDiagnostics.hasCopiedUnsupportedManifest}
          unsupportedManifest={repoDiagnostics.unsupportedManifest}
          totalFailedCount={repoDiagnostics.totalFailedCount}
          onSetFilter={repoDiagnostics.setRepoDiagnosticsFilterState}
          onSetUnsupportedReason={repoDiagnostics.setSelectedUnsupportedReasonState}
          onSetFailedReason={repoDiagnostics.setSelectedFailedReasonState}
          onRetryIssue={handleRetryRepoIndexIssue}
          onRetryFilteredFailed={handleRetryFilteredFailed}
          onCopyUnsupportedManifest={handleCopyUnsupportedManifest}
          onSelectRepo={handleSelectRepo}
          selectedRepoId={selectedRepoId}
          renderUnsupportedGuidance={renderUnsupportedGuidance}
        />
      ) : (
        <div className="repo-diagnostics-page__empty repo-diagnostics-page__empty--healthy">
          <CheckCircle size={18} />
          <span>
            {locale === "zh"
              ? "当前没有 unsupported 或 failed 仓库，repo index 状态健康。"
              : "There are no unsupported or failed repositories right now. Repo index is healthy."}
          </span>
        </div>
      )}
    </div>
  );
}
