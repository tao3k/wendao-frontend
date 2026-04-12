import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { render as renderKatex } from "katex";
import type { CSSProperties } from "react";
import { PanelState } from "../types";

const PANEL_MOTION_INITIAL = { x: 500, opacity: 0 };
const PANEL_MOTION_ACTIVE = { x: 0, opacity: 1 };
const PANEL_STYLE: CSSProperties = {
  position: "fixed",
  right: 24,
  top: 24,
  width: 440,
  height: "calc(100vh - 48px)",
  background: "rgba(8, 12, 24, 0.92)",
  backdropFilter: "blur(40px)",
  border: "1px solid rgba(0, 210, 255, 0.25)",
  borderRadius: "20px",
  padding: "40px",
  zIndex: 4000,
  color: "#E6F3FF",
  boxShadow: "0 20px 80px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 210, 255, 0.05)",
  overflowY: "auto",
};
const HEADER_STYLE: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "40px",
};
const TITLE_STYLE: CSSProperties = {
  margin: 0,
  color: "#FFFFFF",
  fontSize: "24px",
  fontWeight: "600",
  letterSpacing: "-0.5px",
};
const ENTITY_ID_STYLE: CSSProperties = {
  marginTop: "8px",
  fontSize: "11px",
  color: "#00D2FF",
  letterSpacing: "2px",
  opacity: 0.8,
};
const CLOSE_BUTTON_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "none",
  color: "#00D2FF",
  cursor: "pointer",
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const SEPARATOR_STYLE: CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(0, 210, 255, 0.1)",
  marginBottom: "40px",
};
const BADGE_ROW_STYLE: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginBottom: "30px",
};
const ENTITY_BADGE_STYLE: CSSProperties = {
  padding: "4px 12px",
  background: "rgba(255, 215, 0, 0.1)",
  color: "#FFD700",
  borderRadius: "4px",
  fontSize: "10px",
  fontWeight: "bold",
  border: "1px solid rgba(255, 215, 0, 0.2)",
};
const AUDIT_BADGE_STYLE: CSSProperties = {
  padding: "4px 12px",
  background: "rgba(0, 255, 136, 0.1)",
  color: "#00FF88",
  borderRadius: "4px",
  fontSize: "10px",
  fontWeight: "bold",
  border: "1px solid rgba(0, 255, 136, 0.2)",
};
const BODY_COPY_STYLE: CSSProperties = {
  fontSize: "14px",
  color: "#A0C4FF",
  lineHeight: "1.8",
  marginBottom: "40px",
};
const ENTITY_LINK_STYLE: CSSProperties = {
  color: "#FFD700",
  cursor: "pointer",
  borderBottom: "1px dashed #FFD700",
};
const FORMULA_SECTION_STYLE: CSSProperties = { position: "relative", marginTop: "50px" };
const FORMULA_LABEL_STYLE: CSSProperties = {
  position: "absolute",
  top: "-12px",
  left: "20px",
  background: "#080C18",
  padding: "0 10px",
  color: "#FFD700",
  fontSize: "10px",
  letterSpacing: "1.5px",
  fontWeight: "bold",
};
const FORMULA_BOX_STYLE: CSSProperties = {
  padding: "40px 20px",
  background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,210,255,0.01) 100%)",
  border: "1px solid rgba(0, 210, 255, 0.15)",
  borderLeft: "4px solid #FFD700",
  borderRadius: "8px",
  minHeight: "100px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 0 30px rgba(0,0,0,0.5)",
};
const RELATIONSHIP_TITLE_STYLE: CSSProperties = {
  fontSize: "12px",
  color: "#00D2FF",
  letterSpacing: "2px",
  marginBottom: "20px",
};
const RELATIONSHIP_TABLE_STYLE: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};
const RELATIONSHIP_ROW_STYLE: CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};
const INCOMING_LABEL_STYLE: CSSProperties = {
  padding: "15px 0",
  color: "#00FF88",
  fontWeight: "bold",
};
const OUTGOING_LABEL_STYLE: CSSProperties = {
  padding: "15px 0",
  color: "#00D2FF",
  fontWeight: "bold",
};
const RELATIONSHIP_VALUE_STYLE: CSSProperties = {
  padding: "15px 0",
  textAlign: "right",
};

interface Props {
  state: PanelState;
  onClose: () => void;
}

export const KnowledgePanel: React.FC<Props> = ({ state, onClose }) => {
  const { isOpen, mode, data, relationships } = state;
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && mathRef.current && mode === "entity") {
      try {
        renderKatex(
          "\\Psi(s) = \\oint_{\\partial \\Omega} \\mathcal{F}(\\tau) \\cdot e^{-\\int_{0}^{t} \\omega(u) du} \\, d\\tau",
          mathRef.current,
          { throwOnError: false, displayMode: true, fleqn: false },
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
          initial={PANEL_MOTION_INITIAL}
          animate={PANEL_MOTION_ACTIVE}
          exit={PANEL_MOTION_INITIAL}
          style={PANEL_STYLE}
        >
          <div style={HEADER_STYLE}>
            <div>
              <h2 style={TITLE_STYLE}>{data.name}</h2>
              <div style={ENTITY_ID_STYLE}>
                {data.id.toUpperCase()} {"//"} SOVEREIGN ENTITY
              </div>
            </div>
            <button onClick={onClose} style={CLOSE_BUTTON_STYLE}>
              ✕
            </button>
          </div>

          <hr style={SEPARATOR_STYLE} />

          {mode === "entity" ? (
            <div className="entity-content">
              <div style={BADGE_ROW_STYLE}>
                <span style={ENTITY_BADGE_STYLE}>{data.type.toUpperCase()}</span>
                <span style={AUDIT_BADGE_STYLE}>AUDIT: 0.98</span>
              </div>

              <p style={BODY_COPY_STYLE}>
                This entity serves as a critical epistemic anchor within the PaperBanana evolution
                loop. Reference: <span style={ENTITY_LINK_STYLE}>[[Academic_Integrity]]</span>.
              </p>

              <div style={FORMULA_SECTION_STYLE}>
                <div style={FORMULA_LABEL_STYLE}>FIELD INVARIANT [EQ-X]</div>
                <div ref={mathRef} style={FORMULA_BOX_STYLE}>
                  {null}
                </div>
              </div>
            </div>
          ) : (
            <div className="relationship-content">
              <h3 style={RELATIONSHIP_TITLE_STYLE}>RELATIONSHIP MATRIX</h3>
              <table style={RELATIONSHIP_TABLE_STYLE}>
                <tbody>
                  {relationships?.incoming.map((id, i) => (
                    <tr key={`in-${i}`} style={RELATIONSHIP_ROW_STYLE}>
                      <td style={INCOMING_LABEL_STYLE}>INCOMING</td>
                      <td style={RELATIONSHIP_VALUE_STYLE}>[[{id}]]</td>
                    </tr>
                  ))}
                  {relationships?.outgoing.map((id, i) => (
                    <tr key={`out-${i}`} style={RELATIONSHIP_ROW_STYLE}>
                      <td style={OUTGOING_LABEL_STYLE}>OUTGOING</td>
                      <td style={RELATIONSHIP_VALUE_STYLE}>[[{id}]]</td>
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
