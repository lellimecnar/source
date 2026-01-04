# RFC Compliance Guide

> Detailed coverage of RFC specifications implemented by the JSONPath suite.

## Overview

The `@jsonpath/*` packages implement four IETF RFCs:

| RFC      | Title                                | Package                                   |
| -------- | ------------------------------------ | ----------------------------------------- |
| RFC 9535 | JSONPath: Query Expressions for JSON | `@jsonpath/evaluator`, `@jsonpath/parser` |
| RFC 6901 | JSON Pointer                         | `@jsonpath/pointer`                       |
| RFC 6902 | JSON Patch                           | `@jsonpath/patch`                         |
| RFC 7386 | JSON Merge Patch                     | `@jsonpath/merge-patch`                   |

---

## RFC 9535: JSONPath

**Status:** Proposed Standard (January 2024)

### Syntax Support

| Feature                        | Status | Notes                      |
| ------------------------------ | ------ | -------------------------- |
| Root identifier `$`            | ✅     | Fully supported            |
| Dot notation `.name`           | ✅     | Fully supported            |
| Bracket notation `['name']`    | ✅     | Fully supported            |
| Wildcard `*`                   | ✅     | Fully supported            |
| Recursive descent `..`         | ✅     | Fully supported            |
| Array index `[n]`              | ✅     | Including negative indices |
| Array slice `[start:end:step]` | ✅     | All parameters optional    |
| Union `[a,b,c]`                | ✅     | Names and indices          |
| Filter `[?expr]`               | ✅     | Full expression support    |

### Comparison Operators

| Operator | Status | Notes                            |
| -------- | ------ | -------------------------------- |
| `==`     | ✅     | Deep equality for objects/arrays |
| `!=`     | ✅     | Negation of `==`                 |
| `<`      | ✅     | Numeric/string comparison        |
| `<=`     | ✅     | Numeric/string comparison        |
| `>`      | ✅     | Numeric/string comparison        |
| `>=`     | ✅     | Numeric/string comparison        |

### Logical Operators

| Operator | Status | Notes       |
| -------- | ------ | ----------- |
| `&&`     | ✅     | Logical AND |
| `\|\|`   | ✅     | Logical OR  |
| `!`      | ✅     | Logical NOT |

### Built-in Functions

| Function   | Status | Signature                         |
| ---------- | ------ | --------------------------------- |
| `length()` | ✅     | `length(Nodes \| Value) → Value`  |
| `count()`  | ✅     | `count(Nodes) → Value`            |
| `match()`  | ✅     | `match(Value, Value) → Logical`   |
| `search()` | ✅     | `search(Value, Value) → Logical`  |
| `value()`  | ✅     | `value(Nodes) → Value \| Nothing` |

### Normalization

RFC 9535 defines a **Normalized Path** format for result paths:

```typescript
import { query } from '@jsonpath/jsonpath';

const result = query(data, '$.store.book[0].title');
result.normalizedPaths();
// ["$['store']['book'][0]['title']"]
```

**Normalization rules:**

- Always uses bracket notation
- Strings are single-quoted
- Numbers are unquoted
- Special characters are escaped

### Comparison Semantics

RFC 9535 defines specific comparison rules:

```typescript
// Numbers compared numerically
1 == 1.0  // true

// Strings compared lexicographically
"a" < "b"  // true

// Objects/arrays compared by deep equality
{a: 1} == {a: 1}  // true

// Different types are never equal (except null)
1 == "1"  // false
```

**Type ordering for less-than:**

1. `null` (lowest)
2. `false`
3. `true`
4. Numbers
5. Strings
6. Arrays
7. Objects (highest)

### Edge Cases

```typescript
// Empty results are valid
query({}, '$.missing').values(); // []

// Filter on non-existent property
query({ items: [{ a: 1 }] }, '$.items[?@.b > 0]').values(); // []

// Recursive on empty
query({}, '$..name').values(); // []
```

---

## RFC 6901: JSON Pointer

**Status:** Proposed Standard (April 2013)

### Syntax

| Component   | Format       | Example         |
| ----------- | ------------ | --------------- |
| Root        | Empty string | `""`            |
| Property    | `/name`      | `/foo`          |
| Array index | `/n`         | `/0`            |
| Escape `~`  | `~0`         | `/a~0b` → `a~b` |
| Escape `/`  | `~1`         | `/a~1b` → `a/b` |

### Token Escaping

```typescript
import { escape, unescape } from '@jsonpath/pointer';

// Must escape ~ first, then /
escape('a/b~c'); // 'a~1b~0c'
unescape('a~1b~0c'); // 'a/b~c'
```

### Array Index Rules

Per RFC 6901:

```typescript
// Valid indices
'/0'; // First element
'/1'; // Second element

// Invalid (leading zeros forbidden)
'/00'; // INVALID
'/01'; // INVALID

// Invalid (no negative indices in pointers)
'/-1'; // INVALID (but see RFC 6902 for '-')
```

### RFC 6901 Test Cases

From the RFC:

```typescript
const doc = {
	foo: ['bar', 'baz'],
	'': 0,
	'a/b': 1,
	'c%d': 2,
	'e^f': 3,
	'g|h': 4,
	'i\\j': 5,
	'k"l': 6,
	' ': 7,
	'm~n': 8,
};

resolve(doc, ''); // whole document
resolve(doc, '/foo'); // ["bar", "baz"]
resolve(doc, '/foo/0'); // "bar"
resolve(doc, '/'); // 0
resolve(doc, '/a~1b'); // 1
resolve(doc, '/c%d'); // 2
resolve(doc, '/e^f'); // 3
resolve(doc, '/g|h'); // 4
resolve(doc, '/i\\j'); // 5
resolve(doc, '/k"l'); // 6
resolve(doc, '/ '); // 7
resolve(doc, '/m~0n'); // 8
```

---

## RFC 6902: JSON Patch

**Status:** Proposed Standard (April 2013)

### Operations

| Operation | Required Fields | Description                |
| --------- | --------------- | -------------------------- |
| `add`     | `path`, `value` | Add/replace value at path  |
| `remove`  | `path`          | Remove value at path       |
| `replace` | `path`, `value` | Replace existing value     |
| `move`    | `from`, `path`  | Move value to new location |
| `copy`    | `from`, `path`  | Copy value to new location |
| `test`    | `path`, `value` | Assert value equality      |

### The `-` Token

RFC 6902 defines `-` as "past the end of the array":

```typescript
applyPatch({ arr: [1, 2] }, [{ op: 'add', path: '/arr/-', value: 3 }]);
// { arr: [1, 2, 3] }
```

### Array Insert vs Replace

```typescript
// ADD inserts at index, shifting elements
applyPatch({ arr: [1, 3] }, [{ op: 'add', path: '/arr/1', value: 2 }]);
// { arr: [1, 2, 3] }

// REPLACE replaces at index
applyPatch({ arr: [1, 3] }, [{ op: 'replace', path: '/arr/1', value: 2 }]);
// { arr: [1, 2] }
```

### Test Operation

The `test` operation asserts value equality:

```typescript
// Test passes - patch continues
applyPatch({ a: 1 }, [
	{ op: 'test', path: '/a', value: 1 },
	{ op: 'add', path: '/b', value: 2 },
]);
// { a: 1, b: 2 }

// Test fails - patch aborts with error
applyPatch({ a: 1 }, [
	{ op: 'test', path: '/a', value: 999 },
	{ op: 'add', path: '/b', value: 2 },
]);
// throws JSONPatchError
```

### Atomicity

RFC 6902 requires atomic application:

```typescript
// Either all operations succeed or none
applyPatch({ a: 1 }, [
	{ op: 'add', path: '/b', value: 2 },
	{ op: 'remove', path: '/nonexistent' }, // Fails
]);
// Throws error; document unchanged
```

### RFC 6902 Test Cases

From Appendix A of the RFC:

```typescript
// A.1 Adding an Object Member
applyPatch({ foo: 'bar' }, [{ op: 'add', path: '/baz', value: 'qux' }]);
// { "foo": "bar", "baz": "qux" }

// A.2 Adding an Array Element
applyPatch({ foo: ['bar', 'baz'] }, [
	{ op: 'add', path: '/foo/1', value: 'qux' },
]);
// { "foo": ["bar", "qux", "baz"] }

// A.3 Removing an Object Member
applyPatch({ baz: 'qux', foo: 'bar' }, [{ op: 'remove', path: '/baz' }]);
// { "foo": "bar" }

// A.4 Removing an Array Element
applyPatch({ foo: ['bar', 'qux', 'baz'] }, [{ op: 'remove', path: '/foo/1' }]);
// { "foo": ["bar", "baz"] }

// A.5 Replacing a Value
applyPatch({ baz: 'qux', foo: 'bar' }, [
	{ op: 'replace', path: '/baz', value: 'boo' },
]);
// { "baz": "boo", "foo": "bar" }
```

---

## RFC 7386: JSON Merge Patch

**Status:** Proposed Standard (October 2014)

### Semantics

| Patch Value | Effect            |
| ----------- | ----------------- |
| Object      | Merge recursively |
| `null`      | Delete the key    |
| Other       | Replace entirely  |

### Key Differences from RFC 6902

| Aspect         | RFC 6902            | RFC 7386           |
| -------------- | ------------------- | ------------------ |
| Format         | Array of operations | Document structure |
| Null handling  | Can set to null     | null = delete      |
| Array handling | Index-based ops     | Full replacement   |
| Complexity     | More complex        | Simpler            |

### RFC 7386 Algorithm

```
MergePatch(Target, Patch):
  if Patch is Object:
    if Target is not Object:
      Target = {}
    for Key, Value in Patch:
      if Value is null:
        remove Key from Target
      else:
        Target[Key] = MergePatch(Target[Key], Value)
    return Target
  else:
    return Patch
```

### Limitations

1. **Cannot set a value to `null`**: `null` means "delete"
2. **Arrays are replaced entirely**: No element-level operations
3. **No test-and-set**: Cannot conditionally apply

### RFC 7386 Example

From Section 3 of the RFC:

```typescript
const original = {
	title: 'Goodbye!',
	author: {
		givenName: 'John',
		familyName: 'Doe',
	},
	tags: ['example', 'sample'],
	content: 'This will be unchanged',
};

const patch = {
	title: 'Hello!',
	phoneNumber: '+01-123-456-7890',
	author: {
		familyName: null,
	},
	tags: ['example'],
};

applyMergePatch(original, patch);
// {
//   "title": "Hello!",
//   "author": {
//     "givenName": "John"
//   },
//   "tags": ["example"],
//   "content": "This will be unchanged",
//   "phoneNumber": "+01-123-456-7890"
// }
```

---

## Compliance Testing

The library includes comprehensive test suites for RFC compliance:

```bash
# Run all tests
pnpm --filter '@jsonpath/*' test

# Run specific package tests
pnpm --filter '@jsonpath/evaluator' test
pnpm --filter '@jsonpath/pointer' test
pnpm --filter '@jsonpath/patch' test
```

### Test Coverage

| Package                 | RFC  | Coverage                          |
| ----------------------- | ---- | --------------------------------- |
| `@jsonpath/evaluator`   | 9535 | All syntax, functions, comparison |
| `@jsonpath/pointer`     | 6901 | All escape sequences, resolution  |
| `@jsonpath/patch`       | 6902 | All operations, atomicity         |
| `@jsonpath/merge-patch` | 7386 | Algorithm, edge cases             |

---

## Known Deviations

### Intentional Extensions

1. **Negative Array Indices**: JSONPath supports negative indices (`[-1]` for last element) which is not in RFC 9535 but commonly expected.

2. **Case-insensitive `search()`**: The `search()` function uses case-insensitive matching by default for usability.

### Implementation Notes

1. **RegExp in Functions**: The `match()` and `search()` functions use JavaScript RegExp, which may have minor differences from I-Regexp specified in RFC 9535.

2. **Unicode Handling**: Full Unicode support in strings and property names, following JavaScript's native string handling.
