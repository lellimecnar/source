---
title: UI-Spec Package Collection Architecture (@ui-spec/*)
version: 1.0
date_created: 2026-01-01
last_updated: 2026-01-01
owner: @lellimecnar
tags: [architecture, ui-spec, packages, jsonpath, jsonpatch]
---

## Introduction

This specification defines the architecture, responsibilities, interfaces, and compliance criteria for the `@ui-spec/*` collection of packages. It is intended to be machine-readable and self-contained so that multiple implementations and tooling components can be built consistently.

This spec incorporates the data access and mutation rules defined by UI-Spec’s JSONPath and JSON Patch model, including the requirement to use `json-p3` (from npm) for JSONPath evaluation and JSON Patch application.

## 1. Purpose & Scope

- Audience: maintainers and implementers of the `@ui-spec/*` packages (core runtime, framework bindings, add-ons, UI libraries, and tooling).
- Purpose:
  - Define the package taxonomy and boundaries.
  - Define required public interfaces between packages.
  - Define constraints for dependency directionality and optional features.
  - Define cross-cutting requirements for data access, mutation, security, and testing.
- In scope:
  - `@ui-spec/core`
  - Framework bindings packages (e.g., `@ui-spec/react`, `@ui-spec/vue`, `@ui-spec/svelte`, `@ui-spec/solid`, `@ui-spec/web`, `@ui-spec/angular`)
  - Router add-ons (e.g., `@ui-spec/router` and framework router adapters)
  - Validation plugin adapters (e.g., `@ui-spec/validate-*`)
  - UI component libraries (e.g., `@ui-spec/ui-tailwind`, `@ui-spec/ui-shadcn`, `@ui-spec/ui-headless`)
  - Tooling (e.g., `@ui-spec/cli`, `@ui-spec/devtools`, `@ui-spec/server`)
- Out of scope:
  - Exact UI-Spec JSON schema details (those are defined elsewhere).
  - Framework-specific internal implementation details.
  - Specific library versions.

Assumptions:

- UI-Spec renders UI from a JSON specification (“UISpec schema”).
- The runtime maintains an application data document (“store document”) that is read using JSONPath and mutated using JSON Patch.

## 2. Definitions

- **UI-Spec schema**: A JSON document describing the UI tree, components, bindings, events, and optional routes.
- **Node**: A single UI element or component instance described by schema.
- **Binding**: A mapping between a schema field and store data (read/write/two-way).
- **UIScript**: Embedded function definitions expressed in serializable form (e.g., `{$fn: "..."}`).
- **Core runtime**: The framework-agnostic implementation of schema parsing, node evaluation, data binding, and scheduling.
- **Framework binding**: An adapter layer that renders core nodes in a specific UI framework.
- **Plugin**: A module that extends runtime behavior via a defined interface (e.g., validation plugins).
- **JSONPath**: Query language for selecting elements from the store document.
- **JSON Patch (RFC 6902)**: Standard for representing changes to a JSON document.
- **`json-p3`**: The required package providing JSONPath evaluation and JSON Patch application.

## 3. Requirements, Constraints & Guidelines

### Package taxonomy and responsibilities

- **REQ-001**: The package collection SHALL be structured into layers with explicit responsibilities:
  - Core runtime (`@ui-spec/core`)
  - Framework bindings (e.g., `@ui-spec/react`)
  - Optional add-ons (e.g., routing)
  - Plugin adapters (e.g., validation)
  - UI component libraries
  - Tooling
- **REQ-002**: Each package SHALL have a single primary responsibility and SHALL expose a minimal public API surface required for that responsibility.

### Dependency directionality

- **CON-001**: `@ui-spec/core` SHALL NOT depend on any framework binding package.
- **CON-002**: A framework binding package SHALL depend on `@ui-spec/core` and SHALL NOT require unrelated bindings.
- **CON-003**: Add-ons (e.g., router) SHALL be optional and SHALL NOT be required to render a static tree.
- **CON-004**: UI component libraries SHALL be optional and SHALL NOT be required by `@ui-spec/core`.
- **CON-005**: Tooling packages SHALL NOT be required at runtime for rendering, unless explicitly used.

### Data access and mutation (cross-cutting)

- **REQ-003**: All JSONPath evaluation across the collection SHALL be implemented using `json-p3`.
- **REQ-004**: All state mutations SHALL be applied via JSON Patch (RFC 6902) operations.
- **REQ-005**: Convenience write helpers (e.g., `set`, `update`, `merge`, `push`, `remove`) SHALL be implemented by generating JSON Patch operations and applying them through a `patch(operations)` method.

### Optional routing

- **REQ-006**: Routing SHALL be provided as an optional add-on package (e.g., `@ui-spec/router`).
- **CON-006**: Without routing installed, schemas that omit `routes` SHALL still render via a static `root` tree.
- **CON-007**: Without routing installed, attempts to call routing-only APIs in UIScript (e.g., `ctx.navigate`) SHALL fail with a descriptive error.

### Validation plugin architecture

- **REQ-007**: Validation SHALL be pluggable via a stable runtime plugin interface.
- **REQ-008**: Validation adapters (e.g., `@ui-spec/validate-zod`) SHALL translate an external schema system into the common validation plugin interface.
- **SEC-001**: Validation execution SHALL NOT allow arbitrary code execution beyond what the host application explicitly provides.

### Security model (high-level)

- **SEC-002**: UIScript evaluation SHALL execute in a restricted environment provided by the host, with an explicit context object and no implicit global access.
- **SEC-003**: The runtime SHALL treat schema as untrusted input by default and SHALL provide a configurable policy layer for enabling or disabling dynamic execution features.

### Guidelines

- **GUD-001**: Prefer small, composable interfaces across packages rather than large monolithic facades.
- **GUD-002**: Ensure tree rendering works in “core + binding only” mode without requiring router, validation, or UI libraries.

### Patterns

- **PAT-001**: Core defines abstract node representation; bindings implement rendering.
- **PAT-002**: Add-ons extend context capabilities by composition (augmenting providers), not by modifying core types in-place.

## 4. Interfaces & Data Contracts

### Package inventory (normative)

| Package                  | Responsibility                                                                | Required dependencies                      | Optional dependencies      |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------ | -------------------------- |
| `@ui-spec/core`          | Parse schema; resolve nodes; manage store; schedule updates; execute UIScript | `json-p3`                                  | None                       |
| `@ui-spec/react`         | Render nodes in React; provide provider components                            | `@ui-spec/core`                            | UI library packages        |
| `@ui-spec/vue`           | Render nodes in Vue                                                           | `@ui-spec/core`                            | UI library packages        |
| `@ui-spec/svelte`        | Render nodes in Svelte                                                        | `@ui-spec/core`                            | UI library packages        |
| `@ui-spec/solid`         | Render nodes in SolidJS                                                       | `@ui-spec/core`                            | UI library packages        |
| `@ui-spec/web`           | Render nodes as Web Components                                                | `@ui-spec/core`                            | UI library packages        |
| `@ui-spec/angular`       | Render nodes in Angular                                                       | `@ui-spec/core`                            | UI library packages        |
| `@ui-spec/router`        | Route matching; route context; navigation actions                             | `@ui-spec/core`                            | None                       |
| `@ui-spec/router-react`  | Router integration for React binding                                          | `@ui-spec/router`, `@ui-spec/react`        | None                       |
| `@ui-spec/router-vue`    | Router integration for Vue binding                                            | `@ui-spec/router`, `@ui-spec/vue`          | None                       |
| `@ui-spec/router-svelte` | Router integration for Svelte binding                                         | `@ui-spec/router`, `@ui-spec/svelte`       | None                       |
| `@ui-spec/validate-*`    | Adapt external validators to runtime plugin interface                         | `@ui-spec/core`                            | External validator library |
| `@ui-spec/ui-*`          | Provide component mappings and styling conventions                            | Binding package(s)                         | None                       |
| `@ui-spec/cli`           | Validate schemas; generate types; run checks                                  | `@ui-spec/core` (for schema understanding) | None                       |
| `@ui-spec/devtools`      | Debugging and introspection tooling                                           | `@ui-spec/core`                            | Binding packages           |
| `@ui-spec/server`        | SSR and server-runtime utilities                                              | `@ui-spec/core`                            | Binding packages           |

### Core runtime interfaces (minimum required)

The following interfaces are normative. Implementations may extend them, but MUST preserve compatible behavior.

```ts
type JsonPatchOperation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };

interface UISpecStore {
	get<T = unknown>(path: string): T;
	select<T = unknown>(path: string): unknown; // Observable-like

	patch(operations: JsonPatchOperation[]): void;

	set(path: string, value: unknown): void;
	update(path: string, updater: (current: unknown) => unknown): void;
	merge(path: string, partial: Record<string, unknown>): void;
	push(path: string, ...items: unknown[]): void;
	remove(path: string, predicate: (item: unknown) => boolean): void;
}

interface UISpecContext {
	get(path: string): unknown;
	patch(operations: JsonPatchOperation[]): void;
	set(path: string, value: unknown): void;
	update(path: string, fn: (v: unknown) => unknown): void;

	// Optional routing capabilities are injected by router add-ons.
	navigate?: (path: string, options?: unknown) => void;
	back?: () => void;
	route?: unknown;
}
```

### Validation plugin interface (minimum required)

```ts
type ValidationError = { path: string; message: string; code: string };
type ValidationResult = { valid: boolean; errors: ValidationError[] };

interface ValidationPlugin {
	name: string;
	validate(schemaName: string, value: unknown): ValidationResult;
	getFieldErrors(result: ValidationResult): Map<string, string[]>;
}
```

### Router interface (minimum required)

```ts
type RouteContext = {
	path: string;
	params: Record<string, string>;
	query: Record<string, string | string[]>;
};

interface RouterController {
	getRoute(): RouteContext;
	navigate(path: string, options?: unknown): void;
	back(): void;
}
```

## 5. Acceptance Criteria

- **AC-001**: Given a schema that does not use `routes`, when rendered with `@ui-spec/core` and any single binding package, then the static `root` tree renders without requiring router or validation packages.
- **AC-002**: Given any JSONPath read operation (`get`, `select`, `$path` binding), when executed, then JSONPath evaluation is performed via `json-p3`.
- **AC-003**: Given any mutation (`set`, `update`, `merge`, `push`, `remove`), when executed, then it results in JSON Patch operations applied via `patch([...])`.
- **AC-004**: Given routing is not installed, when UIScript attempts to call `ctx.navigate`, then it fails with a descriptive error.
- **AC-005**: Given a validation plugin adapter package, when it is registered, then it produces `ValidationResult` values matching the common interface.
- **AC-006**: Given a UI library package is absent, when rendering with a binding package, then rendering still completes using primitive/default component mappings.

## 6. Test Automation Strategy

- **Test Levels**:
  - Unit: core store semantics (JSONPath reads, JSON Patch application), UIScript context API, plugin interfaces.
  - Integration: core + one binding package; core + router add-on; core + validation adapter.
  - End-to-End: minimal smoke tests in at least one binding.
- **Frameworks**: Use the workspace-standard JavaScript/TypeScript test runner for each package.
- **Test Data Management**: Use isolated in-memory store documents per test; avoid cross-test shared state.
- **CI/CD Integration**: Package-level tests MUST run in CI for all changed packages.
- **Coverage Requirements**:
  - All acceptance criteria in this spec MUST be covered by automated tests in at least one implementation.
  - Core data access/mutation behavior MUST have unit tests.
- **Performance Testing**:
  - Add microbenchmarks for JSONPath-heavy binding and for multi-op patch batching.

## 7. Rationale & Context

- A layered package architecture enables incremental adoption: core + a binding is sufficient for embedded widgets, while add-ons and tooling can be adopted when needed.
- Standardizing on `json-p3` removes ambiguity in JSONPath behavior and reduces ecosystem fragmentation.
- Standardizing mutation on JSON Patch yields a portable change protocol and improves batching and tooling possibilities.

## 8. Dependencies & External Integrations

### Third-Party Services

- **SVC-001**: `json-p3` - MUST provide JSONPath evaluation and JSON Patch application capabilities required by the core runtime.

### Technology Platform Dependencies

- **PLT-001**: JavaScript/TypeScript runtime - MUST support executing the core and selected binding(s) in the target environment (browser, server, or hybrid).

## 9. Examples & Edge Cases

```code
// Example: A minimal deployment that should work without optional add-ons
// Packages: @ui-spec/core + @ui-spec/react
// Features: render root tree, read data with JSONPath, mutate via JSON Patch helpers

// Edge case: A schema referencing routes without installing router
// Expected: render fails or warns according to host policy, and routing APIs are unavailable.

// Edge case: A write helper given a JSONPath matching multiple targets
// Expected: throw descriptive error; do not mutate.
```

## 10. Validation Criteria

- Package dependency graph satisfies constraints (no core -> binding dependency).
- Core uses `json-p3` for JSONPath and JSON Patch; no alternate engines are used.
- Mutations are applied via JSON Patch operations.
- Router remains optional; core + binding can render without it.
- Validation adapters conform to the validation plugin interface.

## 11. Related Specifications / Further Reading

- ../specs/ui-spec.md
- ./design-ui-spec-json-p3.md
- ../specs/jsonpath.md
