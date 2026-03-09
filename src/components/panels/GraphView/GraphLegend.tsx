/**
 * Graph legend component
 */

import React, { memo } from 'react';

export const GraphLegend = memo(function GraphLegend() {
  return (
    <div className="graph-legend">
      <div className="legend-item">
        <span className="legend-dot node-skill" />
        <span>Skill</span>
      </div>
      <div className="legend-item">
        <span className="legend-dot node-doc" />
        <span>Doc</span>
      </div>
      <div className="legend-item">
        <span className="legend-dot node-knowledge" />
        <span>Knowledge</span>
      </div>
      <div className="legend-item">
        <span className="legend-line link-attachment" />
        <span>Attachment</span>
      </div>
      <div className="legend-item">
        <span className="legend-line link-incoming" />
        <span>Incoming</span>
      </div>
      <div className="legend-item">
        <span className="legend-line link-outgoing" />
        <span>Outgoing</span>
      </div>
    </div>
  );
});
