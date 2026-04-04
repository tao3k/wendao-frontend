/**
 * Graph stats display component
 */

import { memo } from "react";

interface GraphStatsProps {
  totalNodes: number;
  totalLinks: number;
}

export const GraphStats = memo(function GraphStats({ totalNodes, totalLinks }: GraphStatsProps) {
  return (
    <div className="graph-stats" aria-label="Graph stats">
      <div className="graph-stats-card">
        <span className="graph-stats-value">{totalNodes}</span>
        <span className="graph-stats-label">Nodes</span>
      </div>
      <div className="graph-stats-card">
        <span className="graph-stats-value">{totalLinks}</span>
        <span className="graph-stats-label">Links</span>
      </div>
    </div>
  );
});
