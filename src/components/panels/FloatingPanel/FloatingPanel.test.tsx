/**
 * Tests for FloatingPanel component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { FloatingPanel } from "./FloatingPanel";

// Mock useAccessibility hook
vi.mock("../../../hooks", () => ({
  useAccessibility: () => ({
    prefersReducedMotion: false,
    getTransition: (t: string) => t,
  }),
}));

// Mock createPortal
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe("FloatingPanel", () => {
  const defaultProps = {
    id: "test-panel",
    title: "Test Panel",
    children: <div>Panel Content</div>,
  };

  beforeEach(() => {
    // Create a container for portals
    const portalRoot = document.createElement("div");
    portalRoot.id = "portal-root";
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("rendering", () => {
    it("should render the panel with title", () => {
      render(<FloatingPanel {...defaultProps} />);

      expect(screen.getByText("Test Panel")).toBeInTheDocument();
    });

    it("should render children", () => {
      render(<FloatingPanel {...defaultProps} />);

      expect(screen.getByText("Panel Content")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<FloatingPanel {...defaultProps} className="custom-class" />);

      const panel = document.querySelector(".floating-panel");
      expect(panel).toHaveClass("custom-class");
    });

    it("should set initial position", () => {
      render(<FloatingPanel {...defaultProps} initialPosition={[100, 200]} />);

      const panel = document.querySelector(".floating-panel") as HTMLElement;
      expect(panel.style.left).toBe("100px");
      expect(panel.style.top).toBe("200px");
    });

    it("should set initial size", () => {
      render(<FloatingPanel {...defaultProps} initialSize={[300, 400]} />);

      const panel = document.querySelector(".floating-panel") as HTMLElement;
      expect(panel.style.width).toBe("300px");
      expect(panel.style.height).toBe("400px");
    });
  });

  describe("minimize", () => {
    it("should show minimize button when minimizable", () => {
      render(<FloatingPanel {...defaultProps} minimizable />);

      expect(screen.getByLabelText("Minimize")).toBeInTheDocument();
    });

    it("should hide minimize button when not minimizable", () => {
      render(<FloatingPanel {...defaultProps} minimizable={false} />);

      expect(screen.queryByLabelText("Minimize")).not.toBeInTheDocument();
    });

    it("should toggle minimized state on click", async () => {
      const onMinimize = vi.fn();
      render(<FloatingPanel {...defaultProps} minimizable onMinimize={onMinimize} />);

      fireEvent.click(screen.getByLabelText("Minimize"));

      expect(onMinimize).toHaveBeenCalledWith(true);
    });

    it("should hide content when minimized", () => {
      render(<FloatingPanel {...defaultProps} minimizable initialMinimized />);

      expect(screen.queryByText("Panel Content")).not.toBeInTheDocument();
    });

    it("should show restore button when minimized", () => {
      render(<FloatingPanel {...defaultProps} minimizable initialMinimized />);

      expect(screen.getByLabelText("Restore")).toBeInTheDocument();
    });
  });

  describe("close", () => {
    it("should show close button when closable", () => {
      render(<FloatingPanel {...defaultProps} closable />);

      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });

    it("should hide close button when not closable", () => {
      render(<FloatingPanel {...defaultProps} closable={false} />);

      expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
    });

    it("should call onClose when close button clicked", () => {
      const onClose = vi.fn();
      render(<FloatingPanel {...defaultProps} closable onClose={onClose} />);

      fireEvent.click(screen.getByLabelText("Close"));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("focus", () => {
    it("should call onFocus when panel is clicked", () => {
      const onFocus = vi.fn();
      render(<FloatingPanel {...defaultProps} onFocus={onFocus} />);

      const panel = document.querySelector(".floating-panel") as HTMLElement;
      fireEvent.mouseDown(panel);

      expect(onFocus).toHaveBeenCalled();
    });
  });

  describe("dragging", () => {
    it("should start dragging on header mousedown", () => {
      render(<FloatingPanel {...defaultProps} />);

      const header = document.querySelector(".floating-panel__header") as HTMLElement;
      fireEvent.mouseDown(header, { clientX: 100, clientY: 100 });

      const panel = document.querySelector(".floating-panel") as HTMLElement;
      expect(panel).toHaveClass("floating-panel--dragging");
    });

    it("should update position during drag", async () => {
      const onPositionChange = vi.fn();
      render(
        <FloatingPanel
          {...defaultProps}
          initialPosition={[0, 0]}
          onPositionChange={onPositionChange}
        />,
      );

      const header = document.querySelector(".floating-panel__header") as HTMLElement;
      fireEvent.mouseDown(header, { clientX: 100, clientY: 100 });

      fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(onPositionChange).toHaveBeenCalledWith([50, 50]);
      });
    });

    it("should not drag when clicking on controls", () => {
      render(<FloatingPanel {...defaultProps} closable />);

      const controls = document.querySelector(".floating-panel__controls") as HTMLElement;
      fireEvent.mouseDown(controls);

      const panel = document.querySelector(".floating-panel") as HTMLElement;
      expect(panel).not.toHaveClass("floating-panel--dragging");
    });
  });

  describe("resizing", () => {
    it("should start resizing on resize handle mousedown", () => {
      render(<FloatingPanel {...defaultProps} resizable />);

      const resizeHandle = document.querySelector(".floating-panel__resize-handle") as HTMLElement;
      fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      expect(resizeHandle).toBeInTheDocument();
    });

    it("should update size during resize", async () => {
      const onSizeChange = vi.fn();
      render(
        <FloatingPanel
          {...defaultProps}
          resizable
          initialSize={[300, 300]}
          onSizeChange={onSizeChange}
        />,
      );

      const resizeHandle = document.querySelector(".floating-panel__resize-handle") as HTMLElement;
      fireEvent.mouseDown(resizeHandle, { clientX: 0, clientY: 0 });

      fireEvent.mouseMove(document, { clientX: 50, clientY: 50 });
      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledWith([350, 350]);
      });
    });

    it("should not resize below minimum size", async () => {
      const onSizeChange = vi.fn();
      render(
        <FloatingPanel
          {...defaultProps}
          resizable
          initialSize={[300, 300]}
          minWidth={200}
          minHeight={200}
          onSizeChange={onSizeChange}
        />,
      );

      const resizeHandle = document.querySelector(".floating-panel__resize-handle") as HTMLElement;
      fireEvent.mouseDown(resizeHandle, { clientX: 0, clientY: 0 });

      // Try to shrink below minimum
      fireEvent.mouseMove(document, { clientX: -200, clientY: -200 });
      fireEvent.mouseUp(document);

      await waitFor(() => {
        // Should be clamped to minimum
        expect(onSizeChange).toHaveBeenCalledWith([200, 200]);
      });
    });
  });

  describe("accessibility", () => {
    it("should have dialog role", () => {
      render(<FloatingPanel {...defaultProps} />);

      const panel = screen.getByRole("dialog");
      expect(panel).toBeInTheDocument();
    });

    it("should have aria-label", () => {
      render(<FloatingPanel {...defaultProps} />);

      const panel = screen.getByLabelText("Test Panel");
      expect(panel).toBeInTheDocument();
    });

    it("should be focusable", () => {
      render(<FloatingPanel {...defaultProps} />);

      const panel = document.querySelector(".floating-panel") as HTMLElement;
      expect(panel).toHaveAttribute("tabindex", "-1");
    });
  });
});
