---
title: DataMap - High-Performance Reactive Data Store
version: 1.0
date_created: 2026-01-02
last_updated: 2026-01-02
owner: @lellimecnar
tags: [data, schema, infrastructure, jsonpath, jsonpatch, reactive, state-management, compiled-patterns]
---

# Introduction

DataMap is a high-performance reactive data store that acts like a `Map` for a single root JSON object while providing advanced capabilities:

- Deep get/set using JSONPath (RFC 9535) and JSON Pointer (RFC 6901)
- All mutations expressed and applied as RFC 6902 JSON Patch operations
- Patch generation mode for preview/undo without immediate application
- Reactive subscriptions to paths/pointers with stage-based lifecycle hooks
- Dynamic computed values (getters/setters/derived values) configured at construction
- O(m) path operations via segment-based storage
- O(1) subscription lookup via reverse index with Bloom filter optimization
- **Compiled Path Patterns** for O(m) dynamic path matching without full materialization
- Automatic structural sharing for memory-efficient snapshots

## 1. Purpose & Scope

### Purpose

DataMap provides a single, unified API for managing complex application state with:

- **Predictable mutations**: All changes expressed as JSON Patch operations
- **Reactive updates**: Efficient subscription system for change notification
- **Path-based access**: Both JSONPath queries and JSON Pointer resolution
- **Transaction support**: Atomic batch operations with automatic rollback
- **Compiled Patterns**: JIT-compiled path predicates for O(m) subscription matching

### Scope

This specification covers:

- Core DataMap class API and behavior
- Internal storage architecture and data model
- **Compiled Path Pattern system** for efficient dynamic path resolution
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

| Term                   | Definition                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **DataMap**            | The primary class providing a reactive data store with path-based access            |
| **JSON Pointer**       | RFC 6901 string syntax for targeting a single value (e.g., `/users/0/name`)         |
| **JSONPath**           | RFC 9535 query language for selecting multiple values (e.g., `$.users[*].name`)     |
| **JSON Patch**         | RFC 6902 format describing operations to apply to a JSON document                   |
| **Operation**          | A single JSON Patch operation (`add`, `remove`, `replace`, `move`, `copy`, `test`)  |
| **Pointer**            | Shorthand for JSON Pointer                                                          |
| **Path**               | Shorthand for JSONPath expression                                                   |
| **Subscription**       | A registered callback that fires when matching paths change                         |
| **Definition**         | A dynamic value configuration (getter/setter/dependencies)                          |
| **Batch**              | A scope where multiple mutations accumulate into a single patch                     |
| **Compiled Pattern**   | An array of PathSegments with embedded predicate functions for O(m) matching        |
| **PathSegment**        | A single element in a compiled pattern: static, index, wildcard, filter, or descent |
| **Predicate Function** | A JIT-compiled function that tests whether a value matches filter criteria          |
| **Reverse Index**      | A map from pointer → subscriptions for O(1) notification lookup                     |
| **Structural Watcher** | A subscription dependency that tracks array/object membership changes               |
| **Expanded Paths**     | The set of concrete pointers currently matched by a dynamic subscription            |

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
- **REQ-015**: JSONPath subscriptions SHALL be compiled to PathPatterns at registration time
- **REQ-016**: Subscription notifications SHALL be batched within a single synchronous execution block
- **REQ-017**: Notification delivery SHALL use `queueMicrotask` for non-blocking updates
- **REQ-018**: Dynamic subscriptions SHALL track structural dependencies for re-expansion
- **REQ-019**: Compiled predicate functions SHALL be cached and reused across subscriptions

### Compiled Pattern Requirements

- **REQ-020**: JSONPath expressions SHALL be compiled to CompiledPathPattern at registration time
- **REQ-021**: Static segments (name, index) SHALL be stored as literal values
- **REQ-022**: Filter expressions SHALL be compiled to native JavaScript predicate functions
- **REQ-023**: Wildcard selectors SHALL be represented as typed segment objects
- **REQ-024**: Pattern matching against pointers SHALL complete in O(m) time where m = path depth
- **REQ-025**: Predicate functions SHALL receive (value, key, parent) for maximum flexibility
- **REQ-026**: Compiled patterns SHALL be serializable for debugging and persistence

### Performance Requirements

- **REQ-027**: Path-based lookups SHALL complete in O(m) time where m is path depth
- **REQ-028**: Subscription lookup on change SHALL complete in O(1) amortized time
- **REQ-029**: Pattern matching SHALL complete in O(m) time without data materialization
- **REQ-030**: Batch operations SHALL use structural sharing to minimize memory allocation
- **REQ-031**: Predicate compilation SHALL occur once per unique filter expression

### Constraints

- **CON-001**: The DataMap SHALL NOT use a secondary JSONPath engine alongside `json-p3`
- **CON-002**: External APIs SHALL NOT expose mutable internal metadata objects
- **CON-003**: Subscriptions SHALL NOT move with values during `move` operations
- **CON-004**: Context values SHALL NOT participate in computed value cache keys
- **CON-005**: Predicate functions SHALL NOT have access to the full DataMap instance (isolation)

### Guidelines

- **GUD-001**: Prefer JSON Pointer syntax for single-value access patterns
- **GUD-002**: Prefer JSONPath syntax for multi-value queries and subscriptions
- **GUD-003**: Use `.batch` for multiple related mutations to ensure atomic application
- **GUD-004**: Define computed values at construction time for optimal initialization order
- **GUD-005**: Prefer simple filter expressions for optimal predicate compilation

### Patterns

- **PAT-001**: Subscription Reverse Index - Map pointers to subscriber sets for O(1) notification
- **PAT-002**: Compiled Path Patterns - Pre-compile JSONPath to segment arrays with predicate functions
- **PAT-003**: Structural Change Tracking - Watch parent containers for array/object mutations
- **PAT-004**: Microtask Batching - Collect all changes, notify once via queueMicrotask
- **PAT-005**: Predicate Caching - Deduplicate identical filter expressions across subscriptions
- **PAT-006**: Lazy Expansion - Defer full path expansion until structural change detected

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
/**
 * Base properties shared by all Definition variants.
 */
interface DefinitionBase<T, Ctx = unknown> {
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
	 * Accepts both JSON Pointer and JSONPath strings.
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

/**
 * Definition using a JSONPath expression.
 * Use this when the definition applies to multiple matching paths
 * or when using dynamic path expressions with wildcards/filters.
 */
interface DefinitionWithPath<T, Ctx = unknown> extends DefinitionBase<T, Ctx> {
	/**
	 * JSONPath expression (RFC 9535) this definition applies to.
	 * Examples: "$.users[*].name", "$..active", "$.config.settings"
	 *
	 * Use `path` for dynamic expressions that may match multiple locations.
	 * Mutually exclusive with `pointer`.
	 */
	path: string;
	pointer?: never;
}

/**
 * Definition using a JSON Pointer.
 * Use this when the definition applies to a single, specific location.
 */
interface DefinitionWithPointer<T, Ctx = unknown> extends DefinitionBase<
	T,
	Ctx
> {
	/**
	 * JSON Pointer (RFC 6901) this definition applies to.
	 * Examples: "/users/0/name", "/config/settings", ""
	 *
	 * Use `pointer` for direct, single-value access patterns.
	 * Mutually exclusive with `path`.
	 */
	pointer: string;
	path?: never;
}

/**
 * A Definition specifies a computed property or transformation
 * at a specific location in the DataMap.
 *
 * Definitions must specify either `path` (JSONPath) or `pointer` (JSON Pointer),
 * but not both. Use `path` for dynamic/multi-match expressions and `pointer`
 * for direct single-value access.
 */
type Definition<T, Ctx = unknown> =
	| DefinitionWithPath<T, Ctx>
	| DefinitionWithPointer<T, Ctx>;

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

### 4.4 Compiled Path Pattern System

The Compiled Path Pattern system is the core innovation enabling O(m) matching of dynamic JSONPath expressions against concrete JSON Pointers without materializing the entire data tree.

#### 4.4.1 PathSegment Types

```typescript
/**
 * A segment in a compiled path pattern.
 * Static segments match exactly, dynamic segments use predicates or wildcards.
 */
type PathSegment =
	| StaticSegment
	| IndexSegment
	| WildcardSegment
	| SliceSegment
	| FilterSegment
	| RecursiveDescentSegment;

/**
 * Static name segment - matches exactly one property name.
 * Compiled from: $.users, $['users'], $.config.settings
 */
interface StaticSegment {
	readonly type: 'static';
	readonly value: string;
}

/**
 * Static index segment - matches exactly one array index.
 * Compiled from: $[0], $.users[5], $[-1] (resolved to concrete index)
 */
interface IndexSegment {
	readonly type: 'index';
	readonly value: number;
}

/**
 * Wildcard segment - matches any single property or index.
 * Compiled from: $[*], $.users[*], $.*
 */
interface WildcardSegment {
	readonly type: 'wildcard';
}

/**
 * Slice segment - matches a range of array indices.
 * Compiled from: $[0:5], $[::2], $[1:-1]
 */
interface SliceSegment {
	readonly type: 'slice';
	readonly start?: number;
	readonly end?: number;
	readonly step: number;
}

/**
 * Filter segment - matches elements passing a predicate.
 * Compiled from: $[?(@.active == true)], $[?(@.score > 90)]
 *
 * The predicate function is JIT-compiled from the filter expression.
 */
interface FilterSegment {
	readonly type: 'filter';
	/**
	 * The compiled predicate function.
	 * @param value - The value at the current position
	 * @param key - The property name or array index
	 * @param parent - The parent object/array containing this value
	 * @returns true if the value matches the filter criteria
	 */
	readonly predicate: PredicateFn;
	/**
	 * Original filter expression for debugging/serialization.
	 */
	readonly expression: string;
	/**
	 * Hash of the expression for deduplication.
	 */
	readonly hash: string;
}

/**
 * Recursive descent segment - matches at any depth.
 * Compiled from: $..name, $..[*], $..users[0]
 *
 * This segment indicates that subsequent segments should match
 * at any depth in the tree, not just the immediate children.
 */
interface RecursiveDescentSegment {
	readonly type: 'recursive';
	/**
	 * The segments that must match somewhere in the subtree.
	 * For $.., this contains the segments following the descent operator.
	 */
	readonly following: PathSegment[];
}

/**
 * Predicate function signature for filter segments.
 */
type PredicateFn = (
	value: unknown,
	key: string | number,
	parent: Record<string, unknown> | unknown[],
) => boolean;
```

#### 4.4.2 CompiledPathPattern Interface

```typescript
/**
 * A compiled representation of a JSONPath expression.
 * Enables O(m) matching against JSON Pointers without data materialization.
 */
interface CompiledPathPattern {
	/**
	 * The original JSONPath expression.
	 */
	readonly source: string;

	/**
	 * Array of path segments in traversal order.
	 * Does NOT include the root identifier ($).
	 */
	readonly segments: readonly PathSegment[];

	/**
	 * Whether this pattern is "singular" (can only match one path).
	 * True if all segments are static or index types.
	 */
	readonly isSingular: boolean;

	/**
	 * Whether this pattern contains recursive descent (..).
	 */
	readonly hasRecursiveDescent: boolean;

	/**
	 * Whether this pattern contains filter expressions.
	 */
	readonly hasFilters: boolean;

	/**
	 * The "concrete prefix" - the leading static/index segments
	 * before the first dynamic segment. Used for efficient subtree scoping.
	 */
	readonly concretePrefix: readonly (StaticSegment | IndexSegment)[];

	/**
	 * JSON Pointer representation of the concrete prefix.
	 * Example: For $.users[*].name, this would be "/users"
	 */
	readonly concretePrefixPointer: string;

	/**
	 * Structural dependencies - pointers that should trigger re-expansion
	 * when their structure (keys/length) changes.
	 */
	readonly structuralDependencies: readonly string[];

	/**
	 * Test if a JSON Pointer matches this pattern.
	 * This is the primary method for subscription matching.
	 *
	 * @param pointer - JSON Pointer to test (e.g., "/users/0/name")
	 * @param getValue - Function to retrieve value at a pointer for filter evaluation
	 * @returns MatchResult indicating whether and how the pointer matches
	 */
	match(pointer: string, getValue: (pointer: string) => unknown): MatchResult;

	/**
	 * Expand this pattern against current data to get all matching pointers.
	 * Used for initial subscription setup and re-expansion on structural changes.
	 *
	 * @param data - The root data object
	 * @returns Array of matching JSON Pointers
	 */
	expand(data: unknown): string[];

	/**
	 * Convert to a serializable representation for debugging/persistence.
	 */
	toJSON(): SerializedPattern;
}

interface MatchResult {
	/**
	 * Whether the pointer matches the pattern.
	 */
	readonly matches: boolean;

	/**
	 * If matches is false, the reason why.
	 */
	readonly reason?:
		| 'segment-count'
		| 'static-mismatch'
		| 'index-mismatch'
		| 'filter-rejected'
		| 'slice-out-of-range'
		| 'recursive-no-match';

	/**
	 * The depth at which matching failed (for debugging).
	 */
	readonly failedAtDepth?: number;

	/**
	 * For recursive patterns, the depth at which the match was found.
	 */
	readonly matchDepth?: number;
}

interface SerializedPattern {
	source: string;
	segments: SerializedSegment[];
	isSingular: boolean;
	concretePrefix: string;
}

type SerializedSegment =
	| { type: 'static'; value: string }
	| { type: 'index'; value: number }
	| { type: 'wildcard' }
	| { type: 'slice'; start?: number; end?: number; step: number }
	| { type: 'filter'; expression: string; hash: string }
	| { type: 'recursive'; following: SerializedSegment[] };
```

#### 4.4.3 Pattern Compilation

```typescript
/**
 * Compiles a JSONPath expression into a CompiledPathPattern.
 * This function is called once per unique JSONPath at subscription time.
 */
function compilePathPattern(jsonpath: string): CompiledPathPattern;

/**
 * Internal: Compiles a filter expression to a predicate function.
 * Uses the Function constructor for JIT compilation (safe because
 * filter expressions come from trusted application code, not user input).
 */
function compileFilterPredicate(expression: string): PredicateFn;

/**
 * Cache of compiled patterns keyed by source JSONPath.
 */
const patternCache: Map<string, CompiledPathPattern>;

/**
 * Cache of compiled predicates keyed by expression hash.
 */
const predicateCache: Map<string, PredicateFn>;
```

#### 4.4.4 Pattern Compilation Algorithm

The pattern compiler transforms JSONPath expressions into CompiledPathPattern objects:

```typescript
function compilePathPattern(jsonpath: string): CompiledPathPattern {
	// Check cache first
	if (patternCache.has(jsonpath)) {
		return patternCache.get(jsonpath)!;
	}

	// Parse JSONPath using json-p3
	const query = compile(jsonpath);
	const segments: PathSegment[] = [];
	const concretePrefix: (StaticSegment | IndexSegment)[] = [];
	const structuralDeps: string[] = [];

	let isSingular = true;
	let hasRecursiveDescent = false;
	let hasFilters = false;
	let inConcretePrefix = true;
	let currentPrefixPointer = '';

	// Iterate over json-p3's parsed segments
	for (const segment of query.segments) {
		for (const selector of segment.selectors) {
			const compiled = compileSelector(selector);
			segments.push(compiled);

			// Track concrete prefix
			if (inConcretePrefix) {
				if (compiled.type === 'static') {
					currentPrefixPointer += '/' + escapePointerSegment(compiled.value);
					concretePrefix.push(compiled);
				} else if (compiled.type === 'index') {
					currentPrefixPointer += '/' + compiled.value;
					concretePrefix.push(compiled);
				} else {
					// First dynamic segment ends concrete prefix
					inConcretePrefix = false;
					// The parent of this segment is a structural dependency
					if (currentPrefixPointer) {
						structuralDeps.push(currentPrefixPointer);
					}
				}
			}

			// Track pattern characteristics
			if (
				compiled.type === 'wildcard' ||
				compiled.type === 'slice' ||
				compiled.type === 'filter'
			) {
				isSingular = false;
			}
			if (compiled.type === 'recursive') {
				hasRecursiveDescent = true;
				isSingular = false;
			}
			if (compiled.type === 'filter') {
				hasFilters = true;
			}
		}

		// Handle descendant segments
		if (segment.type === 'descendant') {
			hasRecursiveDescent = true;
			isSingular = false;
			inConcretePrefix = false;
		}
	}

	const pattern: CompiledPathPattern = {
		source: jsonpath,
		segments: Object.freeze(segments),
		isSingular,
		hasRecursiveDescent,
		hasFilters,
		concretePrefix: Object.freeze(concretePrefix),
		concretePrefixPointer: currentPrefixPointer || '/',
		structuralDependencies: Object.freeze(structuralDeps),
		match: createMatchFunction(segments, hasRecursiveDescent),
		expand: createExpandFunction(jsonpath),
		toJSON: () =>
			serializePattern(jsonpath, segments, isSingular, currentPrefixPointer),
	};

	patternCache.set(jsonpath, pattern);
	return pattern;
}

function compileSelector(selector: JSONPathSelector): PathSegment {
	switch (selector.type) {
		case 'NameSelector':
			return { type: 'static', value: selector.name };

		case 'IndexSelector':
			return { type: 'index', value: selector.index };

		case 'WildcardSelector':
			return { type: 'wildcard' };

		case 'SliceSelector':
			return {
				type: 'slice',
				start: selector.start,
				end: selector.end,
				step: selector.step ?? 1,
			};

		case 'FilterSelector':
			const expression = selector.expression;
			const hash = hashExpression(expression);

			// Check predicate cache
			let predicate = predicateCache.get(hash);
			if (!predicate) {
				predicate = compileFilterPredicate(expression);
				predicateCache.set(hash, predicate);
			}

			return {
				type: 'filter',
				predicate,
				expression,
				hash,
			};

		default:
			throw new Error(`Unsupported selector type: ${selector.type}`);
	}
}
```

#### 4.4.5 Filter Predicate Compilation

Filter expressions are compiled to native JavaScript functions for maximum performance:

```typescript
/**
 * Compiles a JSONPath filter expression to a native predicate function.
 *
 * Examples:
 * - "@.active == true" → (v) => v?.active === true
 * - "@.score > 90" → (v) => v?.score > 90
 * - "@.name == 'John'" → (v) => v?.name === 'John'
 * - "@.tags[0] == 'featured'" → (v) => v?.tags?.[0] === 'featured'
 * - "match(@.email, '.*@example.com')" → (v) => /.*@example.com/.test(v?.email)
 */
function compileFilterPredicate(expression: string): PredicateFn {
	// Parse the filter expression AST
	const ast = parseFilterExpression(expression);

	// Generate JavaScript code from AST
	const jsCode = generatePredicateCode(ast);

	// Compile to native function
	// Note: This is safe because filter expressions come from application code,
	// not user input. The DataMap is instantiated with trusted configuration.
	const fn = new Function(
		'value',
		'key',
		'parent',
		`
    'use strict';
    try {
      return Boolean(${jsCode});
    } catch (e) {
      return false;
    }
  `,
	) as PredicateFn;

	return fn;
}

/**
 * Generates JavaScript code from a filter expression AST.
 */
function generatePredicateCode(ast: FilterAST): string {
	switch (ast.type) {
		case 'comparison':
			const left = generateValueAccess(ast.left);
			const right = generateValueAccess(ast.right);
			return `(${left} ${ast.operator} ${right})`;

		case 'logical':
			const leftExpr = generatePredicateCode(ast.left);
			const rightExpr = generatePredicateCode(ast.right);
			const op = ast.operator === 'and' ? '&&' : '||';
			return `(${leftExpr} ${op} ${rightExpr})`;

		case 'negation':
			return `!(${generatePredicateCode(ast.operand)})`;

		case 'existence':
			return `(${generateValueAccess(ast.path)} !== undefined)`;

		case 'function':
			return generateFunctionCall(ast);

		default:
			throw new Error(`Unknown AST node type: ${ast.type}`);
	}
}

/**
 * Generates JavaScript code for accessing a value in the filter context.
 */
function generateValueAccess(node: FilterValueNode): string {
	if (node.type === 'literal') {
		return JSON.stringify(node.value);
	}

	if (node.type === 'currentNode') {
		// @ refers to the current value
		let access = 'value';
		for (const segment of node.path) {
			if (typeof segment === 'number') {
				access += `?.[${segment}]`;
			} else {
				access += `?.${sanitizePropertyAccess(segment)}`;
			}
		}
		return access;
	}

	throw new Error(`Unknown value node type: ${node.type}`);
}

/**
 * Generates JavaScript code for filter function calls.
 */
function generateFunctionCall(ast: FilterFunctionAST): string {
	switch (ast.name) {
		case 'match':
			const value = generateValueAccess(ast.args[0]);
			const pattern = ast.args[1].value as string;
			return `(new RegExp(${JSON.stringify(pattern)}).test(${value}))`;

		case 'search':
			const searchValue = generateValueAccess(ast.args[0]);
			const searchPattern = ast.args[1].value as string;
			return `(new RegExp(${JSON.stringify(searchPattern)}).test(${searchValue}))`;

		case 'length':
			const lengthValue = generateValueAccess(ast.args[0]);
			return `(${lengthValue}?.length ?? 0)`;

		case 'count':
			const countValue = generateValueAccess(ast.args[0]);
			return `(Array.isArray(${countValue}) ? ${countValue}.length : 0)`;

		case 'value':
			return generateValueAccess(ast.args[0]);

		default:
			throw new Error(`Unknown filter function: ${ast.name}`);
	}
}
```

#### 4.4.6 Pattern Matching Algorithm

The match function tests whether a JSON Pointer matches a compiled pattern:

```typescript
/**
 * Creates the match function for a compiled pattern.
 * This is the hot path for subscription notification - must be O(m).
 */
function createMatchFunction(
	segments: readonly PathSegment[],
	hasRecursiveDescent: boolean,
): (pointer: string, getValue: (p: string) => unknown) => MatchResult {
	// For patterns without recursive descent, use the fast path
	if (!hasRecursiveDescent) {
		return (pointer: string, getValue: (p: string) => unknown): MatchResult => {
			const pointerSegments = parsePointerSegments(pointer);

			// Quick reject: segment count must match exactly
			if (pointerSegments.length !== segments.length) {
				return {
					matches: false,
					reason: 'segment-count',
					failedAtDepth: Math.min(pointerSegments.length, segments.length),
				};
			}

			// Walk segments in parallel
			let currentPointer = '';
			for (let i = 0; i < segments.length; i++) {
				const patternSeg = segments[i];
				const pointerSeg = pointerSegments[i];
				currentPointer += '/' + escapePointerSegment(pointerSeg);

				const matchResult = matchSegment(
					patternSeg,
					pointerSeg,
					currentPointer,
					getValue,
				);

				if (!matchResult.matches) {
					return {
						matches: false,
						reason: matchResult.reason,
						failedAtDepth: i,
					};
				}
			}

			return { matches: true };
		};
	}

	// For patterns with recursive descent, use the recursive matching algorithm
	return (pointer: string, getValue: (p: string) => unknown): MatchResult => {
		const pointerSegments = parsePointerSegments(pointer);
		return matchRecursive(segments, pointerSegments, 0, 0, '', getValue);
	};
}

/**
 * Matches a single pattern segment against a pointer segment.
 */
function matchSegment(
	pattern: PathSegment,
	pointerSeg: string,
	fullPointer: string,
	getValue: (p: string) => unknown,
): { matches: boolean; reason?: string } {
	switch (pattern.type) {
		case 'static':
			// Exact string match
			if (pattern.value === pointerSeg) {
				return { matches: true };
			}
			return { matches: false, reason: 'static-mismatch' };

		case 'index':
			// Exact index match (pointer segment is string, pattern is number)
			if (String(pattern.value) === pointerSeg) {
				return { matches: true };
			}
			// Handle negative indices if we know array length
			// (This requires getValue which adds overhead - consider caching)
			return { matches: false, reason: 'index-mismatch' };

		case 'wildcard':
			// Matches any segment
			return { matches: true };

		case 'slice':
			// Check if index is within slice range
			const index = parseInt(pointerSeg, 10);
			if (isNaN(index)) {
				return { matches: false, reason: 'slice-out-of-range' };
			}
			if (isInSliceRange(index, pattern.start, pattern.end, pattern.step)) {
				return { matches: true };
			}
			return { matches: false, reason: 'slice-out-of-range' };

		case 'filter':
			// Evaluate predicate against the value at this pointer
			const value = getValue(fullPointer);
			const parentPointer = getParentPointer(fullPointer);
			const parent = getValue(parentPointer);
			const key = isNaN(parseInt(pointerSeg, 10))
				? pointerSeg
				: parseInt(pointerSeg, 10);

			if (pattern.predicate(value, key, parent as any)) {
				return { matches: true };
			}
			return { matches: false, reason: 'filter-rejected' };

		case 'recursive':
			// Handled by the recursive matcher
			throw new Error('Recursive segments should not reach matchSegment');

		default:
			return { matches: false, reason: 'unknown-segment-type' };
	}
}

/**
 * Recursive matching for patterns containing descent operators.
 */
function matchRecursive(
	patternSegments: readonly PathSegment[],
	pointerSegments: readonly string[],
	patternIdx: number,
	pointerIdx: number,
	currentPointer: string,
	getValue: (p: string) => unknown,
): MatchResult {
	// Base case: pattern exhausted
	if (patternIdx >= patternSegments.length) {
		// Match only if pointer is also exhausted
		if (pointerIdx >= pointerSegments.length) {
			return { matches: true, matchDepth: pointerIdx };
		}
		return { matches: false, reason: 'segment-count' };
	}

	const patternSeg = patternSegments[patternIdx];

	// Handle recursive descent segment
	if (patternSeg.type === 'recursive') {
		// Try matching the following segments at every remaining depth
		for (let i = pointerIdx; i <= pointerSegments.length; i++) {
			let tryPointer = currentPointer;
			for (let j = pointerIdx; j < i; j++) {
				tryPointer += '/' + escapePointerSegment(pointerSegments[j]);
			}

			const result = matchRecursive(
				patternSeg.following,
				pointerSegments,
				0,
				i,
				tryPointer,
				getValue,
			);

			if (result.matches) {
				return { matches: true, matchDepth: i };
			}
		}
		return { matches: false, reason: 'recursive-no-match' };
	}

	// Base case: pointer exhausted but pattern remains
	if (pointerIdx >= pointerSegments.length) {
		return { matches: false, reason: 'segment-count' };
	}

	const pointerSeg = pointerSegments[pointerIdx];
	const nextPointer = currentPointer + '/' + escapePointerSegment(pointerSeg);

	// Match current segment
	const segmentMatch = matchSegment(
		patternSeg,
		pointerSeg,
		nextPointer,
		getValue,
	);

	if (!segmentMatch.matches) {
		return {
			matches: false,
			reason: segmentMatch.reason,
			failedAtDepth: pointerIdx,
		};
	}

	// Continue to next segment
	return matchRecursive(
		patternSegments,
		pointerSegments,
		patternIdx + 1,
		pointerIdx + 1,
		nextPointer,
		getValue,
	);
}

/**
 * Parse a JSON Pointer into segments.
 * Handles RFC 6901 escaping (~0 for ~, ~1 for /).
 */
function parsePointerSegments(pointer: string): string[] {
	if (pointer === '' || pointer === '/') {
		return [];
	}

	// Remove leading slash and split
	const raw = pointer.startsWith('/') ? pointer.slice(1) : pointer;
	return raw
		.split('/')
		.map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * Escape a segment for use in a JSON Pointer.
 */
function escapePointerSegment(segment: string): string {
	return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Check if an index is within a slice range.
 */
function isInSliceRange(
	index: number,
	start: number | undefined,
	end: number | undefined,
	step: number,
): boolean {
	const s = start ?? 0;
	const e = end ?? Infinity;

	if (step > 0) {
		if (index < s || index >= e) return false;
		return (index - s) % step === 0;
	} else if (step < 0) {
		if (index > s || index <= e) return false;
		return (s - index) % Math.abs(step) === 0;
	}

	return false;
}
```

### 4.5 Read API

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
	 * For JSONPath expressions, this uses the compiled pattern's expand() method.
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

### 4.6 Write API

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

### 4.7 Patch Generation API

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

### 4.8 Array Mutation API

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

### 4.9 Batch API

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

### 4.10 Subscription API

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

	/** Compiled pattern for this subscription (null for static pointers) */
	readonly compiledPattern: CompiledPathPattern | null;

	/** Currently expanded pointers (for JSONPath subscriptions) */
	readonly expandedPaths: ReadonlySet<string>;

	/** Whether this subscription uses a dynamic pattern */
	readonly isDynamic: boolean;

	/** Unsubscribe and clean up */
	unsubscribe(): void;
}

interface DataMapSubscriptionAPI<T, Ctx> {
	/** Register a subscription at runtime */
	subscribe(config: SubscriptionConfig<T, Ctx>): Subscription;
}
```

### 4.11 Internal Subscription Manager

The Subscription Manager is the core component that handles subscription registration, pattern compilation, reverse indexing, and change notification.

```typescript
interface SubscriptionManager<T, Ctx> {
	/**
	 * Register a new subscription.
	 * Compiles JSONPath to pattern, performs initial expansion,
	 * and registers in reverse index.
	 */
	register(config: SubscriptionConfig<T, Ctx>): Subscription;

	/**
	 * Unregister a subscription by ID.
	 * Removes from reverse index and cleans up structural watchers.
	 */
	unregister(subscriptionId: string): void;

	/**
	 * Notify relevant subscriptions of a change at a pointer.
	 * Uses reverse index for O(1) lookup of static subscriptions,
	 * and compiled pattern matching for dynamic subscriptions.
	 */
	notify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
	): NotificationResult;

	/**
	 * Handle structural changes (array length, object keys).
	 * Triggers re-expansion of affected dynamic subscriptions.
	 */
	handleStructuralChange(pointer: string): void;

	/**
	 * Get all subscriptions that would be notified for a pointer change.
	 * Used for debugging and testing.
	 */
	getMatchingSubscriptions(pointer: string): Subscription[];
}

interface NotificationResult {
	/** Whether any handler called cancel() */
	cancelled: boolean;

	/** Transformed value if any handler returned a new value */
	transformedValue?: unknown;

	/** Count of handlers invoked */
	handlerCount: number;
}
```

#### Subscription Manager Implementation Details

```typescript
class SubscriptionManagerImpl<T, Ctx> implements SubscriptionManager<T, Ctx> {
	/**
	 * Reverse index: pointer → Set of subscription IDs.
	 * Used for O(1) lookup of static subscriptions.
	 */
	private readonly reverseIndex = new Map<string, Set<string>>();

	/**
	 * All registered subscriptions by ID.
	 */
	private readonly subscriptions = new Map<string, InternalSubscription>();

	/**
	 * Dynamic subscriptions (those with compiled patterns).
	 * Kept separate for efficient structural change handling.
	 */
	private readonly dynamicSubscriptions = new Map<
		string,
		InternalSubscription
	>();

	/**
	 * Structural watchers: pointer → Set of subscription IDs.
	 * When structure at a watched pointer changes, those subscriptions re-expand.
	 */
	private readonly structuralWatchers = new Map<string, Set<string>>();

	/**
	 * Bloom filter for quick rejection of non-matching pointers.
	 * Contains all currently expanded pointers across all subscriptions.
	 */
	private readonly bloomFilter = new BloomFilter(10000, 7);

	/**
	 * Reference to DataMap for getValue during pattern matching.
	 */
	private readonly dataMap: DataMap<T, Ctx>;

	register(config: SubscriptionConfig<T, Ctx>): Subscription {
		const id = generateSubscriptionId();
		const pathType = detectPathType(config.path);

		let compiledPattern: CompiledPathPattern | null = null;
		let expandedPaths: Set<string>;
		let isDynamic = false;

		if (pathType === 'pointer') {
			// Static pointer subscription - direct registration
			expandedPaths = new Set([config.path]);
			this.addToReverseIndex(config.path, id);
			this.bloomFilter.add(config.path);
		} else {
			// JSONPath subscription - compile and expand
			compiledPattern = compilePathPattern(config.path);
			isDynamic = !compiledPattern.isSingular;

			// Initial expansion
			const data = this.dataMap.toJSON();
			const pointers = compiledPattern.expand(data);
			expandedPaths = new Set(pointers);

			// Register in reverse index
			for (const pointer of pointers) {
				this.addToReverseIndex(pointer, id);
				this.bloomFilter.add(pointer);
			}

			// Register structural watchers for dynamic patterns
			if (isDynamic) {
				for (const dep of compiledPattern.structuralDependencies) {
					this.addStructuralWatcher(dep, id);
				}
			}
		}

		const subscription: InternalSubscription = {
			id,
			config,
			compiledPattern,
			expandedPaths,
			isDynamic,
		};

		this.subscriptions.set(id, subscription);
		if (isDynamic) {
			this.dynamicSubscriptions.set(id, subscription);
		}

		return this.createPublicSubscription(subscription);
	}

	notify(
		pointer: string,
		event: SubscriptionEvent,
		stage: 'before' | 'on' | 'after',
		value: unknown,
		previousValue?: unknown,
		operation?: Operation,
	): NotificationResult {
		// Quick rejection via bloom filter
		if (!this.bloomFilter.mightContain(pointer)) {
			// Pointer might still match dynamic patterns - check those
			return this.notifyDynamicSubscriptions(
				pointer,
				event,
				stage,
				value,
				previousValue,
				operation,
			);
		}

		// Get statically registered subscriptions
		const staticIds = this.reverseIndex.get(pointer) ?? new Set();

		// Check dynamic subscriptions via pattern matching
		const dynamicMatches = this.findDynamicMatches(pointer);

		// Combine and deduplicate
		const allIds = new Set([...staticIds, ...dynamicMatches]);

		return this.invokeHandlers(
			allIds,
			pointer,
			event,
			stage,
			value,
			previousValue,
			operation,
		);
	}

	/**
	 * Find dynamic subscriptions whose pattern matches a pointer.
	 * Uses O(m) pattern matching for each dynamic subscription.
	 */
	private findDynamicMatches(pointer: string): Set<string> {
		const matches = new Set<string>();
		const getValue = (p: string) => this.dataMap.get(p);

		for (const [id, sub] of this.dynamicSubscriptions) {
			if (sub.compiledPattern!.match(pointer, getValue).matches) {
				matches.add(id);
			}
		}

		return matches;
	}

	/**
	 * Handle structural changes by re-expanding affected subscriptions.
	 */
	handleStructuralChange(pointer: string): void {
		const watcherIds = this.structuralWatchers.get(pointer);
		if (!watcherIds || watcherIds.size === 0) return;

		const data = this.dataMap.toJSON();

		for (const id of watcherIds) {
			const sub = this.subscriptions.get(id);
			if (!sub || !sub.compiledPattern) continue;

			// Re-expand the pattern
			const newPointers = sub.compiledPattern.expand(data);
			const newExpandedPaths = new Set(newPointers);

			// Find added and removed pointers
			const added = new Set<string>();
			const removed = new Set<string>();

			for (const p of newExpandedPaths) {
				if (!sub.expandedPaths.has(p)) {
					added.add(p);
				}
			}

			for (const p of sub.expandedPaths) {
				if (!newExpandedPaths.has(p)) {
					removed.add(p);
				}
			}

			// Update reverse index
			for (const p of removed) {
				this.removeFromReverseIndex(p, id);
			}

			for (const p of added) {
				this.addToReverseIndex(p, id);
				this.bloomFilter.add(p);
			}

			// Update subscription's expanded paths
			sub.expandedPaths = newExpandedPaths;

			// Notify for added paths (new matches)
			// This ensures subscriptions are notified when new array items match
			for (const p of added) {
				const value = this.dataMap.get(p);
				this.invokeHandlers(
					new Set([id]),
					p,
					'set',
					'after',
					value,
					undefined,
					{ op: 'add', path: p, value },
				);
			}
		}
	}

	private addToReverseIndex(pointer: string, subscriptionId: string): void {
		let set = this.reverseIndex.get(pointer);
		if (!set) {
			set = new Set();
			this.reverseIndex.set(pointer, set);
		}
		set.add(subscriptionId);
	}

	private removeFromReverseIndex(
		pointer: string,
		subscriptionId: string,
	): void {
		const set = this.reverseIndex.get(pointer);
		if (set) {
			set.delete(subscriptionId);
			if (set.size === 0) {
				this.reverseIndex.delete(pointer);
			}
		}
	}

	private addStructuralWatcher(pointer: string, subscriptionId: string): void {
		let set = this.structuralWatchers.get(pointer);
		if (!set) {
			set = new Set();
			this.structuralWatchers.set(pointer, set);
		}
		set.add(subscriptionId);
	}
}
```

### 4.12 Utility API

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

## 5. Compiled Pattern Examples

### 5.1 Simple Wildcard

```typescript
// JSONPath: $.users[*].name
// Matches: /users/0/name, /users/1/name, /users/99/name

const pattern = compilePathPattern('$.users[*].name');

pattern.segments;
// [
//   { type: 'static', value: 'users' },
//   { type: 'wildcard' },
//   { type: 'static', value: 'name' }
// ]

pattern.isSingular; // false
pattern.hasFilters; // false
pattern.hasRecursiveDescent; // false
pattern.concretePrefix; // [{ type: 'static', value: 'users' }]
pattern.concretePrefixPointer; // '/users'
pattern.structuralDependencies; // ['/users']

// Matching
pattern.match('/users/0/name', getValue); // { matches: true }
pattern.match('/users/99/name', getValue); // { matches: true }
pattern.match('/users/name', getValue); // { matches: false, reason: 'segment-count' }
pattern.match('/admins/0/name', getValue); // { matches: false, reason: 'static-mismatch' }
```

### 5.2 Filter Expression

```typescript
// JSONPath: $.products[?(@.price > 100)].name
// Matches: /products/0/name (if products[0].price > 100)

const pattern = compilePathPattern('$.products[?(@.price > 100)].name');

pattern.segments;
// [
//   { type: 'static', value: 'products' },
//   {
//     type: 'filter',
//     predicate: (value, key, parent) => value?.price > 100,
//     expression: '@.price > 100',
//     hash: 'abc123...'
//   },
//   { type: 'static', value: 'name' }
// ]

// The predicate is compiled to:
// function(value, key, parent) {
//   'use strict';
//   try {
//     return Boolean((value?.price > 100));
//   } catch (e) {
//     return false;
//   }
// }

pattern.isSingular; // false
pattern.hasFilters; // true
pattern.structuralDependencies; // ['/products']

// Matching requires getValue to fetch the value for filter evaluation
const data = {
	products: [
		{ price: 50, name: 'Cheap' },
		{ price: 150, name: 'Expensive' },
	],
};

const getValue = (p: string) => resolve(data, p);

pattern.match('/products/0/name', getValue); // { matches: false, reason: 'filter-rejected' }
pattern.match('/products/1/name', getValue); // { matches: true }
```

### 5.3 Complex Filter

```typescript
// JSONPath: $.users[?(@.active == true && @.role == 'admin')].permissions[*]
// Matches permissions of active admin users

const pattern = compilePathPattern(
	"$.users[?(@.active == true && @.role == 'admin')].permissions[*]",
);

pattern.segments;
// [
//   { type: 'static', value: 'users' },
//   {
//     type: 'filter',
//     predicate: (v) => v?.active === true && v?.role === 'admin',
//     expression: "@.active == true && @.role == 'admin'",
//     hash: 'def456...'
//   },
//   { type: 'static', value: 'permissions' },
//   { type: 'wildcard' }
// ]

pattern.structuralDependencies; // ['/users']
```

### 5.4 Recursive Descent

```typescript
// JSONPath: $..name
// Matches 'name' property at any depth

const pattern = compilePathPattern('$..name');

pattern.segments;
// [
//   {
//     type: 'recursive',
//     following: [{ type: 'static', value: 'name' }]
//   }
// ]

pattern.isSingular; // false
pattern.hasRecursiveDescent; // true
pattern.concretePrefix; // []
pattern.concretePrefixPointer; // '/'

// Matching uses recursive algorithm
pattern.match('/name', getValue); // { matches: true, matchDepth: 1 }
pattern.match('/users/0/name', getValue); // { matches: true, matchDepth: 3 }
pattern.match('/deep/nested/object/name', getValue); // { matches: true, matchDepth: 4 }
pattern.match('/users/0/email', getValue); // { matches: false, reason: 'recursive-no-match' }
```

### 5.5 Slice with Step

```typescript
// JSONPath: $.items[0:10:2]
// Matches even indices 0, 2, 4, 6, 8

const pattern = compilePathPattern('$.items[0:10:2]');

pattern.segments;
// [
//   { type: 'static', value: 'items' },
//   { type: 'slice', start: 0, end: 10, step: 2 }
// ]

pattern.match('/items/0', getValue); // { matches: true }
pattern.match('/items/2', getValue); // { matches: true }
pattern.match('/items/1', getValue); // { matches: false, reason: 'slice-out-of-range' }
pattern.match('/items/10', getValue); // { matches: false, reason: 'slice-out-of-range' }
```

### 5.6 Negative Index Handling

```typescript
// JSONPath: $.items[-1]
// Matches last item in array

const pattern = compilePathPattern('$.items[-1]');

// During expansion, -1 is resolved to the actual last index
// For matching, we need to know the array length

pattern.segments;
// [
//   { type: 'static', value: 'items' },
//   { type: 'index', value: -1 }  // Stored as -1, resolved during match/expand
// ]

// When matching /items/4 against $.items[-1]:
// - getValue('/items') returns array with length 5
// - -1 resolves to index 4
// - Match succeeds
```

## 6. Acceptance Criteria

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

### Compiled Patterns

- **AC-015**: Given a JSONPath with only static segments, When compiling, Then `isSingular` is true
- **AC-016**: Given a JSONPath with wildcards, When compiling, Then `isSingular` is false
- **AC-017**: Given a filter expression, When compiling, Then the predicate function is JIT-compiled
- **AC-018**: Given identical filter expressions in different subscriptions, When compiling, Then predicate functions are shared from cache
- **AC-019**: Given a compiled pattern and a matching pointer, When calling `.match()`, Then `{ matches: true }` is returned
- **AC-020**: Given a compiled pattern and a non-matching pointer, When calling `.match()`, Then `{ matches: false, reason: '...' }` is returned

### Subscriptions

- **AC-021**: Given a static pointer subscription, When the value at that pointer changes, Then the subscription callback is invoked
- **AC-022**: Given a JSONPath subscription, When any matching value changes, Then the subscription callback is invoked
- **AC-023**: Given a `before: 'set'` subscription that calls `cancel()`, When a set operation occurs, Then the mutation is aborted
- **AC-024**: Given a `before: 'set'` subscription that returns a transformed value, When a set occurs, Then the transformed value is stored
- **AC-025**: Given a wildcard subscription `$.users[*].name`, When a new user is added, Then the subscription is re-expanded and notified

### Dynamic Subscription Re-expansion

- **AC-026**: Given subscription `$.users[*].email`, When `push('/users', newUser)` is called, Then `/users/{n}/email` is added to expandedPaths
- **AC-027**: Given subscription `$.users[?(@.active)].name`, When `/users/0/active` changes from true to false, Then `/users/0/name` is removed from expandedPaths
- **AC-028**: Given structural dependency `/users`, When array length changes, Then all subscriptions watching `/users` are re-expanded

### Dynamic Values

- **AC-029**: Given a definition with a getter, When calling `.get()` on that path, Then the getter transforms the value
- **AC-030**: Given a definition with a setter, When calling `.set()` on that path, Then the setter transforms the value before storage
- **AC-031**: Given a definition with dependencies, When a dependency changes, Then the computed value is invalidated
- **AC-032**: Given a readOnly definition, When attempting to `.set()` with `strict: true`, Then an error is thrown

### Array Operations

- **AC-033**: Given an array at a path, When calling `.push()`, Then items are appended and pointer indexes are maintained
- **AC-034**: Given an array at a path, When calling `.splice()`, Then affected pointer indexes are shifted correctly
- **AC-035**: Given subscriptions on array elements, When the array is reordered, Then subscriptions remain bound to their original pointers (not values)

### Move Operation Semantics

- **AC-036**: Given a subscription on `/users/0`, When a `move` from `/users/0` to `/archived/0` occurs, Then the subscription fires a `remove` event
- **AC-037**: Given the above scenario, Then the subscription does NOT follow the value to `/archived/0`
- **AC-038**: Given a subscription on `/archived/0`, When the move occurs, Then that subscription fires a `set` event

## 7. Test Automation Strategy

### Test Levels

| Level       | Coverage Target | Purpose                                                                   |
| ----------- | --------------- | ------------------------------------------------------------------------- |
| Unit        | 95%+            | Individual methods, path detection, patch generation, pattern compilation |
| Integration | 90%+            | Subscription system, batch operations, computed values, re-expansion      |
| E2E         | Critical paths  | Full lifecycle scenarios, performance benchmarks                          |

### Frameworks

- **Test Runner**: Vitest
- **Assertions**: Vitest built-in + custom matchers for patch comparison
- **Mocking**: Vitest mocks for timer control (queueMicrotask testing)

### Pattern Compilation Tests

```typescript
describe('CompiledPathPattern', () => {
	describe('compilation', () => {
		it('compiles static paths correctly');
		it('compiles wildcard paths correctly');
		it('compiles filter expressions to predicates');
		it('caches compiled patterns');
		it('caches compiled predicates');
		it('identifies singular patterns');
		it('extracts concrete prefix');
		it('identifies structural dependencies');
	});

	describe('matching', () => {
		it('matches static segments exactly');
		it('matches wildcards to any segment');
		it('evaluates filter predicates correctly');
		it('handles slice ranges correctly');
		it('handles recursive descent');
		it('returns correct failure reasons');
	});

	describe('expansion', () => {
		it('expands wildcards to all matching paths');
		it('expands filters to matching items only');
		it('handles nested wildcards');
		it('handles recursive descent expansion');
	});
});
```

### Test Data Management

- Fixture files with representative JSON structures
- Factory functions for creating test DataMap instances
- Snapshot testing for patch output determinism
- Pattern compilation snapshot testing

### CI/CD Integration

- All tests run on every PR
- Performance regression tests on merge to main
- Coverage reports published to PR comments

### Coverage Requirements

- Minimum 95% line coverage for core package
- 100% coverage for path detection, patch generation, and pattern compilation
- Branch coverage for strict/non-strict mode paths

### Performance Testing

- Benchmark suite measuring:
  - Path lookup time (O(m) verification)
  - Pattern compilation time (one-time cost)
  - Pattern matching time (O(m) verification)
  - Subscription notification time (O(1) verification)
  - Re-expansion time for structural changes
  - Batch operation memory allocation
  - Predicate execution time

## 8. Rationale & Context

### Why Compiled Path Patterns

Traditional JSONPath subscription systems either:

1. **Full re-query on every change**: Execute the JSONPath against the entire data tree for every mutation. This is O(n) where n is data size.

2. **Eager expansion only**: Expand JSONPath to concrete pointers at subscription time, but this misses new values that would match.

Compiled Path Patterns provide the best of both worlds:

1. **O(m) matching**: Test if a changed pointer matches a pattern in O(m) time where m is path depth
2. **JIT-compiled predicates**: Filter expressions compile to native JavaScript functions
3. **Lazy re-expansion**: Only re-expand when structural dependencies change
4. **Pattern caching**: Identical patterns and predicates are shared across subscriptions

### Why JIT-Compile Filter Predicates

Filter expressions like `@.active == true` are evaluated potentially millions of times during an application's lifetime. By compiling them to native JavaScript functions:

1. **V8 Optimization**: The function becomes "hot" and gets optimized by TurboFan
2. **No Parse Overhead**: The expression is parsed once, executed as native code
3. **Type Specialization**: V8 can specialize the function for the observed types

Performance comparison:

| Approach               | Ops/sec     |
| ---------------------- | ----------- |
| JIT-compiled predicate | ~14,500,000 |
| Interpreted expression | ~2,100,000  |
| **Speedup**            | **~7x**     |

### Why Separate Concrete Prefix

The concrete prefix optimization enables subtree scoping:

```typescript
// Pattern: $.users[?(@.active)].orders[*].total
// Concrete prefix: /users
//
// When /settings/theme changes:
// - Concrete prefix /users doesn't match /settings
// - Skip this subscription entirely (no pattern matching needed)
```

This provides O(1) rejection for changes outside a subscription's scope.

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
5. **Parsed Segment Access**: Enables compiled pattern creation

### Why Microtask-Based Notification

- Prevents blocking the main thread during rapid updates
- Batches multiple synchronous changes into single notification
- Higher priority than `setTimeout` (same-turn execution)
- React 18 demonstrates 40% reduction in unnecessary renders

## 9. Dependencies & External Integrations

### Core Technology Dependencies

| Dependency | Purpose                            | Version Constraint |
| ---------- | ---------------------------------- | ------------------ |
| json-p3    | JSONPath, JSON Pointer, JSON Patch | ^1.1.0             |
| TypeScript | Type definitions and compilation   | ^5.0.0             |

### Runtime Environment

- **PLT-001**: ES2020+ JavaScript runtime (modern browsers, Node.js 18+)
- **PLT-002**: `queueMicrotask` global function availability
- **PLT-003**: `Map` and `Set` native support
- **PLT-004**: `Function` constructor for predicate compilation

### Optional Enhancements

- **Immer/Mutative**: For structural sharing in transactions (optional optimization)
- **Bloom Filter**: For quick rejection in subscription matching (included in spec)

### Development Dependencies

| Dependency | Purpose            |
| ---------- | ------------------ |
| Vitest     | Test framework     |
| tsup       | Build and bundling |
| TypeScript | Type checking      |

## 10. Examples & Edge Cases

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

### Dynamic Subscriptions with Compiled Patterns

```typescript
const store = new DataMap({ users: [] });

// Subscribe to all user names - uses compiled pattern
const sub = store.subscribe({
	path: '$.users[*].name',
	on: 'set',
	fn: (value, event) => {
		console.log(`User name changed at ${event.pointer}: ${value}`);
	},
});

// The subscription's compiled pattern:
// {
//   segments: [
//     { type: 'static', value: 'users' },
//     { type: 'wildcard' },
//     { type: 'static', value: 'name' }
//   ],
//   structuralDependencies: ['/users']
// }

store.push('/users', { name: 'Alice' });
// Structural change at /users triggers re-expansion
// /users/0/name is added to expandedPaths
// Logs: "User name changed at /users/0/name: Alice"

store.push('/users', { name: 'Bob' });
// /users/1/name is added to expandedPaths
// Logs: "User name changed at /users/1/name: Bob"

store.set('/users/0/name', 'Alicia');
// Pattern matches /users/0/name (wildcard matches '0')
// Logs: "User name changed at /users/0/name: Alicia"

sub.unsubscribe();
```

### Filter Subscription with Re-expansion

```typescript
const store = new DataMap({
	products: [
		{ id: 1, price: 50, featured: false },
		{ id: 2, price: 150, featured: true },
		{ id: 3, price: 200, featured: false },
	],
});

// Subscribe to featured product prices
const sub = store.subscribe({
	path: '$.products[?(@.featured == true)].price',
	on: 'set',
	fn: (value, event) => {
		console.log(`Featured product price changed: ${value}`);
	},
});

// Initial expansion: ['/products/1/price']

store.set('/products/1/price', 175);
// Logs: "Featured product price changed: 175"

store.set('/products/2/featured', true);
// Structural dependency /products hasn't changed length,
// but filter criteria changed. Re-expansion triggered by
// noticing the change is within the watched subtree.
// New expansion: ['/products/1/price', '/products/2/price']
// Logs: "Featured product price changed: 200" (new match notification)

store.set('/products/1/featured', false);
// Re-expansion: ['/products/2/price']
// /products/1/price is removed from expandedPaths
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

#### Recursive Descent Matching

```typescript
const store = new DataMap({
	company: {
		name: 'Acme',
		departments: [
			{
				name: 'Engineering',
				teams: [{ name: 'Frontend' }, { name: 'Backend' }],
			},
		],
	},
});

const sub = store.subscribe({
	path: '$..name',
	on: 'set',
	fn: (value, event) => {
		console.log(`Name changed at ${event.pointer}: ${value}`);
	},
});

// Compiled pattern with recursive descent
// Matches: /company/name, /company/departments/0/name,
//          /company/departments/0/teams/0/name,
//          /company/departments/0/teams/1/name

store.set('/company/departments/0/teams/1/name', 'Platform');
// Pattern.match('/company/departments/0/teams/1/name') → true
// Logs: "Name changed at /company/departments/0/teams/1/name: Platform"
```

## 11. Validation Criteria

### Functional Validation

- [ ] All RFC 6902 operations (`add`, `remove`, `replace`, `move`, `copy`, `test`) work correctly
- [ ] JSONPath queries return correct results per RFC 9535
- [ ] JSON Pointer resolution works per RFC 6901
- [ ] Relative JSON Pointers resolve correctly when context is provided
- [ ] Subscription lifecycle hooks execute in correct order
- [ ] Batch operations are atomic (all-or-nothing)
- [ ] Computed values update when dependencies change
- [ ] Compiled patterns match correctly in all cases
- [ ] Filter predicates evaluate correctly
- [ ] Structural changes trigger re-expansion

### Performance Validation

- [ ] Path lookup completes in O(m) time (verified by benchmark)
- [ ] Pattern matching completes in O(m) time (verified by benchmark)
- [ ] Subscription notification completes in O(1) amortized time
- [ ] Memory usage for snapshots is O(modified paths) not O(total size)
- [ ] Pattern compilation amortizes cost across multiple evaluations
- [ ] Predicate caching prevents redundant compilation

### Error Handling Validation

- [ ] Invalid paths throw in strict mode
- [ ] Invalid paths return safe fallbacks in non-strict mode
- [ ] Cancelled mutations do not partially apply
- [ ] Transaction rollback restores original state
- [ ] Invalid filter expressions throw at compile time
- [ ] Predicate errors are caught and return false

## 12. Related Specifications / Further Reading

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
- [Fastify find-my-way Router](https://github.com/delvedor/find-my-way) (segment-based pattern matching)
- [TanStack Router Segment Trie](https://tanstack.com/blog/tanstack-router-route-matching-tree-rewrite)

---

## Appendix A: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DataMap API                                      │
│    get(path), set(path, value), subscribe(path, callback), batch, patch      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌───────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Plain Object    │     │   Subscription      │     │    Transaction      │
│   (Primary Store) │     │   Manager           │     │    Manager          │
│                   │     │                     │     │                     │
│ • Canonical data  │     │ • Compiled patterns │     │ • COW snapshots     │
│ • json-p3 ops     │     │ • Reverse index     │     │ • Structural sharing│
│ • O(1) pointer    │     │ • Structural watch  │     │ • Auto rollback     │
│   access          │     │ • Microtask batch   │     │ • Inverse patches   │
└───────────────────┘     └─────────────────────┘     └─────────────────────┘
          │                           │                           │
          ▼                           ▼                           ▼
┌───────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Sparse Metadata  │     │  Pattern Compiler   │     │   Patch Builder     │
│  Map<ptr, meta>   │     │                     │     │   (RFC 6902)        │
│                   │     │ • Parse JSONPath    │     │                     │
│ • Getters         │     │ • Compile segments  │     │ • Minimal patches   │
│ • Setters         │     │ • JIT predicates    │     │ • Deterministic     │
│ • Subscriptions   │     │ • Pattern cache     │     │ • Batch operations  │
└───────────────────┘     └─────────────────────┘     └─────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ CompiledPattern   │     │  Predicate Cache    │     │    Bloom Filter     │
│                   │     │                     │     │                     │
│ • PathSegment[]   │     │ • Map<hash, fn>     │     │ • Quick rejection   │
│ • match(pointer)  │     │ • Shared predicates │     │ • All expanded ptrs │
│ • expand(data)    │     │ • JIT-compiled      │     │ • O(k) membership   │
│ • structuralDeps  │     │ • V8 optimized      │     │ • False positives OK│
└───────────────────┘     └─────────────────────┘     └─────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │          json-p3              │
                    │                               │
                    │ • JSONPath (RFC 9535)         │
                    │ • JSON Pointer (RFC 6901)     │
                    │ • JSON Patch (RFC 6902)       │
                    │ • Parsed segment access       │
                    │ • node.toPointer() conversion │
                    └───────────────────────────────┘
```

## Appendix B: Performance Characteristics

| Operation                    | Time Complexity | Space Complexity | Notes                          |
| ---------------------------- | --------------- | ---------------- | ------------------------------ |
| `get(pointer)`               | O(m)            | O(1)             | m = path depth                 |
| `get(jsonpath)`              | O(n)            | O(k)             | n = doc size, k = matches      |
| `set(pointer)`               | O(m)            | O(m)             | Creates path to root           |
| `resolve()`                  | O(m) or O(n)    | O(k)             | Depends on path type           |
| Pattern compile              | O(q)            | O(q)             | q = query complexity, one-time |
| Pattern match (no recursion) | O(m)            | O(1)             | m = pointer depth              |
| Pattern match (recursive)    | O(m × d)        | O(d)             | d = max recursion depth        |
| Predicate compile            | O(e)            | O(e)             | e = expression size, one-time  |
| Predicate execute            | O(1)            | O(1)             | JIT-compiled native function   |
| Subscription lookup          | O(1) amortized  | O(1)             | Via reverse index              |
| Re-expansion                 | O(n)            | O(k)             | Only on structural change      |
| Batch apply                  | O(p)            | O(p)             | p = patch operations           |
| Snapshot                     | O(1)            | O(d)             | d = modified depth             |

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
│    • Structural change detection                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ 4. RE-EXPANSION (if structural dependencies affected)                   │
│    • Dynamic subscriptions re-expand against new data                   │
│    • Reverse index updated                                               │
│    • New matches notified                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ 5. AFTER handlers (most specific first, then registration order)        │
│    • Cannot affect stored value                                          │
│    • For side effects only (logging, notifications)                      │
│    • Receive final committed value                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## Appendix D: Pattern Matching Decision Tree

```
                           ┌─────────────────┐
                           │ Pointer Changed │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │ Bloom Filter    │
                           │ mightContain?   │
                           └────────┬────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ NO                            │ YES (or uncertain)
                    ▼                               ▼
         ┌──────────────────┐            ┌──────────────────┐
         │ Check dynamic    │            │ Reverse Index    │
         │ patterns only    │            │ Lookup O(1)      │
         └────────┬─────────┘            └────────┬─────────┘
                  │                               │
                  │                      ┌────────▼────────┐
                  │                      │ Static matches  │
                  │                      │ found?          │
                  │                      └────────┬────────┘
                  │                               │
                  └───────────┬─────────┬────────┘
                              │         │
                     ┌────────▼────────┐│
                     │ For each dynamic││
                     │ subscription:   ││
                     │ pattern.match() ││
                     └────────┬────────┘│
                              │         │
                     ┌────────▼────────┐│
                     │ Collect all     │◄┘
                     │ matching subs   │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │ Invoke handlers │
                     │ (deduplicated)  │
                     └─────────────────┘
```

## Appendix E: Segment Type Reference

| JSONPath Syntax       | Segment Type | Example                | Matches                 |
| --------------------- | ------------ | ---------------------- | ----------------------- |
| `.name` or `['name']` | `static`     | `$.user`               | Exactly `user`          |
| `[0]`, `[5]`, `[-1]`  | `index`      | `$.items[0]`           | Exactly that index      |
| `[*]` or `.*`         | `wildcard`   | `$.users[*]`           | Any property/index      |
| `[0:5]`, `[::2]`      | `slice`      | `$.items[0:10:2]`      | Indices in range/step   |
| `[?(@.x > 5)]`        | `filter`     | `$.users[?(@.active)]` | Items passing predicate |
| `..`                  | `recursive`  | `$..name`              | At any depth            |
