# Alignment Milestone Log

:PROPERTIES:
:ID: qianji-studio-alignment-milestone-log
:PARENT: [[index]]
:TAGS: research, timeline, milestones, alignment
:STATUS: ACTIVE
:END:

## Overview

This log records the current Wendao-to-Qianji studio alignment progression as a milestone timeline. It is intentionally operational rather than aspirational.

## Milestones

### Milestone 1: Restore the Studio Backend Surface

Completed:

- VFS routes
- graph neighbors
- topology 3D
- baseline search surfaces

Outcome:

- Qianji Studio had a backend surface worth aligning against again.

### Milestone 2: Align the Core UI Shell

Completed:

- FileTree status and indexed roots treatment
- MainView tab copy and panel framing
- GraphView shell polish
- live topology hydration in `App`

Outcome:

- The frontend stopped behaving like a mock shell and started behaving like a live studio cockpit.

### Milestone 3: Add Snapshot-Backed Wendao Studio Contracts

Completed:

- snapshot-backed tests for search
- graph
- topology
- VFS

Outcome:

- The backend surface became auditable as a stable contract rather than an inferred one.

### Milestone 4: Expand Semantic Search

Completed:

- symbols
- AST
- references

Outcome:

- Search moved beyond generic knowledge hits and became a practical studio navigation surface.

### Milestone 5: Unify Selection Entry Points

Completed:

- `FileTree` selection
- `ZenSearch` open actions
- `GraphView` node clicks

Outcome:

- Tree, search, and graph now converge on the shared hydration pipeline.

### Milestone 6: Add Action-Layer Branching

Completed:

- `Open`
- `Graph`
- `Refs`
- `Definition`

Outcome:

- Search results became true navigation controls rather than passive listings.

### Milestone 7: Upgrade Reader Focus

Completed:

- source focus metadata
- line-numbered source mode
- highlighted ranges
- auto-scroll
- Markdown rich-by-default mode with explicit source toggle

Outcome:

- Definition and reference flows now terminate in a materially useful reader state.

### Milestone 8: Build the Qianji Studio Docs Kernel

Completed:

- docs kernel structure
- gateway contracts
- panel map
- testing and validation
- handbook
- examples
- alignment ledger
- onboarding
- snapshot policy
- troubleshooting
- release checklist
- endpoint cookbook
- architecture decision log

Outcome:

- The studio alignment work is now documented as a maintainable engineering knowledge base rather than only a code diff.

### Milestone 9: Promote Definition to a Native Contract

Completed:

- `/api/search/definition`
- snapshot-backed definition payload
- native `ZenSearch` definition action

Outcome:

- The last semantically important search action stopped depending on frontend endpoint composition.

### Milestone 10: Tighten The Build And Strict-TypeScript Surface

Completed:

- `npm run build` post-build size gate
- build-tooling declaration seam under `scripts/build/*` and `scripts/rspack/*`
- bounded strict-TypeScript closure for `App`, `DiagramWindow`, `DirectReader`,
  `FileTree`, `GraphView`, `MainView`, `PropertyEditor`, `VfsSidebar`, and
  repo-diagnostics

Outcome:

- The repo entrypoint can stay concise while the deeper operational detail
  lives in focused docs, and the remaining strict-TypeScript frontier is now
  centered on `SearchBar`, ZenSearch, controller wiring, and shared surfaces.

## Next Milestones

1. SearchBar and ZenSearch strict-TypeScript closure
2. Richer reference classifications
3. Physics-worker continuity for topology refreshes
4. Browser-level end-to-end validation
5. Contract-driven doc examples tied more directly to snapshot evolution

:RELATIONS:
:LINKS: [[01_core/107_docs_graph_map]], [[05_research/301_wendao_surface_alignment]], [[05_research/302_backend_alignment_ledger]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/305_architecture_decision_log]], [[05_research/307_contract_changelog]], [[06_roadmap/401_semantic_studio_runtime]]
:END:

---

:FOOTER:
:AUDITOR: studio_milestone_log_guard
:END:
