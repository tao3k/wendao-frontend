# Backend Endpoint Cookbook

:PROPERTIES:
:ID: qianji-studio-backend-endpoint-cookbook
:PARENT: [[index]]
:TAGS: feature, cookbook, gateway, api
:STATUS: ACTIVE
:END:

## Overview

This cookbook records the current frontend-facing Wendao Studio endpoints, the request shape Qianji Studio expects, and the frontend surface that consumes each endpoint.

## UI Configuration

### `GET /api/ui/capabilities`

Typical purpose:

- Bootstrap frontend-facing capabilities and indexed-root metadata from the live gateway.

Frontend consumers:

- `FileTree`
- Runtime bootstrap and live contract proofs

Expected metadata:

- `projects`
- `repoProjects`
- `supportedLanguages`
- `supportedRepositories`
- `supportedKinds`

## VFS Endpoints

### `GET /api/vfs`

Typical purpose:

- List root VFS entries.

Frontend consumers:

- VFS-oriented explorer surfaces

### `GET /api/vfs/cat?path=<path>`

Typical purpose:

- Read raw file content for the selected path.

Frontend consumers:

- `App` shared hydration pipeline
- `DirectReader`
- BPMN topology loading path

### `GET /api/vfs/scan`

Typical purpose:

- Scan indexed roots and build the file tree.

Frontend consumers:

- `FileTree`

Expected metadata:

- `projectName`
- `rootLabel`
- `projectRoot`
- `projectDirs`

Notes:

- Qianji Studio now treats this payload as the authoritative source for explorer grouping and hover provenance.
- Frontend path recovery from `wendao.toml` is no longer part of the steady-state FileTree contract.
- The live gateway contract now also locks these fields through `src/api/liveGateway.test.ts`, so `projectName`, `rootLabel`, `projectRoot`, and `projectDirs` are treated as stable runtime metadata rather than fixture-only expectations.

## Graph and Topology

### `GET /api/graph/neighbors/<path>?direction=<dir>&hops=<n>&limit=<n>`

Typical purpose:

- Fetch the focused file neighborhood.

Frontend consumers:

- `GraphView`
- `MainView` references ledger
- Shared hydration pipeline

Typical Qianji usage:

- `direction=both`
- `hops=1` for references
- `hops=2` for the graph view

Expected metadata:

- `center.navigationTarget`
- `nodes[*].navigationTarget` when the node represents an openable document or resolved symbol target

Notes:

- The graph contract is now backend-first end to end. Qianji Studio still keeps a small fallback when a node omits `navigationTarget`, but live gateway verification now treats `navigationTarget` as the intended steady-state payload.

### `GET /api/topology/3d`

Typical purpose:

- Fetch the workspace topology shell.

Frontend consumers:

- `App`
- `MainView` topology surface

## Document Projection

### `GET /api/repo/projected-page-index-trees?repo=<repo>`

Typical purpose:

- Enumerate projected markdown/page-index trees available for one repository before the frontend opens a specific tree.

Frontend consumers:

- `src/api/clientRuntime.ts`
- live gateway contract proofs

Expected metadata:

- `repo_id`
- `trees[*].page_id`
- `trees[*].path`
- `trees[*].title`
- `trees[*].root_count`

Notes:

- This is the canonical frontend discovery surface for projected page-index trees.
- The steady-state contract is repository-scoped discovery over JSON, followed by page-scoped opening over same-origin Flight.

### same-origin Flight `PATH /analysis/repo-projected-page-index-tree`

Typical purpose:

- Open one deterministic projected page-index tree selected from the discovery surface.

Frontend consumers:

- `src/api/clientRuntime.ts`
- reader/runtime hydration paths that need the full projected tree payload

Expected metadata:

- request headers:
  - `x-wendao-repo-projected-page-index-tree-repo`
  - `x-wendao-repo-projected-page-index-tree-page-id`
- response payload:
  - full `ProjectedPageIndexTree`, including `roots[*].children` and section text

Notes:

- The frontend does not currently use `GET /api/docs/page-index-tree` as its steady-state opener.
- The frontend-facing contract for repo-scoped page-index work is the hybrid discovery/open pair documented in this section.

## Search Surface

General rule:

- Backend-provided `navigationTarget` metadata is the primary navigation contract for studio search actions.
- Qianji Studio keeps a minimal fallback path for older or incomplete payloads, but new gateway responses should populate `navigationTarget` whenever a hit is expected to open another file or jump target.

### `GET /api/search?q=<query>&limit=<n>`

Typical purpose:

- Blended knowledge search.

Frontend consumers:

- `ZenSearch` knowledge mode
- `ZenSearch` all mode

Expected metadata:

- `hits[*].navigationTarget`

Notes:

- The live gateway contract now verifies that knowledge hits carry `navigationTarget` in addition to the frontend fallback behavior kept for transitional payloads.

### `GET /api/search/autocomplete?prefix=<prefix>&limit=<n>`

Typical purpose:

- Fast knowledge suggestions.

Frontend consumers:

- `ZenSearch` suggestion lane

### `GET /api/search/symbols?q=<query>&limit=<n>`

Typical purpose:

- Declaration-level symbol lookup.

Frontend consumers:

- `ZenSearch` symbols mode
- `ZenSearch` all mode

### `GET /api/search/ast?q=<query>&limit=<n>`

Typical purpose:

- AST-derived definition search across source files and configured Markdown structure.

Notes:

- Configured doc roots now contribute Markdown heading and task nodes to this endpoint, so `ZenSearch` AST mode can surface `qianji-studio/docs` without a dedicated secondary API.
- When multiple projects expose the same root label such as `docs`, the studio path contract now resolves them as `project/root/...` instead of numeric aliases such as `docs-2/...`.
- Property drawers are also indexed into this endpoint now, including entries such as `:ID:`, relation attributes, and `:OBSERVE:` code-observation directives, so Markdown AST search can bridge documentation metadata and code-facing observations.

Frontend consumers:

- `ZenSearch` AST mode
- `ZenSearch` all mode

### `GET /api/search/definition?q=<query>&path=<path>&line=<n>`

Typical purpose:

- Resolve the best backend-ranked definition target for a reference hit.

Frontend consumers:

- `ZenSearch` `Definition` action

Notes:

- The preferred contract is a top-level `navigationTarget`.
- Qianji Studio also accepts `definition.navigationTarget` or bare definition coordinates as a resilience fallback, but this should be treated as compatibility behavior rather than the primary payload shape.

### `GET /api/search/references?q=<query>&limit=<n>`

Typical purpose:

- Source-level reference and usage lookup.

Frontend consumers:

- `ZenSearch` references mode
- `ZenSearch` all mode
- `Refs` action source selection

## Cookbook Rule

If the frontend adds a new action or view, first place it on top of an existing gateway endpoint family or document the need for a new backend contract before landing the UI behavior as stable.

:RELATIONS:
:LINKS: [[03_features/204_gateway_api_contracts]], [[03_features/205_panel_runtime_map]], [[03_features/208_navigation_examples]], [[05_research/303_snapshot_and_contract_policy]]
:END:

---

:FOOTER:
:AUDITOR: studio_endpoint_cookbook_guard
:END:
