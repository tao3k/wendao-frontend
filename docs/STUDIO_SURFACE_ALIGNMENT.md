# Studio Surface Alignment

:PROPERTIES:
:ID: qianji-studio-surface-alignment
:PARENT: [[index]]
:TAGS: strategy, studio, gateway, alignment
:STATUS: ACTIVE
:END:

Qianji Studio is the frontend cockpit for the Wendao Studio gateway. The frontend does not define a separate data model; it presents and routes the gateway surface.

## Canonical Runtime Chain

`wendao.toml -> gateway bind -> ui config -> vfs/search/graph/topology -> App hydration -> MainView tab focus`

## Documentation Rule

Frontend docs should describe the live runtime surface that exists today, then isolate planned evolution in `06_roadmap`.

:RELATIONS:
:LINKS: [[index]], [[03_features/203_semantic_search_actions]], [[06_roadmap/401_semantic_studio_runtime]]
:END:
