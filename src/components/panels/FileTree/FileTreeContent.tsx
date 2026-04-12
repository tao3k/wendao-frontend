import type { ReactElement, ReactNode } from "react";
import type { FileTreeCopy } from "./types";

interface FileTreeContentProps {
  copy: FileTreeCopy;
  error: string | null;
  onRetryGatewaySync: () => void;
  children: ReactNode;
}

export function FileTreeContent({
  copy,
  error,
  onRetryGatewaySync,
  children,
}: FileTreeContentProps): ReactElement {
  return (
    <div className="file-tree-content">
      {error ? (
        <div className="file-tree-error">
          <strong>{copy.gatewayBlocked}</strong>
          <span>{copy.gatewayHint}</span>
          <code>{error}</code>
          <button type="button" className="file-tree-retry" onClick={onRetryGatewaySync}>
            {copy.retry}
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
