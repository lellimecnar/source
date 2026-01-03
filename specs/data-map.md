## Overview

This spec describes a data store class `DataMap` (package scope: `@data-map/*`) that acts like a `Map` for a single root object, but adds:

- Deep get/set using JSONPath / JSON Pointer.
- All mutations expressed and applied as RFC 6902 JSON Patch.
- Patch generation mode on mutation methods (`.set.toPatch()`, `.map.toPatch()`, `.patch.toPatch()`).
- Subscriptions to paths/pointers with stage hooks that can validate and transform values/patches.
- Dynamic values (getters/setters/derived values) configured at construction time.
- Fast comparisons (`.equals()`, `.extends()`, etc.) and deterministic serialization (`.toJSON()`).

## Core Dependencies

- All JSONPath / JSON Pointer / JSON Patch behavior MUST be implemented using `json-p3`.
- Supported syntax and edge cases are exactly whatever `json-p3` supports.

### Packages

- This spec targets the `DataMap` class published under the `@data-map/*` scope.

## Data Model

- Keys are strings only.
- The store manages a single root JSON value (typically an object) provided at construction.
- Paths/queries are expressed as JSONPath/JSON Pointer strings (as supported by `json-p3`).

### Internal Storage Model (Sidecar Metadata)

- The primary data store MUST be a plain JavaScript object (or array).
  - This object is the canonical source of truth for values.
  - `json-p3` operations MUST operate directly on this object.
- A sparse `Map<string, NodeMetadata>` keyed by JSON Pointer MUST be maintained for nodes that have metadata.
  - Keys are JSON Pointer strings (no leading `#`).
  - The root document pointer is `''` (empty string).
  - Array elements are addressed as `${basePointer}/${index}`.
  - Only nodes with actual metadata (getter, setter, subscriptions, etc.) have entries in this Map.
- The `NodeMetadata` type MAY contain:
  - `getter`, `setter`, `readOnly`, `lastUpdated`, `type`, `originalIndex`, `subscriptions`, `changeHistory`, `previousValue`.
- Metadata entries MUST be mutable only internally.
  - External APIs MUST NOT expose the mutable internal metadata object.
  - `.resolve()` MUST return an immutable snapshot that combines the value from the plain object with any metadata from the sparse Map.

### Array Index and Pointer Maintenance

- When array values are added or removed, all affected index pointers MUST be updated.
  - Example: inserting at `/arr/0` shifts `/arr/0` → `/arr/1`, `/arr/1` → `/arr/2`, etc.
  - Example: removing `/arr/2` shifts `/arr/3` → `/arr/2`, `/arr/4` → `/arr/3`, etc.

### Performance Goals

- Operations/queries MUST be optimized for quick/cheap reads and writes.
- Creating a plain object from the internal pointer map MUST be extremely fast and inexpensive.
- When `json-p3` functions need a plain object for operations, they SHOULD be given a limited subset of the generated plain object whenever feasible.

### Path vs Pointer Detection

- Public APIs that accept `pathOrPointer: string` MUST determine whether the input is a JSON Pointer, Relative JSON Pointer, or JSONPath.
- Detection MUST use `startsWith()` and/or regex-based heuristics.

#### Detection Logic (Mandatory)

```ts
function detectPathType(
	input: string,
): 'pointer' | 'relative-pointer' | 'jsonpath' {
	// JSON Pointer: starts with '/' or is empty string (root)
	if (input === '' || input.startsWith('/')) {
		return 'pointer';
	}

	// URI Fragment JSON Pointer: starts with '#/'
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

#### Handling Relative JSON Pointers

- When `detectPathType` returns `'relative-pointer'`, resolution MUST be performed relative to a context pointer.
- If no context pointer is available, relative pointers MUST throw in strict mode or be treated as invalid.

## Construction

### Constructor

`new DataMap(initialValue, options?)`

### Options

- `strict?: boolean`
  - When `true`, invalid operations throw (invalid paths, invalid patches, attempts to set read-only paths, etc.).
  - When `false`, methods may return safe fallbacks where specified (e.g., `get()` returns `undefined`, `getAll()` returns `[]` when there are no matches).
- `schema?: unknown`
  - Future enhancement. When present, it has highest precedence for typing and path validation.
- `context?: Ctx`
  - Passed into getter/setter/subscription fns.
  - Context does NOT participate in derived-value caching.
- `define?: (Definition | ((obj: DataMap, ctx: Ctx) => Definition | Definition[]))[]`
  - Function signature note: `obj` is the `DataMap` instance.
  - Dynamic values (getter/setter) registered at construction time.
  - Function definitions are evaluated once at construction.
- `subscribe?: Subscription[]`
  - Subscription rules registered at construction time.

## API Surface (Draft)

### Read

- `.get(pathOrPointer, options?)`
  - Uses `.resolve()` (and therefore `json-p3`) to resolve.
  - Always returns a single value.
    - If multiple values are matched, only the first match is returned.
  - If there are no matches:
    - returns `undefined` when `strict: false`
    - throws when `strict: true`
  - If a dynamic `define.get` or subscription exists for this path, it participates in the returned value.

- `.getAll(pathOrPointer, options?)`
  - Uses `.resolve()` (and therefore `json-p3`) to resolve.
  - Always returns an array of values.
    - Returns `[]` when there are no matches and `strict: false`.
    - Throws when there are no matches and `strict: true`.
  - If multiple values are matched, all are returned in deterministic order.
  - If a dynamic `define.get` or subscription exists for this path, it participates in the returned values.

- `.resolve(pathOrPointer, options?)`
  - Used internally by `.get()`, `.getAll()`, mutation methods, etc.
  - Uses `json-p3` to resolve.
  - Returns an array of resolved matches with metadata.
    - Each match MUST include `pointer` (JSON Pointer to the matched location) and `value`.
    - Each match MUST also include an immutable snapshot of the internal value record metadata for that pointer.
    - Returned match objects MUST be immutable snapshots (copies) and MUST NOT expose internal mutable value records.

Illustrative shapes:

```ts
type NodeMetadata = {
	readOnly?: boolean;
	lastUpdated?: number;
	previousValue?: unknown;
	getter?: unknown;
	setter?: unknown;
	type?: string;
	originalIndex?: number;
	subscriptions?: unknown[];
	changeHistory?: unknown[];
};

type ResolvedMatch = Readonly<
	{
		pointer: string;
		value: unknown;
	} & Partial<NodeMetadata>
>;
```

### Write (Patch-First)

All mutations MUST be expressed as RFC 6902 JSON Patch operations. Each mutation method:

1. Resolves the input path (via `json-p3`).
2. Builds the minimal patch necessary.
3. Runs subscription hooks (which may transform or block).
4. Applies the patch (unless using the corresponding `.x.toPatch()` variant).

#### Patch Batching Scope

- Any time a patch is created, operations MUST be batched.
- There are two batching scopes:
  - **Single-call scope**: each mutation call (`set`, `map`, `patch`) produces a single (possibly empty) list of RFC 6902 operations.
  - **Batch-chain scope**: multiple mutation calls can contribute operations to a single batched patch via `.batch`.
- Subscription hooks operate on the batched operations.
- Batched operations are applied once per scope, unless using `.x.toPatch()`.

#### Chained Batch Mutations (`.batch`)

- Mutation methods MUST be chainable within a batch scope so that multiple mutations can be combined into a single applied patch.
- `DataMap` MUST expose a `batch` accessor that starts (or returns) a batch-chain scope.
- In a batch-chain scope:
  - `.set()`, `.setAll()`, `.map()`, and `.patch()` MUST create/extend the current batched patch but MUST NOT apply it immediately.
  - Each mutation method MUST return the same batch scope object to enable chaining.
  - The accumulated patch MUST NOT be applied until `.apply()` is explicitly called.
- The batch scope MUST expose:
  - `.apply()`: Applies the accumulated patch to the DataMap and returns the DataMap instance.
  - `.toPatch()`: Returns the accumulated RFC 6902 patch operations array without applying them.

Example:

```ts
// Chained mutations with explicit apply
myMap.batch.set('$.user.dob', '1990-02-01').set('$.user.name', 'John').apply(); // applies the accumulated patch

// Get patch without applying
const patch = myMap.batch
	.set('$.user.dob', '1990-02-01')
	.set('$.user.name', 'John')
	.toPatch(); // returns Operation[] without applying
```

##### Reference Implementation Pattern (Illustrative)

```ts
type Batch<Target extends DataMap> = {
	set(...args: Parameters<Target['set']['toPatch']>): Batch<Target>;
	setAll(...args: Parameters<Target['setAll']['toPatch']>): Batch<Target>;
	map(...args: Parameters<Target['map']['toPatch']>): Batch<Target>;
	apply(): Target;
	toPatch(): Operation[];
};

class DataMap {
	get batch(): Batch<this> {
		const target = this;
		const patch: Operation[] = [];

		const batch: Batch<this> = {
			set(...args: any[]) {
				patch.push(...target.set.toPatch(...args));
				return batch;
			},
			setAll(...args: any[]) {
				patch.push(...target.setAll.toPatch(...args));
				return batch;
			},
			map(...args: any[]) {
				patch.push(...target.map.toPatch(...args));
				return batch;
			},
			apply() {
				target.patch(patch);
				return target;
			},
			toPatch() {
				return patch;
			},
		};

		return batch;
	}
}
```

Mutation methods (representative):

- `.set(pathOrPointer, value, options?)`
  - Non-existent paths MUST be created.
  - When `pathOrPointer` matches multiple nodes, `.set()` applies only to the **first matched location** (mirroring `.get()` behavior).
  - `value` can be a literal value or a setter function.
  - Container creation rules:
    - When creating missing intermediates, the implementation MUST decide whether to create an object or an array based on the path syntax.
    - `[]` or other array filtering/indexing syntax implies an array; otherwise an object.
- `.setAll(pathOrPointer, value, options?)`
  - Non-existent paths MUST be created.
  - When `pathOrPointer` matches multiple nodes, `.setAll()` applies to **all matched locations** (mirroring `.getAll()` behavior).
  - `value` can be a literal value or a setter function.
    - A setter function can be used to conditionally update only some matches by returning the current value (i.e., `===` unchanged) for matches that should not change.
  - Container creation rules are the same as `.set()`.

#### Container Creation for Non-Existent Paths

When a path does not exist and must be created:

- The implementation MUST generate the necessary JSON Patch `add` operations to create all missing intermediate containers **before** setting the final value.
- Container type determination:
  - `[]` or other array filtering/indexing syntax implies an array.
  - Otherwise, an object is created.
- The patch MUST be valid RFC 6902: parent containers must exist before child values can be added.

Example: Setting `$.foo.bar.baz` when only `$.foo` exists requires:

1. `{ "op": "add", "path": "/foo/bar", "value": {} }`
2. `{ "op": "add", "path": "/foo/bar/baz", "value": <the value> }`

- `.map(pathOrPointer, mapperFn, options?)`
  - Reads the current value at the path, computes a new value, then sets via patch.
  - If `pathOrPointer` is to an object, the mapper function acts on the entries of the object.
  - When `pathOrPointer` matches multiple nodes, `.map()` applies to **all matched locations** (can be used for selective updates by returning unchanged values).
- `.patch(ops, options?)`
  - Applies RFC 6902 ops.

- Array mutations (operate on array values and MUST update pointers/indexes accordingly):
  - `.push(pathOrPointer, ...items)`
    - Appends items to the array.
    - Equivalent to JSON Patch `add` ops at `${basePointer}/-`.
  - `.pop(pathOrPointer)`
    - Removes the last item from the array.
    - Equivalent to JSON Patch `remove` at `${basePointer}/${length - 1}`.
  - `.shift(pathOrPointer)`
    - Removes the first item from the array.
    - Equivalent to JSON Patch `remove` at `${basePointer}/0`.
    - MUST re-index subsequent element pointers.
  - `.unshift(pathOrPointer, ...items)`
    - Inserts items at the start of the array.
    - Equivalent to JSON Patch `add` ops at `${basePointer}/0` (applied in-order).
    - MUST re-index existing element pointers.
  - `.splice(pathOrPointer, start, deleteCount, ...items)`
    - Removes and/or inserts items at `start`.
    - MUST re-index affected element pointers.
  - `.sort(pathOrPointer, compareFn?)`
    - Sorts the array.
    - MAY be implemented as a single `replace` operation of the whole array (preferred for simplicity and pointer correctness).
  - `.shuffle(pathOrPointer)`
    - Shuffles the array.
    - MAY be implemented as a single `replace` operation of the whole array.

Each mutation method also supports patch generation without applying:

- `.set.toPatch(pathOrPointer, value, options?) => Operation[]`
- `.setAll.toPatch(pathOrPointer, value, options?) => Operation[]`
- `.map.toPatch(pathOrPointer, mapperFn, options?) => Operation[]`
- `.patch.toPatch(ops, options?) => Operation[]`

- Array mutation patch generation:
  - `.push.toPatch(pathOrPointer, ...items) => Operation[]`
  - `.pop.toPatch(pathOrPointer) => Operation[]`
  - `.shift.toPatch(pathOrPointer) => Operation[]`
  - `.unshift.toPatch(pathOrPointer, ...items) => Operation[]`
  - `.splice.toPatch(pathOrPointer, start, deleteCount, ...items) => Operation[]`
  - `.sort.toPatch(pathOrPointer, compareFn?) => Operation[]`
  - `.shuffle.toPatch(pathOrPointer) => Operation[]`

### Strict Behavior (Per-Instance and Per-Call)

- The constructor’s `strict` value is the default.
- Each method accepts `options?: { strict?: boolean }` to override the default for that call.

## Minimal Patch Requirement

- Patch output MUST be the most minimal patch possible (within RFC 6902), including when creating missing intermediates.
- Deterministic patch output is required (stable order for multi-op patches).
- A set of operations that replace all known members of an object or array should be batched into a single operation.

## RFC 6902 Operation Semantics

### `move` Operation and Subscriptions

- When a `move` operation is applied, subscriptions MUST NOT move with the value.
- Subscriptions remain bound to their original path/pointer.
- The subscription at the `from` path will fire a `remove` event.
- The subscription at the `path` (destination) will fire a `set` event (if one exists).
- Metadata associated with the source path MUST be cleaned up (removed from the sparse metadata Map).
- Metadata associated with the destination path is NOT automatically transferred.

Example: If a subscription exists on `/users/0` and a `move` operation moves `/users/0` to `/archived/0`:

- The subscription on `/users/0` fires with a `remove` event.
- The subscription on `/users/0` does NOT follow the value to `/archived/0`.
- If a subscription exists on `/archived/0`, it fires with a `set` event.

## Plain Object Storage and json-p3 Interop

With the sidecar metadata architecture, the primary data store IS a plain JavaScript object. This simplifies interop with `json-p3`.

### Key Benefits

- `json-p3` operations operate directly on the plain object—no materialization needed.
- JSONPath queries and JSON Patch operations work natively.
- The sparse metadata `Map` is only consulted when metadata is needed (getters, setters, subscriptions, etc.).

### Performance Considerations

- **Reads**: Direct property access on the plain object. $O(1)$ for pointer-based access.
- **Writes**: JSON Patch is applied directly to the plain object via `json-p3`.
- **Metadata Lookup**: Sparse `Map` lookup by JSON Pointer string. $O(1)$ average case.
- **Serialization (`.toJSON()`)**: The plain object can be returned directly or shallow-cloned for immutability.

## Dynamic Values (`define`)

Dynamic values (getters/setters) are configured at instantiation.

### Definition Shape

At a minimum, each definition provides:

- `path: string`
- Optional `get`
- Optional `set`
- Optional `deps?: string[]`
- Optional `readOnly?: boolean`
- Optional `defaultValue?: unknown`
  - When provided, `defaultValue` is used as the initial stored value for this path instead of executing the getter during initialization.
  - This avoids side effects or expensive computations during construction.

Definitions can be literal objects, or factory functions `() => Definition` evaluated at construction time.

### Getter

- A getter can be provided as a function or object form.
- Getter receives the current stored value at the path, dependency values, the map instance, and context.
- If `deps` is provided, getter values are cached by dependency values.

### Setter

- A setter can be provided as a function or object form.
- Setter transforms the incoming “public” value into the “stored” value.
- If `deps` is provided, setter is called when any dependency value changes, and the stored value is updated.

### Dependencies and Caching

- Getter dependency invalidation rules:
  - The system subscribes internally to `on: 'set'` for each dependency path.
  - Cache is invalidated when the dependency’s value actually changes.
  - `on:set` MUST NOT trigger if new value is `===` to old value.
  - If a dependency points to an object/array, it is considered “changed” when any nested value changes.
  - Actual stored values are all updated in a single patch operation after all `on:set` handlers are called.
- If no deps are specified:
  - Getter is executed on `get`.
  - (If the path is written) the getter may also be relevant during `set` depending on subscription stage usage.
- Context does not affect cache keys.

### Initialization Ordering

- At construction, definitions are processed to populate initial values.
- The order MUST be determined via a dependency graph derived from `deps`.

## Subscriptions

Subscriptions can be registered for any valid JSONPath/Pointer supported by `json-p3`.

### Ordering and Pipelining

- When multiple subscriptions apply to a given resolved location, the most specific subscription paths MUST execute first.
- When specificity is equal, subscriptions execute in registration order.
- Stage handlers execute as a pipeline:
  - The output of one handler becomes the input to the next handler in that stage.
  - This applies to value-transforming stages (e.g., `before: 'set'`) and patch-transforming stages.

### Execution Order

The subscription pipeline MUST execute in the following order:

1. **All `before` handlers** (grouped by stage, most specific first within each stage)
   - `before` handlers may transform the value or call `cancel()`.
2. **All `on` handlers** (grouped by stage, most specific first within each stage)
   - `on` handlers execute after `before` but before the mutation is committed.
   - `on` handlers may call `cancel()`.
3. **Commit the mutation** (apply the patch to the data store)
4. **All `after` handlers** (grouped by stage, most specific first within each stage)
   - `after` handlers CANNOT affect the stored value (mutation already committed).
   - `after` handlers are for side effects (logging, notifications, etc.).

### Events and Stages

Events supported (each may have `before`, `on`, and/or `after` depending on the event):

- `get`:
  - `before`: called before the getter is called, receives the currently stored raw value.
  - `on`: called after the getter is called, receives the result of the getter.
  - `after`: called after all getters and subscriptions have been called, receives the result.
- `set`:
  - `before`: called before the setter is called, receives the new value, returns the value to be passed to the setter.
  - `on`: called after the setter is called, receives the result of the setter, before the stored value is updated.
  - Fired when any mutation affects the value of the subscribed path/pointer.
  - `after`: called after all setters and subscriptions have been called, receives the result.
    - Cannot affect the stored value, since it's already been updated.
  - No separate `map`/`merge`/`applyPatch` events are needed.
- `remove`:
  - `before`: called before the removal is performed, receives the current value.
  - `on`: no difference from `before`, just executes after all `before` handlers.
  - `after`: called after the removal is performed.
- `resolve`: `before` | `on`
  - `before`: called before the JSON Path/Pointer is resolved, receives the Path/Pointer and returns a resolved path.
  - `on`: called after the JSON Path/Pointer is resolved, receives the resolved path.
  - `after`: called after the JSON Path/Pointer is resolved, receives the resolved path and the current value.
- `patch`:
  - `before`: called before the patch is applied, receives the patch operation.
  - `on`: no difference from `before`, just executes after all `before` handlers.
  - `after`: called after the patch is applied, receives the patch operation.

### Patch Manipulation

- Subscriptions MAY manipulate patches (middleware-style).
- `set` subscriptions:
  - If subscribed to `set`, the patch is updated with the new value internally.
- Separate `patch` event:
  - `before: 'patch'`:
    - `fn` receives the same arguments as `set`.
    - `fn` MUST return a valid JSON Patch operation.
  - `on: 'patch'`:
    - `fn` receives the patch operation as the first argument.
    - `fn` MUST return a valid JSON Patch operation.
  - `after: 'patch'` - `fn` receives the patch operation as the first argument. - Return value cannot affect the stored value, since it's already been updated.

### Blocking and Validation

- A subscription may prevent a mutation by:
  - throwing an error, or
  - calling the `cancel()` function passed to the handler.
- The `cancel()` function MUST be provided as a parameter to subscription handlers in `before` and `on` stages.
- When `cancel()` is called:
  - The current mutation MUST be aborted.
  - Subsequent handlers in the pipeline MUST NOT be executed.
  - The patch MUST NOT be applied.
- Signature: subscription handlers receive `cancel: () => void` as part of their arguments.

## Typing and Path Validity

Typing for the root object and path-based access is derived from, in order of precedence:

1. Optional `schema` option passed to the constructor (future enhancement).
2. Explicit class generics, e.g. `new DataMap<MyType>(...)`.
3. The initial value passed to the constructor.
4. The paths from `define` and `subscribe` (appended to the derived type if not already present).

When `strict: true` is passed to the constructor, only valid paths are allowed.

## Example (Illustrative)

```typescript
interface DataMapContext {
	MS_PER_YEAR: number;
	NOW: number;
}

const myMap = new DataMap(srcObj, {
	strict: true,
	define: [
		{
			path: '$.user.dob',
			get: (currentVal: number, deps: any[], obj: DataMap) => {
				return new Date(currentVal);
			},
			set: {
				fn: (
					newVal: string | number | Date,
					currentVal: number,
					deps: any[],
					obj: DataMap,
				) => {
					if (typeof newVal === 'number') {
						return newVal;
					}

					if (!(newVal instanceof Date)) {
						newVal = new Date(newVal);
					}

					return newVal.getTime();
				},
			},
		},
		() => {
			return {
				path: '$.user.age',
				get: {
					fn: (val: number, deps: any[], obj: DataMap, ctx: DataMapContext) => {
						return Math.floor((ctx.NOW - val) / ctx.MS_PER_YEAR);
					},
					deps: ['$.user.dob'],
				},
			};
		},
	],
	context: {
		MS_PER_YEAR: 1000 * 60 * 60 * 24 * 365.25,
		NOW: Date.now(),
	} as DataMapContext,
	subscribe: [
		{
			path: '$.user.age',
			before: 'set',
			fn: (newVal: number, deps: any[], obj: DataMap) => {
				if (newVal < 18) {
					throw new Error('You must be at least 18');
				}

				console.log('age changed to', newVal);
			},
		},
		{
			path: '$.user.dob',
			after: ['set'],
			fn: (
				val: Date,
				op: string,
				deps: any[],
				obj: DataMap,
				ctx: DataMapContext,
			) => {
				const now = new Date(ctx.NOW);
				if (now.getMonth() === val.getMonth()) {
					console.log('Happy Birthday!!!');
				}
			},
		},
	],
});

myMap.set('$.user.dob', '1990-02-01');
myMap.get('$.user.dob'); // Date
myMap.get('$.user.age'); // number

myMap.set('$.user.dob', new Date(2000, 1, 1));
myMap.get('$.user.age');

myMap.set('$.user.age', 38); // throws (read-only) when strict: true
```
