# Runtime Glossary

:PROPERTIES:
:ID: qianji-studio-runtime-glossary
:PARENT: [[index]]
:TAGS: core, glossary, terminology, runtime
:STATUS: ACTIVE
:END:

## Overview

This glossary defines the terms used repeatedly across the Qianji Studio docs kernel. The goal is to keep runtime discussions precise and consistent.

## Terms

### Shared Hydration Pipeline

The single file-selection runtime in `App` that loads content, relationships, category, and optional source focus metadata for a chosen path.

### Selected File

The canonical frontend state carrier for:

- `path`
- `category`
- `content`
- optional `line`
- optional `lineEnd`
- optional `column`

### Requested Tab

An explicit tab-focus request passed into `MainView` so that search and graph actions can deterministically land in `Content`, `Graph`, or `References`.

### Source Focus

Line and optional column metadata attached to a selected file. When present, `DirectReader` uses source mode rather than rich mode.

### Rich Mode

The `DirectReader` rendering mode for document-oriented content when no source focus metadata is present.

### Source Mode

The `DirectReader` rendering mode for line-numbered content when source focus metadata is present.

### Live Gateway Path

The intended runtime path where frontend state is hydrated from the active Wendao Studio gateway using the configured bind from `wendao.toml`.

### Fallback Data

A resilience path used when live gateway data is unavailable. It should remain secondary to the live gateway path and should not be treated as the canonical contract.

### Contract Surface

The set of backend endpoints and payload families that the frontend treats as stable integration targets.

### Snapshot-Backed Contract

A backend payload family that is currently covered by Wendao Studio snapshot tests under `tests/snapshots/gateway/studio`.

### Native Definition Contract

The dedicated Wendao Studio endpoint `GET /api/search/definition` that resolves a reference hit into one backend-ranked AST definition target.

### Composed Frontend Action

A frontend capability built by combining existing backend contracts rather than by calling a dedicated backend endpoint. Historical studio examples include temporary UI-only flows before a dedicated backend contract is formalized.

### Alignment Ledger

The research page that records which Wendao Studio capabilities are fully implemented, only partial, or still future work from the Qianji Studio point of view.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[03_features/205_panel_runtime_map]], [[03_features/206_testing_and_validation]], [[05_research/302_backend_alignment_ledger]], [[05_research/305_architecture_decision_log]]
:END:

---

:FOOTER:
:AUDITOR: studio_glossary_guard
:END:
