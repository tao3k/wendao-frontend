import { useEffect, useCallback } from "react";

export interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutDefinition[]) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.isComposing) {
        return;
      }

      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        // Allow Escape even in input fields
        if (e.key !== "Escape" && e.key !== "Esc") {
          return;
        }
      }

      const normalizedKey = e.key === "Esc" ? "Escape" : e.key;

      const matchingShortcut = shortcuts.find(
        (s) =>
          s.key.toLowerCase() === normalizedKey.toLowerCase() &&
          !!s.ctrl === (e.ctrlKey || e.metaKey) && // Meta for Mac
          !!s.shift === e.shiftKey &&
          !!s.alt === e.altKey,
      );

      if (matchingShortcut) {
        e.preventDefault();
        matchingShortcut.action();
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};

// Helper to format shortcut for display
export const formatShortcut = (shortcut: ShortcutDefinition): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("⌘");
  if (shortcut.shift) parts.push("⇧");
  if (shortcut.alt) parts.push("⌥");
  parts.push(shortcut.key.toUpperCase());
  return parts.join("");
};
