---
goal: Implement @ui-spec/core MVP with json-p3-backed JSONPath reads and RFC 6902 JSON Patch mutations
version: 1.0
date_created: 2026-01-01
last_updated: 2026-01-01
owner: @lellimecnar
status: 'Planned'
tags: [architecture, ui-spec, core, jsonpath, jsonpatch, mvp]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines a minimal, self-contained implementation of `@ui-spec/core` only. It delivers the core store + context APIs required by UI-Spec, enforcing JSONPath reads via `json-p3` and all state changes via RFC 6902 JSON Patch applied through `patch(operations)`. No framework bindings, router packages, validation adapters, or UI libraries are included in scope.

## 1. Requirements & Constraints

- **REQ-001**: `@ui-spec/core` SHALL have a single primary responsibility: framework-agnostic core runtime primitives (store, context, schema types, UIScript policy/registry execution).
- **CON-001**: `@ui-spec/core` SHALL NOT depend on any framework binding package.
- **REQ-002**: All JSONPath evaluation in `@ui-spec/core` SHALL be implemented using `json-p3`.
- **CON-002**: `@ui-spec/core` SHALL NOT implement a second JSONPath engine in parallel with `json-p3`.
- **REQ-003**: All mutations to the store document SHALL be performed by applying JSON Patch operations (RFC 6902).
- **REQ-004**: The store SHALL expose `patch(operations)` and apply operations atomically.
- **REQ-005**: Convenience write helpers (`set`, `update`, `merge`, `push`, `remove`) SHALL be implemented by generating JSON Patch operations and delegating to `patch(operations)`.
- **REQ-006**: When a write helper receives a JSONPath target, it SHALL resolve the JSONPath against the current store document and require exactly one match.
- **REQ-007**: If a write helper resolves to zero matches, it SHALL throw a descriptive error and SHALL NOT mutate state.
- **REQ-008**: If a write helper resolves to more than one match, it SHALL throw a descriptive error and SHALL NOT mutate state.
- **SEC-001**: UIScript evaluation SHALL execute in a restricted environment with an explicit context object; MUST NOT use `eval`/`new Function`.
- **SEC-002**: Schema and UIScript inputs SHALL be treated as untrusted by default; dynamic execution features MUST be gated behind explicit policy.
- **GUD-001**: Public API surface MUST be minimal; internal utilities MUST NOT be exported.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Scaffold `@ui-spec/core` package using monorepo-standard build, type-check, lint, and test conventions.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create directory structure: `packages/ui-spec/core/src` and `packages/ui-spec/core` config files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |           |      |
| TASK-002 | Create `packages/ui-spec/core/package.json` with: `name: "@ui-spec/core"`, `type: "module"`, `sideEffects: false`, `exports["."]` pointing to `./dist/index.js` and `./dist/index.d.ts`, `files: ["dist"]`, and scripts: `build: "vite build"`, `lint: "eslint ."`, `test: "vitest run"`, `test:coverage: "vitest run --coverage"`, `test:watch: "vitest"`, `type-check: "tsgo --noEmit"`. Add dependency: `json-p3` pinned to an exact version. Add devDependencies to match existing package patterns (`@lellimecnar/vite-config` workspace:^, `@lellimecnar/vitest-config` workspace:_, `@lellimecnar/eslint-config` workspace:_, `@lellimecnar/typescript-config` workspace:\*, plus `vite`, `vite-plugin-dts`, `vitest`, `@vitest/coverage-v8`, `eslint`, `typescript`). |           |      |
| TASK-003 | Create `packages/ui-spec/core/vite.config.ts` by copying the established library build pattern from `packages/utils/vite.config.ts` and setting: `build.lib.entry = "src/index.ts"`, `build.formats = ['es']`, `preserveModules = true`, `preserveModulesRoot = 'src'`, d.ts emitted to `dist`, externals include `json-p3` and all deps/peerDeps.                                                                                                                                                                                                                                                                                                                                                                                                                            |           |      |
| TASK-004 | Create `packages/ui-spec/core/vitest.config.ts` using `defineConfig(vitestBaseConfig())` from `@lellimecnar/vitest-config`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |           |      |
| TASK-005 | Create `packages/ui-spec/core/tsconfig.json` extending `@lellimecnar/typescript-config/react.json` with `module: "ESNext"`, `moduleResolution: "Bundler"`, `paths` mapping `@/*` to `./src/*`, include `src/**/*.ts`, exclude `dist`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |           |      |
| TASK-006 | Create `packages/ui-spec/core/README.md` describing purpose, public API entrypoints, and explicit invariants: "JSONPath reads use json-p3" and "mutations occur only via RFC 6902 JSON Patch through patch([...])".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |           |      |

### Implementation Phase 2

- GOAL-002: Implement core public types and a json-p3-backed store with strict “exactly one match” targeting.

| Task     | Description                                                                                      | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-007 | Add `packages/ui-spec/core/src/types.ts` defining and exporting exactly these minimum contracts: |

1. `JsonPatchOperation` union: `add/remove/replace/move/copy/test`.
2. `interface UISpecStore { get; select; patch; set; update; merge; push; remove }` with signatures matching `spec/design-ui-spec-json-p3.md`.
3. `interface UISpecContext { get; patch; set; update; route?: unknown }`.
4. `type ValidationError`, `type ValidationResult`, `interface ValidationPlugin` (for downstream packages; no implementation required).
5. `type RouteContext` and `interface RouterController` (for downstream packages; no implementation required).
   Export all from `packages/ui-spec/core/src/index.ts`. | | |
   | TASK-008 | Add `packages/ui-spec/core/src/observable.ts` defining a minimal observable: `type Observable<T> = { subscribe(listener: (value: T) => void): () => void }`. Export from `src/index.ts`. | | |
   | TASK-009 | Add `packages/ui-spec/core/src/jsonp3.ts` as the only module allowed to import from `json-p3`. Implement two exports:
6. `jsonp3FindAll(path: string, doc: unknown): Array<{ value: unknown; pointer: string }>`
7. `jsonp3ApplyPatch(doc: unknown, ops: JsonPatchOperation[]): unknown`
   If required `json-p3` symbols are not available, throw `Error` with prefix `UI-SPEC_JSONP3_API_MISSING:` listing missing symbols. | | |
   | TASK-010 | Add `packages/ui-spec/core/src/store.ts` exporting `createUISpecStore(initial: unknown): UISpecStore`.
   Implementation rules:

- `get(path)` MUST use `jsonp3FindAll` and require exactly one match; throw `UI_SPEC_GET_NO_MATCH:` or `UI_SPEC_GET_MULTI_MATCH:`.
- `select(path)` MUST return an `Observable` that emits immediately and re-emits after any `patch([...])`.
- `patch(operations)` MUST apply ops atomically using `jsonp3ApplyPatch`, then notify subscribers.
- `set/update/merge/push/remove` MUST generate JSON Patch ops and delegate to `patch([...])`.
- All write helpers MUST enforce “exactly one match” targeting and MUST not mutate state on error.
  Error prefixes for writes MUST include: `UI_SPEC_WRITE_NO_MATCH:`, `UI_SPEC_WRITE_MULTI_MATCH:`, `UI_SPEC_PUSH_TARGET_NOT_ARRAY:`, `UI_SPEC_REMOVE_TARGET_NOT_ARRAY:`, `UI_SPEC_MERGE_TARGET_NOT_OBJECT:`.
  Performance constraint: `push` and `remove` MUST batch into a single `patch([...])` call. | | |
  | TASK-011 | Add `packages/ui-spec/core/src/context.ts` exporting `createUISpecContext(store: UISpecStore, extras?: { route?: unknown }): UISpecContext` delegating methods to the store and exposing `route` when provided. | | |

### Implementation Phase 3

- GOAL-003: Implement minimal schema + restricted UIScript execution with explicit policy gating.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                              | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-012 | Add `packages/ui-spec/core/src/schema.ts` defining minimum types required for consumers: `UISpecSchema` (with `$uispec`, `root`, optional `routes`, optional `plugins`) and `NodeSchema` (with `type`, optional `props`, optional `children`, optional `$updated`). Also export `ResolvedNode` (framework-agnostic evaluated node contract). Export from `src/index.ts`. |           |      |
| TASK-013 | Add `packages/ui-spec/core/src/policy.ts` exporting `type UISpecPolicy = { allowUIScript: boolean }` and `const defaultPolicy: UISpecPolicy = { allowUIScript: false }`.                                                                                                                                                                                                 |           |      |
| TASK-014 | Add `packages/ui-spec/core/src/uiscript.ts` implementing registry-only UIScript evaluation:                                                                                                                                                                                                                                                                              |

- Define `type FunctionSchema = { $fn: string }`.
- Export `evaluateFunctionSchema(fn: FunctionSchema, ctx: UISpecContext, registry: Record<string, (ctx: UISpecContext, ...args: unknown[]) => unknown>, policy?: UISpecPolicy): unknown`.
- MUST throw `UI_SPEC_UISCRIPT_DISABLED:` when `policy.allowUIScript` is false.
- MUST throw `UI_SPEC_UISCRIPT_UNKNOWN_FN:` when the registry key is missing.
- MUST NOT use `eval` or `new Function`.
  Export from `src/index.ts`. | | |
  | TASK-015 | Add `packages/ui-spec/core/src/index.ts` as the only public entrypoint, exporting: types, `createUISpecStore`, `createUISpecContext`, schema types, `evaluateFunctionSchema`, and policy types/values. | | |

### Implementation Phase 4

- GOAL-004: Add automated tests covering all acceptance criteria implied by the json-p3 and mutation design specs.

| Task     | Description                                                                                                                                                                                                       | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-016 | Add `packages/ui-spec/core/src/store.spec.ts` validating: `get` exactly-one-match semantics, `set/update/merge/push/remove` delegate to `patch([...])`, and write-target errors do not mutate state.              |           |      |
| TASK-017 | Add `packages/ui-spec/core/src/jsonp3.spec.ts` validating wrapper behavior: throws `UI-SPEC_JSONP3_API_MISSING:` when symbols missing and applies RFC 6902 patch semantics when available.                        |           |      |
| TASK-018 | Add `packages/ui-spec/core/src/uiscript.spec.ts` validating: disabled-by-default, enabled registry call path, unknown function error.                                                                             |           |      |
| TASK-019 | Add `packages/ui-spec/core/src/select.spec.ts` validating `select(path)` emits immediately and re-emits after patches.                                                                                            |           |      |
| TASK-020 | Run monorepo tests for this package via turborepo filter: `pnpm --filter @ui-spec/core test` and `pnpm --filter @ui-spec/core type-check`. Record results in a changelog entry (if required by repo conventions). |           |      |

## 3. Alternatives

- **ALT-001**: Use existing internal JSONPath tooling from `packages/jsonpath/*` instead of `json-p3`.
  - Not chosen because the UI-Spec design mandates `json-p3` and forbids parallel JSONPath engines.
- **ALT-002**: Use RxJS for `select()`.
  - Not chosen for MVP; a minimal observable contract keeps dependencies minimal.
- **ALT-003**: Implement UIScript using `eval`/`new Function`.
  - Not chosen due to security requirements; only host-provided registry calls are permitted.

## 4. Dependencies

- **DEP-001**: `json-p3` (npm) pinned to an exact version in `packages/ui-spec/core/package.json`.
- **DEP-002**: Workspace build tooling: `vite`, `vite-plugin-dts`.
- **DEP-003**: Workspace test tooling: `vitest`, `@vitest/coverage-v8`, and `@lellimecnar/vitest-config`.
- **DEP-004**: Workspace TypeScript tooling: `tsgo` and `@lellimecnar/typescript-config`.

## 5. Files

- **FILE-001**: `packages/ui-spec/core/package.json`
- **FILE-002**: `packages/ui-spec/core/vite.config.ts`
- **FILE-003**: `packages/ui-spec/core/vitest.config.ts`
- **FILE-004**: `packages/ui-spec/core/tsconfig.json`
- **FILE-005**: `packages/ui-spec/core/README.md`
- **FILE-006**: `packages/ui-spec/core/src/index.ts`
- **FILE-007**: `packages/ui-spec/core/src/types.ts`
- **FILE-008**: `packages/ui-spec/core/src/observable.ts`
- **FILE-009**: `packages/ui-spec/core/src/jsonp3.ts`
- **FILE-010**: `packages/ui-spec/core/src/store.ts`
- **FILE-011**: `packages/ui-spec/core/src/context.ts`
- **FILE-012**: `packages/ui-spec/core/src/schema.ts`
- **FILE-013**: `packages/ui-spec/core/src/policy.ts`
- **FILE-014**: `packages/ui-spec/core/src/uiscript.ts`
- **FILE-015**: `packages/ui-spec/core/src/store.spec.ts`
- **FILE-016**: `packages/ui-spec/core/src/jsonp3.spec.ts`
- **FILE-017**: `packages/ui-spec/core/src/uiscript.spec.ts`
- **FILE-018**: `packages/ui-spec/core/src/select.spec.ts`

## 6. Testing

- **TEST-001**: Store read semantics: JSONPath evaluation via `json-p3`, exactly-one-match enforcement.
- **TEST-002**: Mutation semantics: all changes applied only via `patch([...])` with RFC 6902 operations.
- **TEST-003**: Write-target errors: zero matches and multi matches throw and do not mutate.
- **TEST-004**: Batch mutation semantics: `push` and `remove` apply via single `patch([...])` call.
- **TEST-005**: UIScript security: disabled by default; registry-only evaluation; no dynamic code execution.

## 7. Risks & Assumptions

- **RISK-001**: `json-p3` may not expose match metadata that maps directly to JSON Pointer strings.
- **RISK-002**: `json-p3` patch application semantics may differ from strict RFC 6902 expectations.
- **ASSUMPTION-001**: `json-p3` can (directly or indirectly) provide JSON Pointer-compatible locations for JSONPath matches.
- **ASSUMPTION-002**: Consumers will implement framework bindings separately; core does not need to render UI.

## 8. Related Specifications / Further Reading

- `spec/spec-architecture-ui-spec-packages.md`
- `spec/design-ui-spec-json-p3.md`
- `specs/ui-spec.md`
