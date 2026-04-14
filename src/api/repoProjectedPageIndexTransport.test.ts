import { describe, expect, it, vi } from "vitest";

import { fetchRepoProjectedPageIndexTrees } from "./repoProjectedPageIndexTransport";

describe("repo projected page-index JSON transport", () => {
  it("requests the canonical repo projected page-index trees endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          repo_id: "gateway-sync",
          trees: [
            {
              repo_id: "gateway-sync",
              page_id: "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
              kind: "reference",
              path: "docs/solve.md",
              doc_id: "repo:gateway-sync:doc:docs/solve.md",
              title: "solve",
              root_count: 1,
              roots: [],
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const response = await fetchRepoProjectedPageIndexTrees(
      {
        apiBase: "/api",
        fetchImpl,
        handleResponse: async <T>(transportResponse: Response) => transportResponse.json() as T,
      },
      " gateway-sync ",
    );

    expect(fetchImpl).toHaveBeenCalledWith("/api/repo/projected-page-index-trees?repo=gateway-sync");
    expect(response.repo_id).toBe("gateway-sync");
    expect(response.trees[0]?.path).toBe("docs/solve.md");
  });
});
