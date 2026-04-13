import React from "react";
import type { CodeAstBlockModel, CodeAstSymbolGroup } from "./StructuredDashboard/codeAstAnatomy";
import { CodeAstBlocksStage, CodeAstSymbolsStage } from "./codeAstAnatomySections";
import type { CodeAstAnatomyCopy } from "./codeAstAnatomyViewModel";

export interface CodeAstDetailStagesProps {
  locale: "en" | "zh";
  copy: CodeAstAnatomyCopy;
  blocks: CodeAstBlockModel[];
  symbolGroups: CodeAstSymbolGroup[];
  syntaxLanguage: string | null;
  sourcePath: string;
  onPivotQuery?: (query: string) => void;
}

function CodeAstDetailStagesComponent({
  locale,
  copy,
  blocks,
  symbolGroups,
  syntaxLanguage,
  sourcePath,
  onPivotQuery,
}: CodeAstDetailStagesProps): React.ReactElement {
  return (
    <>
      <CodeAstBlocksStage
        locale={locale}
        copy={copy}
        blocks={blocks}
        syntaxLanguage={syntaxLanguage}
        sourcePath={sourcePath}
        onPivotQuery={onPivotQuery}
      />
      <CodeAstSymbolsStage copy={copy} symbolGroups={symbolGroups} onPivotQuery={onPivotQuery} />
    </>
  );
}

export const CodeAstDetailStages = React.memo(CodeAstDetailStagesComponent);

CodeAstDetailStages.displayName = "CodeAstDetailStages";
