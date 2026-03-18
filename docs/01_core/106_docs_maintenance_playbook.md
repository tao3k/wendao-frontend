# Docs Maintenance Playbook

:PROPERTIES:
:ID: qianji-studio-docs-maintenance-playbook
:PARENT: [[index]]
:TAGS: core, docs, maintenance, playbook
:STATUS: ACTIVE
:END:

## Overview

This playbook answers a practical question: when the studio runtime changes, which docs must be updated in the same patch?

## Rule 1: Backend Contract Change

Examples:

- new `/api/...` endpoint
- changed payload fields
- changed search scope contract
- snapshot updates

Update these pages:

- `03_features/204_gateway_api_contracts.md`
- `03_features/209_backend_endpoint_cookbook.md`
- `05_research/302_backend_alignment_ledger.md`
- `05_research/303_snapshot_and_contract_policy.md`
- `05_research/307_contract_changelog.md`

## Rule 2: Panel or Interaction Change

Examples:

- new search action
- changed `requestedTab` behavior
- changed graph navigation flow
- changed reader behavior

Update these pages:

- `03_features/203_semantic_search_actions.md`
- `03_features/205_panel_runtime_map.md`
- `03_features/207_panel_handbook.md`
- `03_features/208_navigation_examples.md`
- `05_research/305_architecture_decision_log.md`

## Rule 3: Validation or Test-Surface Change

Examples:

- new targeted Vitest coverage
- new test command
- changed release gate
- new troubleshooting guidance

Update these pages:

- `03_features/206_testing_and_validation.md`
- `01_core/103_release_checklist.md`
- `05_research/304_runtime_troubleshooting.md`
- `01_core/102_developer_onboarding.md`

## Rule 4: Terminology or Structural Change

Examples:

- renamed runtime concept
- changed folder numbering policy
- changed docs entry points

Update these pages:

- `01_core/104_runtime_glossary.md`
- `01_core/105_docs_conventions.md`
- `docs/README.md`
- `docs/index.md`

## Rule 5: Milestone or Status Change

Examples:

- capability moves from partial to implemented
- a roadmap item lands
- a new architectural pattern becomes stable

Update these pages:

- `05_research/302_backend_alignment_ledger.md`
- `05_research/306_alignment_milestone_log.md`
- `05_research/307_contract_changelog.md`
- `06_roadmap/401_semantic_studio_runtime.md`

## Minimal Maintenance Loop

1. Change code or contract.
2. Identify which rule above applies.
3. Update the required docs pages in the same patch.
4. Update `docs/index.md` or `docs/README.md` if the new page changes how people should enter the docs set.
5. Update the GTD entry and docs ExecPlan note if the docs kernel meaningfully expanded.

:RELATIONS:
:LINKS: [[01_core/102_developer_onboarding]], [[01_core/103_release_checklist]], [[01_core/104_runtime_glossary]], [[01_core/105_docs_conventions]], [[03_features/206_testing_and_validation]], [[05_research/302_backend_alignment_ledger]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/307_contract_changelog]]
:END:

---

:FOOTER:
:AUDITOR: studio_docs_maintenance_guard
:END:
