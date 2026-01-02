# UI Spec MVP (`@ui-spec/*`)

**Branch:** `ui-spec/mvp-packages`
**Description:** Implement the MVP set of `@ui-spec/*` packages (core + React binding + router add-ons + Zod validation adapter) as described in the architecture plans and UI-Spec JSONPath/Patch requirements.

## Goal

Deliver a minimal, production-viable UI-Spec runtime and React renderer that:

- Uses **only** `json-p3` for JSONPath evaluation and JSON Patch application.
- Keeps router/validation optional add-ons.
- Avoids arbitrary code execution (no UIScript in MVP).

## Scope (MVP only)

This plan implements **only**:

- `@ui-spec/core`
- `@ui-spec/react`
- `@ui-spec/router`
- `@ui-spec/router-react`
- `@ui-spec/validate-zod`

Explicitly out of scope (deferred): `@ui-spec/vue`, `@ui-spec/svelte`, `@ui-spec/solid`, `@ui-spec/web`, `@ui-spec/angular`, any `@ui-spec/ui-*`, `@ui-spec/cli`, `@ui-spec/devtools`, `@ui-spec/server`, and any other validator adapters.

## Global Constraints

- **JSON engine**: `@ui-spec/*` MUST use `json-p3` as the single JSONPath/JSON Patch implementation source.
- **Failure behavior**: Core store operations MUST be non-mutating on error (e.g., failed select/patch).
- **UIScript**: Out of scope for MVP. Use JSONPath only; if scripting is needed later, prefer `json-p3` extension points.
- **Monorepo**: All internal deps MUST use `workspace:*` and respect workspace boundaries.
- **Build outputs**: Each new package MUST produce `dist/` outputs consistent with repo validation tooling.
- **Zod packaging**: `zod` MUST be a `peerDependency` for `@ui-spec/validate-zod`.
- **json-p3 gaps**: If required `json-p3` API capabilities are missing (e.g., cannot derive a JSON Pointer for a match), the implementation MUST throw a clear error (e.g., `UI-SPEC_JSONP3_API_MISSING`) rather than silently degrading.

## Implementation Steps (commit-sized)

### Step 1: Scaffold the MVP packages

**Files:**

- `packages/ui-spec/core/*`
- `packages/ui-spec/react/*`
- `packages/ui-spec/router/*`
- `packages/ui-spec/router-react/*`
- `packages/ui-spec/validate-zod/*`

**What:**

- Create the package folders with:
  - `package.json` (name, version, `type`, `exports`, `files`, scripts)
  - `tsconfig.json` extending repo defaults
  - `vite.config.*` producing `dist/`
  - `vitest.config.ts` using shared `packages/config-vitest/*`
  - `src/index.ts`
- Use `workspace:*` for internal dependencies.
- Configure peers where appropriate:
  - `@ui-spec/react`: peers for `react`/`react-dom`
  - `@ui-spec/router-react`: peers for `react`/`react-dom`
  - `@ui-spec/validate-zod`: peerDependency `zod`

**Testing:**

- Ensure Vitest project discovery includes `packages/ui-spec/*/vitest.config.ts`.
- `pnpm -r --filter @ui-spec/* test` (or equivalent repo test invocation) should at least discover configs.

---

### Step 2: Implement `@ui-spec/core` runtime (store + context + required contracts)

**Files:**

- `packages/ui-spec/core/src/**`
- `packages/ui-spec/core/src/**/*.spec.ts`

**What:**
Implement all required core functionality from `plan/architecture-ui-spec-core-1.md`, aligned with the `@ui-spec/*` package-architecture contracts.

#### 2.1 Public exports (required contracts)

Export (at minimum):

- `JsonPatchOperation` (RFC 6902 union).
- `Observable<T>` with `subscribe(listener) => unsubscribe`.
- `UISpecStore` interface with:
  - `get<T>(path: string): T` (JSONPath read; requires exactly one match).
  - `select<T>(path: string): Observable<T>` (reactive; emits immediately and after patches).
  - `patch(ops: JsonPatchOperation[]): void` (atomic apply).
  - `set(path, value)`, `update(path, updater)`, `merge(path, partial)`, `push(path, ...items)`, `remove(path, predicate)` convenience helpers implemented via `patch(...)`.
- `UISpecContext` base shape (router fields are not present unless router plugins are used):
  - `get`, `select`, `patch`, `set`, `update`, `merge`, `push`, `remove` delegating to store.
- Router and validation contracts for downstream packages:
  - `RouteContext`, `RouterController`
  - `ValidationError`, `ValidationResult`, `ValidationPlugin`

#### 2.2 `json-p3` adapter module (single import boundary)

- Create a single adapter module that is the only place allowed to import from `json-p3`.
- Adapter must provide:
  - `jsonp3FindAll(path, doc) -> Array<{ value: unknown; pointer: string }>` where `pointer` is a JSON Pointer for each match (or is derivable).
  - `jsonp3ApplyPatch(doc, ops) -> newDoc`.
- If required `json-p3` API capabilities are missing, throw `UI-SPEC_JSONP3_API_MISSING:` including missing symbol/capability details.

#### 2.3 Store behavior: reads

- `get(path)`:
  - Uses `jsonp3FindAll`.
  - Requires exactly one match.
  - Error prefixes:
    - 0 matches: `UI_SPEC_GET_NO_MATCH:`
    - > 1 match: `UI_SPEC_GET_MULTI_MATCH:`
- `select(path)`:
  - Returns `Observable<T>`.
  - Emits immediately upon subscribe with the current `get(path)` value.
  - Re-emits after any successful `patch([...])`.

#### 2.4 Store behavior: patch + write helpers

- `patch(ops)`:
  - Applies ops atomically.
  - Notifies subscribers only on success.
- Write helpers must:
  - Resolve JSONPath to exactly one match.
  - Generate JSON Patch operations and delegate to a single `patch([...])` call.
  - Never mutate on error.
  - Use error prefixes:
    - 0 matches: `UI_SPEC_WRITE_NO_MATCH:`
    - > 1 match: `UI_SPEC_WRITE_MULTI_MATCH:`
  - Type-error prefixes:
    - `merge` target not object: `UI_SPEC_MERGE_TARGET_NOT_OBJECT:`
    - `push` target not array: `UI_SPEC_PUSH_TARGET_NOT_ARRAY:`
    - `remove` target not array: `UI_SPEC_REMOVE_TARGET_NOT_ARRAY:`
- Performance constraint:
  - `push(path, ...items)` must batch into a single `patch([...])` call.
  - `remove(path, predicate)` must batch into a single `patch([...])` call.

#### 2.5 Context composition

- Provide `createUISpecContext(store, extras?)` that delegates to `UISpecStore`.
- Do not include routing fields in the base `UISpecContext` shape; router packages provide their own augmented context types/providers.

#### 2.6 UIScript (explicitly deferred)

- MVP does not include UIScript (`$fn`) execution.
- If schema contains function-like directives, core should treat them as unsupported in MVP (documented behavior; exact runtime handling is an implementation detail of `@ui-spec/react`).

**Testing:**

- Unit tests validating:
  - JSONPath read correctness via `json-p3` adapter.
  - Exact-one-match enforcement (`get` and write helpers).
  - JSON Patch application correctness via `patch(ops)`.
  - No mutation on any thrown error.
  - `push`/`remove` batching (single `patch([...])` call behavior).
  - Type errors (`merge` target not object, `push/remove` target not array) with required prefixes.
  - `select()` emits immediately and re-emits after successful patches.
  - Clear error codes/messages for `UI-SPEC_JSONP3_API_MISSING:` including missing capability details.

---

### Step 3: Implement `@ui-spec/react` provider + renderer

**Files:**

- `packages/ui-spec/react/src/**`
- `packages/ui-spec/react/src/**/*.spec.ts`

**What:**

- Implement:
  - `UISpecProvider` to provide schema/store/context.
  - `renderNode(node, ctx)` or equivalent entry point to render a schema node.
  - Hooks:
    - `useUISpecValue(path)` (or equivalent) that subscribes to store updates.
- Schema behavior:
  - Resolve JSONPath-bound props against the current store doc.
  - Track changes so updates re-render minimal necessary React components.
- Router guard:
  - If `schema.routes` exists and no router integration is installed, throw a deterministic error (`UI-SPEC_ROUTER_REQUIRED` or similar).

**Testing:**

- happy-dom tests validating:
  - Rendering of basic node trees.
  - JSONPath prop binding resolution.
  - Reactive updates: store mutation triggers re-render.
  - Router guard behavior when routes are present but router is not installed.

---

### Step 4: Implement `@ui-spec/router` (optional add-on)

**Files:**

- `packages/ui-spec/router/src/**`
- `packages/ui-spec/router/src/**/*.spec.ts`

**What:**

- Implement `RouterController` per architecture spec:
  - `getRoute()`
  - `navigate(to)`
  - `back()`
- Implement `RouteContext` types and an in-memory controller suitable for apps.
- Keep the dependency direction strictly optional: core and react must work without router.

**Testing:**

- Unit tests for controller behavior and route state transitions.

---

### Step 5: Implement `@ui-spec/router-react` adapter

**Files:**

- `packages/ui-spec/router-react/src/**`
- `packages/ui-spec/router-react/src/**/*.spec.ts`

**What:**

- Implement:
  - `UISpecRouterProvider` that composes route capability into the UI-Spec React context.
  - `useRoute()` for route consumption.
- Ensure the router guard in `@ui-spec/react` passes when router-react is installed.

**Testing:**

- happy-dom tests:
  - Provider composition.
  - `useRoute()` updates on navigation.
  - React re-render correctness when route changes.

---

### Step 6: Implement `@ui-spec/validate-zod` (Zod adapter)

**Files:**

- `packages/ui-spec/validate-zod/src/**`
- `packages/ui-spec/validate-zod/src/**/*.spec.ts`

**What:**

- Implement a `ValidationPlugin` backed by Zod that:
  - Produces `ValidationResult` in the common core format.
  - Extracts field-level errors (`getFieldErrors`) deterministically.
- Packaging:
  - `zod` is a `peerDependency`.
  - Vite build externalizes `zod`.

**Testing:**

- Unit tests:
  - Valid payload returns success.
  - Invalid payload maps errors as expected.
  - Missing peer scenario is documented (tests should not rely on missing peer at runtime).

---

### Step 7: Add minimal cross-package integration tests

**Files:**

- Prefer placing in `@ui-spec/react` or a dedicated `packages/ui-spec/react/src/integration/*.spec.ts` (keep minimal)

**What:**

- A small integration suite that verifies:
  - Core store + React binding renders and updates.
  - Router installed vs missing behavior.
  - Zod plugin can be registered/used through core contracts.

**Testing:**

- Run the full `@ui-spec/*` test suite.

## Acceptance Criteria

- All five MVP packages build successfully and output `dist/`.
- All unit/integration tests pass under Vitest.
- `@ui-spec/core` uses `json-p3` exclusively for JSONPath/Patch.
- `@ui-spec/core` exports the required package-architecture contracts (`JsonPatchOperation`, `UISpecStore`, base `UISpecContext`, router/validation types).
- Store operations enforce exact-match rules, required error prefixes, `push/remove` batching, and do not mutate on failure.
- `@ui-spec/react` throws if routes exist and router is not installed.
- `@ui-spec/validate-zod` uses `zod` as a peerDependency and works when provided by the host.

## Notes / Decisions (recorded)

- MVP-only implementation (no non-React bindings in this PR).
- `zod` is a peerDependency for `@ui-spec/validate-zod`.
- If `json-p3` cannot provide required pointer/match details, the adapter throws a hard error (`UI-SPEC_JSONP3_API_MISSING`).
- No UIScript in MVP.
