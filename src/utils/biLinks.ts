/**
 * 💎 Sovereign Bi-Link Parser
 * Converts [[Anchor]] syntax into structured data or HTML strings.
 */
export const parseBiLinks = (text: string): string => {
  return text.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
    return `<span class="bilink" data-anchor="${p1}">${match}</span>`;
  });
};

/**
 * 💎 Confidence Extractor (JS Native Regex)
 */
export const extractConfidence = (text: string): number | null => {
  // Use 'i' flag for case-insensitive matching in JavaScript
  const re = /omega_confidence\s*:\s*([0-9]*\.?[0-9]+)/i;
  const match = text.match(re);
  return match ? parseFloat(match[1]) : null;
};
