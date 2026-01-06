# JSONPath Suite API Reference

The `@jsonpath` suite provides a comprehensive, RFC-compliant set of libraries for querying, addressing, and patching JSON data.

## Packages

- **`@jsonpath/jsonpath`**: Unified facade for the entire suite.
- **`@jsonpath/pointer`**: RFC 6901 JSON Pointer implementation.
- **`@jsonpath/patch`**: RFC 6902 JSON Patch implementation.
- **`@jsonpath/merge-patch`**: RFC 7386 JSON Merge Patch implementation.
- **`@jsonpath/compiler`**: Functional wrapper for reusable queries.
- **`@jsonpath/plugin-arithmetic`**: Arithmetic functions (`add`, `sub`, etc.).
- **`@jsonpath/plugin-extras`**: Utility functions (`flatten`, `unique`, etc.).
- **`@jsonpath/plugin-types`**: Type checking and conversion functions.
- **`@jsonpath/path-builder`**: Fluent API for building JSONPath strings.

## Import Patterns

All `@jsonpath` packages are **tree-shakeable** and do not use barrel exports from package roots. Import only what you need:

```typescript
// ✓ CORRECT - granular imports
import { query, QuerySet, transform } from '@jsonpath/jsonpath';
import { JSONPointer } from '@jsonpath/pointer';
import { applyPatch, PatchBuilder } from '@jsonpath/patch';
import { pathBuilder, FilterBuilder } from '@jsonpath/path-builder';

// ✗ WRONG - do not use package root imports
import * from '@jsonpath/jsonpath';
```

For convenience, the facade (`@jsonpath/jsonpath`) re-exports commonly used types and functions from other packages.

---

## `@jsonpath/jsonpath` (Facade)

The main entry point for most use cases. Includes internal AST caching for performance.

### `query(data: any, expression: string, options?: EvaluatorOptions): QueryResult`

Evaluates a JSONPath expression and returns a `QueryResult` object.

#### `QueryResult`

- `values(): any[]`: Returns matching values.
- `paths(): PathSegment[][]`: Returns matching paths as segment arrays.
- `pointers(): JSONPointer[]`: Returns `JSONPointer` objects (RFC 6901).
- `pointerStrings(): string[]`: Returns JSON Pointer strings (RFC 6901).
- `normalizedPaths(): string[]`: Returns RFC 9535 Normalized Path strings.
- `nodes(): QueryNode[]`: Returns full node objects (value, path, root, parent).

### `queryValues(data: any, expression: string): any[]`

Returns an array of matching values.

### `queryPaths(data: any, expression: string): string[]`

Returns an array of normalized JSONPath strings.

### `registerPlugin(plugin: JSONPathPlugin): void`

Registers a plugin to extend the function registry.

### `transform(data: any, expression: string, fn: (val: any) => any): any`

Transforms a JSON object by applying a function to all matches of a JSONPath. Uses JSON Patch internally for atomic updates.

### `omit(data: any, paths: string[]): any`

Removes the specified paths from the JSON object.

### `compileQuery(expression: string): CompiledQuery`

Compiles a JSONPath expression into a reusable function. Automatic compilation is applied to simple chains like `$.a.b[0]` without explicit calls.

```typescript
import { compileQuery } from '@jsonpath/jsonpath';

const compiled = compileQuery('$.store.book[0].author');

// Reuse the compiled query many times
const result1 = compiled(data1);
const result2 = compiled(data2);
```

**Performance**: Simple property and index chains (`$.a.b[c]`) use an optimized fast-path that avoids interpretation overhead, delivering near-native performance.

### `EvaluatorOptions`

Options passed to `query()`, `stream()`, and other evaluation functions.

- `limit?: number` - Stop evaluation after finding N results. Useful for large datasets to avoid unnecessary computation.
- `detectCircular?: boolean` - Detect and prevent infinite recursion on circular references.
- `secure?: SecurityOptions` - Security constraints (max query length, etc.).

**Example - Limiting results:**

```typescript
import { query } from '@jsonpath/jsonpath';

const data = { items: Array.from({ length: 1000000 }, (_, i) => ({ id: i })) };

// Find first 10 items - stops after 10 matches, much faster than full scan
const first10 = query(data, '$.items[*]', { limit: 10 }).values();
```

### `pathBuilder(): PathBuilder`

Returns a new `PathBuilder` instance for fluent path construction.

### `FilterBuilder`

A fluent API for building filter expressions.

```typescript
import { pathBuilder } from '@jsonpath/jsonpath';

const path = pathBuilder()
	.root()
	.child('store')
	.child('book')
	.filter((f) => f.child('price').lt(10))
	.build();
// "$.store.book[?(@.price < 10)]"
```

### `stream(data: any, expression: string, options?: EvaluatorOptions): Generator<QueryResultNode>`

Lazy evaluation that yields results one at a time. Useful for processing large datasets without materializing all results in memory.

```typescript
import { stream } from '@jsonpath/jsonpath';

for (const node of stream(data, '$.items[*]')) {
	console.log(node.value);
}
```

### `QuerySet`

A reusable set of named JSONPath queries that can be executed together.

```typescript
import { QuerySet } from '@jsonpath/jsonpath';

const qs = new QuerySet({
	authors: '$.store.book[*].author',
	titles: '$.store.book[*].title',
	prices: '$.store.book[*].price',
});

const results = qs.execute(data);
// results.authors, results.titles, results.prices
```

Methods:

- `add(name: string, path: string): this` - Add a query
- `remove(name: string): boolean` - Remove a query
- `names: string[]` - Get all query names
- `execute(data, options?): Record<string, QueryResult>` - Run all queries
- `queryAll(data, options?): Record<string, QueryResult>` - Get QueryResults
- `valuesAll(data, options?): Record<string, any[]>` - Get values only
- `pointersAll(data, options?): Record<string, string[]>` - Get pointer strings

### `secureQuery(data: any, expression: string, options?: EvaluatorOptions): QueryResult`

Executes a JSONPath query with strict security constraints. Returns an error if the query violates security settings.

```typescript
import { secureQuery } from '@jsonpath/jsonpath';

// Throw on queries longer than 500 chars
const result = secureQuery(data, '$.items[*]', {
	secure: { maxQueryLength: 500 },
});
```

### `parseQuery(expression: string, options?: EvaluatorOptions): QueryNode`

Parses a JSONPath string into an AST without executing it. Results are cached.

### `registerPlugin(plugin: JSONPathPlugin): void`

Registers a custom plugin globally to extend the function registry or add custom selectors.

```typescript
import { registerPlugin } from '@jsonpath/jsonpath';

registerPlugin(myCustomPlugin());
```

### `transform(data: T, expression: string, fn: (value, node) => any, options?): T`

Transforms all matches of a JSONPath by applying a function to each, returning a new object.

```typescript
import { transform } from '@jsonpath/jsonpath';

const updated = transform(data, '$.prices[*]', (v) => v * 1.1);
// All prices increased by 10%
```

### `transformAll(data: T, transforms: { path: string; fn: (value, node) => any }[], options?): T`

Applies multiple transformations in sequence.

### `project(data: any, expression: string): any`

Projects matching values into a new structure, preserving the relative path hierarchy.

### `projectWith(data: any, expressions: Record<string, string>): Record<string, any>`

Creates a new object with results of multiple JSONPath queries mapped to keys.

```typescript
import { projectWith } from '@jsonpath/jsonpath';

const projected = projectWith(data, {
	allAuthors: '$.store.book[*].author',
	allTitles: '$.store.book[*].title',
});
```

### `pick(data: any, paths: string[]): any`

Creates a new object containing only the specified paths from the original data.

```typescript
import { pick } from '@jsonpath/jsonpath';

const subset = pick(data, ['$.store.name', '$.store.location']);
```

### Extended Selectors (Plugin)

The `@jsonpath/plugin-extended` package provides non-standard but useful selectors:

#### Parent Selector (`^`)

Returns the parent node of the current selection. Useful for navigating up the data structure.

```typescript
import { registerPlugin } from '@jsonpath/jsonpath';
import { extendedSelectors } from '@jsonpath/plugin-extended';

registerPlugin(extendedSelectors());

const result = query(data, '$.store.book[*]^');
// Returns the parent (the "store" object)
```

#### Property Name Selector (`~`)

Returns the property names/keys of an object as values (similar to `Object.keys()`).

```typescript
const result = query(data, '$.store.*~');
// Returns ["book", "bicycle"] for store object keys
```

### Arithmetic Operators

When `arithmetic` option is enabled (default in facade), the following operators are supported in filters:

- `+`: Addition
- `-`: Subtraction (and unary minus)
- `*`: Multiplication
- `/`: Division
- `%`: Modulo

Example: `$.items[?(@.a + @.b > 100)]`

### Built-in Functions (RFC 9535)

- `length(val)`: Returns the length of a string, array, or object.
- `count(nodes)`: Returns the number of nodes in a node list.
- `match(val, regex)`: Full regex match.
- `search(val, regex)`: Partial regex match.
- `value(nodes)`: Returns the single value from a node list.

### Plugin Functions

#### Arithmetic (`@jsonpath/plugin-arithmetic`)

- `add(a, b)`: Addition.
- `sub(a, b)`: Subtraction.
- `mul(a, b)`: Multiplication.
- `div(a, b)`: Division.
- `mod(a, b)`: Modulo.

Example: `$.items[?(@.quantity > 10)]` with arithmetic operator `+` in expressions.

#### Extras (`@jsonpath/plugin-extras`)

- `values(obj)`: Returns object values.
- `entries(obj)`: Returns object entries as `[key, value]` pairs.
- `flatten(arr)`: Flattens a nested array.
- `unique(arr)`: Returns unique elements from an array.
- `keys(obj)`: Returns object keys.
- `reverse(arr)`: Reverses an array.
- `sort(arr)`: Sorts an array.
- `min(arr)`: Returns the minimum value.
- `max(arr)`: Returns the maximum value.
- `sum(arr)`: Returns the sum of array elements.

Example: `$.items[?(@.categories | unique | length > 1)]`

#### Types (`@jsonpath/plugin-types`)

- `is_string(val)`: Returns true if value is a string.
- `is_number(val)`: Returns true if value is a number.
- `is_boolean(val)`: Returns true if value is a boolean.
- `is_object(val)`: Returns true if value is an object.
- `is_array(val)`: Returns true if value is an array.
- `is_null(val)`: Returns true if value is null.
- `to_number(val)`: Converts value to a number.
- `to_string(val)`: Converts value to a string.

Example: `$.items[?(@.price | to_number > 50)]`

---

## `@jsonpath/pointer` (RFC 6901 & Relative)

Used for addressing specific locations within a JSON document.

### `JSONPointer`

Class representing an RFC 6901 JSON Pointer.

- `new JSONPointer(ptr: string | string[])`: Creates a new pointer.
- `resolve(data: any): any`: Returns the value at the pointer.
- `exists(data: any): boolean`: Returns true if the path exists.
- `parent(): JSONPointer | undefined`: Returns the parent pointer.
- `concat(other: string | string[] | JSONPointer): JSONPointer`: Returns a new concatenated pointer.
- `toURIFragment(): string`: Returns the URI fragment identifier (RFC 6901 §6).

### `RelativeJSONPointer`

Class representing a Relative JSON Pointer (draft-bhutton).

- `new RelativeJSONPointer(ptr: string)`: Creates a new relative pointer.
- `evaluate(data: any, basePointer: JSONPointer): any`: Evaluates the relative pointer against a base.

### URI Fragment Support

The `@jsonpath/pointer` package supports RFC 6901 §6 URI fragment identifiers.

```typescript
import { toURIFragment, fromURIFragment, JSONPointer } from '@jsonpath/pointer';

const ptr = new JSONPointer('/foo/bar');
const fragment = ptr.toURIFragment(); // "#/foo/bar"

const decoded = fromURIFragment(fragment); // "/foo/bar"
```

Functions:

- `toURIFragment(pointer: string): string` - Convert pointer to fragment
- `fromURIFragment(fragment: string): string` - Convert fragment to pointer

---

## `@jsonpath/patch` (RFC 6902)

Used for applying a sequence of operations to a JSON document.

### `applyPatch(data: any, patch: PatchOperation[], options?: ApplyOptions): any`

Applies a JSON Patch. **Mutates the input by default for performance** (v2.0 breaking change). For immutability, use `structuredClone()` or `applyPatchImmutable()`.

```typescript
import { applyPatch } from '@jsonpath/jsonpath';

const doc = { author: 'John' };

// Mutates doc in place (v2.0 default)
applyPatch(doc, [{ op: 'add', path: '/title', value: 'Engineer' }]);
// doc is now { author: 'John', title: 'Engineer' }

// For immutability, explicitly clone:
const next = applyPatch(structuredClone(doc), [
	{ op: 'replace', path: '/author', value: 'Jane' },
]);
// next is { author: 'Jane', title: 'Engineer' }, doc is unchanged
```

### `ApplyOptions`

- `atomicApply?: boolean` - If true, patch is applied atomically (all or nothing). If any operation fails, all changes are rolled back.
- `mutate?: boolean` - If true (default in v2.0+), mutates the input. Set to false for immutability.

**Atomic operations example:**

```typescript
const patch = [
	{ op: 'add', path: '/foo', value: 'bar' },
	{ op: 'test', path: '/nonexistent', value: 'x' }, // This will fail
	{ op: 'add', path: '/baz', value: 'qux' },
];

const doc = {};
try {
	applyPatch(doc, patch, { atomicApply: true });
} catch (e) {
	// All operations rolled back - doc is still {}
	console.log(doc); // {}
}
```

### `applyPatchImmutable(data: any, patch: PatchOperation[]): any`

Applies a JSON Patch to a deep clone of the data, ensuring the original is not modified. Convenience wrapper around `applyPatch` with immutability guaranteed.

### `applyWithErrors(data: any, patch: PatchOperation[], options?: ApplyOptions)`

Applies a patch and returns an array of errors encountered during application, rather than throwing.

### `validate(patch: PatchOperation[]): { valid: boolean; errors: string[] }`

Validates a patch for syntax errors before applying it.

### `diff(source: any, target: any, options?: DiffOptions): PatchOperation[]`

Generates a JSON Patch that transforms `source` into `target`.

```typescript
import { diff } from '@jsonpath/jsonpath';

const source = { name: 'John', age: 30 };
const target = { name: 'Jane', age: 31, title: 'Engineer' };

const patch = diff(source, target);
// [
//   { op: 'replace', path: '/name', value: 'Jane' },
//   { op: 'replace', path: '/age', value: 31 },
//   { op: 'add', path: '/title', value: 'Engineer' }
// ]
```

### `PatchBuilder`

Fluent API for building patches programmatically.

```typescript
import { patchBuilder } from '@jsonpath/jsonpath';

const patch = patchBuilder()
	.add('/title', 'Manager')
	.replace('/salary', 75000)
	.remove('/deprecated')
	.build();
```

Methods:

- `add(path: string, value: any): this`
- `remove(path: string): this`
- `replace(path: string, value: any): this`
- `move(from: string, path: string): this`
- `copy(from: string, path: string): this`
- `test(path: string, value: any): this`
- `when(condition: boolean): this` - Conditionally apply operations
- `ifExists(path: string): this` - Only operate if path exists
- `replaceAll(expression: string, value: any): this` - Replace all matches of a JSONPath
- `removeAll(expression: string): this` - Remove all matches of a JSONPath
- `build(): PatchOperation[]`

### JSONPath-based Patch Operations

Functions for building patches based on JSONPath queries.

```typescript
import { jsonpathOps } from '@jsonpath/jsonpath';

const patch = [
	...jsonpathOps.replaceAll('$.items[*].price', (v) => v * 1.1),
	...jsonpathOps.removeAll('$.items[?(@.discontinued)]'),
];
```

---

## Migration from `json-p3`

The `@jsonpath` suite is a modern, RFC-compliant successor to `json-p3`.

### Key Changes

1. **RFC 9535 Compliance**: The parser and evaluator strictly follow RFC 9535. Some non-standard syntax from `json-p3` may no longer be supported.
2. **Immutability**: `applyPatch` is now immutable by default. Use `mutate: true` for the old behavior.
3. **Nothing Symbol**: "No value" is represented by a unique `Nothing` symbol instead of `undefined` in some internal contexts, though the facade generally returns `undefined` or empty arrays for consistency.
4. **Plugin System**: Functions and selectors are now registered via a formal plugin system.
5. **Fluent Builders**: Use `pathBuilder()` and `FilterBuilder` for programmatic query construction.

### Compatibility Layer

For a smoother transition, use `@jsonpath/compat-json-p3`:

```typescript
import { jsonpath, jsonpatch } from '@jsonpath/compat-json-p3';

// These maintain the old json-p3 API and behavior (e.g., mutation by default)
const results = jsonpath.query(data, '$.store.book[*]');
jsonpatch.apply(patch, data);
```

## `@jsonpath/merge-patch` (RFC 7386)

A simpler patching mechanism for merging objects.

### `applyMergePatch(target: any, patch: any, options?: MergePatchOptions): any`

Applies a JSON Merge Patch.

### `createMergePatch(source: any, target: any): any`

Generates a JSON Merge Patch that transforms `source` into `target`.

---

## Performance Considerations

- **AST Caching**: The `jsonpath` facade automatically caches parsed ASTs.
- **Compilation**: Use `compileQuery` for expressions that are evaluated frequently against different data sets.
- **Zero Dependencies**: The entire suite is built with zero external dependencies and is fully tree-shakeable.
