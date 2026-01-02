# UI-Spec Runtime + React Renderer + Component Adapters (No Router / No Validation)

## Branch name

`feat/ui-spec-core-react-adapters-jsonp3`

## Description

Build the minimal-but-powerful `@ui-spec/*` runtime needed to render advanced, dynamic, interactive UIs from JSON specs using **React**, with:

- `@ui-spec/core`: schema/types + JSONPath-backed store + JSON Patch engine + reactivity + component/function registries
- `@ui-spec/react`: React provider + renderer + hooks + a component adapter/plugin interface
- (optional) `@ui-spec/adapter-shadcn`: shadcn adapter that maps UI-Spec component names to `@lellimecnar/ui/*` (or any future shadcn-compatible package)

All packages are named `@ui-spec/*` and live under `packages/ui-spec/*`.

Explicitly **excluded** from this PR:

- Router packages (e.g. `@ui-spec/router`, `@ui-spec/router-react`)
- Validation packages/plugins (e.g. `@ui-spec/validate-*`)

## Goal

Enable rendering and interaction for a non-routed UI-Spec schema:

- JSONPath reads use `json-p3`
- Store + JSONPath + JSON Patch engine live in `@ui-spec/core`
- All mutations apply RFC 6902 JSON Patch operations via `store.patch([...])`
- React binding updates efficiently from store subscriptions
- No embedded function strings (no UIScript): use `json-p3`’s function registry as the source of truth for callable functions
- `@ui-spec/react` is component-library-agnostic via an adapter/plugin interface (shadcn adapter is optional)

## Research summary (repo-specific)

- There is **no existing implementation** under `packages/ui-spec/*` yet, but there are architecture/spec documents:
  - `spec/spec-architecture-ui-spec-packages.md`
  - `plan/architecture-ui-spec-core-1.md` and `plan/architecture-ui-spec-1.md`
  - `spec/design-ui-spec-json-p3.md` (normative: `json-p3` + JSON Patch)
- Testing conventions:
  - Monorepo uses **Vitest** for most packages with shared config from `@lellimecnar/vitest-config`.
  - Browser-ish React testing uses `happy-dom` (see `packages/ui/vitest.config.ts`).
  - Expo/RN uses Jest (`jest-expo`) but that’s out of scope here.
- Tailwind + shadcn conventions:
  - shadcn components live in `packages/ui` and are consumed via **granular exports** like `@lellimecnar/ui/button`.
  - Apps import `@lellimecnar/ui/global.css`.
- Monorepo conventions:
  - `pnpm-workspace.yaml` already includes `packages/ui-spec/*`.
  - Publishable TS packages typically use `vite build` + `vite-plugin-dts` and externalize deps (see `packages/utils/vite.config.ts`).
- Repo also contains an in-house JSONPath project under `packages/jsonpath/*`, but UI-Spec is required to use **`json-p3`**, not the in-house engine.

## Decided (resolved clarifications)

- Packages are named `@ui-spec/*` and live under `packages/ui-spec/*`.
- Store + JSONPath + JSON Patch engine live in `@ui-spec/core`.
- Use the `json-p3` npm package and its function registry (no UIScript; assume registry authority).
- `@ui-spec/react` must support pluggable component libraries via an adapter/plugin interface; shadcn is an optional adapter package.
- Tests use Vitest only; DOM tests use `happy-dom` (no Jest, no jsdom).

---

## Implementation steps (commit-sized)

> Workflow: each step is **red → green → refactor** with co-located `*.spec.ts` tests.
>
> Test runner: **Vitest only**. For UI-Spec packages, standardize on `happy-dom` for consistency.

### Step 1 — Scaffold `@ui-spec/*` packages (build/test/tooling)

**Commit message:** `chore(ui-spec): scaffold core/react/adapter-shadcn packages`

**Files (new):**

- `packages/ui-spec/core/{package.json,tsconfig.json,vite.config.ts,vitest.config.ts,README.md,src/index.ts}`
- `packages/ui-spec/react/{package.json,tsconfig.json,vite.config.ts,vitest.config.ts,README.md,src/index.ts}`
- `packages/ui-spec/adapter-shadcn/{package.json,tsconfig.json,vite.config.ts,vitest.config.ts,README.md,src/index.ts}`

**What:**

- Create the three packages with standard scripts matching the repo pattern:
  - `build`: `vite build`
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `test:coverage`: `vitest run --coverage`
  - `type-check`: `tsgo --noEmit`
  - `lint`: `eslint .`
- Dependencies:
  - `@ui-spec/core`: depends on `json-p3` (pinned), no framework deps
  - `@ui-spec/react`: depends on `@ui-spec/core` (`workspace:*`), peers `react`/`react-dom`, dev dep `happy-dom`
  - `@ui-spec/adapter-shadcn`: depends on `@ui-spec/react` (`workspace:*`) + `@lellimecnar/ui` (`workspace:*`), peers `react`/`react-dom`
- Vite configs follow `packages/utils/vite.config.ts` (externalize deps+peerDeps; `preserveModules`).
- Vitest config: use `happy-dom` for all three packages to satisfy the “happy-dom only” constraint.

**Testing:**

- `pnpm --filter @ui-spec/core test`
- `pnpm --filter @ui-spec/react test`
- `pnpm --filter @ui-spec/adapter-shadcn test`

---

### Step 2 — Define core public types + error model (MVP schema subset)

**Commit message:** `feat(ui-spec-core): add types + error codes`

**Files:**

- `packages/ui-spec/core/src/{index.ts,types.ts,errors.ts,schema.ts}`
- `packages/ui-spec/core/src/{types.spec.ts,errors.spec.ts}`

**What:**

- Define the minimal schema contracts needed for interactive rendering (MVP subset):
  - `UISpecSchema` with `data?: unknown`, `root: NodeSchema`, optional `components`, optional `functions`
  - `NodeSchema` with `type`, optional `props`, optional `children`, plus binding primitives below
- Define binding primitives:
  - `$path` binding: `{ $path: string }` (RFC 9535 JSONPath)
  - `$call` binding: `{ $call: { id: string; args?: unknown[] } }`
  - `BindingValue = unknown | { $path: string } | { $call: { id: string; args?: unknown[] } }`
- Define event handler schema (no embedded strings):
  - `$on?: Record<string, { $call: { id: string; args?: unknown[] } }>`
- Error model:
  - `UISpecError` with stable `code` strings (e.g., `UI_SPEC_JSONP3_API_MISSING`, `UI_SPEC_PATH_NOT_FOUND`, `UI_SPEC_PATH_NOT_UNIQUE`, `UI_SPEC_INVALID_SCHEMA`, `UI_SPEC_FUNCTION_NOT_FOUND`, `UI_SPEC_COMPONENT_NOT_FOUND`).

**Testing:**

- Type-level tests as needed + runtime tests ensuring errors serialize predictably.
- `pnpm --filter @ui-spec/core test`

---

### Step 3 — `json-p3` adapter boundary + function registry (authoritative)

**Commit message:** `feat(ui-spec-core): add json-p3 boundary + function registry`

**Files:**

- `packages/ui-spec/core/src/{jsonp3.ts,function-registry.ts}`
- `packages/ui-spec/core/src/{jsonp3.spec.ts,function-registry.spec.ts}`

**What:**

- Implement `src/jsonp3.ts` as the **only** module allowed to import from `json-p3`.
- Provide adapter APIs used everywhere else in core:
  - `createJsonp3FunctionRegistry()` (wraps/returns the `json-p3` function registry; treated as authoritative)
  - `createJsonp3Evaluator({ registry })` for evaluating JSONPath expressions against a doc
  - `jsonp3FindAll(path, doc) -> Array<{ value: unknown; path: string }>` (returns normalized match “paths”; JSON Pointer conversion is handled in core)
- Implement `FunctionRegistry` as a thin wrapper around `json-p3`’s registry:
  - `register(id, fn)` delegates to the underlying registry
  - `get(id)` resolves functions by id/name
  - `call(id, ctx, ...args)` calls the registered function (assume registry rules are authoritative; no extra purity checks)

**Testing:**

- Adapter throws `UI_SPEC_JSONP3_API_MISSING` when required json-p3 capabilities aren’t available.
- Function registry resolves, rejects unknown IDs, and enforces call signatures.

---

### Step 4 — Store v1: JSONPath reads (`get`, `select`) with exact-match semantics

**Commit message:** `feat(ui-spec-core): implement store reads + selectors`

**Files:**

- `packages/ui-spec/core/src/{store.ts,observable.ts}`
- `packages/ui-spec/core/src/{store.read.spec.ts}`

**What:**

- Implement `createUISpecStore(initialDoc, options?)`:
  - `get(path)` evaluates via `json-p3` and returns the value for exactly one match
  - errors:
    - 0 matches → `UI_SPEC_PATH_NOT_FOUND`
    - > 1 match → `UI_SPEC_PATH_NOT_UNIQUE`
- Implement a minimal observable/subscription primitive for `select(path)`.
  - v1 can re-evaluate on any patch and only emit when value changes (`Object.is`) to keep correctness simple.
  - Refactor later for fine-grained pointer-based invalidation.

**Testing:**

- Read semantics: scalars, objects, arrays
- Exact-match enforcement
- `select()` emits initial value and updates

---

### Step 5 — Store v1: JSON Patch engine + mutations (`patch`, `set`, `update`, `merge`, `push`, `remove`)

**Commit message:** `feat(ui-spec-core): implement json patch engine + write helpers`

**Files:**

- `packages/ui-spec/core/src/{store.ts,patch-helpers.ts}`
- `packages/ui-spec/core/src/{store.write.spec.ts,patch-helpers.spec.ts}`

**What:**

- Implement `patch(ops)` applying RFC 6902 ops atomically inside `@ui-spec/core`.
  - Use a small, dedicated JSON Patch implementation (library or internal), but keep the patch application boundary in core.
- Implement convenience writers by generating RFC 6902 ops and delegating to `patch()`.
- Implement write targeting:
  - resolve JSONPath to exactly one match
  - convert match location to JSON Pointer via core-owned path normalization (do not rely on json-p3 returning pointers)
- Guardrails:
  - pushing to non-array throws
  - merging non-object throws

**Testing:**

- Each helper’s behavior + error cases
- Batched patch emits one notification cycle

---

### Step 6 — Store v1: subscription correctness + notification semantics

**Commit message:** `test(ui-spec-core): harden subscriptions + notification ordering`

**Files:**

- `packages/ui-spec/core/src/{store.ts,observable.ts}`
- `packages/ui-spec/core/src/{store.subscribe.spec.ts}`

**What:**

- Specify and lock store semantics with tests:
  - subscribers receive the latest doc snapshot
  - `select(path)` emits (initial + changes only)
  - batched `patch([...])` produces exactly one notification cycle
  - unsubscription is idempotent

**Testing:**

- Concurrency-ish cases (multiple subscribers, unsubscribe during emit)
- No “stale reads” after patch

---

### Step 7 — Core runtime context + action execution (registry-backed, no UIScript)

**Commit message:** `feat(ui-spec-core): add context + call execution`

**Files:**

- `packages/ui-spec/core/src/{context.ts,actions.ts}`
- `packages/ui-spec/core/src/{context.spec.ts,actions.spec.ts}`

**What:**

- `createUISpecContext({ store, functions })` exposing:
  - `get/select/patch/set/update/merge/push/remove`
  - `call(id, ...args)` which uses `FunctionRegistry` and passes `ctx` as first arg.
- Implement `resolveAction(actionSchema, ctx)`:
  - `{ $call: { id, args } }` → executes registered function
  - support args containing `$path` bindings (resolved at call time)

**Testing:**

- Calls execute and can mutate store
- Unknown functions throw deterministic error

---

### Step 8 — Node resolution: bindings (`$path`) in props/children + component resolution

**Commit message:** `feat(ui-spec-core): resolve nodes with bindings + registries`

**Files:**

- `packages/ui-spec/core/src/{resolve.ts,component-registry.ts}`
- `packages/ui-spec/core/src/{resolve.spec.ts,component-registry.spec.ts}`

**What:**

- Implement `ComponentRegistry` (string → component definition).
- Implement `resolveNode(nodeSchema, ctx, registries)`:
  - resolves primitive values
  - resolves `{ $path }` against store
  - resolves `$on` entries into callable handlers (functions that call `resolveAction`)
  - preserves `class` / `style` values as strings/objects after binding resolution
- Define a `ResolvedNode` contract consumable by `@ui-spec/react`.

**Testing:**

- `$path` in props and children
- `$on` events call function registry
- Missing component IDs throw `UI_SPEC_COMPONENT_NOT_FOUND` (no silent fallback)

---

### Step 9 — React adapter interface: pluggable component libraries

**Commit message:** `feat(ui-spec-react): add component adapter interface`

**Files:**

- `packages/ui-spec/react/src/{adapter.ts,registry.ts,index.ts}`
- `packages/ui-spec/react/src/{adapter.spec.ts,registry.spec.ts}`

**What:**

- Define a small adapter/plugin interface in `@ui-spec/react`:
  - `UISpecComponentAdapter` that can produce a `ComponentRegistry` for a given renderer context
  - adapter composition rules (e.g. last-wins overrides)
- Expose `createComponentRegistry({ adapters, intrinsic? })` used by the renderer.
- Ensure `@ui-spec/react` does not import shadcn or any UI library directly.

**Testing:**

- Adapter composition, overrides, and missing component behavior

---

### Step 10 — React binding: provider, renderer, and subscription hooks

**Commit message:** `feat(ui-spec-react): provider + renderer + hooks`

**Files:**

- `packages/ui-spec/react/src/{provider.tsx,render.tsx,hooks.ts,context.ts,index.ts}`
- `packages/ui-spec/react/src/{provider.spec.tsx,render.spec.tsx,hooks.spec.tsx}`

**What:**

- `UISpecProvider` creates:
  - store (or accepts injected store)
  - function registry (or accepts injected)
  - component registry (composed from provided adapters)
  - memoized `UISpecContext`
- `UISpecNode` / `renderNode()`:
  - uses `resolveNode()` to compute props/children
  - uses React elements for intrinsic tags vs registered components
- `useUISpecValue(path)`:
  - subscribes to `store.select(path)` and triggers re-render

**Testing:**

- Use `happy-dom` + Testing Library (from `@lellimecnar/vitest-config` patterns).
- Verify:
  - initial render from schema
  - store mutation triggers re-render
  - click handlers invoke function registry and mutate state

---

### Step 11 — Optional adapter: `@ui-spec/adapter-shadcn` component mappings

**Commit message:** `feat(ui-spec-adapter-shadcn): map component names to @lellimecnar/ui`

**Files:**

- `packages/ui-spec/adapter-shadcn/src/{index.ts,adapter.ts}`
- `packages/ui-spec/adapter-shadcn/src/{adapter.spec.ts}`

**What:**

- Export a `createShadcnAdapter()` implementing `UISpecComponentAdapter` with a minimal set:
  - `Button` → `@lellimecnar/ui/button`
  - `Input` → `@lellimecnar/ui/input`
  - `Card` pieces, etc. (keep small, expand later)
- No new styling: rely on existing `@lellimecnar/ui` Tailwind/shadcn styles.

**Testing:**

- Adapter returns stable mappings and matches expected component names.

---

### Step 12 — Cross-package integration tests (core ↔ react ↔ adapter-shadcn)

**Commit message:** `test(ui-spec): add integration suite for interactive counter`

**Files:**

- `packages/ui-spec/react/src/integration/counter.spec.tsx`
- (Optional) `packages/ui-spec/core/src/fixtures/*.ts`

**What:**

- Add an integration test that renders a simple counter schema:
  - `Text` reads `$.count`
  - `Button` click calls `inc` function id
  - `inc` uses `ctx.set('$.count', ctx.get('$.count') + 1)`
- Ensures:
  - bindings work end-to-end
  - registry-backed event handlers work
  - no router/validation assumptions exist

**Testing:**

- `pnpm --filter @ui-spec/react test`

---

### Step 13 — Refactor + harden: deterministic errors, edge cases, docs

**Commit message:** `refactor(ui-spec): harden errors + edge cases + docs`

**Files:**

- `packages/ui-spec/core/src/**` (targeted refactors only)
- `packages/ui-spec/*/README.md`
- `specs/ui-spec.md` [NEEDS CLARIFICATION: update vs leave as-is]

**What:**

- Improve error messages (include path, op index, function id).
- Tighten internal schema guards (lightweight, internal—no external validation packages).
- Document:
  - JSONPath + JSON Patch invariants
  - function registry approach (no embedded code)
  - how to supply adapters/registries from `@ui-spec/react`

**Testing:**

- `pnpm --filter @ui-spec/core test`
- `pnpm --filter @ui-spec/react test`
- `pnpm --filter @ui-spec/adapter-shadcn test`

---

## Final verification checklist

- `pnpm --filter @ui-spec/core build && pnpm --filter @ui-spec/core test`
- `pnpm --filter @ui-spec/react build && pnpm --filter @ui-spec/react test`
- `pnpm --filter @ui-spec/adapter-shadcn build && pnpm --filter @ui-spec/adapter-shadcn test`
- `pnpm -w type-check`

## Explicit non-goals (this PR)

- Routing, navigation, route context, route matching
- Validation adapters (Zod/Yup/JSON Schema/etc)
- Any runtime-evaluated embedded code strings
