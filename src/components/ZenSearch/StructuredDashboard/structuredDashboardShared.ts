import type { UiLocale } from '../../SearchBar/types';

export interface StructuredAnchorDisplay {
  label: string;
  value: string;
  query?: string;
}

export interface StructuredLayerNavItem {
  id: string;
  label: string;
}

export type StructuredAnchorSide = 'incoming' | 'outgoing' | null;

export const STRUCTURED_LAYER_NAV: StructuredLayerNavItem[] = [
  { id: 'structured-slot-topology', label: 'I. Topological Identity' },
  { id: 'structured-slot-anatomy', label: 'II. Entity Anatomy' },
  { id: 'structured-slot-fragments', label: 'III. Multi-slot Fragments' },
  { id: 'structured-slot-relations', label: 'IV. Relational Projection' },
];

export function formatStructuredSideBadge(
  locale: UiLocale,
  side: Exclude<StructuredAnchorSide, null>
): string {
  if (locale === 'zh') {
    return side === 'incoming' ? '前' : '后';
  }

  return side === 'incoming' ? 'In' : 'Out';
}

export function formatStructuredPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 3) {
    return path;
  }

  return `${segments[0]}/${segments[1]}/.../${segments[segments.length - 1]}`;
}

export function resolveFocusedAnchor(
  focusedAnchorId: string | null,
  centerAnchor: StructuredAnchorDisplay | null,
  pathTrail: Array<{ label: string; value: string; query?: string }>,
  neighbors: Array<{ id: string; label: string; path: string; query?: string }>
): StructuredAnchorDisplay | null {
  if (!focusedAnchorId) {
    return null;
  }

  if (centerAnchor && focusedAnchorId === centerAnchor.value) {
    return centerAnchor;
  }

  const trailAnchor = pathTrail.find((item) => item.value === focusedAnchorId);
  if (trailAnchor) {
    return {
      label: trailAnchor.label,
      value: trailAnchor.value,
      query: trailAnchor.query,
    };
  }

  const neighborAnchor = neighbors.find((item) => item.id === focusedAnchorId);
  if (neighborAnchor) {
    return {
      label: neighborAnchor.label,
      value: neighborAnchor.path,
      query: neighborAnchor.query ?? neighborAnchor.path,
    };
  }

  return centerAnchor;
}

export function resolveFocusedAnchorSide(
  focusedAnchorId: string | null,
  centerAnchor: StructuredAnchorDisplay | null,
  incoming: Array<{ id: string }>,
  outgoing: Array<{ id: string }>
): StructuredAnchorSide {
  if (!focusedAnchorId || focusedAnchorId === centerAnchor?.value) {
    return null;
  }

  if (incoming.some((node) => node.id === focusedAnchorId)) {
    return 'incoming';
  }

  if (outgoing.some((node) => node.id === focusedAnchorId)) {
    return 'outgoing';
  }

  return null;
}
