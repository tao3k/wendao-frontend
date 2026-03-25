# Qianji Studio DocOS Kernel: Map of Content

:PROPERTIES:
:ID: qianji-studio-moc
:TYPE: INDEX
:STATUS: ACTIVE
:END:

Standardized documentation surface for the Qianji Studio frontend, aligned to the Wendao Studio gateway and the current runtime selection pipeline.

For a curated human entry point, start with [[README]].

## 01_core: Architecture & Foundation

:PROPERTIES:
:ID: studio-core-foundation
:OBSERVE: lang:typescript "function App() { $$$ }"
:CONTRACT: must_contain("selectedFile", "requestedTab", "relationships")
:END:

- [[01_core/101_studio_surface_protocol]]: Runtime orchestration and panel contracts.
- [[01_core/102_developer_onboarding]]: Environment, startup flow, and local verification entry points.
- [[01_core/103_release_checklist]]: Pre-release checks for gateway alignment, frontend behavior, and docs sync.
- [[01_core/104_runtime_glossary]]: Shared terms for the studio runtime, docs, and alignment work.
- [[01_core/105_docs_conventions]]: How the Qianji Studio docs kernel should be structured and maintained.
- [[01_core/106_docs_maintenance_playbook]]: Which docs must change when runtime behavior or contracts change.
- [[01_core/107_docs_graph_map]]: How to traverse the docs kernel as a navigable graph.

## 03_features: Functional Ledger

:PROPERTIES:
:ID: studio-functional-ledger
:OBSERVE: lang:typescript "export const ZenSearchWindow: React.FC<ZenSearchWindowProps> = ({ $$$ })"
:END:

- [[03_features/201_indexed_roots_and_vfs]]: Indexed roots, VFS, and live content hydration.
- [[03_features/202_topology_and_graph_navigation]]: Topology, graph view, and selection routing.
- [[03_features/203_semantic_search_actions]]: Search scopes and action-layer branching.
- [[03_features/204_gateway_api_contracts]]: Frontend-facing gateway endpoints and payload roles.
- [[03_features/205_panel_runtime_map]]: Panel responsibilities and cross-panel routing.
- [[03_features/206_testing_and_validation]]: Current test surface, validation commands, and known gaps.
- [[03_features/207_panel_handbook]]: Practical panel-by-panel operating notes.
- [[03_features/208_navigation_examples]]: End-to-end examples for open, graph, references, and definition flows.
- [[03_features/209_backend_endpoint_cookbook]]: Endpoint-by-endpoint request patterns and frontend consumers.

## 05_research: Alignment Notes

- [[05_research/301_wendao_surface_alignment]]: How the frontend mirrors the Wendao backend surface.
- [[05_research/302_backend_alignment_ledger]]: Implemented, partial, and future Wendao-to-Qianji mappings.
- [[05_research/303_snapshot_and_contract_policy]]: How frontend docs and runtime behavior align to Wendao studio snapshots.
- [[05_research/304_runtime_troubleshooting]]: Known runtime symptoms and the current recovery path.
- [[05_research/305_architecture_decision_log]]: Key frontend architecture decisions and why they were chosen.
- [[05_research/306_alignment_milestone_log]]: Timeline of the current Wendao-to-Qianji studio alignment work.
- [[05_research/307_contract_changelog]]: Contract-level changes and their frontend impact.

## 06_roadmap: Future Evolution

:PROPERTIES:
:ID: studio-roadmap-runtime
:OBSERVE: lang:typescript "interface DirectReaderProps { $$$ }"
:CONTRACT: must_contain("go-to-definition", "references", "line focus")
:END:

- [[06_roadmap/401_semantic_studio_runtime]]: Native semantic navigation evolution.

:RELATIONS:
:LINKS: [[README]], [[01_core/101_studio_surface_protocol]], [[01_core/102_developer_onboarding]], [[01_core/103_release_checklist]], [[01_core/104_runtime_glossary]], [[01_core/105_docs_conventions]], [[01_core/106_docs_maintenance_playbook]], [[01_core/107_docs_graph_map]], [[03_features/203_semantic_search_actions]], [[03_features/204_gateway_api_contracts]], [[03_features/205_panel_runtime_map]], [[03_features/206_testing_and_validation]], [[03_features/207_panel_handbook]], [[03_features/208_navigation_examples]], [[03_features/209_backend_endpoint_cookbook]], [[05_research/301_wendao_surface_alignment]], [[05_research/302_backend_alignment_ledger]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]], [[05_research/305_architecture_decision_log]], [[05_research/306_alignment_milestone_log]], [[05_research/307_contract_changelog]], [[06_roadmap/401_semantic_studio_runtime]]
:END:

---

:FOOTER:
:STANDARDS: v1.0
:LAST_SYNC: 2026-03-17
:END:
