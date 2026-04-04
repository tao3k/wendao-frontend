/**
 * Accessibility preferences hook
 *
 * Provides access to user accessibility preferences:
 * - Reduced motion
 * - High contrast
 * - Color scheme preference
 */

import { useState, useEffect } from "react";

export interface AccessibilityPreferences {
  /** User prefers reduced motion */
  prefersReducedMotion: boolean;
  /** User prefers high contrast */
  prefersHighContrast: boolean;
  /** User prefers dark color scheme */
  prefersDark: boolean;
  /** User prefers light color scheme */
  prefersLight: boolean;
  /** Get appropriate duration (0 if reduced motion) */
  getDuration: (duration: number) => number;
  /** Get appropriate transition (none if reduced motion) */
  getTransition: (transition: string) => string;
}

/**
 * Hook to access user accessibility preferences
 */
export function useAccessibility(): AccessibilityPreferences {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [prefersDark, setPrefersDark] = useState(true);
  const [prefersLight, setPrefersLight] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === "undefined") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const contrastQuery = window.matchMedia("(prefers-contrast: high)");
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const lightQuery = window.matchMedia("(prefers-color-scheme: light)");

    // Set initial values
    setPrefersReducedMotion(motionQuery.matches);
    setPrefersHighContrast(contrastQuery.matches);
    setPrefersDark(darkQuery.matches);
    setPrefersLight(lightQuery.matches);

    // Listen for changes
    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    const handleContrastChange = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);
    const handleDarkChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    const handleLightChange = (e: MediaQueryListEvent) => setPrefersLight(e.matches);

    motionQuery.addEventListener("change", handleMotionChange);
    contrastQuery.addEventListener("change", handleContrastChange);
    darkQuery.addEventListener("change", handleDarkChange);
    lightQuery.addEventListener("change", handleLightChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      contrastQuery.removeEventListener("change", handleContrastChange);
      darkQuery.removeEventListener("change", handleDarkChange);
      lightQuery.removeEventListener("change", handleLightChange);
    };
  }, []);

  const getDuration = (duration: number): number => {
    return prefersReducedMotion ? 0 : duration;
  };

  const getTransition = (transition: string): string => {
    return prefersReducedMotion ? "none" : transition;
  };

  return {
    prefersReducedMotion,
    prefersHighContrast,
    prefersDark,
    prefersLight,
    getDuration,
    getTransition,
  };
}

export default useAccessibility;
