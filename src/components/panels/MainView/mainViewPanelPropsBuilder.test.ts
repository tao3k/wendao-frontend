import { describe, expect, it, vi } from "vitest";
import { getMainViewCopy } from "./mainViewCopy";
import {
  buildMainViewContentPanelProps,
  buildMainViewDiagramPanelProps,
  buildMainViewGraphPanelProps,
  buildMainViewReferencesPanelProps,
} from "./mainViewPanelPropsBuilder";

describe("mainViewPanelPropsBuilder", () => {
  it("builds diagram panel props", () => {
    const copy = getMainViewCopy("en");
    const onNodeClick = vi.fn();
    const selectedFile = {
      path: "docs/a.md",
      category: "doc",
      content: "# content",
    };

    const result = buildMainViewDiagramPanelProps({
      selectedFile,
      locale: "en",
      focusEpoch: 2,
      copy,
      panelLoadingFallback: "loading",
      onNodeClick,
    });

    expect(result).toMatchObject({
      selectedFile,
      locale: "en",
      focusEpoch: 2,
      noDiagramFile: copy.noDiagramFile,
      panelLoadingFallback: "loading",
      onNodeClick,
    });
  });

  it("builds references panel props", () => {
    const copy = getMainViewCopy("en");
    const selectedFile = { path: "docs/a.md", category: "doc", content: "# content" };
    const relationships = [{ from: "docs/a.md", to: "docs/b.md", type: "outgoing" }];

    const result = buildMainViewReferencesPanelProps({
      selectedFile,
      relationships,
      copy,
    });

    expect(result).toEqual({
      selectedFile,
      relationships,
      copy,
    });
  });

  it("builds graph panel props", () => {
    const onGraphFileSelect = vi.fn();
    const onGraphCenterNodeInvalid = vi.fn();
    const onSidebarSummaryChange = vi.fn();
    const onGraphRuntimeStatusChange = vi.fn();
    const options = { direction: "both" as const, hops: 2, limit: 50 };

    const result = buildMainViewGraphPanelProps({
      centerNodeId: "docs/a.md",
      enabled: true,
      options,
      locale: "zh",
      panelLoadingFallback: "loading",
      onGraphFileSelect,
      onGraphCenterNodeInvalid,
      onSidebarSummaryChange,
      onGraphRuntimeStatusChange,
    });

    expect(result).toMatchObject({
      centerNodeId: "docs/a.md",
      enabled: true,
      options,
      locale: "zh",
      panelLoadingFallback: "loading",
      onGraphFileSelect,
      onGraphCenterNodeInvalid,
      onSidebarSummaryChange,
      onGraphRuntimeStatusChange,
    });
  });

  it("builds content panel props", () => {
    const copy = getMainViewCopy("en");
    const onBiLinkClick = vi.fn();
    const selectedFile = { path: "docs/a.md", category: "doc", content: "# content" };

    const result = buildMainViewContentPanelProps({
      selectedFile,
      locale: "en",
      copy,
      panelLoadingFallback: "loading",
      onBiLinkClick,
    });

    expect(result).toMatchObject({
      selectedFile,
      locale: "en",
      noContentFile: copy.noContentFile,
      panelLoadingFallback: "loading",
      onBiLinkClick,
    });
  });
});
