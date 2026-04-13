import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfPreviewSurface } from "./PdfPreviewSurface";

const pdfMockState = vi.hoisted(() => ({
  numPages: 3,
  pageRenderSpy: vi.fn(),
}));

vi.mock("react-pdf", () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: "",
    },
  },
  Document: ({
    children,
    file,
    onLoadSuccess,
  }: {
    children: React.ReactNode;
    file: string;
    onLoadSuccess?: (payload: { numPages: number }) => void;
  }) => {
    React.useLayoutEffect(() => {
      onLoadSuccess?.({ numPages: pdfMockState.numPages });
    }, [file, onLoadSuccess]);

    return (
      <div data-file={file} data-testid="react-pdf-document">
        {children}
      </div>
    );
  },
  Page: ({ pageNumber, width }: { pageNumber?: number; width?: number }) => {
    pdfMockState.pageRenderSpy(pageNumber, width);

    return (
      <div
        data-page-number={String(pageNumber ?? 0)}
        data-testid="react-pdf-page"
        data-width={String(width ?? 0)}
      />
    );
  },
}));

describe("PdfPreviewSurface", () => {
  beforeEach(() => {
    pdfMockState.numPages = 3;
    pdfMockState.pageRenderSpy.mockClear();
  });

  it("renders inline previews with the first page and an open link", async () => {
    render(
      <PdfPreviewSurface
        className="media-preview__asset media-preview__asset--pdf media-preview__asset--inline"
        label="Architecture PDF"
        mode="inline"
        resolvedUrl="/api/vfs/raw?path=kernel%2Fdocs%2Ffiles%2Farchitecture.pdf"
        testId="pdf-preview"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Previous page" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open PDF" })).toHaveAttribute(
      "href",
      "/api/vfs/raw?path=kernel%2Fdocs%2Ffiles%2Farchitecture.pdf",
    );
    expect(screen.getByTestId("react-pdf-page")).toHaveAttribute("data-page-number", "1");
  });

  it("supports standalone pagination without rerendering the entire surface contract", async () => {
    render(
      <PdfPreviewSurface
        className="media-preview__asset media-preview__asset--pdf media-preview__asset--standalone"
        label="Architecture PDF"
        mode="standalone"
        resolvedUrl="/api/vfs/raw?path=kernel%2Fdocs%2Ffiles%2Farchitecture.pdf"
        testId="pdf-preview"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    });
    expect(screen.getByTestId("react-pdf-page")).toHaveAttribute("data-page-number", "2");
  });
});
