# Qianji Studio

Frontend cockpit for the Wendao Studio gateway.

Qianji Studio is not a separate backend product. It is the interactive frontend layer that hydrates VFS, topology, graph, and semantic search data from the Wendao Studio runtime.

The current frontend lint lane is now a strict closure project instead of a
config-relaxation exercise. `.oxlintrc.json` stays unchanged as the acceptance
gate, and the active goal is to drive the current `377` warning baseline down
to `0` through code fixes and component-boundary refactors only.

## Local Development

Run commands from `.data/qianji-studio` and prefer the project environment:

```bash
direnv exec . npm run dev
direnv exec . npm run build
direnv exec . npm test
```

`npm run build` now also runs `scripts/check-build-size.mjs` after the Rspack
emit and fails if any emitted JS/CSS asset exceeds `2_400_000` bytes or if the
initial entry asset set referenced by `dist/index.html` exceeds `3_800_000`
bytes. That file is now a stable CLI entrypoint only; the reusable size-check
implementation now lives behind `scripts/build/index.mjs`, with pure asset and
budget logic split into `scripts/build/check-build-size-model.mjs` and runtime
execution split into `scripts/build/check-build-size-runtime.mjs`. The Rspack
warning thresholds and the post-build gate now share the same normalized
`scripts/rspack/build-size-budgets.mjs` source so the budgets cannot drift. The
split-chunk cache-group and async vendor naming policy now also live in
`scripts/rspack/chunk-policy.mjs`, leaving `rspack.config.ts` as the assembly
surface instead of the policy monolith. Gateway target parsing, plugin
construction, and dev-server proxy assembly now also live in
`scripts/rspack/build-environment.ts`. Browser targets, minimizer assembly, and
shared `Rspack` performance/experiments settings now also live in
`scripts/rspack/build-profile.ts`. Asset-resource and SWC loader rules now also
live in `scripts/rspack/module-rules.ts`. Static entry, output, and resolve
config now also live in `scripts/rspack/core-surface.ts`. The same helper
surface is re-exported through `scripts/rspack/index.ts`, so `rspack.config.ts`
consumes one coherent build-tooling barrel instead of a flat import list. The
normalized `scripts/rspack/*` tree plus the normalized `scripts/build/*`
surface now define the active build helper surface.

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

The dev proxy now uses an explicit keep-alive `node:http.Agent` for gateway
traffic. This is required because the underlying `http-proxy` default is
`agent = false`, which forces `connection: close` and creates a fresh upstream
socket for every proxied `/api/*` request. In local development that behavior
showed up as intermittent browser `NetworkError` events even while the gateway
process itself remained healthy.

The browser-facing Flight client under `src/api/flight/generated/` is consumed
directly as TypeScript source by Rspack, so generated imports must stay
extensionless instead of ending in `.js`. `scripts/generate-flight-client.mjs`
now emits the protobuf v2 `Flight_pb.ts` surface directly through
`protoc-gen-es 2.11.0`; the old `protoc-gen-connect-es` stage has been retired.
The active Flight stack in `package.json` is now:

- `apache-arrow 21.1.0`
- `@connectrpc/connect 2.1.1`
- `@connectrpc/connect-web 2.1.1`
- `@bufbuild/protobuf 2.11.0`
- `@bufbuild/protoc-gen-es 2.11.0`

For same-port Arrow Flight profiling against the live gateway, run:

```bash
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run test:hotspot-perf'
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run test:live-flight-perf'
```

`npm run test:hotspot-perf` records hotspot unit-trace artifacts for the live
typing/render path, including scenario-level traces for `sec lang:julia`,
repo-backed code-open canonicalization, and App-side repo-code hydration
without graph fetches, plus large-result-list selection shifts that should only
rerender the affected rows, plus a large code-result typing scenario that
tracks the left-pane render budget under the current `react-virtuoso`
threshold/window contract, plus dropdown selection-shift traces under the
shared `12`-item suggestion budget, plus a controller-level suggestion-hover
trace that proves the shell and left results pane stay stable when only the
dropdown highlight changes, plus an autocomplete-core no-op projection trace
that proves repeated identical suggestion collections do not add render churn,
plus a semantic refresh-key trace that proves equivalent filter/query rerenders
do not trigger another `autocomplete.refresh()`, plus a combined
`SearchInputHeader -> autocomplete refresh` trace that proves one semantic
input change only triggers one refresh, plus a SearchBar one-character
refinement trace that proves visible results settle on the refined query
without extra autocomplete churn, plus a keyboard suggestion-browsing trace
that proves selecting a highlighted dropdown suggestion settles the visible
results onto the selected query without stale result opens and closes the
dropdown instead of keeping suggestion churn alive after acceptance,
and writes
`$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_hotspot_perf_traces.json`.

The default `all` scope now treats code filters as frontend semantics instead
of raw backend query text: search execution and autocomplete strip `lang:`,
`repo:`, `kind:`, and `path:` tokens down to the base query before calling the
gateway, pure filter-only queries stay local, and the visible-result contract
is now explicit in tests: matching code hits win when they exist, otherwise the
view falls back to non-code results.

The repo-aware code lane is now Flight-first across every repo-facing search
facet. Same-origin Flight owns repo-content hits through
`src/api/flightRepoSearchTransport.ts`, the gateway repo-search route now
accepts the repo identifier per request instead of using one fixed mounted
repo, and the explicit `doc` facet now uses the dedicated
`/analysis/repo-doc-coverage` Flight route instead of the older JSON surface.

That boundary is now explicit in the main search interface too: when a
repo-aware `all` or `code` query has no explicit repo facet, the frontend no
longer fans out to repo-intelligence `module`, `symbol`, or `example` JSON
endpoints. The default repo-aware interface stays on Flight-backed
repo-content plus Flight-backed references, and the remaining JSON surfaces
are now limited to the intentional control-plane routes for health, UI
config/capabilities, and Julia deployment artifact inspection.

Those remaining JSON/control routes are now explicitly centralized under
`src/api/controlPlane/*`. `src/components/panels/VfsSidebar/VfsSidebar.tsx`
no longer issues its own `fetch('/api/vfs/scan')`; it now consumes the shared
`api.scanVfs()` facade so production component code does not own raw `/api/`
calls on the active studio surface.

The explicit `symbol` facet now also rides that Flight route instead of the
older repo-intelligence symbol endpoint. Parsed `kind:` filters become
repo-search `tagFilters`, so queries such as `repo:foo kind:function solve`
stay on the same Flight-backed repo-content surface while still narrowing to
symbol-like code hits.

The explicit `module` facet now also rides that Flight route. Repo-aware
module queries enforce `tagFilters = ["kind:module"]` on repo-search Flight,
and the repo-overview display-name fallback now retries that same Flight path
instead of dropping back to `/api/repo/module-search`.

The explicit `example` facet now also rides that Flight route. Repo-aware
example queries enforce `tagFilters = ["kind:example"]` on repo-search Flight,
and the repo-overview display-name fallback now retries that same Flight path
instead of dropping back to `/api/repo/example-search`.

The explicit `doc` facet now also stays on Flight, but it intentionally uses a
dedicated repo doc-coverage route instead of repo-search hits. The frontend
now calls `/analysis/repo-doc-coverage`, which returns normalized coverage
rows plus summary metadata and an optional `module` filter without falling
back to `/api/repo/doc-coverage`.

Repo overview now also stays on Flight. The frontend `api.getRepoOverview(...)`
path now uses the dedicated `/analysis/repo-overview` route instead of
`/api/repo/overview`, so repo-overview status chips and repo-overview fallback
logic no longer depend on the JSON repo-analysis surface.

Repo index status now also stays on Flight. The frontend
`api.getRepoIndexStatus(...)` path now uses `/analysis/repo-index-status`
instead of `/api/repo/index/status`, so the active repo-aware status lane no
longer depends on the JSON repo-index status endpoint.

Repo sync now also stays on Flight. The frontend `api.getRepoSync(...)` path
now uses `/analysis/repo-sync` instead of `/api/repo/sync`, so the active
repo-aware query/status lane no longer depends on the JSON repo-sync surface.
Repo index commands now also stay on Flight. The frontend
`api.enqueueRepoIndex(...)` path now uses `/analysis/repo-index` with a
request-scoped command id instead of `POST /api/repo/index`, so the active
repo-aware mutation lane no longer depends on the JSON repo-index enqueue
surface either.
VFS scan and topology now also stay on same-origin Flight. The frontend
`api.scanVfs()` path now uses `/vfs/scan`, and `api.get3DTopology()` now uses
`/topology/3d`, so the remaining non-Flight `/api/` surface is limited to the
intentional control-plane routes for health, UI config/capabilities, and Julia
deployment artifact inspection.

The legacy repo-intelligence JSON convenience methods
`api.searchRepoModules(...)`, `api.searchRepoSymbols(...)`, and
`api.searchRepoExamples(...)` are no longer part of the active public client
facade. The SearchBar repo-aware lane now proves its `module` / `symbol` /
`example` behavior directly against repo-search Flight contracts instead of
keeping those older JSON helper methods alive in the top-level runtime client.
The repo-index enqueue surface now also uses the dedicated
`src/api/flightRepoIndexTransport.ts` module. The older
`repoIndexCommandTransport.ts` helper is retired, so the frontend no longer
keeps a JSON-only repo-index command seam alongside the Flight-backed repo
status/search surfaces.

The harness reads the checked-in `wendao.toml`, pushes the current runtime UI config,
and measures `/search/knowledge` with the default query set `diffeq`, `solver`,
and `optimization`. The current local config defines `179`
`link_graph.projects.*` entries. Override `STUDIO_LIVE_FLIGHT_PERF_QUERIES`,
`STUDIO_LIVE_FLIGHT_PERF_LIMIT`, `STUDIO_LIVE_FLIGHT_PERF_WARMUP_RUNS`, and
`STUDIO_LIVE_FLIGHT_PERF_MEASURED_RUNS` to tune the run. Each live run also
writes JSON and CSV artifacts to
`$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_live_flight_search_perf.{json,csv}`;
the harness now treats the exported `PRJ_CACHE_HOME` env var as the absolute
project cache root directly. The JSON artifact now also includes a per-phase
breakdown for `GetFlightInfo`, `DoGet`, Arrow IPC reassembly, hit decoding, and
metadata decoding so live runs can identify the actual hotspot instead of only
recording end-to-end latency, and it now also records the optional hotspot-unit
artifact path/count when
`$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_hotspot_perf_traces.json` is
present. The harness now also retries transient
gateway-startup control-plane failures such as `EADDRNOTAVAIL` during the
`/health` and `/ui/config` preflight, normalizes loopback origins, and waits
for search/repo status to settle before measured runs begin, so a
just-restarted local gateway no longer pollutes the perf suite with bootstrap
noise. The latest same-port `127.0.0.1:9517` steady-state rerun after the
runtime `DoGet` encoded-frame reuse slice plus the explicit `react-virtuoso`
list-budget contract reports `2.49ms` average, `5.17ms` P95, with
`GetFlightInfo` averaging `0.91ms`, `DoGet` averaging `0.78ms`, and the shared
hotspot artifact carrying `19` scenario records across the default
`179`-repository config. The full report is in
[`docs/05_research/308_live_flight_search_perf_report.md`](./docs/05_research/308_live_flight_search_perf_report.md).

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
- The right-side Structured Intelligence Dashboard (SID) renders topology, fragments, relational projection, and a local connectome for non-code results. Code-backed results render through a dedicated `StructuredCodeInspector` wrapper that projects a single-column AST waterfall with a numbered file-path prelude, declaration identity, structured signature parts, logic block decomposition, symbol overlays, compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`) across declaration, block, symbol, and ranked anchor atoms, and explicit `Pivot declaration` / `Pivot block` / `Pivot symbol` / `Pivot anchor` plus `Copy for RAG` actions on those same code atoms, while markdown-backed DirectReader content renders through `MarkdownWaterfall` inside a dedicated ZenSearch markdown reading tray with a document identity card that foregrounds `Title`, `Tags`, and `Linked` before compact heading-based section index cards, section-level `Copy for RAG` / `Pivot section` actions, compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and nested rich slots for tables, math, mermaid, bi-links, and fenced code blocks with shared slot headers.
- Code AST declaration, logic-block, and symbol atoms now prefer backend-issued `retrievalAtoms` from `/api/analysis/code-ast`; logic-block chunks now also carry backend-issued display labels and excerpts, and the logic-block rail still falls back to local inference only when no matching backend block chunk is available.
- The top header now uses a compact two-line layout on wide screens and stacks responsively on narrower screens: the eyebrow/title share the first row, the focus chip sits inline on the same row when present, and the subtitle occupies the second row.
- The dashboard slots now use a balanced two-row grid with slightly tighter padding, keeping the four structured layers visually symmetric while preserving internal scroll for dense content, and each layer is exposed as a named landmark region with a compact header layer index for structured navigation.
- The local connectome mini-map now exposes incoming/outgoing side toggles, highlights the toggle that matches the active anchor side, and keeps a focused-anchor chip visible; the neighboring path trail now mirrors the same compact side badge, and both stay synchronized with the neighboring text anchors and top header active-anchor banner, whose path display is compacted while preserving the full path in the tooltip, while the mini-map itself uses a tighter viewport and node spacing so graph pivots hold one shared visual anchor instead of acting like a passive diagram, and switching to a different selected result clears that shared focus state.
- Code-backed Zen results now project through a dedicated `StructuredCodeInspector` wrapper into a single-column AST waterfall with a numbered file-path prelude, a compact declaration identity lane, structured signature parts with explicit parameter and return rows, a single vertical validation/execution/return block stack, grouped symbol overlays, compact retrieval metadata plus explicit `Pivot declaration` / `Pivot block` / `Pivot symbol` / `Pivot anchor` and `Copy for RAG` on declaration, block, symbol, and ranked anchor atoms, and shared Shiki-backed generic syntax highlighting; the raw DirectReader content preview is reserved for non-code results
- `CodeAstAnatomyView.tsx` now delegates locale copy, signature-row shaping, displayed line-range derivation, and declaration/block/symbol/anchor copy payload builders to `codeAstAnatomyViewModel.ts`, so the AST waterfall UI shell no longer carries that helper logic inline
- `codeAstAnatomy.ts` now delegates retrieval atom typing, backend lookup, frontend fallback atom construction, and shared retrieval-atom resolution to `codeAstRetrievalHelpers.ts`, so AST projection code no longer mixes UI-model derivation with retrieval-contract plumbing in one file
- `codeAstAnatomy.ts` now also delegates shared projection primitives to `codeAstProjectionShared.ts`, signature parsing/snippet extraction to `codeAstSignatureHelpers.ts`, logic-block assembly to `codeAstBlockHelpers.ts`, and symbol/anchor grouping to `codeAstSymbolHelpers.ts`, so the AST anatomy layer is split by concern instead of continuing as one projection monolith
- `StructuredIntelligenceDashboard.tsx` now delegates path/anchor formatting and focus resolution to `structuredDashboardShared.ts`, and card/list/fragment renderer helpers to `structuredDashboardRenderers.tsx`, so the dashboard shell stays focused on orchestration instead of carrying every structured rendering helper inline
- `CodeAstAnatomyView.tsx` now delegates the file prelude, declaration lane, logic-block lane, and symbol/anchor lane to `codeAstAnatomySections.tsx`, so the main AST waterfall view focuses on preview-state wiring and model derivation instead of holding the full presentational body inline
- The shared syntax highlighter now uses a curated fine-grained Shiki bundle instead of the full bundled runtime, and the markdown/rendering stack is split into its own initial chunk, so `npm run build` now lands without the earlier oversized `vendors-async-misc.js` / `vendors.js` asset warnings
- The Zen Search shell is lazy-loaded so the normal workspace startup path does not depend on the full Zen subtree at initial render time, then remains mounted as a persistent overlay once opened so the workspace state stays intact while the shell toggles visibility
- `StudioBootstrap` now lazy-loads the workspace `App` after gateway health and UI-config sync succeed, so the initial `main` entry keeps only the bootstrap shell instead of eagerly pulling the full workspace tree into first paint
- Shiki syntax highlighting now loads as a small async runtime core plus per-language and per-theme lazy chunks, so code highlighting no longer emits one oversized monolithic async Shiki asset
- The `SearchBar` wrapper remains internal only; the public search entrypoint is `ZenSearchWindow`
- Studio bootstrap now keeps a static blank loading shell until the app is ready or blocked, and the workspace itself stays hidden until the first VFS load completes, so the startup flow does not visibly paint a loading panel during gateway connection
- The frontend entrypoint renders `StudioBootstrap` directly instead of wrapping it in `React.StrictMode`, which avoids the dev-only double-mount flash during gateway connection
- Source-focused reader mode with line highlighting; code files now enter source mode from their suffix even without a line target, and source lines reuse the shared Shiki-backed syntax highlighter used by fenced code blocks and AST/code fragments
- Markdown-backed reader mode now renders a waterfall layout with a document identity card, heading-based section cards, section-level `Copy for RAG` / `Pivot section` actions, compact retrieval metadata (`chunk id`, `semantic type`, `fingerprint`, `token estimate`), and preserved rich slots for tables, math, mermaid, bi-links, and fenced code blocks while keeping source mode available for exact line inspection
- Zen Search markdown preview now also requests `/api/analysis/markdown` and prefers backend-issued document/section `retrievalAtoms` for markdown waterfall cards when analysis is available; local chunk derivation remains the fallback for intro sections and other paths without backend atoms, while section copy payloads now also prefer backend-issued excerpts when present
- Markdown code and mermaid rich slots now also prefer backend-issued markdown `retrievalAtoms` when `/api/analysis/markdown` includes `code block` atoms, and those rich slots now surface the same compact retrieval metadata plus `Copy for RAG` action used by section cards; slot copy payloads also prefer backend-issued excerpts when present
- Markdown table rich slots now also prefer backend-issued markdown `retrievalAtoms` when `/api/analysis/markdown` includes `table` atoms, and those table slots now surface the same compact retrieval metadata plus `Copy for RAG` action instead of remaining presentation-only; table copy payloads also prefer backend-issued excerpts when present
- Markdown display-math rich slots now also prefer backend-issued markdown `retrievalAtoms` when `/api/analysis/markdown` includes `math:block` atoms, and those formula slots now surface the same compact retrieval metadata plus `Copy for RAG` action as the other markdown waterfall atoms; math copy payloads also prefer backend-issued excerpts when present
- Markdown observation rich slots now also prefer backend-issued markdown `retrievalAtoms` when `/api/analysis/markdown` includes `observation` atoms, and those blockquote cards now surface the same compact retrieval metadata plus `Copy for RAG` action as the other markdown waterfall atoms
- `MarkdownWaterfall.tsx` is now reduced to a thin orchestration shell, with shared copy/contracts, bi-link parsing, waterfall model assembly, and rich-slot rendering split into dedicated helper modules so the markdown retrieval surface no longer depends on a single 1500+ line file
- `ZenSearchPreviewEntity.tsx` now delegates markdown-vs-structured preview detection to `zenSearchPreviewSurface.ts`, and delegates the markdown/structured bridge bodies to `zenSearchPreviewBridges.tsx`, so the Zen preview shell no longer mixes route selection with both preview render paths inline
- `useZenSearchPreview.ts` now delegates preview-path planning and parallel content/graph/code-ast/markdown loading to `zenSearchPreviewLoaders.ts`, so the hook no longer mixes state orchestration with per-surface retrieval plumbing inline
- `ZenSearchPreviewPane.tsx` now delegates the rendered pane frame to `ZenSearchPreviewPaneView.tsx`, and `ZenSearchPreviewShell.tsx` now delegates placeholder-vs-entity branching to `zenSearchPreviewShellContent.tsx`, so the preview controller, container shell, and body routing each live in their own small module
- Studio analysis bindings now expose a shared `RetrievalChunk` / `RetrievalChunkSurface` contract across markdown and code AST responses, while markdown/code-specific `retrievalAtoms` remain narrowed views over that same cross-surface payload
- The frontend now ships `apache-arrow` and materializes retrieval atoms into shared Arrow-backed lookup tables, so code AST owner/surface resolution and markdown section/rich-slot range queries both run against the same columnar local query path instead of ad hoc `Map`/array scans
- Zen preview now consumes raw VFS content, markdown, and code-AST over the
  same-origin Flight business routes, and the older `retrieval-arrow` overlay
  story is no longer the active architecture
- Zen search knowledge, symbol, reference, attachment, and AST lanes now all
  consume the canonical same-origin Flight business routes directly; the older
  `hits-arrow` overlay story is retired debt rather than the current frontend
  design
- Arrow IPC remains only as the Flight record-batch codec used by the shared
  frontend decode helpers, not as a separate business transport surface
- The frontend API client now delegates search, repo-search, graph, workspace,
  document, and analysis business routes to the dedicated
  `src/api/flight*.ts` transport modules, so `src/api/client.ts` no longer
  owns business-route wiring inline
- The frontend API client now also delegates repo-index commands to
  `src/api/flightRepoIndexTransport.ts`, so the active repo-aware repo-index
  mutation lane no longer depends on `POST /api/repo/index`
- The frontend API client now also delegates its intentional JSON
  control-plane surface to `src/api/controlPlane/*`, while
  `src/api/uiConfigTransport.ts` keeps the UI config sync/retry state and
  capabilities cache behavior
- The frontend API client now also delegates shared `ApiClientError`, JSON response parsing, and binary response parsing to `src/api/responseTransport.ts`, so `src/api/client.ts` no longer owns the common response-transport seam inline
- The frontend API client now also delegates the remaining health seam through
  `src/api/controlPlane/*`, while VFS scan and topology now ride the dedicated
  `src/api/flightWorkspaceTransport.ts` and `src/api/flightGraphTransport.ts`
  business transports
- The frontend API client now also delegates projected-page-index and
  refine-doc same-origin Flight wiring to
  `src/api/flightProjectedPageIndexTransport.ts` and
  `src/api/flightRefineEntityDocTransport.ts`, so `src/api/client.ts` no
  longer owns the active document business-transport seam inline
- The frontend API client now also delegates its remaining public repo/UI contract interfaces to `src/api/apiContracts.ts`, so `src/api/client.ts` no longer owns the contract surface inline
- The frontend API client now also keeps all runtime wiring in `src/api/clientRuntime.ts`, while `src/api/client.ts` is reduced to the stable public facade for runtime exports plus type re-exports
- Internal API helpers no longer type-import the public `client.ts` facade;
  helper modules now consume `src/api/apiContracts.ts` directly so the helper
  dependency graph stays pointed inward
- `src/api/index.ts` now acts as the stable public barrel for API consumers, re-exporting the facade plus the dedicated contract/error surface instead of remaining a trivial client forwarder
- The frontend API client now also exposes the Studio Julia deployment artifact inspection surface through `api.getJuliaDeploymentArtifact()` and `api.getJuliaDeploymentArtifactToml()`, backed by a dedicated `UiJuliaDeploymentArtifact` contract in `src/api/apiContracts.ts`
- Qianji Studio now also consumes that deployment artifact in the workspace `StatusBar`, surfacing a compact Julia rerank chip with a hover inspection popover for artifact metadata, transport coordinates, launcher path, service mode, and analyzer strategy
- The same `StatusBar` inspection popover now also exposes `Copy TOML` and `Download JSON` actions, so the resolved Julia deployment artifact can be exported directly from the live workspace shell
- The Julia deployment inspection formatting and export behavior now also live in the feature folder `src/components/juliaDeploymentInspection/`, split into explicit `format`, `actions`, `types`, and `index` seams so `App.tsx` and `StatusBar.tsx` no longer each own their own artifact parsing/export rules inline
- The same feature folder now also owns a dedicated `View.tsx` subview for the Julia deployment popover, so `StatusBar.tsx` remains the status-orchestration surface instead of also owning the artifact popover rendering tree
- `StatusBar.tsx` now also mounts a dedicated `statusBar/RepoIndexStatusView.tsx` subview for the repo-index diagnostics chip/popover, so both major status popovers now live below the top-level orchestration surface
- The remaining derived status labels and tones now also live in `src/components/statusBar/model.ts`, so `StatusBar.tsx` is reduced to state wiring plus subview assembly instead of mixing derivation and rendering concerns
- The repo-index chip/popover contract now also lives in the shared `statusBar/` feature-folder surface as `RepoIndexStatusViewModel`, so `statusBar/model.ts` and `RepoIndexStatusView.tsx` share one view contract instead of re-declaring the subview props inline
- The Julia deployment inspection feature folder now also owns the local copy/download action-state controller in `src/components/juliaDeploymentInspection/controller.ts`, so `StatusBar.tsx` no longer manages analyzer-export feedback state inline
- Shared `RepoIndexStatus`, `RuntimeStatus`, and `VfsStatus` contracts now also live in `src/components/statusBar/types.ts` behind the `statusBar/index.ts` feature-folder surface, so repo-diagnostics, FileTree, and MainView code no longer import shared types back out of `StatusBar.tsx`; those imports now also use explicit `statusBar/*` file paths to avoid `StatusBar.tsx` vs `statusBar/` ambiguity on case-insensitive filesystems
- The left-pane SearchBar now also assembles its visible result list, section stack, and code-filter catalog through local Arrow-backed view helpers, so scope filtering, code-filter matching, dedupe, sort, and code facet extraction run against shared columnar tables before the existing `SearchResult[]` rows and section props are handed back to the UI
- SearchBar all-mode execution now delegates its multi-lane aggregation, fallback shaping, and merged runtime warning assembly to `searchExecutionAllMode.ts`, so the main execution file no longer owns the largest cross-lane branch inline
- SearchBar all-mode execution now further delegates fallback response builders and merged result/meta shaping to `searchExecutionAllModeHelpers.ts`, so the all-mode module itself is down to fan-out orchestration plus settled-lane resolution
- SearchBar all-mode execution now also preserves repo-aware code-search options from ZenSearch default scope, strips inline `repo:` filters before the semantic lanes are issued, keeps the default repo-aware lane on repo-search Flight plus Flight-backed references, and still forwards the raw repo-aware query into backend `code_search` intent metadata, so repo-scoped code queries work from the default full-screen search surface instead of only from dedicated code mode
- The frontend live gateway suite now also covers the JSON repo-intelligence search surface in `src/api/liveRepoSearchGateway.test.ts`, so live repo search no longer rides only on unit mocks while same-origin Flight `code_search` is verified separately in `src/api/liveCodeSearchGateway.test.ts`
- SearchBar code-mode execution now also delegates its repo-aware orchestration, backend intent metadata resolution, and fallback result shaping to `searchExecutionCodeMode.ts`, so the main execution file no longer owns the repo-specific code branch inline
- SearchBar code-mode execution now further delegates repo-aware settled-result resolution, fallback selection, and standalone code-search shaping to `searchExecutionCodeModeHelpers.ts`, so the code-mode module itself is down to fan-out orchestration and route selection
- SearchBar simple execution responders now delegate their reference, attachment, AST, symbol, and knowledge index contracts to `searchExecutionSimpleModes.ts`, so `searchExecution.ts` is now a thin mode router instead of a mixed orchestration-plus-response formatter
- SearchBar execution types now live in `searchExecutionTypes.ts`, so helper modules no longer type-import the main router file and the execution surface is organized as one router plus explicit shared contracts
- `useSearchBarController.tsx` now delegates data-flow, interaction, and view-model assembly to `useSearchBarControllerPresentation.ts`, so the top-level controller hook stays focused on state hooks, repo slice wiring, reset behavior, and final result assembly
- ZenSearch preview loading now runs through explicit base, code-AST, and markdown lanes, so AST preview completion no longer waits for slower VFS, graph, or markdown work before the AST pane leaves its loading state
- The AST waterfall loading copy now says `Loading AST analysis...` instead of `Compiling AST anatomy view...`, so the UI no longer misattributes backend/proxy wait time to frontend compilation
- The MainView content pane now mounts `DirectReader` through the same lazy loader surface used by the other heavy panels, and the Rspack markdown policy now splits `markdown-core`, `mermaid`, and `katex` into async chunks; the production build no longer pulls the old `markdown.js` blob into the initial entrypoint, which is now down to `0.481 MiB`
- `DirectReader` now defers its rich markdown runtime through `DirectReaderRichContent`, so `react-markdown`, Mermaid, KaTeX, and the markdown waterfall stay behind a panel-local lazy seam instead of being imported directly into the reader shell; focused DirectReader regressions were updated to wait for lazy rich hydration and the production build still holds the initial entrypoint at `0.481 MiB`
- `MarkdownWaterfall` now further defers section-body markdown rendering through `MarkdownWaterfallSectionBody`, so the identity card and section chrome render before the heaviest `ReactMarkdown`/Mermaid/KaTeX/code-slot runtime hydrates; the focused waterfall and reader regressions remain green and the production build still keeps the initial entrypoint at `0.481 MiB`
- `MarkdownWaterfall` code slots now further defer syntax-highlighted code rendering through `MarkdownWaterfallCodeSlot`, so Shiki-backed code blocks no longer hydrate inline with the rest of the slot renderer path; focused reader/waterfall regressions remain green and the production build still keeps the initial entrypoint at `0.481 MiB`
- A follow-up bundle audit now confirms those nested seams are real in the emitted assets: `MarkdownWaterfallCodeSlot` lands as its own small async chunk (`757.js`), while the dominant remaining markdown-rich async asset is still `mermaid.js`; the next optimization slice should therefore target Mermaid-specific runtime rather than more Shiki splitting
- `MarkdownWaterfall` Mermaid slots now also defer their `beautiful-mermaid` runtime through `MarkdownWaterfallMermaidSlot`, so Mermaid-backed markdown blocks no longer keep that runtime wired into `markdownWaterfallComponents.tsx`; source-map inspection confirms the Mermaid slot now lands behind its own async seam while `mermaid.js` remains the dominant markdown-rich asset
- Mermaid runtime assembly now also lives behind the shared `src/components/panels/mermaidRuntime/` surface, so `DiagramWindow`, `DirectReaderRichContent`, and `MarkdownWaterfallMermaidSlot` no longer own separate Mermaid import patterns; source grep now shows `beautiful-mermaid` only under that shared loader while the initial entrypoint still holds at `0.481 MiB`
- Mermaid rendering now also runs through an explicit dialect preflight gate inside `src/components/panels/mermaidRuntime/analysis.ts`, so only the inline-supported dialects (`flowchart`/`graph`, `state`, plus ambiguous sources) activate the shared runtime; explicit `sequenceDiagram`, `classDiagram`, `erDiagram`, and `xychart` blocks now fall back directly to source/error UI instead of pretending the inline renderer is still loading
- Mermaid runtime loading now also runs through a provider-neutral adapter surface in `src/components/panels/mermaidRuntime/provider.ts` and `src/components/panels/mermaidRuntime/providers/beautifulMermaid.ts`, so the current `beautiful-mermaid` implementation is isolated behind one adapter instead of leaking a library-shaped contract into DiagramWindow or DirectReader consumers
- Mermaid bundle telemetry now also has a stable CLI at `scripts/mermaid-bundle-report.mjs` plus a split model/runtime surface under `scripts/build/`; the current rebuilt dist frontier reports `mermaid.js` at `1604102` bytes while the initial entrypoint still holds at `0.481 MiB`
- The active Mermaid provider now also exposes a typed manifest with `providerName`, `packageName`, supported inline dialects, and payload notes; the bundle report prints that manifest context before the asset sizes, so future provider swaps can be evaluated against an explicit contract instead of shell notes
- The shared Mermaid runtime can now also load a bounded local `compact-flow` spike provider by name; that provider does not depend on ELK or `beautiful-mermaid`, only supports simple arrow-connected `flowchart`/`graph`/`state` diagrams, and is currently intended for feasibility comparison rather than default UI rendering
- Mermaid provider comparisons now also run against a fixed bakeoff corpus in `src/components/panels/mermaidRuntime/bakeoffFixtures.ts`; the current corpus keeps `beautiful-mermaid` green while pinning `compact-flow` to an explicit bounded subset instead of an open-ended compatibility claim
- `compact-flow` now also supports single-layer flowchart `subgraph` blocks through a bounded group-shell renderer, so the bakeoff corpus has advanced one step: `subgraph` is now green for the spike provider, while decision-node syntax remains the next explicit miss
- `compact-flow` now also supports flowchart decision nodes as bounded diamond nodes, so the current bakeoff corpus is green for the spike provider across the targeted flowchart subset
- `compact-flow` now also supports single-layer state composite blocks through the same bounded group-shell pattern used for flowchart subgraphs, so the bakeoff corpus is green across the currently targeted flowchart/state subset; nested composites and richer state-machine semantics remain intentionally unsupported
- Studio capabilities no longer advertise a browser Arrow search transport; the active Julia deployment inspection surface now points directly at the Flight `/rerank` route and `/healthz`
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
