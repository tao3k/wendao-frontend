import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import { SEARCH_BAR_COPY } from "../searchPresentation";
import { SearchInputHeader } from "../SearchInputHeader";

describe("SearchInputHeader suggestions toggle", () => {
  it("renders the suggestions control as an icon-only toggle", () => {
    const onToggleSuggestions = vi.fn();

    render(
      <SearchInputHeader
        inputRef={React.createRef<HTMLInputElement>()}
        copy={SEARCH_BAR_COPY.en}
        locale="en"
        query="solve"
        isLoading={false}
        showSuggestions={false}
        onQueryChange={vi.fn()}
        onToggleSuggestions={onToggleSuggestions}
        onClose={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Toggle suggestions" });

    expect(button).toHaveAttribute("title", "Toggle suggestions");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.querySelector("svg")).toBeInTheDocument();
    expect(button).not.toHaveTextContent("Suggestions");

    fireEvent.click(button);
    expect(onToggleSuggestions).toHaveBeenCalledTimes(1);
  });

  it("marks the icon-only toggle as active when suggestions are shown", () => {
    render(
      <SearchInputHeader
        inputRef={React.createRef<HTMLInputElement>()}
        copy={SEARCH_BAR_COPY.en}
        locale="en"
        query="solve"
        isLoading={false}
        showSuggestions
        onQueryChange={vi.fn()}
        onToggleSuggestions={vi.fn()}
        onClose={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Toggle suggestions" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass("active");
    expect(button.querySelector(".search-toolbar-btn-indicator")).toHaveClass("active");
  });

  it("renders the close control as a non-submitting button", () => {
    const { container } = render(
      <SearchInputHeader
        inputRef={React.createRef<HTMLInputElement>()}
        copy={SEARCH_BAR_COPY.en}
        locale="en"
        query="solve"
        isLoading={false}
        showSuggestions={false}
        onQueryChange={vi.fn()}
        onToggleSuggestions={vi.fn()}
        onClose={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
      />,
    );

    expect(container.querySelector(".search-close")).toHaveAttribute("type", "button");
  });

  it("keeps the local input responsive and still syncs external query updates", () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <SearchInputHeader
        inputRef={React.createRef<HTMLInputElement>()}
        copy={SEARCH_BAR_COPY.en}
        locale="en"
        query="sec"
        isLoading={false}
        showSuggestions={false}
        onQueryChange={onQueryChange}
        onToggleSuggestions={vi.fn()}
        onClose={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sec lang:julia" } });

    expect(input).toHaveValue("sec lang:julia");
    expect(onQueryChange).toHaveBeenCalledWith("sec lang:julia");

    rerender(
      <SearchInputHeader
        inputRef={React.createRef<HTMLInputElement>()}
        copy={SEARCH_BAR_COPY.en}
        locale="en"
        query="restored query"
        isLoading={false}
        showSuggestions={false}
        onQueryChange={onQueryChange}
        onToggleSuggestions={vi.fn()}
        onClose={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)")).toHaveValue(
      "restored query",
    );
  });

  it("records typing trace metrics for the hot input path", () => {
    const trace = createPerfTrace("SearchInputHeader.type-query");

    function Harness() {
      trace.markRender();
      const [query, setQuery] = React.useState("sec");

      return (
        <SearchInputHeader
          inputRef={React.createRef<HTMLInputElement>()}
          copy={SEARCH_BAR_COPY.en}
          locale="en"
          query={query}
          isLoading={false}
          showSuggestions={false}
          onQueryChange={(value) => {
            trace.increment("query-change-calls");
            setQuery(value);
          }}
          onToggleSuggestions={vi.fn()}
          onClose={vi.fn()}
          onKeyDown={vi.fn()}
          onCompositionStart={vi.fn()}
          onCompositionEnd={vi.fn()}
        />
      );
    }

    render(<Harness />);

    trace.reset();
    trace.measure("type-query", () => {
      fireEvent.change(screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)"), {
        target: { value: "sec lang:julia" },
      });
    });

    expect(trace.snapshot()).toMatchObject({
      label: "SearchInputHeader.type-query",
      renderCount: 1,
      counters: {
        "type-query": 1,
        "query-change-calls": 1,
      },
      sampleCount: 1,
    });
    recordPerfTraceSnapshot("SearchBar/SearchInputHeader typing hot path", trace.snapshot());
  });
});
