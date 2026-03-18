# Topology and Graph Navigation

:PROPERTIES:
:ID: qianji-studio-topology-graph
:PARENT: [[index]]
:TAGS: feature, topology, graph, navigation
:STATUS: STABLE
:END:

## Overview

Qianji Studio has two live graph-facing surfaces:

- **Topology**: the 2D or 3D workspace shell hydrated from `/api/topology/3d`.
- **Graph**: the focused neighbor graph hydrated from `/api/graph/neighbors/<path>`.

## Current Behavior

1. `App` loads the live topology on startup and falls back to embedded topology if the gateway is unavailable.
2. `MainView` hosts the `Topology` and `Graph` tabs in the same cockpit shell.
3. `GraphView` node clicks route back into the shared file hydration pipeline.
4. Search-side `Graph` actions request the `Graph` tab explicitly while hydrating the selected file.

## Contract Notes

- The graph surface should never invent relationships; all graph data comes from live gateway neighbors.
- Tree, search, and graph selections must converge on the same `selectedFile` state.
- Graph navigation is valid only when the focused file path is stable and hydrated.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[01_core/107_docs_graph_map]], [[03_features/201_indexed_roots_and_vfs]], [[03_features/203_semantic_search_actions]], [[03_features/205_panel_runtime_map]], [[03_features/208_navigation_examples]], [[03_features/209_backend_endpoint_cookbook]], [[06_roadmap/401_semantic_studio_runtime]]
:END:
