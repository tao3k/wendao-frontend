# Live Flight Search Performance Report

:PROPERTIES:
:ID: qianji-studio-live-flight-search-performance-report
:PARENT: [[index]]
:TAGS: research, performance, flight, search
:STATUS: ACTIVE
:END:

## Scope

This report captures the current same-origin Arrow Flight search profile for the
Qianji Studio frontend against the live Wendao gateway.

## Test Surface

- Frontend client: `src/api/flightSearchTransport.ts`
- Live perf harness: `src/api/liveFlightSearchPerf.test.ts`
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

## Validation Commands

```bash
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run build'
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run test:hotspot-perf'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-gateway'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-flight-perf'
```

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
6. Hotspot unit traces are now part of the same performance workflow.
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
7. The `all`-scope code-filter contract is now verified at three layers.
   Search execution strips code filters down to the base query before hitting
   the gateway, pure filter-only queries stay local and only expose filter
   suggestions, and the visible-result layer now distinguishes between
   `matching code hits exist` and `no code hit matches so fall back to non-code
results`.
8. The left result pane now has an explicit virtualization budget. The static
   list threshold, initial virtual window, and overscan are locked in
   `VirtualizedSearchResultsList`, and the hotspot trace suite now includes a
   large code-result typing scenario so render-pressure drift shows up as JSON
   artifact changes instead of subjective typing lag.
9. The suggestion dropdown now follows the same budgeted-contract pattern. The
   visible suggestion slice is capped at `12` items inside the autocomplete
   state source, and the hotspot trace suite now records dropdown
   selection-shift paint drift so keyboard browsing regressions are visible in
   the shared JSON artifact.
10. Suggestion hover now has its own controller-level stability contract. The
    SearchBar controller keeps suggestion highlight separate from result
    selection, reuses a stable toggle callback, and the hotspot suite records a
    trace proving suggestion-hover rerenders reuse both shell and results-panel
    props.
11. Keyboard navigation no longer falls back to a legacy linear
    `suggestionCount + resultCount` selection model. Suggestions and results now
    navigate their own slices independently, and result `Enter` behavior clamps
    only within the visible result slice.
12. Autocomplete projection is now idempotent. Repeated identical
    `autocomplete-core` collections no longer trigger redundant suggestion-state
    writes, and the hotspot suite records a mocked `same projection is a no-op`
    trace so duplicate dropdown-state pushes cannot silently add render churn.
13. Autocomplete refresh is now keyed by semantic query/filter/catalog state.
    Rebuilt filter objects with the same effective values no longer trigger
    another `autocomplete.refresh()`, and the hotspot suite records this as a
    separate `semantic refresh key suppresses duplicate refresh` trace.
14. The typing path now has a combined input-plus-autocomplete contract. A real
    one-character input change must trigger exactly one semantic autocomplete
    refresh, and the hotspot suite records that joint `SearchInputHeader ->
autocomplete refresh` trace explicitly.
15. The end-to-end one-character refinement path is now locked as a SearchBar
    scenario. After one more typed character, autocomplete may refresh once,
    Flight search may issue the expected hybrid-plus-code pair, and the visible
    results must settle on the refined result set without old hits flashing back
    in.
16. Keyboard browsing inside the suggestion dropdown is now locked as its own
    SearchBar scenario. Moving from a typed query into a highlighted suggestion
    must update the query, keep stale result opens at zero, and settle the
    visible result set onto the selected suggestion target without flashing the
    old result back in. Accepting that highlighted suggestion now also closes
    the dropdown immediately, so the same scenario proves the autocomplete call
    budget stays at one refresh instead of keeping post-accept suggestion churn
    alive. The current hotspot artifact now contains `19` scenario records.
17. The repo-aware code lane is now partially Flight-first too. Repo-content
    search in `all` and `code` mode now goes through the same-origin Flight
    repo-search route, and that route no longer depends on one synthetic
    gateway-mounted repo id. This does not yet make the whole repo-facing UI
    Flight-only: repo-intelligence `doc` still rides its existing JSON
    endpoint.
18. The default repo-aware interface is now narrower and more Flight-first as
    well. When there is no explicit repo facet, the frontend no longer fans out
    to repo-intelligence `module`, `symbol`, or `example` JSON endpoints; the
    default repo-aware `all` / `code` path now stays on repo-content Flight plus
    Flight-backed references. Explicit `doc` still marks the remaining JSON
    retirement boundary.
19. The explicit `symbol` facet is now on that same Flight surface too.
    Parsed `kind:` filters are projected into repo-search `tagFilters`, so
    repo-aware symbol queries no longer depend on the repo-intelligence symbol
    endpoint.
20. The explicit `module` facet now also stays on repo-search Flight.
    Repo-aware module queries project `kind:module` into repo-search
    `tagFilters`, and the repo-overview display-name fallback now retries the
    same Flight route instead of calling `/api/repo/module-search`. The
    remaining repo-facing JSON retirement debt is now reduced to `doc`.
21. The explicit `example` facet now also stays on repo-search Flight.
    Repo-aware example queries project `kind:example` into repo-search
    `tagFilters`, and the repo-overview display-name fallback now retries the
    same Flight route instead of calling `/api/repo/example-search`.
22. The explicit `doc` facet is now Flight-backed too, but on its own
    repo-doc-coverage contract rather than repo-search hits. The frontend now
    calls `/analysis/repo-doc-coverage`, which returns coverage rows plus
    summary metadata and the optional `module` filter without falling back to
    `/api/repo/doc-coverage`.
23. Zen preview and file-open raw content now also consume same-origin Flight.
    The frontend `api.getVfsContent(...)` path now uses `/vfs/content`, the
    old `/api/vfs/cat` helper is retired from the active client runtime, and
    the shared workspace route snapshot now locks canonical `project/path`
    inputs for both `/vfs/resolve` and `/vfs/content`.
24. The refine-doc command surface now also consumes same-origin Flight.
    The frontend `api.refineEntityDoc(...)` path now uses `/analysis/refine-doc`
    with explicit repo/entity metadata plus Base64-encoded user hints, and the
    old `/api/repo/refine-entity-doc` helper is retired from the active client
    runtime. After this slice, the remaining `/api/` debt is primarily
    control-plane and non-hot-path utility surfaces rather than the active
    search/preview/refine lane.
25. The remaining non-Flight control-plane surface is now centralized in the
    API layer. `VfsSidebar` no longer bypasses the transport facade with a
    direct `fetch('/api/vfs/scan')`; it now consumes `api.scanVfs()`, so
    production components no longer own raw `/api/` calls on the active
    frontend surface.
26. Repo overview is now Flight-backed too. The frontend
    `api.getRepoOverview(...)` path now uses `/analysis/repo-overview` instead
    of `/api/repo/overview`, which removes the last active repo-aware JSON
    status/fallback seam from the SearchBar lane.
27. Repo index status is now Flight-backed too. The frontend
    `api.getRepoIndexStatus(...)` path now uses `/analysis/repo-index-status`
    instead of `/api/repo/index/status`, so the active repo-aware query/status
    lane no longer depends on the JSON repo-index status surface.
28. Repo sync is now Flight-backed too. The frontend `api.getRepoSync(...)`
    path now uses `/analysis/repo-sync` instead of `/api/repo/sync`, so the
    active repo-aware query/status lane no longer depends on the JSON sync
    surface either.
29. Workspace scan and topology are now Flight-backed too. The frontend
    `api.scanVfs()` path now uses `/vfs/scan`, `api.get3DTopology()` now uses
    `/topology/3d`, and the FileTree/VfsSidebar tests now pin repo-index status
    expectations against the decoded `api.getRepoIndexStatus()` contract rather
    than the retired `/api/repo/index/status` fetch assumption.
30. Repo index mutation is now Flight-backed too. The frontend
    `api.enqueueRepoIndex(...)` path now uses `/analysis/repo-index` instead of
    `POST /api/repo/index`, and the command contract now carries an explicit
    request id so repeated repo-index actions do not reuse cached route payloads.
31. After the repo-index cut, the remaining non-Flight `/api/` surface is
    intentionally limited to control-plane routes such as health, UI
    config/capabilities, and Julia deployment artifact inspection. Those routes
    are now grouped under `src/api/controlPlane/*` instead of being tracked as
    active Flight migration debt.

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

## Optimization Candidates

- `GetFlightInfo`: average `0.86ms`, P95 `1.42ms`
- `DoGet`: average `0.79ms`, P95 `1.20ms`

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
