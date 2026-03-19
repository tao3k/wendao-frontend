# Wendao Surface Alignment

:PROPERTIES:
:ID: qianji-studio-wendao-alignment
:PARENT: [[index]]
:TAGS: research, alignment, gateway, frontend
:STATUS: ACTIVE
:END:

## Purpose

This note records the intentional mapping between the Wendao Studio backend and the Qianji Studio frontend.

## Alignment Matrix

| Wendao Surface | Qianji Studio Surface | Current State |
| :------------- | :-------------------- | :------------ |
| `/api/ui/config` | Indexed Roots bootstrap | Live |
| `/api/vfs/*` | FileTree and content hydration | Live |
| `/api/topology/3d` | Main topology shell | Live |
| `/api/graph/neighbors/*` | Graph tab and references hydration | Live |
| `/api/search` | Knowledge search | Live |
| `/api/search/symbols` | Symbol search scope | Live |
| `/api/search/ast` | AST search scope | Live |
| `/api/search/definition` | Native definition action | Live |
| `/api/search/references` | References scope and references action | Live |

## Research to Roadmap Handoff

Research notes in this cluster document the current contract reality and feed unresolved runtime deltas into the active roadmap node `06_roadmap/401_semantic_studio_runtime.md`.

## Structural Lessons Borrowed from Wendao Docs

- A single `index.md` acts as the map of content.
- Numbered folders express the documentation domain rather than arbitrary nesting.
- Numbered files act as stable leaves.
- Property drawers and relations keep the docs navigable as a graph rather than a flat folder tree.

:RELATIONS:
:LINKS: [[01_core/107_docs_graph_map]], [[03_features/201_indexed_roots_and_vfs]], [[03_features/202_topology_and_graph_navigation]], [[03_features/203_semantic_search_actions]], [[03_features/204_gateway_api_contracts]], [[05_research/302_backend_alignment_ledger]], [[05_research/305_architecture_decision_log]], [[05_research/306_alignment_milestone_log]], [[06_roadmap/401_semantic_studio_runtime]]
:END:
