import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import type { RepoIndexStatus } from '../statusBar/types';
import { requestRepoIndexPriority } from '../repoIndexPriority';
import {
  buildUnsupportedManifest,
  collectFailureReasons,
  EMPTY_REPO_INDEX_ISSUES,
  EMPTY_UNSUPPORTED_REASONS,
  failedReasonKey,
  MAX_DIAGNOSTIC_FAILURE_PREVIEW,
  persistRepoDiagnosticsFailedReasonState,
  persistRepoDiagnosticsFilterState,
  persistRepoDiagnosticsReasonState,
  readRepoDiagnosticsFailedReasonState,
  readRepoDiagnosticsFilterState,
  readRepoDiagnosticsReasonState,
  type RepoDiagnosticsFilter,
} from './state';
import type { RepoDiagnosticsLocale } from './types';

interface UseRepoDiagnosticsOptions {
  locale: RepoDiagnosticsLocale;
  repoIndexStatus: RepoIndexStatus | null;
  refreshRepoIndexStatus: () => Promise<void>;
}

export function useRepoDiagnostics({
  locale,
  repoIndexStatus,
  refreshRepoIndexStatus,
}: UseRepoDiagnosticsOptions) {
  const [retryingRepoIds, setRetryingRepoIds] = useState<string[]>([]);
  const [isRetryingFailedBatch, setIsRetryingFailedBatch] = useState(false);
  const [repoDiagnosticsFilter, setRepoDiagnosticsFilter] = useState<RepoDiagnosticsFilter>(readRepoDiagnosticsFilterState);
  const [selectedUnsupportedReason, setSelectedUnsupportedReason] = useState<string | null>(readRepoDiagnosticsReasonState);
  const [selectedFailedReason, setSelectedFailedReason] = useState<string | null>(readRepoDiagnosticsFailedReasonState);
  const [hasCopiedUnsupportedManifest, setHasCopiedUnsupportedManifest] = useState(false);

  const unsupportedReasons = repoIndexStatus?.unsupportedReasons ?? EMPTY_UNSUPPORTED_REASONS;
  const allFailedIssues = (repoIndexStatus?.issues ?? EMPTY_REPO_INDEX_ISSUES).filter((issue) => issue.phase === 'failed');
  const failureReasons = collectFailureReasons(allFailedIssues, locale);
  const failedIssues = allFailedIssues.slice(0, MAX_DIAGNOSTIC_FAILURE_PREVIEW);
  const failedRepoIds = Array.from(new Set(allFailedIssues.map((issue) => issue.repoId)));
  const hasRepoDiagnostics = unsupportedReasons.length > 0 || failedIssues.length > 0;
  const filteredUnsupportedReasons = repoDiagnosticsFilter === 'failed'
    ? []
    : unsupportedReasons.filter((reason) => (
      selectedUnsupportedReason === null || reason.reason === selectedUnsupportedReason
    ));
  const filteredFailedIssues = repoDiagnosticsFilter === 'unsupported' ? [] : failedIssues;
  const fullFilteredFailedIssues = repoDiagnosticsFilter === 'unsupported'
    ? []
    : allFailedIssues.filter((issue) => (
      selectedFailedReason === null || failedReasonKey(issue) === selectedFailedReason
    ));
  const filteredFailedRepoIds = Array.from(new Set(fullFilteredFailedIssues.map((issue) => issue.repoId)));
  const unsupportedManifest = buildUnsupportedManifest(filteredUnsupportedReasons);
  const showReasonFilters = repoDiagnosticsFilter !== 'failed' && unsupportedReasons.length > 1;
  const showFailureReasonFilters = repoDiagnosticsFilter !== 'unsupported' && failureReasons.length > 1;

  const resetEphemeralState = useCallback(() => {
    setRetryingRepoIds([]);
    setIsRetryingFailedBatch(false);
    setHasCopiedUnsupportedManifest(false);
  }, []);

  const setRepoDiagnosticsFilterState = useCallback((next: RepoDiagnosticsFilter) => {
    persistRepoDiagnosticsFilterState(next);
    setRepoDiagnosticsFilter(next);
  }, []);

  const setSelectedUnsupportedReasonState = useCallback((next: string | null) => {
    persistRepoDiagnosticsReasonState(next);
    setSelectedUnsupportedReason(next);
  }, []);

  const setSelectedFailedReasonState = useCallback((next: string | null) => {
    persistRepoDiagnosticsFailedReasonState(next);
    setSelectedFailedReason(next);
  }, []);

  const retryRepoIndexIssue = useCallback(async (repoId: string) => {
    requestRepoIndexPriority(repoId);
    setRetryingRepoIds((current) => (
      current.includes(repoId) ? current : [...current, repoId]
    ));
    try {
      await api.enqueueRepoIndex({ repo: repoId, refresh: true });
      await refreshRepoIndexStatus();
    } catch (retryError) {
      console.warn(`Failed to retry repo index for ${repoId}`, retryError);
    } finally {
      setRetryingRepoIds((current) => current.filter((entry) => entry !== repoId));
    }
  }, [refreshRepoIndexStatus]);

  const retryRepoIndexIssues = useCallback(async (repoIds: string[]) => {
    if (repoIds.length === 0) {
      return;
    }
    for (const repoId of repoIds) {
      requestRepoIndexPriority(repoId);
    }
    setIsRetryingFailedBatch(true);
    setRetryingRepoIds((current) => Array.from(new Set([...current, ...repoIds])));
    try {
      await Promise.all(
        repoIds.map((repoId) => api.enqueueRepoIndex({ repo: repoId, refresh: true }))
      );
      await refreshRepoIndexStatus();
    } catch (retryError) {
      console.warn('Failed to retry batch repo index entries', retryError);
    } finally {
      setRetryingRepoIds((current) => current.filter((entry) => !repoIds.includes(entry)));
      setIsRetryingFailedBatch(false);
    }
  }, [refreshRepoIndexStatus]);

  const retryAllFailedRepoIssues = useCallback(async () => {
    await retryRepoIndexIssues(failedRepoIds);
  }, [failedRepoIds, retryRepoIndexIssues]);

  const retryFilteredFailedRepoIssues = useCallback(async () => {
    await retryRepoIndexIssues(filteredFailedRepoIds);
  }, [filteredFailedRepoIds, retryRepoIndexIssues]);

  const copyUnsupportedManifest = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(unsupportedManifest);
      setHasCopiedUnsupportedManifest(true);
    } catch (copyError) {
      console.warn('Failed to copy unsupported manifest', copyError);
      setHasCopiedUnsupportedManifest(false);
    }
  }, [unsupportedManifest]);

  useEffect(() => {
    if (repoIndexStatus === null) {
      return;
    }

    const availableReasons = new Set(unsupportedReasons.map((reason) => reason.reason));
    if (selectedUnsupportedReason !== null && !availableReasons.has(selectedUnsupportedReason)) {
      setSelectedUnsupportedReasonState(null);
    }

    const availableFailedReasons = new Set(failureReasons.map((reason) => reason.reasonKey));
    if (selectedFailedReason !== null && !availableFailedReasons.has(selectedFailedReason)) {
      setSelectedFailedReasonState(null);
    }
  }, [
    failureReasons,
    repoIndexStatus,
    selectedFailedReason,
    selectedUnsupportedReason,
    setSelectedFailedReasonState,
    setSelectedUnsupportedReasonState,
    unsupportedReasons,
  ]);

  useEffect(() => {
    setHasCopiedUnsupportedManifest(false);
  }, [unsupportedManifest]);

  return {
    failureReasons,
    filteredFailedIssues,
    filteredFailedRepoIds,
    filteredUnsupportedReasons,
    fullFilteredFailedIssues,
    hasCopiedUnsupportedManifest,
    hasRepoDiagnostics,
    isRetryingFailedBatch,
    repoDiagnosticsFilter,
    retryingRepoIds,
    selectedFailedReason,
    selectedUnsupportedReason,
    showFailureReasonFilters,
    showReasonFilters,
    totalFailedCount: repoIndexStatus?.failed ?? 0,
    unsupportedManifest,
    unsupportedReasons,
    failedRepoIds,
    copyUnsupportedManifest,
    resetEphemeralState,
    retryAllFailedRepoIssues,
    retryFilteredFailedRepoIssues,
    retryRepoIndexIssue,
    setRepoDiagnosticsFilterState,
    setSelectedFailedReasonState,
    setSelectedUnsupportedReasonState,
  };
}

export type RepoDiagnosticsController = ReturnType<typeof useRepoDiagnostics>;
