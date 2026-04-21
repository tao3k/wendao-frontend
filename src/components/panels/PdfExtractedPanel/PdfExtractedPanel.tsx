import React, { useCallback, useMemo, useState } from "react";
import { FileText, Image, Table, Sigma, ChevronDown, ChevronRight } from "lucide-react";
import type { PdfExtractResult, PdfExtractResource } from "../../../api/bindings";
import "./PdfExtractedPanel.css";

interface PdfExtractedPanelProps {
  pdfPath: string;
  result: PdfExtractResult | null;
  loading?: boolean;
  error?: string | null;
  locale?: "en" | "zh";
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const COPY: Record<"en" | "zh", Record<string, string>> = {
  en: {
    title: "Extracted Content",
    fullText: "Full Text",
    images: "Images",
    tables: "Tables",
    formulas: "Formulas",
    paragraphs: "Paragraphs",
    page: "Page",
    noResults: "No extraction results available.",
    error: "Failed to load extraction results.",
    loading: "Loading extraction results...",
  },
  zh: {
    title: "提取内容",
    fullText: "全文",
    images: "图片",
    tables: "表格",
    formulas: "公式",
    paragraphs: "段落",
    page: "第",
    noResults: "暂无提取结果。",
    error: "加载提取结果失败。",
    loading: "加载提取结果中...",
  },
};

function CollapsibleSection({
  title,
  icon,
  count,
  defaultExpanded = true,
  children,
}: SectionProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const handleToggle = useCallback(() => setExpanded((v) => !v), []);

  return (
    <div className="pdf-extracted-section">
      <button
        type="button"
        className="pdf-extracted-section__header"
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        <span className="pdf-extracted-section__icon">{icon}</span>
        <span className="pdf-extracted-section__title">{title}</span>
        <span className="pdf-extracted-section__count">{count}</span>
        <span className="pdf-extracted-section__toggle">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {expanded && <div className="pdf-extracted-section__body">{children}</div>}
    </div>
  );
}

export function PdfExtractedPanel({
  pdfPath,
  result,
  loading = false,
  error = null,
  locale = "en",
}: PdfExtractedPanelProps): React.ReactElement {
  const copy = COPY[locale];

  const groups = useMemo(() => {
    if (!result) return null;
    const images = result.resources.filter((r) => r.resourceType === "image");
    const tables = result.resources.filter((r) => r.resourceType === "table");
    const formulas = result.resources.filter((r) => r.resourceType === "formula");
    const documents = result.resources.filter(
      (r) => r.resourceType === "document" && r.elementId !== "_main"
    );
    const mainDoc = result.resources.find((r) => r.elementId === "_main");
    return { images, tables, formulas, documents, mainDoc };
  }, [result]);

  if (loading) {
    return (
      <div className="pdf-extracted-panel">
        <div className="pdf-extracted-panel__loading">{copy.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-extracted-panel">
        <div className="pdf-extracted-panel__error">{copy.error}</div>
      </div>
    );
  }

  if (!result || !groups || result.resources.length === 0) {
    return (
      <div className="pdf-extracted-panel">
        <div className="pdf-extracted-panel__empty">{copy.noResults}</div>
      </div>
    );
  }

  return (
    <div className="pdf-extracted-panel">
      <div className="pdf-extracted-panel__head">
        <FileText size={14} />
        <span>{copy.title}</span>
        <span className="pdf-extracted-panel__meta">
          {result.totalPages} {locale === "zh" ? "页" : "pages"} · {result.resources.length}{" "}
          {locale === "zh" ? "资源" : "resources"}
        </span>
      </div>

      {groups.mainDoc && (
        <CollapsibleSection
          title={copy.fullText}
          icon={<FileText size={14} />}
          count={1}
          defaultExpanded={true}
        >
          <FullTextView content={groups.mainDoc.content} />
        </CollapsibleSection>
      )}

      {groups.images.length > 0 && (
        <CollapsibleSection
          title={copy.images}
          icon={<Image size={14} />}
          count={groups.images.length}
        >
          <ImageGrid resources={groups.images} pdfPath={pdfPath} locale={locale} />
        </CollapsibleSection>
      )}

      {groups.tables.length > 0 && (
        <CollapsibleSection
          title={copy.tables}
          icon={<Table size={14} />}
          count={groups.tables.length}
        >
          <TableCards resources={groups.tables} locale={locale} />
        </CollapsibleSection>
      )}

      {groups.formulas.length > 0 && (
        <CollapsibleSection
          title={copy.formulas}
          icon={<Sigma size={14} />}
          count={groups.formulas.length}
        >
          <FormulaCards resources={groups.formulas} locale={locale} />
        </CollapsibleSection>
      )}

      {groups.documents.length > 0 && (
        <CollapsibleSection
          title={copy.paragraphs}
          icon={<FileText size={14} />}
          count={groups.documents.length}
          defaultExpanded={false}
        >
          <DocumentCards resources={groups.documents} locale={locale} />
        </CollapsibleSection>
      )}
    </div>
  );
}

function FullTextView({
  content,
}: {
  content: string;
}): React.ReactElement {
  if (!content) return <div className="pdf-extracted__empty">No text available.</div>;

  return (
    <div className="pdf-extracted__markdown">
      {content.split("\n").map((line, i) => (
        <p key={i} className="pdf-extracted__markdown-line">
          {line}
        </p>
      ))}
    </div>
  );
}

function ImageGrid({
  resources,
  pdfPath,
  locale,
}: {
  resources: PdfExtractResource[];
  pdfPath: string;
  locale: "en" | "zh";
}): React.ReactElement {
  return (
    <div className="pdf-extracted__image-grid">
      {resources.map((res) => {
        const src = `/api/pdf-extract-resource?path=${encodeURIComponent(pdfPath)}&element_id=${encodeURIComponent(res.elementId)}`;
        return (
          <a
            key={res.elementId}
            className="pdf-extracted__image-card"
            href={src}
            target="_blank"
            rel="noreferrer"
            title={res.caption || `${locale === "zh" ? "第" : "Page"} ${res.pageIndex + 1}`}
          >
            <img src={src} alt={res.caption || res.elementId} loading="lazy" />
            <span className="pdf-extracted__image-label">
              {locale === "zh" ? "第" : "P"}
              {res.pageIndex + 1}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function TableCards({
  resources,
  locale,
}: {
  resources: PdfExtractResource[];
  locale: "en" | "zh";
}): React.ReactElement {
  return (
    <div className="pdf-extracted__cards">
      {resources.map((res) => (
        <div key={res.elementId} className="pdf-extracted__card pdf-extracted__card--table">
          <div className="pdf-extracted__card-head">
            <Table size={12} />
            <span>
              {locale === "zh" ? "第" : "Page"} {res.pageIndex + 1}
            </span>
          </div>
          <div
            className="pdf-extracted__card-body"
            dangerouslySetInnerHTML={{ __html: res.content }}
          />
        </div>
      ))}
    </div>
  );
}

function FormulaCards({
  resources,
  locale,
}: {
  resources: PdfExtractResource[];
  locale: "en" | "zh";
}): React.ReactElement {
  return (
    <div className="pdf-extracted__cards">
      {resources.map((res) => (
        <div key={res.elementId} className="pdf-extracted__card pdf-extracted__card--formula">
          <div className="pdf-extracted__card-head">
            <Sigma size={12} />
            <span>
              {locale === "zh" ? "第" : "Page"} {res.pageIndex + 1}
            </span>
          </div>
          <pre className="pdf-extracted__card-body">{res.content}</pre>
        </div>
      ))}
    </div>
  );
}

function DocumentCards({
  resources,
  locale,
}: {
  resources: PdfExtractResource[];
  locale: "en" | "zh";
}): React.ReactElement {
  return (
    <div className="pdf-extracted__cards">
      {resources.map((res) => (
        <div key={res.elementId} className="pdf-extracted__card pdf-extracted__card--doc">
          <div className="pdf-extracted__card-head">
            <FileText size={12} />
            <span>
              {locale === "zh" ? "第" : "Page"} {res.pageIndex + 1}
            </span>
          </div>
          <div className="pdf-extracted__card-body">{res.content}</div>
        </div>
      ))}
    </div>
  );
}
