import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface DiagramPreviewDialogProps {
  ariaLabel: string;
  title: string;
  closeLabel: string;
  kicker: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function DiagramPreviewDialog({
  ariaLabel,
  title,
  closeLabel,
  kicker,
  onClose,
  children,
}: DiagramPreviewDialogProps): React.ReactElement | null {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="diagram-window__preview-overlay" onClick={onClose}>
      <div
        className="diagram-window__preview-shell"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="diagram-window__preview-header">
          <div className="diagram-window__preview-header-copy">
            <p className="diagram-window__preview-kicker">{kicker}</p>
            <h3 className="diagram-window__preview-title">{title}</h3>
          </div>
          <button
            type="button"
            className="diagram-window__preview-close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
        <div className="diagram-window__preview-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
