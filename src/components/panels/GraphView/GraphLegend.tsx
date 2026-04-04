/**
 * Graph legend component
 */

import { memo } from "react";

export const GraphLegend = memo(function GraphLegend() {
  return (
    <div className="graph-legend">
      <span className="graph-legend-title">Legend</span>
      <div className="graph-legend-grid">
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
    </div>
  );
});
