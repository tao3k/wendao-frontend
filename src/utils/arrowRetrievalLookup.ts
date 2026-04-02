import { tableFromArrays, type Table } from 'apache-arrow';

export interface ArrowRetrievalChunkLike {
  ownerId: string;
  chunkId: string;
  semanticType: string;
  fingerprint: string;
  tokenEstimate: number;
  displayLabel?: string;
  excerpt?: string;
  lineStart?: number;
  lineEnd?: number;
  surface?: string;
}

export interface ArrowRetrievalLookup<T extends ArrowRetrievalChunkLike> {
  table: Table;
  rowCount: number;
  findByOwner(ownerId: string): T | undefined;
  findByOwnerSurface(ownerId: string, surface: string): T | undefined;
  collectBySurfaceInRange(surface: string, lineStart: number, lineEnd: number): T[];
  collectBySemanticTypeInRange(semanticType: string, lineStart: number, lineEnd: number): T[];
}

export function buildArrowRetrievalLookup<T extends ArrowRetrievalChunkLike>(
  atoms: readonly T[]
): ArrowRetrievalLookup<T> {
  const table = tableFromArrays({
    ownerId: atoms.map((atom) => atom.ownerId),
    chunkId: atoms.map((atom) => atom.chunkId),
    semanticType: atoms.map((atom) => atom.semanticType),
    fingerprint: atoms.map((atom) => atom.fingerprint),
    tokenEstimate: Int32Array.from(atoms.map((atom) => atom.tokenEstimate)),
    displayLabel: atoms.map((atom) => atom.displayLabel ?? ''),
    excerpt: atoms.map((atom) => atom.excerpt ?? ''),
    lineStart: Int32Array.from(atoms.map((atom) => atom.lineStart ?? -1)),
    lineEnd: Int32Array.from(atoms.map((atom) => atom.lineEnd ?? -1)),
    surface: atoms.map((atom) => atom.surface ?? ''),
  });

  const ownerIdVector = table.getChild('ownerId');
  const surfaceVector = table.getChild('surface');
  const semanticTypeVector = table.getChild('semanticType');
  const lineStartVector = table.getChild('lineStart');
  const lineEndVector = table.getChild('lineEnd');
  const ownerIndex = new Map<string, number>();
  const ownerSurfaceIndex = new Map<string, number>();
  const surfaceRangeIndex = new Map<string, number[]>();
  const semanticTypeRangeIndex = new Map<string, number[]>();

  const readString = (index: number, field: 'ownerId' | 'surface' | 'semanticType'): string => {
    const vector =
      field === 'ownerId' ? ownerIdVector : field === 'surface' ? surfaceVector : semanticTypeVector;
    return String(vector?.get(index) ?? '');
  };

  const readLine = (index: number, field: 'lineStart' | 'lineEnd'): number => {
    const vector = field === 'lineStart' ? lineStartVector : lineEndVector;
    const value = Number(vector?.get(index) ?? -1);
    return Number.isFinite(value) ? value : -1;
  };

  for (let index = 0; index < table.numRows; index += 1) {
    const ownerId = readString(index, 'ownerId');
    const surface = readString(index, 'surface');
    const semanticType = readString(index, 'semanticType');

    if (ownerId && !ownerIndex.has(ownerId)) {
      ownerIndex.set(ownerId, index);
    }

    if (ownerId && surface) {
      const ownerSurfaceKey = `${ownerId}:${surface}`;
      if (!ownerSurfaceIndex.has(ownerSurfaceKey)) {
        ownerSurfaceIndex.set(ownerSurfaceKey, index);
      }
    }

    if (surface) {
      const surfaceRows = surfaceRangeIndex.get(surface);
      if (surfaceRows) {
        surfaceRows.push(index);
      } else {
        surfaceRangeIndex.set(surface, [index]);
      }
    }

    if (semanticType) {
      const semanticRows = semanticTypeRangeIndex.get(semanticType);
      if (semanticRows) {
        semanticRows.push(index);
      } else {
        semanticTypeRangeIndex.set(semanticType, [index]);
      }
    }
  }

  const sortIndices = (indices: number[]) => {
    indices.sort((left, right) => {
      const leftStart = readLine(left, 'lineStart');
      const rightStart = readLine(right, 'lineStart');
      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }

      return readLine(left, 'lineEnd') - readLine(right, 'lineEnd');
    });
  };

  for (const indices of surfaceRangeIndex.values()) {
    sortIndices(indices);
  }

  for (const indices of semanticTypeRangeIndex.values()) {
    sortIndices(indices);
  }

  const readAtom = (index: number | undefined): T | undefined =>
    typeof index === 'number' && index >= 0 ? atoms[index] : undefined;

  return {
    table,
    rowCount: table.numRows,
    findByOwner(ownerId: string): T | undefined {
      return readAtom(ownerIndex.get(ownerId));
    },
    findByOwnerSurface(ownerId: string, surface: string): T | undefined {
      return readAtom(ownerSurfaceIndex.get(`${ownerId}:${surface}`));
    },
    collectBySurfaceInRange(surface: string, lineStart: number, lineEnd: number): T[] {
      const indices = surfaceRangeIndex.get(surface) ?? [];
      return indices
        .filter((index) => {
          const start = readLine(index, 'lineStart');
          const end = readLine(index, 'lineEnd');
          return start >= lineStart && end <= lineEnd;
        })
        .map((index) => atoms[index] as T);
    },
    collectBySemanticTypeInRange(semanticType: string, lineStart: number, lineEnd: number): T[] {
      const indices = semanticTypeRangeIndex.get(semanticType) ?? [];
      return indices
        .filter((index) => {
          const start = readLine(index, 'lineStart');
          const end = readLine(index, 'lineEnd');
          return start >= lineStart && end <= lineEnd;
        })
        .map((index) => atoms[index] as T);
    },
  };
}
