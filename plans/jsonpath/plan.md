## @jsonpath/\* — Implementation Plan (Spec-Driven, Repo-Conformant)

**Branch:** `jsonpath`  
**PR shape:** one PR with many small, independently-verifiable commits  
**Scope:** implement all `@jsonpath/*` packages described in [specs/jsonpath.md](../../specs/jsonpath.md) under `packages/jsonpath/*`.

### Goal

Deliver a standards-first JSONPath ecosystem that is RFC 9535 compliant by default, secure-by-design (no `eval` / no `new Function`), tree-shakeable, TypeScript-native, and validated by comprehensive unit + compliance tests.

### Repo conventions to follow (observed in existing packages)

- **Build:** Vite library builds, ESM-only, `dist/**` output, `preserveModules`, `vite-plugin-dts`, shared config via `@lellimecnar/vite-config/*`.
- **Tests:** per-package `vitest.config.ts` using `@lellimecnar/vitest-config` (Node by default), scripts pattern `test` / `test:coverage` / `test:watch`.
- **Type-check:** `tsgo --noEmit` (or `tsgo -p tsconfig.json --noEmit`).
- **Exports:** `type: module`, `exports` map with `{ types, default }`, `main`, `types`, `files: ["dist"]`, `sideEffects: false`.
- **CLI packaging:** follow the [packages/ui-spec/cli](../../packages/ui-spec/cli/package.json) approach: `bin` points at `./dist/bin/<name>.js`, and `postbuild` copies a simple `bin/` shim into `dist/bin/`.

---

## Commit plan (one commit per section)

### Commit 01 — Monorepo wiring + scaffold all `@jsonpath/*` packages

**Files**

- Repo-level
  - [pnpm-workspace.yaml](../../pnpm-workspace.yaml)
  - [package.json](../../package.json) (workspace globs)
  - [vitest.config.ts](../../vitest.config.ts)
- New workspaces (scaffold each)
  - `packages/jsonpath/core/*`
  - `packages/jsonpath/extensions/*`
  - `packages/jsonpath/legacy/*`
  - `packages/jsonpath/mutate/*`
  - `packages/jsonpath/pointer/*`
  - `packages/jsonpath/patch/*`
  - `packages/jsonpath/cli/*`
  - `packages/jsonpath/wasm/*`
  - `packages/jsonpath/complete/*`

**What**

- Add `packages/jsonpath/*` to pnpm workspace globs and to root `package.json` `workspaces` (repo currently lists only one-level `packages/*`).
- Update root Vitest projects to include `packages/jsonpath/*/vitest.config.ts` (root config currently misses that glob).
- Scaffold each package with:
  - `package.json` matching `packages/polymix` + `packages/utils` conventions (ESM-only, exports map, scripts, `files: ["dist"]`).
    - Prefer **granular exports** (subpath exports) to preserve tree-shaking and keep browser bundles small. Avoid barrel imports in examples and internal docs.
    - Provide multiple subpaths for anything that is reasonably useful standalone or for composition (e.g. `@jsonpath/core/parse`, `@jsonpath/core/security`, `@jsonpath/core/functions`, `@jsonpath/core/compliance`, `@jsonpath/core/stream`, `@jsonpath/core/secure-eval`).
  - Set `publishConfig.access: "public"` for all `@jsonpath/*` packages.
  - `tsconfig.json` extending `@lellimecnar/typescript-config` (set `rootDir: src`, `outDir: dist`).
  - `vite.config.ts` using `viteNodeConfig()` + `preserveModulesRoot: 'src'` + `vite-plugin-dts`.
  - `vitest.config.ts` using `vitestBaseConfig()` with `include: ['src/**/*.spec.ts']` and `exclude: ['dist/**']`.
  - Minimal `src/index.ts` and at least one smoke `src/*.spec.ts` per package.
- Dependency graph (workspace deps only):
  - `@jsonpath/extensions` depends on `@jsonpath/core`
  - `@jsonpath/legacy` depends on `@jsonpath/core`
  - `@jsonpath/mutate` depends on `@jsonpath/core`
  - `@jsonpath/pointer` standalone
  - `@jsonpath/patch` depends on `@jsonpath/pointer` (and optionally `@jsonpath/core` only for `applyWithJSONPath`)
  - `@jsonpath/cli` depends on `@jsonpath/complete` (or `core` + others; decide in later commit)
  - `@jsonpath/complete` depends on `core/extensions/legacy/mutate/pointer/patch`
  - `@jsonpath/wasm` depends on `@jsonpath/core` (interface-level)

**Testing**

- `pnpm -w lint`
- `pnpm -w build`
- `pnpm -w test`

---

### Commit 02 — `@jsonpath/core`: public types + error hierarchy + options contract

**Files**

- `packages/jsonpath/core/src/{index.ts,types.ts,options.ts,errors.ts}`
- `packages/jsonpath/core/src/*.spec.ts`

**What**

- Define the public surface described in the spec:
  - `QueryOptions`, `CompileOptions` (include `strict`, `maxDepth`, `maxResults`, `timeout`, `cache`, `mode`, `extensions`, `functions`).
  - `NormalizedPath`, `Node<T>`, `CompiledPath<T>`.
  - Error classes: `JSONPathError`, `JSONPathSyntaxError`, `JSONPathRuntimeError`, `JSONPathSecurityError`, `JSONPathTimeoutError`.
- Ensure errors carry safe metadata (`code`, `message`, `position`, etc.) without retaining whole input JSON.

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 03 — `@jsonpath/core`: security primitives (sandbox + guards + CSP/security modes)

**Files**

- `packages/jsonpath/core/src/security/{Sandbox.ts,levels.ts,guards.ts,index.ts}`
- `packages/jsonpath/core/src/security/*.spec.ts`

**What**

- Implement the security model scaffolding from spec §7:
  - `Sandbox` with configurable limits (max execution time, iterations, recursion depth) and blocked patterns list.
  - Prototype-pollution guardrails: hard-block `__proto__`, `constructor`, `prototype` at traversal and at mutation-path resolution.
  - `SecurityLevel` and `CSPMode` enums; default to strict.
- Make “no dynamic code generation” a non-negotiable invariant (no `eval`, no `new Function`).
  - Any feature that must execute a JavaScript string (legacy/CLI) SHALL do so via **a single, shared SES wrapper located in `@jsonpath/core`** (using SES `Compartment`, npm `ses`), not via direct dynamic code generation.
  - The wrapper API SHALL be a normal runtime export under a subpath (e.g. `@jsonpath/core/secure-eval`).
    - Default `@jsonpath/core` APIs should not import it unless the caller explicitly opts into a legacy/CLI path that requires it.

**Testing**

- `pnpm --filter @jsonpath/core test`
- `pnpm --filter @jsonpath/core test:coverage`

---

### Commit 04 — `@jsonpath/core`: RFC 9535 lexer/parser → AST with precise diagnostics

**Files**

- `packages/jsonpath/core/src/parse/{tokenize.ts,parser.ts,ast.ts,index.ts}`
- `packages/jsonpath/core/src/parse/*.spec.ts`

**What**

- Parse RFC 9535 JSONPath into a stable AST with source positions.
- Produce `JSONPathSyntaxError` for invalid input with `{ position, found, expected }`-style metadata.

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 05 — `@jsonpath/core`: evaluator core (selectors, traversal, nodes/paths)

**Files**

- `packages/jsonpath/core/src/eval/{evaluate.ts,walk.ts,selectors/*}`
- `packages/jsonpath/core/src/{nodes.ts,paths.ts}`
- `packages/jsonpath/core/src/eval/*.spec.ts`

**What**

- Implement safe traversal semantics for objects/arrays and normalized path tracking.
- Implement `nodes()` and `paths()` output shapes per spec.

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 06 — `@jsonpath/core`: filters + operators (no JS execution)

**Files**

- `packages/jsonpath/core/src/filter/{expression.ts,operators.ts,evalFilter.ts}`
- `packages/jsonpath/core/src/filter/*.spec.ts`

**What**

- Implement filter evaluation with RFC 9535 operators and correct precedence.
- Ensure filter evaluation always runs under Sandbox limits and cannot bypass guards.

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 07 — `@jsonpath/extensions`: optional functions + FunctionRegistry typings + I-Regexp

**Files**

- `packages/jsonpath/extensions/src/functions/{defineFunction.ts,registry.ts,builtins.ts}`
- `packages/jsonpath/extensions/src/iregexp/{index.ts,validate.ts,fromRegExp.ts}`
- `packages/jsonpath/extensions/src/**/*.spec.ts`

**What**

- Move function/expression evaluation out of `@jsonpath/core`.
- Provide an optional functions layer in `@jsonpath/extensions`:
  - built-ins: `length`, `count`, `match`, `search`, `value`
  - `defineFunction` and `registerFunctions` APIs (supports declaration merging)
  - I-Regexp validation/conversion utilities
- Core remains standards-first and does not depend on or execute function/expression evaluation.

**Testing**

- `pnpm --filter @jsonpath/extensions test`

---

### Commit 08 — `@jsonpath/core`: primary API (`query/compile/first/exists/count/nodes/paths`)

**Files**

- `packages/jsonpath/core/src/{engine.ts,createEngine.ts,compile.ts,cache.ts,index.ts}`
- `packages/jsonpath/core/src/api/*.spec.ts`

**What**

- Implement:
  - `query<T>()`, `compile<T>()`, `nodes<T>()`, `paths()`, `first<T>()`, `exists()`, `count()`.
  - `createEngine({ extensions, functions, grammar, cache, security, csp, audit, accelerator })`.
- Add early termination for `first/exists/count`.

**Note**

- The `functions` option exists for compatibility/extension wiring, but function/expression evaluation is provided by optional extensions (not by core).

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 09 — `@jsonpath/core`: `validate()` + `sanitize()` for untrusted paths

**Files**

- `packages/jsonpath/core/src/{validate.ts,sanitize.ts}`
- `packages/jsonpath/core/src/{validate.spec.ts,sanitize.spec.ts}`

**What**

- `validate(path)` returns `{ valid, errors[] }` without throwing.
- `sanitize(userPath, policy)` with policy knobs from spec §7.4 (e.g. disable recursion, disable filters, maxLength, allowedSegments).

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 10 — `@jsonpath/core`: audit logging hooks

**Files**

- `packages/jsonpath/core/src/audit/{AuditLogger.ts,events.ts}`
- `packages/jsonpath/core/src/audit/*.spec.ts`

**What**

- Implement opt-in audit hooks per spec §7.5.
- Redact sensitive data by default (no payload dumps).

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 11 — `@jsonpath/core`: performance features (cache, lazyQuery, multiQuery, createQuerySet)

**Files**

- `packages/jsonpath/core/src/perf/{createCache.ts,lazyQuery.ts,multiQuery.ts,querySet.ts}`
- `packages/jsonpath/core/src/perf/*.spec.ts`

**What**

- Implement compilation caching and bounded query cache.
- Implement `lazyQuery()` and multi-query APIs (`multiQuery`, `createQuerySet`).
- Cross-check correctness against `query()` baseline.

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 12 — `@jsonpath/core`: compliance harness (runSuite/verify) + curated fixtures

**Files**

- `packages/jsonpath/core/src/compliance/{index.ts,runSuite.ts,verify.ts}`
- `packages/jsonpath/core/src/compliance/fixtures/*`
- `packages/jsonpath/core/src/compliance/*.spec.ts`

**What**

- Provide `compliance.runSuite()` and `compliance.verify()` per spec §3.5.
- Add a small in-repo fixture set (smoke corpus).
- Integrate the official RFC 9535 compliance suite from https://github.com/jsonpath-standard/jsonpath-compliance-test-suite as **test-only** input:
  - add it as a `devDependency` via a git URL pinned to a commit SHA (that repo has no tags)
  - ensure it is never imported from runtime entrypoints and never shipped in published artifacts.

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 13 — `@jsonpath/core`: benchmarking + profiling utilities

**Files**

- `packages/jsonpath/core/src/benchmark/{benchmark.ts,profile.ts,stats.ts}`
- `packages/jsonpath/core/src/benchmark/*.spec.ts`

**What**

- Add `benchmark()` and `profile()` utilities per spec §8.6.
- Ensure they are deterministic enough for tests (avoid flaky timing assertions; assert shape and basic invariants).

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 14 — `@jsonpath/extensions`: optional extension pack (selectors/operators/bundles)

**Files**

- `packages/jsonpath/core/src/extension/{types.ts,defineSelector.ts,defineOperator.ts,extendGrammar.ts}`
- `packages/jsonpath/extensions/src/{index.ts,selectors/*,operators/*,functions/*,bundles/*}`

**What**

- Implement the Extension interface + lifecycle hooks per spec §4.
- Implement and export the official extension groups (spec §4.7):
  - selectors: `parentSelector (^), propertyNameSelector (~), rootParentSelector (^^)`
  - type selectors: `@string(), @number(), ...`
  - function bundles (optional / non-core): string/math/array/object/date
  - operator bundles: regex operators (`=~`, `!~`), contains operators (`in`, `contains`, etc.)
  - bundles: `jsonpathPlusCompat`, `fullExtensions`

**Testing**

- `pnpm --filter @jsonpath/extensions test`
- `pnpm --filter @jsonpath/core test` (smoke that core works without extensions)

---

### Commit 15 — `@jsonpath/legacy`: compatibility modes + adapters + normalization/convert

**Files**

- `packages/jsonpath/legacy/src/{index.ts,legacyMode.ts,normalize.ts,convert.ts}`
- `packages/jsonpath/legacy/src/adapters/{jsonpath.ts,jsonpath-plus.ts,json-p3.ts}`
- `packages/jsonpath/legacy/package.json` (exports map for subpaths)

**What**

- Implement mode handling per spec §5:
  - `mode: 'auto' | 'goessner' | 'jsonpath-plus'`.
- Provide adapter entrypoints matching spec examples:
  - `@jsonpath/legacy/jsonpath`
  - `@jsonpath/legacy/jsonpath-plus`
  - `@jsonpath/legacy/json-p3`
- Implement syntax normalization + conversion (at minimum: normalization to RFC 9535 and conversion back to goessner where required).
- Where legacy modes require evaluating script-like expressions, execute them using the SES `Compartment` API (npm `ses`) instead of `eval`/`new Function`.
  - Route all script-like evaluation through the shared `@jsonpath/core` SES wrapper.
  - Provide zero/strict endowments by default.
  - Enforce budgets/timeouts by running expression evaluation in a worker/isolated execution context and aborting on timeout.

**Testing**

- `pnpm --filter @jsonpath/legacy test`

---

### Commit 16 — `@jsonpath/mutate`: mutable + immutable + batch/transaction + MutationSelector

**Files**

- `packages/jsonpath/mutate/src/{index.ts,mutate.ts,immutable.ts,batch.ts,MutationSelector.ts,ops/*}`
- `packages/jsonpath/mutate/src/*.spec.ts`

**What**

- Implement spec §6:
  - mutable ops: `set`, `update`, `delete`, `insert`, `rename`
  - immutable variants with structural sharing
  - batch builder + beginTransaction/commit/rollback
  - `MutationSelector` with chaining (e.g. `.filter().update().apply()`)
- Reuse `@jsonpath/core` path resolution and apply prototype-pollution guards.

**Testing**

- `pnpm --filter @jsonpath/mutate test`

---

### Commit 17 — `@jsonpath/pointer`: RFC 6901 + compile + JSONPath conversion

**Files**

- `packages/jsonpath/pointer/src/{index.ts,pointer.ts,escape.ts,compile.ts,convert.ts}`
- `packages/jsonpath/pointer/src/*.spec.ts`

**What**

- Implement pointer helpers per spec §11.1:
  - `get`, `set`, `has`, `remove`
  - `compile(pointer)` returning `{ get, set, has }`-style API
  - `toJSONPath(pointer)` and `fromJSONPath(jsonpath)` conversions

**Testing**

- `pnpm --filter @jsonpath/pointer test`

---

### Commit 18 — `@jsonpath/patch`: RFC 6902 apply/validate + diff + applyWithJSONPath

**Files**

- `packages/jsonpath/patch/src/{index.ts,apply.ts,validate.ts,diff.ts}`
- `packages/jsonpath/patch/src/ops/*`
- `packages/jsonpath/patch/src/*.spec.ts`

**What**

- Implement patch operations per spec §11.2:
  - `patch.apply(data, ops)`
  - `diff(original, modified)`
  - `applyWithJSONPath(data, opsWithJsonpath)` (integrate `@jsonpath/core` for JSONPath resolution).

**Testing**

- `pnpm --filter @jsonpath/patch test`

---

### Commit 19 — `@jsonpath/complete`: unified convenience entrypoint

**Files**

- `packages/jsonpath/complete/src/index.ts`
- `packages/jsonpath/complete/src/*.spec.ts`

**What**

- Implement `@jsonpath/complete` re-exports per spec:
  - `query`, `compile` from core
  - `mutate`, `immutable`, `batch` from mutate
  - `pointer` from pointer
  - `patch`, `diff` from patch
  - `legacy` helpers from legacy
  - `extensions` bundles from extensions

**Testing**

- `pnpm --filter @jsonpath/complete test`
- `pnpm -w verify:exports`

---

### Commit 20 — `@jsonpath/cli`: command-line interface + bin shim

**Files**

- `packages/jsonpath/cli/package.json` (bin + postbuild)
- `packages/jsonpath/cli/bin/jsonpath.js` (shim)
- `packages/jsonpath/cli/src/{index.ts,main.ts,args.ts,io/*,formats/*,repl/*,config/*}`
- `packages/jsonpath/cli/src/*.spec.ts`

**What**

- Implement CLI behavior from spec §10:
  - stdin/file input; `--url` fetch; multi-`-q` queries
  - output: default JSON, `--pretty`, `--compact`, `--ndjson`, `--csv`, `--raw`, `--paths`, `--count`
  - `--validate`, `--ast`, `--benchmark`, `--repl`
- CLI should be **minimal by default** (safe defaults, simple output, no optional features enabled), but expandable via config and/or args:
  - by default, it covers the official RFC 9535 JSONPath behavior only.
  - config/args can enable extensions bundles, legacy adapters, wasm acceleration, or additional output formats as needed.
- JSON-only config file support (no YAML):
  - support `.jsonpathrc.json` and `--config <path>`
  - merge order: CLI flags override config file, which overrides defaults
- Follow repo CLI packaging pattern: `bin` points to `./dist/bin/jsonpath.js`, and `postbuild` copies `bin/` to `dist/bin/`.
- Enforce security constraints for all “expression-like” inputs:
  - absolutely no `eval` / `new Function`.
  - if `--update` accepts JavaScript (per spec examples), execute the string via the shared `@jsonpath/core` SES wrapper with locked-down endowments and timeout enforcement.

**Testing**

- `pnpm --filter @jsonpath/cli test`

---

### Commit 21 — `@jsonpath/wasm`: accelerator interface + lazy-loading integration

**Files**

- `packages/jsonpath/wasm/src/{index.ts,wasmAccelerator.ts,loader.ts}`
- `packages/jsonpath/wasm/rust/*` (Rust crate source)
- `packages/jsonpath/wasm/package.json` (build scripts for Rust → wasm)
- `packages/jsonpath/wasm/src/*.spec.ts`
- `packages/jsonpath/core/src/accelerator/types.ts` (if needed)

**What**

- Implement `wasmAccelerator({ threshold, operations })` API per spec §8.5.
- Use Rust to implement the WASM backend (wasm32 target), producing a real `.wasm` artifact shipped with the package.
  - Build strategy: `wasm-pack` + `wasm-bindgen` to generate the wasm + JS bindings into `dist/`.
  - Pin the Rust crate/tooling versions (and document the required Rust toolchain + `wasm-pack` installation) so CI is reproducible.
  - Ensure the wrapper stays ESM-only and is safe to tree-shake.
- Ensure the WASM module is optional and lazily loaded (never required for non-WASM users).
- Integrate accelerator selection in `createEngine({ accelerator })` without changing semantics.
- Target environments: **Node and browsers**.
  - Avoid Node-only globals in the default import path; use `fetch`/`WebAssembly.instantiateStreaming` where available and provide a fallback loader.
  - Support both bundlers and direct ESM usage:
    - bundlers: allow importing the package normally and loading the `.wasm` via a bundled URL or emitted asset.
    - direct usage: allow configuring/providing an explicit `.wasm` URL/path via options.

**Testing**

- `pnpm --filter @jsonpath/wasm test`
- `pnpm --filter @jsonpath/core test`

---

### Commit 22 — `@jsonpath/core`: streaming support (`streamQuery`) [Node-only entrypoint]

**Files**

- `packages/jsonpath/core/src/stream/{streamQuery.ts,index.ts}`
- `packages/jsonpath/core/package.json` (exports map for `./stream`)
- `packages/jsonpath/core/src/stream/*.spec.ts`

**What**

- Implement `streamQuery()` per spec §8.4.
- Keep Node-only IO in a separate subpath export (`@jsonpath/core/stream`) to avoid pulling Node APIs into browser builds.

**Testing**

- `pnpm --filter @jsonpath/core test`

---

### Commit 23 — Documentation: docs/api + per-package READMEs (examples are test-backed)

**Files**

- `docs/api/jsonpath.md`
- `packages/jsonpath/*/README.md`
- `packages/jsonpath/*/src/examples/*.spec.ts` (or colocated specs)

**What**

- Write a full API doc page for the suite and short READMEs per package:
  - installation, minimal examples, security notes, and common recipes.
- Ensure every doc snippet is mirrored by a test so docs can’t drift.

**Testing**

- `pnpm -w test`

---

### Commit 24 — Hardening pass: budgets/timeouts/limits + prototype-pollution regression matrix

**Files**

- `packages/jsonpath/core/src/{security/*,engine.ts,options.ts}`
- `packages/jsonpath/*/src/**/*.spec.ts`

**What**

- Ensure `timeout`, `maxDepth`, `maxResults` are enforced consistently across:
  - query evaluation
  - filters/functions
  - legacy adapters
  - mutation operations
- Add a regression matrix for prototype-pollution attempts across:
  - query traversal
  - mutations
  - pointer/patch interop

**Testing**

- `pnpm -w test:coverage`

---

## Locked-in decisions

- **WASM backend:** Rust implementation producing a real shipped `.wasm` artifact, targeting **Node and browsers**.
- **JS string execution:** all JavaScript-string execution is routed through a shared SES `Compartment` wrapper located in `@jsonpath/core` (no `eval`/`new Function`).
- **SES wrapper export:** exposed as a normal runtime subpath export (e.g. `@jsonpath/core/secure-eval`), and only used when explicitly opted into.
- **CLI config:** JSON-only.
- **Compliance suite:** https://github.com/jsonpath-standard/jsonpath-compliance-test-suite via git URL `devDependency` pinned to a commit SHA (test-only).
- **Exports:** allow granular exports (subpath exports) for tree-shaking, with multiple standalone/composable subpaths.
- **CLI behavior:** minimal by default; covers RFC 9535 by default; expandable via config and/or args.
- **Publishing:** all `@jsonpath/*` packages are public (`publishConfig.access: public`).

## Notes

- If/when we later introduce a bundling strategy (e.g., to hit the spec’s size table), we can add a follow-up task/plan to enforce size budgets in CI.
