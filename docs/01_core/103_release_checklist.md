# Release Checklist

:PROPERTIES:
:ID: qianji-studio-release-checklist
:PARENT: [[index]]
:TAGS: core, release, checklist, validation
:STATUS: ACTIVE
:END:

## Overview

This checklist is the minimum release gate for Qianji Studio when the frontend surface or the Wendao Studio alignment changes.

## Environment and Proxy

1. Confirm local commands are being run from `.data/qianji-studio`.
2. Confirm the environment is loaded with `direnv exec .`.
3. Confirm `.data/qianji-studio/wendao.toml` still points to the intended gateway bind.
4. Confirm the frontend dev proxy is not silently falling back to `http://localhost:8001` unless that is intentionally desired.

## Wendao Studio Contract

1. Confirm the gateway is reachable on the configured bind.
2. Re-run the Wendao Studio contract suite:

```bash
direnv exec . cargo test -p xiuxian-wendao gateway::studio -- --nocapture
```

3. If payloads intentionally changed, regenerate and review the snapshots before landing:

```bash
direnv exec . env INSTA_UPDATE=always cargo test -p xiuxian-wendao gateway::studio -- --nocapture
```

## Frontend Runtime

1. Confirm the explorer shows live indexed roots rather than fallback data.
2. Confirm `Open` lands in `Content`.
3. Confirm `Graph` lands in `Graph`.
4. Confirm `Refs` lands in `References`.
5. Confirm `Definition` resolves through `/api/search/definition` into an AST-backed source location.
6. Confirm source focus opens in line-numbered mode inside `DirectReader`.

## Targeted Frontend Validation

Run the current high-value targeted suite:

```bash
direnv exec . npm test -- src/App.test.tsx src/components/panels/MainView/MainView.test.tsx src/components/panels/GraphView/__tests__/GraphView.test.tsx src/components/SearchBar/__tests__/SearchBar.test.tsx src/components/panels/DirectReader/DirectReader.test.tsx
```

## Documentation Sync

1. Update the backend alignment ledger if a capability changed status.
2. Update navigation examples if a user flow changed.
3. Update the snapshot and contract policy if the backend contract shape changed.
4. Do not document a composed frontend behavior as a native backend endpoint.

:RELATIONS:
:LINKS: [[01_core/102_developer_onboarding]], [[03_features/206_testing_and_validation]], [[05_research/302_backend_alignment_ledger]], [[05_research/303_snapshot_and_contract_policy]], [[05_research/304_runtime_troubleshooting]]
:END:

---

:FOOTER:
:AUDITOR: studio_release_guard
:END:
