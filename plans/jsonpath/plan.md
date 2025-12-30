## Branch

`feat/jsonpath/ecosystem-v2`

## Description

Implement the full `@jsonpath/*` ecosystem described in [specs/jsonpath.md](../../specs/jsonpath.md) as a plugin-first, standards-first JSONPath stack for this pnpm + Turborepo monorepo.

## Repo Findings (grounding)

- Existing JSONPath usage already exists via `jsonpath-plus` in `packages/ui-spec/core/src/bindings/jsonpath.ts` (includes pointer enumeration via `resultType: 'pointer'` and basic JSON Pointer get/set/remove).
- Root Vitest is already configured for multi-project runs via `vitest.config.ts` (`test.projects` includes `packages/*/vitest.config.ts`), so flat `packages/jsonpath-*` workspaces will be picked up automatically.
- Workspace globs in `pnpm-workspace.yaml` already include `packages/*`, so new `packages/jsonpath-*` folders do not require workspace config changes.
- Prior repo research notes exist in `.copilot-tracking/research/20251229-jsonpath-implementation-research.md` (packaging + testing conventions, and the existing JSONPath binding analysis).

This is a planning-only document. It is written to match repo conventions:

- Publishable TS libraries built with Vite to `dist/` (ESM + `.d.ts`) and validated by `pnpm verify:exports`.
- Unit tests co-located as `src/**/*.spec.ts` using per-package Vitest configs and root `test.projects`.
- No `cd`-based commands in instructions; use `pnpm --filter ...` or `pnpm -w turbo ...`.

## Goal

Deliver a set of publishable, interoperable packages that:

- Provide a framework-only `@jsonpath/core` engine with deterministic plugin composition.
- Provide RFC 9535 behavior strictly via plugins and an RFC bundle plugin.
- Provide drop-in compat packages for `jsonpath` (dchester) and `jsonpath-plus`.
- Provide SES sandboxed script expressions as an opt-in plugin.
- Provide pointer/patch/mutate utilities with prototype-pollution hardening.
- Provide validation orchestration + validator adapters.
- Provide a CLI package whose config format is JSON only.
- Provide a shared conformance + compatibility harness (internal package) to prove correctness.

[NEEDS CLARIFICATION] The spec contains contradictions (JSON-only CLI vs YAML examples, “no legacy bucket” vs references to `@jsonpath/legacy/*`, and build target layout vs repo’s existing `dist/` conventions). This plan follows the “hard constraints” sections and repo conventions, and flags contradictions explicitly.

Clarification policy for this plan:

- Enforce the spec’s hard constraints: CLI config is JSON only; no `@jsonpath/legacy/*` packages; compatibility is provided only via `@jsonpath/compat-*`.
- Treat non-structure examples (YAML config, REPL/interactive mode, `@jsonpath/schema`, `@jsonpath/extensions`) as future work unless they are explicitly added to the required package structure.

## Implementation Steps

### Step 1 — Scaffold all `@jsonpath/*` workspaces (publishable packages) + internal harness packages

**Files:**

- Create package folders under `packages/` (flat, to match `packages/*` workspace glob):
  - Framework: `packages/jsonpath-core`, `packages/jsonpath-ast`, `packages/jsonpath-lexer`, `packages/jsonpath-parser`, `packages/jsonpath-printer`
  - RFC bundle + feature plugins:
    - `packages/jsonpath-plugin-rfc-9535`
    - Syntax: `packages/jsonpath-plugin-syntax-root`, `packages/jsonpath-plugin-syntax-current`, `packages/jsonpath-plugin-syntax-child-member`, `packages/jsonpath-plugin-syntax-child-index`, `packages/jsonpath-plugin-syntax-wildcard`, `packages/jsonpath-plugin-syntax-union`, `packages/jsonpath-plugin-syntax-descendant`, `packages/jsonpath-plugin-syntax-filter`
    - Filters: `packages/jsonpath-plugin-filter-literals`, `packages/jsonpath-plugin-filter-comparison`, `packages/jsonpath-plugin-filter-boolean`, `packages/jsonpath-plugin-filter-existence`, `packages/jsonpath-plugin-filter-functions`, `packages/jsonpath-plugin-filter-regex`
    - Functions: `packages/jsonpath-plugin-functions-core` (and optionally split: `packages/jsonpath-plugin-functions-strings`, `packages/jsonpath-plugin-functions-numbers`, `packages/jsonpath-plugin-functions-arrays`, `packages/jsonpath-plugin-functions-objects`) [NEEDS CLARIFICATION: split is optional per spec]
    - Result views: `packages/jsonpath-plugin-result-value`, `packages/jsonpath-plugin-result-node`, `packages/jsonpath-plugin-result-path`, `packages/jsonpath-plugin-result-pointer`, `packages/jsonpath-plugin-result-parent`, `packages/jsonpath-plugin-result-types`
    - Standards-adjacent: `packages/jsonpath-plugin-iregexp`
    - Security/tooling: `packages/jsonpath-plugin-script-expressions`, `packages/jsonpath-plugin-validate`
    - Optional non-RFC extensions: `packages/jsonpath-plugin-parent-selector`, `packages/jsonpath-plugin-property-name-selector`, `packages/jsonpath-plugin-type-selectors`
  - Compat: `packages/jsonpath-compat-jsonpath`, `packages/jsonpath-compat-jsonpath-plus`
  - Mutation: `packages/jsonpath-pointer`, `packages/jsonpath-patch`, `packages/jsonpath-mutate`
  - Validator adapters: `packages/jsonpath-validator-json-schema`, `packages/jsonpath-validator-zod`, `packages/jsonpath-validator-yup`
  - CLI + bundle: `packages/jsonpath-cli`, `packages/jsonpath-complete`
  - Internal-only (NOT published to npm):
    - `packages/jsonpath-compat-harness` (name it `@lellimecnar/jsonpath-compat-harness`, `private: true`)
    - `packages/jsonpath-conformance` (fixtures + shared corpus utilities; also `private: true`)
- For each publishable `@jsonpath/*` package:
  - `package.json` with `name` set to the scoped name (e.g., `@jsonpath/core`), `type: "module"`, `exports` mapping `.` to `./dist/index.js` + `./dist/index.d.ts`, and `files: ["dist"]`.
  - `vite.config.ts` using `@lellimecnar/vite-config/node`, `vite-plugin-dts`, Rollup `preserveModules: true`, and externalization of deps/peerDeps.
  - `tsconfig.json` extending `@lellimecnar/typescript-config` (match `packages/polymix` conventions).
  - `vitest.config.ts` importing `vitestBaseConfig()`.
  - `.eslintrc.cjs` extending `@lellimecnar/eslint-config`.
  - `src/index.ts` exporting placeholder symbols (minimal compile surface).
  - `README.md` minimal (what the package is, what it exports).
- For CLI `@jsonpath/cli`:
  - Add `bin` entry and `postbuild` copy pattern (match `packages/ui-spec/cli`).

**What:**

- Establish consistent package layout, build/test/lint/type-check scripts across all new packages.
- Ensure the monorepo recognizes packages automatically via existing workspace globs.

**Testing:**

- `pnpm -w turbo build --filter=@jsonpath/*` (or `pnpm -w turbo build` once scaffolding is done)
- `pnpm -w test --filter=@jsonpath/* -- --passWithNoTests`
- `pnpm -w verify:exports`

---

### Step 2 — Define shared error model + diagnostics contract (framework-only)

**Files:**

- `packages/jsonpath-core/src/errors/*.ts`
- `packages/jsonpath-core/src/diagnostics/*.ts`
- `packages/jsonpath-core/src/index.ts`
- `packages/jsonpath-core/src/errors.spec.ts`

**What:**

- Define base error types used by the engine and plugins (syntax errors, evaluation errors, plugin config errors).
- Include structured metadata required by the spec (expression, plugin ids, parse locations, sanitized options, `cause`).
- Define a stable machine-readable identifier (e.g., `code`) and ensure it is consistent.

**Testing:**

- `pnpm --filter @jsonpath/core test`

---

### Step 3 — Implement capability + dependency resolution and deterministic plugin ordering

**Files:**

- `packages/jsonpath-core/src/plugins/{types.ts,registry.ts,order.ts,resolve.ts}`
- `packages/jsonpath-core/src/plugins/resolve.spec.ts`

**What:**

- Implement plugin metadata model: `id`, capabilities, hard/optional deps, peer deps (declared), config schema hooks.
- Implement deterministic ordering rules:
  - preserve explicit order as provided;
  - otherwise sort by stable key (`plugin.id`).
- Implement capability conflict detection with actionable error messages.

**Testing:**

- Unit tests for ordering determinism and conflict detection.
- `pnpm --filter @jsonpath/core test`

---

### Step 4 — `@jsonpath/ast`: feature-agnostic AST node types + stable serialization helpers

**Files:**

- `packages/jsonpath-ast/src/{nodes.ts,visitor.ts,printable.ts,index.ts}`
- `packages/jsonpath-ast/src/nodes.spec.ts`

**What:**

- Define immutable AST node shapes and shared visitor types.
- Keep semantics out: nodes represent structure only.

**Testing:**

- `pnpm --filter @jsonpath/ast test`

---

### Step 5 — `@jsonpath/lexer`: tokenization infrastructure (feature-agnostic)

**Files:**

- `packages/jsonpath-lexer/src/{token.ts,scanner.ts,stream.ts,index.ts}`
- `packages/jsonpath-lexer/src/scanner.spec.ts`

**What:**

- Implement a fast, dependency-free lexer infrastructure (per spec “hand-written for performance”).
- Provide hooks so syntax plugins can register token kinds and scanning rules.

**Testing:**

- `pnpm --filter @jsonpath/lexer test`

---

### Step 6 — `@jsonpath/parser`: parser infrastructure (feature-agnostic) + Pratt expression framework

**Files:**

- `packages/jsonpath-parser/src/{parser.ts,context.ts,pratt/*.ts,index.ts}`
- `packages/jsonpath-parser/src/pratt.spec.ts`

**What:**

- Implement recursive-descent parser infrastructure for JSONPath segment parsing.
- Provide Pratt parser utilities for filter expressions (operators + precedence are installed by filter plugins).
- Define the extension points that plugins can use to contribute:
  - segment parsers
  - expression operators
  - function call parsing

**Testing:**

- `pnpm --filter @jsonpath/parser test`

---

### Step 7 — `@jsonpath/printer`: AST-to-string infrastructure (feature-agnostic)

**Files:**

- `packages/jsonpath-printer/src/{printer.ts,options.ts,index.ts}`
- `packages/jsonpath-printer/src/printer.spec.ts`

**What:**

- Provide stable AST serialization hooks used by path result plugins and CLI diagnostics.
- [NEEDS CLARIFICATION] Spec’s “Build Targets” section describes `dist/esm`, `dist/cjs`, etc. Repo convention is a flat `dist/` ESM build. Follow repo convention unless a consumer requires CJS.

**Testing:**

- `pnpm --filter @jsonpath/printer test`

---

### Step 8 — `@jsonpath/core`: compile/parse/evaluate pipeline (framework-only)

**Files:**

- `packages/jsonpath-core/src/{engine.ts,createEngine.ts,compile.ts,evaluate/{sync.ts,async.ts},index.ts}`
- `packages/jsonpath-core/src/engine.spec.ts`

**What:**

- Implement `createEngine({ plugins, options })` that wires:
  - parse pipeline (lexer → parser → AST)
  - evaluation pipeline (plugin visitors)
  - result shaping pipeline (result plugins)
- Ensure core itself contains _no_ grammar tokens or evaluation semantics.

**Testing:**

- `pnpm --filter @jsonpath/core test`

---

### Step 9 — RFC 9535 syntax plugins (root/current/child-member/wildcard)

**Files:**

- `packages/jsonpath-plugin-syntax-root/src/index.ts`
- `packages/jsonpath-plugin-syntax-current/src/index.ts`
- `packages/jsonpath-plugin-syntax-child-member/src/index.ts`
- `packages/jsonpath-plugin-syntax-wildcard/src/index.ts`
- Tests in each package: `src/*.spec.ts`

**What:**

- Each plugin contributes:
  - tokenization rules (via `@jsonpath/lexer` hooks)
  - parser productions (via `@jsonpath/parser` hooks)
  - AST node factories (`@jsonpath/ast`)
  - evaluation semantics for that selector (via `@jsonpath/core` evaluation hooks)

**Testing:**

- Per-plugin tests + integration test in `@jsonpath/plugin-rfc-9535` (added later).
- `pnpm --filter @jsonpath/plugin-syntax-root test` (repeat per package)

---

### Step 10 — RFC 9535 syntax plugins (child-index/slice + union)

**Files:**

- `packages/jsonpath-plugin-syntax-child-index/src/index.ts`
- `packages/jsonpath-plugin-syntax-union/src/index.ts`

**What:**

- Implement bracket index and slice parsing/evaluation.
- [NEEDS CLARIFICATION] The official plugin inventory lists `plugin-syntax-child-index` but does not explicitly name a slice plugin; implement slice inside the child-index plugin unless the inventory is updated.

**Testing:**

- Focused tests for negative indices, slices, and union ordering.
- `pnpm --filter @jsonpath/plugin-syntax-child-index test`

---

### Step 11 — RFC 9535 syntax plugins (descendant + filter selector container)

**Files:**

- `packages/jsonpath-plugin-syntax-descendant/src/index.ts`
- `packages/jsonpath-plugin-syntax-filter/src/index.ts`

**What:**

- Implement recursive descent semantics deterministically.
- Implement filter selector _container_ parsing (`[? ... ]`) but leave filter expression semantics to filter plugins.

**Testing:**

- Deterministic traversal tests; max depth guard hooks (core-level option).
- `pnpm --filter @jsonpath/plugin-syntax-descendant test`

---

### Step 12 — Filter expression plugins (literals + boolean + comparison)

**Files:**

- `packages/jsonpath-plugin-filter-literals/src/index.ts`
- `packages/jsonpath-plugin-filter-boolean/src/index.ts`
- `packages/jsonpath-plugin-filter-comparison/src/index.ts`

**What:**

- Install Pratt operators and evaluation semantics for the RFC non-script filter language.

**Testing:**

- Operator precedence and truthiness tests; snapshot errors.

---

### Step 13 — Filter expression plugins (existence + functions + regex wiring)

**Files:**

- `packages/jsonpath-plugin-filter-existence/src/index.ts`
- `packages/jsonpath-plugin-filter-functions/src/index.ts`
- `packages/jsonpath-plugin-filter-regex/src/index.ts`

**What:**

- Implement existence semantics (RFC-defined).
- Wire function calls in filters.
- Wire regex operator tokens and delegate regex semantics to `@jsonpath/plugin-iregexp`.

**Testing:**

- Exhaustive filter matrix tests (true/false, missing, null, empty string/array, etc.).

---

### Step 14 — RFC function plugins

**Files:**

- `packages/jsonpath-plugin-functions-core/src/index.ts`
- Optional splits: `packages/jsonpath-plugin-functions-{strings,numbers,arrays,objects}/src/index.ts`

**What:**

- Implement RFC-defined functions.
- Decide split strategy based on size; default to a single core package until function count becomes large.

**Testing:**

- Function-by-function unit tests + property-based tests for core invariants (optional).

---

### Step 15 — Result view plugins (value/node/path/pointer/parent) + aggregator

**Files:**

- `packages/jsonpath-plugin-result-*/src/index.ts`

**What:**

- Implement result shaping:
  - `value`: raw values
  - `node`: { value, pointer?, path?, parent?, parentProperty? }
  - `path`: stable JSONPath string serialization (via `@jsonpath/printer`)
  - `pointer`: RFC 6901 pointers
  - `parent`: parent record formatting where required
  - `types`: convenience aggregator used by compat

**Testing:**

- Snapshot tests for string formatting.
- Ordering stability tests.

---

### Step 16 — RFC 9485 I-Regexp plugin

**Files:**

- `packages/jsonpath-plugin-iregexp/src/index.ts`

**What:**

- Implement or wrap an I-Regexp engine.
- [NEEDS CLARIFICATION] Decide whether to implement RFC 9485 internally (preferred for determinism/security) vs depend on an external library.

**Testing:**

- RFC 9485 test vectors (where available) + ReDoS regression tests.

---

### Step 17 — Bundle plugin: `@jsonpath/plugin-rfc-9535` preset wiring

**Files:**

- `packages/jsonpath-plugin-rfc-9535/src/{index.ts,preset.ts}`
- `packages/jsonpath-plugin-rfc-9535/src/preset.spec.ts`

**What:**

- Create a bundle plugin that depends on all RFC feature plugins.
- Export `createRfc9535Engine()` that is “just wiring”.

**Testing:**

- Conformance suite entry tests: parse + evaluate core RFC features.

---

### Step 18 — SES script expressions plugin (opt-in)

**Files:**

- `packages/jsonpath-plugin-script-expressions/src/{index.ts,ses.ts,policy.ts}`
- `packages/jsonpath-plugin-script-expressions/src/*.spec.ts`

**What:**

- Implement `filter:script` capability as opt-in.
- Use `ses` primitives: `lockdown()`, `Compartment`, `harden()`.
- Support configuration: allowed endowments, error modes, cancellation hooks.

**Testing:**

- “Scripts disabled unless enabled” tests.
- Sandbox escape regression tests.

---

### Step 19 — Pointer package (`@jsonpath/pointer`) with hardening

**Files:**

- `packages/jsonpath-pointer/src/{get.ts,set.ts,remove.ts,compile.ts,convert.ts,index.ts}`
- `packages/jsonpath-pointer/src/*.spec.ts`

**What:**

- Implement RFC 6901 pointer get/set/has/remove + compile.
- Implement JSONPath ↔ Pointer conversions used by result plugins and mutate.
- Prototype pollution hardening: reject `__proto__`, `constructor`, `prototype` path segments.

**Testing:**

- RFC 6901 vectors + pollution regression tests.

---

### Step 20 — Patch package (`@jsonpath/patch`) with hardening

**Files:**

- `packages/jsonpath-patch/src/{ops/*.ts,apply.ts,diff.ts,index.ts}`
- `packages/jsonpath-patch/src/*.spec.ts`

**What:**

- Implement RFC 6902 apply + optional diff.
- Ensure operations delegate to pointer package for traversal and hardening.

**Testing:**

- RFC 6902 vectors + pollution regression tests.

---

### Step 21 — Mutate package (`@jsonpath/mutate`) (selection + pointer/patch-backed)

**Files:**

- `packages/jsonpath-mutate/src/{set.ts,remove.ts,replace.ts,applyPatch.ts,index.ts}`
- `packages/jsonpath-mutate/src/*.spec.ts`

**What:**

- Provide `set/remove/replace` that apply to all JSONPath matches.
- Require a pointer-capable result plugin for pointer stability.

**Testing:**

- Multi-match determinism tests + “applies to all matches” tests.

---

### Step 22 — Validation plugin + common `Issue` model

**Files:**

- `packages/jsonpath-plugin-validate/src/{index.ts,issue.ts,orchestrate.ts}`
- `packages/jsonpath-plugin-validate/src/*.spec.ts`

**What:**

- Validate each match independently.
- Emit stable `Issue` objects with pointer/path metadata.

**Testing:**

- Orchestrator tests with stub adapters.

---

### Step 23 — Validator adapters (Ajv / Zod / Yup)

**Files:**

- `packages/jsonpath-validator-json-schema/src/index.ts`
- `packages/jsonpath-validator-zod/src/index.ts`
- `packages/jsonpath-validator-yup/src/index.ts`

**What:**

- Implement adapter interface and map errors into the common `Issue` shape.
- Cache compiled schemas where appropriate.
- Dependencies:
  - `ajv` for JSON Schema (exact package TBD)
  - `zod`
  - `yup`

**Testing:**

- Each adapter has fixtures demonstrating unknown-property strictness behavior.

---

### Step 24 — Optional non-RFC extension plugins (parent selector, property-name selector, type selectors)

**Files:**

- `packages/jsonpath-plugin-parent-selector/src/index.ts`
- `packages/jsonpath-plugin-property-name-selector/src/index.ts`
- `packages/jsonpath-plugin-type-selectors/src/index.ts`

**What:**

- Implement optional extensions that are required only when compat targets enable them by default.

**Testing:**

- Extension-specific behavior tests.

---

### Step 25 — Compat packages: `@jsonpath/compat-jsonpath` and `@jsonpath/compat-jsonpath-plus`

**Files:**

- `packages/jsonpath-compat-jsonpath/src/index.ts`
- `packages/jsonpath-compat-jsonpath-plus/src/index.ts`
- `packages/jsonpath-compat-*/src/*.spec.ts`

**What:**

- Implement exact API surfaces described in the spec.
- Pin upstream versions for the harness (as devDependencies in the internal harness package).
- Match upstream defaults precisely, including quirks.

**Testing:**

- API surface snapshot tests.
- Behavioral equivalence tests via harness (next step).

---

### Step 26 — Compatibility harness: run upstream vs compat side-by-side

**Files:**

- `packages/jsonpath-compat-harness/src/{corpus/*.ts,runJsonpath.ts,runJsonpathPlus.ts,runCompat.ts,compare.ts}`
- `packages/jsonpath-conformance/src/{fixtures/*.json,queries/*.json,index.ts}`

**What:**

- Build a shared corpus of JSON docs + queries.
- Run the same corpus through:
  - upstream `jsonpath`
  - upstream `jsonpath-plus`
  - our compat packages
- Assert equivalence of results, ordering, and error behavior.

**Testing:**

- `pnpm --filter @lellimecnar/jsonpath-compat-harness test`

---

### Step 27 — CLI package (`@jsonpath/cli`) (JSON config only)

**Files:**

- `packages/jsonpath-cli/src/{config/schema.ts,config/load.ts,run.ts,index.ts}`
- `packages/jsonpath-cli/bin/jsonpath.js`
- `packages/jsonpath-cli/src/*.spec.ts`

**What:**

- Implement the “JSON config only” contract from spec section 12:
  - load `jsonpath.config.json` or `.jsonpathrc.json`
  - stdin/file input
  - output to stdout; diagnostics to stderr; exit codes
- [NEEDS CLARIFICATION] The spec later includes YAML config examples and interactive REPL features; this plan implements JSON-only config per the hard constraint.

**Testing:**

- Unit tests for config parsing/validation.
- CLI smoke tests (spawn node, assert stdout/stderr/exit code).

---

### Step 28 — Convenience bundle (`@jsonpath/complete`) (optional)

**Files:**

- `packages/jsonpath-complete/src/index.ts`

**What:**

- Provide a meta-package that re-exports common presets and wiring.
- Must not implement features.

**Testing:**

- Build + export verification.

---

### Step 29 — Performance + security regression suite

**Files:**

- Extend `packages/jsonpath-conformance/src/` with:
  - perf fixtures
  - security fixtures (prototype pollution attempts, script disabled checks)

**What:**

- Add regression tests for:
  - compilation caching behavior (core)
  - deterministic plugin ordering
  - max depth / max results guards
  - prototype pollution hardening
  - script-eval opt-in enforcement

**Testing:**

- `pnpm -w test --filter @jsonpath/*`

---

### Step 30 — Documentation updates

**Files:**

- `docs/api/jsonpath.md` (new)
- Update `docs/api/utils.md` or `docs/api/ui-spec.md` if they reference JSONPath behavior
- Update `README.md` (root) with a short section linking to JSONPath packages (optional)

**What:**

- Document package responsibilities, recommended presets, and compat migration guidance.
- Document security defaults and opt-in risk capabilities.

**Testing:**

- `pnpm -w lint`
- `pnpm -w type-check`

---

## Package Inventory (for implementation tracking)

### Required (per spec section 1 + section 12 + Appendix A)

- Framework: `@jsonpath/core`, `@jsonpath/ast`, `@jsonpath/lexer`, `@jsonpath/parser`, `@jsonpath/printer`
- RFC bundle: `@jsonpath/plugin-rfc-9535`
- Syntax plugins: `@jsonpath/plugin-syntax-root`, `@jsonpath/plugin-syntax-current`, `@jsonpath/plugin-syntax-child-member`, `@jsonpath/plugin-syntax-child-index`, `@jsonpath/plugin-syntax-wildcard`, `@jsonpath/plugin-syntax-union`, `@jsonpath/plugin-syntax-descendant`, `@jsonpath/plugin-syntax-filter`
- Filter plugins: `@jsonpath/plugin-filter-literals`, `@jsonpath/plugin-filter-comparison`, `@jsonpath/plugin-filter-boolean`, `@jsonpath/plugin-filter-existence`, `@jsonpath/plugin-filter-functions`, `@jsonpath/plugin-filter-regex`
- Function plugins: `@jsonpath/plugin-functions-core` (domain splits optional)
- Result plugins: `@jsonpath/plugin-result-value`, `@jsonpath/plugin-result-node`, `@jsonpath/plugin-result-path`, `@jsonpath/plugin-result-pointer`, `@jsonpath/plugin-result-parent`, `@jsonpath/plugin-result-types`
- Standards-adjacent: `@jsonpath/plugin-iregexp`
- Security/tooling: `@jsonpath/plugin-script-expressions`, `@jsonpath/plugin-validate`
- Compat: `@jsonpath/compat-jsonpath`, `@jsonpath/compat-jsonpath-plus`
- Mutation: `@jsonpath/pointer`, `@jsonpath/patch`, `@jsonpath/mutate`
- Validators: `@jsonpath/validator-json-schema`, `@jsonpath/validator-zod`, `@jsonpath/validator-yup`
- CLI: `@jsonpath/cli`

### Optional (explicitly optional in spec)

- Non-RFC extensions: `@jsonpath/plugin-parent-selector`, `@jsonpath/plugin-property-name-selector`, `@jsonpath/plugin-type-selectors`
- Convenience bundle: `@jsonpath/complete`

### Spec-referenced but inconsistent / not in the official package structure

[NEEDS CLARIFICATION]

- `@jsonpath/extensions` appears in the Extension Registry appendix, but the spec elsewhere states “everything is a plugin” and doesn’t define this package in the structure list.
- `@jsonpath/schema` appears in a JSON Schema integration example, but is not listed as a required package.
- `@jsonpath/legacy/*` is referenced in migration examples, but the spec explicitly forbids a “legacy bucket” and instead mandates `@jsonpath/compat-*`.
- The CLI examples include YAML config (`.jsonpathrc.yml`) and an interactive REPL, but the hard CLI constraint requires JSON-only config; this plan implements JSON-only config and defers YAML/REPL.

## Notes on Monorepo Conventions

- New packages should follow patterns demonstrated by `packages/polymix` (Vite build + d.ts + preserveModules) and `packages/utils` (Vitest base config).
- Root-level Vitest already globs `packages/*/vitest.config.ts`, so flat `packages/jsonpath-*` directories will be picked up automatically.
