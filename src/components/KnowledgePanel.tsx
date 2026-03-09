import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelState } from '../types';
// @ts-ignore
import katex from 'katex';

interface Props {
  state: PanelState;
  onClose: () => void;
}

export const KnowledgePanel: React.FC<Props> = ({ state, onClose }) => {
  const { isOpen, mode, data, relationships } = state;
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && mathRef.current && mode === 'entity') {
      try {
        katex.render(
          "\\Psi(s) = \\oint_{\\partial \\Omega} \\mathcal{F}(\\tau) \\cdot e^{-\\int_{0}^{t} \\omega(u) du} \\, d\\tau",
          mathRef.current,
          { throwOnError: false, displayMode: true, fleqn: false }
        );
      } catch (err) {
        console.error("KaTeX Error:", err);
      }
    }
  }, [isOpen, mode, data]);

  return (
    <AnimatePresence>
      {isOpen && data && (
        <motion.div
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 500, opacity: 0 }}
          style={{
            position: 'fixed',
            right: 24,
            top: 24,
            width: 440,
            height: 'calc(100vh - 48px)',
            background: 'rgba(8, 12, 24, 0.92)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            borderRadius: '20px',
            padding: '40px',
            zIndex: 4000,
            color: '#E6F3FF',
            boxShadow: '0 20px 80px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 210, 255, 0.05)',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: '24px', fontWeight: '600', letterSpacing: '-0.5px' }}>{data.name}</h2>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#00D2FF', letterSpacing: '2px', opacity: 0.8 }}>
                {data.id.toUpperCase()} // SOVEREIGN ENTITY
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#00D2FF', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(0, 210, 255, 0.1)', marginBottom: '40px' }} />

          {mode === 'entity' ? (
            <div className="entity-content">
              {/* Metadata Badge */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                <span style={{ padding: '4px 12px', background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                  {data.type.toUpperCase()}
                </span>
                <span style={{ padding: '4px 12px', background: 'rgba(0, 255, 136, 0.1)', color: '#00FF88', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: '1px solid rgba(0, 255, 136, 0.2)' }}>
                  AUDIT: 0.98
                </span>
              </div>

              <p style={{ fontSize: '14px', color: '#A0C4FF', lineHeight: '1.8', marginBottom: '40px' }}>
                This entity serves as a critical epistemic anchor within the PaperBanana evolution loop. 
                Reference: <span style={{ color: '#FFD700', cursor: 'pointer', borderBottom: '1px dashed #FFD700' }}>[[Academic_Integrity]]</span>.
              </p>

              {/* 💎 💎 💎 The Scholarly Formula Box (Lemma Style) */}
              <div style={{ position: 'relative', marginTop: '50px' }}>
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#080C18', padding: '0 10px', color: '#FFD700', fontSize: '10px', letterSpacing: '1.5px', fontWeight: 'bold' }}>
                  FIELD INVARIANT [EQ-X]
                </div>
                <div 
                  ref={mathRef} 
                  style={{ 
                    padding: '40px 20px', 
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,210,255,0.01) 100%)', 
                    border: '1px solid rgba(0, 210, 255, 0.15)',
                    borderLeft: '4px solid #FFD700',
                    borderRadius: '8px', 
                    minHeight: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* KaTeX injection */}
                </div>
              </div>
            </div>
          ) : (
            <div className="relationship-content">
              {/* Relationship Table ... */}
              <h3 style={{ fontSize: '12px', color: '#00D2FF', letterSpacing: '2px', marginBottom: '20px' }}>RELATIONSHIP MATRIX</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  {relationships?.incoming.map((id, i) => (
                    <tr key={`in-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '15px 0', color: '#00FF88', fontWeight: 'bold' }}>INCOMING</td>
                      <td style={{ padding: '15px 0', textAlign: 'right' }}>[[{id}]]</td>
                    </tr>
                  ))}
                  {relationships?.outgoing.map((id, i) => (
                    <tr key={`out-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '15px 0', color: '#00D2FF', fontWeight: 'bold' }}>OUTGOING</td>
                      <td style={{ padding: '15px 0', textAlign: 'right' }}>[[{id}]]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
