# Qianji Studio

Frontend cockpit for the Wendao Studio gateway.

Qianji Studio hydrates indexed roots, VFS content, topology, graph navigation,
and semantic search from the live Wendao runtime. This repository contains the
standalone frontend application plus its repo-local GitHub Actions CI.

## Quick Start

Run from this repository root:

```bash
npm install
npm run dev
./node_modules/.bin/tsc --noEmit --pretty false
npm run test
npm run build
npm run harness
```

`npm run build` includes the post-build size gate. The default GitHub Actions
workflow runs the same typecheck, test, and build surface after `npm ci`.
`npm run harness` runs the TypeScript project harness over the frontend source.
`npm run build:runtime` emits the git-installable runtime package under
`dist/runtime`.

## Runtime Package

This repository also exposes a runtime subpath for downstream frontends that
need the Wendao Flight contract without embedding Qianji Studio UI code.

Downstream package example:

```json
{
  "dependencies": {
    "qianji-studio": "git+https://github.com/tao3k/wendao-frontend.git"
  }
}
```

Runtime usage:

```ts
import { createWendaoRuntime } from "qianji-studio/runtime";

const wendao = createWendaoRuntime({
  baseUrl: "http://127.0.0.1:9517",
});

const results = await wendao.searchKnowledge("solver", {
  intent: "code_search",
  limit: 20,
});
```

The runtime package exposes typed Wendao Flight search helpers for knowledge,
repo content, attachments, AST definitions, references, and symbols. It is a
protocol package boundary, not a shared React component surface.

Git installs run the package `prepare` script, which emits the built ESM and
declaration files consumed by the `qianji-studio/runtime` export.

## Documentation

- [docs/README.md](./docs/README.md) - Curated entry point for the docs set.
- [docs/index.md](./docs/index.md) - Graph-structured docs kernel.
- [docs/01_core/102_developer_onboarding.md](./docs/01_core/102_developer_onboarding.md) - Environment, startup flow, build tooling, and local verification.
- [docs/03_features/204_gateway_api_contracts.md](./docs/03_features/204_gateway_api_contracts.md) - HTTP and Flight contracts exposed to the frontend.
- [docs/03_features/205_panel_runtime_map.md](./docs/03_features/205_panel_runtime_map.md) - Current runtime responsibilities across panels and shared selection flow.
- [docs/03_features/206_testing_and_validation.md](./docs/03_features/206_testing_and_validation.md) - Local validation commands, CI gate, and current coverage.
- [docs/05_research/304_runtime_troubleshooting.md](./docs/05_research/304_runtime_troubleshooting.md) - Recovery paths for common frontend and gateway failures.
- [docs/05_research/306_alignment_milestone_log.md](./docs/05_research/306_alignment_milestone_log.md) - Operational milestone log for the active alignment lane.
- [docs/05_research/308_live_flight_search_perf_report.md](./docs/05_research/308_live_flight_search_perf_report.md) - Same-port Flight performance evidence and profiling notes.
