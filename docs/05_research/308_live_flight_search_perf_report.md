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
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-gateway'
direnv exec . bash -lc 'cd .data/wendao-frontend && RUN_LIVE_GATEWAY_TEST=1 npm run test:live-flight-perf'
```

## Current Default-Gateway Results

### End-to-End Summary

- Overall average: `5.11ms`
- P50: `5.01ms`
- P95: `6.10ms`
- Max: `6.10ms`

### Phase Breakdown

- `GetFlightInfo`: average `3.63ms`, P95 `4.04ms`
- `DoGet`: average `1.00ms`, P95 `1.57ms`
- Hit decoding: average `0.40ms`, P95 `0.55ms`
- Arrow IPC reassembly: average `0.02ms`, P95 `0.06ms`
- Metadata decoding: average `0.01ms`, P95 `0.02ms`
- Ticket read: average `0.01ms`, P95 `0.02ms`

### Per-Query Summary

| Query | Avg | P95 | Avg Hits | GetFlightInfo Avg | DoGet Avg |
| --- | ---: | ---: | ---: | ---: | ---: |
| `diffeq` | `5.44ms` | `6.10ms` | `4` | `3.83ms` | `1.17ms` |
| `solver` | `4.86ms` | `5.03ms` | `19` | `3.50ms` | `0.89ms` |
| `optimization` | `5.05ms` | `5.15ms` | `18` | `3.56ms` | `0.94ms` |

## Comparison to Earlier Same-Port Checkpoints

- Fresh `9519` gateway after the runtime payload-cache slice:
  - `GetFlightInfo`: `117.58-126.14ms`
  - `DoGet`: `1.96-2.12ms`
- Fresh `9519` gateway after the Studio aggregate-provider response-reuse slice:
  - `GetFlightInfo`: `41.03-46.15ms`
  - `DoGet`: `0.75-1.10ms`
- Current default `9517` gateway after restart:
  - `GetFlightInfo`: average `3.63ms`
  - `DoGet`: average `1.00ms`

The important trend is stable: the frontend is not the bottleneck, and the
dominant remaining server-side cost lives in `GetFlightInfo`. The default
gateway profile is now in low single-digit milliseconds for the sampled search
queries.

## Findings

1. The current pure Flight frontend path is healthy. Build, live gateway tests,
   and live Flight perf all pass on the default `9517` gateway.
2. Browser-side work is cheap. Hit decoding, metadata decoding, and Arrow IPC
   reassembly remain below `1ms` combined.
3. The control-path leader is still `GetFlightInfo`, but it is no longer a
   material user-facing latency problem for the sampled queries.
4. `DoGet` is now a small transport/read cost instead of a duplicate
   search-materialization cost.

## Optimization Candidates

- `GetFlightInfo`: average `3.63ms`, P95 `4.04ms`
- `DoGet`: average `1.00ms`, P95 `1.57ms`

## No-Major-Issue Assessment

No major frontend search performance issue is currently visible in this profile.
The live same-origin Arrow Flight stack is fast enough for the sampled
179-repository local configuration.

## Remaining Risks

- This report samples three queries only; it is not a high-cardinality or
  concurrency stress profile.
- The current numbers are from a ready live gateway. A fully cold process boot
  will still show higher first-hit latencies.
- The remaining optimization headroom is mostly backend route-materialization
  work around `GetFlightInfo`, not frontend JavaScript work.

## Artifacts

- JSON: `$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_live_flight_search_perf.json`
- CSV: `$PRJ_CACHE_HOME/agent/tmp/wendao_frontend_live_flight_search_perf.csv`

:RELATIONS:
:LINKS: [[docs/README]], [[05_research/304_runtime_troubleshooting]], [[05_research/306_alignment_milestone_log]], [[05_research/307_contract_changelog]]
:END:
