import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchBar } from "../SearchBar";

const zenSearchWindowMock = vi.fn(
  ({ locale, onClose }: { locale?: string; onClose?: () => void }) => (
    <div data-testid="zen-search-window" data-locale={locale}>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
);

vi.mock("../../ZenSearch", () => ({
  ZenSearchWindow: (props: { locale?: string; onClose?: () => void }) => zenSearchWindowMock(props),
}));

describe("SearchBar compatibility wrapper", () => {
  const onClose = vi.fn();
  const onResultSelect = vi.fn();

  beforeEach(() => {
    zenSearchWindowMock.mockClear();
    onClose.mockClear();
    onResultSelect.mockClear();
  });

  it("delegates to ZenSearchWindow when open", () => {
    render(
      <SearchBar isOpen={true} locale="zh" onClose={onClose} onResultSelect={onResultSelect} />,
    );

    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("data-locale", "zh");
    expect(zenSearchWindowMock).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    render(<SearchBar isOpen={false} onClose={onClose} onResultSelect={onResultSelect} />);

    expect(screen.queryByTestId("zen-search-window")).not.toBeInTheDocument();
    expect(zenSearchWindowMock).not.toHaveBeenCalled();
  });
});
