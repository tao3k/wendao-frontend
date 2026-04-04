import { describe, expect, it, vi } from "vitest";
import { createMainViewTabPreloader } from "./mainViewTabPreloader";

describe("mainViewTabPreloader", () => {
  it("routes diagram/graph/content to their loaders", () => {
    const diagram = vi.fn(async () => ({}));
    const graph = vi.fn(async () => ({}));
    const content = vi.fn(async () => ({}));
    const preload = createMainViewTabPreloader({ diagram, graph, content }, () => true);

    preload("diagram");
    preload("graph");
    preload("content");

    expect(diagram).toHaveBeenCalledTimes(1);
    expect(graph).toHaveBeenCalledTimes(1);
    expect(content).toHaveBeenCalledTimes(1);
  });

  it("does not preload references tab", () => {
    const diagram = vi.fn(async () => ({}));
    const graph = vi.fn(async () => ({}));
    const content = vi.fn(async () => ({}));
    const preload = createMainViewTabPreloader({ diagram, graph, content }, () => true);

    preload("references");

    expect(diagram).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
    expect(content).not.toHaveBeenCalled();
  });

  it("deduplicates repeated preload for the same tab", () => {
    const diagram = vi.fn(async () => ({}));
    const graph = vi.fn(async () => ({}));
    const content = vi.fn(async () => ({}));
    const preload = createMainViewTabPreloader({ diagram, graph, content }, () => true);

    preload("graph");
    preload("graph");
    preload("graph");

    expect(graph).toHaveBeenCalledTimes(1);
  });

  it("respects preload decider for constrained network", () => {
    const diagram = vi.fn(async () => ({}));
    const graph = vi.fn(async () => ({}));
    const content = vi.fn(async () => ({}));
    const preload = createMainViewTabPreloader(
      { diagram, graph, content },
      (tab) => tab === "content",
    );

    preload("diagram");
    preload("graph");
    preload("content");

    expect(diagram).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
    expect(content).toHaveBeenCalledTimes(1);
  });
});
