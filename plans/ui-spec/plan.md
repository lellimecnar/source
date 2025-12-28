# UI-Spec MVP (Core + React Binding)

**Branch:** `feature/ui-spec-mvp`
**Description:** Add an MVP implementation of UI-Spec as `@ui-spec/*` packages, supporting JSON schema → React rendering with read-only JSONPath bindings (no UIScript in MVP).

## Goal

Implement a minimal, production-oriented foundation for UI-Spec in this monorepo: a core runtime (`@ui-spec/core`) and a React binding (`@ui-spec/react`) that can render a static component tree from JSON, with `$path`-based data binding.

## Implementation Steps

### Step 1: Scaffold `@ui-spec` packages + TypeScript types

**Files:**

- `packages/ui-spec/core/package.json`
- `packages/ui-spec/core/tsconfig.json`
- `packages/ui-spec/core/src/index.ts`
- `packages/ui-spec/core/src/schema.ts`
- `packages/ui-spec/core/jest.config.js`
- `packages/ui-spec/react/package.json`
- `packages/ui-spec/react/tsconfig.json`
- `packages/ui-spec/react/src/index.ts`
- `packages/ui-spec/react/jest.config.js`

**What:**

- Create new workspaces under `packages/`:
  - `packages/ui-spec/core` with package name `@ui-spec/core`
  - `packages/ui-spec/react` with package name `@ui-spec/react`
- Define the MVP schema surface as TypeScript types (subset of the spec):
  - `UISpecSchema` with `$uispec: "1.0"` and `root`
  - `NodeSchema` with `type`, `props`, `children`, `class`
  - Binding object: `{ "$path": string }` for text/prop bindings
- Establish a stable public API shape (core exports types + minimal runtime functions; React exports a Provider + Renderer component).

**Testing:**

- `pnpm -w type-check` (or workspace-specific typecheck) passes
- Unit tests compile and run via package Jest config

### Step 2: Core parser + validation errors

**Files:**

- `packages/ui-spec/core/src/parse/**`
- `packages/ui-spec/core/src/errors.ts`

**What:**

- Implement parsing + validation for MVP schema:
  - Validate `$uispec` version
  - Validate `root` exists
  - Validate node `type` is string
  - Validate `children` is string | node | array
  - Validate binding objects have only `{ "$path": string }` in MVP
- Emit descriptive errors (typed error codes) suitable for devtools later.

**Testing:**

- Unit tests cover valid schema, common invalid shapes, and error messaging

### Step 3: Store + JSONPath binding resolution (read-only MVP)

**Files:**

- `packages/ui-spec/core/src/store/**`
- `packages/ui-spec/core/src/bindings/**`
- `packages/ui-spec/core/package.json` (dependency)

**What:**

- Implement a minimal reactive store API in core:
  - `get(path: string): unknown`
  - `setData(nextData: unknown): void` (replaces root data; MVP can re-render all)
  - `subscribe(listener): unsubscribe` (coarse-grained subscription is OK for MVP)
- Implement `$path` resolution against store data using a JSONPath engine.
- **Dependency choice:** add `jsonpath-plus`.
  - Default to `eval: "safe"` mode for filter evaluation.
  - Do not expose any UIScript execution hooks in MVP.

**Testing:**

- Unit tests for JSONPath reads including filter example like `$.users[?(@.active)].name`
- Unit tests for missing paths and empty results
- Unit tests for store subscription behavior

### Step 4: React binding renders primitives + bindings

**Files:**

- `packages/ui-spec/react/src/provider.tsx`
- `packages/ui-spec/react/src/render.tsx`
- `packages/ui-spec/react/src/types.ts`

**What:**

- Implement `UISpecProvider` to supply store + schema context.
- Implement `UISpecRenderer` to render:
  - Primitive nodes as intrinsic React elements (e.g. `div`, `span`, `button`)
  - `class` → `className`
  - `children` rendering including text and `{ "$path": ... }` bindings
  - Basic prop binding support where `props` values can be literals or `{ "$path": ... }`
- Keep the component registry minimal in MVP:
  - Intrinsics only, plus optional hook for custom component map (documented as “experimental” if included).

**Testing:**

- React render tests for:
  - simple tree
  - `$path` binding renders correct text
  - `className` applied
  - prop binding (e.g. `disabled`, `href`, `value`) for a couple representative props

### Step 5: Minimal docs + usage example

**Files:**

- `packages/ui-spec/core/README.md`
- `packages/ui-spec/react/README.md`
- `docs/api/ui-spec.md` (new)

**What:**

- Document MVP subset implemented:
  - Supported schema fields and node types
  - Binding behavior and limitations
  - Explicitly state **UIScript / `$fn` is not supported in MVP**
- Provide a minimal JSON schema example and React integration snippet.

**Testing:**

- Docs example is type-checkable (either validated in tests or manually verified during implementation)

## Notes / Constraints

- This MVP intentionally does not implement routing, validators, devtools, async boundaries, or UIScript.
- If performance becomes an issue (many bindings, frequent updates), consider a follow-up iteration:
  - Fine-grained subscription by path
  - Pre-compiling selectors and/or evaluating multiple JSONPath queries per update
  - Potential alternative engine (e.g., `nimma`) after semantics verification
