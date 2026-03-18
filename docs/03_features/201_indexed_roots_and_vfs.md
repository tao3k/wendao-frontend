# Indexed Roots and VFS Hydration

:PROPERTIES:
:ID: qianji-studio-vfs
:PARENT: [[index]]
:TAGS: feature, vfs, explorer, gateway
:STATUS: STABLE
:END:

## Overview

Qianji Studio exposes the Wendao VFS surface through the `Indexed Roots` explorer. The frontend should treat the gateway as the source of truth for root enumeration, file metadata, and file content.

## Runtime Flow

1. `wendao.toml` declares the gateway bind and indexed roots.
2. The dev proxy resolves the gateway target from that configuration.
3. `FileTree` loads `/api/ui/config` and `/api/vfs/scan` to build the explorer.
4. Selecting an entry calls the shared file hydration path in `App`.
5. Content is retrieved from `/api/vfs/cat`, while live relationships are fetched from `/api/graph/neighbors/...`.

## UX Expectations

- Explorer state should distinguish between live gateway data and fallback data.
- File selection must populate both content and relationships.
- BPMN content remains a special case that also activates the topology surface.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[01_core/107_docs_graph_map]], [[03_features/202_topology_and_graph_navigation]], [[03_features/204_gateway_api_contracts]], [[03_features/205_panel_runtime_map]], [[03_features/208_navigation_examples]]
:END:
