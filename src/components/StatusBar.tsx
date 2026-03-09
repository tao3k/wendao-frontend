import React from 'react';
import { Activity, Layers, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface VfsStatus {
  isLoading: boolean;
  error: string | null;
}

interface StatusBarProps {
  nodeCount: number;
  viewMode: string;
  selectedNodeId?: string | null;
  vfsStatus?: VfsStatus;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  nodeCount,
  viewMode,
  selectedNodeId,
  vfsStatus,
}) => {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={12} />
          {nodeCount} nodes
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} />
          {viewMode.toUpperCase()} Mode
        </span>
        {/* VFS Status Indicator */}
        {vfsStatus && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: vfsStatus.error ? '#f7768e' : vfsStatus.isLoading ? '#e0af68' : '#9ece6a',
          }}>
            {vfsStatus.isLoading ? (
              <>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {selectedNodeId && (
          <span style={{ color: '#00D2FF' }}>
            Selected: {selectedNodeId}
          </span>
        )}
        <span style={{ opacity: 0.5 }}>
          Qianji Studio v1.0
        </span>
      </div>
    </>
  );
};
