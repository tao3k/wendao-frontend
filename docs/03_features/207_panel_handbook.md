# Panel Handbook

:PROPERTIES:
:ID: qianji-studio-panel-handbook
:PARENT: [[index]]
:TAGS: feature, panels, handbook, runtime
:STATUS: ACTIVE
:END:

## Overview

This handbook describes the practical role of each major panel in Qianji Studio and the operating assumptions that keep the frontend aligned with the Wendao Studio gateway.

## FileTree

Purpose:

- Entry point for indexed roots and file-based navigation.

Operator notes:

- Treat the explorer as a gateway reflection, not as a separate source of truth.
- A file selection from the tree should always populate both content and references through the shared hydration path.

## ZenSearch

Purpose:

- Full-screen semantic search shell across knowledge, symbols, AST, and references.

Operator notes:

- Zen Search owns the primary full-screen search workspace.
- The preview pane should update as the operator moves the selection with the keyboard or mouse hover.
- The right pane is a Structured Intelligence Dashboard that projects non-code results into topology, fragments, and relational layers, while code-backed results render through a dedicated `StructuredCodeInspector` wrapper into a single-column AST waterfall with a numbered file-path prelude and a compact declaration identity lane. Markdown-backed DirectReader content uses `MarkdownWaterfall` with a document identity card that foregrounds `Title`, `Tags`, and `Linked` before the heading-based section cards.
- The dashboard should label itself as a structured projection surface, not as a generic previewer.
- The first topology layer should include a local connectome mini-map so the result is seen as part of a small network, not an isolated node.
- The local connectome mini-map should expose incoming/outgoing side toggles, highlight the toggle that matches the active anchor side, keep a focused-anchor chip visible while a node remains selected, and stay synchronized with the neighboring text-anchor list, compact path trail side badge, compact two-line top header active-anchor banner whose path display is shortened while the full path remains in the tooltip, responsive stacking on narrow screens, a compact topology viewport, balanced two-row dashboard spacing, named landmark regions for the four structured layers, and a compact header layer index for quick jumps.
- When available, the dashboard should render a saliency view before lower-signal fragments so the most informative excerpt is visible first.
- Code-backed results should render through a dedicated `StructuredCodeInspector` wrapper into a single-column AST waterfall with a numbered file-path prelude, a compact declaration identity lane, and declaration/block retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`) using the backend code-AST analysis contract rather than a plain text preview.
- Markdown-backed results should render through `MarkdownWaterfall` inside a dedicated ZenSearch markdown reading tray with a document identity card that foregrounds `Title`, `Tags`, and `Linked`, compact heading-based section index cards, section-level `Copy for RAG` / `Pivot section` actions, compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and nested rich slots for tables, math, mermaid, bi-links, and fenced code blocks with shared slot headers.
- The AST waterfall should surface declaration identity, structured signature parts, explicit parameter and return lanes, a single vertical validation/execution/return block stack, grouped symbol overlays, declaration/block retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and shared Shiki-backed generic syntax highlighting as pivotable structured surfaces, while the raw content preview remains reserved for non-code results.
- `Enter` confirms the current result and opens it in the main workspace.
- `Esc` exits Zen Search and returns to the prior workspace state.
- `Graph` should only be offered for graph-backed note targets.
- Zen Search must normalize workspace-local paths before calling VFS or graph endpoints. If a bare relative selection reaches App without `projectName`, App should resolve it through the gateway before hydration so the final VFS / graph request is still project-scoped.
- For code-backed results, the dashboard should prefer code-AST topology when a note graph is unavailable.
- Structured chips and anchors inside the dashboard may pivot the query, but they do not replace the shared selection pipeline.
- `Definition` should resolve through the native `/api/search/definition` contract and follow backend-ranked source location metadata.
- The legacy modal `SearchBar` remains an implementation detail and should not be used as the public app entrypoint.
- The SearchBar wrapper keeps its scope and sort controls behind a compact dropdown filter, and no longer exposes the old preview drawer surface.
- The Zen Search window stays mounted after the first open and toggles visibility through an `isOpen` gate, so the workspace remains mounted behind the overlay instead of being torn down on each mode change.

## MainView

Purpose:

- Tab host and coordination shell for `Topology`, `References`, `Graph`, and `Content`.

Operator notes:

- `requestedTab` is the control plane for cross-surface navigation.
- MainView should not own data fetching logic; it should render hydrated state passed down from `App`.

## GraphView

Purpose:

- Focused graph visualization of file-level neighborhood data.

Operator notes:

- Node clicks are not terminal interactions; they are new entry points into the shared hydration path.
- Graph data should stay live and path-scoped to the selected file.
- Graph nodes from non-note sources are out of scope for the current graph index and should not surface as selectable graph entries.

## DirectReader

- DirectReader uses source-focused inspection for line-by-line work, but markdown documents now default to `MarkdownWaterfall` for structured reading and only fall back to source mode when the operator explicitly toggles it.

Purpose:

- Final rendering surface for both document-oriented and source-oriented content.

Operator notes:

- Use rich mode when there is no source focus metadata.
- For Markdown with line metadata, keep rich mode as default and use the explicit source toggle when exact line inspection is needed.
- For non-Markdown with line metadata, open source mode directly.
- Normalize studio metadata drawers (`:PROPERTIES:`, `:RELATIONS:`, `:FOOTER:`) out of rich mode so document prose stays readable.
- Render `:OBSERVE:` directives as readable observation blocks in rich mode.
- Preserve bi-link behavior in both modes.
- Use the shared Shiki-backed syntax highlighter for fenced code blocks and source-mode line inspection across supported languages, and keep unsupported languages safely plain.

## DiagramWindow

Purpose:

- Visual diagram surface for BPMN and Mermaid-oriented navigation.

Operator notes:

- Keep BPMN rendering native when the selected file is BPMN XML.
- Keep embedded Mermaid blocks as first-priority diagram sources.
- For Markdown without embedded Mermaid, hydrate Mermaid projections from `/api/analysis/markdown` when available, and otherwise render `MarkdownWaterfall` so the panel stays structured instead of collapsing to an empty-state card; keep the identity card anchored on `Title`, `Tags`, and `Linked`, the section headers as compact index strips, the section-level atomic actions and retrieval metadata available for RAG / agent pivots, and the code/table/mermaid content inside nested slots rather than as flat prose blocks.

## PropertyEditor and Status Surfaces

Purpose:

- Secondary observability surfaces around the current selection.

Operator notes:

- These surfaces should reflect the canonical `selectedFile` and `relationships` state rather than recomputing their own view of runtime state.

:RELATIONS:
:LINKS: [[03_features/205_panel_runtime_map]], [[03_features/206_testing_and_validation]], [[06_roadmap/401_semantic_studio_runtime]]
:END:
