import React from "react";
import type { UiLocale } from "../../SearchBar/types";
import { ZenSearchPreviewContent } from "../ZenSearchPreviewContent";
import type { ZenSearchPreviewState } from "../useZenSearchPreview";
import { StructuredSlot } from "./StructuredSlot";
import {
  renderFragmentCards,
  type StructuredFragmentCardItem,
} from "./structuredDashboardRenderers";

export interface StructuredFragmentsPanelProps {
  locale: UiLocale;
  content: ZenSearchPreviewState["content"];
  contentPath: ZenSearchPreviewState["contentPath"];
  contentType: ZenSearchPreviewState["contentType"];
  loading: ZenSearchPreviewState["loading"];
  error: ZenSearchPreviewState["error"];
  saliencyExcerpt: string | null;
  fragments: StructuredFragmentCardItem[];
  syntaxLanguage: string | null;
  syntaxSourcePath: string | null;
  onPivotQuery?: (query: string) => void;
}

function StructuredFragmentsPanelComponent({
  locale,
  content,
  contentPath,
  contentType,
  loading,
  error,
  saliencyExcerpt,
  fragments,
  syntaxLanguage,
  syntaxSourcePath,
  onPivotQuery,
}: StructuredFragmentsPanelProps): React.ReactElement {
  return (
    <StructuredSlot
      id="structured-slot-fragments"
      panelOrder={3}
      bodyClassName="structured-slot__body--flow"
      title={locale === "zh" ? "III. 多维片段" : "III. Multi-slot Fragments"}
      subtitle={
        locale === "zh"
          ? "展开的瀑布式正文、显著性视区与辅助片段"
          : "Expanded waterfall body, saliency view, and auxiliary fragments"
      }
    >
      <ZenSearchPreviewContent
        locale={locale}
        content={content}
        contentPath={contentPath}
        contentType={contentType}
        loading={loading}
        error={error}
      />
      {saliencyExcerpt && (
        <div className="structured-saliency-card">
          <div className="structured-saliency-card__title">
            {locale === "zh" ? "显著性视区" : "Saliency View"}
          </div>
          <div className="structured-saliency-card__body">{saliencyExcerpt}</div>
        </div>
      )}
      {renderFragmentCards(fragments, syntaxLanguage, syntaxSourcePath, onPivotQuery)}
    </StructuredSlot>
  );
}

export const StructuredFragmentsPanel = React.memo(StructuredFragmentsPanelComponent);

StructuredFragmentsPanel.displayName = "StructuredFragmentsPanel";
