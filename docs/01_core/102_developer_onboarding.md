# Developer Onboarding

:PROPERTIES:
:ID: qianji-studio-developer-onboarding
:PARENT: [[index]]
:TAGS: core, onboarding, environment, local-dev
:STATUS: ACTIVE
:END:

## Overview

This page is the shortest path to a usable local Wendao Frontend setup. It records the current frontend commands, the repo-local build/tooling gates, the dev-proxy target contract, and the most useful verification entry points.

## Working Directory

Run Wendao Frontend commands from the repository root:

```bash
.
```

## Environment

When this repo is checked out inside `xiuxian-artisan-workshop`, prefer the
project environment rather than ad-hoc shell state:

```bash
direnv exec . <command>
```

## Frontend Commands

The current frontend scripts are:

```bash
npm run dev
npm run build
npm test
```

For strict TypeScript verification, prefer the direct project-local compiler
binary:

```bash
./node_modules/.bin/tsc --noEmit --pretty false
```

## Build And Tooling Notes

- `npm run build` runs `rspack build` and then `scripts/check-build-size.mjs`.
- The post-build gate fails if a single emitted JS/CSS asset exceeds
  `2_400_000` bytes or if the initial entry asset set referenced by
  `dist/index.html` exceeds `3_800_000` bytes.
- The build-tooling policy surface lives under `scripts/build/*` and
  `scripts/rspack/*`; `rspack.config.ts` is the assembly surface, not the
  policy monolith.
- `.oxlintrc.json` remains the fixed acceptance gate for the lint-closure lane;
  runtime and component fixes should reduce the warning count instead of
  relaxing lint rules.

## Dev Proxy Target

- The Rspack dev server reads `WENDAO_GATEWAY_TARGET` from the environment.
- If the variable is unset, the default target is `http://127.0.0.1:9517`.
- `/api/*` and same-origin Flight requests are proxied to the same gateway
  target.
- The dev proxy uses an explicit keep-alive `node:http.Agent`; this avoids the
  `connection: close` churn that previously showed up as intermittent browser
  network errors during local development.

## Dev Proxy Behavior

- `rspack.config.ts` proxies `/api/*` to the configured gateway target.
- `rspack.config.ts` also proxies `/arrow.flight.protocol.FlightService/*` to
  the same target.
- The practical local goal is to keep the dev proxy aligned to the one active
  gateway rather than letting the browser talk to a stale origin.

## Common Local Flow

1. Start the Wendao gateway on the target you want the frontend to use.
2. Start the frontend dev server with `npm run dev`.
3. Open the app and confirm the explorer is using live indexed roots rather than fallback data.
4. Flight business requests should go through the same origin as the gateway.

Current bounded local commands from the repo root:

```bash
npm run dev
./node_modules/.bin/tsc --noEmit --pretty false
npm run build
```

Integrated-workspace equivalents:

```bash
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run dev'
direnv exec . bash -lc 'cd .data/wendao-frontend && ./node_modules/.bin/tsc --noEmit --pretty false'
direnv exec . bash -lc 'cd .data/wendao-frontend && npm run build'
```

## Strict TypeScript Frontier

As of `2026-04-15`, the build-tooling declaration seam plus the bounded
`App`, `DiagramWindow`, `DirectReader`, `FileTree`, `GraphView`, `MainView`,
`PropertyEditor`, `VfsSidebar`, and repo-diagnostics slices are off the strict
TypeScript frontier. The remaining frontier is centered on `SearchBar`,
ZenSearch, controller wiring, and the remaining shared surfaces.

## Targeted Verification

The most useful focused frontend test command today is:

```bash
npm test -- src/App.test.tsx src/components/ZenSearch/__tests__/ZenSearchWindow.test.tsx src/components/ZenSearch/__tests__/ZenSearchLayout.test.tsx src/components/ZenSearch/__tests__/ZenSearchWorkspace.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewPane.test.tsx src/components/panels/MainView/MainView.test.tsx src/components/panels/GraphView/__tests__/GraphView.test.tsx src/components/SearchBar/__tests__/SearchBar.test.tsx src/components/panels/DirectReader/DirectReader.test.tsx
```

Zen Search is the primary surface in that suite; `SearchBar` remains a compatibility coverage target only.

The current pure Flight live proof is:

```bash
RUN_LIVE_GATEWAY_TEST=1 npm test -- src/api/liveGateway.test.ts
```

That command validates:

1. local config push into the live gateway
2. live graph resolution from the gateway
3. pure Arrow Flight knowledge search against `/search/knowledge`

:RELATIONS:
:LINKS: [[README]], [[01_core/101_studio_surface_protocol]], [[01_core/103_release_checklist]], [[01_core/105_docs_conventions]], [[01_core/106_docs_maintenance_playbook]], [[03_features/204_gateway_api_contracts]], [[03_features/206_testing_and_validation]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]], [[05_research/306_alignment_milestone_log]], [[05_research/308_live_flight_search_perf_report]]
:END:

---

:FOOTER:
:AUDITOR: studio_onboarding_guard
:END:
