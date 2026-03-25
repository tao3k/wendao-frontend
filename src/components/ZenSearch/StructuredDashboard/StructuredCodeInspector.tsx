import React, { type ComponentProps } from 'react';
import { CodeAstAnatomyView } from '../CodeAstAnatomyView';

type StructuredCodeInspectorProps = ComponentProps<typeof CodeAstAnatomyView>;

export const StructuredCodeInspector: React.FC<StructuredCodeInspectorProps> = (props) => {
  return (
    <section className="structured-code-inspector" data-testid="structured-code-inspector">
      <CodeAstAnatomyView {...props} />
    </section>
  );
};

export default StructuredCodeInspector;
