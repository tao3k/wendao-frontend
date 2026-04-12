import { detectMermaidDialect, type MermaidDialect } from "../mermaidRuntime";
import {
  compileMermaidLayoutGraph,
  compileMermaidSequenceGraph,
  compileMermaidStateGraph,
  getMermaidFlowLayoutDirections,
  parseMermaidLayoutGraph,
  type MermaidFlowLayoutDirection,
  type MermaidLayoutGraph,
} from "./mermaidLayoutGraph";

export interface MermaidLayoutVariant {
  source: string;
  label: string;
}

function describeMermaidDialectLabel(dialect: MermaidDialect): string {
  switch (dialect) {
    case "flowchart":
      return "Flowchart";
    case "state":
      return "State";
    case "sequence":
      return "Sequence";
    case "class":
      return "Class";
    case "er":
      return "ER";
    case "xychart":
      return "XY Chart";
    default:
      return "Diagram";
  }
}

function describeFlowLayoutLabel(direction: MermaidFlowLayoutDirection): string {
  switch (direction) {
    case "TD":
      return "Top to Bottom";
    case "LR":
      return "Left to Right";
    case "RL":
      return "Right to Left";
    case "BT":
      return "Bottom to Top";
  }
}

function buildGraphLayoutVariants(
  graph: MermaidLayoutGraph,
  labelSuffix: string,
  preferredSource?: string | null,
): MermaidLayoutVariant[] | null {
  const variants: MermaidLayoutVariant[] = [];
  const seenSources = new Set<string>();
  const pushVariant = (label: string, nextSource: string | null): void => {
    const trimmed = nextSource?.trim() ?? "";
    if (!trimmed || seenSources.has(trimmed)) {
      return;
    }
    seenSources.add(trimmed);
    variants.push({
      source: trimmed,
      label: `${label}${labelSuffix}`,
    });
  };

  if (graph.sourceDialect === "flowchart") {
    pushVariant(
      describeFlowLayoutLabel(graph.preferredFlowDirection),
      preferredSource ?? compileMermaidLayoutGraph(graph, graph.preferredFlowDirection),
    );
    getMermaidFlowLayoutDirections().forEach((direction) => {
      if (direction === graph.preferredFlowDirection) {
        return;
      }

      pushVariant(describeFlowLayoutLabel(direction), compileMermaidLayoutGraph(graph, direction));
    });
    pushVariant("Sequence", compileMermaidSequenceGraph(graph));
    pushVariant("State", compileMermaidStateGraph(graph));
    return variants;
  }

  if (graph.sourceDialect === "state") {
    pushVariant("State", preferredSource ?? compileMermaidStateGraph(graph));
    getMermaidFlowLayoutDirections().forEach((direction) => {
      pushVariant(describeFlowLayoutLabel(direction), compileMermaidLayoutGraph(graph, direction));
    });
    pushVariant("Sequence", compileMermaidSequenceGraph(graph));
    return variants;
  }

  if (graph.sourceDialect === "sequence") {
    pushVariant("Sequence", preferredSource ?? compileMermaidSequenceGraph(graph));
    getMermaidFlowLayoutDirections().forEach((direction) => {
      pushVariant(describeFlowLayoutLabel(direction), compileMermaidLayoutGraph(graph, direction));
    });
    pushVariant("State", compileMermaidStateGraph(graph));
    return variants;
  }

  if (graph.sourceDialect === "er") {
    pushVariant("ER", preferredSource ?? null);
    getMermaidFlowLayoutDirections().forEach((direction) => {
      pushVariant(describeFlowLayoutLabel(direction), compileMermaidLayoutGraph(graph, direction));
    });
    return variants;
  }

  return variants;
}

export function buildMermaidLayoutVariantsFromGraphs(
  mermaidGraphs: MermaidLayoutGraph[],
): MermaidLayoutVariant[] {
  return mermaidGraphs.flatMap((graph, graphIndex) => {
    const labelSuffix = mermaidGraphs.length > 1 ? ` ${graphIndex + 1}` : "";
    return buildGraphLayoutVariants(graph, labelSuffix) ?? [];
  });
}

export function buildMermaidLayoutVariants(mermaidSources: string[]): MermaidLayoutVariant[] {
  return mermaidSources.flatMap((source, sourceIndex) => {
    const trimmed = source.trim();
    const dialect = detectMermaidDialect(trimmed);
    const labelSuffix = mermaidSources.length > 1 ? ` ${sourceIndex + 1}` : "";
    if (
      dialect === "flowchart" ||
      dialect === "state" ||
      dialect === "sequence" ||
      dialect === "er"
    ) {
      const graph = parseMermaidLayoutGraph(trimmed);
      const graphVariants = graph ? buildGraphLayoutVariants(graph, labelSuffix, trimmed) : null;
      if (graphVariants) {
        return graphVariants;
      }
    }

    return [
      {
        source: trimmed,
        label: `${describeMermaidDialectLabel(dialect)}${labelSuffix}`,
      },
    ];
  });
}
