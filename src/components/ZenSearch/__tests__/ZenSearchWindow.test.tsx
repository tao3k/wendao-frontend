import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ZenSearchWindow } from "../ZenSearchWindow";

const controllerState = vi.hoisted(() => ({
  modalProps: {
    onClick: vi.fn(),
    onKeyDownCapture: vi.fn(),
  },
  shellProps: {
    copy: {} as never,
    locale: "en",
  },
  resultsPanelProps: {} as never,
  suggestionsPanelProps: {} as never,
  codeFilterHelperProps: {} as never,
  showCodeFilterHelper: false,
}));

const useZenSearchModeSpy = vi.hoisted(() => vi.fn(() => controllerState));

vi.mock("../useZenSearchMode", () => ({
  useZenSearchMode: useZenSearchModeSpy,
}));

vi.mock("../ZenSearchLayout", () => ({
  ZenSearchLayout: () => <div data-testid="mock-zen-layout" />,
}));

describe("ZenSearchWindow", () => {
  beforeEach(() => {
    useZenSearchModeSpy.mockClear();
  });

  it("renders the dialog shell and delegates to the zen controller", () => {
    render(
      <ZenSearchWindow
        locale="en"
        defaultRepoFilter="lancd"
        onClose={vi.fn()}
        onResultSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("role", "dialog");
    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("mock-zen-layout")).toBeInTheDocument();
    expect(screen.getByTestId("zen-search-window")).toBeInTheDocument();
    expect(useZenSearchModeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: true, locale: "en", defaultRepoFilter: "lancd" }),
    );
  });

  it("forwards modal interactions from the controller to the root shell", () => {
    render(<ZenSearchWindow locale="en" onClose={vi.fn()} onResultSelect={vi.fn()} />);

    fireEvent.click(screen.getByTestId("zen-search-window"));
    expect(controllerState.modalProps.onClick).toHaveBeenCalled();
  });

  it("can stay mounted while hidden", () => {
    render(
      <ZenSearchWindow isOpen={false} locale="en" onClose={vi.fn()} onResultSelect={vi.fn()} />,
    );

    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("hidden");
    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("aria-hidden", "true");
    expect(useZenSearchModeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false, locale: "en" }),
    );
  });
});
