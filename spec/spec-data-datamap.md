---
title: DataMap - High-Performance Reactive Data Store
version: 1.0
date_created: 2026-01-02
last_updated: 2026-01-02
owner: @lellimecnar
tags: [data, schema, infrastructure, jsonpath, jsonpatch, reactive, state-management]
---

# Introduction

DataMap is a high-performance reactive data store that acts like a `Map` for a single root JSON object while providing advanced capabilities:

- Deep get/set using JSONPath (RFC 9535) and JSON Pointer (RFC 6901)
- All mutations expressed and applied as RFC 6902 JSON Patch operations
- Patch generation mode for preview/undo without immediate application
- Reactive subscriptions to paths/pointers with stage-based lifecycle hooks
- Dynamic computed values (getters/setters/derived values) configured at construction
- O(m) path operations via segment-based trie storage
- O(1) subscription lookup via reverse index with Bloom filter optimization
- Automatic structural sharing for memory-efficient snapshots

## 1. Purpose & Scope

### Purpose

DataMap provides a single, unified API for managing complex application state with:

- **Predictable mutations**: All changes expressed as JSON Patch operations
- **Reactive updates**: Efficient subscription system for change notification
- **Path-based access**: Both JSONPath queries and JSON Pointer resolution
- **Transaction support**: Atomic batch operations with automatic rollback

### Scope

This specification covers:

- Core DataMap class API and behavior
- Internal storage architecture and data model
- Subscription system and lifecycle hooks
- Dynamic value definitions (computed properties)
- Transaction and batch mutation semantics
- Performance requirements and optimization strategies

This specification does not cover:

- Framework-specific adapters (React, Vue, etc.)
- Persistence or serialization to external storage
- Network synchronization or conflict resolution
- Schema validation (future enhancement)

### Intended Audience

- Library implementers building the DataMap package
- Application developers using DataMap for state management
- AI agents generating code that uses DataMap APIs

### Assumptions

- The runtime environment supports ES2020+ JavaScript
- The `json-p3` library is available as the sole JSONPath/JSON Patch implementation
- All path strings follow either JSON Pointer or JSONPath syntax

## 2. Definitions

| Term                   | Definition                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **DataMap**            | The primary class providing a reactive data store with path-based access           |
| **JSON Pointer**       | RFC 6901 string syntax for targeting a single value (e.g., `/users/0/name`)        |
| **JSONPath**           | RFC 9535 query language for selecting multiple values (e.g., `$.users[*].name`)    |
| **JSON Patch**         | RFC 6902 format describing operations to apply to a JSON document                  |
| **Operation**          | A single JSON Patch operation (`add`, `remove`, `replace`, `move`, `copy`, `test`) |
| **Pointer**            | Shorthand for JSON Pointer                                                         |
| **Path**               | Shorthand for JSONPath expression                                                  |
| **Subscription**       | A registered callback that fires when matching paths change                        |
| **Definition**         | A dynamic value configuration (getter/setter/dependencies)                         |
| **Batch**              | A scope where multiple mutations accumulate into a single patch                    |
| **Segment Trie**       | A tree structure keyed by path segments for O(m) lookup                            |
| **Reverse Index**      | A map from pointer → subscriptions for O(1) notification lookup                    |
| **Structural Sharing** | Copy-on-write technique where unchanged portions share memory                      |

## 3. Requirements, Constraints & Guidelines

### Core Requirements

- **REQ-001**: All JSONPath and JSON Pointer operations SHALL use `json-p3` as the sole implementation
- **REQ-002**: All mutations SHALL be expressed as RFC 6902 JSON Patch operations internally
- **REQ-003**: The DataMap SHALL maintain a plain JavaScript object as the canonical data store
- **REQ-004**: Public APIs SHALL accept both JSON Pointer and JSONPath strings interchangeably where applicable
- **REQ-005**: Path type detection SHALL use the algorithm specified in Section 4.3

### Storage Requirements

- **REQ-006**: The primary data store SHALL be a plain JavaScript object (or array)
- **REQ-007**: Metadata SHALL be stored in a sparse `Map<string, NodeMetadata>` keyed by JSON Pointer
- **REQ-008**: Only nodes with actual metadata SHALL have entries in the metadata Map
- **REQ-009**: The `.resolve()` method SHALL return immutable snapshots, never exposing internal mutable state

### Mutation Requirements

- **REQ-010**: All mutation methods SHALL generate minimal RFC 6902 patches
- **REQ-011**: Patch output SHALL be deterministic (stable operation order)
- **REQ-012**: Non-existent paths SHALL be created with appropriate intermediate containers
- **REQ-013**: Container type (object vs array) SHALL be inferred from path syntax

### Subscription Requirements

- **REQ-014**: Subscriptions SHALL support both static pointers and dynamic JSONPath expressions
- **REQ-015**: JSONPath subscriptions SHALL be expanded to concrete pointers at registration time
- **REQ-016**: Subscription notifications SHALL be batched within a single synchronous execution block
- **REQ-017**: Notification delivery SHALL use `queueMicrotask` for non-blocking updates

### Performance Requirements

- **REQ-018**: Path-based lookups SHALL complete in O(m) time where m is path depth
- **REQ-019**: Subscription lookup on change SHALL complete in O(1) amortized time
- **REQ-020**: JSONPath queries SHOULD be JIT-compiled at subscription registration
- **REQ-021**: Batch operations SHALL use structural sharing to minimize memory allocation

### Constraints

- **CON-001**: The DataMap SHALL NOT use a secondary JSONPath engine alongside `json-p3`
- **CON-002**: External APIs SHALL NOT expose mutable internal metadata objects
- **CON-003**: Subscriptions SHALL NOT move with values during `move` operations
- **CON-004**: Context values SHALL NOT participate in computed value cache keys

### Guidelines

- **GUD-001**: Prefer JSON Pointer syntax for single-value access patterns
- **GUD-002**: Prefer JSONPath syntax for multi-value queries and subscriptions
- **GUD-003**: Use `.batch` for multiple related mutations to ensure atomic application
- **GUD-004**: Define computed values at construction time for optimal initialization order

### Patterns

- **PAT-001**: Subscription Reverse Index - Map pointers to subscriber sets for O(1) notification
- **PAT-002**: Eager Expansion - Expand JSONPath to concrete pointers at subscription time
- **PAT-003**: Structural Change Tracking - Watch parent containers for array/object mutations
- **PAT-004**: Microtask Batching - Collect all changes, notify once via queueMicrotask

## 4. Interfaces & Data Contracts

### 4.1 Constructor

```typescript
new DataMap<T, Ctx = unknown>(initialValue: T, options?: DataMapOptions<T, Ctx>)
```

#### DataMapOptions

```typescript
interface DataMapOptions<T, Ctx = unknown> {
	/**
	 * When true, invalid operations throw errors.
	 * When false, methods return safe fallbacks (undefined, [], etc.)
	 * @default false
	 */
	strict?: boolean;

	/**
	 * JSON Schema for validation (future enhancement).
	 * When present, has highest precedence for typing and path validation.
	 */
	schema?: unknown;

	/**
	 * Context object passed to getter/setter/subscription functions.
	 * Does NOT participate in derived-value caching.
	 */
	context?: Ctx;

	/**
	 * Dynamic value definitions (computed properties).
	 * Can be literal Definition objects or factory functions.
	 */
	define?: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[];

	/**
	 * Subscription rules registered at construction time.
	 */
	subscribe?: SubscriptionConfig<T, Ctx>[];
}

type DefinitionFactory<T, Ctx> = (
	instance: DataMap<T, Ctx>,
	ctx: Ctx,
) => Definition<T, Ctx> | Definition<T, Ctx>[];
```

### 4.2 Definition Interface

```typescript
interface Definition<T, Ctx = unknown> {
	/**
	 * The path this definition applies to.
	 * Can be JSON Pointer or JSONPath.
	 */
	path: string;

	/**
	 * Getter function or configuration.
	 * Transforms stored value to public value on read.
	 */
	get?: GetterFn<T, Ctx> | GetterConfig<T, Ctx>;

	/**
	 * Setter function or configuration.
	 * Transforms public value to stored value on write.
	 */
	set?: SetterFn<T, Ctx> | SetterConfig<T, Ctx>;

	/**
	 * Paths this definition depends on.
	 * Used for cache invalidation and initialization ordering.
	 */
	deps?: string[];

	/**
	 * When true, prevents direct writes to this path.
	 * @default false
	 */
	readOnly?: boolean;

	/**
	 * Initial value to use instead of executing getter during construction.
	 * Avoids side effects during initialization.
	 */
	defaultValue?: unknown;
}

type GetterFn<T, Ctx> = (
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;

interface GetterConfig<T, Ctx> {
	fn: GetterFn<T, Ctx>;
	deps?: string[];
}

type SetterFn<T, Ctx> = (
	newValue: unknown,
	currentValue: unknown,
	depValues: unknown[],
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown;

interface SetterConfig<T, Ctx> {
	fn: SetterFn<T, Ctx>;
	deps?: string[];
}
```

### 4.3 Path Type Detection

Public APIs accepting `pathOrPointer: string` SHALL detect the input type:

```typescript
type PathType = 'pointer' | 'relative-pointer' | 'jsonpath';

function detectPathType(input: string): PathType {
	// JSON Pointer: starts with '/' or is empty string (root)
	if (input === '' || input.startsWith('/')) {
		return 'pointer';
	}

	// URI Fragment JSON Pointer: starts with '#/' or is '#'
	if (input.startsWith('#/') || input === '#') {
		return 'pointer';
	}

	// Relative JSON Pointer: starts with digit(s) optionally followed by '#' or '/'
	// Examples: '0', '1/foo', '2#', '0/bar/baz'
	if (/^\d+(#|\/|$)/.test(input)) {
		return 'relative-pointer';
	}

	// Everything else is treated as JSONPath
	// (includes '$', '@', '$..', '$.foo', etc.)
	return 'jsonpath';
}
```

### 4.4 Read API

```typescript
interface DataMapReadAPI<T> {
	/**
	 * Get a single value at the specified path.
	 * Returns first match if path resolves to multiple values.
	 *
	 * @returns The value, or undefined if not found (when strict: false)
	 * @throws When path is invalid or not found (when strict: true)
	 */
	get(pathOrPointer: string, options?: { strict?: boolean }): unknown;

	/**
	 * Get all values matching the specified path.
	 *
	 * @returns Array of matched values (may be empty when strict: false)
	 * @throws When path is invalid (when strict: true)
	 */
	getAll(pathOrPointer: string, options?: { strict?: boolean }): unknown[];

	/**
	 * Resolve a path to detailed match information.
	 * Used internally by get/getAll and mutation methods.
	 *
	 * @returns Array of ResolvedMatch objects
	 */
	resolve(
		pathOrPointer: string,
		options?: { strict?: boolean },
	): ResolvedMatch[];
}

interface ResolvedMatch {
	/** JSON Pointer to the matched location */
	readonly pointer: string;

	/** The value at this location */
	readonly value: unknown;

	/** Whether this path is read-only */
	readonly readOnly?: boolean;

	/** Timestamp of last update */
	readonly lastUpdated?: number;

	/** Previous value before last change */
	readonly previousValue?: unknown;

	/** Type annotation if defined */
	readonly type?: string;
}
```

### 4.5 Write API

All mutations are expressed as RFC 6902 JSON Patch operations internally.

```typescript
interface DataMapWriteAPI<T> {
	/**
	 * Set a value at the specified path.
	 * Creates intermediate containers if path doesn't exist.
	 * Applies to first match if path resolves to multiple values.
	 */
	set(
		pathOrPointer: string,
		value: unknown | ((current: unknown) => unknown),
		options?: { strict?: boolean },
	): this;

	/**
	 * Set values at all locations matching the specified path.
	 * Creates intermediate containers if paths don't exist.
	 */
	setAll(
		pathOrPointer: string,
		value: unknown | ((current: unknown) => unknown),
		options?: { strict?: boolean },
	): this;

	/**
	 * Transform value(s) at the specified path using a mapper function.
	 * Applies to all matched locations.
	 */
	map(
		pathOrPointer: string,
		mapperFn: (value: unknown, pointer: string) => unknown,
		options?: { strict?: boolean },
	): this;

	/**
	 * Apply RFC 6902 JSON Patch operations directly.
	 */
	patch(ops: Operation[], options?: { strict?: boolean }): this;
}

/**
 * RFC 6902 JSON Patch Operation
 */
type Operation =
	| { op: 'add'; path: string; value: unknown }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: unknown }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: unknown };
```

### 4.6 Patch Generation API

Each mutation method has a `.toPatch()` variant that returns operations without applying:

```typescript
interface DataMapPatchGenAPI<T> {
	set: {
		(pathOrPointer: string, value: unknown, options?: { strict?: boolean }): T;
		toPatch(
			pathOrPointer: string,
			value: unknown,
			options?: { strict?: boolean },
		): Operation[];
	};

	setAll: {
		(pathOrPointer: string, value: unknown, options?: { strict?: boolean }): T;
		toPatch(
			pathOrPointer: string,
			value: unknown,
			options?: { strict?: boolean },
		): Operation[];
	};

	map: {
		(
			pathOrPointer: string,
			mapperFn: Function,
			options?: { strict?: boolean },
		): T;
		toPatch(
			pathOrPointer: string,
			mapperFn: Function,
			options?: { strict?: boolean },
		): Operation[];
	};

	patch: {
		(ops: Operation[], options?: { strict?: boolean }): T;
		toPatch(ops: Operation[], options?: { strict?: boolean }): Operation[];
	};
}
```

### 4.7 Array Mutation API

```typescript
interface DataMapArrayAPI<T> {
	/** Append items to array at path */
	push(pathOrPointer: string, ...items: unknown[]): this;

	/** Remove and return last item from array at path */
	pop(pathOrPointer: string): unknown;

	/** Remove and return first item from array at path */
	shift(pathOrPointer: string): unknown;

	/** Insert items at start of array at path */
	unshift(pathOrPointer: string, ...items: unknown[]): this;

	/** Remove/insert items at position in array at path */
	splice(
		pathOrPointer: string,
		start: number,
		deleteCount?: number,
		...items: unknown[]
	): unknown[];

	/** Sort array at path */
	sort(
		pathOrPointer: string,
		compareFn?: (a: unknown, b: unknown) => number,
	): this;

	/** Shuffle array at path */
	shuffle(pathOrPointer: string): this;
}
```

Each array method also has a `.toPatch()` variant.

### 4.8 Batch API

```typescript
interface Batch<Target extends DataMap<any, any>> {
	/** Accumulate a set operation */
	set(
		pathOrPointer: string,
		value: unknown,
		options?: { strict?: boolean },
	): this;

	/** Accumulate a setAll operation */
	setAll(
		pathOrPointer: string,
		value: unknown,
		options?: { strict?: boolean },
	): this;

	/** Accumulate a map operation */
	map(
		pathOrPointer: string,
		mapperFn: Function,
		options?: { strict?: boolean },
	): this;

	/** Accumulate patch operations */
	patch(ops: Operation[], options?: { strict?: boolean }): this;

	/** Apply all accumulated operations as a single atomic patch */
	apply(): Target;

	/** Get accumulated operations without applying */
	toPatch(): Operation[];
}

interface DataMapBatchAPI<T> {
	/** Start or access a batch scope for chained mutations */
	readonly batch: Batch<DataMap<T>>;
}
```

#### Batch Usage Example

```typescript
// Chained mutations applied atomically
myMap.batch
	.set('$.user.name', 'John')
	.set('$.user.email', 'john@example.com')
	.apply();

// Generate patch without applying
const patch = myMap.batch
	.set('$.user.name', 'John')
	.set('$.user.email', 'john@example.com')
	.toPatch();
// patch: [
//   { op: 'replace', path: '/user/name', value: 'John' },
//   { op: 'replace', path: '/user/email', value: 'john@example.com' }
// ]
```

### 4.9 Subscription API

```typescript
interface SubscriptionConfig<T, Ctx = unknown> {
	/** Path to subscribe to (JSON Pointer or JSONPath) */
	path: string;

	/** Stage(s) and timing for this subscription */
	before?: SubscriptionEvent | SubscriptionEvent[];
	on?: SubscriptionEvent | SubscriptionEvent[];
	after?: SubscriptionEvent | SubscriptionEvent[];

	/** Handler function */
	fn: SubscriptionHandler<T, Ctx>;
}

type SubscriptionEvent = 'get' | 'set' | 'remove' | 'resolve' | 'patch';

type SubscriptionHandler<T, Ctx> = (
	value: unknown,
	event: SubscriptionEventInfo,
	cancel: () => void,
	instance: DataMap<T, Ctx>,
	context: Ctx,
) => unknown | void;

interface SubscriptionEventInfo {
	/** The event type */
	type: SubscriptionEvent;

	/** The specific timing */
	stage: 'before' | 'on' | 'after';

	/** JSON Pointer to the affected location */
	pointer: string;

	/** The original path/query that triggered this */
	originalPath: string;

	/** For mutations, the patch operation */
	operation?: Operation;

	/** Previous value (for set/remove) */
	previousValue?: unknown;
}

interface Subscription {
	/** Unique subscription identifier */
	readonly id: string;

	/** Original path/query */
	readonly query: string;

	/** Currently expanded pointers (for JSONPath subscriptions) */
	readonly expandedPaths: ReadonlySet<string>;

	/** Unsubscribe and clean up */
	unsubscribe(): void;
}

interface DataMapSubscriptionAPI<T, Ctx> {
	/** Register a subscription at runtime */
	subscribe(config: SubscriptionConfig<T, Ctx>): Subscription;
}
```

### 4.10 Utility API

```typescript
interface DataMapUtilityAPI<T> {
	/** Check value equality with another DataMap or plain object */
	equals(other: DataMap<T> | T): boolean;

	/** Check if this data extends/contains another structure */
	extends(other: Partial<T>): boolean;

	/** Get deterministic JSON representation */
	toJSON(): T;

	/** Create a deep clone with structural sharing where possible */
	clone(): DataMap<T>;

	/** Get an immutable snapshot for comparison or rollback */
	getSnapshot(): T;
}
```

## 5. Acceptance Criteria

### Constructor and Initialization

- **AC-001**: Given initial data and options, When constructing a DataMap, Then the initial data is stored and accessible via `.get('')`
- **AC-002**: Given definitions with dependencies, When constructing, Then definitions are initialized in topological order
- **AC-003**: Given a definition with `defaultValue`, When constructing, Then the defaultValue is used instead of executing the getter

### Read Operations

- **AC-004**: Given a JSON Pointer path, When calling `.get()`, Then the value at that exact location is returned
- **AC-005**: Given a JSONPath with wildcards, When calling `.getAll()`, Then all matching values are returned in deterministic order
- **AC-006**: Given an invalid path with `strict: true`, When calling `.get()`, Then an error is thrown
- **AC-007**: Given an invalid path with `strict: false`, When calling `.get()`, Then `undefined` is returned

### Write Operations

- **AC-008**: Given a path to an existing value, When calling `.set()`, Then a `replace` operation is generated
- **AC-009**: Given a path to a non-existent location, When calling `.set()`, Then intermediate containers are created with `add` operations
- **AC-010**: Given a JSONPath matching multiple values, When calling `.setAll()`, Then all matched locations are updated
- **AC-011**: Given a setter function as value, When calling `.set()`, Then the function receives current value and its return value is stored

### Batch Operations

- **AC-012**: Given multiple mutations in a batch, When calling `.apply()`, Then all operations are applied atomically
- **AC-013**: Given a batch with `.toPatch()`, When called, Then operations are returned without being applied
- **AC-014**: Given a batch operation that fails, When applying, Then no partial changes are made

### Subscriptions

- **AC-015**: Given a static pointer subscription, When the value at that pointer changes, Then the subscription callback is invoked
- **AC-016**: Given a JSONPath subscription, When any matching value changes, Then the subscription callback is invoked
- **AC-017**: Given a `before: 'set'` subscription that calls `cancel()`, When a set operation occurs, Then the mutation is aborted
- **AC-018**: Given a `before: 'set'` subscription that returns a transformed value, When a set occurs, Then the transformed value is stored

### Dynamic Values

- **AC-019**: Given a definition with a getter, When calling `.get()` on that path, Then the getter transforms the value
- **AC-020**: Given a definition with a setter, When calling `.set()` on that path, Then the setter transforms the value before storage
- **AC-021**: Given a definition with dependencies, When a dependency changes, Then the computed value is invalidated
- **AC-022**: Given a readOnly definition, When attempting to `.set()` with `strict: true`, Then an error is thrown

### Array Operations

- **AC-023**: Given an array at a path, When calling `.push()`, Then items are appended and pointer indexes are maintained
- **AC-024**: Given an array at a path, When calling `.splice()`, Then affected pointer indexes are shifted correctly
- **AC-025**: Given subscriptions on array elements, When the array is reordered, Then subscriptions remain bound to their original pointers (not values)

### Move Operation Semantics

- **AC-026**: Given a subscription on `/users/0`, When a `move` from `/users/0` to `/archived/0` occurs, Then the subscription fires a `remove` event
- **AC-027**: Given the above scenario, Then the subscription does NOT follow the value to `/archived/0`
- **AC-028**: Given a subscription on `/archived/0`, When the move occurs, Then that subscription fires a `set` event

## 6. Test Automation Strategy

### Test Levels

| Level       | Coverage Target | Purpose                                                |
| ----------- | --------------- | ------------------------------------------------------ |
| Unit        | 95%+            | Individual methods, path detection, patch generation   |
| Integration | 90%+            | Subscription system, batch operations, computed values |
| E2E         | Critical paths  | Full lifecycle scenarios, performance benchmarks       |

### Frameworks

- **Test Runner**: Vitest
- **Assertions**: Vitest built-in + custom matchers for patch comparison
- **Mocking**: Vitest mocks for timer control (queueMicrotask testing)

### Test Data Management

- Fixture files with representative JSON structures
- Factory functions for creating test DataMap instances
- Snapshot testing for patch output determinism

### CI/CD Integration

- All tests run on every PR
- Performance regression tests on merge to main
- Coverage reports published to PR comments

### Coverage Requirements

- Minimum 95% line coverage for core package
- 100% coverage for path detection and patch generation
- Branch coverage for strict/non-strict mode paths

### Performance Testing

- Benchmark suite measuring:
  - Path lookup time (O(m) verification)
  - Subscription notification time (O(1) verification)
  - Batch operation memory allocation
  - JSONPath query compilation time

## 7. Rationale & Context

### Why JSON Patch for All Mutations

JSON Patch (RFC 6902) provides:

1. **Predictability**: Every mutation is a well-defined operation with clear semantics
2. **Auditability**: Operations can be logged, replayed, and debugged
3. **Undo/Redo**: Inverse patches enable efficient history management
4. **Sync**: Patches can be sent over the network for collaborative editing
5. **Atomic Batching**: Multiple operations can be validated before application

### Why json-p3 as the Sole Implementation

1. **RFC Compliance**: Full RFC 9535 JSONPath and RFC 6902 JSON Patch support
2. **Zero Dependencies**: Minimal bundle size impact
3. **Unified API**: Single library for path queries, pointer resolution, and patch application
4. **`toPointer()` Method**: Critical for converting JSONPath results to storage keys

### Why Separate JSON Pointer and JSONPath

| Use Case             | Preferred Syntax | Reason                                   |
| -------------------- | ---------------- | ---------------------------------------- |
| Direct access        | JSON Pointer     | Single value, O(1) lookup possible       |
| Multi-value query    | JSONPath         | Wildcards, filters, recursive descent    |
| Mutation target      | JSON Pointer     | Unambiguous single location              |
| Subscription pattern | JSONPath         | Match multiple current and future values |

### Why Structural Sharing

Memory-efficient updates via copy-on-write:

- Only the path from root to modified leaf is copied
- Unchanged subtrees share references
- Enables efficient snapshots for undo/redo
- Critical for large state trees in reactive applications

### Why Microtask-Based Notification

- Prevents blocking the main thread during rapid updates
- Batches multiple synchronous changes into single notification
- Higher priority than `setTimeout` (same-turn execution)
- React 18 demonstrates 40% reduction in unnecessary renders

## 8. Dependencies & External Integrations

### Core Technology Dependencies

| Dependency | Purpose                            | Version Constraint |
| ---------- | ---------------------------------- | ------------------ |
| json-p3    | JSONPath, JSON Pointer, JSON Patch | ^1.1.0             |
| TypeScript | Type definitions and compilation   | ^5.0.0             |

### Runtime Environment

- **PLT-001**: ES2020+ JavaScript runtime (modern browsers, Node.js 18+)
- **PLT-002**: `queueMicrotask` global function availability
- **PLT-003**: `Map` and `Set` native support

### Optional Enhancements

- **Immer/Mutative**: For structural sharing in transactions (optional optimization)
- **Bloom Filter**: For quick rejection in subscription matching (optional optimization)

### Development Dependencies

| Dependency | Purpose            |
| ---------- | ------------------ |
| Vitest     | Test framework     |
| tsup       | Build and bundling |
| TypeScript | Type checking      |

## 9. Examples & Edge Cases

### Basic Usage

```typescript
import { DataMap } from '@data-map/core';

const store = new DataMap({
	user: {
		name: 'Alice',
		email: 'alice@example.com',
		scores: [85, 92, 78],
	},
});

// Read with JSON Pointer
store.get('/user/name'); // 'Alice'

// Read with JSONPath
store.getAll('$.user.scores[*]'); // [85, 92, 78]

// Write
store.set('/user/name', 'Bob');

// Batch mutations
store.batch.set('$.user.name', 'Charlie').push('$.user.scores', 95).apply();
```

### Computed Properties

```typescript
const store = new DataMap(
	{ birthYear: 1990 },
	{
		define: [
			{
				path: '$.age',
				get: (_, __, ___, ctx) => ctx.currentYear - store.get('/birthYear'),
				deps: ['$.birthYear'],
				readOnly: true,
			},
		],
		context: { currentYear: 2026 },
	},
);

store.get('$.age'); // 36
store.set('$.birthYear', 2000);
store.get('$.age'); // 26
```

### Subscriptions

```typescript
const store = new DataMap({ users: [] });

// Subscribe to all user names
const sub = store.subscribe({
	path: '$.users[*].name',
	on: 'set',
	fn: (value, event) => {
		console.log(`User name changed at ${event.pointer}: ${value}`);
	},
});

store.push('/users', { name: 'Alice' });
// Logs: "User name changed at /users/0/name: Alice"

sub.unsubscribe();
```

### Validation with Subscriptions

```typescript
const store = new DataMap(
	{ user: { age: 25 } },
	{
		subscribe: [
			{
				path: '$.user.age',
				before: 'set',
				fn: (newValue, event, cancel) => {
					if (typeof newValue !== 'number' || newValue < 0 || newValue > 150) {
						cancel();
						throw new Error('Age must be a number between 0 and 150');
					}
					return Math.floor(newValue); // Ensure integer
				},
			},
		],
	},
);

store.set('$.user.age', 30.7); // Stored as 30
store.set('$.user.age', -5); // Throws error, mutation cancelled
```

### Edge Cases

#### Non-Existent Path Creation

```typescript
const store = new DataMap({ foo: {} });

// Creates intermediate containers
store.set('$.foo.bar.baz', 'value');
// Generates:
// [
//   { op: 'add', path: '/foo/bar', value: {} },
//   { op: 'add', path: '/foo/bar/baz', value: 'value' }
// ]
```

#### Array Index Path Creation

```typescript
const store = new DataMap({ data: {} });

// Path syntax determines container type
store.set('$.data.items[0]', 'first');
// Creates: { data: { items: ['first'] } }

store.set('$.data.config.key', 'value');
// Creates: { data: { items: ['first'], config: { key: 'value' } } }
```

#### Move Operation and Subscriptions

```typescript
const store = new DataMap({ active: [{ id: 1 }], archived: [] });

store.subscribe({
	path: '/active/0',
	on: 'remove',
	fn: () => console.log('Item removed from active'),
});

store.subscribe({
	path: '/archived/0',
	on: 'set',
	fn: () => console.log('Item added to archived'),
});

store.patch([{ op: 'move', from: '/active/0', path: '/archived/0' }]);
// Logs: "Item removed from active"
// Logs: "Item added to archived"
```

## 10. Validation Criteria

### Functional Validation

- [ ] All RFC 6902 operations (`add`, `remove`, `replace`, `move`, `copy`, `test`) work correctly
- [ ] JSONPath queries return correct results per RFC 9535
- [ ] JSON Pointer resolution works per RFC 6901
- [ ] Relative JSON Pointers resolve correctly when context is provided
- [ ] Subscription lifecycle hooks execute in correct order
- [ ] Batch operations are atomic (all-or-nothing)
- [ ] Computed values update when dependencies change

### Performance Validation

- [ ] Path lookup completes in O(m) time (verified by benchmark)
- [ ] Subscription notification completes in O(1) amortized time
- [ ] Memory usage for snapshots is O(modified paths) not O(total size)
- [ ] JSONPath compilation amortizes cost across multiple evaluations

### Error Handling Validation

- [ ] Invalid paths throw in strict mode
- [ ] Invalid paths return safe fallbacks in non-strict mode
- [ ] Cancelled mutations do not partially apply
- [ ] Transaction rollback restores original state

## 11. Related Specifications / Further Reading

### Standards

- [RFC 6901 - JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901)
- [RFC 6902 - JSON Patch](https://www.rfc-editor.org/rfc/rfc6902)
- [RFC 9535 - JSONPath](https://datatracker.ietf.org/doc/html/rfc9535)
- [Relative JSON Pointer (Draft)](https://datatracker.ietf.org/doc/html/draft-hha-relative-json-pointer)

### Libraries

- [json-p3 Documentation](https://jg-rp.github.io/json-p3/)
- [Immer Documentation](https://immerjs.github.io/immer/)
- [Mutative (Immer Alternative)](https://github.com/unadlib/mutative)

### Reactive Patterns

- [MobX Reactivity System](https://mobx.js.org/the-gist-of-mobx.html)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [TanStack Query Patterns](https://tanstack.com/query)

### Performance Research

- [V8 Map vs Object Performance](https://v8.dev/blog/fast-properties)
- [Bloom Filter Applications](https://en.wikipedia.org/wiki/Bloom_filter)
- [Incremental View Maintenance](https://en.wikipedia.org/wiki/Incremental_computing)

---

## Appendix A: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            DataMap API                                   │
│  get(path), set(path, value), subscribe(path, callback), batch, patch   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Plain Object   │     │   Subscription      │     │    Transaction      │
│  (Primary Store)│     │   Manager           │     │    Manager          │
│                 │     │                     │     │                     │
│ • Canonical data│     │ • Reverse index     │     │ • COW snapshots     │
│ • json-p3 ops   │     │ • JIT compilation   │     │ • Structural sharing│
│ • O(1) pointer  │     │ • Bloom filters     │     │ • Auto rollback     │
│   access        │     │ • Microtask batch   │     │ • Inverse patches   │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ Sparse Metadata │     │   Path Intern Pool  │     │   Patch Builder     │
│ Map<ptr, meta>  │     │   (Memory Opt)      │     │   (RFC 6902)        │
│                 │     │                     │     │                     │
│ • Getters       │     │ • Deduplicate segs  │     │ • Minimal patches   │
│ • Setters       │     │ • Reduce GC         │     │ • Deterministic     │
│ • Subscriptions │     │ • String interning  │     │ • Batch operations  │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │          json-p3              │
                    │                               │
                    │ • JSONPath (RFC 9535)         │
                    │ • JSON Pointer (RFC 6901)     │
                    │ • JSON Patch (RFC 6902)       │
                    │ • node.toPointer() conversion │
                    └───────────────────────────────┘
```

## Appendix B: Performance Characteristics

| Operation           | Time Complexity | Space Complexity | Notes                          |
| ------------------- | --------------- | ---------------- | ------------------------------ |
| `get(pointer)`      | O(m)            | O(1)             | m = path depth                 |
| `get(jsonpath)`     | O(n)            | O(k)             | n = doc size, k = matches      |
| `set(pointer)`      | O(m)            | O(m)             | Creates path to root           |
| `resolve()`         | O(m) or O(n)    | O(k)             | Depends on path type           |
| Subscription lookup | O(1) amortized  | O(1)             | Via reverse index              |
| Batch apply         | O(p)            | O(p)             | p = patch operations           |
| Snapshot            | O(1)            | O(d)             | d = modified depth             |
| JSONPath compile    | O(q)            | O(q)             | q = query complexity, one-time |

## Appendix C: Subscription Pipeline Order

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. BEFORE handlers (most specific first, then registration order)       │
│    • May transform value                                                 │
│    • May call cancel() to abort                                          │
│    • Output → input for next handler                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ 2. ON handlers (most specific first, then registration order)           │
│    • Execute after BEFORE but before commit                              │
│    • May call cancel() to abort                                          │
│    • Last chance to modify value                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ 3. COMMIT (apply patch to data store)                                   │
│    • Atomic operation                                                    │
│    • Point of no return                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ 4. AFTER handlers (most specific first, then registration order)        │
│    • Cannot affect stored value                                          │
│    • For side effects only (logging, notifications)                      │
│    • Receive final committed value                                       │
└──────────────────────────────────────────────────────────────────────────┘
```
