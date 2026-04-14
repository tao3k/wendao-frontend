# Panel Runtime Map

:PROPERTIES:
:ID: qianji-studio-panel-map
:PARENT: [[index]]
:TAGS: feature, panels, runtime, ui
:STATUS: ACTIVE
:END:

## Overview

This page maps each Qianji Studio panel to its runtime responsibility and to the Wendao surface it depends on.

## Panel Ledger

### FileTree

Responsibilities:

- Present indexed roots and explorer state.
- Surface whether data is live or fallback.
- Initiate the canonical file hydration path.

Gateway dependencies:

- `/api/ui/capabilities`
- `/api/vfs/scan`
- `/api/vfs/cat`

### MainView

Responsibilities:

- Host the `Topology`, `References`, `Graph`, and `Content` tabs.
- Resolve explicit tab requests coming from search and graph actions.
- Keep the focused file, relationships, and reader state coherent.

Gateway dependencies:

- Indirect; it depends on hydrated state prepared by `App`.

### ZenSearch

Responsibilities:

- Blend knowledge, symbols, AST definitions, and references.
- Branch each result into `Open`, `Graph`, `Refs`, and `Definition` actions.
- Normalize result actions into the shared file selection pipeline.
- Canonicalize every selection path before it reaches VFS or graph lookup; if a selection arrives without `projectName`, `App` resolves the bare path through the gateway first so the hydrated path still becomes project-scoped.
- Hide graph actions for non-note results such as code and attachments.
- Keep the SearchBar compatibility shell organized as a compact dropdown filter so scope and sort stay hidden until requested, while the side drawer width stays clamped responsively so long status text and the `code` scope remain visible on narrow panes instead of being covered by the preview drawer.
- Keep the Zen Search shell mounted after first open as a persistent overlay, and toggle its visibility through `isOpen` so the workspace remains mounted behind it instead of being torn down on every search transition.
- Project the active selection into the Structured Intelligence Dashboard on the right side of Zen Search.
- Project code-backed results through a dedicated `StructuredCodeInspector` wrapper into a single-column AST waterfall with a numbered file-path prelude, a compact declaration identity lane, structured signature rows, declaration/block/symbol/anchor retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and explicit `Pivot declaration` / `Pivot block` / `Pivot symbol` / `Pivot anchor` plus `Copy for RAG` actions on declaration, logic-block, symbol, and ranked anchor atoms using the backend code-AST analysis contract and shared Shiki-backed syntax highlighting for code-heavy surfaces, while keeping the raw DirectReader preview reserved for non-code results and rendering markdown-backed DirectReader content through `MarkdownWaterfall` with a top identity card centered on `Title`, `Tags`, and `Linked`, plus section-level `Copy for RAG` / `Pivot section` anchors and compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`) for atomic retrieval and agent pivots.

Gateway dependencies:

- `/api/search`
- `/api/search/autocomplete`
- `/api/search/symbols`
- `/api/search/ast`
- `/api/search/references`
- `/api/analysis/code-ast`

### GraphView

Responsibilities:

- Render neighbor graphs for the focused file.
- Return graph node selections to the shared file hydration path.
- Treat graph node ids as canonical graph centers, not workspace-local file paths.

Gateway dependencies:

- `/api/graph/neighbors/<path>`

### DirectReader

Responsibilities:

- Render rich text when the target is document-oriented.
- Keep Markdown in rich mode by default when line metadata is present.
- Render markdown-backed documents through `MarkdownWaterfall` inside a dedicated ZenSearch markdown reading tray with a document identity card that foregrounds `Title`, `Tags`, and `Linked` ahead of compact heading-based section index cards, while preserving tables, math, mermaid, bi-links, and fenced code blocks inside nested rich slots with shared slot headers within the waterfall sections, and exposing section-level `Copy for RAG` / `Pivot section` actions plus compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`) as lightweight atomic anchors.
- Render line-numbered source focus for non-Markdown files and for Markdown when the operator selects source mode.
- Keep bi-link navigation available in both modes.
- Keep the raw content viewer out of the structured code-AST dashboard so code-backed results stay single-column waterfall-first, with `StructuredCodeInspector` acting as the dedicated code-result shell.

Gateway dependencies:

- Indirect; it depends on hydrated file content and optional source focus metadata.

### DiagramWindow

Responsibilities:

- Render diagram-centric projections for BPMN and Mermaid-oriented navigation.
- Keep embedded Mermaid blocks as the first-priority diagram source.
- Only advertise Mermaid layout switches when the active source can first normalize
  into the bounded frontend graph model; supported `flowchart` and `state`
  sources can then compile alternate flow directions plus derived `Sequence`
  and `State` views from that shared graph, supported `sequenceDiagram`
  sources can compile flowchart directions plus a derived `State` view,
  supported `erDiagram` sources can compile flowchart directions, and
  unsupported Mermaid control flow stays on the original single-source render
  path.
- For markdown-backed and code-backed files without embedded Mermaid, prefer `/api/analysis/markdown` or `/api/analysis/code-ast` `nodes/edges` as the diagram input, fall back to renderable projection `source` only when no bounded graph can be built, and otherwise use the local markdown outline fallback or the empty-state card; do not mirror `MarkdownWaterfall` into the diagram tab.

Gateway dependencies:

- `/api/analysis/markdown`

### Structured Intelligence Dashboard

Responsibilities:

- Render the selected result as a structured projection rather than a single linear preview.
- Present a dashboard header so the pane reads as an intelligence surface, not a plain previewer.
- Derive topology, fragment, and relational layers from the current preview payload.
- Render a local connectome mini-map for the active selection using the current graph neighbors, with a side-aware focus badge that highlights the active incoming/outgoing lane and mirrors the same compact side badge in the neighboring path trail and top active-anchor banner, whose path display is compacted while the full path remains available in the tooltip; keep the mini-map viewport and node spacing compact so the topology layer stays readable inside the balanced grid.
- Keep the dashboard header compact by placing the eyebrow/title pair and active anchor on the first row on wide screens, then stacking that row above the subtitle on narrower screens.
- Keep the four structured layers in a balanced two-row grid with slightly tighter padding so the dashboard reads as a symmetric projection surface rather than a stacked document view, and expose each layer as a named landmark region with a compact header layer index for accessibility and structured navigation.
- Surface a saliency view when the selected result exposes a meaningful excerpt.
- Expose structured anchors that can pivot the Zen query state without leaving Zen mode.

Gateway dependencies:

- Indirect; it consumes the current Zen preview payload and graph neighbors already fetched by the preview pipeline.

## Shared Selection Principle

Tree, search, and graph are not separate navigation systems. They are entry points into the same file-selection runtime.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[01_core/104_runtime_glossary]], [[01_core/107_docs_graph_map]], [[03_features/201_indexed_roots_and_vfs]], [[03_features/202_topology_and_graph_navigation]], [[03_features/203_semantic_search_actions]], [[03_features/204_gateway_api_contracts]], [[03_features/207_panel_handbook]], [[03_features/208_navigation_examples]]
:END:
