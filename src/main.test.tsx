import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const StudioBootstrapMock = () => <div data-testid="studio-bootstrap" />;

const mocks = vi.hoisted(() => {
  const renderSpy = vi.fn();
  const createRootSpy = vi.fn(() => ({ render: renderSpy }));
  return {
    renderSpy,
    createRootSpy,
  };
});

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: mocks.createRootSpy,
  },
}));

vi.mock("./StudioBootstrap.tsx", () => ({
  default: StudioBootstrapMock,
}));

describe("main entrypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("renders StudioBootstrap directly without a StrictMode wrapper", async () => {
    await import("./main");

    expect(mocks.createRootSpy).toHaveBeenCalledTimes(1);
    expect(mocks.createRootSpy).toHaveBeenCalledWith(document.getElementById("root"));
    expect(mocks.renderSpy).toHaveBeenCalledTimes(1);

    const renderedElement = mocks.renderSpy.mock.calls[0]?.[0];
    expect(React.isValidElement(renderedElement)).toBe(true);
    expect(renderedElement.type).toBe(StudioBootstrapMock);
  });
});
