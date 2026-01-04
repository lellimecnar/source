# JSONPath Suite API Reference

The `@jsonpath` suite provides a comprehensive, RFC-compliant set of libraries for querying, addressing, and patching JSON data.

## Packages

- **`@jsonpath/jsonpath`**: Unified facade for the entire suite.
- **`@jsonpath/pointer`**: RFC 6901 JSON Pointer implementation.
- **`@jsonpath/patch`**: RFC 6902 JSON Patch implementation.
- **`@jsonpath/merge-patch`**: RFC 7386 JSON Merge Patch implementation.
- **`@jsonpath/compiler`**: Functional wrapper for reusable queries.

---

## `@jsonpath/jsonpath` (Facade)

The main entry point for most use cases. Includes internal AST caching for performance.

### `query(data: any, expression: string): any[]`

Evaluates a JSONPath expression and returns an array of matching values.

### `queryValues(data: any, expression: string): any[]`

Alias for `query`.

### `queryPaths(data: any, expression: string): string[]`

Evaluates a JSONPath expression and returns an array of normalized JSONPath strings representing the locations of the matches.

### `compileQuery(expression: string): CompiledQuery`

Compiles a JSONPath expression into a reusable function for better performance in hot paths.

---

## `@jsonpath/pointer` (RFC 6901)

Used for addressing specific locations within a JSON document.

### `evaluate(data: any, pointer: string): any`

Returns the value at the specified pointer. Throws if the pointer is invalid or the path does not exist.

### `parse(pointer: string): string[]`

Parses a JSON Pointer string into an array of unescaped tokens.

### `format(tokens: string[]): string`

Formats an array of tokens into a JSON Pointer string with proper escaping (`~0`, `~1`).

---

## `@jsonpath/patch` (RFC 6902)

Used for applying a sequence of operations to a JSON document.

### `applyPatch(data: any, patch: PatchOperation[]): any`

Applies a JSON Patch to the data and returns the modified document. Performs a deep clone internally to ensure immutability.

### Operations

- `add`: Adds a value at the specified path.
- `remove`: Removes the value at the specified path.
- `replace`: Replaces the value at the specified path.
- `move`: Moves a value from one path to another.
- `copy`: Copies a value from one path to another.
- `test`: Tests that the value at the path matches the expected value.

---

## `@jsonpath/merge-patch` (RFC 7386)

A simpler patching mechanism for merging objects.

### `applyMergePatch(target: any, patch: any): any`

Applies a JSON Merge Patch to the target and returns the result.

---

## Performance Considerations

- **AST Caching**: The `jsonpath` facade automatically caches parsed ASTs.
- **Compilation**: Use `compileQuery` for expressions that are evaluated frequently against different data sets.
- **Zero Dependencies**: The entire suite is built with zero external dependencies and is fully tree-shakeable.
