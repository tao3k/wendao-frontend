import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEARCH_BAR_COPY } from "../searchPresentation";
import { SearchToolbar } from "../SearchToolbar";

describe("SearchToolbar grouped scopes", () => {
  it("keeps filters collapsed until requested", () => {
    const onScopeChange = vi.fn();
    const onSortModeChange = vi.fn();

    const { container } = render(
      <SearchToolbar
        scope="code"
        sortMode="path"
        locale="en"
        copy={SEARCH_BAR_COPY.en}
        onScopeChange={onScopeChange}
        onSortModeChange={onSortModeChange}
      />,
    );

    expect(container.querySelector(".search-toolbar-menu")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AST" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "References" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show filters/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show filters/i })).toHaveTextContent("Filters");

    fireEvent.click(screen.getByRole("button", { name: /Show filters/i }));

    expect(container.querySelector(".search-toolbar-menu")).toHaveClass("is-open");
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AST" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "References" })).toBeInTheDocument();
  });
});
