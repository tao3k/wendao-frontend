import React, { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchExecutionOutcome, SearchMeta } from "../searchExecutionTypes";
import type { SearchResult } from "../types";
import { useSearchExecution } from "../useSearchExecution";

const mocks = vi.hoisted(() => ({
  executeSearchQuery: vi.fn(),
}));

vi.mock("../searchExecution", () => ({
  executeSearchQuery: mocks.executeSearchQuery,
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function createSearchResult(stem: string): SearchResult {
  return {
    stem,
    title: stem,
    path: `sciml/src/${stem}.jl`,
    docType: "symbol",
    tags: ["code", "lang:julia", "kind:function"],
    score: 0.95,
    category: "symbol",
    projectName: "sciml",
    rootLabel: "src",
    line: 12,
    codeLanguage: "julia",
    codeKind: "function",
    codeRepo: "sciml",
    navigationTarget: {
      path: `sciml/src/${stem}.jl`,
      category: "repo_code",
      projectName: "sciml",
      rootLabel: "src",
      line: 12,
    },
  };
}

function createOutcome(query: string, stem: string): SearchExecutionOutcome {
  return {
    results: [createSearchResult(stem)],
    meta: {
      query,
      hitCount: 1,
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.97,
    },
  };
}

interface HarnessProps {
  isOpen?: boolean;
  queryToSearch: string;
}

function Harness({ isOpen = true, queryToSearch }: HarnessProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultSelectedIndex, setResultSelectedIndex] = useState(-1);

  useSearchExecution({
    isOpen,
    queryToSearch,
    searchMode: "all",
    setResults,
    setSearchMeta,
    setIsLoading,
    setError,
    setResultSelectedIndex,
  });

  return (
    <div>
      <div data-testid="results">{results.map((result) => result.stem).join(",")}</div>
      <div data-testid="meta-query">{searchMeta?.query ?? ""}</div>
      <div data-testid="loading">{isLoading ? "loading" : "idle"}</div>
      <div data-testid="error">{error ?? ""}</div>
      <div data-testid="selected-index">{String(resultSelectedIndex)}</div>
    </div>
  );
}

describe("useSearchExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the latest all-scope code-filtered query results when an older response resolves later", async () => {
    const firstQuery = createDeferred<SearchExecutionOutcome>();
    const secondQuery = createDeferred<SearchExecutionOutcome>();

    mocks.executeSearchQuery
      .mockImplementationOnce(() => firstQuery.promise)
      .mockImplementationOnce(() => secondQuery.promise);

    const { rerender } = render(<Harness queryToSearch="sec lang:julia" />);

    await waitFor(() => {
      expect(mocks.executeSearchQuery).toHaveBeenNthCalledWith(1, "sec lang:julia", "all", {});
    });

    rerender(<Harness queryToSearch="sec lang:julia kind:function" />);

    await waitFor(() => {
      expect(mocks.executeSearchQuery).toHaveBeenNthCalledWith(
        2,
        "sec lang:julia kind:function",
        "all",
        {},
      );
    });

    await act(async () => {
      secondQuery.resolve(createOutcome("sec lang:julia kind:function", "solve"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("results")).toHaveTextContent("solve");
      expect(screen.getByTestId("meta-query")).toHaveTextContent("sec lang:julia kind:function");
      expect(screen.getByTestId("loading")).toHaveTextContent("idle");
      expect(screen.getByTestId("selected-index")).toHaveTextContent("0");
    });

    await act(async () => {
      firstQuery.resolve(createOutcome("sec lang:julia", "sectionize"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("results")).toHaveTextContent("solve");
      expect(screen.getByTestId("results")).not.toHaveTextContent("sectionize");
      expect(screen.getByTestId("meta-query")).toHaveTextContent("sec lang:julia kind:function");
      expect(screen.getByTestId("error")).toHaveTextContent("");
    });
  });
});
