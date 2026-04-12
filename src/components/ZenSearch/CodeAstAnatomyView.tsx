import React, { useMemo } from "react";
import type { CodeAstAnalysisResponse } from "../../api";
import type { SearchResult } from "../SearchBar/types";
import {
  buildDisplayedLineRange,
  buildSignatureParameterRows,
  copyForLocale,
  resolveEmptyCodeAstMessage,
} from "./codeAstAnatomyViewModel";
import {
  CodeAstBlocksStage,
  CodeAstDeclarationStage,
  CodeAstSymbolsStage,
  CodeAstWaterfallHeader,
} from "./codeAstAnatomySections";
import { deriveCodeAstAnatomy } from "./StructuredDashboard/codeAstAnatomy";
import "./CodeAstAnatomyView.css";

interface CodeAstAnatomyViewProps {
  locale: "en" | "zh";
  selectedResult: SearchResult;
  analysis: CodeAstAnalysisResponse | null;
  content: string | null;
  loading: boolean;
  error: string | null;
  onPivotQuery?: (query: string) => void;
}

export const CodeAstAnatomyView: React.FC<CodeAstAnatomyViewProps> = ({
  locale,
  selectedResult,
  analysis,
  content,
  loading,
  error,
  onPivotQuery,
}) => {
  const copy = copyForLocale(locale);
  const model = useMemo(
    () => (analysis ? deriveCodeAstAnatomy(analysis, content, selectedResult) : null),
    [analysis, content, selectedResult],
  );

  if (loading) {
    return <div className="code-ast-waterfall__status">{copy.loading}</div>;
  }

  if (error) {
    return (
      <div className="code-ast-waterfall__status code-ast-waterfall__status--error">{error}</div>
    );
  }

  if (!model || !analysis) {
    return (
      <div className="code-ast-waterfall__status">
        {resolveEmptyCodeAstMessage(locale, selectedResult)}
      </div>
    );
  }

  const declaration = model.declaration;
  const syntaxLanguage = selectedResult.codeLanguage ?? analysis.language ?? null;
  const sourcePath = selectedResult.navigationTarget?.path ?? selectedResult.path;
  const signatureRows = buildSignatureParameterRows(model.signatureParts);
  const sourceLineRange = buildDisplayedLineRange(declaration?.line, model.blocks);

  return (
    <div className="code-ast-waterfall" data-testid="code-ast-waterfall">
      <CodeAstWaterfallHeader
        copy={copy}
        declarationPath={declaration?.path}
        sourcePath={sourcePath}
        sourceLineRange={sourceLineRange}
      />
      <CodeAstDeclarationStage
        locale={locale}
        copy={copy}
        declaration={declaration}
        signatureRows={signatureRows}
        onPivotQuery={onPivotQuery}
      />
      <CodeAstBlocksStage
        locale={locale}
        copy={copy}
        blocks={model.blocks}
        syntaxLanguage={syntaxLanguage}
        sourcePath={sourcePath}
        onPivotQuery={onPivotQuery}
      />
      <CodeAstSymbolsStage
        copy={copy}
        symbolGroups={model.symbolGroups}
        onPivotQuery={onPivotQuery}
      />
    </div>
  );
};

export default CodeAstAnatomyView;
