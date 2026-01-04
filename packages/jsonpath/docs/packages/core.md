# @jsonpath/core

> Shared types, error classes, utilities, and registries for the @jsonpath/\* library suite.

## Overview

`@jsonpath/core` is the foundational package that provides:

- **Type Definitions**: JSON value types, query result interfaces, function signatures
- **Error Hierarchy**: Structured error classes for all JSONPath operations
- **Utility Functions**: Deep equality, cloning, type guards
- **Global Registries**: Function, selector, and operator registration

This package has **zero dependencies** and is used by all other @jsonpath/\* packages.

## Installation

```bash
pnpm add @jsonpath/core
```

## API Reference

### Types

#### JSONValue

Represents any valid JSON value:

```typescript
type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| { [key: string]: JSONValue };
```

#### JSONPrimitive

```typescript
type JSONPrimitive = string | number | boolean | null;
```

#### JSONObject / JSONArray

```typescript
type JSONObject = Record<string, JSONValue>;
type JSONArray = JSONValue[];
```

#### PathSegment / Path

```typescript
type PathSegment = string | number;
type Path = readonly PathSegment[];
```

#### QueryNode

Represents a node in a query result set:

```typescript
interface QueryNode<T = unknown> {
	/** The value at this node */
	readonly value: T;

	/** The path to this node from the root */
	readonly path: Path;

	/** The root document this node belongs to */
	readonly root: unknown;

	/** Parent object/array containing this node */
	readonly parent?: unknown;

	/** Property name or index in parent */
	readonly parentKey?: PathSegment;
}
```

#### QueryResult

```typescript
interface QueryResult<T = unknown> extends Iterable<QueryNode<T>> {
	/** Extract all values */
	values: () => T[];

	/** Extract all paths as segment arrays */
	paths: () => PathSegment[][];

	/** Extract all paths as JSON Pointer strings (RFC 6901) */
	pointers: () => string[];

	/** Extract all paths as RFC 9535 Normalized Path strings */
	normalizedPaths: () => string[];

	/** Get all nodes */
	nodes: () => QueryNode<T>[];

	/** Get first node or undefined */
	first: () => QueryNode<T> | undefined;

	/** Get last node or undefined */
	last: () => QueryNode<T> | undefined;

	/** Check if result set is empty */
	isEmpty: () => boolean;

	/** Get result count */
	readonly length: number;

	/** Map values through a transform function */
	map: <U>(fn: (value: T, node: QueryNode<T>) => U) => U[];

	/** Filter nodes by predicate */
	filter: (fn: (value: T, node: QueryNode<T>) => boolean) => QueryResult<T>;

	/** Execute callback for each node */
	forEach: (fn: (value: T, node: QueryNode<T>) => void) => void;

	/** Get parents of all matched nodes */
	parents: () => QueryResult;
}
```

#### FunctionDefinition

Definition for a JSONPath function (RFC 9535):

```typescript
interface FunctionDefinition<
	TArgs extends unknown[] = unknown[],
	TReturn = unknown,
> {
	readonly name: string;
	readonly signature: readonly ParameterType[];
	readonly returns: ReturnType;
	readonly evaluate: (...args: TArgs) => TReturn;
}

type ParameterType = 'ValueType' | 'LogicalType' | 'NodesType';
type ReturnType = 'ValueType' | 'LogicalType' | 'NodesType';
```

#### EvaluatorOptions

Options for query evaluation:

```typescript
interface EvaluatorOptions {
	readonly maxDepth?: number; // Maximum recursion depth (default: 256)
	readonly maxResults?: number; // Maximum result count (default: 10,000)
	readonly maxNodes?: number; // Maximum nodes to visit
	readonly maxFilterDepth?: number; // Maximum filter expression depth
	readonly timeout?: number; // Timeout in milliseconds (0 = disabled)
	readonly detectCircular?: boolean; // Detect circular references
	readonly secure?: SecureQueryOptions;
	readonly signal?: AbortSignal; // Abort signal for cancellation
}

interface SecureQueryOptions {
	readonly allowPaths?: readonly string[]; // Whitelist of allowed paths
	readonly blockPaths?: readonly string[]; // Blacklist of blocked paths
	readonly noRecursive?: boolean; // Disable recursive descent
	readonly noFilters?: boolean; // Disable filter expressions
	readonly maxQueryLength?: number; // Max query string length
}
```

---

### Error Classes

All error classes extend `JSONPathError` and include rich context information.

#### JSONPathError

Base error class for all JSONPath operations:

```typescript
class JSONPathError extends Error {
	readonly code: ErrorCode;
	readonly position?: number; // Position in query string
	readonly path?: string; // Path being accessed
	readonly token?: string; // Token that caused the error
	readonly value?: unknown; // Value that caused the error
	readonly cause?: Error; // Underlying cause

	toJSON(): object; // Serialize for logging
}
```

**Error Codes:**

```typescript
type ErrorCode =
	| 'SYNTAX_ERROR' // Invalid JSONPath syntax
	| 'TYPE_ERROR' // Type mismatch
	| 'REFERENCE_ERROR' // Unresolved reference
	| 'POINTER_ERROR' // JSON Pointer error
	| 'PATCH_ERROR' // JSON Patch error
	| 'FUNCTION_ERROR' // Function execution error
	| 'INVALID_ARGUMENT' // Invalid function argument
	| 'SECURITY_ERROR' // Security constraint violation
	| 'LIMIT_ERROR' // Limit exceeded
	| 'TIMEOUT_ERROR' // Query timeout
	| 'UNEXPECTED_TOKEN' // Unexpected token in query
	| 'UNEXPECTED_END' // Unexpected end of query
	| 'INVALID_ESCAPE' // Invalid escape sequence
	| 'INVALID_NUMBER' // Invalid number literal
	| 'UNKNOWN_FUNCTION' // Unknown function name
	| 'MAX_DEPTH_EXCEEDED' // Recursion limit exceeded
	| 'TIMEOUT' // Query timed out
	| 'INVALID_ARRAY_INDEX' // Invalid array index
	| 'TEST_FAILED' // JSON Patch test failed
	| 'PATH_NOT_FOUND'; // Path does not exist
```

#### JSONPathSyntaxError

Thrown for invalid JSONPath query syntax:

```typescript
class JSONPathSyntaxError extends JSONPathError {
	readonly expected?: string; // What was expected
	readonly found?: string; // What was found
}
```

**Example:**

```typescript
try {
	parse('$.store[');
} catch (err) {
	if (err instanceof JSONPathSyntaxError) {
		console.log(err.code); // 'SYNTAX_ERROR'
		console.log(err.position); // Position of error
		console.log(err.message); // 'Expected ]'
	}
}
```

#### JSONPathTypeError

Thrown for type mismatches:

```typescript
class JSONPathTypeError extends JSONPathError {
	readonly expectedType?: string;
	readonly actualType?: string;
}
```

#### JSONPointerError

Thrown for JSON Pointer operations:

```typescript
class JSONPointerError extends JSONPathError {
	// code: 'POINTER_ERROR'
}
```

#### JSONPatchError

Thrown for JSON Patch operations:

```typescript
class JSONPatchError extends JSONPathError {
	readonly operationIndex?: number; // Which operation failed
	readonly operation?: string; // Operation type (add, remove, etc.)
}
```

---

### Utility Functions

#### Type Guards

```typescript
import { isObject, isArray, isPrimitive } from '@jsonpath/core';

isObject({ a: 1 }); // true
isObject([1, 2]); // false
isObject(null); // false

isArray([1, 2, 3]); // true
isArray({ a: 1 }); // false

isPrimitive('hello'); // true
isPrimitive(42); // true
isPrimitive(null); // true
isPrimitive({}); // false
```

#### deepEqual

Deep equality comparison:

```typescript
import { deepEqual } from '@jsonpath/core';

deepEqual({ a: [1, 2] }, { a: [1, 2] }); // true
deepEqual({ a: 1 }, { a: 2 }); // false
deepEqual([1, 2], [1, 2]); // true
```

#### deepClone

Creates a deep copy of a JSON value:

```typescript
import { deepClone } from '@jsonpath/core';

const original = { a: { b: [1, 2, 3] } };
const clone = deepClone(original);

clone.a.b.push(4);
console.log(original.a.b); // [1, 2, 3] - unchanged
```

#### freeze

Recursively freezes a JSON value:

```typescript
import { freeze } from '@jsonpath/core';

const data = freeze({ a: { b: 1 } });
data.a.b = 2; // TypeError in strict mode
```

---

### Registries

Global registries for extending JSONPath functionality.

#### Function Registry

```typescript
import {
	registerFunction,
	getFunction,
	hasFunction,
	unregisterFunction,
} from '@jsonpath/core';

// Register a custom function
registerFunction({
	name: 'uppercase',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) =>
		typeof val === 'string' ? val.toUpperCase() : val,
});

// Check if function exists
hasFunction('uppercase'); // true

// Get function definition
const fn = getFunction('uppercase');

// Unregister function
unregisterFunction('uppercase');
```

#### Selector & Operator Registries

```typescript
import { registerSelector, registerOperator } from '@jsonpath/core';

// These are used internally and for plugins
registerSelector({
	name: 'custom',
	parse: (lexer) => {
		/* ... */
	},
	evaluate: (node, ctx) => {
		/* ... */
	},
});

registerOperator({
	symbol: '=~',
	precedence: 30,
	associativity: 'left',
	evaluate: (left, right) => {
		/* ... */
	},
});
```

---

## Usage Examples

### Error Handling

```typescript
import {
	JSONPathError,
	JSONPathSyntaxError,
	JSONPatchError,
} from '@jsonpath/core';
import { query } from '@jsonpath/jsonpath';
import { applyPatch } from '@jsonpath/patch';

// Handle query errors
try {
	query({}, '$.invalid[syntax');
} catch (err) {
	if (err instanceof JSONPathSyntaxError) {
		console.error(`Syntax error at position ${err.position}: ${err.message}`);
	}
}

// Handle patch errors
try {
	applyPatch({}, [{ op: 'remove', path: '/nonexistent' }]);
} catch (err) {
	if (err instanceof JSONPatchError) {
		console.error(
			`Patch failed at operation ${err.operationIndex}: ${err.message}`,
		);
		console.error(`Operation: ${err.operation}`);
	}
}

// Generic JSONPath error handling
try {
	// ... some operation
} catch (err) {
	if (err instanceof JSONPathError) {
		console.error(JSON.stringify(err.toJSON(), null, 2));
	}
}
```

### Custom Function Registration

```typescript
import { registerFunction } from '@jsonpath/core';
import { query } from '@jsonpath/jsonpath';

// Register a custom function
registerFunction({
	name: 'contains',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (haystack, needle) => {
		if (typeof haystack === 'string' && typeof needle === 'string') {
			return haystack.includes(needle);
		}
		if (Array.isArray(haystack)) {
			return haystack.includes(needle);
		}
		return false;
	},
});

// Use in queries
const data = { items: [{ name: 'apple' }, { name: 'banana' }] };
const result = query(data, '$.items[?(contains(@.name, "an"))].name');
// => ['banana']
```

### Type-Safe Query Results

```typescript
import type { QueryNode, QueryResult } from '@jsonpath/core';

interface Book {
	title: string;
	price: number;
}

function processBooks(result: QueryResult<Book>): void {
	// Type-safe iteration
	for (const node of result) {
		const book: Book = node.value;
		const path: readonly (string | number)[] = node.path;
		console.log(`${book.title} at ${path.join('/')}`);
	}

	// Type-safe methods
	const titles: string[] = result.map((book) => book.title);
	const cheap: QueryResult<Book> = result.filter((book) => book.price < 20);
}
```
