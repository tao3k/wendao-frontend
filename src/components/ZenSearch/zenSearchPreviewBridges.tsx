import React from "react";
import { MarkdownWaterfall } from "../panels/DirectReader/MarkdownWaterfall";
import type { UiLocale } from "../SearchBar/types";
import type { ZenSearchPreviewState } from "./useZenSearchPreview";
import { StructuredIntelligenceDashboard } from "./StructuredDashboard";
import { ZenSearchPreviewInfo } from "./ZenSearchPreviewInfo";

interface ZenPreviewBridgeProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

export const ZenMarkdownPreviewBridge: React.FC<ZenPreviewBridgeProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => (
  <section
    className="zen-preview-content zen-preview-content--markdown"
    data-testid="markdown-preview-entity"
  >
    <div className="zen-preview-content__markdown-frame">
      <ZenSearchPreviewInfo
        locale={locale}
        loading={preview.loading}
        error={preview.error}
        content={preview.content}
      />
      <MarkdownWaterfall
        content={preview.content ?? ""}
        path={preview.contentPath ?? preview.selectedResult?.path ?? undefined}
        analysis={preview.markdownAnalysis ?? undefined}
        locale={locale}
        onBiLinkClick={onPivotQuery}
        onSectionPivot={onPivotQuery}
      />
    </div>
  </section>
);

export const ZenStructuredPreviewBridge: React.FC<ZenPreviewBridgeProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => (
  <StructuredIntelligenceDashboard locale={locale} preview={preview} onPivotQuery={onPivotQuery} />
);
