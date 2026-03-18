# Semantic Search Actions

:PROPERTIES:
:ID: qianji-studio-search-actions
:PARENT: [[index]]
:TAGS: feature, search, ast, references, symbols
:STATUS: ACTIVE
:VERSION: 1.0
:END:

## Overview

Qianji Studio exposes a blended search surface across knowledge, symbols, AST definitions, and source references. Search results are not only display items; they are action nodes that branch into the right studio surface.

## Search Scopes

- `All`
- `Knowledge`
- `Symbols`
- `AST`
- `References`

## Result Actions

1. **Open**: hydrates the selected file and requests the `Content` tab.
2. **Graph**: hydrates the selected file and requests the `Graph` tab.
3. **Refs**: hydrates the selected file and requests the `References` tab.
4. **Definition**: available for reference hits; resolves the best backend-ranked definition through `/api/search/definition` and opens the definition location.

## Source Focus

When line metadata is present, `DirectReader` switches into a line-numbered source view and highlights the target line range instead of only showing a header hint.

:RELATIONS:
:LINKS: [[01_core/101_studio_surface_protocol]], [[03_features/202_topology_and_graph_navigation]], [[05_research/301_wendao_surface_alignment]]
:END:
