# Snapshot and Contract Policy

:PROPERTIES:
:ID: qianji-studio-snapshot-contract-policy
:PARENT: [[index]]
:TAGS: research, snapshot, contract, gateway
:STATUS: ACTIVE
:END:

## Purpose

Qianji Studio is a frontend over the Wendao Studio gateway. That means frontend-facing docs and runtime assumptions should track the backend contract surface, not drift away from it.

## Current Wendao Studio Snapshot Surface

The current backend studio snapshot suite lives in:

- `packages/rust/crates/xiuxian-wendao/tests/unit/gateway/studio/graph.rs`
- `packages/rust/crates/xiuxian-wendao/tests/unit/gateway/studio/search.rs`
- `packages/rust/crates/xiuxian-wendao/tests/unit/gateway/studio/vfs.rs`
- `packages/rust/crates/xiuxian-wendao/tests/unit/gateway/studio/support.rs`

The current snapshot payloads live in:

- `packages/rust/crates/xiuxian-wendao/tests/snapshots/gateway/studio/*.snap`

Representative payload contracts include:

- `search_payload.snap`
- `search_symbols_payload.snap`
- `search_ast_payload.snap`
- `search_references_payload.snap`
- `graph_neighbors_payload.snap`
- `topology_3d_payload.snap`
- `vfs_scan_roots_payload.snap`
- `ui_capabilities_search_contract_payload.snap`

## Policy for Qianji Studio Docs

1. Describe the live gateway contract first.
2. If the frontend composes a behavior client-side, mark it as composed rather than native.
3. Do not document a frontend capability as stable if there is no corresponding gateway contract or accepted local runtime path.
4. Keep example flows aligned with current snapshot-backed backend payload families.
5. Treat the Rust-owned `searchContract` manifest inside `ui/capabilities` as the stable search grammar and repo-discovery source before trusting frontend-local filter constants or repo-list semantics.

## Policy for Qianji Studio Runtime

1. Tree, search, and graph entry points must converge on the same file hydration path.
2. Search scopes should map to real backend surfaces:
   - knowledge
   - symbols
   - AST
   - references
3. Definition lookup should resolve through the native `/api/search/definition` contract, while `AST` remains the declaration-oriented search scope.

## Recommended Backend Verification

When the Wendao studio contract changes, verify it with the backend suite first:

```bash
direnv exec . cargo test -p xiuxian-wendao gateway::studio -- --nocapture
```

If snapshots are intentionally updated:

```bash
direnv exec . env INSTA_UPDATE=always cargo test -p xiuxian-wendao gateway::studio -- --nocapture
```

## Recommended Frontend Follow-up

After a backend contract change:

1. Update the Qianji docs pages that mention the changed surface.
2. Re-run the targeted Qianji frontend tests for the affected interaction path.
3. Update the backend alignment ledger if the capability moved from `Partial` to `Implemented`.

:RELATIONS:
:LINKS: [[01_core/102_developer_onboarding]], [[01_core/103_release_checklist]], [[01_core/106_docs_maintenance_playbook]], [[03_features/204_gateway_api_contracts]], [[03_features/206_testing_and_validation]], [[05_research/302_backend_alignment_ledger]], [[05_research/304_runtime_troubleshooting]], [[05_research/307_contract_changelog]]
:END:

---

:FOOTER:
:AUDITOR: studio_contract_policy_guard
:END:
