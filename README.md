# Qianji Studio

Frontend cockpit for the Wendao Studio gateway.

Qianji Studio is not a separate backend product. It is the interactive frontend layer that hydrates VFS, topology, graph, and semantic search data from the Wendao Studio runtime.

## Local Development

Run commands from `.data/qianji-studio` and prefer the project environment:

```bash
direnv exec . npm run dev
direnv exec . npm run build
direnv exec . npm test
```

## Gateway Configuration

The frontend resolves its default gateway target from:

```text
wendao.toml
```

Current local bind:

```toml
[gateway]
bind = "127.0.0.1:9517"
```

The dev proxy reads that bind and forwards `/api/*` requests to the configured Wendao Studio gateway. If that file cannot be read, the current fallback target is `http://localhost:8001`.

## Current Runtime Surface

- Indexed roots and VFS hydration
- Topology and graph navigation
- Graph auto-fallback to `/api/analysis/markdown` when `/api/graph/neighbors/<path>` returns `NODE_NOT_FOUND`
- Knowledge, symbols, AST, and references search
- Search actions for `Open`, `Graph`, `Refs`, and `Definition`
- Source-focused reader mode with line highlighting

## Documentation

- [docs/README.md](./docs/README.md) - Curated human entry point
- [docs/index.md](./docs/index.md) - Graph-structured docs kernel
- [docs/01_core/102_developer_onboarding.md](./docs/01_core/102_developer_onboarding.md) - Environment and startup flow
- [docs/01_core/105_docs_conventions.md](./docs/01_core/105_docs_conventions.md) - How the docs kernel is organized

## Focused Validation

The highest-value targeted frontend suite today is:

```bash
direnv exec . npm test -- src/App.test.tsx src/components/panels/MainView/MainView.test.tsx src/components/panels/GraphView/__tests__/GraphView.test.tsx src/components/SearchBar/__tests__/SearchBar.test.tsx src/components/panels/DirectReader/DirectReader.test.tsx
```

For backend contract validation, pair that with:

```bash
direnv exec . cargo test -p xiuxian-wendao gateway::studio -- --nocapture
```
