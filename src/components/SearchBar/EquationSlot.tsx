import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Sigma } from 'lucide-react';

interface EquationSlotProps {
  latex: string;
}

export const EquationSlot: React.FC<EquationSlotProps> = ({ latex }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Split by double newline if multiple equations are provided
      const equations = latex.split('\n\n').filter(e => e.trim().length > 0);
      containerRef.current.innerHTML = '';
      
      equations.forEach(eq => {
        const div = document.createElement('div');
        div.className = 'drawer-equation-item';
        try {
          katex.render(eq, div, {
            throwOnError: false,
            displayMode: true,
          });
        } catch (err) {
          div.textContent = eq; // Fallback to raw text
        }
        containerRef.current?.appendChild(div);
      });
    }
  }, [latex]);

  return (
    <div className="drawer-equations-section">
      <h4 className="drawer-section-title">
        <Sigma size={14} style={{ marginRight: '6px' }} />
        Mathematical Equations
      </h4>
      <div ref={containerRef} className="drawer-equations-list" />
    </div>
  );
};
