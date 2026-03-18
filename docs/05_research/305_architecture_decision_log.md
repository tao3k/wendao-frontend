# Architecture Decision Log

:PROPERTIES:
:ID: qianji-studio-architecture-decision-log
:PARENT: [[index]]
:TAGS: research, architecture, decisions, runtime
:STATUS: ACTIVE
:END:

## ADR-001: Use a Shared File Hydration Pipeline

Decision:

- Tree selection, search actions, and graph-node clicks all converge on the same file hydration path in `App`.

Why:

- Avoid divergent behavior between explorer, search, and graph entry points.
- Keep content, relationships, and selected-file metadata coherent.

Accepted tradeoff:

- More orchestration responsibility sits in `App`, but cross-surface behavior stays consistent.

## ADR-002: Use Explicit Tab Requests Instead of Implicit View Changes

Decision:

- `MainView` accepts explicit tab requests for `content`, `graph`, and `references`.

Why:

- Search actions such as `Open`, `Graph`, and `Refs` need deterministic panel focus.
- Implicit tab switching based only on content shape is too ambiguous.

Accepted tradeoff:

- A small coordination protocol is needed between `App` and `MainView`.

## ADR-003: Promote `Definition` to a Native Gateway Contract

Decision:

- `Definition` is resolved through a dedicated Wendao Studio endpoint: `/api/search/definition`.

Why:

- Definition resolution is a semantic contract, not only a UI convenience.
- A backend-owned ranking path keeps frontend behavior deterministic and easier to audit.

Accepted tradeoff:

- The backend now owns more symbol-resolution policy, so frontend docs and snapshots must be updated in lockstep.

## ADR-004: Prefer Live Gateway Data Over Frontend-Synthesized Fallbacks

Decision:

- The frontend documents and prefers the live gateway path first, while fallback UI remains only a resilience layer.

Why:

- Qianji Studio is a view layer over the Wendao Studio gateway.
- Invented frontend data paths make alignment auditing harder.

Accepted tradeoff:

- Runtime failures are more visible when the gateway is unavailable, but correctness is easier to reason about.

## ADR-005: Switch DirectReader into Source Mode When Line Metadata Exists

Decision:

- `DirectReader` renders a line-numbered source view when line metadata is present and rich mode otherwise.

Why:

- Header-only location hints were not enough for AST and reference-driven navigation.
- Source focus is the natural terminal surface for definition and reference flows.

Accepted tradeoff:

- The reader maintains two modes, but each mode now matches the navigation intent.

## ADR-006: Prefer Incremental Worker Sync for Topology Rendering

Decision:

- The 3D studio surface preserves prior node coordinates and reconciles topology changes through worker `sync` paths instead of reinitializing layout state on equivalent rerenders.

Why:

- The live topology display must keep visual continuity across refreshes.
- Cold worker resets and random fallback reseeding amplify flicker even when the topology payload is semantically unchanged.

Accepted tradeoff:

- The frontend now owns a small continuity layer in `App` plus additional worker protocol surface, but runtime behavior is stable and testable.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[01_core/107_docs_graph_map]], [[03_features/202_topology_and_graph_navigation]], [[03_features/203_semantic_search_actions]], [[03_features/205_panel_runtime_map]], [[05_research/302_backend_alignment_ledger]], [[05_research/304_runtime_troubleshooting]], [[05_research/306_alignment_milestone_log]], [[05_research/307_contract_changelog]], [[06_roadmap/401_semantic_studio_runtime]]
:END:

---

:FOOTER:
:AUDITOR: studio_architecture_decision_guard
:END:
