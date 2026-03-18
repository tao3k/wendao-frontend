# Docs Conventions

:PROPERTIES:
:ID: qianji-studio-docs-conventions
:PARENT: [[index]]
:TAGS: core, docs, conventions, structure
:STATUS: ACTIVE
:END:

## Overview

This page defines how the Qianji Studio docs kernel should grow. The goal is to preserve the Wendao-inspired structure while keeping the docs practical for frontend work.

## Structural Rules

1. Keep `index.md` as the graph-style map of content.
2. Keep `README.md` as the curated human entry point.
3. Prefer numbered folders for document domains:
   - `01_core`
   - `03_features`
   - `05_research`
   - `06_roadmap`
4. Prefer numbered leaf files inside each domain.

## Placement Rules

### `01_core`

Use for:

- runtime protocol
- onboarding
- release gates
- shared terminology
- documentation conventions

### `03_features`

Use for:

- runtime capabilities
- panel behavior
- endpoint usage
- testing and examples tied to shipped functionality

### `05_research`

Use for:

- alignment notes
- changelogs
- troubleshooting
- architecture decisions
- milestone logs

### `06_roadmap`

Use for:

- future runtime evolution
- known next-step capabilities that are not yet stable

## Writing Rules

1. Write in English.
2. Describe the live runtime path first.
3. Mark composed frontend behavior as composed, not native.
4. Keep docs aligned to current snapshot-backed backend contracts when possible.
5. Put speculative behavior in roadmap pages, not feature pages.

## Maintenance Rules

1. Update the backend alignment ledger when capability status changes.
2. Update the contract changelog when a backend-facing contract changes.
3. Update navigation examples when user-facing flows change.
4. Update this page if the numbering or placement policy changes.

:RELATIONS:
:LINKS: [[README]], [[index]], [[01_core/102_developer_onboarding]], [[01_core/104_runtime_glossary]], [[01_core/106_docs_maintenance_playbook]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/307_contract_changelog]]
:END:

---

:FOOTER:
:AUDITOR: studio_docs_conventions_guard
:END:
