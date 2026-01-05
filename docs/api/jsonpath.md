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

---

## `@jsonpath/jsonpath` (Facade)

The main entry point for most use cases. Includes internal AST caching for performance.

### `query(data: any, expression: string, options?: EvaluatorOptions): QueryResult`

Evaluates a JSONPath expression and returns a `QueryResult` object.

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

Compiles a JSONPath expression into a reusable function.

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

#### Extras (`@jsonpath/plugin-extras`)

- `values(obj)`: Returns object values.
- `entries(obj)`: Returns object entries as `[key, value]` pairs.
- `flatten(arr)`: Flattens a nested array.
- `unique(arr)`: Returns unique elements from an array.

#### Types (`@jsonpath/plugin-types`)

- `is_string(val)`: Returns true if value is a string.
- `is_number(val)`: Returns true if value is a number.
- `is_boolean(val)`: Returns true if value is a boolean.
- `is_object(val)`: Returns true if value is an object.
- `is_array(val)`: Returns true if value is an array.
- `to_number(val)`: Converts value to a number.

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

### `RelativeJSONPointer`

Class representing a Relative JSON Pointer (draft-bhutton).

- `new RelativeJSONPointer(ptr: string)`: Creates a new relative pointer.
- `evaluate(data: any, basePointer: JSONPointer): any`: Evaluates the relative pointer against a base.

---

## `@jsonpath/patch` (RFC 6902)

Used for applying a sequence of operations to a JSON document.

### `applyPatch(data: any, patch: PatchOperation[], options?: ApplyOptions): any`

Applies a JSON Patch. **Immutable by default**. Set `mutate: true` in options to modify the input data in-place.

### `applyPatchImmutable(data: any, patch: PatchOperation[]): any`

Applies a JSON Patch to a deep clone of the data, ensuring the original is not modified.

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
