# Runtime Troubleshooting

:PROPERTIES:
:ID: qianji-studio-runtime-troubleshooting
:PARENT: [[index]]
:TAGS: research, troubleshooting, runtime, gateway
:STATUS: ACTIVE
:END:

## Overview

This page records the main runtime symptoms that have already appeared in the Qianji Studio and Wendao Studio workflow, plus the current recovery path for each one.

## Symptom: `ECONNREFUSED` to `127.0.0.1:8001`

Example shape:

```text
[HPM] Error occurred while proxying request ... to http://127.0.0.1:8001/ [ECONNREFUSED]
```

Current interpretation:

- The frontend dev proxy fell back to `8001` because `wendao.toml` was not read successfully or the gateway target was not resolved as expected.

Current recovery path:

1. Run the frontend from `.data/qianji-studio`.
2. Confirm `.data/qianji-studio/wendao.toml` still declares `127.0.0.1:9517`.
3. Confirm the gateway is actually listening on `9517`.
4. Restart the frontend dev server after the gateway bind is correct.

## Symptom: `Using fallback data`

Current interpretation:

- The frontend could not hydrate live gateway data for the explorer or another studio surface and is showing fallback UI instead.

Current recovery path:

1. Confirm `/api/ui/capabilities` and `/api/vfs/scan` are reaching the live gateway.
2. Confirm the dev proxy target is not stuck on the wrong bind.
3. Confirm indexed roots from `wendao.toml` are valid on the current machine.

## Symptom: `cyclic object value` in the Three or postprocessing stack

Current interpretation:

- Historical runtime symptom in the frontend rendering stack. Treat it as a graph or topology rendering regression until isolated.

Current recovery path:

1. Confirm whether the failure happens in the topology surface, the graph surface, or both.
2. Confirm the runtime is using live gateway data rather than an inconsistent fallback path.
3. Re-run the targeted frontend suite around `App`, `MainView`, `GraphView`, `ZenSearch`, and `DirectReader`.
4. If the failure is reproducible only in a browser session and not in the tests, isolate the rendering path before changing the data contract.

## Symptom: Search actions land in the wrong panel

Current interpretation:

- A regression in `requestedTab` routing or in the shared file hydration path.

Current recovery path:

1. Re-run `src/App.test.tsx` and `src/components/panels/MainView/MainView.test.tsx`.
2. Verify whether the failure affects `Open`, `Graph`, `Refs`, or `Definition` in Zen Search.
3. Keep the fix inside the shared selection pipeline instead of creating a special-case branch.

## Symptom: 3D topology flickers after refresh or polling

Current interpretation:

- Historical continuity failure in the 3D render path. The repair now keeps prior positions in
  `App`, uses incremental worker sync in `useSpatialLayout` and `usePhysicsWorker`, and prevents
  equivalent topology rerenders from cold-resetting `CosmicBackground` or `NebulaRenderer`.

Current recovery path:

1. Re-run `src/utils/topologyContinuity.test.ts`, `src/hooks/useSpatialLayout.test.ts`, and `src/components/__tests__/CosmicBackground.r3f.test.tsx`.
2. Confirm `App` still merges live topology through the shared position cache before `setTopology`.
3. Confirm `CosmicBackground` only calls worker `initialize` on first load and `synchronize` on topology-shape changes.
4. Confirm the worker message payload still includes the outbound `buffer` field expected by `usePhysicsWorker`.

## Troubleshooting Rule

Prefer proving the gateway bind, proxy target, and snapshot-backed backend contract before assuming a frontend-only failure.

:RELATIONS:
:LINKS: [[01_core/102_developer_onboarding]], [[01_core/103_release_checklist]], [[01_core/107_docs_graph_map]], [[03_features/204_gateway_api_contracts]], [[03_features/206_testing_and_validation]], [[05_research/302_backend_alignment_ledger]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/305_architecture_decision_log]], [[05_research/307_contract_changelog]], [[06_roadmap/401_semantic_studio_runtime]]
:END:

---

:FOOTER:
:AUDITOR: studio_runtime_troubleshooting_guard
:END:
