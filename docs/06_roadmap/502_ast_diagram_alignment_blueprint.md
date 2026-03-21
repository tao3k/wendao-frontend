# 502: AST Diagram Alignment Blueprint (Code Structure in Diagram Tab)

:PROPERTIES:
:ID: wendao-frontend-ast-diagram-alignment-blueprint
:STATUS: ACTIVE
:VERSION: 1.0
:DATE: 2026-03-20
:END:

## 1. Goal

Enable structured code AST visualization in the existing Diagram tab so Julia/Modelica repository files can show navigable structure graphs, not only BPMN or Mermaid code blocks.

This blueprint follows a strict contract-first rule:
1. Backend provides AST semantics and projection payloads.
2. Frontend renders only backend-provided semantics.
3. No frontend heuristic synthesis of missing graph semantics.

## 2. Current Baseline (Audit)

1. Diagram currently supports:
   1. BPMN XML rendering.
   2. Mermaid sources from file content.
   3. Markdown projection fallback via `/api/analysis/markdown`.
2. Diagram currently does not support:
   1. AST diagram mode for `.jl`, `.mo`, `.rs`, `.py`, `.ts`.
   2. Structured node/edge AST payload consumption in Diagram.
   3. Code-centric diagram toolbar actions (structure, calls, flow).

## 3. Product Design (Practical UI)

### 3.1 Entry and Visibility Rules

1. Diagram tab should show AST mode when active file is a supported code file and backend AST contract is available.
2. If both Mermaid and AST are available, show mode switch:
   1. `Mermaid`
   2. `AST`
   3. `Split` (optional in phase 2)
3. If AST is unavailable, show explicit reason:
   1. `Indexing in progress`
   2. `No AST projection for this file`
   3. `AST analysis failed`

### 3.2 AST Diagram UX

1. Toolbar chips:
   1. `Structure`
   2. `Calls`
   3. `Flow`
2. Default view is `Structure`.
3. Node click behavior:
   1. Jump to code line.
   2. Highlight selected node in diagram.
   3. Show right-side inspector metadata (kind, line range, signature, diagnostics).
4. Empty state must not fake content and must display backend diagnostics.

### 3.3 Phase-1 Rendering Strategy

1. Render AST projections as Mermaid first (fastest delivery).
2. Reuse existing `MermaidViewport`.
3. Defer native graph-canvas AST rendering to phase 3.

## 4. Backend Contract Requirements (Blocking)

## 4.1 New Endpoint

`GET /api/analysis/code-ast?path=<path>[&repo=<repo>][&line=<line>]`

## 4.2 Response Shape (Minimum)

1. `path: string`
2. `language: string`
3. `rootSymbol?: string`
4. `nodes: AstNode[]`
5. `edges: AstEdge[]`
6. `projections: AstProjection[]`
7. `focusNodeId?: string`
8. `diagnostics: string[]`

`AstNode` minimum fields:
1. `id`
2. `kind` (`module|function|method|type|call|import|if|loop|assignment|...`)
3. `label`
4. `lineStart`
5. `lineEnd`
6. `parentId?`

`AstEdge` minimum fields:
1. `id`
2. `kind` (`contains|calls|references|control_flow|data_flow`)
3. `sourceId`
4. `targetId`
5. `label?`

`AstProjection` minimum fields:
1. `kind` (`structure|calls|flow`)
2. `source` (Mermaid source for phase 1)
3. `nodeCount`
4. `edgeCount`
5. `diagnostics`

## 4.3 Contract Rules

1. Optional fields remain optional.
2. No breaking changes for existing `/api/analysis/markdown`.
3. Projection `kind` taxonomy must be stable and documented.

## 5. Frontend Implementation Plan

## 5.1 Type and API Layer

Files:
1. `src/api/bindings.ts`
2. `src/api/client.ts`

Changes:
1. Add `CodeAstAnalysisResponse` types.
2. Add `api.getCodeAstAnalysis(path, options)`.
3. Normalize snake_case and camelCase fields consistently.

## 5.2 Diagram Signature and ViewModel

Files:
1. `src/components/panels/DiagramWindow/diagramSignature.ts`
2. `src/components/panels/DiagramWindow/useDiagramWindowViewModel.ts`
3. `src/components/panels/DiagramWindow/diagramWindowState.ts`

Changes:
1. Detect AST-eligible code files.
2. Extend display mode with `ast`.
3. Resolve rendering priority:
   1. BPMN only -> BPMN
   2. Mermaid only -> Mermaid
   3. AST only -> AST
   4. Mermaid + AST -> AST default, Mermaid switchable
   5. BPMN + Mermaid + AST -> split policy defined by mode

## 5.3 Diagram UI Components

Files:
1. `src/components/panels/DiagramWindow/DiagramWindowToolbar.tsx`
2. `src/components/panels/DiagramWindow/DiagramWindowWorkspace.tsx`
3. `src/components/panels/DiagramWindow/DiagramWindow.css`
4. `src/components/panels/DiagramWindow/diagramWindowCopy.ts`
5. `src/components/panels/DiagramWindow/diagramWindowTypes.ts`

Changes:
1. Add AST mode button and labels.
2. Add AST panel section in workspace.
3. Add AST-specific loading and empty-state copy.
4. Reuse `MermaidViewport` for projection rendering in phase 1.

## 5.4 Hook for AST Projection

New file:
1. `src/components/panels/DiagramWindow/useCodeAstProjection.ts`

Responsibilities:
1. Trigger `/api/analysis/code-ast`.
2. Map projection kind to current AST view (`structure|calls|flow`).
3. Expose:
   1. `astMermaidSources`
   2. `astLoading`
   3. `astDiagnostics`
   4. `astStats`

## 6. Delivery Phases

## Phase 1 (MVP, Fast)

1. Backend endpoint with projection sources.
2. Frontend AST mode switch.
3. Mermaid-based AST rendering.
4. Node click jump to file line using projection metadata mapping.

## Phase 2 (Usability)

1. AST inspector panel with selected node details.
2. Stable diagnostics and progress states.
3. Split mode between Mermaid and AST when both exist.

## Phase 3 (Advanced)

1. Native graph-canvas AST renderer from nodes/edges.
2. Incremental AST refresh and focus sync with editor cursor.
3. Cross-file call graph drill-down.

## 7. Test Plan

## 7.1 Frontend Unit Tests

1. `diagramSignature`:
   1. Detect AST-capable paths correctly.
2. `useCodeAstProjection`:
   1. Loading state.
   2. Projection selection by kind.
   3. Error/diagnostic fallback.
3. `useDiagramWindowViewModel`:
   1. Mode resolution with AST-only and mixed content.
4. `DiagramWindow` UI:
   1. AST toolbar rendering.
   2. AST empty/error states.

## 7.2 Integration Tests

1. API client parsing for `code-ast` response (snake_case and camelCase).
2. Diagram mode switch from Mermaid to AST.
3. AST projection render and click jump callback trigger.

## 8. Acceptance Criteria

1. Julia/Modelica code files can display structured AST diagrams in Diagram tab.
2. AST mode is selectable and stable under reload.
3. Missing backend projections produce explicit UI states, not fake diagrams.
4. Diagram interactions never require frontend semantic guessing.
5. Existing BPMN and Mermaid flows remain unaffected.

## 9. Explicit Non-Goals

1. No frontend-only AST parser.
2. No temporary synthetic AST from regex/token guessing.
3. No silent fallback that hides backend contract gaps.

## 10. Open Blocking Questions (Backend Alignment Required)

1. Should AST projections be delivered only as Mermaid in MVP, or both Mermaid and raw graph should be mandatory from day one.
2. How `focusNodeId` is determined when a file opens from Search result with line metadata.
3. Whether `code-ast` endpoint should support repository-relative semantic path (`repo://`) directly in addition to file path.

---

Owner: @guangtao  
Execution scope: `wendao-frontend` + `xiuxian-wendao` contract alignment  
Depends on: `501_frontend_alignment_roadmap.md`
