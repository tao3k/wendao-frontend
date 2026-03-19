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

## SearchBar

Purpose:

- Action-oriented semantic search shell across knowledge, symbols, AST, and references.

Operator notes:

- `Open` should land in `Content`.
- `Graph` should land in `Graph`.
- `Refs` should land in `References`.
- `Definition` should resolve through the native `/api/search/definition` contract and follow backend-ranked source location metadata.

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

## DirectReader

Purpose:

- Final rendering surface for both document-oriented and source-oriented content.

Operator notes:

- Use rich mode when there is no source focus metadata.
- For Markdown with line metadata, keep rich mode as default and use the explicit source toggle when exact line inspection is needed.
- For non-Markdown with line metadata, open source mode directly.
- Normalize studio metadata drawers (`:PROPERTIES:`, `:RELATIONS:`, `:FOOTER:`) out of rich mode so document prose stays readable.
- Render `:OBSERVE:` directives as readable observation blocks in rich mode.
- Preserve bi-link behavior in both modes.

## DiagramWindow

Purpose:

- Visual diagram surface for BPMN and Mermaid-oriented navigation.

Operator notes:

- Keep BPMN rendering native when the selected file is BPMN XML.
- Keep embedded Mermaid blocks as first-priority diagram sources.
- For Markdown without embedded Mermaid, hydrate Mermaid projections from `/api/analysis/markdown` so `Diagram` remains useful for structure-focused docs.

## PropertyEditor and Status Surfaces

Purpose:

- Secondary observability surfaces around the current selection.

Operator notes:

- These surfaces should reflect the canonical `selectedFile` and `relationships` state rather than recomputing their own view of runtime state.

:RELATIONS:
:LINKS: [[03_features/205_panel_runtime_map]], [[03_features/206_testing_and_validation]], [[06_roadmap/401_semantic_studio_runtime]]
:END:
