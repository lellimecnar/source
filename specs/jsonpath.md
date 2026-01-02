---
title: JSONPath Ecosystem Spec (Legacy Path)
version: 2026-01
date_created: 2026-01-02
last_updated: 2026-01-02
owner: @lellimecnar
tags: [design, jsonpath, legacy-spec, redirect]
---

# JSONPath Specification

This file remains for backwards compatibility.

The canonical, implementation-aligned specification is:

- [spec/design-jsonpath.md](../spec/design-jsonpath.md)

# @jsonpath Library Specification

## A Plugin-First JSONPath Ecosystem for JavaScript

**Version**: 2.0.0-spec
**Status**: Draft Specification
**License**: MIT

---

## Executive Summary

`@jsonpath` is a plugin-first JSONPath ecosystem designed to unify the fragmented JavaScript JSONPath landscape.

This specification enforces the following structural constraints:

1. **Core is framework-only**: `@jsonpath/core` provides parsing/evaluation infrastructure and plugin composition, but contains **no JSONPath features**.
2. **Everything is a plugin**: Each JSONPath feature is shipped as a `@jsonpath/plugin-*` package.
3. **RFC 9535 as a bundled plugin**: All official RFC 9535 features ship in `@jsonpath/plugin-rfc-9535`.
4. **Compatibility is explicit**: Drop-in API compatibility is delivered by `@jsonpath/compat-*` packages (no “legacy” bucket).
5. **Script expressions are sandboxed**: Script-based filters are delivered via a dedicated plugin using the `ses` npm package.
6. **CLI config is JSON only**: The CLI reads configuration from JSON only.
7. **Mutation is pointer-backed**: Mutation uses JSONPath to select targets and JSON Pointer / JSON Patch semantics to mutate.
8. **Validation is an ecosystem**: Validation is provided via `@jsonpath/plugin-validate` plus pluggable validator adapters.

---

## Table of Contents

1. [Package Structure](#1-package-structure)
2. [Core Framework API](#2-core-framework-api)
3. [Plugin System](#3-plugin-system)
4. [Official RFC 9535 Plugin](#4-official-rfc-9535-plugin)
5. [Compatibility Packages](#5-compatibility-packages)
6. [Script Expressions (SES)](#6-script-expressions-ses)
7. [Mutation (Pointer + Patch)](#7-mutation-pointer--patch)
8. [Validation Ecosystem](#8-validation-ecosystem)
9. [Security Model](#9-security-model)
10. [Performance Features](#10-performance-features)
11. [TypeScript Integration](#11-typescript-integration)
12. [CLI Interface (JSON Config Only)](#12-cli-interface-json-config-only)
13. [Related Standards Support](#13-related-standards-support)
14. [Testing & Compliance](#14-testing--compliance)
15. [Migration Guides](#15-migration-guides)
16. [Appendices](#16-appendices)

---

## 1. Package Structure

The ecosystem is published under the `@jsonpath` npm scope.

Publishing requirement:

- Every `@jsonpath/*` package must be published.

### 1.1 Framework Packages (No Features)

These packages must not implement JSONPath grammar or evaluation semantics. They are infrastructure only.

```
@jsonpath/core            # Engine framework: plugin composition, parsing pipeline, evaluation pipeline
@jsonpath/ast             # Shared AST node types (feature-agnostic)
@jsonpath/lexer           # Tokenization infrastructure (feature-agnostic)
@jsonpath/parser          # Parser infrastructure (feature-agnostic)
@jsonpath/printer         # AST-to-string infrastructure (feature-agnostic)
```

Notes:

- `@jsonpath/core` may export convenience “presets” only if they are expressed as plugin bundles (e.g., a preset that wires up `@jsonpath/plugin-rfc-9535`).
- `@jsonpath/ast` defines node shapes but not node semantics.

### 1.2 Official Plugin Packages

All features are implemented as plugins.

Minimum official plugin inventory (non-exhaustive; see Appendix A for proposed breakdown):

```
@jsonpath/plugin-rfc-9535            # ALL RFC 9535 features bundled
@jsonpath/plugin-script-expressions  # Script expressions using ses
@jsonpath/plugin-validate            # Validation orchestration for selected values

@jsonpath/plugin-result-types        # resultType adapters: value/path/pointer/node/parent/etc
@jsonpath/plugin-iregexp             # RFC 9485 (I-Regexp) support for regex filters
```

Rules:

- Every plugin package must be tree-shakeable.
- Plugins must declare their capabilities explicitly and avoid “hidden” side effects.

### 1.3 Compatibility Packages (Drop-in APIs)

Compatibility targets are expressed as separate packages with strict API contracts and rigorous testing.

```
@jsonpath/compat-jsonpath       # dchester/jsonpath API shape
@jsonpath/compat-jsonpath-plus  # jsonpath-plus API shape
```

Compatibility packages are not “feature packs”; they are adapters/presets + API surfaces that must behave as drop-in replacements.

### 1.4 Mutation and Pointer/Patch Packages

Mutation is separate from query evaluation, but relies on pointers and/or patch operations.

```
@jsonpath/pointer    # RFC 6901 JSON Pointer helpers
@jsonpath/patch      # RFC 6902 JSON Patch helpers
@jsonpath/mutate     # Mutation utilities: selection + pointer/patch-backed writes
```

### 1.5 Validator Adapter Packages

Validator adapters allow the validate plugin to integrate with external validator ecosystems.

```
@jsonpath/validator-json-schema  # JSON Schema adapter (e.g., Ajv)
@jsonpath/validator-zod          # Zod adapter
@jsonpath/validator-yup          # Yup adapter
```

Additional adapters may be published later (e.g., Valibot, TypeBox, io-ts), but are not required for initial release.

### 1.6 Convenience Bundle (Optional)

For convenience (and to reduce “which packages do I need?” friction), a meta-package may aggregate commonly used packages:

```
@jsonpath/complete
```

Constraints:

- `@jsonpath/complete` must not implement features; it only re-exports/pins plugin presets and wiring.

---

## 2. Core Framework API

### 2.1 Goals

`@jsonpath/core` provides:

- A plugin registry
- A parse pipeline that can be extended by plugins (lexer + parser hooks)
- An evaluation pipeline that can be extended by plugins (AST visitors)
- A stable, typed “Engine” abstraction used by compat packages and the CLI

`@jsonpath/core` does not provide:

- Any JSONPath grammar tokens
- Any JSONPath AST semantics
- Any built-in functions
- Any filter expression language

### 2.2 Primary Types

Core exports the following conceptual types (exact TS names are illustrative):

- `JsonPathEngine`
- `JsonPathPlugin`
- `JsonPathCompileResult`
- `JsonPathAst`
- `JsonPathEvaluationContext`
- `JsonPathResult<T>`

### 2.3 Engine Construction

The core entry point is an engine factory.

Conceptual API:

- `createEngine({ plugins, options })`
  - Builds a fully configured engine.
  - Throws if required plugin dependencies are missing or if there are capability conflicts.

### 2.4 Engine Operations

An engine supports:

- `compile(expression, compileOptions?)` → compiled query
- `parse(expression, parseOptions?)` → AST

Both synchronous and asynchronous evaluation must be available:

- `evaluateSync(compiledOrAst, json, evalOptions?)` → results
- `evaluateAsync(compiledOrAst, json, evalOptions?)` → results (async)

Notes:

- Plugins may participate in synchronous evaluation, asynchronous evaluation, or both.
- Compat packages must expose the same sync/async surface as their targeted upstream libraries.

Compat packages may additionally expose convenience methods like `query`, `paths`, `nodes`, etc., but those are not required in core.

### 2.5 Result Shapes

Core defines neutral, feature-agnostic result structures; plugins can add result “views” (e.g., pointer, path).

At minimum, the engine must be able to represent:

- `value`: selected JSON value
- `pointer`: RFC 6901 pointer to the value (if a pointer-capable plugin is installed)
- `path`: JSONPath string form (if a printer + path serializer plugin is installed)
- `node`: a structured record (value + location + parent metadata)

Location formatting contract:

- When a result view is enabled, its string formatting must be exact and stable.
- `pointer` outputs must be byte-for-byte RFC 6901-compatible.
- `path` outputs must be byte-for-byte stable and must follow the configured printer/serializer rules.
- For compat packages, pointer/path formatting must match the targeted upstream library exactly.

### 2.6 Errors

All public APIs must throw detailed errors on failures.

Requirements:

- Errors must be thrown as `Error` instances.
- Errors must include a human-readable message.
- Errors should carry a stable machine-readable identifier (e.g., `name` and/or `code`).
- Errors should include contextual metadata where available:
  - Expression
  - Input option snapshot (sanitized)
  - Pointer/path location (when relevant)
  - Parse location (line/column/offset) when applicable
  - Plugin identifier(s) involved
  - Underlying cause (via `cause`) where supported

Compat requirement:

- Compat packages must match the targeted upstream library’s error types, messages, and throw-vs-return behavior exactly.

---

## 3. Plugin System

### 3.1 Plugin Responsibilities

A `@jsonpath/plugin-*` package may provide one or more of:

- Lexer contributions (tokens, tokenization rules)
- Parser contributions (productions, precedence rules)
- AST node factories (node types defined in `@jsonpath/ast`)
- Evaluator contributions (evaluation semantics for node types)
- Function libraries (callable functions exposed in JSONPath)
- Filter expression evaluators (including sandboxed expressions)
- Result type adapters (value/path/pointer/node/parent etc.)

Plugin extensibility requirement:

- Plugins must be able to hook into core functionality to provide additional functionality broadly (within the constraints of deterministic composition and declared capabilities).
- Core must provide stable, documented extension points so plugins can add functionality at any stage, including engine creation/config validation, compile/parse, evaluation (sync and/or async), result shaping/serialization, and diagnostic/error enrichment.

### 3.2 Capability Model

Plugins must declare a machine-readable list of capabilities.

Examples:

- `grammar:rfc9535`
- `filter:comparison`
- `filter:regex`
- `result:pointer`
- `result:parent`
- `mutation:patch`
- `validate`

Core uses capabilities for:

- Conflict detection (two plugins claiming the same exclusive capability)
- Compatibility presets (ensuring required capabilities are installed)
- Security policy enforcement (e.g., scripts require explicit enabling)

### 3.3 Dependency Model

Plugins may declare:

- Hard dependencies (must be present)
- Optional dependencies (enhanced behavior if present)
- Peer dependencies (external libraries such as `ses` or Ajv)

### 3.4 Determinism and Ordering

Plugins must be composed deterministically.

Rules:

- Explicit plugin order must be preserved where precedence matters.
- In the absence of explicit order, plugins must be ordered by a stable key (e.g., plugin id).
- Parse/eval results must not depend on non-deterministic iteration.

### 3.5 Configuration

Plugins must have explicit configuration surfaces.

Core must support per-engine plugin config via:

- `engineOptions.plugins[pluginId] = { ... }`

---

## 4. Official RFC 9535 Plugin

### 4.1 Package

`@jsonpath/plugin-rfc-9535` provides full RFC 9535 parsing and evaluation semantics.

Constraint:

- **All** RFC 9535 features must be implemented inside this plugin (or its internal dependencies that are also plugins).

### 4.2 Included Features

This plugin bundles all RFC 9535-defined selectors and expressions, including (high-level):

- Root selector
- Current node selector
- Child member selector
- Array index selector
- Wildcard selector
- Union selector
- Descendant selector (recursive)
- Filter selector as defined by RFC 9535 (non-script)
- RFC-defined functions

### 4.3 Preset

For convenience, the RFC plugin may export a preset helper (still “just wiring”):

- `createRfc9535Engine()` which internally calls `createEngine({ plugins: [pluginRfc9535, ...minimalResultPlugins] })`.

---

## 5. Compatibility Packages

### 5.1 Compatibility Philosophy

Compatibility is expressed as drop-in, API-identical packages:

- No “legacy” umbrella.
- Each compat package targets a specific public API and semantics.
- Each compat package must be validated by rigorous tests (see Testing & Compliance).

Targeting policy (latest upstream):

- Each compat package release must target the latest released upstream version available at the time the compat package is published.
- Each compat package release must pin (and test against) that exact upstream version.
- “Latest” is evaluated at publish time; it is not a floating runtime dependency.

### 5.2 @jsonpath/compat-jsonpath (dchester/jsonpath)

Target API surface:

- `query(obj, expr, count?)`
- `paths(obj, expr, count?)`
- `nodes(obj, expr, count?)`
- `value(obj, expr, newValue?)`
- `parent(obj, expr)`
- `apply(obj, expr, fn)`
- `parse(expr)`
- `stringify(pathArray)`

Drop-in requirement:

- This package must be a true 1:1 drop-in replacement for the targeted upstream `jsonpath` release.
- Users must be able to change only the import path (to `@jsonpath/compat-jsonpath`) and make no other code or configuration changes.

Must-match behavior:

| Area               | Requirement                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Exports            | Named exports and call signatures must match the target API                                     |
| Result ordering    | Output ordering must match the target library                                                   |
| `query`            | Must match values returned and how many results are returned                                    |
| `paths`            | Must match path format and ordering                                                             |
| `nodes`            | Must match node record shape and ordering                                                       |
| `value`            | Must match getter/setter behavior (including whether it targets the first match or all matches) |
| `parent`           | Must match which parent is returned and how “root” is handled                                   |
| `apply`            | Must match which nodes are transformed and how callback results are applied                     |
| Parse errors       | Must match error categories for invalid expressions                                             |
| Filter expressions | Must match accepted expression subset and semantics used by the target library                  |

Implementation constraints:

- Must be backed by a `@jsonpath/core` engine configured with the minimum plugins required to match behavior.
- If the target library uses restricted expression evaluation, compat must match that behavior.
- If SES is used internally to implement the expression subset, compat must not broaden what expressions can do.

### 5.3 @jsonpath/compat-jsonpath-plus (jsonpath-plus)

Target API surface:

- `JSONPath({ path, json, ...options })` callable
- Options including `resultType`, `wrap`, and other well-known flags

Drop-in requirement:

- This package must be a true 1:1 drop-in replacement for the targeted `jsonpath-plus` release.
- Users must be able to change only the import path (to `@jsonpath/compat-jsonpath-plus`) and make no other code or configuration changes.
- Defaults, option names, option defaults, output formats, error behavior, and supported extensions must match how the targeted upstream library behaves out of the box.
- The compat package must implement **every** upstream option and flag supported by the targeted upstream version (including undocumented options, quirks, and edge-case behaviors).

Target version and defaults:

- The compat package must explicitly target a specific upstream `jsonpath-plus` version.
- The compat test harness must run the same corpus against that exact upstream version and assert behavioral equivalence.
- Any divergence from upstream defaults is forbidden; if a behavior needs to differ, it must be released as a different compat target (new package or a versioned compat profile).

Option-surface requirement:

- The compat package must accept the complete upstream options object shape.
- Unknown properties must be handled exactly as the upstream library handles them (ignore vs warn vs throw).

Notable compatibility expectations:

- Support for `resultType` variants common in the ecosystem, including pointer-oriented outputs.
- Support for compatibility selectors/extensions if they are part of the targeted API behavior.

Must-match behavior:

| Area                    | Requirement                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Callable                | `JSONPath(options)` shape must match target (accepts `path` and `json`)            |
| Options surface         | Must accept and honor every upstream option/flag supported by the targeted version |
| `resultType`            | Must match supported `resultType` values and output formats                        |
| `wrap`                  | Must match wrapping behavior for single vs multiple results                        |
| `flatten`               | If supported by the target API, must match flattening behavior                     |
| Pointer outputs         | When `resultType` implies pointers, pointers must be RFC 6901-compatible           |
| Parent outputs          | If compat advertises parent/parentProperty outputs, they must match exactly        |
| Eval / sandbox controls | Must match the target’s evaluation enable/disable behavior and error modes         |
| `ignoreEvalErrors`      | Must match whether eval failures throw vs drop matches                             |
| Result ordering         | Must match target ordering and stability                                           |

Notes:

- If the targeted `jsonpath-plus` release ships with particular extensions enabled by default, `@jsonpath/compat-jsonpath-plus` must include them by default.
- If the targeted `jsonpath-plus` release ships with a particular script evaluation policy by default, `@jsonpath/compat-jsonpath-plus` must match it (while still enforcing SES isolation).

Minimum internal composition:

- `@jsonpath/plugin-rfc-9535` (baseline)
- `@jsonpath/plugin-result-types` (or equivalent per-result plugins)

Conditional composition:

- `@jsonpath/plugin-script-expressions` must be included/enabled if (and only if) the targeted upstream `jsonpath-plus` behavior requires it by default.
- Plugins for `jsonpath-plus` extensions must be included/enabled if (and only if) the targeted upstream `jsonpath-plus` behavior includes them by default.

#### Compat feature coverage matrix

This matrix defines what `@jsonpath/compat-jsonpath-plus` is expected to wire by default for a true drop-in replacement of the targeted `jsonpath-plus` release.

| Feature / Syntax                                     | Plugin(s)                                                    | Coverage                | Notes                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| RFC 9535 baseline                                    | `@jsonpath/plugin-rfc-9535`                                  | Required                | Required for all queries                                                                  |
| Result types (`value`, `path`, `pointer`, node-like) | `@jsonpath/plugin-result-types` (or per-result plugins)      | Required                | Must match `resultType` outputs and formatting                                            |
| Pointer outputs                                      | `@jsonpath/plugin-result-pointer`                            | Required                | Required if the compat package advertises `pointer` resultType                            |
| Script evaluation in filters                         | `@jsonpath/plugin-script-expressions`                        | Required (per upstream) | Must match upstream defaults; evaluation must still be SES-isolated per Compartment       |
| Parent selector (`^`)                                | `@jsonpath/plugin-parent-selector`                           | Required (per upstream) | Must match upstream defaults and semantics                                                |
| Property-name selector (`~`)                         | `@jsonpath/plugin-property-name-selector`                    | Required (per upstream) | Must match upstream defaults and semantics                                                |
| Type selectors (`@string()`, etc.)                   | `@jsonpath/plugin-type-selectors`                            | Required (per upstream) | Must match upstream defaults and semantics                                                |
| I-Regexp regex semantics                             | `@jsonpath/plugin-iregexp` + `@jsonpath/plugin-filter-regex` | Optional                | Include if the compat contract includes regex-match operators and their precise semantics |

### 5.4 Compatibility Test Contract

Each compat package must provide:

- A test suite that asserts:
  - API shape (exports and signatures)
  - Behavior equivalence across a shared test corpus
  - Stable output ordering rules (when the target library specifies them)

Recommended additions:

- A conformance harness that can run the same corpus against the upstream library and the compat package.
- Snapshot tests for path/pointer formatting.

---

## 6. Script Expressions (SES)

### 6.1 Package

`@jsonpath/plugin-script-expressions` enables script-based expressions in filter selectors.

Constraint:

- This capability must be **opt-in** and must not be bundled in `@jsonpath/plugin-rfc-9535`.

### 6.2 Security Baseline

Script evaluation must be sandboxed using `ses`.

Required primitives:

- `lockdown()` to harden intrinsics
- `Compartment` for isolated evaluation
- `harden()` for deep-freezing endowments and shared objects

Best-practice requirement:

- The implementation must follow current SES best practices for hardening.
- `lockdown()` should be applied once per process/realm (as early as practical) and treated as an idempotent, global hardening step.
- Each evaluation must run inside a fresh `Compartment` (compartment-per-evaluation) with explicit, hardened endowments.

### 6.3 Execution Model

The plugin must support:

- Compartment-per-evaluation (required)
- Explicit endowments only (no ambient globals)
- A strict policy for what data the script can access:
  - Current value
  - Root
  - Parent (if available)
  - Path/pointer metadata (if installed)

### 6.4 Policy and Configuration

The plugin must expose configuration for:

- Allowed endowments
- Timeout/cancellation strategy (where supported by environment)
- Error handling mode (throw vs ignore-eval-errors)

Non-goals:

- The plugin is not required to be “perfectly safe” in every JS runtime, but must follow SES best practices and document environment caveats.

---

## 7. Mutation (Pointer + Patch)

### 7.1 Philosophy

Mutation is expressed as:

1. **Selection** using JSONPath (querying targets)
2. **Addressing** using JSON Pointer (RFC 6901)
3. **Application** using JSON Patch semantics (RFC 6902) or pointer-directed `set`/`remove`

This avoids “mystery mutation” and provides auditable, testable changes.

### 7.2 @jsonpath/mutate

`@jsonpath/mutate` provides ergonomic mutation APIs, but must remain pointer/patch-backed.

Core requirements:

- Must be able to produce stable pointers for selected nodes (requires a pointer-capable result plugin).
- Must apply changes via:
  - `@jsonpath/pointer` for direct set/remove operations, and/or
  - `@jsonpath/patch` for RFC 6902 operations

Recommended operations:

- `set(json, jsonPath, value)`
- `remove(json, jsonPath)`
- `replace(json, jsonPath, value)`
- `applyPatch(json, patch)`
- `diff(before, after)` (optional)

Mutation targeting requirement:

- `set` / `remove` / `replace` must apply to **all** JSONPath matches.
- If callers want a narrower effect, they must provide a more specific selector.

Ordering note:

- The API does not guarantee a specific application order for multiple matches.
- Implementations should still apply mutations deterministically (but the exact order is not part of the public contract).

### 7.3 Prototype Pollution Hardening

Mutation and patch application must implement prototype-pollution mitigations.

Minimum requirement:

- Reject or safely short-circuit pointer tokens that would traverse or assign to `__proto__`, `constructor`, or `prototype`.

---

## 8. Validation Ecosystem

### 8.1 @jsonpath/plugin-validate

This plugin orchestrates validation of values selected by JSONPath.

It must support:

- Validating each selected value
- Emitting structured validation results (errors with location metadata)
- Optional “fail-fast” behavior
- Optional “annotate results” behavior

Schema strictness requirement:

- Validation must follow the strictness of the provided schema.
- If the schema allows unknown properties, validation must pass those unknown properties.
- If the schema disallows unknown properties, validation must fail when unknown properties are present.
- Validator adapters must not silently “loosen” or “tighten” unknown-property behavior beyond what the schema/validator specifies.

### 8.2 Validator Interface

Validator adapters must implement a common interface (conceptual):

- `validate(value, context) -> { ok: true } | { ok: false, issues: Issue[] }`

Where `context` includes:

- JSON Pointer to value (if available)
- JSONPath string/path array (if available)
- Root/parent metadata (if available)
- Engine/plugin metadata

### 8.3 Adapter Packages

Required adapters (initial):

- `@jsonpath/validator-json-schema`
  - Uses a JSON Schema validator (e.g., Ajv) for runtime validation.
- `@jsonpath/validator-zod`
  - Uses Zod schemas for runtime validation.
- `@jsonpath/validator-yup`
  - Uses Yup schemas for runtime validation.

Adapter requirements:

- Do not leak validator-specific error formats; map to the common `Issue` shape.
- Support caching compiled validators where applicable.

---

## 9. Security Model

### 9.1 Secure Defaults

Defaults must prioritize safety:

- No script evaluation unless `@jsonpath/plugin-script-expressions` is installed and enabled by the chosen engine/compat profile
- No mutation unless `@jsonpath/mutate` is used
- Prototype pollution mitigations enabled by default in pointer/patch/mutation packages

Compat packages exception:

- Compat packages must still match their targeted upstream behavior out of the box.
- If an upstream library evaluates scripts by default, the compat package may enable script evaluation by default, but must do so only via SES and with compartment-per-evaluation isolation.

### 9.2 Capability-Gated Risk

Capabilities that increase risk must be discoverable and configurable:

- `filter:script`
- `mutation:*`

Engines and compat packages must be able to expose a “security profile” describing which risky capabilities are active.

---

## 10. Performance Features

### 10.1 Compilation and Caching

The framework must support:

- Precompiling expressions to AST
- Caching compiled representations
- Re-using compiled queries across many documents

### 10.2 Multi-Query Optimization (Optional)

The ecosystem may provide an optional plugin or package that can evaluate multiple compiled expressions in a single traversal (inspired by callback-based engines in the ecosystem).

Constraints:

- Any reordering or changed match semantics must be explicit and tested.

---

## 11. TypeScript Integration

### 11.1 Goals

- Provide a typed engine API
- Provide typed result shapes
- Allow validators to narrow result types (when using TS-first validators)

### 11.2 Result Typing

At minimum:

- `evaluateSync<TOut = unknown>(...)` and `evaluateAsync<TOut = unknown>(...)` should allow callers to type the output where they have external knowledge.
- Validator adapters may optionally expose helpers that infer types from schemas.

---

## 12. CLI Interface (JSON Config Only)

### 12.1 Package

```
@jsonpath/cli
```

### 12.2 Configuration Format

CLI configuration must be JSON only.

Allowed examples:

- `jsonpath.config.json`
- `.jsonpathrc.json`

Disallowed:

- YAML
- TOML

### 12.3 Configuration Shape (Conceptual)

The config must support specifying:

- Engine preset (e.g., RFC 9535)
- Plugin list and plugin options
- Query expression(s)
- Result type formatting
- Optional validation and mutation steps

The exact schema is an implementation detail, but must remain JSON.

### 12.4 CLI Behavior (Best Practices)

The CLI must follow common CLI best practices:

- Inputs: accept JSON from stdin and/or a file path; explicit CLI args must take precedence over implicit stdin.
- Outputs: write results to stdout and diagnostics/errors to stderr.
- Defaults: default output should be machine-readable JSON.
- Exit codes: return `0` on success; return non-zero on failure (parse errors, invalid config, validation failures, or mutation failures).

Validation integration:

- Validation is applied to each match individually (not to the entire result set), unless a specific CLI mode explicitly documents otherwise.

---

## 13. Related Standards Support

The ecosystem explicitly targets:

- RFC 9535 (JSONPath)
- RFC 6901 (JSON Pointer)
- RFC 6902 (JSON Patch)
- RFC 9485 (I-Regexp)

---

## 14. Testing & Compliance

### 14.1 RFC 9535 Compliance

`@jsonpath/plugin-rfc-9535` must be verified against:

- RFC 9535 test vectors (where available)
- A maintained conformance suite living in the repo

### 14.2 Compatibility Testing

Compat packages must be validated by:

- A shared test corpus of JSON documents and queries
- Fixture-based snapshots
- Property-based testing for critical invariants (optional)
- Regression tests imported or adapted from target libraries (where feasible)

### 14.3 Security Regression Tests

At minimum:

- Tests asserting prototype pollution is prevented in mutation/patch application
- Tests asserting scripts are disabled unless explicitly enabled

---

## 15. Migration Guides

Migration is expressed as “choose a compat package”:

- From `jsonpath` (dchester): use `@jsonpath/compat-jsonpath`
- From `jsonpath-plus`: use `@jsonpath/compat-jsonpath-plus`

For users who can migrate to standards-first behavior directly:

- Use `@jsonpath/plugin-rfc-9535` with a minimal engine preset

---

## 16. Appendices

### Appendix A: Official Plugin Inventory (One Feature per Plugin)

This is the official published plugin list.

Rules:

- `@jsonpath/plugin-rfc-9535` is a bundle that depends on the RFC feature plugins below.
- RFC feature behavior must live in the feature plugins, not in `@jsonpath/plugin-rfc-9535` itself.
- Non-RFC behavior must not be pulled into `@jsonpath/plugin-rfc-9535`.
- Every `@jsonpath/*` package must be published.

#### A.1 RFC 9535 Syntax Plugins

```
@jsonpath/plugin-syntax-root                 # `$`
@jsonpath/plugin-syntax-current              # `@`
@jsonpath/plugin-syntax-child-member         # `.name` and `['name']`
@jsonpath/plugin-syntax-child-index          # `[0]`
@jsonpath/plugin-syntax-wildcard             # `*`
@jsonpath/plugin-syntax-union                # union selectors
@jsonpath/plugin-syntax-descendant           # `..`
@jsonpath/plugin-syntax-filter               # filter selector form
```

#### A.2 RFC 9535 Filter Semantics Plugins (Non-Script)

```
@jsonpath/plugin-filter-literals             # string/number/boolean/null literals
@jsonpath/plugin-filter-comparison           # comparison operators as defined by RFC bundle
@jsonpath/plugin-filter-boolean              # boolean operators as defined by RFC bundle
@jsonpath/plugin-filter-existence            # existence/truthiness rules (where RFC-defined)
@jsonpath/plugin-filter-functions            # calling RFC-defined functions in filters
@jsonpath/plugin-filter-regex                # regex operator wiring (paired with iregexp plugin)
```

Note:

- Script evaluation is intentionally excluded here and is provided by `@jsonpath/plugin-script-expressions`.

#### A.3 RFC 9535 Functions Plugins

RFC function support must be delivered as plugins.

Minimum:

```
@jsonpath/plugin-functions-core              # RFC-defined core function set
```

If the RFC function set is large, split by domain:

```
@jsonpath/plugin-functions-strings
@jsonpath/plugin-functions-numbers
@jsonpath/plugin-functions-arrays
@jsonpath/plugin-functions-objects
```

#### A.4 Result and Location Plugins

Result “views” are plugins so that compat packages can select exactly what they need.

```
@jsonpath/plugin-result-value                # values
@jsonpath/plugin-result-node                 # node records (value + metadata)
@jsonpath/plugin-result-path                 # JSONPath string serialization
@jsonpath/plugin-result-pointer              # JSON Pointer serialization (RFC 6901)
@jsonpath/plugin-result-parent               # parent/parentProperty outputs (where supported)
@jsonpath/plugin-result-types                # convenience aggregator for result plugins
```

#### A.5 Standards-Adjacent Plugins

```
@jsonpath/plugin-iregexp                     # RFC 9485 I-Regexp
```

#### A.6 Security and Tooling Plugins

```
@jsonpath/plugin-script-expressions          # SES-based script evaluation
@jsonpath/plugin-validate                    # validation orchestration
```

#### A.7 Non-RFC Extension Plugins (Optional)

These are intentionally not part of the RFC bundle.

```
@jsonpath/plugin-parent-selector
@jsonpath/plugin-property-name-selector
@jsonpath/plugin-type-selectors
```

### Appendix B: Terminology

- **Engine**: A configured instance of `@jsonpath/core` with a set of plugins.
- **Plugin**: A package contributing grammar, semantics, results, or tooling.
- **Compat package**: A drop-in API replacement for an existing library.
  store: {
  name: string;
  books: Book[];
  };
  }

// Type-safe queries
const titles = query<string>('$.store.books[*].title', data);
// Type: string[]

const books = query<Book>('$.store.books[*]', data);
// Type: Book[]

// Compile with types
const findBooks = compile<Book, Store>('$.store.books[*]');
const result = findBooks.query(storeData);
// Type: Book[]

````

### 9.2 Path Type Safety (Experimental)

```typescript
import { typedPath, TypedQuery } from '@jsonpath/core';

// Create type-checked path builder
const path = typedPath<Store>();

// IDE autocomplete and type checking
const bookPath = path.store.books.$all.title;
// Inferred type: TypedPath<string>

// Execute with full type safety
const titles = bookPath.query(data);
// Type: string[]

// Invalid paths caught at compile time
const invalid = path.store.invalid; // TypeScript error!
````

### 9.3 Result Type Guards

```typescript
import { query, isNodeList, isValue, NodeList } from '@jsonpath/core';

const result = query('$.store.books', data);

if (isNodeList(result)) {
	// Type narrowed to NodeList<unknown>
	result.forEach((node) => console.log(node.path));
}

if (isValue<Book[]>(result)) {
	// Type narrowed to Book[]
	result.forEach((book) => console.log(book.title));
}
```

### 9.4 Extension Type Definitions

```typescript
import { defineFunction, FunctionSignature } from '@jsonpath/core';

// Fully typed function definition
const uppercase = defineFunction<
	[string], // Parameter types
	string // Return type
>({
	name: 'uppercase',
	signature: '(string) -> string' as FunctionSignature,
	implementation: (value) => value.toUpperCase(), // value is typed as string
});

// Type-safe custom extension
interface CustomExtension extends Extension {
	functions: {
		uppercase: typeof uppercase;
		lowercase: FunctionDefinition<[string], string>;
	};
}
```

### 9.5 Declaration Merging

```typescript
// Extend built-in types
declare module '@jsonpath/core' {
	interface FunctionRegistry {
		myCustomFunction: (value: string) => number;
	}

	interface SelectorRegistry {
		'^^': ParentSelector;
	}
}
```

---

## 10. CLI Interface

### 10.1 Installation and Basic Usage

```bash
# Global installation
npm install -g @jsonpath/cli

# Query JSON file
jsonpath '$.store.books[*].title' data.json

# Query from stdin
cat data.json | jsonpath '$.store.books[*]'

# Query URL
jsonpath '$.results[*]' --url https://api.example.com/data

# Multiple queries
jsonpath -q '$.name' -q '$.age' -q '$.email' data.json
```

### 10.2 Output Formats

```bash
# JSON output (default)
jsonpath '$.store.books[*]' data.json

# Pretty-printed JSON
jsonpath '$.store.books[*]' data.json --pretty

# Compact single-line
jsonpath '$.store.books[*]' data.json --compact

# Line-delimited JSON (NDJSON)
jsonpath '$.store.books[*]' data.json --ndjson

# CSV output
jsonpath '$.store.books[*]' data.json --csv

# Only paths
jsonpath '$.store.books[*]' data.json --paths

# Only count
jsonpath '$.store.books[*]' data.json --count

# Raw values (no JSON encoding)
jsonpath '$.store.name' data.json --raw
```

### 10.3 Advanced Options

```bash
# Compatibility mode
jsonpath '$.books[(@.length-1)]' data.json --mode goessner

# With extensions
jsonpath '$.books[*].author^' data.json --ext parent

# Mutation operations
jsonpath '$.store.books[*].price' data.json --set 19.99
jsonpath '$.store.books[*].price' data.json --update 'x => x * 1.1'
jsonpath '$.store.books[?@.outOfStock]' data.json --delete

# Filter and transform
jsonpath '$.store.books[*]' data.json | jq '.title'

# Validate path syntax
jsonpath --validate '$.store.books[*]'

# Show parsed AST
jsonpath --ast '$.store.books[?@.price > 10]'

# Benchmark query
jsonpath --benchmark '$.store.books[*]' data.json --iterations 1000
```

### 10.4 Interactive Mode

```bash
# Start REPL
jsonpath --repl data.json

> $.store.name
"My Bookstore"

> $.store.books[*].title
["Dune", "1984", "Brave New World"]

> :set mode goessner
Mode set to: goessner

> :load other-data.json
Loaded: other-data.json

> :help
Available commands:
  :load <file>    Load JSON file
  :set <option>   Set option
  :mode <mode>    Set compatibility mode
  :ast            Show AST of last query
  :explain        Explain last query execution
  :quit           Exit REPL
```

### 10.5 Configuration File

```yaml
# .jsonpathrc.yml
defaults:
  mode: rfc9535
  pretty: true
  maxDepth: 50

extensions:
  - parent
  - typeSelectors

aliases:
  books: '$.store.books[*]'
  authors: '$.store.books[*].author'

scripts:
  expensive: '$.store.books[?@.price > 20]'
```

---

## 11. Related Standards Support

### 11.1 JSON Pointer (RFC 6901)

```typescript
import { pointer } from '@jsonpath/pointer';

// Get value at pointer
const value = pointer.get(data, '/store/books/0/title');

// Set value at pointer
pointer.set(data, '/store/books/0/title', 'New Title');

// Check if pointer exists
const exists = pointer.has(data, '/store/books/0/isbn');

// Convert between formats
const jsonpath = pointer.toJSONPath('/store/books/0/title');
// => '$.store.books[0].title'

const ptr = pointer.fromJSONPath('$.store.books[0].title');
// => '/store/books/0/title'

// Compile for reuse
const compiled = pointer.compile('/store/books/0');
compiled.get(data);
compiled.set(data, newValue);
```

### 11.2 JSON Patch (RFC 6902)

```typescript
import { patch, diff } from '@jsonpath/patch';

// Apply patch operations
const patched = patch.apply(data, [
	{ op: 'add', path: '/store/books/-', value: newBook },
	{ op: 'replace', path: '/store/name', value: 'New Name' },
	{ op: 'remove', path: '/store/books/0' },
	{ op: 'move', from: '/store/temp', path: '/store/permanent' },
	{ op: 'copy', from: '/store/template', path: '/store/new' },
	{ op: 'test', path: '/store/active', value: true },
]);

// Generate patch from differences
const changes = diff(originalData, modifiedData);
// Returns array of patch operations

// Apply patch with JSONPath selectors (extension)
const patched = patch.applyWithJSONPath(data, [
	{ op: 'replace', jsonpath: '$.store.books[*].price', value: 9.99 },
	{ op: 'remove', jsonpath: '$.store.books[?@.outOfStock]' },
]);
```

### 11.3 JSON Schema Integration

```typescript
import { query } from '@jsonpath/core';
import { withSchema } from '@jsonpath/schema';

// Validate results against schema
const engine = withSchema(createEngine(), bookSchema);

const books = engine.query('$.store.books[*]', data);
// Throws if results don't match schema

// Generate JSONPath from schema
import { schemaToPath } from '@jsonpath/schema';
const paths = schemaToPath(schema, {
	target: 'required', // Find all required fields
	depth: 3,
});
```

---

## 12. Migration Guides

### 12.1 From jsonpath (dchester)

```typescript
// Before (jsonpath)
import jp from 'jsonpath';
const result = jp.query(data, '$.store.books[*].author');
const paths = jp.paths(data, '$.store.books[*]');
const nodes = jp.nodes(data, '$.store.books[*]');
const applied = jp.apply(data, '$.store.books[*].price', (v) => v * 0.9);

// After (@jsonpath/core)
import { query, paths, nodes } from '@jsonpath/core';
import { mutate } from '@jsonpath/mutate';

const result = query('$.store.books[*].author', data);
const pathList = paths('$.store.books[*]', data);
const nodeList = nodes('$.store.books[*]', data);
mutate.update(data, '$.store.books[*].price', (v) => v * 0.9);

// Or use drop-in adapter
import { JSONPath } from '@jsonpath/legacy/jsonpath';
// Same API as before
```

**Key differences:**

- Argument order: path first, then data
- `apply()` → `mutate.update()`
- Better TypeScript types
- No prototype pollution vulnerability

### 12.2 From jsonpath-plus

```typescript
// Before (jsonpath-plus)
import { JSONPath } from 'jsonpath-plus';
const result = JSONPath({
	path: '$.store.books[*]',
	json: data,
	resultType: 'value',
	wrap: true,
	callback: (value, type, payload) => {
		/* ... */
	},
});

// After (@jsonpath/core)
import { query } from '@jsonpath/core';
import { parentSelector, typeSelectors } from '@jsonpath/extensions';

const engine = createEngine({
	extensions: [parentSelector, typeSelectors],
});

const result = engine.query('$.store.books[*]', data);

// For parent selector (^)
const parents = engine.query('$.store.books[*].author^', data);

// For type selectors
const strings = engine.query('$..@string()', data);

// Or use drop-in adapter
import { JSONPath } from '@jsonpath/legacy/jsonpath-plus';
// Same API as before
```

**Key differences:**

- Options object → Simple function call with optional config
- `resultType` → Use different functions (`query`, `paths`, `nodes`)
- Parent/type selectors require extension import
- No callback support (use streaming API instead)

### 12.3 From json-p3

```typescript
// Before (json-p3)
import { JSONPathEnvironment } from 'json-p3';
const env = new JSONPathEnvironment();
const result = env.findall('$.store.books[*]', data);

// After (@jsonpath/core)
import { query } from '@jsonpath/core';
const result = query('$.store.books[*]', data);

// Custom functions work similarly
import { defineFunction, registerFunctions } from '@jsonpath/core';
const myFunc = defineFunction({
	/* ... */
});
const engine = createEngine({
	functions: registerFunctions([myFunc]),
});
```

**Key differences:**

- No environment wrapper needed for basic usage
- JSON Pointer/Patch in separate packages
- Identical RFC 9535 compliance

### 12.4 From nimma

```typescript
// Before (nimma)
import Nimma from 'nimma';
const nimma = new Nimma(['$.info', '$.paths[*]']);
nimma.query(data, {
	'$.info': (result) => console.log(result),
	'$.paths[*]': (result) => console.log(result),
});

// After (@jsonpath/core)
import { createQuerySet } from '@jsonpath/core';

const queries = createQuerySet([
	{ name: 'info', path: '$.info' },
	{ name: 'paths', path: '$.paths[*]' },
]);

const results = queries.execute(data);
console.log(results.info);
console.log(results.paths);
```

**Key differences:**

- Named results instead of callback-per-path
- Same multi-query optimization benefits
- Full RFC 9535 compliance

---

## 13. Implementation Notes

### 13.1 Parser Architecture

The parser uses a multi-stage pipeline:

```
Input → Lexer → Token Stream → Parser → AST → Optimizer → Executable
```

**Lexer**: Hand-written for performance, zero dependencies
**Parser**: Recursive descent with Pratt parsing for expressions
**AST**: Immutable, typed node structure
**Optimizer**: Constant folding, dead code elimination, query simplification
**Executable**: Compiled visitor pattern for traversal

### 13.2 Memory Management

- Structural sharing for immutable operations
- WeakMap-based caching for compiled queries
- Lazy evaluation to minimize intermediate allocations
- Streaming support for large documents

### 13.3 Error Recovery

The parser implements error recovery for better developer experience:

```typescript
// Provides helpful error messages
query('$.store.books[*].', data);
// JSONPathSyntaxError: Unexpected end of input
//   Expected: property name or bracket notation
//   At: $.store.books[*].
//                        ^

// Suggests corrections
query('$.store.book[*]', data, { suggest: true });
// Warning: 'book' not found. Did you mean 'books'?
```

### 13.4 Browser Support

| Browser | Version |
| ------- | ------- |
| Chrome  | 80+     |
| Firefox | 75+     |
| Safari  | 13.1+   |
| Edge    | 80+     |
| Node.js | 16+     |
| Deno    | 1.0+    |
| Bun     | 1.0+    |

### 13.5 Build Targets

```
dist/
├── esm/           # ES Modules (tree-shakeable)
├── cjs/           # CommonJS
├── umd/           # UMD (browser global)
├── types/         # TypeScript declarations
└── browser/       # Browser bundle (minified)
```

---

## Appendices

### Appendix A: Complete Syntax Reference

```
jsonpath      = "$" segments
segments      = segment*
segment       = child-segment / descendant-segment

child-segment = ("." (member / wildcard)) / ("[" selector ("," selector)* "]")
descendant-segment = ".." (member / wildcard / "[" selector ("," selector)* "]")

member        = identifier / string-literal
identifier    = (ALPHA / "_") (ALPHA / DIGIT / "_")*
string-literal = "'" string-char* "'" / '"' string-char* '"'

wildcard      = "*"

selector      = name-selector
              / index-selector
              / slice-selector
              / filter-selector
              / wildcard-selector

name-selector = string-literal
index-selector = integer
slice-selector = [integer] ":" [integer] [":" [integer]]
filter-selector = "?" filter-expression
wildcard-selector = "*"

filter-expression = logical-or-expr
logical-or-expr = logical-and-expr ("||" logical-and-expr)*
logical-and-expr = basic-expr ("&&" basic-expr)*
basic-expr = paren-expr / comparison-expr / test-expr
paren-expr = "(" filter-expression ")"
comparison-expr = comparable comparator comparable
test-expr = ["!"] (filter-query / function-expr)

comparator = "==" / "!=" / "<" / "<=" / ">" / ">="

comparable = literal
           / singular-query
           / function-expr

literal = number / string-literal / "true" / "false" / "null"

singular-query = rel-query / abs-query
rel-query = "@" segments
abs-query = "$" segments

filter-query = rel-query / abs-query

function-expr = function-name "(" [function-arg ("," function-arg)*] ")"
function-name = identifier
function-arg = literal / filter-query / function-expr / logical-expr

integer = ["-"] ("0" / (DIGIT1 DIGIT*))
number = integer ["." DIGIT+] [("e" / "E") ["+" / "-"] DIGIT+]
```

### Appendix B: RFC 9535 Compliance Checklist

| Requirement            | Status | Notes                 |
| ---------------------- | ------ | --------------------- |
| Root identifier ($)    | ✅     |                       |
| Current node (@)       | ✅     | In filter expressions |
| Child member (.)       | ✅     |                       |
| Bracket notation ([])  | ✅     |                       |
| Wildcard (\*)          | ✅     |                       |
| Recursive descent (..) | ✅     |                       |
| Array index            | ✅     | Positive and negative |
| Array slice            | ✅     | [start:end:step]      |
| Filter expressions     | ✅     | [?expression]         |
| Union selectors        | ✅     | [a, b, c]             |
| length() function      | ✅     |                       |
| count() function       | ✅     |                       |
| match() function       | ✅     | I-Regexp              |
| search() function      | ✅     | I-Regexp              |
| value() function       | ✅     |                       |
| I-Regexp (RFC 9485)    | ✅     |                       |
| Normalized paths       | ✅     |                       |
| No script expressions  | ✅     | Core only             |

### Appendix C: Extension Registry

| Extension              | Package              | Description                    |
| ---------------------- | -------------------- | ------------------------------ |
| `parentSelector`       | @jsonpath/extensions | `^` parent navigation          |
| `propertyNameSelector` | @jsonpath/extensions | `~` property names             |
| `typeSelectors`        | @jsonpath/extensions | `@string()`, `@number()`, etc. |
| `stringFunctions`      | @jsonpath/extensions | String manipulation            |
| `mathFunctions`        | @jsonpath/extensions | Mathematical operations        |
| `arrayFunctions`       | @jsonpath/extensions | Array utilities                |
| `dateFunctions`        | @jsonpath/extensions | Date/time handling             |
| `regexOperators`       | @jsonpath/extensions | `=~` regex matching            |
| `scriptExpressions`    | @jsonpath/legacy     | Sandboxed scripts              |

### Appendix D: Performance Benchmarks

Benchmark methodology: 10,000 iterations, Node.js 20, Intel i7-12700K

| Query             | @jsonpath/core | jsonpath-plus | jsonpath | json-p3 |
| ----------------- | -------------- | ------------- | -------- | ------- |
| Simple child      | 0.8μs          | 1.2μs         | 2.1μs    | 0.9μs   |
| Recursive descent | 12μs           | 18μs          | 45μs     | 14μs    |
| Filter expression | 25μs           | 35μs          | 89μs     | 28μs    |
| Complex query     | 85μs           | 120μs         | 250μs    | 92μs    |
| Compiled (reuse)  | 0.3μs          | 0.8μs         | N/A      | 0.4μs   |

### Appendix E: Security Audit Checklist

| Vulnerability         | Mitigation                      |
| --------------------- | ------------------------------- |
| Prototype pollution   | Object.freeze, null prototypes  |
| eval() injection      | Sandboxed Function, no eval     |
| ReDoS                 | I-Regexp subset, timeout limits |
| DoS via recursion     | Max depth limits                |
| DoS via large results | Max results limit               |
| Memory exhaustion     | Streaming, lazy evaluation      |

---

## Version History

| Version    | Date    | Changes               |
| ---------- | ------- | --------------------- |
| 1.0.0-spec | 2024-XX | Initial specification |

---

## Contributing

This specification is open for community input. Key areas for feedback:

1. API ergonomics and naming conventions
2. Extension system flexibility vs complexity
3. Performance optimization strategies
4. Additional compatibility requirements
5. TypeScript type system enhancements

---

## License

MIT License

Copyright (c) 2024 @jsonpath Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
