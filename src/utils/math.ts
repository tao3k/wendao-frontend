/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

/**
 * Check if a value is within bounds
 */
export const inBounds = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};
