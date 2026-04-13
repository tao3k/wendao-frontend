import React, { type ComponentProps } from "react";
import { CodeAstAnatomyView } from "../CodeAstAnatomyView";

type StructuredCodeInspectorProps = ComponentProps<typeof CodeAstAnatomyView>;

function StructuredCodeInspectorComponent(props: StructuredCodeInspectorProps): React.ReactElement {
  return (
    <section className="structured-code-inspector" data-testid="structured-code-inspector">
      <CodeAstAnatomyView {...props} />
    </section>
  );
}

export const StructuredCodeInspector = React.memo(StructuredCodeInspectorComponent);

StructuredCodeInspector.displayName = "StructuredCodeInspector";

export default StructuredCodeInspector;
