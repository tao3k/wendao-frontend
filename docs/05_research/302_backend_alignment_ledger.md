# Backend Alignment Ledger

:PROPERTIES:
:ID: qianji-studio-backend-alignment-ledger
:PARENT: [[index]]
:TAGS: research, alignment, ledger, gateway
:STATUS: ACTIVE
:END:

## Overview

This ledger records the current alignment status between the Wendao Studio backend and the Qianji Studio frontend. It is intentionally more explicit than the high-level alignment matrix.

## Implemented

### Configuration and VFS

- `wendao.toml`-driven gateway target
- `/api/ui/capabilities`
- `/api/vfs`
- `/api/vfs/cat`
- `/api/vfs/scan`

Frontend outcome:

- Indexed roots bootstrap works through live gateway data.
- File content hydration is wired into the shared file-selection runtime.

### Topology and Graph

- `/api/topology/3d`
- `/api/graph/neighbors/<path>`

Frontend outcome:

- Topology shell hydrates from the live gateway.
- Graph tab and references tab both use live neighbor data.
- Tree, search, and graph selections all converge on the same hydration path.

### Search

- `/api/search`
- `/api/search/autocomplete`
- `/api/search/symbols`
- `/api/search/ast`
- `/api/search/definition`
- `/api/search/references`

Frontend outcome:

- Search scopes for knowledge, symbols, AST, and references are live.
- Search result actions support `Open`, `Graph`, `Refs`, and `Definition`.
- `Definition` is backed by the native Wendao Studio contract at `/api/search/definition`.
- Source line focus now reaches `DirectReader`.

### Document Projection

- `GET /api/repo/projected-page-index-trees`
- same-origin Flight `PATH /analysis/repo-projected-page-index-tree`

Frontend outcome:

- Repo-scoped projected page-index tree discovery now has a first-class frontend API surface instead of ad hoc live-test fetches.
- The frontend keeps the intended hybrid contract explicit: JSON discovery first, then Arrow Flight opening for one selected tree.
- Live gateway proof and public client runtime now share the same discovery owner path.

## Partial

### Reference Semantics

Current state:

- References search returns usable source-level hits.

Gap:

- The payload does not yet separate semantic classes such as declaration, implementation, and usage.

### Reader Precision

Current state:

- Reader focus supports line-range highlighting and auto-scroll.

Gap:

- No token-level highlighting is present yet.

## Future

1. Richer `find-references` classifications
2. Symbol-aware graph expansion beyond file-path focus
3. Physics-worker continuity so topology refreshes do not hard-reset layout state
4. Contract-driven docs examples that stay synchronized with gateway snapshots

:RELATIONS:
:LINKS: [[01_core/106_docs_maintenance_playbook]], [[01_core/107_docs_graph_map]], [[03_features/204_gateway_api_contracts]], [[03_features/208_navigation_examples]], [[05_research/301_wendao_surface_alignment]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]], [[05_research/305_architecture_decision_log]], [[05_research/306_alignment_milestone_log]], [[05_research/307_contract_changelog]], [[06_roadmap/401_semantic_studio_runtime]]
:END:

---

:FOOTER:
:AUDITOR: studio_alignment_ledger_guard
:END:
