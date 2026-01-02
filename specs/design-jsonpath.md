---
title: Plugin-First JSONPath Ecosystem (JS/TS) — Implementation-Aligned Spec
version: 2026-01
date_created: 2026-01-02
last_updated: 2026-01-02
owner: @lellimecnar
tags: [design, tool, jsonpath, rfc9535, packages/jsonpath]
---

# Introduction

This specification defines the intended requirements and the **current, code-aligned interfaces** for the JSONPath ecosystem implemented under `packages/jsonpath/*`.

`packages/jsonpath` is the source of truth for what exists today. This document also records **gaps** where the prior spec (or the intended design) describes features that are **not implemented** or are **not wired**.

## 1. Purpose & Scope

- **Purpose**: Provide a machine-readable, unambiguous description of the JSONPath engine, plugin system, bundled profiles, and integration packages in this repository.
- **Scope**: Applies to all packages under `packages/jsonpath/*`.
- **Audience**: Maintainers and contributors; Generative AI agents operating on this monorepo.
- **Assumptions**:
  - The ecosystem targets JavaScript/TypeScript and is built as a pnpm workspace.
  - The implementation is **pre-1.0** and may be incomplete.

## 2. Definitions

- **JSONPath**: A query language for selecting nodes from JSON values.
- **RFC 9535**: The IETF RFC defining JSONPath syntax/semantics.
- **Engine**: The compiled+evaluation runtime (`@jsonpath/core`) that parses and evaluates JSONPath expressions.
- **Plugin**: A unit of extension that can register syntax, evaluators, lifecycle hooks, and/or result mappers.
- **Profile**: A parsing profile controlling RFC9535 feature availability (e.g. `rfc9535-core`, `rfc9535-full`).
- **Node**: A runtime record representing a selected value, its location, and the query root.
- **Location**: A structured path from root to a node (array indices and object member names).
- **Result Type**: A mapping from nodes to a public output shape (e.g. `value`, `node`, `pointer`, `path`, `parent`).
- **JSON Pointer**: RFC 6901 string pointer (e.g. `/items/0/name`).

## 3. Requirements, Constraints & Guidelines

### Core Architecture

- **REQ-001**: The system SHALL be plugin-first: feature behavior is registered via plugins.
- **REQ-002**: The engine SHALL provide `compile`, `parse`, `evaluateSync`, and `evaluateAsync`.
- **REQ-003**: The engine SHALL be deterministic for plugin resolution and ordering.
- **CON-001**: Workspace dependencies MUST use the `workspace:*` / `workspace:^` protocol.

### Engine Interfaces (Current)

- **REQ-010**: The public engine interface SHALL match `@jsonpath/core`:
  - `compile(expression: string) -> { expression, ast }`
  - `parse(expression: string) -> PathNode`
  - `evaluateSync(compiled, json, options?) -> unknown[]`
  - `evaluateAsync(compiled, json, options?) -> Promise<unknown[]>`
- **REQ-011**: `EvaluateOptions.resultType` SHALL default to `value`.
- **REQ-012**: If `resultType` is not registered, the engine SHALL throw a `JsonPathError` with `JSONPATH_CONFIG_ERROR`.

### Plugin System (Current)

- **REQ-020**: Plugins SHALL have `meta.id` (string) and a `setup(ctx)` function.
- **REQ-021**: Plugins MAY declare:
  - `meta.phases`: any of `syntax | filter | runtime | result`.
  - `meta.dependsOn`: plugin IDs required to be present.
  - `meta.capabilities`: string capabilities used for conflict detection.
- **REQ-022**: Plugins SHALL be ordered deterministically and with a stable tie-breaker.
- **REQ-023**: Capability conflicts (same capability claimed by different plugin IDs) SHALL throw a `JsonPathError` with `JSONPATH_PLUGIN_ERROR`.

### Bundles & Presets

- **REQ-030**: `@jsonpath/jsonpath` SHALL provide a default, lazy singleton engine configured with RFC 9535 plugins.
- **REQ-031**: `@jsonpath/complete` SHALL provide a "convenience" engine factory intended to wire commonly used plugins.

### CLI

- **REQ-040**: `@jsonpath/cli` SHALL read configuration from JSON only.
- **REQ-041**: The CLI SHALL accept `jsonpath <config.json>` and print JSON results to stdout.

### Mutation

- **REQ-050**: `@jsonpath/mutate` SHALL expose pointer-backed helpers to set/remove values.

### Validation

- **REQ-060**: `@jsonpath/plugin-validate` SHALL expose synchronous validation utilities over engine results.

### Security

- **SEC-001**: Script expressions SHALL be opt-in and evaluated in a sandbox.

### Guidelines

- **GUD-001**: Prefer adding capabilities via plugins rather than expanding `@jsonpath/core`.
- **GUD-002**: Keep result formatting stable (byte-for-byte) once released.

## 4. Interfaces & Data Contracts

### 4.1 `@jsonpath/core` Engine

Type shape (implementation-aligned):

```ts
export type CompileResult = { expression: string; ast: PathNode };

export type EvaluateOptions = {
	resultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';
};

export type JsonPathEngine = {
	compile(expression: string): CompileResult;
	parse(expression: string): PathNode;
	evaluateSync(
		compiled: CompileResult,
		json: unknown,
		options?: EvaluateOptions,
	): unknown[];
	evaluateAsync(
		compiled: CompileResult,
		json: unknown,
		options?: EvaluateOptions,
	): Promise<unknown[]>;
};
```

### 4.2 Plugin Contract

```ts
export type PluginPhase = 'syntax' | 'filter' | 'runtime' | 'result';

export type JsonPathPluginMeta = {
	id: string;
	phases: readonly PluginPhase[];
	capabilities?: readonly string[];
	dependsOn?: readonly string[];
	optionalDependsOn?: readonly string[];
	allowMultiple?: boolean;
	order?: {
		first?: boolean;
		last?: boolean;
		before?: readonly string[];
		after?: readonly string[];
	};
};

export type JsonPathPlugin<Config = unknown> = {
	meta: JsonPathPluginMeta;
	setup(ctx: {
		pluginId: string;
		config: Config | undefined;
		engine: EngineComponents;
	}): void;
};
```

### 4.3 CLI Config (`@jsonpath/cli`)

Current contract:

```ts
export type JsonPathCliConfig = {
	path: string;
	json: unknown;
	resultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';
};
```

### 4.4 Convenience Engines

- `@jsonpath/jsonpath` exports:
  - `engine` (default lazy singleton)
  - `createEngine(opts?)` which composes RFC9535 plugins plus optional extras
- `@jsonpath/plugin-rfc-9535` exports:
  - `rfc9535Plugins` (array of plugin instances)
  - `createRfc9535Engine(options?)`
- `@jsonpath/complete` exports:
  - `createCompleteEngine()`
  - `completePlugins` (wiring list)

## 5. Acceptance Criteria

- **AC-001**: Given a JSONPath expression like `$.a`, when compiled and evaluated with `resultType: 'value'`, then the engine returns the selected values.
- **AC-002**: Given an engine without a registered mapper for `resultType: 'parent'`, when `evaluateSync` is called with `resultType: 'parent'`, then it throws `JsonPathError` with code `JSONPATH_CONFIG_ERROR`.
- **AC-003**: Given plugins with conflicting capabilities, when `createEngine` is called, then it throws `JsonPathError` with code `JSONPATH_PLUGIN_ERROR`.
- **AC-004**: Given a CLI config file with `path` and `json`, when running `jsonpath <config.json>`, then it prints a JSON array of results.

## 6. Test Automation Strategy

- **Test Levels**: Unit tests per package; integration tests for cross-package flows.
- **Frameworks**: Vitest (per-package `vitest.config.ts`).
- **Test Location**: Co-located under each package’s `src/` (e.g. `src/*.spec.ts`).
- **CI/CD Integration**: Run workspace `test` tasks via Turborepo pipeline.
- **Coverage Requirements**: Prefer coverage on engine + parser + pointer mutation primitives.

## 7. Rationale & Context

- The plugin-first architecture allows multiple JSONPath dialects and extensions without bloating core.
- Deterministic plugin ordering and capability conflict detection prevents ambiguous behavior.

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: JSONPath compliance suite (vendored via `napa`) used for conformance testing in `@jsonpath/jsonpath`.

### Third-Party Services

- **SVC-001**: `ses` used by `@jsonpath/plugin-script-expressions` to sandbox script execution.

### Technology Platform Dependencies

- **PLT-001**: Node.js runtime (workspace standard) and TypeScript build pipeline.

## 9. Examples & Edge Cases

```text
Implemented today (expected to work):
  - $.a
  - $.items[0]
  - $.items[-1]          (negative index normalization)
  - $.items[1:4:2]       (slice selector)
  - $..name              (descendant segment)
  - $.obj.*              (wildcard selector)
  - $.obj['weird key']   (quoted name selector)

Not implemented or not wired (expected to fail or throw today):
  - $.items[?(@.active == true)]  (filter selector evaluation)
  - resultType: 'parent'          (unless plugin-result-parent is explicitly wired)
```

## 10. Validation Criteria

- **VAL-001**: Public API surface in this spec matches the exports in `packages/jsonpath/*/src/index.ts`.
- **VAL-002**: Each listed gap is traceable to missing runtime wiring or missing evaluator/mapper registration.

## 11. Related Specifications / Further Reading

- RFC 9535 JSONPath (conceptual reference)
- RFC 6901 JSON Pointer
- Existing (legacy) doc: `specs/jsonpath.md` (now aligned to this spec)

---

# Implementation Status & Gaps (Audit)

This section explicitly records **spec-intended** functionality that is **not implemented** or **not wired** in `packages/jsonpath` at the time of `last_updated`.

| Area                                                      | Intended (legacy spec)                              | Current implementation status                 | Notes / Evidence                                                                                                                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RFC9535 filters `?()`                                     | Fully supported via `@jsonpath/plugin-rfc-9535`     | **Not implemented**                           | Parser produces `Selector:Filter`, but there is no selector evaluator registered for it. `createSyntaxFilterPlugin` registers a segment evaluator for `FilterSegment` which is not produced by the RFC9535 parser. |
| RFC9535 function filters (`length`, `count`, ...)         | Supported in `rfc9535-full`                         | **Parsing implemented; evaluation not wired** | Parser validates signatures; runtime does not evaluate filter selectors.                                                                                                                                           |
| Script expressions fallback                               | Supported via `@jsonpath/plugin-script-expressions` | **Partially implemented**                     | Plugin registers a filter script evaluator but requires `enabled: true` in plugin config; `@jsonpath/complete` wires the plugin with default config (disabled).                                                    |
| `resultType: 'parent'`                                    | Available in CLI and compat adapters                | **Not wired by default**                      | Mapper exists in `@jsonpath/plugin-result-parent` and aggregator `@jsonpath/plugin-result-types`, but `@jsonpath/complete` does not currently include `plugin-result-types` in `completePlugins`.                  |
| `@jsonpath/plugin-validate` as engine plugin              | Plugin adds engine-level validate behavior          | **Plugin is a no-op**                         | The `plugin` export has `setup: () => undefined`. Validation works only via exported helper functions like `validateQuerySync`.                                                                                    |
| Type selectors / parent selector / property name selector | Provide selector/evaluator behavior                 | **No-op plugins**                             | `@jsonpath/plugin-type-selectors`, `@jsonpath/plugin-parent-selector`, `@jsonpath/plugin-property-name-selector` export plugins with empty `setup`.                                                                |
| Engine limits (`maxDepth`, `maxResults`)                  | Enforced during evaluation                          | **Not implemented**                           | Options exist in `createEngine` signature but are not used to limit traversal/results.                                                                                                                             |
| `@jsonpath/compat-jsonpath` API fidelity                  | Drop-in replacement                                 | **Incomplete**                                | Uses `resultType: 'parent'` without wiring it; mutation semantics differ (uses pointer-backed immutable update + `Object.assign` workaround).                                                                      |
