import { AcademicTopology } from '../types';

/**
 * 💎 Calculate Topological Relationships for a given Node ID
 */
export const getRelationships = (id: string, topology: AcademicTopology) => {
  const incoming = topology.links
    .filter(l => l.to === id)
    .map(l => l.from);
    
  const outgoing = topology.links
    .filter(l => l.from === id)
    .map(l => l.to);

  return { incoming, outgoing };
};
