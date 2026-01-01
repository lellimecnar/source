## JSONPath Ecosystem: Complete @jsonpath/\* Implementation

**Branch:** `jsonpath/complete-ecosystem`
**Description:** Make every existing `@jsonpath/*` workspace fully functional and spec-compliant, including RFC 9535 query support, stable result shaping/printing, CLI, mutation, validation, and compatibility adapters.

## Goal

Deliver a complete, production-ready implementation of the entire `@jsonpath/*` package ecosystem described in `specs/jsonpath.md`, with comprehensive automated tests (conformance + unit tests), full RFC 9485 I-Regexp compliance, SES-backed script expressions, and up-to-date docs.

## Definition of Done (Compliance + Quality Gates)

- **RFC 9535**: All grammar + evaluation semantics implemented via plugins, bundled through `@jsonpath/plugin-rfc-9535`, and validated by conformance tests.
- **RFC 9485 (I-Regexp)**: Fully compliant implementation with an explicit test-vector suite.
- **RFC 6901 (JSON Pointer)**: Pointer parsing/formatting is byte-for-byte correct; pointer mutations behave deterministically.
- **RFC 6902 (JSON Patch)**: Full op set (`add`, `remove`, `replace`, `move`, `copy`, `test`) with correct error behavior.
- **Core remains framework-only**: No JSONPath feature semantics in `@jsonpath/core`.
- **Deterministic plugin composition**: Engine outputs do not depend on object iteration order; plugin ordering is explicit or stable.
- **Sync + async evaluation**: `evaluateSync` and `evaluateAsync` both supported and tested across the RFC preset.
- **Stable result views**: `value`, `pointer`, `path`, `node`, `parent` views are stable and tested.
- **Tree-shakeable + publishable**: Every `@jsonpath/*` package builds to `dist/`, exports only via `exports` map, and has a smoke test that imports the public entry.
- **Compat parity**: `@jsonpath/compat-*` matches latest upstream APIs exactly, verified by a parity harness across a large corpus.
- **Security**: Script expressions run only via explicit opt-in, inside SES, with safe defaults and negative tests for escape attempts.

## Implementation Steps

### Step 1: Baseline inventory + guardrails (tests + CI sanity)

**Files:**

- `packages/jsonpath/*/package.json`
- `packages/jsonpath/*/src/**`
- `packages/lellimecnar/jsonpath-conformance/**` (if present)
- `vitest.config.ts`
- `docs/api/jsonpath.md`

**What:**

- Produce an “implemented vs placeholder vs missing” matrix for every `@jsonpath/*` package, with special focus on the capability-only plugins.
- Add/adjust a small ecosystem smoke-test suite to ensure:
  - every package has a meaningful runtime export (not just capability metadata), and
  - the RFC preset engine can compile + evaluate a minimal query end-to-end.
- Establish explicit acceptance criteria for each package (API surface, stability, test coverage expectations).

**Testing:**

- `pnpm --filter @jsonpath/core test`
- `pnpm --filter @jsonpath/plugin-rfc-9535 test`
- `pnpm --filter @lellimecnar/jsonpath-conformance test` (if present)

### Step 2: Core contract hardening (determinism, config, sync/async, errors)

**Files:**

- `packages/jsonpath/core/src/**`
- `packages/jsonpath/core/package.json`

**What:**

- Verify (and fill gaps in) the core engine contracts required by the spec:
  - plugin capability conflict detection + dependency validation
  - deterministic plugin ordering rules
  - explicit per-plugin configuration surface (`engineOptions.plugins[pluginId]`)
  - `compile`, `parse`, `evaluateSync`, `evaluateAsync` behaviors documented and tested
  - error shape stability (`Error` instances, machine-readable `code`/`name`, contextual metadata)
- Keep core framework-only: move any accidental feature semantics into plugins.

**Testing:**

- Unit tests in `@jsonpath/core` for ordering/conflicts/config/errors.
- Integration tests with the RFC preset ensuring both sync and async evaluation behave consistently.

### Step 3: Finish `@jsonpath/printer` (unblock stable `path` outputs)

**Files:**

- `packages/jsonpath/printer/src/**`
- `packages/jsonpath/ast/src/**`

**What:**

- Replace placeholder printer output with a real AST-to-string printer that can produce a stable JSONPath string form for all AST shapes used by RFC 9535 parsing.
- Define printer options needed for determinism and compat parity (quoting, escaping, normalization rules).

**Testing:**

- Unit tests in `packages/jsonpath/printer/src/**/*.spec.ts`:
  - print stability across runs
  - parse → print → parse equivalence (where well-defined)

### Step 4: Implement result-view plugins as real engine hooks

**Files:**

- `packages/jsonpath/plugin-result-types/src/**`
- `packages/jsonpath/plugin-result-type-*/src/**`
- `packages/jsonpath/core/src/**`
- `packages/jsonpath/pointer/src/**`
- `packages/jsonpath/printer/src/**`

**What:**

- Convert capability-only result plugins into functional plugins that register result shaping/serialization hooks in `@jsonpath/core`.
- Implement and validate at minimum: `value`, `pointer`, `path`, `node`, `parent` result views.
- Ensure stable formatting contracts for `pointer` (RFC 6901) and `path` (printer-driven) and deterministic ordering.

**Testing:**

- Per-plugin unit tests.
- Cross-package integration tests in `@jsonpath/core` to validate:
  - deterministic plugin ordering
  - capability conflict detection
  - stable result formatting

### Step 5: Normalize RFC 9535 plugin composition (single “install RFC” entry)

**Files:**

- `packages/jsonpath/plugin-rfc-9535/src/**`
- `packages/jsonpath/plugin-syntax-*/src/**`
- `packages/jsonpath/core/src/**`

**What:**

- Ensure `@jsonpath/plugin-rfc-9535` fully covers RFC 9535 by composing the underlying syntax/eval plugins deterministically.
- Validate “profile gating” behavior (e.g., `rfc9535-core` rejects filters if required).
- Ensure capability declarations are complete and enforced by core.

**Testing:**

- `pnpm --filter @lellimecnar/jsonpath-conformance test` (if present)
- Direct engine tests for representative selectors/segments.

### Step 6: Convert “syntax placeholder” plugins into full parser/evaluator contributions

**Files:**

- `packages/jsonpath/plugin-syntax-current/src/**`
- `packages/jsonpath/plugin-syntax-union/src/**`
- `packages/jsonpath/plugin-syntax-root/src/**`
- `packages/jsonpath/parser/src/**`
- `packages/jsonpath/lexer/src/**`

**What:**

- Implement missing RFC 9535 grammar elements that are currently “capability-only” (notably current selector + unions).
- Add parse golden tests (input → AST) and evaluation tests (AST → selections).

**Testing:**

- Parser golden tests + evaluator tests per new syntax feature.
- Rerun conformance suite.

### Step 7: Decompose filters into real plugins (parser + evaluator), retaining RFC correctness

**Files:**

- `packages/jsonpath/plugin-filter-*/src/**`
- `packages/jsonpath/plugin-syntax-filter/src/**`
- `packages/jsonpath/core/src/**`

**What:**

- Implement the planned plugin boundaries for filters:
  - parsing contributions (grammar pieces + precedence)
  - evaluation contributions (operators, literals, existence)
  - function call integration
- Ensure all filter semantics are RFC 9535-correct under RFC profiles.

**Testing:**

- Unit tests per operator/literal group.
- Conformance tests focused on filter semantics and profile gating.

### Step 8: RFC 9535 functions completeness + typing contract

**Files:**

- `packages/jsonpath/plugin-functions-core/src/**`
- `packages/jsonpath/plugin-syntax-filter/src/**`
- `packages/jsonpath/plugin-rfc-9535/src/**`

**What:**

- Ensure every RFC 9535-defined function exists, is callable in filters, and matches required semantics.
- Define and enforce a function typing/validation contract during compilation (inputs/outputs), while keeping `@jsonpath/core` feature-agnostic.
- Ensure errors are rich and stable (machine-readable `code`/`name`, include expression context).

**Testing:**

- Function-level spec tests.
- Conformance tests targeting function library coverage.

### Step 9: Implement SES-backed script expressions plugin (sandboxed filters)

**Files:**

- `packages/jsonpath/plugin-script-expressions/src/**`
- `packages/jsonpath/core/src/**`
- `docs/api/jsonpath.md`

**What:**

- Make `@jsonpath/plugin-script-expressions` a real plugin that:
  - registers a script filter evaluator using SES compartments
  - requires explicit opt-in config/capability to enable execution
  - uses safe defaults (no ambient authority by default)
  - documents limitations, configuration, and security model

**Testing:**

- Unit tests verifying:
  - expressions evaluate correctly in-sandbox
  - access to host globals is denied
  - deterministic execution and error reporting

### Step 10: Full RFC 9485 I-Regexp compliance

**Files:**

- `packages/jsonpath/plugin-iregexp/src/**`
- `packages/jsonpath/plugin-syntax-filter/src/**` (if regex semantics depend on it)

**What:**

- Replace placeholder behavior with full RFC 9485 (I-Regexp) compliance.
- Ensure any RFC 9535 regex-related behaviors use I-Regexp correctly.
- Document exactly what is implemented and add test vectors.

**Testing:**

- RFC 9485 test-vector suite (added to the package) + regression tests.

### Step 11: Complete JSON Patch (`@jsonpath/patch`) to full RFC 6902 support

**Files:**

- `packages/jsonpath/patch/src/**`
- `packages/jsonpath/pointer/src/**`

**What:**

- Implement missing operations: `move`, `copy`, `test`.
- Harden edge cases across arrays/objects and invalid pointers.
- Ensure stable, well-defined error behavior.

**Testing:**

- Patch op matrix tests per op with edge cases.

### Step 12: Mutation: JSONPath selection → pointer-backed writes/removals

**Files:**

- `packages/jsonpath/mutate/src/**`
- `packages/jsonpath/core/src/**`
- `packages/jsonpath/plugin-result-type-pointer/src/**`
- `packages/jsonpath/patch/src/**` (optional, if patch is used as the write backend)

**What:**

- Add the missing glue so mutation can:
  - evaluate a JSONPath query to produce pointers, then
  - apply pointer-backed mutations deterministically over multi-target selections.
- Define deterministic behavior for overlapping targets and ordering.

**Testing:**

- Integration tests: select N targets → apply set/remove → validate final JSON.

### Step 13: Validation: make `@jsonpath/plugin-validate` a real engine integration

**Files:**

- `packages/jsonpath/plugin-validate/src/**`
- `packages/jsonpath/validator-*/src/**`
- `packages/jsonpath/core/src/**`

**What:**

- Convert validate plugin from “utility only” into an engine-integrated plugin:
  - optionally validate selected values via configured adapters
  - define a stable validation result shape (pass/fail + normalized errors + pointers/paths)
- Ensure adapters (Ajv/Zod/Yup) normalize errors consistently.

**Testing:**

- Adapter unit tests.
- Engine integration tests ensuring validation is opt-in and never changes selection semantics.

### Step 14: Compatibility packages: update to latest upstream and achieve true drop-in parity

**Files:**

- `packages/jsonpath/compat-jsonpath/src/**`
- `packages/jsonpath/compat-jsonpath-plus/src/**`
- `packages/lellimecnar/jsonpath-compat-harness/**` (if present)
- `packages/jsonpath/compat-*/package.json`

**What:**

- Upgrade and pin compat targets to the latest released upstream versions at implementation time.
- Update adapters to match upstream APIs exactly (behavior, errors, return shapes).
- Expand the compat harness corpus and require parity across the corpus.

**Testing:**

- Compat harness test suite run (if present).
- Snapshot-based parity tests against pinned upstream versions.

### Step 15: CLI correctness + JSON-only config compliance

**Files:**

- `packages/jsonpath/cli/src/**`
- `packages/jsonpath/cli/bin/**`
- `docs/api/jsonpath.md`

**What:**

- Ensure CLI reads JSON config only and supports required operations (query + output format selection).
- Ensure CLI `resultType` options map to implemented result-view plugins.
- Verify packaging/build places bins correctly in `dist/`.

**Testing:**

- CLI unit tests for config parsing.
- Minimal integration tests using fixtures.

### Step 16: Packaging + exports compliance across all `@jsonpath/*` packages

**Files:**

- `packages/jsonpath/*/package.json`
- `packages/jsonpath/*/vite.config.*`
- `packages/jsonpath/*/tsconfig.json`

**What:**

- Ensure every package:
  - builds to `dist/` and publishes only `dist/` (and required metadata)
  - uses explicit `exports` maps with types pointing to `dist/*.d.ts`
  - has no accidental deep import reliance in other workspaces
  - remains tree-shakeable (no side-effectful imports in entrypoints unless explicitly declared)

**Testing:**

- A workspace-wide “import smoke test” that imports each package’s public entry and executes a trivial call when applicable.

### Step 17: Documentation + API reference sync

**Files:**

- `specs/jsonpath.md`
- `docs/api/jsonpath.md`
- `README.md` (only if needed)

**What:**

- Update docs to match actual behavior for:
  - RFC profiles
  - result types
  - SES script enablement and security model
  - mutation and validation configuration
  - CLI usage

**Testing:**

- Ensure documented examples are exercised by tests where feasible.

### Step 18: Final conformance pass + performance sanity

**Files:**

- `packages/jsonpath/**`
- `packages/lellimecnar/jsonpath-conformance/**` (if present)

**What:**

- Run and fix the full conformance suite.
- Add basic microbench/regression checks for hot paths (lexer/parser/evaluator) to avoid accidental slowdowns.

**Testing:**

- `pnpm --filter @lellimecnar/jsonpath-conformance test` (if present)
- Focused package tests for all modified workspaces.
