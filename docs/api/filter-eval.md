# @jsonpath/filter-eval API Documentation

Comprehensive API reference for the filter expression parser and evaluator.

## Type Definitions

### CompiledFilter

```typescript
interface CompiledFilter {
	(
		current: unknown,
		context: EvaluationContext,
	): LogicalType | NodesType | FunctionResult | unknown;
}
```

Represents a compiled filter expression function. Call with the current node and evaluation context to evaluate the filter.

### EvaluationContext

```typescript
interface EvaluationContext {
	root: unknown;
	current: unknown;
}
```

Context passed to filter evaluation functions.

**Properties:**

- `root` - The root node of the JSON document
- `current` - The current node being evaluated

### LogicalType

```typescript
interface LogicalType {
	__isLogicalType: true;
	value: boolean;
}
```

Wrapper type for logical/boolean filter results. Filters that return boolean values are wrapped in this type to distinguish them from truthy/falsy values.

### NodesType

```typescript
interface NodesType {
	__isNodeList: true;
	nodes: unknown[];
}
```

Wrapper type for node lists. Used when filter expressions return arrays of nodes.

### FunctionResult

```typescript
interface FunctionResult {
	__isFunctionResult: true;
	value: unknown;
}
```

Wrapper type for function call results in filter expressions.

## Functions

### parseFilter(expression: string): Expression

Parses a filter expression string using jsep.

**Parameters:**

- `expression` - The filter expression string

**Returns:** An abstract syntax tree (AST) node representing the expression

**Throws:** If the expression is invalid or uses unsupported operators

**Example:**

```typescript
import { parseFilter } from '@jsonpath/filter-eval';

const ast = parseFilter('@.price > 10 && @.available == true');
console.log(ast.type); // 'LogicalExpression'
```

### compileFilter(expression: string): CompiledFilter

Parses and compiles a filter expression into an executable function.

**Parameters:**

- `expression` - The filter expression string

**Returns:** A compiled filter function

**Throws:** If the expression is invalid

**Example:**

```typescript
import { compileFilter } from '@jsonpath/filter-eval';

const filter = compileFilter('@.status == "active"');
const result = filter(
	{ status: 'active' },
	{ root: data, current: { status: 'active' } },
);
```

### compileFilterCached(expression: string, cache: FilterCache): CompiledFilter

Compiles a filter expression with automatic caching.

**Parameters:**

- `expression` - The filter expression string
- `cache` - A FilterCache instance

**Returns:** A compiled filter function (cached if previously compiled)

**Example:**

```typescript
import { FilterCache, compileFilterCached } from '@jsonpath/filter-eval';

const cache = new FilterCache({ capacity: 500 });
const filter = compileFilterCached('@.id == 42', cache);
```

## Classes

### FilterEvaluator

Internal class responsible for evaluating compiled filter expressions.

**Methods:**

- `evaluate(current: unknown, context: EvaluationContext): unknown` - Evaluate the expression
- `evaluateNode(node: Expression): unknown` - Evaluate a single AST node

### FilterCache

LRU (Least Recently Used) cache for compiled filter expressions.

**Constructor:**

```typescript
new FilterCache(options?: FilterCacheOptions)
```

**Options:**

```typescript
interface FilterCacheOptions {
	capacity?: number; // Default: 256, Maximum cached filters
}
```

**Methods:**

- `get(key: string): CompiledFilter | undefined` - Retrieve a cached filter
- `set(key: string, value: CompiledFilter): void` - Store a filter in the cache
- `clear(): void` - Remove all entries from the cache
- `has(key: string): boolean` - Check if a filter is cached
- `size(): number` - Get the number of cached items

**Example:**

```typescript
import { FilterCache, compileFilterCached } from '@jsonpath/filter-eval';

const cache = new FilterCache({ capacity: 1024 });

// First compilation: stored in cache
const fn1 = compileFilterCached('@.price > 10', cache);

// Cache hit: returns same function
const fn2 = compileFilterCached('@.price > 10', cache);

console.log(fn1 === fn2); // true
console.log(cache.size()); // 1
```

## Supported Expressions

### Binary Operations

- **Comparison:** `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical:** `&&`, `||`
- **Arithmetic:** `+`, `-`, `*`, `/`

### Unary Operations

- **Logical NOT:** `!expression`
- **Negation:** `-value`

### Identifiers

- **Current Node:** `@` or `@.property`
- **Root Node:** `$.property`

### Literals

- **Numbers:** `42`, `3.14`, `-10`
- **Strings:** `"hello"`, `'world'`
- **Booleans:** `true`, `false`
- **Null:** `null`

### Member Access

- **Dot notation:** `@.property`, `$.nested.property`
- **Computed member:** `@["property"]`

### Function Calls

```typescript
// Available from @jsonpath/functions
match(@.name, /^[A-Z]/)
search(@.email, /example\.com/)
length(@.items)
keys(@)
```

## Error Handling

All parsing and evaluation errors throw with descriptive messages:

```typescript
import { compileFilter } from '@jsonpath/filter-eval';

try {
	const filter = compileFilter('@.invalid @@ syntax');
} catch (err) {
	console.error(err.message);
	// Output: descriptive parse error
}
```

## Integration with JSONPath

This package is integrated into the main JSONPath compiler workflow:

```typescript
import { compile } from '@jsonpath/compiler';
import { parse } from '@jsonpath/parser';

// Internally uses @jsonpath/filter-eval for filter expressions
const query = compile(parse('$[?@.price > 10]'));
const results = query(jsonData);
```

## Performance Characteristics

- **Compilation:** O(n) where n is expression length
- **Evaluation:** O(m) where m is the depth of AST traversal
- **Caching:** O(1) cache lookup with LRU eviction

For repeated evaluations of the same filter, use caching:

```typescript
const cache = new FilterCache({ capacity: 256 });
const filter = compileFilterCached(expression, cache);
// Subsequent calls with same expression use cached version
```

## License

MIT
