# @jsonpath/functions

> Built-in functions for JSONPath filter expressions (RFC 9535).

## Overview

`@jsonpath/functions` provides the standard functions defined in RFC 9535 for use in filter expressions. Functions are automatically registered when the package is imported.

## Features

- **RFC 9535 Compliant**: All standard functions
- **Type-Safe Signatures**: Proper parameter and return types
- **Auto-Registration**: Functions available immediately on import

## Installation

```bash
pnpm add @jsonpath/functions
```

## Standard Functions

### length(value)

Returns the length of a value:

- **String**: Number of Unicode code points (not UTF-16 code units)
- **Array**: Number of elements
- **Object**: Number of keys
- **Other**: `undefined`

**Signature:** `(ValueType) → ValueType`

```typescript
import { query } from '@jsonpath/jsonpath';

const data = [
	{ name: 'Alice', items: [1, 2, 3] },
	{ name: 'Bob', items: [1] },
	{ name: 'Charlie' },
];

// Filter by string length
query(data, '$[?(length(@.name) > 4)]').values();
// [{ name: 'Alice', ... }, { name: 'Charlie', ... }]

// Filter by array length
query(data, '$[?(length(@.items) > 2)]').values();
// [{ name: 'Alice', ... }]

// Unicode-aware
const emoji = [{ text: '👨‍👩‍👧‍👦' }]; // Family emoji (7 code points including ZWJ)
query(emoji, '$[?(length(@.text) == 7)]').values(); // Matches
```

### count(nodes)

Returns the number of nodes in a node list.

**Signature:** `(NodesType) → ValueType`

```typescript
const data = [{ tags: ['a', 'b', 'c'] }, { tags: ['a'] }, { tags: [] }];

// Items with more than 2 tags
query(data, '$[?(count(@.tags[*]) > 2)]').values();
// [{ tags: ['a', 'b', 'c'] }]

// Items with any tags
query(data, '$[?(count(@.tags[*]) > 0)]').values();
// [{ tags: ['a', 'b', 'c'] }, { tags: ['a'] }]
```

**Difference from length():**

- `length()` operates on a single value
- `count()` operates on a node list (result of a subquery)

```typescript
const data = { items: ['a', 'b', 'c'] };

// length() - length of the array value
query(data, '$[?(length(@.items) == 3)]').values(); // matches

// count() - count of matched nodes
query(data, '$[?(count(@.items[*]) == 3)]').values(); // matches
```

### match(value, pattern)

Tests if a string fully matches a regular expression pattern.

**Signature:** `(ValueType, ValueType) → LogicalType`

```typescript
const data = [{ id: 'user-123' }, { id: 'admin-456' }, { id: 'user-789' }];

// Full match required
query(data, '$[?(match(@.id, "user-[0-9]+"))]').values();
// [{ id: 'user-123' }, { id: 'user-789' }]

// Partial match doesn't work with match()
query(data, '$[?(match(@.id, "[0-9]+"))]').values();
// [] - "user-123" is not FULLY "[0-9]+"
```

**Pattern Semantics:**

- Implicitly anchored: `^pattern$`
- `.` matches any character except line terminators (LF, CR, CRLF)
- Invalid regex patterns return `undefined`

### search(value, pattern)

Tests if a string contains a match for a regular expression pattern.

**Signature:** `(ValueType, ValueType) → LogicalType`

```typescript
const data = [
	{ title: 'Introduction to Programming' },
	{ title: 'Advanced Topics' },
	{ title: 'Programming Basics' },
];

// Partial match works
query(data, '$[?(search(@.title, "Program"))]').values();
// [{ title: 'Introduction to Programming' }, { title: 'Programming Basics' }]

// Case-sensitive by default
query(data, '$[?(search(@.title, "program"))]').values();
// [] - no lowercase "program"
```

**Pattern Semantics:**

- Not anchored: finds matches anywhere in string
- Same `.` behavior as `match()`

### value(nodes)

Returns the value if the node list contains exactly one node, otherwise `undefined`.

**Signature:** `(NodesType) → ValueType`

```typescript
const data = [{ meta: { single: 1 } }, { meta: { a: 1, b: 2 } }];

// value() returns undefined when not exactly one match
query(data, '$[?(value(@.meta.*) == 1)]').values();
// [{ meta: { single: 1 } }] - only the first has exactly one child
```

**Use Case:** Convert a singular query result to a value for comparison.

---

## Type System

RFC 9535 defines three types for function parameters and returns:

### ValueType

A JSON value (string, number, boolean, null, array, object) or `undefined`.

### LogicalType

A boolean result from a comparison or logical operation.

### NodesType

A list of matched nodes from a subquery like `@.items[*]`.

**Type Coercion:**

- `NodesType` → `LogicalType`: Empty = false, non-empty = true
- `NodesType` → `ValueType`: Use `value()` function

---

## Custom Functions

Register custom functions using `@jsonpath/core`:

```typescript
import { registerFunction } from '@jsonpath/core';
import { query } from '@jsonpath/jsonpath';

// Register a custom function
registerFunction({
	name: 'uppercase',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		return typeof val === 'string' ? val.toUpperCase() : undefined;
	},
});

// Use in queries (note: function call in comparison context)
const data = [{ name: 'alice' }, { name: 'bob' }];
query(data, '$[?(uppercase(@.name) == "ALICE")]').values();
// [{ name: 'alice' }]
```

### Custom Function with NodesType

```typescript
registerFunction({
	name: 'sum',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: any[]) => {
		return nodes.reduce((acc, node) => {
			const val = node.value;
			return acc + (typeof val === 'number' ? val : 0);
		}, 0);
	},
});

const data = { values: [1, 2, 3, 4, 5] };
query(data, '$[?(sum(@.values[*]) > 10)]').values();
// Matches if sum > 10
```

### Custom Comparison Function

```typescript
registerFunction({
	name: 'contains',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (haystack: unknown, needle: unknown) => {
		if (typeof haystack === 'string' && typeof needle === 'string') {
			return haystack.includes(needle);
		}
		if (Array.isArray(haystack)) {
			return haystack.includes(needle);
		}
		return false;
	},
});

const data = [{ tags: ['important', 'urgent'] }, { tags: ['normal'] }];
query(data, '$[?(contains(@.tags, "urgent"))]').values();
// [{ tags: ['important', 'urgent'] }]
```

---

## Regex Pattern Notes

### RFC 9535 Regex Semantics

The `match()` and `search()` functions use I-Regexp (RFC 9485) semantics:

1. **Line terminators**: `.` does not match LF (`\n`), CR (`\r`), or CRLF
2. **Unicode mode**: Patterns are processed in Unicode mode
3. **No flags**: Case-sensitive, single-line by default

### Pattern Examples

```typescript
// Match any single character (except newlines)
match('abc', 'a.c'); // true
match('a\nc', 'a.c'); // false

// Character classes
match('abc', '[a-z]+'); // true
match('ABC', '[a-z]+'); // false (case-sensitive)

// Anchoring (implicit in match, not in search)
match('abc', 'b'); // false (not full match)
search('abc', 'b'); // true (partial match)

// Special characters
match('a.b', 'a\\.b'); // true (escaped dot)
match('a+b', 'a\\+b'); // true (escaped plus)
```

---

## Error Handling

Functions handle invalid inputs gracefully:

```typescript
// Invalid pattern - returns undefined
query([{ a: 'test' }], '$[?(match(@.a, "[invalid"))]').values();
// Returns undefined from match(), which is falsy

// Wrong type - returns undefined
query([{ a: 123 }], '$[?(length(@.a) > 0)]').values();
// length(123) is undefined, comparison fails
```

---

## Performance Tips

1. **Prefer simple comparisons** over regex when possible
2. **Use `match()`** when you need exact matches (faster than `search()` with anchors)
3. **Avoid complex regex** in hot paths
4. **Use `count()` with caution** on large arrays (evaluates all elements)
