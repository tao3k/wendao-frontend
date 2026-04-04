import type { MermaidInlineDialect } from "./provider";

export interface MermaidBakeoffFixture {
  readonly id: string;
  readonly source: string;
  readonly expectedDialect: MermaidInlineDialect;
  readonly expectedCompactFlow: "pass" | "fail";
}

export const MERMAID_BAKEOFF_FIXTURES: readonly MermaidBakeoffFixture[] = [
  {
    id: "flowchart-basic",
    expectedDialect: "flowchart",
    expectedCompactFlow: "pass",
    source: "graph TD\nA[Start] --> B[Finish]",
  },
  {
    id: "flowchart-lr-chain",
    expectedDialect: "graph",
    expectedCompactFlow: "pass",
    source: "flowchart LR\nA[Source] --> B[Transform]\nB --> C[Sink]",
  },
  {
    id: "state-basic",
    expectedDialect: "state",
    expectedCompactFlow: "pass",
    source: "stateDiagram-v2\n[*] --> Idle\nIdle --> Running",
  },
  {
    id: "state-alias",
    expectedDialect: "state",
    expectedCompactFlow: "pass",
    source: "stateDiagram-v2\nstate Ready : Ready to start\nReady --> Running",
  },
  {
    id: "flowchart-subgraph",
    expectedDialect: "flowchart",
    expectedCompactFlow: "pass",
    source: "graph TD\nsubgraph Cluster\nA --> B\nend\nB --> C",
  },
  {
    id: "flowchart-decision",
    expectedDialect: "flowchart",
    expectedCompactFlow: "pass",
    source: "graph TD\nA --> B{Decision}\nB --> C[Yes]\nB --> D[No]",
  },
  {
    id: "state-composite",
    expectedDialect: "state",
    expectedCompactFlow: "pass",
    source: "stateDiagram-v2\nstate Outer {\nIdle --> Running\n}\n[*] --> Outer",
  },
] as const;
