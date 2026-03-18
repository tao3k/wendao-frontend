import type { AcademicLink, AcademicNode, AcademicTopology } from '../types';

export type TopologyPosition = [number, number, number];

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizedScalar(hash: number, shift: number): number {
  return (((hash >>> shift) & 0xffff) / 0xffff) * 2 - 1;
}

export function deterministicNodePosition(
  nodeId: string,
  index: number,
  count: number,
  radiusBase: number = 20
): TopologyPosition {
  const safeCount = Math.max(count, 1);
  const radius = Math.max(radiusBase, safeCount * 4);
  const hash = stableHash(nodeId);
  const orbitAngle = ((hash % 360) * Math.PI) / 180;
  const angle = orbitAngle + (index / safeCount) * Math.PI * 2;
  const radialJitter = normalizedScalar(hash, 8) * 6;
  const verticalJitter = normalizedScalar(hash, 16) * 8;

  return [
    Math.cos(angle) * (radius + radialJitter),
    verticalJitter,
    Math.sin(angle) * (radius + radialJitter),
  ];
}

export function buildPositionCache(
  nodes: Array<Pick<AcademicNode, 'id' | 'position'>>
): Map<string, TopologyPosition> {
  return new Map(
    nodes
      .filter(
        (
          node
        ): node is Pick<AcademicNode, 'id'> & {
          position: TopologyPosition;
        } => Array.isArray(node.position) && node.position.length === 3
      )
      .map((node) => [
        node.id,
        [node.position[0], node.position[1], node.position[2]] as TopologyPosition,
      ])
  );
}

export function mergeTopologyPositions(
  topology: AcademicTopology,
  cachedPositions: ReadonlyMap<string, TopologyPosition>
): AcademicTopology {
  const total = topology.nodes.length;

  return {
    links: topology.links.map((link) => ({ ...link })),
    nodes: topology.nodes.map((node, index) => {
      const resolvedPosition =
        cachedPositions.get(node.id) ??
        node.position ??
        deterministicNodePosition(node.id, index, total);

      return {
        ...node,
        position: [
          resolvedPosition[0],
          resolvedPosition[1],
          resolvedPosition[2],
        ] as TopologyPosition,
      };
    }),
  };
}

export function topologyShapeSignature(
  nodes: Array<Pick<AcademicNode, 'id'>>,
  links: Array<Pick<AcademicLink, 'from' | 'to'>>
): string {
  const nodeSignature = nodes.map((node) => node.id).join('|');
  const linkSignature = links
    .map((link) => `${link.from}->${link.to}`)
    .sort()
    .join('|');
  return `${nodeSignature}::${linkSignature}`;
}
