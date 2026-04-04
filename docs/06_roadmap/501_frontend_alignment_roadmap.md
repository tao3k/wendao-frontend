# 501: Frontend Alignment Roadmap (Modern Deep Wiki UI)

:PROPERTIES:
:ID: wendao-frontend-alignment-roadmap
:STATUS: COMPLETED
:VERSION: 1.0
:DATE: 2026-03-19
:END:

## 1. Goal

Finalize the Deep Wiki MVP by resolving UI/UX inconsistencies, improving code-doc traceability, and ensuring 100% type-safety and performance across the stack. **(STATUS: COMPLETED)**

## 2. Key Gaps Resolved

- **[x] Interaction**: Side Drawer system implemented for non-blocking inspection.
- **[x] Data Rendering**: Symbol metadata (signatures, docstrings) correctly projected.
- **[x] Visual Trust**: Skeptic verification status and HippoRAG saliency indicators live.
- **[x] Navigation**: Hierarchical URIs and interactive breadcrumbs active.

## 3. Implementation Milestones

### Level 1: Contextual Side-Drawer (Completed)

_Objective: Enable "Instant Inspection" without context switching._

1.  **[x] Global Drawer Shell**: Implement a right-side sliding panel in `SearchShell.tsx`.
2.  **[x] State Management**: Create a `useDrawerState` hook to manage opening/closing and data hydration.
3.  **[x] Skeleton Rendering**: First-pass rendering of the **AST Bone** (Signatures & Types) inside the drawer.
4.  **[x] Markdown Hydration**: Integrate `DirectReader` to render the **Semantic Flesh** (Docstrings) using the `ProjectedPageIndexNode` contract.

### Level 2: Visual Truth & Saliency (Completed)

_Objective: Build developer trust through visual feedback._

1.  **[x] Skeptic Badge Component**: Add a "Shield" icon to `SearchResultRow.tsx` triggered by the `audit_status` field.
2.  **[x] Saliency Heatmap**: Implement a "Hot/Star" indicator based on HippoRAG PPR scores to highlight core repository hubs.
3.  **[x] Intent-Driven Highlighting**: Use the `/api/search/intent` signal to visually emphasize the most relevant action.

### Level 3: Hierarchical Topology Navigation (Completed)

_Objective: Map the code "Geography" to the UI._

1.  **[x] Breadcrumb Path**: Replace the flat path in results with interactive breadcrumbs: `repo > ecosystem > module > entity`.
2.  **[x] Backlink Portal**: At the bottom of the Side Drawer, render "Referenced in X Tutorials" using the `implicit_backlinks` contract.
3.  **[x] Equations Renderer**: Support LaTeX rendering for Modelica/SciML equations within the dedicated "Equation Slot" of the drawer.

### Level 4: Interactive Evolution (Completed)

_Objective: Enable collaborative documentation building._

1.  **[x] Click-to-Refine**: Add a "Refine with AI" button to empty drawer slots.
2.  **[x] Audit Flow**: Display a "Verifying..." spinner when the **Skeptic** node is auditing an AI-generated draft.
3.  **[x] Progress Tracking**: Integrate async task visibility for documentation refinement.

## 4. Final MVP Summary (March 19, 2026)

The Deep Wiki MVP is now fully operational with the following "Advanced" capabilities:

- **Quantum Search**: Valkey-cached AST-first retrieval (<100ms).
- **Spatial Navigation**: Hierarchical URI protocol and interactive TopoBreadcrumbs.
- **Visual Integrity**: Skeptic Audit badges and HippoRAG Saliency stars.
- **Collaborative Writing**: Trinity-powered "Refine with AI" loop grounded in AST skeletons.
- **Mathematical First-Class**: Automated equation extraction and LaTeX rendering.

---

**Approved**: @guangtao
