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

### Zen Search Surface

- `src/components/ZenSearch/__tests__/ZenSearchWindow.test.tsx`
- `src/components/ZenSearch/__tests__/ZenSearchLayout.test.tsx`
- `src/components/ZenSearch/__tests__/ZenSearchWorkspace.test.tsx`
- `src/components/ZenSearch/__tests__/ZenSearchPreviewShell.test.tsx`
- `src/components/ZenSearch/__tests__/ZenSearchPreviewEntity.test.tsx`
- `src/components/ZenSearch/__tests__/ZenSearchPreviewPlaceholder.test.tsx`
- `src/components/ZenSearch/__tests__/ZenSearchPreviewContent.test.tsx`
- `src/components/ZenSearch/__tests__/ZenSearchPreviewPane.test.tsx`
- `src/components/code-syntax/CodeSyntaxHighlighter.test.tsx`
- `src/components/ZenSearch/__tests__/CodeAstAnatomyView.test.tsx`
- `src/components/ZenSearch/StructuredDashboard/__tests__/StructuredCodeInspector.test.tsx`
- `src/components/ZenSearch/StructuredDashboard/__tests__/StructuredIntelligenceDashboard.test.tsx`
- `src/components/SearchBar/__tests__/SearchToolbar.test.tsx`
- `src/components/SearchBar/__tests__/SearchStatusBar.test.tsx`
- `src/components/ZenSearch/__tests__/useZenSearchPreview.test.tsx`
- Zen mode keeps the workspace mounted behind the full-screen shell so Graph and panel state survive mode switches.
- The Zen shell is lazy-loaded from `App`, so the startup-path smoke coverage is anchored in `StudioBootstrap.test.tsx` and `App.test.tsx` while the Zen subtree remains separately covered.
- After the first open, the Zen shell remains mounted as a hidden overlay when closed so workspace state survives mode switches without tearing down the app layout.
- Studio bootstrap now stays on a static blank loading shell until the app is ready or blocked, and the workspace stays hidden until the first VFS load completes, so the startup flow does not visibly paint a loading panel during gateway connection.
- The frontend entrypoint now renders `StudioBootstrap` directly instead of wrapping it in `React.StrictMode`, so the dev-only double-mount flash during gateway connection does not reappear.
- Zen preview selection stays synced to the active result index and the first visible result remains the fallback when nothing is selected.
- The preview hook now fetches `/api/analysis/code-ast` for code-backed results using repo and line hints from the selected result.
- The direct reader now treats code files as source views from the file suffix even when no line target is present, while keeping markdown-like content in rich mode.
- App path hydration now resolves bare project-relative selections through the gateway when `projectName` is missing, so graph-node and bi-link regressions pin `docs/02_dev/HANDBOOK.md`-style inputs to project-scoped VFS / graph paths.
- The selection normalization test suite now explicitly pins `docs/02_dev/HANDBOOK.md -> main/docs/02_dev/HANDBOOK.md`, so the handbook-style bare path case stays covered even when graph and search emitters continue passing selection metadata upstream.
- The SearchBar wrapper now keeps its scope and sort controls behind a compact dropdown filter and no longer exposes the old side drawer surface.
- The dropdown keeps the full set of scope chips hidden until the operator opens it, so the main search status lane stays visually primary.
- Preview loading indicators now stay suppressed once content is already visible, reducing the gateway reconnect flash during content reuse.
- MainView content and diagram panels now show a loading fallback while a selected file is still hydrating, instead of flashing the empty hint during gateway reconnects.

Covers:

- Full-screen Zen layout regions
- Search shell composition
- Workspace-level default preview selection
- Preview shell branching for placeholder versus entity display
- Structured Intelligence Dashboard layer rendering and structured pivot anchors
- Local connectome mini-map rendering, side toggles, side-aware focus badges, compact path-trail side-badge synchronization, compact two-line top-header active-anchor synchronization with responsive stacking, balanced two-row dashboard grid spacing, compact topology viewport and node spacing, named landmark regions for each structured layer, compact header layer index navigation, and shared focus reset on result change
- Dashboard header and saliency-view rendering
- Saliency view rendering when the preview payload can derive a meaningful excerpt
- Preview header, graph summary, and reader content separation
- Shared Shiki-backed generic syntax highlighting for DirectReader, AST waterfall signatures/excerpts, and structured fragment cards
- Code AST waterfall rendering for declaration identity, structured signature parts, explicit parameter and return lanes, a single vertical validation/execution/return block stack, grouped symbol overlays, declaration/block/symbol/anchor retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), explicit `Pivot declaration` / `Pivot block` / `Pivot symbol` / `Pivot anchor` plus `Copy for RAG` actions on code atoms, and a single-column waterfall layout with a numbered file-path prelude and compact declaration lane, with `StructuredCodeInspector` acting as the dedicated wrapper that keeps the raw content preview out of code-backed results
- Markdown waterfall rendering for document identity, heading-based section cards, section-level retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and preserved rich slots for tables, math, mermaid, bi-links, and fenced code blocks in `DirectReader`
- Dedicated Zen search viewport wiring and controller delegation
- Canonical path normalization before VFS and graph preview fetches
- Graph eligibility filtering for note-backed versus non-note-backed results

### Zen Search Controller Compatibility Surface

- `src/components/SearchBar/__tests__/SearchBar.test.tsx`

Covers:

- Scope switching across knowledge, symbols, AST, and references
- Result action routing for `Open`, `Graph`, `Refs`, and `Definition`
- Metadata rendering and action-layer behavior
- The compatibility `SearchBar` surface still exercises the shared controller internals, but Zen Search is the primary user-facing entrypoint

### Workspace Shell

- `src/components/panels/MainView/MainView.test.tsx`

Covers:

- Tab activation
- References rendering
- Graph callback forwarding
- Explicit tab requests for `content`, `graph`, and `references`

### Reader Surface

- `src/components/panels/DirectReader/MarkdownWaterfall.test.tsx`
- `src/components/panels/DirectReader/DirectReader.test.tsx`

Covers:

- Line-numbered source focus mode
- Highlighted source ranges
- Auto-scroll trigger
- Rich-mode bi-link rendering
- Markdown waterfall identity cards inside a dedicated ZenSearch markdown reading tray with a `Title / Tags / Linked` top card, compact section index strips, section-level `Copy for RAG` / `Pivot section` anchors, compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and nested rich slot rendering for code, tables, and mermaid with shared slot headers

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
- Markdown fallback projection via `/api/analysis/markdown` when Mermaid is present
- Markdown waterfall fallback when no Mermaid projection is produced for a markdown file

## Common Validation Command

For the current studio-alignment surface, the most useful targeted command is:

The shared Shiki syntax renderer now falls back to the current file suffix when a code block arrives with a generic `code` label or no explicit language tag, so `.py`, `.rs`, and `.jl` content still renders with syntax coloring through the same renderer.

```bash
direnv exec . npm test -- src/App.test.tsx src/components/ZenSearch/__tests__/ZenSearchWindow.test.tsx src/components/ZenSearch/__tests__/ZenSearchLayout.test.tsx src/components/ZenSearch/__tests__/ZenSearchWorkspace.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewShell.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewEntity.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewPlaceholder.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewContent.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewPane.test.tsx src/components/code-syntax/index.test.ts src/components/code-syntax/CodeSyntaxHighlighter.test.tsx src/components/ZenSearch/__tests__/CodeAstAnatomyView.test.tsx src/components/ZenSearch/StructuredDashboard/__tests__/StructuredCodeInspector.test.tsx src/components/ZenSearch/StructuredDashboard/__tests__/StructuredIntelligenceDashboard.test.tsx src/components/ZenSearch/__tests__/useZenSearchPreview.test.tsx src/utils/__tests__/selectionPath.test.ts src/components/SearchBar/__tests__/searchResultNormalization.test.ts src/components/SearchBar/__tests__/SearchToolbar.test.tsx src/components/SearchBar/__tests__/SearchStatusBar.test.tsx src/components/SearchBar/__tests__/SearchBar.test.tsx src/components/panels/MainView/MainView.test.tsx src/components/panels/GraphView/__tests__/GraphView.test.tsx src/components/panels/DiagramWindow/__tests__/DiagramWindow.test.tsx src/components/panels/DirectReader/MarkdownWaterfall.test.tsx src/components/panels/DirectReader/DirectReader.test.tsx
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
