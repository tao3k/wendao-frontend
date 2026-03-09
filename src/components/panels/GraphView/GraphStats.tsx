/**
 * Graph stats display component
 */

import React, { memo } from 'react';

interface GraphStatsProps {
  totalNodes: number;
  totalLinks: number;
}

export const GraphStats = memo(function GraphStats({ totalNodes, totalLinks }: GraphStatsProps) {
  return (
    <div className="graph-stats">
      <span>{totalNodes} nodes</span>
      <span>{totalLinks} links</span>
    </div>
  );
});
