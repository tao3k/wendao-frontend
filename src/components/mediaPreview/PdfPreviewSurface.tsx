import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const DEFAULT_PAGE_WIDTH = {
  inline: 720,
  standalone: 1080,
} as const;
const MIN_PAGE_WIDTH = {
  inline: 240,
  standalone: 320,
} as const;
const PAGE_WIDTH_PADDING = {
  inline: 24,
  standalone: 32,
} as const;
const PDF_CANVAS_DEVICE_PIXEL_RATIO =
  typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
const PDF_LOADING_STATUS = <div className="media-preview__pdf-status">Loading PDF…</div>;
const PDF_NO_DATA_STATUS = <div className="media-preview__pdf-status">No PDF selected.</div>;
const PDF_PAGE_ERROR_STATUS = (
  <div className="media-preview__pdf-status">PDF page render failed. Use Open PDF.</div>
);
const PDF_PAGE_LOADING_STATUS = <div className="media-preview__pdf-status">Rendering page…</div>;

export interface PdfPreviewSurfaceProps {
  className: string;
  label: string;
  mode?: "inline" | "standalone";
  resolvedUrl: string;
  testId: string;
  title?: string;
}

function resolvePdfPageWidth(
  containerWidth: number,
  mode: NonNullable<PdfPreviewSurfaceProps["mode"]>,
) {
  if (containerWidth <= 0) {
    return DEFAULT_PAGE_WIDTH[mode];
  }

  return Math.max(MIN_PAGE_WIDTH[mode], Math.floor(containerWidth - PAGE_WIDTH_PADDING[mode]));
}

function PdfFallback({
  className,
  label,
  resolvedUrl,
  testId,
  title,
}: {
  className: string;
  label: string;
  resolvedUrl: string;
  testId: string;
  title?: string;
}): React.ReactElement {
  return (
    <object
      aria-label={label}
      className={className}
      data={resolvedUrl}
      data-testid={testId}
      title={title ?? label}
      type="application/pdf"
    >
      <a
        className="media-preview__fallback-link"
        href={resolvedUrl}
        rel="noreferrer noopener"
        target="_blank"
      >
        {label}
      </a>
    </object>
  );
}

export function PdfPreviewSurface({
  className,
  label,
  mode = "inline",
  resolvedUrl,
  testId,
  title,
}: PdfPreviewSurfaceProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousResolvedUrlRef = useRef(resolvedUrl);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState<number>(DEFAULT_PAGE_WIDTH[mode]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (previousResolvedUrlRef.current === resolvedUrl) {
      return;
    }

    previousResolvedUrlRef.current = resolvedUrl;
    setNumPages(null);
    setPageNumber(1);
    setLoadError(null);
  }, [resolvedUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setPageWidth(DEFAULT_PAGE_WIDTH[mode]);
      return;
    }

    const updatePageWidth = () => {
      setPageWidth(resolvePdfPageWidth(container.clientWidth, mode));
    };

    updatePageWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updatePageWidth();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [mode]);

  if (loadError) {
    return (
      <PdfFallback
        className={className}
        label={label}
        resolvedUrl={resolvedUrl}
        testId={testId}
        title={title}
      />
    );
  }

  const pageStatus = numPages ? `Page ${pageNumber} of ${numPages}` : "Loading PDF";
  const canGoBackward = pageNumber > 1;
  const canGoForward = numPages != null && pageNumber < numPages;
  const pdfFallback = useMemo(() => {
    return (
      <PdfFallback
        className={className}
        label={label}
        resolvedUrl={resolvedUrl}
        testId={testId}
        title={title}
      />
    );
  }, [className, label, resolvedUrl, testId, title]);

  const handlePreviousPage = useCallback(() => {
    setPageNumber((currentPage) => Math.max(1, currentPage - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber((currentPage) => {
      const maxPage = numPages ?? currentPage;
      return Math.min(maxPage, currentPage + 1);
    });
  }, [numPages]);

  const handleLoadError = useCallback((error: Error | string) => {
    setLoadError(error instanceof Error ? error.message : String(error));
  }, []);

  const handleLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    setLoadError(null);
    setNumPages(nextNumPages);
    setPageNumber((currentPage) => Math.min(currentPage, nextNumPages));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${className} media-preview__pdf-shell`}
      data-testid={testId}
    >
      <div className="media-preview__pdf-toolbar">
        <div className="media-preview__pdf-meta">
          <span className="media-preview__pdf-label">{label}</span>
          <span className="media-preview__pdf-page-status">{pageStatus}</span>
        </div>
        <div className="media-preview__pdf-actions">
          {mode === "standalone" ? (
            <>
              <button
                className="media-preview__pdf-button"
                disabled={!canGoBackward}
                onClick={handlePreviousPage}
                type="button"
              >
                Previous page
              </button>
              <button
                className="media-preview__pdf-button"
                disabled={!canGoForward}
                onClick={handleNextPage}
                type="button"
              >
                Next page
              </button>
            </>
          ) : null}
          <a
            className="media-preview__fallback-link media-preview__fallback-link--toolbar"
            href={resolvedUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            Open PDF
          </a>
        </div>
      </div>
      <div className="media-preview__pdf-document">
        <Document
          error={pdfFallback}
          file={resolvedUrl}
          loading={PDF_LOADING_STATUS}
          noData={PDF_NO_DATA_STATUS}
          onLoadError={handleLoadError}
          onLoadSuccess={handleLoadSuccess}
          onSourceError={handleLoadError}
        >
          <Page
            className="media-preview__pdf-page"
            devicePixelRatio={PDF_CANVAS_DEVICE_PIXEL_RATIO}
            error={PDF_PAGE_ERROR_STATUS}
            loading={PDF_PAGE_LOADING_STATUS}
            pageNumber={pageNumber}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            width={pageWidth}
          />
        </Document>
      </div>
    </div>
  );
}
