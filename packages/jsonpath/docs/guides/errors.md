# Error Handling Guide

> Comprehensive guide to error types, handling patterns, and debugging.

## Error Hierarchy

All errors inherit from `JSONPathError`:

```
JSONPathError (base)
├── JSONPathSyntaxError    - Invalid query syntax
├── JSONPathTypeError      - Type mismatch in operations
├── JSONPointerError       - Invalid pointer syntax/resolution
├── JSONPatchError         - Patch operation failure
├── JSONPathLimitError     - Resource limits exceeded
├── JSONPathTimeoutError   - Query timeout
└── JSONPathSecurityError  - Security policy violation
```

## Error Properties

All errors include:

```typescript
interface JSONPathError extends Error {
	code: string; // Machine-readable error code
	message: string; // Human-readable description
	position?: number; // Character position in query (if applicable)
	path?: string; // JSON Pointer path (if applicable)
	cause?: Error; // Original error (if wrapped)
}
```

---

## Error Types

### JSONPathSyntaxError

Thrown when a query string cannot be parsed:

```typescript
import { query } from '@jsonpath/jsonpath';
import { JSONPathSyntaxError } from '@jsonpath/core';

try {
	query(data, '$.store['); // Unclosed bracket
} catch (err) {
	if (err instanceof JSONPathSyntaxError) {
		console.log(err.code); // 'SYNTAX_ERROR'
		console.log(err.message); // 'Unexpected end of expression'
		console.log(err.position); // 8 (character position)
	}
}
```

**Common causes:**

- Unclosed brackets or parentheses
- Invalid characters
- Malformed filter expressions
- Missing operators

### JSONPathTypeError

Thrown when operations encounter unexpected types:

```typescript
import { JSONPathTypeError } from '@jsonpath/core';

try {
	// Using length() on a number
	query({ x: 42 }, '$.x[?length(@) > 0]');
} catch (err) {
	if (err instanceof JSONPathTypeError) {
		console.log(err.code); // 'TYPE_ERROR'
		console.log(err.message); // 'length() requires string or array'
	}
}
```

**Common causes:**

- Function argument type mismatch
- Numeric operations on non-numbers
- Array operations on non-arrays

### JSONPointerError

Thrown for JSON Pointer issues:

```typescript
import { resolve } from '@jsonpath/pointer';
import { JSONPointerError } from '@jsonpath/core';

try {
	resolve(data, 'invalid'); // Missing leading /
} catch (err) {
	if (err instanceof JSONPointerError) {
		console.log(err.code); // 'POINTER_ERROR'
		console.log(err.message); // 'JSON Pointer must start with "/"'
	}
}
```

**Common causes:**

- Missing leading `/`
- Invalid escape sequences (`~2` instead of `~0` or `~1`)
- Array index format violations

### JSONPatchError

Thrown when patch operations fail:

```typescript
import { applyPatch } from '@jsonpath/patch';
import { JSONPatchError } from '@jsonpath/core';

try {
	applyPatch({}, [{ op: 'remove', path: '/nonexistent' }]);
} catch (err) {
	if (err instanceof JSONPatchError) {
		console.log(err.code); // 'PATCH_ERROR'
		console.log(err.message); // 'Cannot remove: path does not exist'
		console.log(err.operation); // The failing operation
		console.log(err.path); // '/nonexistent'
	}
}
```

**Common causes:**

- `remove`/`replace` on non-existent path
- `test` assertion failure
- Invalid operation format

### JSONPathLimitError

Thrown when resource limits are exceeded:

```typescript
import { query, configure } from '@jsonpath/jsonpath';
import { JSONPathLimitError } from '@jsonpath/core';

configure({ maxResults: 100 });

try {
	// Query returns 1000+ results
	query(largeData, '$..[*]');
} catch (err) {
	if (err instanceof JSONPathLimitError) {
		console.log(err.code); // 'LIMIT_ERROR'
		console.log(err.message); // 'Maximum result limit (100) exceeded'
		console.log(err.limit); // 100
		console.log(err.actual); // 1000+
	}
}
```

**Common causes:**

- Too many results (`maxResults`)
- Recursion too deep (`maxDepth`)
- Input too large (`maxInputSize`)

### JSONPathTimeoutError

Thrown when query exceeds time limit:

```typescript
import { query, configure } from '@jsonpath/jsonpath';
import { JSONPathTimeoutError } from '@jsonpath/core';

configure({ timeout: 1000 }); // 1 second

try {
	query(hugeData, '$..deeply..nested..query');
} catch (err) {
	if (err instanceof JSONPathTimeoutError) {
		console.log(err.code); // 'TIMEOUT_ERROR'
		console.log(err.message); // 'Query timeout exceeded (1000ms)'
		console.log(err.timeout); // 1000
		console.log(err.elapsed); // Actual time
	}
}
```

### JSONPathSecurityError

Thrown when security policies are violated:

```typescript
import { JSONPathSecurityError } from '@jsonpath/core';

try {
	// Query with prototype pollution attempt
	query(data, "$['__proto__']");
} catch (err) {
	if (err instanceof JSONPathSecurityError) {
		console.log(err.code); // 'SECURITY_ERROR'
		console.log(err.message); // 'Access to __proto__ is forbidden'
	}
}
```

---

## Error Handling Patterns

### Basic Try-Catch

```typescript
import { query } from '@jsonpath/jsonpath';
import { JSONPathError } from '@jsonpath/core';

function safeQuery(data: any, path: string) {
	try {
		return query(data, path).values();
	} catch (err) {
		if (err instanceof JSONPathError) {
			console.error(`Query error: ${err.message}`);
			return [];
		}
		throw err; // Re-throw unknown errors
	}
}
```

### Type-Specific Handling

```typescript
import {
	JSONPathError,
	JSONPathSyntaxError,
	JSONPathTypeError,
	JSONPatchError,
} from '@jsonpath/core';

function handleError(err: Error) {
	if (err instanceof JSONPathSyntaxError) {
		return {
			type: 'syntax',
			message: `Invalid query at position ${err.position}`,
		};
	}

	if (err instanceof JSONPathTypeError) {
		return { type: 'type', message: `Type error: ${err.message}` };
	}

	if (err instanceof JSONPatchError) {
		return {
			type: 'patch',
			message: `Patch failed at ${err.path}: ${err.message}`,
		};
	}

	if (err instanceof JSONPathError) {
		return { type: 'jsonpath', message: err.message };
	}

	return { type: 'unknown', message: 'An unexpected error occurred' };
}
```

### Result-Based Error Handling

Avoid exceptions with careful checking:

```typescript
import { exists, value } from '@jsonpath/jsonpath';

// Check existence before access
if (exists(data, '$.user.email')) {
	const email = value(data, '$.user.email');
	sendEmail(email);
}

// Use default values
const email = value(data, '$.user.email') ?? 'default@example.com';
```

### Graceful Degradation

```typescript
import { query, configure } from '@jsonpath/jsonpath';

// Configure for graceful handling
configure({ throwOnError: false });

// Now errors return empty results
const results = query(invalidData, '$.missing').values();
// [] instead of throwing
```

---

## Debugging Tips

### Enable Debug Logging

```typescript
import { configure } from '@jsonpath/jsonpath';

configure({
	debug: true,
	onDebug: (msg) => console.log(`[JSONPath] ${msg}`),
});
```

### Inspect Parse Trees

```typescript
import { parse } from '@jsonpath/parser';

// View the AST for debugging
const ast = parse('$.store.book[?@.price > 10]');
console.log(JSON.stringify(ast, null, 2));
```

### Step-by-Step Execution

```typescript
import { query } from '@jsonpath/jsonpath';

// Break down complex queries
const result1 = query(data, '$.store');
console.log('Store:', result1.values());

const result2 = query(data, '$.store.book');
console.log('Books:', result2.values());

const result3 = query(data, '$.store.book[?@.price > 10]');
console.log('Filtered:', result3.values());
```

### Validate Queries Before Use

```typescript
import { parse } from '@jsonpath/parser';
import { JSONPathSyntaxError } from '@jsonpath/core';

function validateQuery(path: string): { valid: boolean; error?: string } {
	try {
		parse(path);
		return { valid: true };
	} catch (err) {
		if (err instanceof JSONPathSyntaxError) {
			return { valid: false, error: err.message };
		}
		throw err;
	}
}

// Use in forms, APIs, etc.
const validation = validateQuery('$.store[?@.price > ]');
if (!validation.valid) {
	showError(validation.error);
}
```

---

## Common Mistakes

### 1. Missing Root `$`

```typescript
// Wrong
query(data, 'store.book');

// Correct
query(data, '$.store.book');
```

### 2. Unquoted Strings in Filters

```typescript
// Wrong - JavaScript syntax, not JSONPath
query(data, '$.items[?@.status == active]');

// Correct - Strings must be quoted
query(data, '$.items[?@.status == "active"]');
```

### 3. Single vs Double Brackets

```typescript
// This is a union/index selector
query(data, '$.items[0]'); // First item
query(data, '$.items[0,1,2]'); // Items 0, 1, 2

// This is a filter expression
query(data, '$.items[?@.id == 1]');
```

### 4. Forgetting `@` in Filters

```typescript
// Wrong - missing @
query(data, '$.items[?price > 10]');

// Correct - @ refers to current item
query(data, '$.items[?@.price > 10]');
```

### 5. Invalid Pointer Escape

```typescript
// Wrong - incorrect escape
pointer.resolve(data, '/a~2b'); // ~2 is invalid

// Correct - only ~0 and ~1 are valid
pointer.resolve(data, '/a~0b'); // a~b
pointer.resolve(data, '/a~1b'); // a/b
```

---

## Error Codes Reference

| Code             | Type          | Description              |
| ---------------- | ------------- | ------------------------ |
| `SYNTAX_ERROR`   | SyntaxError   | Invalid query syntax     |
| `TYPE_ERROR`     | TypeError     | Type mismatch            |
| `POINTER_ERROR`  | PointerError  | Invalid pointer          |
| `PATCH_ERROR`    | PatchError    | Patch operation failed   |
| `LIMIT_ERROR`    | LimitError    | Resource limit exceeded  |
| `TIMEOUT_ERROR`  | TimeoutError  | Query timed out          |
| `SECURITY_ERROR` | SecurityError | Security policy violated |
