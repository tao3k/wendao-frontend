# Live Flight Search Performance Report

:PROPERTIES:
:ID: qianji-studio-live-flight-search-performance-report
:PARENT: [[index]]
:TAGS: research, performance, flight, search
:STATUS: ACTIVE
:END:

## Scope

This report captures the current same-origin Arrow Flight search profile for the
Qianji Studio frontend against the live Wendao gateway. It also tracks the
ZenSearch preview/info-panel chain from query dispatch through base preview
readiness and AST or markdown analysis readiness.

## Test Surface

- Frontend client: `src/api/flightSearchTransport.ts`
- Live perf harness: `src/api/liveFlightSearchPerf.test.ts`
- Live ZenSearch preview harness: `src/api/liveZenSearchPerf.test.ts`
- Live gateway origin: `http://127.0.0.1:9517`
- Flight service path: same-origin `POST /arrow.flight.protocol.FlightService/*`
- Search route under test: `/search/knowledge`
- Local config source: checked-in `wendao.toml`

## Environment

- Configured `link_graph.projects.*`: `179`
- Materialized UI projects: `2`
- Queries: `diffeq`, `solver`, `optimization`
- Limit: `20`
- Warmup runs per query: `1`
- Measured runs per query: `3`

## 2026-04-12 Cold-Start Live Result

- Gateway start mode: fresh `wendao gateway start` after local Valkey startup
- Local corpus readiness: `set_ui_config` triggered deferred local indexing,
  and the local corpora published readable empty epochs before prewarm
- Query selection: auto-discovered from the current surface with
  `queryPlanSource="code_search"`
- Intent used: `code_search`
- Queries used: `diffeq`, `solver`, `optimization`
- Cold-start measured average: `2.23ms`
- Cold-start P95: `2.25ms`
- Cold-start max: `2.25ms`

This matters because the earlier live failure mode was not request latency. The
fresh gateway could return `[INDEX_NOT_READY]` while local corpus builds were
still waiting on prewarm. That cold-start stall is now off the critical path:
the gateway can publish readable local epochs immediately, and the harness no
longer fails just because the active surface changed away from one historical
query list.

## Validation Commands

```bash
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run build'
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run test:hotspot-perf'
direnv exec . bash -lc 'cd .data/wendao-frontend && npm test -- src/api/liveZenSearchPerf.test.ts'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-gateway'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-flight-perf'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 STUDIO_LIVE_GATEWAY_URL=http://127.0.0.1:9517 npm run test:live-zen-search-perf'
```

## 2026-04-12 Live ZenSearch Preview Chain

The new ZenSearch live harness measures four frontend-owned phases on the
restarted default gateway:

1. search result arrival
2. preview-plan resolution
3. content-first base preview settlement for the visible info-panel shell
4. graph-summary settlement when a non-code preview requests neighbors
5. analysis settlement for the code AST or markdown analysis panel

### Code AST Sample

- Query: `diffeq`
- Intent: `code_search`
- Result path: `Modelica/Blocks/package.mo`
- Content path: `mcl/Modelica/Blocks/package.mo`
- Search: `1.85ms`
- Resolve preview plan: `0.08ms`
- Base preview settled: `2.10ms`
- AST analysis settled: `3.15ms`
- Search to base preview settled: `3.95ms`
- Search to AST analysis settled: `5.00ms`
- Content bytes: `152147`
- AST node count: `39`
- Retrieval atom count: `78`

### Markdown Sample

- Query: `topology`
- Intent: `knowledge`
- Result path: `docs/00_vision/TRINITY_MANIFESTO.md`
- Content path: `frontend/docs/00_vision/TRINITY_MANIFESTO.md`
- Search: `1.36ms`
- Resolve preview plan: `0.03ms`
- Base preview settled: `2.29ms`
- Graph summary settled: `2.87ms`
- Markdown analysis settled: `4.22ms`
- Search to base preview settled: `3.65ms`
- Search to graph summary settled: `4.23ms`
- Search to markdown analysis settled: `5.58ms`
- Content bytes: `12026`
- Markdown analysis node count: `34`
- Retrieval atom count: `34`

This sample matters because it separates transport latency from the first
visible ZenSearch panel states. On the current restarted gateway, markdown
preview content now becomes visible before graph summary completion, so the
graph lane no longer blocks the info-panel shell. The remaining visible-path
cost is the content fetch itself, not graph-neighbor decoration.
The preview runtime is also easier to trace now because state/load-need policy
and async lane helpers are no longer fused into a single hook file.

## Current Default-Gateway Results

### End-to-End Summary

- Overall average: `2.49ms`
- P50: `2.07ms`
- P95: `5.17ms`
- Max: `5.17ms`

### Phase Breakdown

- `GetFlightInfo`: average `0.91ms`, P95 `1.64ms`
- `DoGet`: average `0.78ms`, P95 `1.49ms`
- Hit decoding: average `0.68ms`, P95 `1.67ms`
- Arrow IPC reassembly: average `0.02ms`, P95 `0.06ms`
- Metadata decoding: average `0.02ms`, P95 `0.06ms`
- Ticket read: average `0.01ms`, P95 `0.03ms`

### Per-Query Summary

| Query          |      Avg |      P95 | Avg Hits | GetFlightInfo Avg | DoGet Avg |
| -------------- | -------: | -------: | -------: | ----------------: | --------: |
| `diffeq`       | `2.07ms` | `2.63ms` |      `4` |          `0.82ms` |  `0.71ms` |
| `solver`       | `1.89ms` | `2.39ms` |     `20` |          `0.69ms` |  `0.56ms` |
| `optimization` | `3.52ms` | `5.17ms` |     `19` |          `1.20ms` |  `1.08ms` |

## Comparison to Earlier Same-Port Checkpoints

- Fresh `9519` gateway after the runtime payload-cache slice:
  - `GetFlightInfo`: `117.58-126.14ms`
  - `DoGet`: `1.96-2.12ms`
- Fresh `9519` gateway after the Studio aggregate-provider response-reuse slice:
  - `GetFlightInfo`: `41.03-46.15ms`
  - `DoGet`: `0.75-1.10ms`
- Earlier default `9517` gateway warm-state checkpoint:
  - `GetFlightInfo`: average `3.63ms`
  - `DoGet`: average `1.00ms`
- Default `9517` gateway after the runtime route-payload reuse slice:
  - `GetFlightInfo`: average `1.38ms`
  - `DoGet`: average `1.31ms`
- Current default `9517` gateway after the runtime `DoGet` encoded-frame reuse
  slice:
  - `GetFlightInfo`: average `0.86ms`
  - `DoGet`: average `0.79ms`

The important trend is stable: the frontend is not the bottleneck, and the
remaining request-path cost is now comfortably sub-millisecond per phase for
both `GetFlightInfo` and `DoGet`. The default gateway profile is firmly in low
single-digit milliseconds for the sampled search queries.

## Findings

1. The current pure Flight frontend path is healthy in steady state. The hot
   request path is not the production restart blocker anymore.
2. Browser-side work is cheap. Hit decoding, metadata decoding, and Arrow IPC
   reassembly remain below `1ms` combined.
3. The runtime route-payload reuse slice plus the new encoded-frame reuse slice
   materially reduced both server phases. `GetFlightInfo` is now `0.91ms`
   average and `DoGet` is now `0.78ms` average in the current warm
   steady-state run.
4. The live perf harness exposed operator-path noise rather than a request-path
   regression: loopback address instability, startup-time `/api/ui/config`
   churn, and search/repo bootstrap recovery could all distort a just-restarted
   sample. The harness now explicitly gates on a readable steady state before
   measuring: no blocking repo-backed corpus issues, readable `repo_entity` and
   `repo_content_chunk` publications, and visible repo-index progress. It no
   longer waits for the entire background repo queue to drain after restart.
5. The remaining production-line risk is restart and corpus recovery behavior,
   not Arrow Flight request latency.
6. Local search cold start is now bounded by readable publication, not by
   prewarm completion. Empty local corpora still publish explicit zero-row
   epochs, and `set_ui_config` now activates the local search plane early
   enough for a fresh live gateway to answer the first search without waiting
   on prewarm.
7. The live perf harness now adapts to the active UI surface. When no explicit
   query override is provided, it probes the current surface, keeps the first
   hit-bearing query set, and records both `searchIntent` and
   `queryPlanSource` in the artifact. On the current repo-heavy surface, the
   harness selected the historical `diffeq` / `solver` / `optimization` terms
   through `code_search` intent instead of failing with a zero-hit generic
   knowledge query.
8. Hotspot unit traces are now part of the same performance workflow.
   `npm run test:hotspot-perf` records render-count and interaction-count
   snapshots for SearchBar typing, visible-result derivation, stable result-list
   rerendering, and ZenSearch preview/prefetch behavior, plus scenario-level
   traces for `sec lang:julia`, repo-backed code-result open/canonicalization,
   App-side repo-code hydration without graph fetches, and large result-list
   selection shifts that should rerender only the affected rows, plus the
   explicit large code-result typing scenario for the `react-virtuoso`
   budgeted list path, then writes one JSON artifact that the live Flight perf
   harness can reference in its own report. The current hotspot artifact
   contains `18` scenario records.
9. The `all`-scope code-filter contract is now verified at three layers.
   Search execution strips code filters down to the base query before hitting
   the gateway, pure filter-only queries stay local and only expose filter
   suggestions, and the visible-result layer now distinguishes between
   `matching code hits exist` and `no code hit matches so fall back to non-code
results`.
10. The left result pane now has an explicit virtualization budget. The static
    list threshold, initial virtual window, and overscan are locked in
    `VirtualizedSearchResultsList`, and the hotspot trace suite now includes a
    large code-result typing scenario so render-pressure drift shows up as JSON
    artifact changes instead of subjective typing lag.
11. The suggestion dropdown now follows the same budgeted-contract pattern. The
    visible suggestion slice is capped at `12` items inside the autocomplete
    state source, and the hotspot trace suite now records dropdown
    selection-shift paint drift so keyboard browsing regressions are visible in
    the shared JSON artifact.
12. Suggestion hover now has its own controller-level stability contract. The
    SearchBar controller keeps suggestion highlight separate from result
    selection, reuses a stable toggle callback, and the hotspot suite records a
    trace proving suggestion-hover rerenders reuse both shell and results-panel
    props.
13. Keyboard navigation no longer falls back to a legacy linear
    `suggestionCount + resultCount` selection model. Suggestions and results now
    navigate their own slices independently, and result `Enter` behavior clamps
    only within the visible result slice.
14. Autocomplete projection is now idempotent. Repeated identical
    `autocomplete-core` collections no longer trigger redundant suggestion-state
    writes, and the hotspot suite records a mocked `same projection is a no-op`
    trace so duplicate dropdown-state pushes cannot silently add render churn.
15. Autocomplete refresh is now keyed by semantic query/filter/catalog state.
    Rebuilt filter objects with the same effective values no longer trigger
    another `autocomplete.refresh()`, and the hotspot suite records this as a
    separate `semantic refresh key suppresses duplicate refresh` trace.
16. The typing path now has a combined input-plus-autocomplete contract. A real
    one-character input change must trigger exactly one semantic autocomplete
    refresh, and the hotspot suite records that joint `SearchInputHeader ->
autocomplete refresh` trace explicitly.
17. The end-to-end one-character refinement path is now locked as a SearchBar
    scenario. After one more typed character, autocomplete may refresh once,
    Flight search may issue the expected hybrid-plus-code pair, and the visible
    results must settle on the refined result set without old hits flashing back
    in.
18. Keyboard browsing inside the suggestion dropdown is now locked as its own
    SearchBar scenario. Moving from a typed query into a highlighted suggestion
    must update the query, keep stale result opens at zero, and settle the
    visible result set onto the selected suggestion target without flashing the
    old result back in. Accepting that highlighted suggestion now also closes
    the dropdown immediately, so the same scenario proves the autocomplete call
    budget stays at one refresh instead of keeping post-accept suggestion churn
    alive. The current hotspot artifact now contains `19` scenario records.
19. The repo-aware code lane is now partially Flight-first too. Repo-content
    search in `all` and `code` mode now goes through the same-origin Flight
    repo-search route, and that route no longer depends on one synthetic
    gateway-mounted repo id. This does not yet make the whole repo-facing UI
    Flight-only: repo-intelligence `doc` still rides its existing JSON
    endpoint.
20. The default repo-aware interface is now narrower and more Flight-first as
    well. When there is no explicit repo facet, the frontend no longer fans out
    to repo-intelligence `module`, `symbol`, or `example` JSON endpoints; the
    default repo-aware `all` / `code` path now stays on repo-content Flight plus
    Flight-backed references. Explicit `doc` still marks the remaining JSON
    retirement boundary.
21. The explicit `symbol` facet is now on that same Flight surface too.
    Parsed `kind:` filters are projected into repo-search `tagFilters`, so
    repo-aware symbol queries no longer depend on the repo-intelligence symbol
    endpoint.
22. The explicit `module` facet now also stays on repo-search Flight.
    Repo-aware module queries project `kind:module` into repo-search
    `tagFilters`, and the repo-overview display-name fallback now retries the
    same Flight route instead of calling `/api/repo/module-search`. The
    remaining repo-facing JSON retirement debt is now reduced to `doc`.
23. The explicit `example` facet now also stays on repo-search Flight.
    Repo-aware example queries project `kind:example` into repo-search
    `tagFilters`, and the repo-overview display-name fallback now retries the
    same Flight route instead of calling `/api/repo/example-search`.
24. The explicit `doc` facet is now Flight-backed too, but on its own
    repo-doc-coverage contract rather than repo-search hits. The frontend now
    calls `/analysis/repo-doc-coverage`, which returns coverage rows plus
    summary metadata and the optional `module` filter without falling back to
    `/api/repo/doc-coverage`.
25. Zen preview and file-open raw content now also consume same-origin Flight.
    The frontend `api.getVfsContent(...)` path now uses `/vfs/content`, the
    old `/api/vfs/cat` helper is retired from the active client runtime, and
    the shared workspace route snapshot now locks canonical `project/path`
    inputs for both `/vfs/resolve` and `/vfs/content`.
26. The refine-doc command surface now also consumes same-origin Flight.
    The frontend `api.refineEntityDoc(...)` path now uses `/analysis/refine-doc`
    with explicit repo/entity metadata plus Base64-encoded user hints, and the
    old `/api/repo/refine-entity-doc` helper is retired from the active client
    runtime. After this slice, the remaining `/api/` debt is primarily
    control-plane and non-hot-path utility surfaces rather than the active
    search/preview/refine lane.
27. The remaining non-Flight control-plane surface is now centralized in the
    API layer. `VfsSidebar` no longer bypasses the transport facade with a
    direct `fetch('/api/vfs/scan')`; it now consumes `api.scanVfs()`, so
    production components no longer own raw `/api/` calls on the active
    frontend surface.
28. Repo overview is now Flight-backed too. The frontend
    `api.getRepoOverview(...)` path now uses `/analysis/repo-overview` instead
    of `/api/repo/overview`, which removes the last active repo-aware JSON
    status/fallback seam from the SearchBar lane.
29. Repo index status is now Flight-backed too. The frontend
    `api.getRepoIndexStatus(...)` path now uses `/analysis/repo-index-status`
    instead of `/api/repo/index/status`, so the active repo-aware query/status
    lane no longer depends on the JSON repo-index status surface.
30. Repo sync is now Flight-backed too. The frontend `api.getRepoSync(...)`
    path now uses `/analysis/repo-sync` instead of `/api/repo/sync`, so the
    active repo-aware query/status lane no longer depends on the JSON sync
    surface either.
31. Workspace scan and topology are now Flight-backed too. The frontend
    `api.scanVfs()` path now uses `/vfs/scan`, `api.get3DTopology()` now uses
    `/topology/3d`, and the FileTree/VfsSidebar tests now pin repo-index status
    expectations against the decoded `api.getRepoIndexStatus()` contract rather
    than the retired `/api/repo/index/status` fetch assumption.
32. Repo index mutation is now Flight-backed too. The frontend
    `api.enqueueRepoIndex(...)` path now uses `/analysis/repo-index` instead of
    `POST /api/repo/index`, and the command contract now carries an explicit
    request id so repeated repo-index actions do not reuse cached route payloads.
33. After the repo-index cut, the remaining non-Flight `/api/` surface is
    intentionally limited to control-plane routes such as health, UI
    config/capabilities, and Julia deployment artifact inspection. Those routes
    are now grouped under `src/api/controlPlane/*` instead of being tracked as
    active Flight migration debt.
34. The new live ZenSearch harness shows that the visible info-panel path is no
    longer dominated by Flight search. In the current restarted-gateway sample,
    code search reaches base preview in `3.95ms` and AST settlement in
    `5.00ms`, while markdown now reaches visible base preview in `3.65ms`,
    graph summary in `4.23ms`, and markdown analysis settlement in `5.58ms`.
    The graph lane is no longer on the markdown critical path. The next
    optimization target is the content and analysis loading chain, not the
    search transport.
35. The frontend preview code now mirrors those measured lanes structurally.
    `zenSearchPreviewState.ts` owns preview-state shape plus load-need policy,
    `zenSearchPreviewPhases.ts` owns async lane helpers and snapshot building,
    and `useZenSearchPreview.ts` is reduced to orchestration. This makes future
    performance tracing simpler because the measured content/graph/analysis
    phases now map onto explicit frontend modules.
36. Selection activation now adopts in-flight prefetched preview lanes instead
    of discarding them and starting duplicate work. The focused regression test
    now proves that selecting a still-prefetching markdown result keeps
    secondary `VFS`, `graph`, and `markdown analysis` requests at one each
    while still allowing content to publish before the new graph lane settles.
37. New preview identities now clear stale `content`, `contentType`, and
    `graphNeighbors` immediately while their own lanes are pending. This avoids
    showing the previous result's graph summary or body content during a hot
    selection handoff, which makes the content-first contract visually honest.
38. The live ZenSearch harness now records a modular `analysisTransport`
    breakdown inside the existing analysis milestone. In the current restarted
    gateway sample, code AST analysis transport totals `2.53ms`, with
    `getFlightInfo=0.83ms`, `doGet=0.91ms`, and `retrievalDecode=0.71ms`;
    markdown analysis transport totals `2.45ms`, with
    `getFlightInfo=0.92ms`, `doGet=1.09ms`, and `retrievalDecode=0.33ms`.
    Arrow IPC reassembly is effectively negligible on both paths
    (`0.03ms` and `0.02ms` respectively). The remaining analysis work is
    therefore transport-bound at the Flight discovery/stream stages rather
    than blocked by frontend IPC stitching.
39. A runtime-side analysis `do_get` prewarm in `xiuxian-wendao-runtime`
    produced a measurable live improvement on the same code-search target.
    Re-running the harness against the default `9517` gateway and a patched
    `9527` gateway on `diffeq -> mcl/Modelica/Blocks/package.mo` reduced the
    code-AST analysis transport total from `4.76ms` to `3.69ms`, with
    `doGet` falling from `1.96ms` to `1.22ms` and end-to-end
    `search -> analysis settled` dropping from `7.54ms` to `6.97ms`.
    The fresh patched gateway still exposed `knowledge_section.rowCount=0`, so
    markdown search discovery was unavailable there; the live harness now
    records that corpus-availability state explicitly instead of aborting the
    entire performance proof.

## Post-Restart Production-Line Proof

After the repo-runtime read-recovery fix and producer-side generation fence,
the local operator restarted the default `9517` gateway and reran the live
perf harness successfully against the freshly restarted binary.

### Post-Restart End-to-End Summary

- Overall average: `2.93ms`
- P50: `2.70ms`
- P95: `4.52ms`
- Max: `4.52ms`

### Post-Restart Phase Breakdown

- `GetFlightInfo`: average `1.24ms`, P95 `1.83ms`
- `DoGet`: average `0.98ms`, P95 `1.43ms`
- Hit decoding: average `0.57ms`, P95 `0.94ms`
- Arrow IPC reassembly: average `0.02ms`, P95 `0.04ms`
- Metadata decoding: average `0.02ms`, P95 `0.04ms`
- Ticket read: average `0.01ms`, P95 `0.03ms`

### Restart Outcome

- `published_manifest_missing` no longer surfaced on `repo_entity` or
  `repo_content_chunk`
- the harness passed while the gateway was in readable post-restart recovery,
  which is the production-line behavior we actually need to prove
- the same gateway later converged to `ready=152`, `failed=9`,
  `unsupported=16`, `queued=0`, `active=0`

## 2026-04-05 Restarted Gateway Contract Rerun

After a later local restart of the default `127.0.0.1:9517` gateway, the
frontend live contract initially exposed two bounded regressions:

1. projected page-index tree decoding failed with
   `Arrow document payload is missing required numeric field "rootCount"`
2. refine-doc timed out while trying to discover a suitable live symbol id

The first issue was not a missing route field on the gateway. The live Flight
payload still carried `rootCount`, but the frontend document IPC decoder only
accepted JavaScript `number` values. On the live path, Arrow materialized the
`UInt64` column as a safe `bigint`, so the frontend rejected a valid payload.

The second issue was contract noise in the live test itself. The route under
test is `/analysis/refine-doc`, but the proof first spent its time budget on a
heavier repo-search plus knowledge-search chain to find one symbol id. The
contract is more precise and more stable when it resolves `symbol_id` through
`/api/repo/symbol-search` first, then sends that id to the refine-doc Flight
route.

With those two bounded fixes in place, the restarted default gateway now
passes the full live contract again:

```bash
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-gateway'
```

Result:

- `11/11` tests passed
- projected page-index tree same-origin Flight proof passed in `627ms`
- refine-doc same-origin Flight proof passed in `609ms`

## 2026-04-05 Restarted Gateway Perf and Hotspot Rerun

After the same local `127.0.0.1:9517` gateway restart, the frontend reran the
hotspot artifact, the live gateway contract, the live repo/code gateway
contracts, and the live Flight perf harness without any new code changes.

### Validation Commands

```bash
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run test:hotspot-perf'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-gateway'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 ./node_modules/.bin/vitest run src/api/liveRepoSearchGateway.test.ts src/api/liveCodeSearchGateway.test.ts'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-flight-perf'
```

### Contract Outcome

- hotspot suite: `10/10` files and `65/65` tests passed
- studio live gateway suite: `11/11` tests passed
- live repo/code gateway suites: `4/4` tests passed
- live Flight perf suite: `3/3` tests passed

### Latest Warm-Steady Perf Summary

- Overall average: `1.95ms`
- P50: `1.87ms`
- P95: `2.39ms`
- Max: `2.39ms`

### Latest Warm-Steady Phase Breakdown

- `GetFlightInfo`: average `0.72ms`, P95 `1.03ms`
- `DoGet`: average `0.65ms`, P95 `0.82ms`
- Hit decoding: average `0.50ms`, P95 `0.67ms`
- Arrow IPC reassembly: average `0.01ms`, P95 `0.02ms`
- Metadata decoding: average `0.01ms`, P95 `0.03ms`
- Ticket read: average `0.01ms`, P95 `0.01ms`

### Latest Per-Query Summary

| Query          |      Avg |      P95 | Avg Hits | GetFlightInfo Avg | DoGet Avg |
| -------------- | -------: | -------: | -------: | ----------------: | --------: |
| `diffeq`       | `2.19ms` | `2.39ms` |      `4` |          `0.90ms` |  `0.74ms` |
| `solver`       | `2.00ms` | `2.19ms` |     `20` |          `0.66ms` |  `0.67ms` |
| `optimization` | `1.67ms` | `1.87ms` |     `19` |          `0.61ms` |  `0.55ms` |

### Latest Hotspot Artifact

- generated at: `2026-04-05T20:13:45.938Z`
- scenario records: `19`
- `SearchBarHotspotPerf.sec-lang-julia`: `227.10ms`
- `SearchBarHotspotPerf.repo-backed-open`: `674.11ms`
- `SearchBarHotspotPerf.one-char-refinement`: `219.38ms`
- `SearchBarHotspotPerf.suggestion-keyboard-browse`: `434.48ms`
- `AppHotspotPerf.repo-backed-code-selection`: `1.63ms`

This rerun matters because it shows the local gateway stays healthy after a
manual restart across both request-path validation and frontend hotspot
instrumentation. The current bottleneck is still not the same-origin Flight
search path; the slight rise from the earlier `1.67ms` warm checkpoint is
still comfortably inside low single-digit latency.

## Panel Render Boundary Update

The next meaningful frontend cost after transport is inside the structured
preview panel rather than the search request path. The `III. Multi-slot
Fragments` stage is now isolated behind
`src/components/ZenSearch/StructuredDashboard/StructuredFragmentsPanel.tsx`,
and `CodeSyntaxHighlighter` is memoized at the leaf boundary.

Focused topology interactions no longer rerender the heavy fragment detail
subtree when its inputs are unchanged. The regression proof in
`src/components/ZenSearch/StructuredDashboard/__tests__/StructuredIntelligenceDashboard.test.tsx`
uses a render trace around the preview-content stage and holds that trace at
`renderCount = 1` across initial render, topology focus, neighbor focus, and
focus clear. This does not change search latency, but it removes avoidable
panel-side work while the user browses anchors inside the dashboard.

## Code AST Detail Boundary Update

The next heavy panel stage was the code-AST data panel. `CodeAstAnatomyView`
used to keep the `blocks + symbols` subtree inline and tied its derived model
to the full `selectedResult` object identity. That meant metadata-only result
updates could still invalidate the heavy detail stage even when the actual
source identity and AST payload were unchanged.

That path is now split through
`src/components/ZenSearch/CodeAstDetailStages.tsx`, a memoized boundary for
the `CodeAstBlocksStage` and `CodeAstSymbolsStage` subtree. The anatomy derive
path also now depends on a narrower selection input (`path + codeLanguage`)
instead of the whole search result object. The focused regression in
`src/components/ZenSearch/__tests__/CodeAstAnatomyView.renderBoundary.test.tsx`
rerenders the panel with updated result metadata but the same source identity,
and the detail-stage render trace stays at `renderCount = 1`.

This keeps the AST data panel aligned with the earlier fragment-panel work:
transport remains unchanged, while heavy render work is isolated behind a
named module boundary that can be measured independently.

## DirectReader Rich-View Boundary Update

The next markdown-side panel issue was inside `DirectReader`. Line and column
metadata changes could rerender the rich markdown subtree even when the user
stayed in rich mode and the actual document content did not change. That meant
navigation metadata churn could still rebuild `DirectReaderRichContent` and its
downstream markdown rendering path unnecessarily.

`src/components/panels/DirectReader/DirectReaderRichContent.tsx` is now an
explicit memoized boundary. The focused regression in
`src/components/panels/DirectReader/DirectReader.renderBoundary.test.tsx`
rerenders `DirectReader` with the same markdown document but different
`line/lineEnd` metadata, and the rich-content render trace stays at
`renderCount = 1`.

This keeps the markdown data panel aligned with the same modular performance
strategy as the fragment and code-AST slices: line-focus metadata can change
without forcing the heavy rich-content subtree to rebuild when the visible rich
document payload is unchanged.

## Markdown Section-Body Boundary Update

The next markdown-side cost sat one level deeper inside `MarkdownWaterfall`.
The waterfall model depended on the whole `analysis` object even though the
rendered section cards only consume `retrievalAtoms`, and section bodies were
not isolated behind their own memoized boundary. That allowed unrelated
analysis-metadata churn to rebuild section-level rich markdown rendering.

This path is now tightened in two places. `buildMarkdownWaterfallModel()` takes
the retrieval-atom slice directly, and `MarkdownWaterfall` memoizes its model
on `content + path + retrievalAtoms` instead of the full analysis object.
`MarkdownWaterfallSectionBody.tsx` is also now a memoized leaf with its
markdown component map built once per stable section payload.

The focused regression in
`src/components/panels/DirectReader/MarkdownWaterfall.renderBoundary.test.tsx`
rerenders the waterfall with changed analysis metadata but the same
`retrievalAtoms` array, and the section-body trace stays at `renderCount = 1`.
That removes another avoidable rebuild from the markdown data panel without
changing search or analysis transport behavior.

## Markdown Rich-Slot Callback Boundary Update

The next residual panel-side cost sat inside the markdown rich-slot path.
`MarkdownWaterfallSectionBody` rebuilt its markdown component map whenever the
bi-link callback identity changed, which let callback-only churn re-enter the
code and mermaid rich slots even when the visible section payload was
unchanged. A first naive stabilization pass added extra hooks directly inside
the mounted section-body component and exposed a live Fast Refresh hook-order
mismatch during local development.

The final shape keeps `MarkdownWaterfallSectionBody` on a single-hook
controller cache. That controller stores the latest bi-link callback, reuses
the existing markdown component map while the section payload stays stable, and
only rebuilds when the actual content inputs change or bi-link support toggles
on/off. `MarkdownWaterfallCodeSlot.tsx` and
`MarkdownWaterfallMermaidSlot.tsx` are also value-memoized leaves, so stable
slot payloads do not rerender just because wrapper callback identity churned.

The focused regression in
`src/components/panels/DirectReader/MarkdownWaterfallSectionBody.renderBoundary.test.tsx`
rerenders the same section body with only a new bi-link callback identity and
proves both the code-slot and mermaid-slot traces stay at `renderCount = 1`.
This keeps the markdown data panel modular in the same way as the earlier
fragment, code-AST, and section-body boundaries while avoiding the live
hook-order drift seen in the intermediate implementation.

## ZenSearch Selection-Close Stability Update

One remaining user-facing instability was not a transport problem at all. The
ZenSearch selection surfaces closed the dialog as soon as their
`onResultSelect()` Promise resolved, but the App hydration handlers returned a
resolved Promise even when the file hydrate failed. That meant keyboard Enter,
row open, references open, or definition open could still drop the user back
to the normal workspace after a failed hydrate, which looked like a random
jump back to the home view.

The selection contract is now explicit: search selection actions may return
`false` to veto dialog close. `App.tsx` returns `false` when a result hydrate
fails, and both keyboard and click-driven selection helpers now keep ZenSearch
open unless the action resolves to success. This keeps failed path resolution
or VFS hydrate misses inside the search workflow instead of ejecting the user
out of context.

Focused regressions now cover both paths:

- `src/components/SearchBar/__tests__/useSearchKeyboardNavigation.test.tsx`
  proves Enter-key result selection does not close search when the action
  resolves `false`.
- `src/components/SearchBar/__tests__/useSearchResultActions.test.tsx`
  proves result-open and definition-open actions also keep search open when
  the selection contract vetoes close.

## Code AST Hook-Order Stability Update

Another live instability surfaced in `CodeAstAnatomyView`: the view returned
early for `loading`, `error`, and empty-analysis states, but two additional
`useMemo()` calls sat below those early returns. When a preview transitioned
from loading into a hydrated AST panel, React saw more hooks than during the
previous render and threw the runtime hook-order error instead of stabilizing
the panel.

`src/components/ZenSearch/CodeAstAnatomyView.tsx` now computes all derived AST
memo state unconditionally before any early return. The loading, error, and
empty branches remain the same user-facing states, but the component now keeps
one stable hook layout across every render phase.

The focused regression in
`src/components/ZenSearch/__tests__/CodeAstAnatomyView.test.tsx` now rerenders
the same component from `loading=true` into a fully hydrated AST anatomy view
and proves the waterfall renders successfully without tripping hook-order
drift.

## Optimization Candidates

- `GetFlightInfo`: average `0.72ms`, P95 `1.03ms`
- `DoGet`: average `0.65ms`, P95 `0.82ms`

## No-Major-Issue Assessment

No major frontend search performance issue is visible in this profile. The
live same-origin Arrow Flight stack is fast enough for the sampled
179-repository local configuration; the next work belongs to local operator
restart proof and corpus/bootstrap recovery, not another frontend transport
rewrite.

## Remaining Risks

- This report samples three queries only; it is not a high-cardinality or
  concurrency stress profile.
- The current numbers are from a ready live gateway. A fully cold process boot
  will still show higher first-hit latencies.
- The remaining optimization headroom is now shared between backend
  `GetFlightInfo` materialization and `DoGet` transport/read work, not frontend
  JavaScript work.

## Artifacts

- JSON: `$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_live_flight_search_perf.json`
- CSV: `$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_live_flight_search_perf.csv`
- Hotspot unit traces:
  `$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_hotspot_perf_traces.json`

:RELATIONS:
:LINKS: [[docs/README]], [[05_research/304_runtime_troubleshooting]], [[05_research/306_alignment_milestone_log]], [[05_research/307_contract_changelog]]
:END:
