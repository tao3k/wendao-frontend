# Semantic Search Actions

:PROPERTIES:
:ID: qianji-studio-search-actions
:PARENT: [[index]]
:TAGS: feature, search, ast, references, symbols
:STATUS: ACTIVE
:VERSION: 1.0
:END:

## Overview

Qianji Studio exposes a blended search surface across knowledge, symbols, AST definitions, and source references. Search results are not only display items; they are action nodes that branch into the right studio surface.

## Search Scopes

- `All`
- `Knowledge`
- `Symbols`
- `AST`
- `References`
- `Code` (v1)

## Result Actions

1. **Open**: hydrates the selected file and requests the `Content` tab.
2. **Graph**: hydrates the selected file and requests the `Graph` tab.
3. **Refs**: hydrates the selected file and requests the `References` tab.
4. **Definition**: available for reference-like hits; resolves the best backend-ranked definition through `/api/search/definition` and opens the definition location.
5. **Preview (inline)**: lightweight row-level expansion for line and signature context in the current search surface (no dedicated side drawer in v1).

## Source Focus

When line metadata is present, `DirectReader` keeps Markdown documents in rich mode by default while exposing `View source` for exact line inspection. Non-Markdown files open directly in line-numbered source mode and highlight the target line range.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[03_features/202_topology_and_graph_navigation]], [[05_research/301_wendao_surface_alignment]]
:END:

---

## Code Search Blueprint (v1)

### Purpose

Design a production-focused code-search scenario for repository navigation where search results move from fuzzy discovery to actionable code workflows (`Open`, `Definition`, `References`, `Graph`) with fast visual verification.

### Scope Definition

This blueprint applies to search behavior that resolves code-bearing artifacts:

- `AST` results (current `/api/search/ast` contract)
- `References` mode (current `/api/search/references` contract)
- `Symbol` results (current `/api/search/symbols` contract)
- Hybrid `All` mode result blending

### Current Baseline

- Current UI uses a single generic result row pattern for all scopes.
- Code-relevant fields (language, kind, line range, definition context) are present but not visually prioritized.
- `Code` is represented by `AST` filter only, with no dedicated scenario affordance.
- Inline code snippet preview is not yet implemented for every code row.
- Knowledge retrieval now defaults to the intent-aware endpoint (`/api/search/intent`) with explicit intent hints in UI execution flow.

### Desired State (Scenario-Oriented)

#### 1) Scene Switch and Filters

- Add a `Code` search scope.
- Keep `AST`, `Symbol`, and `References` as explicit code sub-sources when needed.
- Add quick filter chips:
  - `lang:<value>` (e.g., `Julia`, `Rust`)
  - `kind:<value>` (e.g., `function`, `struct`, `method`)
  - `repo:<value>`
  - `path:<substring>`
- Scope-specific controls should be discoverable and persist for the current query session.

#### 2) Result Card Layout (Code Row)

For code results, use a dedicated row composition:

- **Primary**: Symbol/function name + language + kind badges.
- **Secondary**: Hierarchical URI path (e.g., `repo > sciml > OrdinaryDiffEq > api > solve`) + line range.
- **Tertiary**:
  - Signature / `bestSection` summary.
  - Match snippet preview (collapsed by default, lazy-loaded on expand).
- **Smart Actions**: Prioritize by section affinity (for v1: prefer `Def` in reference-like rows).

#### 3) Execution Flow

- `Open`: request content panel and apply selection metadata (line/column where available).
- `Def`: call `/api/search/definition` with symbol + current context (path + line when available) and open content.
- `Refs`: request references panel, reuse shared hydration pipeline.
- `Graph`: request graph panel, reuse shared hydration pipeline.

#### 4) Query and Ranking Strategy

- Preserve existing endpoint contracts for compatibility.
- Use `/api/search/intent` as the primary knowledge contract entry; keep `/api/search` as compatibility surface only.
- In `Code` scope, prioritize by visible section order and score from existing responses:
  1. Symbol-level matches
  2. AST line/structure matches
  3. Reference matches
- Show an explicit mode badge in header (`Code · AST` or `Code · All`) for operator awareness.

### Interaction Details

- Keyboard:
  - `Enter`: Open
  - `Shift + Enter`: Definition (future enhancement, optional in v1)
  - `Alt + Enter`: Refs (future enhancement, optional in v1)
  - `Ctrl/Cmd + Enter`: Graph (future enhancement, optional in v1)
- Mouse:
  - Click row: Open
  - Action buttons: explicit one-action path
  - Preview toggle: show/hide snippet

### Non-Goals

- New backend contracts for additional endpoints are not required for v1.
- No new language parser UI; use normalized payload fields from existing endpoints.

### Implementation Phases

#### Phase 0: UX Skeleton (low risk)

- Add `Code` scope and rename display labels for code-oriented context.
- Rearrange action button order for code rows.
- Add mode/status badge and filter chips.

#### Phase 1: Context-Aware Code Rows

- Render language/kind badges and line-range-first metadata.
- Distinguish `Code` rows from generic rows by color/typography.
- Add `Def / Refs / Graph / Open` action semantics in code sections.

#### Phase 2: Preview and Throughput

- Add lazy preview loading for code snippets.
- Cache preview results during session.
- Add runtime-friendly counters in UI (result counts by sub-mode and response fallback notices).

### vNext: Agent-First Evolution (Deep Wiki Integration)

- **Contextual Side-Drawer**: Implement the right-side sliding drawer for AST/Signature/Logic-flow inspection.
- **Truth Verification (Skeptic)**: Visualizing the "Audit Status" of documentation (Verified vs. AI-Generated).
- **Multi-hop Navigation**: Inline backlinks and "Drawer-within-Drawer" navigation for cross-entity exploration.
- **Intent-Driven UI**: Dynamic action highlighting based on explicit intent signal.

### Acceptance Criteria

- In `Code` scope, users can identify and prioritize compile-like entities (`function/struct/method`) within the first visual pass.
- `Definition` action is reachable for reference-like code rows and opens consistently in content panel.
- `Refs` and `Graph` actions jump to corresponding runtime tabs through shared hydration path.
- No regression in existing generic search behavior for Knowledge/Tag/Attachment flows.
