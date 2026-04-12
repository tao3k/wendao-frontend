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
- Search: `2.48ms`
- Resolve preview plan: `0.08ms`
- Base preview settled: `1.97ms`
- AST analysis settled: `3.61ms`
- Search to base preview settled: `4.45ms`
- Search to AST analysis settled: `6.10ms`
- Content bytes: `152147`
- AST node count: `39`
- Retrieval atom count: `78`

### Markdown Sample

- Query: `topology`
- Intent: `knowledge`
- Result path: `docs/00_vision/TRINITY_MANIFESTO.md`
- Content path: `frontend/docs/00_vision/TRINITY_MANIFESTO.md`
- Search: `2.02ms`
- Resolve preview plan: `0.03ms`
- Base preview settled: `3.70ms`
- Graph summary settled: `4.92ms`
- Markdown analysis settled: `3.36ms`
- Search to base preview settled: `5.72ms`
- Search to graph summary settled: `6.94ms`
- Search to markdown analysis settled: `5.38ms`
- Content bytes: `12026`
- Markdown analysis node count: `34`
- Retrieval atom count: `34`

This sample matters because it separates transport latency from the first
visible ZenSearch panel states. On the current restarted gateway, markdown
preview content now becomes visible before graph summary completion, so the
graph lane no longer blocks the info-panel shell. The remaining visible-path
cost is the content fetch itself, not graph-neighbor decoration.

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
    code search reaches base preview in `4.45ms` and AST settlement in
    `6.10ms`, while markdown now reaches visible base preview in `5.72ms`,
    markdown analysis settlement in `5.38ms`, and graph summary later in
    `6.94ms`. The graph lane is no longer on the markdown critical path. The
    next optimization target is the content and analysis loading chain, not the
    search transport.

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
