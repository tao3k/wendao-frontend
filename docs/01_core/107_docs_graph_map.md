# Docs Graph Map

:PROPERTIES:
:ID: qianji-studio-docs-graph-map
:PARENT: [[index]]
:TAGS: core, docs, graph, navigation
:STATUS: ACTIVE
:END:

## Overview

This page describes the Qianji Studio docs kernel as a navigable graph rather than as a flat directory tree.

## Primary Clusters

### Core Cluster

Purpose:

- Explain how the runtime works
- Explain how to start it
- Explain how to maintain the docs kernel

Key nodes:

- `01_core/101_studio_surface_protocol.md`
- `01_core/102_developer_onboarding.md`
- `01_core/103_release_checklist.md`
- `01_core/104_runtime_glossary.md`
- `01_core/105_docs_conventions.md`
- `01_core/106_docs_maintenance_playbook.md`

### Feature Cluster

Purpose:

- Describe what the frontend actually does today

Key nodes:

- `03_features/201_indexed_roots_and_vfs.md`
- `03_features/202_topology_and_graph_navigation.md`
- `03_features/203_semantic_search_actions.md`
- `03_features/204_gateway_api_contracts.md`
- `03_features/205_panel_runtime_map.md`
- `03_features/206_testing_and_validation.md`
- `03_features/207_panel_handbook.md`
- `03_features/208_navigation_examples.md`
- `03_features/209_backend_endpoint_cookbook.md`

### Research Cluster

Purpose:

- Explain why the current design exists
- Record alignment state and operational history

Key nodes:

- `05_research/301_wendao_surface_alignment.md`
- `05_research/302_backend_alignment_ledger.md`
- `05_research/303_snapshot_and_contract_policy.md`
- `05_research/304_runtime_troubleshooting.md`
- `05_research/305_architecture_decision_log.md`
- `05_research/306_alignment_milestone_log.md`
- `05_research/307_contract_changelog.md`

### Roadmap Cluster

Purpose:

- Hold future-facing capability plans that are not yet stable

Key nodes:

- `06_roadmap/401_semantic_studio_runtime.md`

## Recommended Traversal Paths

### New Engineer Path

1. `docs/README.md`
2. `01_core/102_developer_onboarding.md`
3. `01_core/101_studio_surface_protocol.md`
4. `03_features/204_gateway_api_contracts.md`
5. `03_features/205_panel_runtime_map.md`

### Runtime Debugging Path

1. `01_core/103_release_checklist.md`
2. `05_research/304_runtime_troubleshooting.md`
3. `03_features/206_testing_and_validation.md`
4. `05_research/303_snapshot_and_contract_policy.md`

### Contract Change Path

1. `03_features/204_gateway_api_contracts.md`
2. `03_features/209_backend_endpoint_cookbook.md`
3. `05_research/302_backend_alignment_ledger.md`
4. `05_research/307_contract_changelog.md`
5. `01_core/106_docs_maintenance_playbook.md`

### Research to Roadmap Path

1. `05_research/302_backend_alignment_ledger.md`
2. `05_research/304_runtime_troubleshooting.md`
3. `05_research/305_architecture_decision_log.md`
4. `05_research/307_contract_changelog.md`
5. `06_roadmap/401_semantic_studio_runtime.md`

:RELATIONS:
:LINKS: [[README]], [[index]], [[01_core/101_studio_surface_protocol]], [[01_core/105_docs_conventions]], [[01_core/106_docs_maintenance_playbook]], [[03_features/204_gateway_api_contracts]], [[03_features/205_panel_runtime_map]], [[05_research/301_wendao_surface_alignment]], [[05_research/302_backend_alignment_ledger]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]], [[05_research/305_architecture_decision_log]], [[05_research/306_alignment_milestone_log]], [[05_research/307_contract_changelog]], [[06_roadmap/401_semantic_studio_runtime]]
:END:

---

:FOOTER:
:AUDITOR: studio_docs_graph_map_guard
:END:
