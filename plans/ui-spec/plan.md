# UI-Spec v1

**Branch:** feature/ui-spec-v1

**Description:** Complete the UI-Spec v1 surface described in specs/ui-spec.md, evolving the existing MVP (read-only $path + intrinsic React renderer) into a full JSON-driven UI runtime. Work ships as a single PR with commit-sized steps and package-scoped tests.

## Goal

Deliver a complete, usable v1 of UI-Spec for React with a framework-agnostic core, including directives, reactivity, UIScript, validation, optional routing, and CLI type generation.

## Implementation Steps

### Step 1 — Expand core schema/types (v1 surface, MVP-compatible)

**Files:**

- packages/ui-spec/core/src/schema.ts
- packages/ui-spec/core/src/index.ts
- packages/ui-spec/core/src/**fixtures**/types.\*

**What:**

- Expand `UISpecSchema` to include optional `meta`, `data`, `components`, `functions`, `plugins`, `schemas`, `computed`, and optional `routes`.
- Expand `NodeSchema` to include `$id`, `$ref`, `$if/$else`, `$switch`, `$for`, `$bind`, `$on`, `$slots`, and lifecycle hooks.
- Define binding/expression unions: `$path`, `$expr`, `$call`, `FunctionSchema`.
- Add compile-only TypeScript fixtures to lock the public type surface (decision: fixtures for type tests).

**Testing:**

- pnpm --filter @ui-spec/core type-check

### Step 2 — Core parsing + structural validation (schema + node directives)

**Files:**

- packages/ui-spec/core/src/errors.ts
- packages/ui-spec/core/src/parse/index.ts
- packages/ui-spec/core/src/parse/validate.ts
- packages/ui-spec/core/src/parse.spec.ts

**What:**

- Extend parsing to accept the full root schema shape while keeping the current MVP valid.
- Add structural validation for directive shapes (`$if/$else`, `$switch`, `$for`, `$bind`, `$on`, `$slots`, lifecycle hooks).
- Add `validateSchema(schema, options)` consistent with the Security Model section (unknown property strictness, maxDepth/maxNodes, JSONPath checks, UIScript checks toggled).
- Validate routed vs non-routed constraints (when `routes` is present, `root` becomes the app shell and is optional/required per chosen semantics).

**Testing:**

- pnpm --filter @ui-spec/core test

### Step 3 — Store v1: fine-grained select + write operations + JSONPath write semantics

**Files:**

- packages/ui-spec/core/src/store/types.ts
- packages/ui-spec/core/src/store/store.ts
- packages/ui-spec/core/src/store.spec.ts
- packages/ui-spec/core/src/bindings/jsonpath.ts

**What:**

- Add `select(path)` subscriptions and keep `subscribe()` for compatibility.
- Add write API: `set`, `update`, `merge`, `push`, `remove`, `batch`, `transaction`, plus `computed` registration.
- Implement JSONPath write semantics (decision): writes apply to all matches (including filters/wildcards) in stable match order.
- Return structured write results (e.g., `{ matched, changed, errors }`) so callers and tests can assert multi-match behavior.

**Testing:**

- pnpm --filter @ui-spec/core test

### Step 4 — Core evaluation: resolve bindings + style/class helpers (no UIScript execution yet)

**Files:**

- packages/ui-spec/core/src/eval/index.ts
- packages/ui-spec/core/src/eval/resolveValue.ts
- packages/ui-spec/core/src/eval/resolveClass.ts
- packages/ui-spec/core/src/eval/resolveStyle.ts
- packages/ui-spec/core/src/eval.spec.ts

**What:**

- Implement pure evaluation of binding expressions:
  - `$path` reads via store
  - `$expr` evaluation spec (decision): full JavaScript expressions (execution gated; see Step 7)
  - `$call` (named function invocation wiring; runtime in Step 7)
- Implement styling helpers: `class` string/array, `$classes`, `$map`, `$if/$then`, `$css`, and `style` resolution.
- Keep deterministic, side-effect-free evaluation by default; no inline `$fn` execution until UIScript is enabled.

**Testing:**

- pnpm --filter @ui-spec/core test

### Step 5 — Component system: components registry, $ref, $extends, slots

**Files:**

- packages/ui-spec/core/src/components/index.ts
- packages/ui-spec/core/src/components/resolveRef.ts
- packages/ui-spec/core/src/components/slots.ts
- packages/ui-spec/core/src/components.spec.ts

**What:**

- Implement component definition registry from `schema.components`.
- Support `$ref` resolution and `$extends` inheritance semantics.
- Implement `$slots` projection and a `Slot` node convention consistent with the spec examples.
- Encode a minimal, consistent scope resolution order for bindings:
  1. local scope (`$for` locals / slot params)
  2. `$props`
  3. root `data`
  4. route/query scope only when router installed

**Testing:**

- pnpm --filter @ui-spec/core test

### Step 6 — Compile/resolve pass: $if/$else, $switch, $for

**Files:**

- packages/ui-spec/core/src/compile/index.ts
- packages/ui-spec/core/src/compile/compileNode.ts
- packages/ui-spec/core/src/compile/compile.spec.ts

**What:**

- Implement a compile/resolve pass that transforms a schema node into a renderable node tree:
  - `$if` and `$else` (including `$else: true` shorthand used in examples)
  - `$switch`
  - `$for` iteration with locals (`as`, `$index`, stable key behavior)
- Ensure compilation composes with `$ref` and slots.

**Testing:**

- pnpm --filter @ui-spec/core test

### Step 7 — UIScript runtime: $fn, $call, $expr (restricted Function, opt-in)

**Files:**

- packages/ui-spec/core/src/uiscript/index.ts
- packages/ui-spec/core/src/uiscript/sandbox.ts
- packages/ui-spec/core/src/uiscript/spec.ts
- packages/ui-spec/core/src/uiscript.spec.ts
- packages/ui-spec/core/src/eval/resolveValue.ts

**What:**

- Implement `FunctionSchema` compilation and execution with `UISpecContext`.
- Sandbox decision: restricted `Function` compilation (opt-in; default disabled) with configurable allowlist/timeouts.
- `$expr` decision: full JavaScript (evaluated through the same gated execution pathway).
- Implement named functions (`schema.functions`) and `$call` invocation.
- Ensure router-only context methods (`navigate`, `back`, `route`) throw descriptive errors when router is not installed.

**Testing:**

- pnpm --filter @ui-spec/core test

### Step 8 — React binding API: Provider(schema/plugins/initialData), UISpecApp, UISpecNode

**Files:**

- packages/ui-spec/react/src/provider.tsx
- packages/ui-spec/react/src/types.ts
- packages/ui-spec/react/src/index.ts
- packages/ui-spec/react/src/render.tsx
- packages/ui-spec/react/src/render.spec.tsx

**What:**

- Update `UISpecProvider` to accept `schema`, `plugins`, and `initialData` (retain a store-override escape hatch if needed).
- Add `UISpecApp` (renders schema root or routed shell) and `UISpecNode` (render arbitrary node schema).
- Integrate the core compile/eval pipeline so React renders resolved nodes rather than raw schema.

**Testing:**

- pnpm --filter @ui-spec/react test

### Step 9 — React runtime: $on events, $bind (two-way), lifecycle hooks + jsdom tests

**Files:**

- packages/ui-spec/react/jest.config.js
- packages/ui-spec/react/src/render.tsx
- packages/ui-spec/react/src/hooks/useBind.ts
- packages/ui-spec/react/src/hooks/useLifecycle.ts
- packages/ui-spec/react/src/runtime/events.ts
- packages/ui-spec/react/src/runtime/bind.ts
- packages/ui-spec/react/src/runtime.spec.tsx

**What:**

- Implement `$on` event wiring (schema lower-case DOM event names → React handler props).
- Implement `$bind` semantics:
  - read/write/two-way modes
  - `transform` on read, `parse` on write
  - `debounce`/`throttle` behaviors
- Implement lifecycle hooks: `$mounted`, `$updated`, `$unmounted`.
- Switch React package tests to `jsdom` for DOM interaction coverage (decision: jsdom tests).

**Testing:**

- pnpm --filter @ui-spec/react test

### Step 10 — Validation: core plugin API + JSON Schema validator package

**Files:**

- packages/ui-spec/core/src/validation/index.ts
- packages/ui-spec/core/src/validation/types.ts
- packages/ui-spec/core/src/validation.spec.ts
- packages/ui-spec/validate-jsonschema/package.json
- packages/ui-spec/validate-jsonschema/tsconfig.json
- packages/ui-spec/validate-jsonschema/jest.config.js
- packages/ui-spec/validate-jsonschema/src/index.ts
- packages/ui-spec/validate-jsonschema/src/index.spec.ts

**What:**

- Add `ValidationPlugin` interfaces in core and integrate with context (`ctx.validate`) and `$bind.validate`.
- Support `schema.schemas` registry and plugin registration via `schema.plugins`.
- Implement `@ui-spec/validate-jsonschema` as the first validator package.

**Testing:**

- pnpm --filter @ui-spec/core test
- pnpm --filter @ui-spec/validate-jsonschema test

### Step 11 — Routing (optional add-on): router + router-react with fetch-based lazy loading

**Files:**

- packages/ui-spec/router/package.json
- packages/ui-spec/router/tsconfig.json
- packages/ui-spec/router/jest.config.js
- packages/ui-spec/router/src/index.ts
- packages/ui-spec/router/src/match.ts
- packages/ui-spec/router/src/history.ts
- packages/ui-spec/router/src/lazy.ts
- packages/ui-spec/router/src/index.spec.ts
- packages/ui-spec/router-react/package.json
- packages/ui-spec/router-react/tsconfig.json
- packages/ui-spec/router-react/jest.config.js
- packages/ui-spec/router-react/src/index.ts
- packages/ui-spec/router-react/src/UISpecRouter.tsx
- packages/ui-spec/router-react/src/index.spec.tsx

**What:**

- Implement `@ui-spec/router` as a core-optional package (no dependency from `@ui-spec/core`).
- Support route matching, params/query extraction, navigation, and `beforeEnter` guards.
- Implement lazy route loading decision: router uses `fetch()` to load remote JSON schema (and then delegates to core parse/validate).
- Implement `@ui-spec/router-react` integration (`UISpecRouter`, `RouterOutlet`, `NavLink`) and expose `$route.params` and `$query` binding surfaces.

**Testing:**

- pnpm --filter @ui-spec/router test
- pnpm --filter @ui-spec/router-react test

### Step 12 — TypeScript authoring helpers + CLI (validate + comprehensive generate-types)

**Files:**

- packages/ui-spec/core/src/ts/index.ts
- packages/ui-spec/core/src/ts/defineComponent.ts
- packages/ui-spec/core/src/ts/infer.ts
- packages/ui-spec/core/src/**fixtures**/types.\*
- packages/ui-spec/cli/package.json
- packages/ui-spec/cli/tsconfig.json
- packages/ui-spec/cli/jest.config.js
- packages/ui-spec/cli/src/index.ts
- packages/ui-spec/cli/src/commands/validate.ts
- packages/ui-spec/cli/src/commands/generateTypes.ts
- packages/ui-spec/cli/src/fixtures/\*\*
- packages/ui-spec/cli/src/index.spec.ts

**What:**

- Add best-effort authoring helpers in core: `defineComponent`, `inferDataType`, `inferPropsType`, and `UISpecContext<TData>` typing.
- Implement CLI with:
  - `uispec validate <file>` using `validateSchema`
  - `uispec generate-types <file> -o <out>` (decision: comprehensive CLI typegen) generating:
    - `data` interface
    - component prop types
    - route unions (when routes are present)
    - schemas registry types
    - typed `UISpecContext<TData>` helpers
- Use compile-only fixtures to lock generated type shapes (decision: fixtures for type tests).

**Testing:**

- pnpm --filter @ui-spec/core type-check
- pnpm --filter @ui-spec/cli test

### Step 13 — AsyncBoundary for React (no caching in v1 plan)

**Files:**

- packages/ui-spec/react/src/components/AsyncBoundary.tsx
- packages/ui-spec/react/src/components/AsyncBoundary.spec.tsx
- packages/ui-spec/react/src/index.ts

**What:**

- Implement `AsyncBoundary` support for `$async` sources using `ctx.api`.
- Implement loading/error/default slots.
- Explicitly defer caching features (`cache`, `staleWhileRevalidate`) to a follow-up (decision: caching deferred).

**Testing:**

- pnpm --filter @ui-spec/react test

- Feature Name: validation plugin API
- Branch name (kebab-case): feature/ui-spec-v1-core
- Goal: Add the validation interfaces and integrate them into `$bind` and `ctx.validate`.
- Implementation Steps
  - Step 1
    - Files: new `packages/ui-spec/core/src/validation/**`, update `packages/ui-spec/core/src/index.ts`
    - What:
      - Implement `ValidationPlugin` interface and registration via `plugins`.
      - Support `schema.schemas` registry (JSON Schema or arbitrary plugin schemas).
      - Implement `ctx.validate(value, schemaName)` and `$bind.validate` hooks.
    - Testing:
      - Unit tests with a fake validator plugin.

### Commit 12 — JSON Schema Validator Workspace

- Feature Name: validate-jsonschema plugin
- Branch name (kebab-case): feature/ui-spec-v1-core
- Goal: Provide a real validator implementation per spec.
- Implementation Steps
  - Step 1
    - Files: new `packages/ui-spec/validate-jsonschema/**` (package.json/tsconfig/jest/src)
    - What:
      - Implement `@ui-spec/validate-jsonschema` using Ajv.
      - Expose a plugin factory that matches the core validation plugin interface (same shape as other validation plugins).
    - Testing:
      - Unit tests: valid/invalid values, field error mapping.
      - `pnpm --filter @ui-spec/validate-jsonschema test`

### Commit 13 — Router Core Workspace

- Feature Name: router (framework-agnostic)
- Branch name (kebab-case): feature/ui-spec-v1-core
- Goal: Implement route matching, params/query, navigation, guards, lazy loading.
- Implementation Steps
  - Step 1
    - Files: new `packages/ui-spec/router/**`
    - What:
      - Route schema types and matcher.
      - Support `redirect` routes and `meta` fields (examples use `$route.meta.title`).
      - Navigation state + history integration.
      - Guards (`beforeEnter`) and route context.
      - Lazy route loading contract (decision): fetch-based (HTTP).
        - Recommendation: `loader: { url: string, method?: 'GET'|'POST', headers?: Record<string,string> }` and the router calls `fetch(url, ...)` then `parseUISpecSchema(await res.json())`.
    - Testing:
      - Pure unit tests for matching and guard behavior.

### Commit 14 — Router React Workspace

- Feature Name: router-react integration
- Branch name (kebab-case): feature/ui-spec-v1-core
- Goal: Provide `UISpecRouter`, `RouterOutlet`, `NavLink` React components.
- Implementation Steps
  - Step 1
    - Files: new `packages/ui-spec/router-react/**`, update `@ui-spec/react` integration points
    - What:
      - Render matched route component.
      - Provide `$route.params` and `$query` bindings.
      - Provide `$route.meta` binding surface.
      - Implement `ctx.navigate/back/route`.
    - Testing:
      - Unit tests for route switching and link active state.

### Commit 15 — TypeScript Authoring Helpers

- Feature Name: TS integration helpers
- Branch name (kebab-case): feature/ui-spec-v1-core
- Goal: Provide the key authoring helpers referenced in the spec.
- Implementation Steps
  - Step 1
    - Files: new `packages/ui-spec/core/src/ts/**` or similar, update exports
    - What:
      - Implement `defineComponent` helper.
      - Implement `inferDataType` / `inferPropsType` generics (best-effort).
      - Provide `UISpecContext<TData>` typing.
    - Testing:
      - Type-check fixtures and minimal runtime tests.

### Commit 16 — CLI (minimal: validate + generate-types)

- Feature Name: CLI scaffolding
- Branch name (kebab-case): feature/ui-spec-v1-core
- Goal: Implement a minimal CLI matching the spec’s most essential commands.
- Implementation Steps
  - Step 1
    - Files: new `packages/ui-spec/cli/**`
    - What:
      - `uispec validate <file>` using `validateSchema`.
      - `uispec generate-types <file> -o <out>` generates comprehensive TypeScript types:
        - root `data` shape
        - component prop types
        - schema registry types (validators / schemas)
        - a strongly typed `UISpecContext<TData>` and helper types for bindings
      - Defer `convert/dev/build/analyze` unless requested.
    - Testing:
      - Node-based CLI tests with fixture schemas.

### Commit 17 — Async Data + AsyncBoundary (React)

- Feature Name: async data boundary
- Branch name (kebab-case): feature/ui-spec-v1-core
- Goal: Implement the `AsyncBoundary` behavior from the Data Layer section for React.
- Implementation Steps
  - Step 1
    - Files: `packages/ui-spec/react/src/components/AsyncBoundary.tsx` (new), `packages/ui-spec/react/src/index.ts`, plus core helper types under `@ui-spec/core`
    - What:
      - Support a schema-driven async source (`$async`) that loads data via `ctx.api` and writes to a target path.
      - Implement loading/error/default slots.
      - Defer caching (`cache`, `staleWhileRevalidate`) for a future iteration; implement a correct, minimal no-cache baseline.
    - Testing:
      - Unit tests using mocked `ctx.api` and deterministic timers.

---

## Open Questions (Resolved)

- Scope rules: accepted.
- Event conventions: accepted.

### Recommended Scope Rules (proposal)

- Resolution order for `$path` / `$expr` reads:
  1. loop/component `scope` (locals created by `$for`, slot params)
  2. `$props` (props passed into a component via `$ref`)
  3. store `data` (root application data)
  4. `$route` / `$query` (only if router installed)

- Standard scope bindings:
  - `$props`: component props object
  - `$binding`: only set while evaluating `$bind` expressions; includes `{ path, value, mode, errors? }`
  - `$field`: only set while evaluating validation for a specific bound field; includes `{ path, value }`
  - `$error`: only set inside validation error rendering contexts; includes `{ code, message, path }`

- `$for` locals:
  - `$item`: current item (name configurable via schema, default `$item`)
  - `$index`: number
  - `$key`: stable key (if provided; otherwise `$index`)

### Recommended Event Conventions (proposal)

- Schema event key names are lower-case DOM names (e.g. `click`, `change`, `input`, `submit`, `keydown`).
- `$on` value is either a UIScript function ref or inline function schema.
- `ctx.event` is populated with `{ type, target, native? }` during handler execution.
