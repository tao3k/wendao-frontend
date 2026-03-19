# Contract Changelog

:PROPERTIES:
:ID: qianji-studio-contract-changelog
:PARENT: [[index]]
:TAGS: research, contract, changelog, gateway
:STATUS: ACTIVE
:END:

## Purpose

This changelog records contract-level changes on the Wendao Studio surface and the frontend impact they introduced for Qianji Studio.

## 2026-03-17

### Added native definition resolution

Backend change:

- `/api/search/definition`

Frontend impact:

- `SearchBar` `Definition` action now resolves through a dedicated backend contract.
- Documentation now records `Definition` as a native backend contract with direct endpoint binding.

### Added snapshot-backed Wendao Studio contract coverage

Backend change:

- Studio search, graph, topology, and VFS payloads were locked behind snapshot-backed tests.

Frontend impact:

- Qianji Studio could align against stable payload families rather than inferred runtime behavior.
- Docs now reference snapshot-backed contracts as the preferred source of truth.

### Added symbol search

Backend change:

- `/api/search/symbols`

Frontend impact:

- Added `Symbols` scope to `SearchBar`
- Mixed symbol hits into the `All` search surface

### Added AST definition search

Backend change:

- `/api/search/ast`

Frontend impact:

- Added `AST` scope to `SearchBar`
- Enabled definition-oriented source navigation

### Added references search

Backend change:

- `/api/search/references`

Frontend impact:

- Added `References` scope to `SearchBar`
- Enabled references-oriented result actions and source usage navigation

### Unified selection entry points

Frontend change over stable backend contracts:

- Tree, search, and graph selections now converge on the same file hydration pipeline

Impact:

- Content, graph, and references stopped drifting into separate runtime paths

### Added explicit panel-routing actions

Frontend change over stable backend contracts:

- `Open`
- `Graph`
- `Refs`
- `Definition`

Impact:

- Search results became stable navigation controls instead of passive listings

### Upgraded reader source focus

Frontend change over stable backend contracts:

- `DirectReader` now supports line-numbered source mode, highlighted ranges, and auto-scroll
- `DirectReader` now keeps Markdown rich mode by default under line metadata and exposes an explicit `View source`/`View rich` toggle

Impact:

- AST and reference flows retain line-level precision while preserving Markdown readability by default

### Hardened studio directive rendering

Frontend change over stable backend contracts:

- `DirectReader` now recognizes directive families `:OBSERVE_*:` and `:CONTRACT_*:` in addition to base `:OBSERVE:` and `:CONTRACT:`
- Directive-like lines inside fenced code blocks are preserved as literal code text (no rich-mode rewrite)
- Fence detection now respects marker boundaries when info strings include the opposite marker (for example ```````~~~`), so post-fence content is not accidentally trapped in code mode

Impact:

- Custom Wendao/Studio markdown syntax remains readable in rich mode without corrupting code examples

## Changelog Rule

Add entries here when either:

1. The Wendao Studio backend adds or changes a frontend-facing contract surface.
2. Qianji Studio materially changes how it consumes or composes an existing contract.

:RELATIONS:
:LINKS: [[01_core/106_docs_maintenance_playbook]], [[01_core/107_docs_graph_map]], [[03_features/203_semantic_search_actions]], [[05_research/302_backend_alignment_ledger]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]], [[05_research/305_architecture_decision_log]], [[05_research/306_alignment_milestone_log]], [[06_roadmap/401_semantic_studio_runtime]]
:END:

---

:FOOTER:
:AUDITOR: studio_contract_changelog_guard
:END:
