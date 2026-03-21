import React from 'react';
import { Star } from 'lucide-react';

interface SaliencyIndicatorProps {
  score: number; // 0.0 - 1.0
}

export const SaliencyIndicator: React.FC<SaliencyIndicatorProps> = ({ score }) => {
  // Map 0-1 score to 1-5 star levels
  const level = Math.ceil(score * 5) || 1;
  const opacity = 0.3 + (score * 0.7);
  
  return (
    <div 
      className="saliency-indicator" 
      title={`Saliency Score: ${Math.round(score * 100)}%`}
      style={{ opacity, display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}
    >
      {[...Array(5)].map((_, i) => (
        <Star 
          key={i} 
          size={10} 
          fill={i < level ? 'var(--tokyo-yellow)' : 'transparent'} 
          stroke={i < level ? 'var(--tokyo-yellow)' : 'var(--tokyo-comment)'}
          style={{ marginRight: '1px' }}
        />
      ))}
    </div>
  );
};
