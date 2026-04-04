import React from "react";
import { Star } from "lucide-react";

interface SaliencyIndicatorProps {
  score: number; // 0.0 - 1.0
}

const SALIENCY_STAR_KEYS = [0, 1, 2, 3, 4] as const;
const SALIENCY_CONTAINER_BASE_STYLE = Object.freeze({
  display: "inline-flex",
  alignItems: "center",
  marginLeft: "8px",
});
const SALIENCY_STAR_STYLE = Object.freeze({ marginRight: "1px" });

export const SaliencyIndicator: React.FC<SaliencyIndicatorProps> = ({ score }) => {
  // Map 0-1 score to 1-5 star levels
  const level = Math.ceil(score * 5) || 1;
  const opacity = 0.3 + score * 0.7;
  const containerStyle = React.useMemo(
    () => ({ ...SALIENCY_CONTAINER_BASE_STYLE, opacity }),
    [opacity],
  );

  return (
    <div
      className="saliency-indicator"
      title={`Saliency Score: ${Math.round(score * 100)}%`}
      style={containerStyle}
    >
      {SALIENCY_STAR_KEYS.map((i) => (
        <Star
          key={i}
          size={10}
          fill={i < level ? "var(--tokyo-yellow)" : "transparent"}
          stroke={i < level ? "var(--tokyo-yellow)" : "var(--tokyo-comment)"}
          style={SALIENCY_STAR_STYLE}
        />
      ))}
    </div>
  );
};
