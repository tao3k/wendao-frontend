# Qianji Studio

Frontend cockpit for the Wendao Studio gateway.

Qianji Studio is not a separate backend product. It is the interactive frontend layer that hydrates VFS, topology, graph, and semantic search data from the Wendao Studio runtime.

## Local Development

Run commands from `.data/qianji-studio` and prefer the project environment:

```bash
direnv exec . npm run dev
direnv exec . npm run build
direnv exec . npm test
```

## Gateway Configuration

The frontend resolves its default gateway target from:

```text
wendao.toml
```

Current local bind:

```toml
[gateway]
bind = "127.0.0.1:9517"
```

The dev proxy reads that bind and forwards `/api/*` requests to the configured Wendao Studio gateway. If that file cannot be read, the current fallback target is `http://localhost:8001`.

## Current Runtime Surface

- Indexed roots and VFS hydration
- Topology and graph navigation
- Graph auto-fallback to `/api/analysis/markdown` when `/api/graph/neighbors/<path>` returns `NODE_NOT_FOUND`
- Selection paths are canonicalized before VFS or graph lookup; workspace-local `.data/wendao-frontend/...` paths are never sent directly to the gateway. When a selection arrives without `projectName`, App resolves the bare path through the gateway before hydration so the request still becomes project-scoped.
- Graph actions are only exposed for note-backed results; code and attachment results do not advertise graph navigation
- The SearchBar wrapper now keeps scope and sort behind a compact dropdown filter so the status and results area stay visually primary; the old drawer surface has been removed
- Repo-index status separates adaptive analysis concurrency from the dedicated remote-sync semaphore and surfaces both in the status popover
- Repo-index totals intentionally exclude link-graph-only projects with `plugins = []`, such as local `kernel` / `main` docs roots
- Repo-index status also condenses repeated unsupported layout failures into grouped reason summaries with repo previews, so common misses such as `missing Project.toml` do not hide inside the full issue list
- Clicking the repo-index chip in the status bar now opens a dedicated diagnostics page with `#repo-diagnostics` hash persistence; the selected diagnostics filter and reason focus are also encoded into the hash so the current triage slice is shareable
- The diagnostics page now also supports repo-focused detail selection; clicking a failed or unsupported repo opens a detail pane and persists that repo focus into the hash via `repo=<id>`
- The selected repo detail pane now also exposes page-level remediation actions: failed repos can be retried directly from the diagnostics page, and any selected repo can export a single-repo diagnostics brief to the clipboard
- The same selected repo pane now also supports `Download remediation bundle`, exporting a richer Markdown handoff bundle that includes the current diagnostics brief plus unsupported-repo remediation material when available
- The diagnostics page header now also supports `Download current triage bundle`, exporting the active filtered failed/unsupported slice as a shareable Markdown handoff bundle with runtime context, link-graph-only exclusions, failure-family grouping, failure-family remediation guidance, and batch `Failure presets` instead of limiting export to one selected repo
- The same triage bundle now also includes batch `Unsupported presets`, so grouped layout failures such as `missing Project.toml` export concrete remediation blocks instead of only a grouped manifest
- For unsupported repos, the same pane now also exposes `Copy fix template`, so common layout failures such as `missing Project.toml` can be handed off as a concrete remediation template instead of a raw error string
- For `missing Project.toml` specifically, the selected unsupported repo pane now also exposes `Copy link-graph-only preset`, producing a ready-to-edit `link_graph.projects."<repo>"` TOML snippet with `plugins = []`
- The same `missing Project.toml` path now also exposes `Download config patch` for the selected repo and `Download current config patch` for the current unsupported slice, so link-graph-only remediation can be handed off as raw TOML instead of Markdown only
- Selected failed repos now also render failure-specific guidance, so transient transport failures and auth/access failures no longer collapse into the same generic retry hint
- Selected failed repos now also expose `Copy failure preset`, exporting a structured failure-family handoff that includes retryability, guidance, and category-specific next steps such as reduced sync concurrency or credential checks
- Failed diagnostics now also expose `Download failure plan` for the selected repo and `Download current failure plan` for the current failed slice, so failure-family remediation can be handed off as raw TOML instead of clipboard-only presets
- Raw TOML exports now also carry workspace-aware headers such as `scope_filter`, current reason focus, `current_repo`, and concurrency context, so offline handoff preserves the operational context in which the export was generated
- Repo-diagnostics failure families are now canonicalized before filtering and export, so repo-specific GitHub transport errors such as `failed to connect to github.com: Can't assign requested address` collapse into one batch family instead of one preset per repo
- Failure-plan and triage exports now also carry `reason_key` plus bounded `sample_errors`, so machine consumers can key off a stable family id while operators still retain raw error examples for the current slice
- The same failure exports now also carry action-preset fields such as `action_key`, `retry_scope`, `env_overrides`, and `follow_up_checks`, so transient transport and auth/access families can be handed off as executable remediation plans instead of free-form guidance only
- Selected failed repo panes now also expose `Copy remediation command`, turning the current repo-level failure action preset into a clipboard-ready shell snippet instead of limiting execution handoff to TOML exports
- Selected failed repo panes now also expose `Download remediation command`, so the same repo-level failure action preset can be handed off as a runnable shell script instead of clipboard-only command text
- The diagnostics page header now also exposes `Copy current remediation command` for the active failed slice, so a canonical failure family can be copied as one batch remediation script instead of one repo at a time
- The diagnostics page header now also exposes `Download current remediation command`, so the active failed slice can be handed off as a runnable shell script instead of clipboard-only command text
- Downloaded remediation scripts now also carry workspace-context comment headers such as `scope_filter`, current reason focus, selected repo, and concurrency state, so the shell artifact remains self-describing after it leaves the diagnostics page
- The same downloaded remediation scripts now also carry `generated_at` plus canonical `reason_key` header fields, so the exported shell artifact can be correlated back to one failure family without reopening the UI
- Downloaded remediation scripts now also summarize canonical `action_key` and `retry_scope` in the top-level header, so operators can see the intended remediation mode before reading the shell body itself
- Downloaded remediation scripts now also summarize `env_overrides` and `follow_up_checks` in the top-level header, so the required environment knobs and post-run validation steps are visible before the shell body itself
- That same top-level script header now aggregates those fields across the exported scope, so current-slice remediation scripts expose one deduplicated environment-override set and one deduplicated validation checklist before the shell body itself
- The diagnostics page now also exposes `Download current remediation runbook`, which packages the current failed slice as one Markdown handoff containing scope summary, failure plan, and the runnable remediation script instead of forcing operators to download those artifacts separately
- Selected failed repo panes now also expose `Download remediation runbook`, so repo-level handoff has the same single-artifact path instead of forcing operators to combine the repo failure plan and repo remediation script manually
- The diagnostics page header now also exposes `Download current diagnostics pack`, which combines the current triage bundle, current failed-slice remediation runbook, and current unsupported config patch into one Markdown handoff and adds a top-level operator summary (`action_keys`, `follow_up_checks`, `suggested_sync_concurrency_limit`, `next_steps`) instead of forcing operators to reconstruct current-scope actions from separate exports
- That same operator summary is now also rendered directly on the diagnostics page as a current-slice action card, and its failure-family action rows plus unsupported-slice CTA now jump the page straight into the matching failed family or unsupported slice instead of leaving the summary as a read-only synthesis block
- Once a failed family or unsupported slice is focused, the page now also renders a dedicated focused action bar so the matching retry, export, runbook, and back-navigation actions are surfaced together instead of remaining scattered across the full header
- Focused failed/unsupported slices now also trim duplicate page-header actions, so the focused action bar becomes the primary slice-local control surface instead of mirroring the same command/download buttons in two places
- That focused action bar is now also compressed into a primary-action surface: failed slices keep `Retry filtered failed` plus the remediation runbook visible, unsupported slices keep the highest-value patch/export visible, and the remaining secondary exports now sit behind `More exports` and reset when the focused slice changes
- Repo diagnostics no longer live in the FileTree sidebar; the status-bar chip and `#repo-diagnostics` page are now the canonical triage surface
- The diagnostics feature now owns its own `repoDiagnostics/` module boundary for copy, state, drawer rendering, and controller logic, instead of continuing to hang under `panels/FileTree/`
- The FileTree feature folder is now reduced to tree/runtime/view composition concerns: `types`, `copy`, `treeModel`, `TreeNode`, `useFileTreeRuntime`, `useFileTreeExpansion`, `useFileTreeStatus`, `FileTreeToolbar`, `FileTreeContent`, and `FileTreeNodes`
- Knowledge, symbols, AST, and references search
- Zen Search as the primary full-screen search workspace for knowledge, symbols, AST, references, and code-oriented structured projection flows
- The right-side Structured Intelligence Dashboard (SID) renders topology, fragments, relational projection, and a local connectome for non-code results. Code-backed results render through a dedicated `StructuredCodeInspector` wrapper that projects a single-column AST waterfall with a numbered file-path prelude, declaration identity, structured signature parts, logic block decomposition, symbol overlays, and compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`) on declaration and block surfaces, while markdown-backed DirectReader content renders through `MarkdownWaterfall` inside a dedicated ZenSearch markdown reading tray with a document identity card that foregrounds `Title`, `Tags`, and `Linked` before compact heading-based section index cards, section-level `Copy for RAG` / `Pivot section` actions, compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and nested rich slots for tables, math, mermaid, bi-links, and fenced code blocks with shared slot headers.
- The top header now uses a compact two-line layout on wide screens and stacks responsively on narrower screens: the eyebrow/title share the first row, the focus chip sits inline on the same row when present, and the subtitle occupies the second row.
- The dashboard slots now use a balanced two-row grid with slightly tighter padding, keeping the four structured layers visually symmetric while preserving internal scroll for dense content, and each layer is exposed as a named landmark region with a compact header layer index for structured navigation.
- The local connectome mini-map now exposes incoming/outgoing side toggles, highlights the toggle that matches the active anchor side, and keeps a focused-anchor chip visible; the neighboring path trail now mirrors the same compact side badge, and both stay synchronized with the neighboring text anchors and top header active-anchor banner, whose path display is compacted while preserving the full path in the tooltip, while the mini-map itself uses a tighter viewport and node spacing so graph pivots hold one shared visual anchor instead of acting like a passive diagram, and switching to a different selected result clears that shared focus state.
- Code-backed Zen results now project through a dedicated `StructuredCodeInspector` wrapper into a single-column AST waterfall with a numbered file-path prelude, a compact declaration identity lane, structured signature parts with explicit parameter and return rows, a single vertical validation/execution/return block stack, grouped symbol overlays, compact retrieval metadata on declaration and block atoms, and shared Shiki-backed generic syntax highlighting; the raw DirectReader content preview is reserved for non-code results
- The shared syntax highlighter now uses a curated fine-grained Shiki bundle instead of the full bundled runtime, and the markdown/rendering stack is split into its own initial chunk, so `npm run build` now lands without the earlier oversized `vendors-async-misc.js` / `vendors.js` asset warnings
- The Zen Search shell is lazy-loaded so the normal workspace startup path does not depend on the full Zen subtree at initial render time, then remains mounted as a persistent overlay once opened so the workspace state stays intact while the shell toggles visibility
- The `SearchBar` wrapper remains internal only; the public search entrypoint is `ZenSearchWindow`
- Studio bootstrap now keeps a static blank loading shell until the app is ready or blocked, and the workspace itself stays hidden until the first VFS load completes, so the startup flow does not visibly paint a loading panel during gateway connection
- The frontend entrypoint renders `StudioBootstrap` directly instead of wrapping it in `React.StrictMode`, which avoids the dev-only double-mount flash during gateway connection
- Source-focused reader mode with line highlighting; code files now enter source mode from their suffix even without a line target, and source lines reuse the shared Shiki-backed syntax highlighter used by fenced code blocks and AST/code fragments
- Markdown-backed reader mode now renders a waterfall layout with a document identity card, heading-based section cards, section-level `Copy for RAG` / `Pivot section` actions, compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and preserved rich slots for tables, math, mermaid, bi-links, and fenced code blocks while keeping source mode available for exact line inspection
- DiagramWindow now renders the same MarkdownWaterfall fallback for markdown-backed files when no embedded Mermaid or BPMN diagram body is available, instead of collapsing to the empty diagram hint; the fallback identity card keeps the `Title / Tags / Linked` hierarchy visible before the section stack
- MainView content and diagram panels now hold a loading fallback while selected file content is still hydrating, which avoids flashing the empty hint during gateway reconnects

## Documentation

- [docs/README.md](./docs/README.md) - Curated human entry point
- [docs/index.md](./docs/index.md) - Graph-structured docs kernel
- [docs/01_core/102_developer_onboarding.md](./docs/01_core/102_developer_onboarding.md) - Environment and startup flow
- [docs/01_core/105_docs_conventions.md](./docs/01_core/105_docs_conventions.md) - How the docs kernel is organized

## Focused Validation

The highest-value targeted frontend suite today is:

The shared Shiki syntax renderer now falls back to the current file suffix when a code block arrives with a generic `code` label or no explicit language tag, so `.py`, `.rs`, and `.jl` content still renders with syntax coloring through the same renderer.

```bash
direnv exec . npm test -- src/App.test.tsx src/components/ZenSearch/__tests__/ZenSearchWindow.test.tsx src/components/ZenSearch/__tests__/ZenSearchLayout.test.tsx src/components/ZenSearch/__tests__/ZenSearchWorkspace.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewShell.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewEntity.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewContent.test.tsx src/components/code-syntax/index.test.ts src/components/code-syntax/CodeSyntaxHighlighter.test.tsx src/components/ZenSearch/__tests__/CodeAstAnatomyView.test.tsx src/components/ZenSearch/StructuredDashboard/__tests__/StructuredCodeInspector.test.tsx src/components/ZenSearch/StructuredDashboard/__tests__/StructuredIntelligenceDashboard.test.tsx src/components/SearchBar/__tests__/SearchToolbar.test.tsx src/components/SearchBar/__tests__/SearchStatusBar.test.tsx src/components/SearchBar/__tests__/SearchBar.test.tsx src/components/panels/MainView/MainView.test.tsx src/components/panels/GraphView/__tests__/GraphView.test.tsx src/components/panels/DiagramWindow/__tests__/DiagramWindow.test.tsx src/components/panels/DirectReader/MarkdownWaterfall.test.tsx src/components/panels/DirectReader/DirectReader.test.tsx
```

For backend contract validation, pair that with:

```bash
direnv exec . cargo test -p xiuxian-wendao gateway::studio -- --nocapture
```
