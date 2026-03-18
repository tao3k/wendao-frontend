import React from 'react';
import { Layers, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface VfsStatus {
  isLoading: boolean;
  error: string | null;
}

interface StatusBarProps {
  nodeCount: number;
  selectedNodeId?: string | null;
  vfsStatus?: VfsStatus;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  nodeCount,
  selectedNodeId,
  vfsStatus,
}) => {
  const vfsTone = vfsStatus?.error ? 'error' : vfsStatus?.isLoading ? 'warning' : 'active';

  return (
    <>
      <div className="status-bar__group">
        <span className="status-chip">
          <Layers size={12} />
          {nodeCount} nodes
        </span>
        {vfsStatus && (
          <span className={`status-chip status-chip--${vfsTone}`}>
            <span className={`status-dot status-dot--${vfsTone}`} aria-hidden="true" />
            {vfsStatus.isLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                VFS Loading...
              </>
            ) : vfsStatus.error ? (
              <>
                <AlertCircle size={12} />
                VFS Fallback
              </>
            ) : (
              <>
                <CheckCircle size={12} />
                VFS Connected
              </>
            )}
          </span>
        )}
      </div>
      <div className="status-bar__group status-bar__group--secondary">
        {selectedNodeId && (
          <span className="status-text--accent animate-breathe">
            Selected: {selectedNodeId}
          </span>
        )}
        <span className="status-text--muted">
          Qianji Studio v1.0
        </span>
      </div>
    </>
  );
};
