import React, { useMemo } from "react";
import type { CodeAstAnalysisResponse } from "../../api";
import type { SearchResult } from "../SearchBar/types";
import { CodeAstDetailStages } from "./CodeAstDetailStages";
import {
  buildDisplayedLineRange,
  buildSignatureParameterRows,
  copyForLocale,
  resolveEmptyCodeAstMessage,
} from "./codeAstAnatomyViewModel";
import { CodeAstDeclarationStage, CodeAstWaterfallHeader } from "./codeAstAnatomySections";
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
  const copy = useMemo(() => copyForLocale(locale), [locale]);
  const selectedPath = selectedResult.navigationTarget?.path ?? selectedResult.path;
  const selectedCodeLanguage = selectedResult.codeLanguage ?? null;
  const model = useMemo(
    () =>
      analysis
        ? deriveCodeAstAnatomy(analysis, content, {
            path: selectedPath,
            codeLanguage: selectedCodeLanguage,
          })
        : null,
    [analysis, content, selectedCodeLanguage, selectedPath],
  );
  const declaration = model?.declaration ?? null;
  const syntaxLanguage = selectedCodeLanguage ?? analysis?.language ?? null;
  const sourcePath = selectedPath;
  const signatureRows = useMemo(
    () => buildSignatureParameterRows(model?.signatureParts ?? []),
    [model?.signatureParts],
  );
  const sourceLineRange = useMemo(
    () => buildDisplayedLineRange(declaration?.line, model?.blocks ?? []),
    [declaration?.line, model?.blocks],
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
      <CodeAstDetailStages
        locale={locale}
        copy={copy}
        blocks={model.blocks}
        symbolGroups={model.symbolGroups}
        syntaxLanguage={syntaxLanguage}
        sourcePath={sourcePath}
        onPivotQuery={onPivotQuery}
      />
    </div>
  );
};

export default CodeAstAnatomyView;
