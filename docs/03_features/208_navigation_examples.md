# Navigation Examples

:PROPERTIES:
:ID: qianji-studio-navigation-examples
:PARENT: [[index]]
:TAGS: feature, examples, navigation, search
:STATUS: ACTIVE
:END:

## Overview

These examples document the intended runtime behavior for the main user flows in Qianji Studio. They are written against the current studio selection pipeline rather than hypothetical future behavior.

## Example 1: Open a Knowledge Result

Input:

- The operator searches for `context`.
- A knowledge hit appears for `knowledge/context.md`.
- The operator selects `Open`.

Expected runtime:

1. `SearchBar` emits a structured file selection.
2. `App` hydrates file content and relationships through the shared pipeline.
3. `MainView` receives a `requestedTab` for `Content`.
4. `DirectReader` opens the file content.

## Example 2: Branch from Search into Graph

Input:

- The operator searches for `writer`.
- A result points to `skills/writer/SKILL.md`.
- The operator selects `Graph`.

Expected runtime:

1. `SearchBar` requests graph focus for the selected file.
2. `App` hydrates the selected file path and live relationships.
3. `MainView` switches to the `Graph` tab.
4. `GraphView` renders the live neighbor graph for that path.

## Example 3: Branch from Search into References

Input:

- The operator searches for `AlphaService`.
- A matching result points to a source file.
- The operator selects `Refs`.

Expected runtime:

1. `SearchBar` sends the selected file and any available line metadata.
2. `App` runs the shared hydration pipeline.
3. `MainView` switches to the `References` tab.
4. The references ledger renders live neighbor relationships for the selected file.

## Example 4: Resolve a Reference Hit to a Definition

Input:

- The operator searches in `References` mode for `AlphaService`.
- A source reference hit is returned.
- The operator selects `Definition`.

Expected runtime:

1. `SearchBar` calls `/api/search/definition` with the symbol and source context.
2. The backend returns the best-ranked definition as a structured source location.
3. `App` hydrates that file and requests the `Content` tab.
4. `DirectReader` opens in source mode and focuses the target line range.

## Example 5: Continue from Graph into Content

Input:

- The operator is already in the `Graph` tab.
- A node click occurs on a neighboring file.

Expected runtime:

1. `GraphView` emits the node id and path.
2. `MainView` forwards the path to `App`.
3. `App` reuses the shared file hydration pipeline.
4. The selected file state updates everywhere, including references and reader context.

:RELATIONS:
:LINKS: [[03_features/203_semantic_search_actions]], [[03_features/205_panel_runtime_map]], [[03_features/207_panel_handbook]], [[05_research/302_backend_alignment_ledger]]
:END:

---

:FOOTER:
:AUDITOR: studio_examples_guard
:END:
