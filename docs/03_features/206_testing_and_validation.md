# Testing and Validation

:PROPERTIES:
:ID: qianji-studio-testing-validation
:PARENT: [[index]]
:TAGS: feature, testing, validation, vitest
:STATUS: ACTIVE
:END:

## Overview

Qianji Studio currently relies on targeted Vitest coverage around the live studio surfaces rather than a single monolithic end-to-end suite. The goal of this page is to document what is covered today and where the remaining gaps still are.

## Current Test Surface

### App-Level Integration

- `src/App.test.tsx`

Covers:

- Topology hydration
- Search-to-content routing
- Search-to-graph routing
- Search-to-references routing
- Graph-node routing back into the shared hydration path

### Search Surface

- `src/components/SearchBar/__tests__/SearchBar.test.tsx`

Covers:

- Scope switching across knowledge, symbols, AST, and references
- Result action routing for `Open`, `Graph`, `Refs`, and `Definition`
- Metadata rendering and action-layer behavior

### Workspace Shell

- `src/components/panels/MainView/MainView.test.tsx`

Covers:

- Tab activation
- References rendering
- Graph callback forwarding
- Explicit tab requests for `content`, `graph`, and `references`

### Reader Surface

- `src/components/panels/DirectReader/DirectReader.test.tsx`

Covers:

- Line-numbered source focus mode
- Highlighted source ranges
- Auto-scroll trigger
- Rich-mode bi-link rendering

### Explorer and Graph Panels

- `src/components/panels/FileTree/__tests__/FileTree.test.tsx`
- `src/components/panels/GraphView/__tests__/GraphView.test.tsx`

Covers:

- Indexed roots explorer state
- Graph loading and error overlays
- Graph node click callback forwarding
- Graph `NODE_NOT_FOUND` fallback from `/api/graph/neighbors` to `/api/analysis/markdown`
- JSDOM-stable 3D toolbar tests via a mocked `Canvas` surface (no raw three.js tag noise)

### Diagram Panel

- `src/components/panels/DiagramWindow/__tests__/DiagramWindow.test.tsx`

Covers:

- Embedded Mermaid block rendering in the diagram tab
- Markdown fallback projection via `/api/analysis/markdown` when no Mermaid block is present

## Common Validation Command

For the current studio-alignment surface, the most useful targeted command is:

```bash
direnv exec . npm test -- src/App.test.tsx src/components/panels/MainView/MainView.test.tsx src/components/panels/GraphView/__tests__/GraphView.test.tsx src/components/SearchBar/__tests__/SearchBar.test.tsx src/components/panels/DirectReader/DirectReader.test.tsx
```

For focused graph plus app routing validation:

```bash
direnv exec . npm test -- src/components/panels/GraphView/__tests__/GraphView.test.tsx src/App.test.tsx
```

For focused diagram projection validation:

```bash
direnv exec . npm test -- src/components/panels/DiagramWindow/__tests__/DiagramWindow.test.tsx
```

## Known Gaps

1. No browser-level end-to-end suite validates the dev proxy and live gateway together.
2. No visual regression suite protects the panel layout and reader highlighting.
3. No contract-sync automation currently checks that examples in the docs remain aligned with gateway payload changes.

:RELATIONS:
:LINKS: [[01_core/103_release_checklist]], [[01_core/106_docs_maintenance_playbook]], [[03_features/203_semantic_search_actions]], [[03_features/204_gateway_api_contracts]], [[03_features/205_panel_runtime_map]], [[03_features/207_panel_handbook]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]]
:END:

---

:FOOTER:
:AUDITOR: studio_validation_guard
:END:
