# Wendao Surface Alignment

:PROPERTIES:
:ID: qianji-studio-wendao-alignment
:PARENT: [[index|Qianji Studio DocOS Kernel: Map of Content]]
:TAGS: research, alignment, gateway, frontend
:STATUS: ACTIVE
:END:

## Purpose

This note records the intentional mapping between the Wendao Studio backend and the Qianji Studio frontend.

## Alignment Matrix

| Wendao Surface                                                                               | Qianji Studio Surface                                          | Current State |
| :------------------------------------------------------------------------------------------- | :------------------------------------------------------------- | :------------ |
| `/api/ui/capabilities`                                                                       | Indexed Roots bootstrap                                        | Live          |
| `/api/vfs/*`                                                                                 | FileTree and content hydration                                 | Live          |
| `/api/topology/3d`                                                                           | Main topology shell                                            | Live          |
| `/api/graph/neighbors/*`                                                                     | Graph tab and references hydration                             | Live          |
| `/api/repo/projected-page-index-trees` + same-origin Flight `repo-projected-page-index-tree` | Repo document projection discovery and page-index tree opening | Live          |
| `/api/search`                                                                                | Knowledge search                                               | Live          |
| `/api/search/symbols`                                                                        | Symbol search scope                                            | Live          |
| `/api/search/ast`                                                                            | AST search scope                                               | Live          |
| `/api/search/definition`                                                                     | Native definition action                                       | Live          |
| `/api/search/references`                                                                     | References scope and references action                         | Live          |

## Research to Roadmap Handoff

Research notes in this cluster document the current contract reality and feed unresolved runtime deltas into the active roadmap node `06_roadmap/401_semantic_studio_runtime.md`.

## Structural Lessons Borrowed from Wendao Docs

- A single `index.md` acts as the map of content.
- Numbered folders express the documentation domain rather than arbitrary nesting.
- Numbered files act as stable leaves.
- Property drawers and relations keep the docs navigable as a graph rather than a flat folder tree.

## Page-Index Alignment Note

Projected repo document trees now follow a two-step frontend contract:

1. discover candidate projected trees over `GET /api/repo/projected-page-index-trees`
2. open one selected tree over same-origin Flight `PATH /analysis/repo-projected-page-index-tree`

This keeps repository-scoped discovery cheap while preserving the richer Arrow payload for the selected tree opener.

:RELATIONS:
:LINKS: [[01_core/107_docs_graph_map|Docs Graph Map]], [[03_features/201_indexed_roots_and_vfs|Indexed Roots and VFS Hydration]], [[03_features/202_topology_and_graph_navigation|Topology and Graph Navigation]], [[03_features/203_semantic_search_actions|Semantic Search Actions]], [[03_features/204_gateway_api_contracts|Gateway API Contracts]], [[05_research/302_backend_alignment_ledger|Backend Alignment Ledger]], [[05_research/305_architecture_decision_log|Architecture Decision Log]], [[05_research/306_alignment_milestone_log|Alignment Milestone Log]], [[06_roadmap/401_semantic_studio_runtime|Semantic Studio Runtime]]
:END:
