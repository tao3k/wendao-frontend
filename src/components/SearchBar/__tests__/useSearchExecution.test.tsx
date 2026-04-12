import { useState } from "react";
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

function createMultiResultOutcome(query: string, stems: string[]): SearchExecutionOutcome {
  return {
    results: stems.map(createSearchResult),
    meta: {
      query,
      hitCount: stems.length,
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
      <button type="button" onClick={() => setResultSelectedIndex(1)}>
        select-1
      </button>
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
    const receivedSignals: AbortSignal[] = [];

    mocks.executeSearchQuery
      .mockImplementationOnce((_, __, options?: { signal?: AbortSignal }) => {
        if (options?.signal) {
          receivedSignals.push(options.signal);
        }
        return firstQuery.promise;
      })
      .mockImplementationOnce((_, __, options?: { signal?: AbortSignal }) => {
        if (options?.signal) {
          receivedSignals.push(options.signal);
        }
        return secondQuery.promise;
      });

    const { rerender } = render(<Harness queryToSearch="sec lang:julia" />);

    await waitFor(() => {
      expect(mocks.executeSearchQuery).toHaveBeenNthCalledWith(
        1,
        "sec lang:julia",
        "all",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    rerender(<Harness queryToSearch="sec lang:julia kind:function" />);

    await waitFor(() => {
      expect(mocks.executeSearchQuery).toHaveBeenNthCalledWith(
        2,
        "sec lang:julia kind:function",
        "all",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    expect(receivedSignals).toHaveLength(2);
    expect(receivedSignals[0]?.aborted).toBe(true);
    expect(receivedSignals[1]?.aborted).toBe(false);

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

  it("commits progressive all-mode outcomes before the final merge and keeps the current selection", async () => {
    const finalOutcome = createDeferred<SearchExecutionOutcome>();

    mocks.executeSearchQuery.mockImplementation(
      async (
        _query,
        _mode,
        options?: { onProgress?: (outcome: SearchExecutionOutcome) => void },
      ) => {
        options?.onProgress?.(createOutcome("solver", "solve"));
        return finalOutcome.promise;
      },
    );

    render(<Harness queryToSearch="solver" />);

    await waitFor(() => {
      expect(screen.getByTestId("results")).toHaveTextContent("solve");
      expect(screen.getByTestId("meta-query")).toHaveTextContent("solver");
      expect(screen.getByTestId("loading")).toHaveTextContent("loading");
      expect(screen.getByTestId("selected-index")).toHaveTextContent("0");
    });

    await act(async () => {
      screen.getByRole("button", { name: "select-1" }).click();
    });

    expect(screen.getByTestId("selected-index")).toHaveTextContent("1");

    await act(async () => {
      finalOutcome.resolve(createMultiResultOutcome("solver", ["solve", "sectionize"]));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("results")).toHaveTextContent("solve,sectionize");
      expect(screen.getByTestId("loading")).toHaveTextContent("idle");
      expect(screen.getByTestId("selected-index")).toHaveTextContent("1");
    });
  });
});
