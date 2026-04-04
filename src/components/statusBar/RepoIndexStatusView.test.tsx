import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RepoIndexStatusView } from "./RepoIndexStatusView";

describe("RepoIndexStatusView", () => {
  it("renders repo-index details and dispatches the diagnostics action", () => {
    const onOpenDiagnostics = vi.fn();

    render(
      <RepoIndexStatusView
        locale="en"
        tone="warning"
        compactLabel="Repo index processed 1/3"
        label="Repo index 1/3 · Queued 1 · Checking 0 · Syncing 1 · Indexing 0 · Unsupported 0 · Failed 0 · Current sciml · Next mcl #1"
        concurrencyLabel="Analysis budget 3/15 · Sync limit 2"
        exclusionLabel="Excluded from repo index (2 link-graph-only projects, plugins=[]): kernel, main"
        unsupportedLabel={null}
        unsupportedReasonLabels={[]}
        issueLabel={null}
        onOpenDiagnostics={onOpenDiagnostics}
      />,
    );

    expect(screen.getByText("Repo index processed 1/3")).toBeInTheDocument();
    expect(screen.getByText("Repo index details")).toBeInTheDocument();
    expect(screen.getByText("Analysis budget 3/15 · Sync limit 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open repo index diagnostics" }));
    expect(onOpenDiagnostics).toHaveBeenCalledTimes(1);
  });
});
