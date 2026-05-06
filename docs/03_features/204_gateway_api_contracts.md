# Gateway API Contracts

:PROPERTIES:
:ID: qianji-studio-gateway-contracts
:PARENT: [[index|Qianji Studio DocOS Kernel: Map of Content]]
:TAGS: feature, gateway, api, contracts
:STATUS: ACTIVE
:END:

## Overview

Qianji Studio is a frontend shell over the Wendao Studio gateway. The frontend should document endpoints by their runtime role, not only by their URL shape.

## Core Endpoint Families

### UI Configuration

- `GET /api/ui/capabilities`

Runtime role:

- Resolves the effective frontend-facing capabilities exposed by the live gateway.
- Declares indexed roots, repo projects, and supported language/kind metadata for the frontend runtime.

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
- Markdown analysis metadata for the selected file now distinguishes canonical
  Obsidian/ZK-style explicit note backlinks from repo-search
  `implicitBacklinks`. On reader-facing note surfaces, prefer
  `documentMetadata.explicitBacklinks`; `documentMetadata.backlinks` remains a
  compatibility alias for the same explicit incoming-link lane. When a source
  note addresses the current note through `#Heading` or `#^block`, the
  explicit backlink row preserves the original `literal` plus
  `targetAddress` so the reader can distinguish scoped backlinks from
  whole-note backlinks without consulting `implicitBacklinks`.

### Document Projection

- `GET /api/repo/projected-page-index-trees?repo=<repo>`
- same-origin Flight `PATH /analysis/repo-projected-page-index-tree`

Runtime role:

- `projected-page-index-trees` enumerates stable projected markdown trees for one repository.
- `repo-projected-page-index-tree` opens one selected projected tree with the richer Arrow Flight payload used by the frontend reader/runtime.
- The intended frontend contract is hybrid: discover candidate pages over JSON, then open one page tree over same-origin Flight.

### Document Extraction

- same-origin Flight `PATH /analysis/document-extract`
- same-origin Flight `PATH /analysis/document-extract-status`

Runtime role:

- `document-extract` sends source-path extraction requests to the Rust-owned Wendao Flight provider.
- `document-extract-status` inspects Rust-scheduled extraction jobs.
- Python Docling remains a worker behind Rust scheduling and is not a frontend transport boundary.

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
- `implicitBacklinks` on search hits remains a derived repo-entity contract,
  not the same thing as note-reader backlinks.

## Frontend Contract Rules

1. The frontend should treat gateway payloads as the source of truth and avoid fabricating semantic data.
2. Search actions should prefer a dedicated backend endpoint when one exists; only compose across multiple endpoints when there is no native studio contract yet.
3. Fallback UI may exist for resilience, but the documented contract should always describe the live gateway path first.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol|Studio Surface Protocol]], [[01_core/107_docs_graph_map|Docs Graph Map]], [[03_features/201_indexed_roots_and_vfs|Indexed Roots and VFS Hydration]], [[03_features/202_topology_and_graph_navigation|Topology and Graph Navigation]], [[03_features/203_semantic_search_actions|Semantic Search Actions]], [[03_features/205_panel_runtime_map|Panel Runtime Map]], [[03_features/209_backend_endpoint_cookbook|Backend Endpoint Cookbook]], [[05_research/303_snapshot_and_contract_policy|Snapshot and Contract Policy]]
:END:

---

:FOOTER:
:AUDITOR: studio_gateway_contract_guard
:END:
