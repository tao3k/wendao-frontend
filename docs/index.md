# Qianji Studio DocOS Kernel: Map of Content

:PROPERTIES:
:ID: qianji-studio-moc
:TYPE: INDEX
:STATUS: ACTIVE
:END:

Standardized documentation surface for the Qianji Studio frontend, aligned to the Wendao Studio gateway and the current runtime selection pipeline.

For a curated human entry point, start with [[README|Qianji Studio Docs]].

## 01_core: Architecture & Foundation

:PROPERTIES:
:ID: studio-core-foundation
:OBSERVE: lang:typescript "function App() { $$$ }"
:CONTRACT: must_contain("selectedFile", "requestedTab", "relationships")
:END:

- [[01_core/101_studio_surface_protocol|Studio Surface Protocol]]: Runtime orchestration and panel contracts.
- [[01_core/102_developer_onboarding|Developer Onboarding]]: Environment, startup flow, and local verification entry points.
- [[01_core/103_release_checklist|Release Checklist]]: Pre-release checks for gateway alignment, frontend behavior, and docs sync.
- [[01_core/104_runtime_glossary|Runtime Glossary]]: Shared terms for the studio runtime, docs, and alignment work.
- [[01_core/105_docs_conventions|Docs Conventions]]: How the Qianji Studio docs kernel should be structured and maintained.
- [[01_core/106_docs_maintenance_playbook|Docs Maintenance Playbook]]: Which docs must change when runtime behavior or contracts change.
- [[01_core/107_docs_graph_map|Docs Graph Map]]: How to traverse the docs kernel as a navigable graph.

## 03_features: Functional Ledger

:PROPERTIES:
:ID: studio-functional-ledger
:OBSERVE: lang:typescript "export const ZenSearchWindow: React.FC<ZenSearchWindowProps> = ({ $$$ })"
:END:

- [[03_features/201_indexed_roots_and_vfs|Indexed Roots and VFS Hydration]]: Indexed roots, VFS, and live content hydration.
- [[03_features/202_topology_and_graph_navigation|Topology and Graph Navigation]]: Topology, graph view, and selection routing.
- [[03_features/203_semantic_search_actions|Semantic Search Actions]]: Search scopes and action-layer branching.
- [[03_features/204_gateway_api_contracts|Gateway API Contracts]]: Frontend-facing gateway endpoints and payload roles.
- [[03_features/205_panel_runtime_map|Panel Runtime Map]]: Panel responsibilities and cross-panel routing.
- [[03_features/206_testing_and_validation|Testing and Validation]]: Current test surface, validation commands, and known gaps.
- [[03_features/207_panel_handbook|Panel Handbook]]: Practical panel-by-panel operating notes.
- [[03_features/208_navigation_examples|Navigation Examples]]: End-to-end examples for open, graph, references, and definition flows.
- [[03_features/209_backend_endpoint_cookbook|Backend Endpoint Cookbook]]: Endpoint-by-endpoint request patterns and frontend consumers.

## 05_research: Alignment Notes

- [[05_research/301_wendao_surface_alignment|Wendao Surface Alignment]]: How the frontend mirrors the Wendao backend surface.
- [[05_research/302_backend_alignment_ledger|Backend Alignment Ledger]]: Implemented, partial, and future Wendao-to-Qianji mappings.
- [[05_research/303_snapshot_and_contract_policy|Snapshot and Contract Policy]]: How frontend docs and runtime behavior align to Wendao studio snapshots.
- [[05_research/304_runtime_troubleshooting|Runtime Troubleshooting]]: Known runtime symptoms and the current recovery path.
- [[05_research/305_architecture_decision_log|Architecture Decision Log]]: Key frontend architecture decisions and why they were chosen.
- [[05_research/306_alignment_milestone_log|Alignment Milestone Log]]: Timeline of the current Wendao-to-Qianji studio alignment work.
- [[05_research/307_contract_changelog|Contract Changelog]]: Contract-level changes and their frontend impact.

## 06_roadmap: Future Evolution

:PROPERTIES:
:ID: studio-roadmap-runtime
:OBSERVE: lang:typescript "interface DirectReaderProps { $$$ }"
:CONTRACT: must_contain("go-to-definition", "references", "line focus")
:END:

- [[06_roadmap/401_semantic_studio_runtime|Semantic Studio Runtime]]: Native semantic navigation evolution.

:RELATIONS:
:LINKS: [[README|Qianji Studio Docs]], [[01_core/101_studio_surface_protocol|Studio Surface Protocol]], [[01_core/102_developer_onboarding|Developer Onboarding]], [[01_core/103_release_checklist|Release Checklist]], [[01_core/104_runtime_glossary|Runtime Glossary]], [[01_core/105_docs_conventions|Docs Conventions]], [[01_core/106_docs_maintenance_playbook|Docs Maintenance Playbook]], [[01_core/107_docs_graph_map|Docs Graph Map]], [[03_features/203_semantic_search_actions|Semantic Search Actions]], [[03_features/204_gateway_api_contracts|Gateway API Contracts]], [[03_features/205_panel_runtime_map|Panel Runtime Map]], [[03_features/206_testing_and_validation|Testing and Validation]], [[03_features/207_panel_handbook|Panel Handbook]], [[03_features/208_navigation_examples|Navigation Examples]], [[03_features/209_backend_endpoint_cookbook|Backend Endpoint Cookbook]], [[05_research/301_wendao_surface_alignment|Wendao Surface Alignment]], [[05_research/302_backend_alignment_ledger|Backend Alignment Ledger]], [[05_research/303_snapshot_and_contract_policy|Snapshot and Contract Policy]], [[05_research/304_runtime_troubleshooting|Runtime Troubleshooting]], [[05_research/305_architecture_decision_log|Architecture Decision Log]], [[05_research/306_alignment_milestone_log|Alignment Milestone Log]], [[05_research/307_contract_changelog|Contract Changelog]], [[06_roadmap/401_semantic_studio_runtime|Semantic Studio Runtime]]
:END:

---

:FOOTER:
:STANDARDS: v1.0
:LAST_SYNC: 2026-03-17
:END:
