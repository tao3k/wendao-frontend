# Developer Onboarding

:PROPERTIES:
:ID: qianji-studio-developer-onboarding
:PARENT: [[index]]
:TAGS: core, onboarding, environment, local-dev
:STATUS: ACTIVE
:END:

## Overview

This page is the shortest path to a usable local Qianji Studio setup. It records the current frontend commands, the gateway bind source, and the most useful verification entry points.

## Working Directory

Run Qianji Studio commands from:

```bash
.data/qianji-studio
```

## Environment

Use the project environment rather than ad-hoc shell state:

```bash
direnv exec . <command>
```

## Frontend Commands

The current frontend scripts are:

```bash
direnv exec . npm run dev
direnv exec . npm run build
direnv exec . npm test
```

## Gateway Bind Source

The frontend reads its default gateway bind from:

```text
.data/qianji-studio/wendao.toml
```

Current bind:

```toml
[gateway]
bind = "127.0.0.1:9517"
```

## Dev Proxy Behavior

- `rspack.config.ts` reads `wendao.toml` and turns `gateway.bind` into the dev proxy target.
- If `wendao.toml` cannot be read, the current fallback target is `http://localhost:8001`.
- The practical local goal is to keep the dev proxy aligned to the `9517` gateway rather than falling back.

## Common Local Flow

1. Start the Wendao gateway on the bind declared by `wendao.toml`.
2. Start the frontend dev server with `direnv exec . npm run dev`.
3. Open the app and confirm the explorer is using live indexed roots rather than fallback data.

## Targeted Verification

The most useful focused frontend test command today is:

```bash
direnv exec . npm test -- src/App.test.tsx src/components/ZenSearch/__tests__/ZenSearchWindow.test.tsx src/components/ZenSearch/__tests__/ZenSearchLayout.test.tsx src/components/ZenSearch/__tests__/ZenSearchWorkspace.test.tsx src/components/ZenSearch/__tests__/ZenSearchPreviewPane.test.tsx src/components/panels/MainView/MainView.test.tsx src/components/panels/GraphView/__tests__/GraphView.test.tsx src/components/SearchBar/__tests__/SearchBar.test.tsx src/components/panels/DirectReader/DirectReader.test.tsx
```

Zen Search is the primary surface in that suite; `SearchBar` remains a compatibility coverage target only.

:RELATIONS:
:LINKS: [[README]], [[01_core/101_studio_surface_protocol]], [[01_core/103_release_checklist]], [[01_core/105_docs_conventions]], [[01_core/106_docs_maintenance_playbook]], [[03_features/204_gateway_api_contracts]], [[03_features/206_testing_and_validation]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]]
:END:

---

:FOOTER:
:AUDITOR: studio_onboarding_guard
:END:
