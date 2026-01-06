# @jsonpath/filter-eval

Filter expression parser and evaluator for JSONPath (RFC 9535).

## Overview

`@jsonpath/filter-eval` provides a secure, RFC 9535-compliant filter expression parser and evaluator using [jsep](https://github.com/EspressionJS/jsep). It replaces dynamic code execution (`new Function`) with an interpreted evaluation model.

## Installation

```bash
npm install @jsonpath/filter-eval
# or
pnpm add @jsonpath/filter-eval
```

## Features

- **RFC 9535 Compliance**: Full support for JSONPath filter expressions as per RFC 9535
- **Security-First Design**: No dynamic code execution (no `eval` or `new Function`)
- **Expression Parsing**: Uses [jsep](https://github.com/EspressionJS/jsep) for safe, sandboxed parsing
- **Filter Compilation & Caching**: Efficient LRU caching for compiled filters
- **Built-In Functions**: Automatic integration with [@jsonpath/functions](../ functions)
- **Type Safe**: Full TypeScript support with comprehensive type definitions

## Usage

### Basic Filter Compilation

```typescript
import { compileFilter } from '@jsonpath/filter-eval';

const filter = compileFilter('@.price > 10');

// Use the compiled filter to evaluate expressions
const result = filter(
	{ price: 15 },
	{
		root: { items: [{ price: 15 }] },
		current: { price: 15 },
	},
);
console.log(result); // { __isLogicalType: true, value: true }
```

### With Caching

```typescript
import { FilterCache, compileFilterCached } from '@jsonpath/filter-eval';

const cache = new FilterCache({ capacity: 100 });

// First call: parses and compiles
const fn1 = compileFilterCached('@.age > 18', cache);

// Second call: retrieved from cache
const fn2 = compileFilterCached('@.age > 18', cache);

console.log(fn1 === fn2); // true
```

### Filter Expressions

Supported operators and constructs:

#### Comparison Operators

- `==` (equals)
- `!=` (not equals)
- `<` (less than)
- `>` (greater than)
- `<=` (less than or equal)
- `>=` (greater than or equal)

#### Logical Operators

- `&&` (logical AND)
- `||` (logical OR)
- `!` (logical NOT)

#### Arithmetic Operators

- `+` (addition)
- `-` (subtraction)
- `*` (multiplication)
- `/` (division)

#### Member Access

- `@.property` (current node property)
- `$.root` (root node property)

#### Built-In Functions

All functions from [@jsonpath/functions](../functions) are automatically available:

- `match(string, regex)` - Test regex match
- `search(string, regex)` - Search for regex pattern
- `length(value)` - Get length of string/array
- `keys(object)` - Get object keys
- `values(object)` - Get object values
- And more...

## Security Considerations

### Design Principles

1. **No Dynamic Code Execution**: Filter expressions are parsed and interpreted, never compiled to executable code
2. **Property Access Control**: Dangerous properties are blocked to prevent prototype pollution
3. **Sandboxed Evaluation**: All evaluations happen within a controlled context

### Blocked Properties

The following properties cannot be accessed:

- `constructor`
- `__proto__`
- `prototype`
- `__defineGetter__`
- `__defineSetter__`
- `__lookupGetter__`
- `__lookupSetter__`
- `eval`
- `Function`
- `toString`
- `valueOf`

## API Reference

### `compileFilter(expression: string): CompiledFilter`

Compiles a filter expression into a function.

**Parameters:**

- `expression`: The filter expression string

**Returns:** A compiled filter function

**Throws:** If the expression is invalid

### `compileFilterCached(expression: string, cache: FilterCache): CompiledFilter`

Compiles a filter expression with caching support.

**Parameters:**

- `expression`: The filter expression string
- `cache`: A FilterCache instance for storing compiled filters

**Returns:** A compiled filter function (cached if previously compiled)

### `FilterCache`

LRU (Least Recently Used) cache for compiled filters.

**Constructor Options:**

```typescript
interface FilterCacheOptions {
	capacity?: number; // Default: 256
}
```

**Methods:**

- `get(key: string): CompiledFilter | undefined` - Retrieve cached filter
- `set(key: string, value: CompiledFilter): void` - Store filter in cache
- `clear(): void` - Clear all cached filters

## Performance

Filter compilation is performed once per unique expression and cached. For applications using the same filters repeatedly, caching provides significant performance benefits.

## Related Packages

- [@jsonpath/parser](../parser) - JSONPath expression parser
- [@jsonpath/evaluator](../evaluator) - Query path evaluator
- [@jsonpath/functions](../functions) - Built-in filter functions
- [@jsonpath/compiler](../compiler) - Query compiler (uses filter-eval)

## License

MIT
