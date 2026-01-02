---
goal: Implement @ui-spec/* package collection (core runtime + React binding) with json-p3-backed JSONPath reads and JSON Patch mutations
version: 1.0
date_created: 2026-01-01
last_updated: 2026-01-01
owner: @lellimecnar
status: 'Planned'
tags: [architecture, ui-spec, packages, jsonpath, jsonpatch, react]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the exact phases and tasks to create the initial `@ui-spec/*` package set in this monorepo, starting with `@ui-spec/core` and a single framework binding (`@ui-spec/react`). The core runtime MUST evaluate JSONPath via `json-p3` and MUST apply all mutations via RFC 6902 JSON Patch operations delegated through a `patch(operations)` API.

## 1. Requirements & Constraints

- **REQ-001**: The package collection SHALL be structured into layers with explicit responsibilities (core runtime, bindings, add-ons, tooling).
- **REQ-002**: Each package SHALL have a single primary responsibility and SHALL expose a minimal public API for that responsibility.
- **CON-001**: `@ui-spec/core` SHALL NOT depend on any framework binding package.
- **CON-002**: A framework binding package SHALL depend on `@ui-spec/core`.
- **CON-003**: Add-ons (e.g., router) SHALL be optional and SHALL NOT be required to render a static tree.
- **REQ-003**: All JSONPath evaluation SHALL be implemented using `json-p3`.
- **CON-004**: The runtime SHALL NOT implement a second JSONPath engine in parallel with `json-p3`.
- **REQ-004**: All state mutations SHALL be applied via JSON Patch (RFC 6902) operations.
- **REQ-005**: Convenience write helpers (`set`, `update`, `merge`, `push`, `remove`) SHALL be implemented by generating JSON Patch operations and delegating to `patch(operations)`.
- **REQ-006**: When a write helper receives a JSONPath target, it SHALL resolve the JSONPath against the current store document and require exactly one match.
- **REQ-007**: If a write helper resolves to zero matches, it SHALL throw a descriptive error and SHALL NOT mutate state.
- **REQ-008**: If a write helper resolves to more than one match, it SHALL throw a descriptive error and SHALL NOT mutate state.
- **SEC-001**: UIScript evaluation SHALL execute in a restricted environment provided by the host, with an explicit context object and no implicit global access.
- **SEC-002**: The runtime SHALL treat schema as untrusted input by default and SHALL provide a configurable policy layer for enabling or disabling dynamic execution features.
- **GUD-001**: Prefer small, composable interfaces rather than large monolithic facades.
- **GUD-002**: Ensure tree rendering works in “core + binding only” mode without requiring router or validation packages.
- **PAT-001**: Core defines abstract node representation; bindings implement rendering.
- **PAT-002**: Add-ons extend context capabilities by composition, not by modifying core types in-place.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Scaffold `packages/ui-spec/*` workspaces with monorepo-standard build/test/type-check scripts and package export patterns.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create workspace folder structure: `packages/ui-spec/core`, `packages/ui-spec/react`, `packages/ui-spec/router`, `packages/ui-spec/router-react`, `packages/ui-spec/validate-zod` (directories only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |           |      |
| TASK-002 | Create `packages/ui-spec/core/package.json` with: `name: "@ui-spec/core"`, `type: "module"`, `sideEffects: false`, `exports["."]` pointing to `./dist/index.js` and `./dist/index.d.ts`, `files: ["dist"]`, and scripts: `build: "vite build"`, `lint: "eslint ."`, `test: "vitest run"`, `test:coverage: "vitest run --coverage"`, `test:watch: "vitest"`, `type-check: "tsgo --noEmit"`. Add dependencies: `json-p3` (exact version pinned), devDependencies: `@lellimecnar/vite-config` (workspace:^), `@lellimecnar/vitest-config` (workspace:_), `@lellimecnar/eslint-config` (workspace:_), `@lellimecnar/typescript-config` (workspace:\*), `vite`, `vite-plugin-dts`, `vitest`, `@vitest/coverage-v8`, `eslint`, `typescript` (match monorepo patterns). |           |      |
| TASK-003 | Create `packages/ui-spec/core/vite.config.ts` by copying the pattern from `packages/utils/vite.config.ts` and setting `build.lib.entry = "src/index.ts"`, `preserveModules = true`, `preserveModulesRoot = "src"`, and generating d.ts into `dist`. Ensure externals include `json-p3` and all `dependencies` + `peerDependencies`.                                                                                                                                                                                                                                                                                                                                                                                                                              |           |      |
| TASK-004 | Create `packages/ui-spec/core/vitest.config.ts` using `defineConfig(vitestBaseConfig())` from `@lellimecnar/vitest-config` (same pattern as `packages/utils/vitest.config.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |           |      |
| TASK-005 | Create `packages/ui-spec/core/tsconfig.json` extending `@lellimecnar/typescript-config/react.json`, setting `compilerOptions.module = "ESNext"`, `moduleResolution = "Bundler"`, `paths` for `@/*` to `./src/*`, and include `src/**/*.ts`, exclude `dist`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |           |      |
| TASK-006 | Create `packages/ui-spec/react/package.json` with: `name: "@ui-spec/react"`, `type: "module"`, `exports["."]` to `./dist/index.js` + `./dist/index.d.ts`, scripts same as `@ui-spec/core`, dependencies: `@ui-spec/core` as `workspace:*`, peerDependencies: `react` and `react-dom` (align with repo React major), devDependencies: `@types/react` (if required by build), and Vite/Vitest configs matching monorepo patterns.                                                                                                                                                                                                                                                                                                                                  |           |      |
| TASK-007 | Create `packages/ui-spec/react/vite.config.ts`, `packages/ui-spec/react/vitest.config.ts`, `packages/ui-spec/react/tsconfig.json`, and `packages/ui-spec/react/src/index.ts` matching the established patterns used by `packages/utils` and ensuring externalization of `react`, `react-dom`, and `@ui-spec/core`.                                                                                                                                                                                                                                                                                                                                                                                                                                               |           |      |
| TASK-008 | Create skeleton `package.json` + `vite.config.ts` + `vitest.config.ts` + `tsconfig.json` + `src/index.ts` for `@ui-spec/router`, `@ui-spec/router-react`, and `@ui-spec/validate-zod` with dependencies matching the architecture spec: `router` depends on `@ui-spec/core`; `router-react` depends on `@ui-spec/router` and `@ui-spec/react`; `validate-zod` depends on `@ui-spec/core` and `zod` (as dependency or peerDependency; choose one and document rationale in TASK-008 output).                                                                                                                                                                                                                                                                      |           |      |
| TASK-009 | Add `README.md` to each new package folder with: purpose, public API entrypoints, and explicit statement: "JSONPath evaluation uses json-p3" and "Mutations use JSON Patch operations via patch([...])" for core.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |           |      |

### Implementation Phase 2

- GOAL-002: Implement `@ui-spec/core` public interfaces and the json-p3-backed store with RFC 6902 mutation helpers.

| Task     | Description                                                                                                                                                                                                                                                                                                                         | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-010 | Define core public types in `packages/ui-spec/core/src/types.ts`: `JsonPatchOperation` union exactly as specified (add/remove/replace/move/copy/test), `ValidationError`, `ValidationResult`, `ValidationPlugin`, `RouteContext`, `RouterController` (interfaces per spec). Export these from `packages/ui-spec/core/src/index.ts`. |           |      |
| TASK-011 | Define a minimal observable contract in `packages/ui-spec/core/src/observable.ts`: `type Unsubscribe = () => void; type Observable<T> = { subscribe(listener: (value: T) => void): Unsubscribe }`. Export `Observable` from `src/index.ts`.                                                                                         |           |      |
| TASK-012 | Implement JSONPath and JSON Patch integration wrapper in `packages/ui-spec/core/src/jsonp3.ts` with two exported functions:                                                                                                                                                                                                         |

1. `jsonp3FindAll(path: string, doc: unknown): Array<{ value: unknown; pointer: string }>`
2. `jsonp3ApplyPatch(doc: unknown, ops: JsonPatchOperation[]): unknown`
   These MUST call `json-p3` directly. If `json-p3` does not expose the required APIs, throw an Error with message prefix `UI-SPEC_JSONP3_API_MISSING:` listing missing symbol names. This wrapper is the ONLY location in `@ui-spec/core` allowed to import from `json-p3`. | | |
   | TASK-013 | Implement store in `packages/ui-spec/core/src/store.ts` exporting `createUISpecStore(initial: unknown): UISpecStore` with methods:

- `get<T>(path: string): T` (JSONPath read via `jsonp3FindAll`; MUST require exactly one match; throw `UI_SPEC_GET_NO_MATCH:` or `UI_SPEC_GET_MULTI_MATCH:`)
- `select<T>(path: string): Observable<T>` (subscribe to store changes and re-run `get` on each patch; MUST emit immediately on subscribe)
- `patch(operations: JsonPatchOperation[]): void` (apply operations atomically via `jsonp3ApplyPatch`; then notify subscribers)
- `set(path: string, value: unknown): void` (resolve to exactly one pointer via `jsonp3FindAll`; generate `replace` if pointer exists, else `add`; call `patch`)
- `update(path: string, updater: (current: unknown) => unknown): void` (read current with `get`; compute next; delegate to `set`)
- `merge(path: string, partial: Record<string, unknown>): void` (require target is object; generate one `replace` op for the entire object: `{...current, ...partial}`; call `patch`)
- `push(path: string, ...items: unknown[]): void` (require target is array; for each item generate `{ op: 'add', path: `${pointer}/-`, value: item }`; call `patch` once with all ops)
- `remove(path: string, predicate: (item: unknown) => boolean): void` (require target is array; compute indexes to remove; generate `remove` ops in descending index order using pointer `${pointer}/${index}`; call `patch` once)
  All write helpers MUST enforce “exactly one match” targeting and MUST NOT mutate state when ambiguous. | | |
  | TASK-014 | Implement context in `packages/ui-spec/core/src/context.ts` exporting `createUISpecContext(store: UISpecStore, extras?: { route?: unknown; router?: RouterController }): UISpecContext` that delegates `get/patch/set/update` to the store and exposes `route` when provided. Ensure `ctx.navigate` is NOT present in core; routing is provided only by router add-ons. | | |
  | TASK-015 | Implement a schema model in `packages/ui-spec/core/src/schema.ts` with exported minimal types required for the first binding:
- `UISpecSchema` with `$uispec`, `root`, optional `routes`, optional `plugins`.
- `NodeSchema` with `type`, optional `props`, optional `children`, optional `$updated`.
  Export from `src/index.ts`.
  This task MUST also define the minimal runtime node evaluation contract for bindings: `type ResolvedNode = { type: string; props: Record<string, unknown>; children: ResolvedNode[] }`.
  Do NOT implement framework-specific rendering in core. | | |
  | TASK-016 | Implement restricted UIScript hooks in `packages/ui-spec/core/src/uiscript.ts`:
- Define `type FunctionSchema = { $fn: string }`.
- Export `evaluateFunctionSchema(fn: FunctionSchema, ctx: UISpecContext, registry: Record<string, (ctx: UISpecContext, ...args: unknown[]) => unknown>): unknown`.
- The implementation MUST: (1) lookup `registry[fn.$fn]`, (2) call it with provided args, (3) throw `UI_SPEC_UISCRIPT_UNKNOWN_FN:` if missing.
- The implementation MUST NOT use `eval`, `new Function`, or implicit globals.
  Export from `src/index.ts`.
  Add `Policy` object in `packages/ui-spec/core/src/policy.ts` with `allowUIScript: boolean` default false; evaluation MUST throw `UI_SPEC_UISCRIPT_DISABLED:` when false. | | |

### Implementation Phase 3

- GOAL-003: Implement `@ui-spec/react` binding that renders static `root` trees and supports store-backed bindings without requiring router or validation.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                              | Completed         | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---- |
| TASK-017 | In `packages/ui-spec/react/src/provider.tsx`, implement `UISpecProvider` React component that accepts props: `{ schema: UISpecSchema; store: UISpecStore; registry?: Record<string, (ctx: UISpecContext, ...args: unknown[]) => unknown> }` and provides a React context containing `schema`, `store`, and a memoized `ctx` created via `createUISpecContext(store)`. Export from `packages/ui-spec/react/src/index.ts`. |                   |      |
| TASK-018 | In `packages/ui-spec/react/src/render.tsx`, implement `renderNode(node: NodeSchema): React.ReactElement                                                                                                                                                                                                                                                                                                                  | null` with rules: |

1. If `node.type` is a string matching an HTML intrinsic element name, render via `React.createElement(node.type, props, ...children)`.
2. If `node.props` contains any string value starting with `$.` (JSONPath), resolve it by calling `store.get(path)` at render time.
3. For reactive updates, implement `useUISpecValue(path: string)` using `useSyncExternalStore` and `store.select(path)`.
4. Children rendering: if `node.children` is omitted, use empty array; if present, recursively render.
   This MUST work without router installed when schema omits `routes`. | | |
   | TASK-019 | In `packages/ui-spec/react/src/index.ts`, export `UISpecProvider`, `renderNode`, and `useUISpecValue` as the complete public API for `@ui-spec/react` MVP. Do NOT export internal contexts directly; export only hooks/components. | | |
   | TASK-020 | Implement required error behavior for routing absence (core requirement): in `packages/ui-spec/react/src/router-guards.ts`, export `assertNoRoutesWithoutRouter(schema: UISpecSchema): void` that throws `UI_SPEC_ROUTER_NOT_INSTALLED:` when `schema.routes` is present. Call it from `UISpecProvider` during initialization. | | |

### Implementation Phase 4

- GOAL-004: Implement optional router and validation adapter packages as separate, non-required layers.

| Task     | Description                                                            | Completed | Date |
| -------- | ---------------------------------------------------------------------- | --------- | ---- |
| TASK-021 | Implement `@ui-spec/router` in `packages/ui-spec/router/src/index.ts`: |

- Export `type RouteContext` and `interface RouterController` by re-exporting from `@ui-spec/core`.
- Export `createRouterController(initialPath: string): RouterController` with methods: `getRoute()`, `navigate(to)`, `replace(to)`, `back()`.
- For MVP, implement an in-memory controller storing current path and query parsing; no framework integration here. | | |
  | TASK-022 | Implement `@ui-spec/router-react` in `packages/ui-spec/router-react/src/index.tsx`:
- Export `UISpecRouterProvider` which takes a `router: RouterController` and augments the `UISpecContext` provided by `UISpecProvider` by creating `createUISpecContext(store, { route: router.getRoute(), router })`.
- Provide `useRoute()` hook that returns `router.getRoute()` and subscribes to router changes using a minimal subscription API on the controller (add `subscribe(listener)` to controller if required; if added, update interface in `@ui-spec/core/src/types.ts` and re-export). | | |
  | TASK-023 | Implement `@ui-spec/validate-zod` in `packages/ui-spec/validate-zod/src/index.ts`:
- Export `createZodValidationPlugin(name: string, schema: unknown): ValidationPlugin`.
- The plugin MUST implement `validate(data)` returning `ValidationResult` and `getFieldErrors(result)` returning `Map<string, string[]>`.
- Ensure no arbitrary code execution; Zod validation only. | | |

## 3. Alternatives

- **ALT-001**: Use an existing reactive library (RxJS) for `select()` observables.
  - Not chosen for MVP to keep core dependency surface minimal; a minimal `Observable` contract is sufficient.
- **ALT-002**: Implement JSONPath evaluation with a different engine (e.g., internal jsonpath packages).
  - Not chosen because UI-Spec requirements mandate `json-p3` and forbid parallel engines.
- **ALT-003**: Implement UIScript using `eval`/`new Function`.
  - Not chosen due to explicit security requirements; only host-provided registry invocation is permitted.

## 4. Dependencies

- **DEP-001**: `json-p3` (npm) pinned to an exact version in `packages/ui-spec/core/package.json`.
- **DEP-002**: Monorepo build/test tooling: `vite`, `vite-plugin-dts`, `vitest`, `@vitest/coverage-v8`, and workspace configs: `@lellimecnar/vite-config`, `@lellimecnar/vitest-config`, `@lellimecnar/typescript-config`, `@lellimecnar/eslint-config`.
- **DEP-003**: React runtime for binding: `react`, `react-dom` as peer dependencies in `@ui-spec/react`.
- **DEP-004**: `zod` for `@ui-spec/validate-zod` (dependency or peerDependency; decision recorded in TASK-008).

## 5. Files

- **FILE-001**: `packages/ui-spec/core/package.json`
- **FILE-002**: `packages/ui-spec/core/vite.config.ts`
- **FILE-003**: `packages/ui-spec/core/vitest.config.ts`
- **FILE-004**: `packages/ui-spec/core/tsconfig.json`
- **FILE-005**: `packages/ui-spec/core/src/index.ts`
- **FILE-006**: `packages/ui-spec/core/src/types.ts`
- **FILE-007**: `packages/ui-spec/core/src/observable.ts`
- **FILE-008**: `packages/ui-spec/core/src/jsonp3.ts`
- **FILE-009**: `packages/ui-spec/core/src/store.ts`
- **FILE-010**: `packages/ui-spec/core/src/context.ts`
- **FILE-011**: `packages/ui-spec/core/src/schema.ts`
- **FILE-012**: `packages/ui-spec/core/src/uiscript.ts`
- **FILE-013**: `packages/ui-spec/core/src/policy.ts`
- **FILE-014**: `packages/ui-spec/react/package.json`
- **FILE-015**: `packages/ui-spec/react/src/provider.tsx`
- **FILE-016**: `packages/ui-spec/react/src/render.tsx`
- **FILE-017**: `packages/ui-spec/react/src/index.ts`
- **FILE-018**: `packages/ui-spec/react/src/router-guards.ts`
- **FILE-019**: `packages/ui-spec/router/src/index.ts`
- **FILE-020**: `packages/ui-spec/router-react/src/index.tsx`
- **FILE-021**: `packages/ui-spec/validate-zod/src/index.ts`

## 6. Testing

- **TEST-001**: `packages/ui-spec/core/src/store.spec.ts` validates:
  - `get()` uses JSONPath and requires exactly one match.
  - `set/update/merge/push/remove` generate JSON Patch operations and apply them via `patch([...])`.
  - Zero-match and multi-match write targets throw and do not mutate.
- **TEST-002**: `packages/ui-spec/core/src/jsonp3.spec.ts` validates wrapper behavior:
  - Wrapper throws `UI-SPEC_JSONP3_API_MISSING:` when required APIs are absent.
  - Wrapper returns pointer strings for matches and applies RFC 6902 operations.
- **TEST-003**: `packages/ui-spec/core/src/uiscript.spec.ts` validates:
  - UIScript disabled by default; enabling policy allows registry calls.
  - Unknown function throws `UI_SPEC_UISCRIPT_UNKNOWN_FN:`.
- **TEST-004**: `packages/ui-spec/react/src/render.spec.tsx` validates:
  - Static `root` rendering works with only core + react.
  - JSONPath-bound props resolve and update via store patches.
- **TEST-005**: `packages/ui-spec/react/src/router-guards.spec.ts` validates:
  - Presence of `schema.routes` throws `UI_SPEC_ROUTER_NOT_INSTALLED:` when router is not installed.

## 7. Risks & Assumptions

- **RISK-001**: `json-p3` API surface may differ from required wrapper contract.
- **RISK-002**: JSONPath match metadata may not include JSON Pointer output; computing pointers may require additional mapping logic.
- **ASSUMPTION-001**: `json-p3` can provide (directly or via match metadata) a stable way to convert a JSONPath match into a JSON Pointer string usable in RFC 6902 operations.
- **ASSUMPTION-002**: Core can implement a minimal `Observable` contract without adopting RxJS while still meeting project needs.

## 8. Related Specifications / Further Reading

- `spec/spec-architecture-ui-spec-packages.md`
- `spec/design-ui-spec-json-p3.md`
- `specs/ui-spec.md`
