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

### `GET /api/ui/config`

Typical purpose:

- Bootstrap frontend-facing configuration loaded from `wendao.toml`.

Frontend consumers:

- `FileTree`
- Runtime config bootstrap

Expected role:

- Return indexed roots and UI-level gateway settings used by the explorer.

### `POST /api/ui/config`

Typical purpose:

- Push updated UI config back to the backend when the frontend owns a config write path.

Frontend consumers:

- Runtime config synchronization paths

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

### `GET /api/topology/3d`

Typical purpose:

- Fetch the workspace topology shell.

Frontend consumers:

- `App`
- `MainView` topology surface

## Search Surface

### `GET /api/search?q=<query>&limit=<n>`

Typical purpose:

- Blended knowledge search.

Frontend consumers:

- `SearchBar` knowledge mode
- `SearchBar` all mode

### `GET /api/search/autocomplete?prefix=<prefix>&limit=<n>`

Typical purpose:

- Fast knowledge suggestions.

Frontend consumers:

- `SearchBar` suggestion lane

### `GET /api/search/symbols?q=<query>&limit=<n>`

Typical purpose:

- Declaration-level symbol lookup.

Frontend consumers:

- `SearchBar` symbols mode
- `SearchBar` all mode

### `GET /api/search/ast?q=<query>&limit=<n>`

Typical purpose:

- AST-derived definition search.

Frontend consumers:

- `SearchBar` AST mode
- `SearchBar` all mode

### `GET /api/search/definition?q=<query>&path=<path>&line=<n>`

Typical purpose:

- Resolve the best backend-ranked definition target for a reference hit.

Frontend consumers:

- `SearchBar` `Definition` action

### `GET /api/search/references?q=<query>&limit=<n>`

Typical purpose:

- Source-level reference and usage lookup.

Frontend consumers:

- `SearchBar` references mode
- `SearchBar` all mode
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
