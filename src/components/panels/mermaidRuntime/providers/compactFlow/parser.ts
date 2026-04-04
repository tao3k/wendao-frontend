type CompactFlowDirection = "TD" | "TB" | "LR" | "RL" | "BT";

export interface CompactFlowNode {
  readonly id: string;
  readonly label: string;
  readonly shape: "rect" | "diamond" | "state";
}

export interface CompactFlowEdge {
  readonly source: string;
  readonly target: string;
}

export interface CompactFlowGroup {
  readonly id: string;
  readonly label: string;
  readonly nodeIds: readonly string[];
}

export interface CompactFlowDiagram {
  readonly dialect: "flowchart" | "state";
  readonly direction: CompactFlowDirection;
  readonly nodes: readonly CompactFlowNode[];
  readonly edges: readonly CompactFlowEdge[];
  readonly groups: readonly CompactFlowGroup[];
}

function mergeCompactFlowNode(
  nodes: Map<string, CompactFlowNode>,
  candidate: CompactFlowNode,
): void {
  const existing = nodes.get(candidate.id);
  if (!existing) {
    nodes.set(candidate.id, candidate);
    return;
  }

  const existingIsGenericRect = existing.shape === "rect" && existing.label === existing.id;
  const candidateIsGenericRect = candidate.shape === "rect" && candidate.label === candidate.id;

  if (existingIsGenericRect && !candidateIsGenericRect) {
    nodes.set(candidate.id, candidate);
    return;
  }

  if (!existingIsGenericRect && candidateIsGenericRect) {
    return;
  }

  nodes.set(candidate.id, candidate);
}

function normalizeNodeToken(token: string): CompactFlowNode {
  const trimmed = token.trim();

  if (trimmed === "[*]") {
    return {
      id: "state_pseudonode",
      label: "[*]",
      shape: "state",
    };
  }

  const decisionMatch = trimmed.match(/^([A-Za-z0-9_-]+)\{(.+)\}$/);
  if (decisionMatch) {
    return {
      id: decisionMatch[1]!,
      label: decisionMatch[2]!.trim(),
      shape: "diamond",
    };
  }

  const bracketMatch = trimmed.match(/^([A-Za-z0-9_-]+)\[(.+)\]$/);
  if (bracketMatch) {
    return {
      id: bracketMatch[1]!,
      label: bracketMatch[2]!.trim(),
      shape: "rect",
    };
  }

  const quotedStateMatch = trimmed.match(/^state\s+"([^"]+)"\s+as\s+([A-Za-z0-9_-]+)$/i);
  if (quotedStateMatch) {
    return {
      id: quotedStateMatch[2]!,
      label: quotedStateMatch[1]!,
      shape: "state",
    };
  }

  return {
    id: trimmed,
    label: trimmed,
    shape: "rect",
  };
}

function normalizeStateLine(line: string): string {
  const aliasMatch = line.match(/^state\s+([A-Za-z0-9_-]+)\s*:\s*(.+)$/i);
  if (!aliasMatch) {
    return line;
  }

  return `${aliasMatch[1]}[${aliasMatch[2]}]`;
}

function assertCompactFlowSupportedLine(line: string, dialect: "flowchart" | "state"): void {
  const isStateCompositeStart =
    dialect === "state" && /^state\s+[A-Za-z0-9_-]+\s*\{$/i.test(line.trim());
  const isStateCompositeEnd = dialect === "state" && line.trim() === "}";

  if (dialect === "state" && /[{}]/.test(line) && !isStateCompositeStart && !isStateCompositeEnd) {
    throw new Error("compact-flow does not support decision or composite-state syntax");
  }
}

export function parseCompactFlow(source: string): CompactFlowDiagram {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  if (lines.length === 0) {
    throw new Error("Empty Mermaid diagram");
  }

  const header = lines[0]!;
  let dialect: "flowchart" | "state" = "flowchart";
  let direction: CompactFlowDirection = "TD";

  const flowchartMatch = header.match(/^(?:graph|flowchart)\s+(TD|TB|LR|RL|BT)$/i);
  const stateMatch = header.match(/^stateDiagram(?:-v2)?$/i);

  if (flowchartMatch) {
    dialect = "flowchart";
    direction = flowchartMatch[1]!.toUpperCase() as CompactFlowDirection;
  } else if (stateMatch) {
    dialect = "state";
    direction = "TD";
  } else {
    throw new Error(`Unsupported compact-flow header: ${header}`);
  }

  const nodes = new Map<string, CompactFlowNode>();
  const edges: CompactFlowEdge[] = [];
  const groups: CompactFlowGroup[] = [];
  let activeGroup: { id: string; label: string; nodeIds: string[] } | null = null;
  let groupSequence = 0;

  for (const rawLine of lines.slice(1)) {
    assertCompactFlowSupportedLine(rawLine, dialect);

    const line = dialect === "state" ? normalizeStateLine(rawLine) : rawLine;

    const stateCompositeMatch =
      dialect === "state" ? line.match(/^state\s+([A-Za-z0-9_-]+)\s*\{$/i) : null;
    if (stateCompositeMatch) {
      if (activeGroup) {
        throw new Error("compact-flow only supports single-layer composite syntax");
      }

      const label = stateCompositeMatch[1]!.trim();
      activeGroup = {
        id: `compact_group_${groupSequence}`,
        label,
        nodeIds: [],
      };
      groupSequence += 1;
      continue;
    }

    const subgraphMatch = dialect === "flowchart" ? line.match(/^subgraph\s+(.+)$/i) : null;
    if (subgraphMatch) {
      if (activeGroup) {
        throw new Error("compact-flow only supports single-layer composite syntax");
      }

      const label = subgraphMatch[1]!.trim();
      activeGroup = {
        id: `compact_group_${groupSequence}`,
        label,
        nodeIds: [],
      };
      groupSequence += 1;
      continue;
    }

    if (line === "end" || (dialect === "state" && line === "}")) {
      if (activeGroup) {
        groups.push({
          id: activeGroup.id,
          label: activeGroup.label,
          nodeIds: activeGroup.nodeIds,
        });
        activeGroup = null;
      }
      continue;
    }

    if (/^direction\s+/i.test(line) || line === "{" || line === "}") {
      continue;
    }

    const edgeMatch = line.match(/^(.+?)\s*-->\s*(.+)$/);
    if (!edgeMatch) {
      continue;
    }

    const sourceNode = normalizeNodeToken(edgeMatch[1]!);
    const targetNode = normalizeNodeToken(edgeMatch[2]!);

    mergeCompactFlowNode(nodes, sourceNode);
    mergeCompactFlowNode(nodes, targetNode);
    if (activeGroup) {
      if (!activeGroup.nodeIds.includes(sourceNode.id)) {
        activeGroup.nodeIds.push(sourceNode.id);
      }
      if (!activeGroup.nodeIds.includes(targetNode.id)) {
        activeGroup.nodeIds.push(targetNode.id);
      }
    }
    edges.push({
      source: sourceNode.id,
      target: targetNode.id,
    });
  }

  if (nodes.size === 0 || edges.length === 0) {
    throw new Error("compact-flow only supports simple arrow-connected diagrams");
  }

  return {
    dialect,
    direction,
    nodes: Array.from(nodes.values()),
    edges,
    groups,
  };
}
