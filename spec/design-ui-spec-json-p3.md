---
title: UI-Spec Data Access & Mutation via json-p3 (JSONPath + JSON Patch)
version: 1.0
date_created: 2026-01-01
last_updated: 2026-01-01
owner: @lellimecnar
tags: [design, ui-spec, jsonpath, jsonpatch, data]
---

## Introduction

This specification defines the normative requirements for how UI-Spec evaluates JSONPath expressions and applies state mutations. It standardizes on a single implementation package (`json-p3`) for JSONPath evaluation and requires JSON Patch (RFC 6902) as the mutation mechanism.

## 1. Purpose & Scope

- This spec applies to all UI-Spec implementations that provide a reactive data store and a UIScript execution context.
- This spec covers:
  - JSONPath evaluation semantics and implementation constraints.
  - Store and context mutation semantics using JSON Patch.
- This spec does not define rendering, routing, validation plugins, or component libraries.

Assumptions:

- UI-Spec schemas use JSONPath strings for reads (e.g., `$.user.name`) and for write-target selection.
- The runtime maintains a single mutable JSON document as application state (the “store document”).

## 2. Definitions

- **JSONPath**: A query language for selecting nodes within a JSON document.
- **RFC 9535 JSONPath**: A standardized JSONPath specification.
- **JSON Patch**: A JSON document format for describing changes to apply to a JSON document.
- **RFC 6902 JSON Patch**: The standard defining JSON Patch operations such as `add`, `remove`, `replace`, `move`, `copy`, and `test`.
- **JSON Pointer**: A string syntax for identifying a specific value within a JSON document.
- **Mutation**: Any operation that changes the store document.
- **Store document**: The canonical JSON object representing application data.
- **`json-p3`**: The required implementation package used for JSONPath evaluation and JSON Patch application.

## 3. Requirements, Constraints & Guidelines

### JSONPath evaluation

- **REQ-001**: All JSONPath expression evaluation SHALL be implemented using `json-p3`.
- **REQ-002**: The runtime SHALL treat JSONPath strings as RFC 9535 JSONPath expressions.
- **CON-001**: The runtime SHALL NOT implement a second JSONPath engine in parallel with `json-p3`.

### Mutation model (JSON Patch)

- **REQ-003**: All mutations to the store document SHALL be performed by applying JSON Patch operations (RFC 6902).
- **REQ-004**: The store SHALL expose a `patch(operations)` API that accepts an ordered array of JSON Patch operations and applies them atomically.
- **REQ-005**: Convenience write helpers (e.g., `set`, `update`, `merge`, `push`, `remove`) SHALL be implemented by generating JSON Patch operations and delegating to `patch(operations)`.

### JSONPath-to-mutation targeting

- **REQ-006**: When a write helper receives a JSONPath target, it SHALL resolve the JSONPath against the current store document and require exactly one match.
- **REQ-007**: If a write helper resolves to zero matches, it SHALL throw a descriptive error and SHALL NOT mutate state.
- **REQ-008**: If a write helper resolves to more than one match, it SHALL throw a descriptive error and SHALL NOT mutate state.

### Recommended constraints (non-normative)

- **GUD-001**: Prefer `replace` operations for overwriting existing values; prefer `add` for extending arrays and creating missing object properties.
- **GUD-002**: When possible, perform multi-step changes using a single `patch([...])` call to reduce reactive churn.

## 4. Interfaces & Data Contracts

### JSON Patch operation

The following is the minimum required shape for patch operations.

```ts
type JsonPatchOperation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };
```

### Store interface

```ts
interface UISpecStore {
	// Read (JSONPath)
	get<T = unknown>(path: string): T;
	select<T = unknown>(path: string): Observable<T>;

	// Write (JSON Patch)
	patch(operations: JsonPatchOperation[]): void;

	// Convenience write helpers (implemented via patch)
	set(path: string, value: unknown): void;
	update(path: string, updater: (current: unknown) => unknown): void;
	merge(path: string, partial: Record<string, unknown>): void;
	push(path: string, ...items: unknown[]): void;
	remove(path: string, predicate: (item: unknown) => boolean): void;
}
```

### UIScript context data APIs

```ts
interface UISpecContext {
	// Read (JSONPath)
	get(path: string): unknown;

	// Write (JSON Patch)
	patch(operations: JsonPatchOperation[]): void;

	// Convenience write helpers (implemented via patch)
	set(path: string, value: unknown): void;
	update(path: string, fn: (v: unknown) => unknown): void;
}
```

## 5. Acceptance Criteria

- **AC-001**: Given a store document, when `get(path)` is called, then JSONPath evaluation is performed by `json-p3`.
- **AC-002**: Given any mutation (including `set`, `update`, `merge`, `push`, `remove`), when it is executed, then it applies changes only via `patch([...])` using RFC 6902 JSON Patch operations.
- **AC-003**: Given a write helper called with a JSONPath that matches zero locations, when executed, then it throws a descriptive error and makes no state changes.
- **AC-004**: Given a write helper called with a JSONPath that matches multiple locations, when executed, then it throws a descriptive error and makes no state changes.
- **AC-005**: Given `patch([...])` with multiple operations, when applied, then the operations are applied in-order and the resulting store document matches RFC 6902 semantics.

## 6. Test Automation Strategy

- **Test Levels**: Unit (store/patch/path resolution), Integration (UIScript + store), End-to-End (optional, minimal).
- **Frameworks**: Use the workspace-standard test runner for the implementing package.
- **Test Data Management**: Create fresh in-memory store documents per test; avoid shared global state.
- **Coverage Requirements**: All acceptance criteria above MUST have automated test coverage.

## 7. Rationale & Context

- Using `json-p3` avoids diverging JSONPath behaviors across packages and ensures RFC-aligned query semantics.
- Using JSON Patch standardizes mutation, enables batching, and provides a compact, serializable change log for tooling and potential server-driven updates.

## 8. Dependencies & External Integrations

### Third-Party Services

- **SVC-001**: `json-p3` - provides JSONPath evaluation and JSON Patch application.

## 9. Examples & Edge Cases

### Example: `set` implemented via JSON Patch

```code
// Example intent (not tied to a specific implementation):
// ctx.set('$.user.name', 'Ada')
// 1) Resolve '$.user.name' to exactly one location
// 2) Convert that location to a JSON Pointer (e.g., '/user/name')
// 3) Apply: [{ op: 'replace', path: '/user/name', value: 'Ada' }]
```

### Edge case: write JSONPath matches multiple nodes

```code
// ctx.set('$.users[*].active', false)
// MUST throw: write target is ambiguous (multiple matches)
```

### Edge case: `push` target is not an array

```code
// ctx.push('$.user.name', 'x')
// MUST throw: push target is not an array
```

## 10. Validation Criteria

- All JSONPath reads and selections are executed through `json-p3`.
- All mutations are executed via JSON Patch operations (no direct in-place mutation of the store document outside patch application).
- Write helpers enforce “exactly one match” targeting.

## 11. Related Specifications / Further Reading

- ../specs/ui-spec.md
- ../specs/jsonpath.md
