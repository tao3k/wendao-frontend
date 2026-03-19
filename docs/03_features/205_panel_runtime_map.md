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

- `/api/ui/config`
- `/api/vfs/scan`
- `/api/vfs/cat`

### MainView

Responsibilities:

- Host the `Topology`, `References`, `Graph`, and `Content` tabs.
- Resolve explicit tab requests coming from search and graph actions.
- Keep the focused file, relationships, and reader state coherent.

Gateway dependencies:

- Indirect; it depends on hydrated state prepared by `App`.

### SearchBar

Responsibilities:

- Blend knowledge, symbols, AST definitions, and references.
- Branch each result into `Open`, `Graph`, `Refs`, and `Definition` actions.
- Normalize result actions into the shared file selection pipeline.

Gateway dependencies:

- `/api/search`
- `/api/search/autocomplete`
- `/api/search/symbols`
- `/api/search/ast`
- `/api/search/references`

### GraphView

Responsibilities:

- Render neighbor graphs for the focused file.
- Return graph node selections to the shared file hydration path.

Gateway dependencies:

- `/api/graph/neighbors/<path>`

### DirectReader

Responsibilities:

- Render rich text when the target is document-oriented.
- Keep Markdown in rich mode by default when line metadata is present.
- Render line-numbered source focus for non-Markdown files and for Markdown when the operator selects source mode.
- Keep bi-link navigation available in both modes.

Gateway dependencies:

- Indirect; it depends on hydrated file content and optional source focus metadata.

## Shared Selection Principle

Tree, search, and graph are not separate navigation systems. They are entry points into the same file-selection runtime.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[01_core/104_runtime_glossary]], [[01_core/107_docs_graph_map]], [[03_features/201_indexed_roots_and_vfs]], [[03_features/202_topology_and_graph_navigation]], [[03_features/203_semantic_search_actions]], [[03_features/204_gateway_api_contracts]], [[03_features/207_panel_handbook]], [[03_features/208_navigation_examples]]
:END:
