# Studio Surface Protocol

:PROPERTIES:
:ID: qianji-studio-surface-protocol
:PARENT: [[index]]
:TAGS: architecture, core, frontend, studio
:STATUS: ACTIVE
:END:

## Definition

The orchestration contract for Qianji Studio. It defines how `App`, `MainView`, `SearchBar`, `FileTree`, `GraphView`, and `DirectReader` cooperate on top of the Wendao Studio gateway.

## Protocol Layers

1. **Gateway Surface**: `wendao.toml` drives gateway bind configuration, UI config, VFS roots, topology, graph neighbors, and search endpoints.
2. **App Orchestration**: `App.tsx` owns hydrated file state, active relationships, and requested panel focus.
3. **Panel Shell**: `MainView` resolves explicit tab requests for `content`, `graph`, and `references`.
4. **Selection Pipeline**: Tree selection, search actions, and graph-node clicks all converge on the same file hydration path.
5. **Reader Focus**: `DirectReader` keeps Markdown in rich mode by default and exposes explicit source focus controls when line metadata is available.

## Stable Contracts

- `selectedFile` is the canonical frontend carrier for `path`, `category`, `content`, and optional source location metadata.
- `relationships` is populated from live gateway neighbor data and should remain empty rather than synthetic when a lookup fails.
- `requestedTab` is the explicit control plane for panel focus changes initiated by search and graph actions.

:RELATIONS:
:LINKS: [[03_features/201_indexed_roots_and_vfs]], [[03_features/202_topology_and_graph_navigation]], [[03_features/203_semantic_search_actions]]
:END:

---

:FOOTER:
:AUDITOR: studio_surface_guard
:END:
