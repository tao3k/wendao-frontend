# Studio Surface Protocol

:PROPERTIES:
:ID: qianji-studio-surface-protocol
:PARENT: [[index]]
:TAGS: architecture, core, frontend, studio
:STATUS: ACTIVE
:END:

## Definition

The orchestration contract for Qianji Studio. It defines how `App`, `MainView`, `ZenSearch`, `FileTree`, `GraphView`, `DirectReader`, and the Structured Intelligence Dashboard cooperate on top of the Wendao Studio gateway.

## Protocol Layers

1. **Gateway Surface**: `wendao.toml` drives gateway bind configuration, UI config, VFS roots, topology, graph neighbors, and search endpoints.
2. **App Orchestration**: `App.tsx` owns hydrated file state, active relationships, and requested panel focus.
3. **Panel Shell**: `MainView` resolves explicit tab requests for `content`, `graph`, and `references`.
4. **Selection Pipeline**: Tree selection, Zen Search actions, and graph-node clicks all converge on the same file hydration path. Zen Search is the primary full-screen search workspace, while the legacy modal `SearchBar` remains an internal compatibility surface. Zen mode keeps the workspace mounted and only hides it at the presentation layer, so switching modes preserves graph and panel state. The Zen shell is lazy-loaded so the normal workspace startup path does not depend on the full Zen subtree at initial render time. The right-side Structured Intelligence Dashboard projects the selected result into topology, anatomy, fragments, and relational layers, and code-backed results stay in the AST anatomy path instead of falling back to a raw content preview. All selection paths must be canonicalized before VFS or graph lookup so internal workspace paths such as `.data/wendao-frontend/...` never leak into backend requests. When a bare relative selection arrives without `projectName`, `App` first asks the gateway to resolve it into a project-scoped target before hydration instead of guessing from local labels. The canonical VFS identity is `projectName/path`. The operational contract is `resolve-to-canonical-target` first, then `content/graph` lookup against that target; relative and workspace-local aliases are compatibility inputs for resolve only, not stable VFS identities.
5. **Reader Focus**: `DirectReader` keeps Markdown in rich mode by default, exposes explicit source focus controls when line metadata is available, and uses the shared Shiki-backed syntax highlighter for fenced code blocks and source-mode line inspection across supported languages.

## Stable Contracts

- `selectedFile` is the canonical frontend carrier for `path`, `category`, `content`, and optional source location metadata.
- `relationships` is populated from live gateway neighbor data and should remain empty rather than synthetic when a lookup fails.
- `requestedTab` is the explicit control plane for panel focus changes initiated by search and graph actions.
- `ZenSearchWindow` is the app-facing search entrypoint. It should own Zen mode orchestration and feed the Structured Intelligence Dashboard, while `SearchBar` stays as an internal compatibility surface.
- `ZenSearchWindow` is loaded lazily from the main app shell so a failure in the Zen subtree cannot block workspace startup.
- Graph actions are only valid for note-backed selections. Code, attachment, and other non-note results should not expose graph entry points.

:RELATIONS:
:LINKS: [[03_features/201_indexed_roots_and_vfs]], [[03_features/202_topology_and_graph_navigation]], [[03_features/203_semantic_search_actions]]
:END:

---

:FOOTER:
:AUDITOR: studio_surface_guard
:END:
