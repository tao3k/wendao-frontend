# Gateway API Contracts

:PROPERTIES:
:ID: qianji-studio-gateway-contracts
:PARENT: [[index]]
:TAGS: feature, gateway, api, contracts
:STATUS: ACTIVE
:END:

## Overview

Qianji Studio is a frontend shell over the Wendao Studio gateway. The frontend should document endpoints by their runtime role, not only by their URL shape.

## Core Endpoint Families

### UI Configuration

- `GET /api/ui/config`
- `POST /api/ui/config`

Runtime role:

- Resolves the effective frontend-facing configuration loaded from `wendao.toml`.
- Declares indexed roots and UI-level gateway settings.

### Virtual File System

- `GET /api/vfs`
- `GET /api/vfs/<path>`
- `GET /api/vfs/cat?path=...`
- `GET /api/vfs/scan`

Runtime role:

- Drives the `Indexed Roots` explorer.
- Provides file metadata and raw content hydration.

### Graph and Topology

- `GET /api/graph/neighbors/<path>?direction=...&hops=...&limit=...`
- `GET /api/topology/3d`

Runtime role:

- `graph/neighbors` powers the graph tab and the references ledger for the selected file.
- `topology/3d` hydrates the higher-level workspace shell.

### Search Surfaces

- `GET /api/search`
- `GET /api/search/autocomplete`
- `GET /api/search/symbols`
- `GET /api/search/ast`
- `GET /api/search/definition`
- `GET /api/search/references`

Runtime role:

- `search`: blended knowledge search.
- `autocomplete`: fast prefix suggestions for knowledge search mode.
- `symbols`: declaration-level symbol search.
- `ast`: AST-derived definition search scope.
- `definition`: native semantic definition resolution for reference hits.
- `references`: source-level usage and reference search.

## Frontend Contract Rules

1. The frontend should treat gateway payloads as the source of truth and avoid fabricating semantic data.
2. Search actions should prefer a dedicated backend endpoint when one exists; only compose across multiple endpoints when there is no native studio contract yet.
3. Fallback UI may exist for resilience, but the documented contract should always describe the live gateway path first.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[01_core/107_docs_graph_map]], [[03_features/201_indexed_roots_and_vfs]], [[03_features/202_topology_and_graph_navigation]], [[03_features/203_semantic_search_actions]], [[03_features/205_panel_runtime_map]], [[03_features/209_backend_endpoint_cookbook]], [[05_research/303_snapshot_and_contract_policy]]
:END:

---

:FOOTER:
:AUDITOR: studio_gateway_contract_guard
:END:
