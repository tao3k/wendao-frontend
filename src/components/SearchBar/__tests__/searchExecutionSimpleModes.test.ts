import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { executeSimpleSearchMode } from "../searchExecutionSimpleModes";

describe("searchExecution simple modes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes knowledge mode through the backend knowledge_lookup contract", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "kernel",
      hitCount: 1,
      hits: [
        {
          stem: "kernel",
          title: "Sovereign Kernel",
          path: "docs/kernel.md",
          docType: "markdown",
          tags: ["kernel", "knowledge"],
          score: 0.91,
        },
      ],
      selectedMode: "hybrid_search",
      searchMode: "hybrid_search",
      graphConfidenceScore: 0.74,
      intent: "knowledge_lookup",
      intentConfidence: 0.93,
      partial: true,
      indexingState: "warming",
      pendingRepos: ["gateway-sync"],
      skippedRepos: ["archive"],
    });

    const result = await executeSimpleSearchMode("kernel", "knowledge");

    expect(api.searchKnowledge).toHaveBeenCalledWith("kernel", 10, {
      intent: "knowledge_lookup",
    });
    expect(result.meta.selectedMode).toBe("hybrid_search");
    expect(result.meta.searchMode).toBe("hybrid_search");
    expect(result.meta.intent).toBe("knowledge_lookup");
    expect(result.meta.intentConfidence).toBe(0.93);
    expect(result.meta.pendingRepos).toEqual(["gateway-sync"]);
    expect(result.meta.skippedRepos).toEqual(["archive"]);
    expect(result.results).toHaveLength(1);
  });

  it("routes symbol mode through the symbol index contract", async () => {
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "solve",
      hitCount: 1,
      selectedScope: "project",
      partial: true,
      indexingState: "indexing",
      indexError: "still indexing",
      hits: [
        {
          name: "solve",
          kind: "function",
          path: "src/solver.jl",
          line: 12,
          location: "src/solver.jl:12",
          language: "julia",
          crateName: "solver",
          projectName: "solver",
          rootLabel: "main",
          navigationTarget: {
            path: "src/solver.jl",
            category: "repo_code",
            projectName: "solver",
            rootLabel: "main",
            line: 12,
            column: 1,
          },
          source: "project",
          score: 0.88,
        },
      ],
    });

    const result = await executeSimpleSearchMode("solve", "symbol");

    expect(api.searchSymbols).toHaveBeenCalledWith("solve", 10);
    expect(result.meta.selectedMode).toBe("Symbol Index");
    expect(result.meta.partial).toBe(true);
    expect(result.meta.indexingState).toBe("indexing");
    expect(result.meta.runtimeWarning).toBe("still indexing");
    expect(result.results).toHaveLength(1);
  });

  it("routes attachment mode through the attachment index contract", async () => {
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "schema",
      hitCount: 1,
      selectedScope: "attachments",
      partial: true,
      indexingState: "indexing",
      indexError: "attachment index warming",
      hits: [
        {
          name: "Schema PDF",
          path: "docs/schema.md",
          sourceId: "doc:schema",
          sourceStem: "schema",
          sourceTitle: "Schema",
          sourcePath: "docs/schema.md",
          attachmentId: "attachment:schema.pdf",
          attachmentPath: "docs/assets/schema.pdf",
          attachmentName: "schema.pdf",
          attachmentExt: "pdf",
          kind: "pdf",
          score: 0.82,
        },
      ],
    });

    const result = await executeSimpleSearchMode("schema", "attachment");

    expect(api.searchAttachments).toHaveBeenCalledWith("schema", 10);
    expect(result.meta.selectedMode).toBe("Attachment Index");
    expect(result.meta.hitCount).toBe(1);
    expect(result.meta.partial).toBe(true);
    expect(result.meta.indexingState).toBe("indexing");
    expect(result.meta.runtimeWarning).toBe("attachment index warming");
    expect(result.results).toHaveLength(1);
  });

  it("routes reference mode partial metadata through the shared search meta surface", async () => {
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "AlphaService",
      hitCount: 0,
      selectedScope: "references",
      partial: true,
      indexingState: "indexing",
      indexError: "reference index warming",
      hits: [],
    });

    const result = await executeSimpleSearchMode("AlphaService", "reference");

    expect(api.searchReferences).toHaveBeenCalledWith("AlphaService", 10);
    expect(result.meta.selectedMode).toBe("Reference Index");
    expect(result.meta.partial).toBe(true);
    expect(result.meta.indexingState).toBe("indexing");
    expect(result.meta.runtimeWarning).toBe("reference index warming");
  });

  it("parses attachment filter tokens into backend attachment-search options", async () => {
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "topology",
      hitCount: 0,
      selectedScope: "attachments",
      hits: [],
    });

    await executeSimpleSearchMode("topology ext:.png kind:image case:exact", "attachment");

    expect(api.searchAttachments).toHaveBeenCalledWith("topology", 10, {
      ext: ["png"],
      kind: ["image"],
      caseSensitive: true,
    });
  });
});
