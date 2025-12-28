# @jsonpath/\* — Full Implementation Plan

**Branch:** `jsonpath-packages`
**Description:** Implement the complete `@jsonpath/*` suite (core engine + extensions + legacy + mutate + pointer + patch + cli + wasm + complete) with security guarantees, performance features, tests, and docs.

This plan is intended to land as a single PR composed of multiple commits; each **Step** below is designed to be independently testable and corresponds to one commit.

## Goal

Deliver a standards-first JSONPath ecosystem for this monorepo that is RFC 9535 compliant by default, secure-by-design (no `eval` / no `new Function`), tree-shakeable, TypeScript-native, and validated by a comprehensive test suite.

## Implementation Steps

### Step 1: Scaffold all workspaces + shared build/test conventions

**Files:**

- `pnpm-workspace.yaml`, `turbo.json`
- `packages/jsonpath-core/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-extensions/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-legacy/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-mutate/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-pointer/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-patch/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-cli/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-wasm/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
- `packages/jsonpath-complete/{package.json,tsconfig.json,jest.config.js,README.md,src/index.ts}`
  **What:**
- Create all packages as buildable workspaces with `dist/**` outputs, using `tsgo` (not `tsc`) for builds.
- Align Jest configs with the repo’s existing per-package Jest preset approach (via `@lellimecnar/jest-config`) and the standard colocated `src/**/*.spec.ts` convention.
- Ensure internal deps use `workspace:*` and Turbo recognizes outputs.
  **Testing:** `pnpm -r build` and `pnpm -r test` (or Turbo equivalents) should run with placeholder tests.

### Step 2: Core public contracts (types + options) and error hierarchy

**Files:** `packages/jsonpath-core/src/{index.ts,types.ts,options.ts,errors.ts}`
**What:** Define the full public surface types from the spec:

- `QueryOptions`, `CompileOptions`
- `NormalizedPath`, `Node<T>`, `CompiledPath<T>`
- error classes: `JSONPathError`, `JSONPathSyntaxError`, `JSONPathRuntimeError`, `JSONPathSecurityError`, `JSONPathTimeoutError`
  Ensure error instances carry safe metadata (`code`, `path`, `position`, etc.) without leaking huge data blobs.
  **Testing:** Unit tests asserting error shape, inheritance, and stable codes.

### Step 3: Security primitives (no-eval sandbox, access guards, CSP/security modes)

**Files:** `packages/jsonpath-core/src/{security/{index.ts,levels.ts,guards.ts,sandbox.ts},engine.ts}`
**What:** Implement the spec’s security model foundations:

- Hard block prototype pollution vectors (`__proto__`, `constructor`, `prototype`) at traversal and during mutation-path resolution.
- Introduce `SecurityLevel` and `CSPMode` (or equivalent) with strict defaults.
- Implement a `Sandbox` abstraction that enforces:
  - timeouts / step budgets (for filters and legacy scripts)
  - optional `freezeInputs`
  - no dynamic code generation.
    **Testing:** Security regression tests (prototype access attempts must throw `JSONPathSecurityError`), CSP-mode invariants (no dynamic code paths).

### Step 4: RFC 9535 lexer + parser (AST) with precise syntax errors

**Files:** `packages/jsonpath-core/src/{lexer.ts,parser.ts,ast.ts,parse.ts}`
**What:** Parse RFC 9535 JSONPath into a stable AST:

- `$` root, member selectors (dot/bracket), wildcards, unions, slices, recursive descent `..`
- filter expression grammar with correct precedence
- strict syntax diagnostics with positions
  **Testing:** Golden tests for valid paths → AST snapshots; invalid paths → `JSONPathSyntaxError` with accurate `position`/`found`.

### Step 5: Evaluator core (selectors, traversal, node/path tracking)

**Files:** `packages/jsonpath-core/src/{walk.ts,evaluate/*.ts,nodes.ts,paths.ts}`
**What:** Evaluate AST against JSON data safely and deterministically:

- correct object/array semantics, negative indices, slice semantics, recursive descent behavior
- `nodes()` returns `{ path, value, parent, parentProperty }`
- `paths()` returns normalized paths
  **Testing:** Selector-by-selector behavior tests plus mixed-type edge cases.

### Step 6: Filters + RFC 9535 operators (no JS execution)

**Files:** `packages/jsonpath-core/src/{filter/*.ts}`
**What:** Implement filter evaluation with RFC 9535 operators:

- comparisons: `== != < <= > >=`
- logical: `&& || !`
- existence tests
  Ensure filter evaluation runs inside sandbox limits and does not allow property access bypass.
  **Testing:** Operator precedence tests and truthiness edge cases.

### Step 7: Built-in functions + I-Regexp (`iregexp`)

**Files:** `packages/jsonpath-core/src/{functions/{builtins.ts,registry.ts},iregexp/{index.ts,validate.ts,fromRegExp.ts}}`
**What:** Implement RFC 9535 mandatory functions:

- `length()`, `count()`, `match()`, `search()`, `value()`
  Implement I-Regexp validation and best-effort conversion (`iregexp.fromRegExp`).
  **Testing:** Function tests across input types; I-Regexp accept/reject fixtures.

### Step 8: Core API surface (`query/compile/first/exists/count/nodes/paths`)

**Files:** `packages/jsonpath-core/src/{index.ts,api.ts,compile.ts,cache.ts}`
**What:** Implement the specified ergonomic API:

- `query<T>()`, `compile<T>()`, `nodes<T>()`, `paths()`, `first<T>()`, `exists()`, `count()`
- compile-time `optimize` option and runtime caching hooks (internal cache first)
- early termination for `first/exists/count` where feasible
  **Testing:** End-to-end API tests reflecting spec examples.

### Step 9: `validate()` and `sanitize()` APIs for untrusted paths

**Files:** `packages/jsonpath-core/src/{validate.ts,sanitize.ts,index.ts}`
**What:** Add:

- `validate(path)` returns `{ valid, errors[] }` (no throw)
- `sanitize(userPath, policy)` that can disable recursion, limit depth, whitelist segments, etc.
  Policies must align with security model and provide safe defaults.
  **Testing:** Policy enforcement tests and “sanitize then parse” tests.

### Step 10: Compliance harness + curated test corpus

**Files:** `packages/jsonpath-core/src/{compliance/index.ts,compliance/suite.ts,compliance/verify.ts,compliance/fixtures/*.json}`
**What:** Implement the compliance runner API from the spec:

- `compliance.runSuite()` and `compliance.verify()`
  Start with an internal corpus mapped to RFC 9535 mandatory features, then expand toward a full compliance set.

Compliance suite source strategy:

- Pull an external JSONPath compliance suite as a **devDependency** of `@jsonpath/core`.
- Treat the external suite as test-only input: it must not be imported from the runtime entrypoints, and must remain excluded from the published package output.
- Mirror/curate any fixtures needed for stability (and add a small in-repo smoke corpus) while keeping the external suite as the comprehensive reference.
  **Testing:** Compliance suite runs within CI timeouts; asserts pass totals.

### Step 11: Performance features (compilation cache, lazy evaluation, multi-query)

**Files:** `packages/jsonpath-core/src/{lazy.ts,multiQuery.ts,querySet.ts,cache.ts}`
**What:** Implement spec performance APIs:

- compiled query caching (bounded) and reuse
- `lazyQuery()` iterator-based evaluation
- `multiQuery()` and `createQuerySet()` for single-traversal multi-query execution
  Guarantee identical semantics to single-query execution.
  **Testing:** Cross-check multiQuery/querySet/lazyQuery results against baseline `query()`.

### Step 12: Audit logging hooks

**Files:** `packages/jsonpath-core/src/{audit/logger.ts,engine.ts}`
**What:** Add an `AuditLogger` (or hook interface) that can observe:

- parsed query info (redacted)
- execution timing, timeouts, blocked security access
- optionally call-site metadata (if provided)
  Must be opt-in and never log sensitive data by default.
  **Testing:** Hook invocation tests and redaction tests.

### Step 13: Extension system + `@jsonpath/extensions` official pack

**Files:**

- Core: `packages/jsonpath-core/src/{extension/*.ts,engine.ts,grammar/*.ts}`
- Extensions: `packages/jsonpath-extensions/src/{index.ts,selectors/*.ts,operators/*.ts,functions/*.ts}`
  **What:** Implement the extension interface and authoring utilities:
- `defineSelector`, `defineOperator`, `defineFunction`, `registerFunctions`
- `createEngine({ extensions, functions, grammar })`
  Ship the “official” extension pack (selectors like parent `^`, type selectors, etc.) as described in the spec.
  **Testing:** Extension registration tests, plus “core remains RFC 9535” tests when no extensions loaded.

### Step 14: Legacy compatibility (`@jsonpath/legacy`)

**Files:** `packages/jsonpath-legacy/src/{index.ts,modes/*.ts,normalize.ts,convert.ts,adapters/*,sandbox/*}`
**What:** Provide:

- modes (`auto`, `goessner`, `jsonpath-plus`)
- syntax normalization/conversion
- sandboxed legacy script expressions (capability-limited interpreter; no JS eval)
- adapters for `jsonpath` (dchester), `jsonpath-plus`, `json-p3`
  **Testing:** Adapter behavior tests; sandbox escape tests; mode auto-detect tests.

### Step 15: Mutation operations (`@jsonpath/mutate`)

**Files:** `packages/jsonpath-mutate/src/{index.ts,mutate.ts,immutable.ts,batch.ts,selector.ts,ops/*}`
**What:** Implement:

- mutable ops: `set`, `update`, `delete`, `insert`, `rename`
- immutable variants with structural sharing
- batch/transaction APIs and reusable mutation selectors (as in spec)
  Use `@jsonpath/core` resolution (nodes/paths) where appropriate.
  **Testing:** Structural sharing tests (reference equality) and correctness tests for all operations.

### Step 16: JSON Pointer RFC 6901 (`@jsonpath/pointer`)

**Files:** `packages/jsonpath-pointer/src/{index.ts,parse.ts,stringify.ts,escape.ts,get.ts,set.ts,remove.ts}`
**What:** Implement strict RFC 6901 pointer parsing/encoding and helpers.
**Testing:** RFC 6901 fixtures; round-trip tests.

### Step 17: JSON Patch RFC 6902 (`@jsonpath/patch`)

**Files:** `packages/jsonpath-patch/src/{index.ts,apply.ts,validate.ts,ops/*,errors.ts}`
**What:** Implement RFC 6902 operations: `add`, `remove`, `replace`, `move`, `copy`, `test` using `@jsonpath/pointer`.
**Testing:** RFC 6902 fixtures; operation-specific edge cases.

### Step 18: CLI (`@jsonpath/cli`)

**Files:** `packages/jsonpath-cli/src/{main.ts,commands/*,format/*}`
**What:** Implement a CLI supporting:

- query execution (stdin/file JSON)
- output formats: values, nodes, paths
- `validate` and `ast`
  Keep dependencies minimal (prefer none unless unavoidable).
  **Testing:** CLI argument parsing tests; snapshot output tests.

### Step 19: Unified package (`@jsonpath/complete`)

**Files:** `packages/jsonpath-complete/src/index.ts`, `packages/jsonpath-complete/package.json`
**What:** Re-export core APIs plus common extension bundles per spec.
**Testing:** Type-check and basic runtime tests verifying re-exports.

### Step 20: Optional WASM accelerator (`@jsonpath/wasm`)

**Files:** `packages/jsonpath-wasm/src/{index.ts,bridge/*}`
**What:** Add an optional WASM backend with identical semantics. Ensure it is lazy-loaded and never required.
**Testing:** Cross-validate results vs JS engine on the same fixtures.

### Step 21: Documentation + migration notes

**Files:** `docs/api/jsonpath.md` (new), root `README.md` (light reference), per-package `README.md`
**What:** Document:

- each package’s purpose + install + usage
- security model (CSP, sandbox, prototype-pollution prevention)
- extension authoring
- legacy compatibility and migration paths
  **Testing:** Ensure doc examples are mirrored in tests (compile-time) to prevent drift.

### Step 22: Hardening + release readiness

**Files:** targeted across packages
**What:** Finish:

- timeout/maxDepth/maxResults enforcement across APIs
- DoS mitigations (path length caps, recursion caps, budgeted filter evaluation)
- fuzz/regression suite for parser + filters
- confirm public API stability and export layout
  **Testing:** Full repo tests + stress tests remain within CI budget.

## Review Notes (Plan Completeness)

- This revision explicitly covers spec sections that were missing/under-specified before: `Sandbox`, `SecurityLevel`, `CSPMode`, `validate()`, `sanitize()`, `AuditLogger`, `lazyQuery`, `multiQuery`, and `createQuerySet`.
- It also aligns package creation with existing monorepo conventions (Turbo output expectations and per-package Jest configs).

## Open Questions

## Decisions (Confirmed)

- **Bundle size:** Aim for small bundles, but do not add strict size gates (no size-limit CI budget) in this PR.
- **Build tool:** Use `tsgo` for builds (not `tsc`).
- **Testing conventions:** Match existing per-package Jest conventions via `@lellimecnar/jest-config`.
- **Compliance suite:** Pull the compliance suite as a devDependency and ensure it is excluded from published/runtime artifacts.
- **Scope:** Do not migrate `packages/ui-spec` off `jsonpath-plus` in this PR.

## Notes

- If/when we later introduce a bundling strategy (e.g., to hit the spec’s size table), we can add a follow-up task/plan to enforce size budgets in CI.
