# Semantic Studio Runtime

:PROPERTIES:
:ID: qianji-studio-semantic-runtime
:PARENT: [[index|Qianji Studio DocOS Kernel: Map of Content]]
:TAGS: roadmap, search, navigation, runtime
:STATUS: ACTIVE
:END:

## Current Baseline

The current frontend can hydrate the correct file and panel surface from tree, search, and graph entry points. It can also resolve a reference result through the native `/api/search/definition` contract and surface source-focus metadata in the reader without degrading Markdown rendering fidelity.

## Recently Landed

1. **Native Go-to-Definition Endpoint**: `Definition` is now a first-class backend contract served by `/api/search/definition` and consumed directly by Zen Search actions.
2. **Topology Continuity Repair**: the 3D runtime now preserves node coordinates across topology refreshes and uses incremental worker synchronization instead of repeated cold resets.
3. **Markdown Reader Mode Hardening**: `DirectReader` now keeps Markdown in rich mode by default under line metadata, with explicit source-mode toggles for line-level inspection.

## Next Evolutions

1. **Native Find-References Endpoint Family**: distinguish declaration, implementation, and usage classes in the gateway response.
2. **Source-Aware Graph Expansion**: let definition and reference actions request graph views scoped to semantic symbols, not only file paths.
3. **Reader-Level Inline Highlighting**: highlight token spans inside the focused line, not only line ranges.
4. **Contract Snapshot Coverage for Docs Examples**: keep user-facing examples aligned with the backend payload contracts.

:RELATIONS:
:LINKS: [[01_core/107_docs_graph_map|Docs Graph Map]], [[03_features/202_topology_and_graph_navigation|Topology and Graph Navigation]], [[03_features/203_semantic_search_actions|Semantic Search Actions]], [[05_research/301_wendao_surface_alignment|Wendao Surface Alignment]], [[05_research/302_backend_alignment_ledger|Backend Alignment Ledger]], [[05_research/304_runtime_troubleshooting|Runtime Troubleshooting]], [[05_research/305_architecture_decision_log|Architecture Decision Log]], [[05_research/307_contract_changelog|Contract Changelog]]
:END:
