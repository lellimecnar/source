# @jsonpath/merge-patch

> RFC 7386 JSON Merge Patch implementation.

## Overview

`@jsonpath/merge-patch` provides JSON Merge Patch (RFC 7386) functionality. Merge Patch is a simpler alternative to JSON Patch (RFC 6902) that uses a document-like syntax for updates.

## Key Differences from JSON Patch

| Feature    | JSON Patch (RFC 6902)            | Merge Patch (RFC 7386) |
| ---------- | -------------------------------- | ---------------------- |
| Format     | Array of operations              | Document structure     |
| Delete     | `{ op: 'remove', path: '/key' }` | `{ key: null }`        |
| Arrays     | Index-based operations           | Full array replacement |
| Complexity | More complex, more powerful      | Simpler, less powerful |
| Use case   | Fine-grained control             | Simple updates         |

## Installation

```bash
pnpm add @jsonpath/merge-patch
```

## API Reference

### applyMergePatch()

Apply a merge patch to a document:

```typescript
import { applyMergePatch } from '@jsonpath/merge-patch';

const document = {
	title: 'Hello',
	author: { name: 'John' },
	tags: ['one', 'two'],
};

const patch = {
	title: 'Hi',
	author: { email: 'john@example.com' },
	tags: ['three'],
};

const result = applyMergePatch(document, patch);
// {
//   title: 'Hi',
//   author: { name: 'John', email: 'john@example.com' },
//   tags: ['three']
// }
```

---

## Merge Patch Semantics

### Adding Properties

Properties in the patch are added to the target:

```typescript
applyMergePatch({ a: 1 }, { b: 2 });
// { a: 1, b: 2 }
```

### Replacing Properties

Properties in the patch replace existing ones:

```typescript
applyMergePatch({ a: 1 }, { a: 2 });
// { a: 2 }
```

### Deleting Properties

Set a property to `null` to delete it:

```typescript
applyMergePatch({ a: 1, b: 2 }, { b: null });
// { a: 1 }
```

**Note:** This means you cannot set a property to `null` using merge patch. Use JSON Patch (RFC 6902) if you need null values.

### Nested Objects

Nested objects are merged recursively:

```typescript
applyMergePatch({ a: { b: 1, c: 2 } }, { a: { c: 3, d: 4 } });
// { a: { b: 1, c: 3, d: 4 } }
```

### Arrays are Replaced

Arrays are replaced entirely, not merged:

```typescript
applyMergePatch({ tags: ['one', 'two'] }, { tags: ['three'] });
// { tags: ['three'] }
```

**Note:** This is a key limitation. Use JSON Patch for fine-grained array operations.

---

## RFC 7386 Examples

From the RFC 7386 specification:

```typescript
// Example document
const document = {
	title: 'Goodbye!',
	author: {
		givenName: 'John',
		familyName: 'Doe',
	},
	tags: ['example', 'sample'],
	content: 'This will be unchanged',
};

// Example merge patch
const patch = {
	title: 'Hello!',
	phoneNumber: '+01-123-456-7890',
	author: {
		familyName: null,
	},
	tags: ['example'],
};

// Apply the patch
const result = applyMergePatch(document, patch);
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

**Changes made:**

1. `title` replaced: "Goodbye!" → "Hello!"
2. `phoneNumber` added
3. `author.familyName` deleted (set to null)
4. `tags` replaced with new array
5. `content` unchanged

---

## Merge Patch Algorithm

The algorithm from RFC 7386 Section 2:

```
define MergePatch(Target, Patch):
  if Patch is an Object:
    if Target is not an Object:
      Target = {} # Ignore the contents and set it to an empty Object
    for each Key/Value pair in Patch:
      if Value is null:
        if Key exists in Target:
          remove Key from Target
      else:
        Target[Key] = MergePatch(Target[Key], Value)
    return Target
  else:
    return Patch
```

**Key behaviors:**

1. If patch is not an object, replace entirely
2. If patch key has `null` value, delete from target
3. Otherwise, recursively merge objects
4. Non-object patches replace the target

---

## Usage Examples

### Simple Configuration Update

```typescript
import { applyMergePatch } from '@jsonpath/merge-patch';

const config = {
	server: { host: 'localhost', port: 3000 },
	database: { host: 'localhost', port: 5432 },
};

// Update server port only
const updated = applyMergePatch(config, {
	server: { port: 8080 },
});
// {
//   server: { host: 'localhost', port: 8080 },
//   database: { host: 'localhost', port: 5432 }
// }
```

### Removing Optional Fields

```typescript
const user = {
	name: 'John',
	email: 'john@example.com',
	phone: '+1-555-0100',
};

// Remove phone number
const updated = applyMergePatch(user, { phone: null });
// { name: 'John', email: 'john@example.com' }
```

### Bulk Updates

```typescript
function updateMany<T extends object>(doc: T, updates: Partial<T>): T {
	return applyMergePatch(doc, updates) as T;
}

const item = { name: 'foo', count: 1, active: true };
const updated = updateMany(item, { count: 2, active: false });
// { name: 'foo', count: 2, active: false }
```

---

## When to Use Merge Patch

**Use Merge Patch when:**

- You need simple property updates
- The patch structure mirrors the document
- You don't need fine-grained array control
- You want simpler, more readable patches

**Use JSON Patch when:**

- You need to set values to `null`
- You need array insertions, deletions, or moves
- You need atomic test-and-set operations
- You need to track/replay changes precisely

---

## Comparison Example

The same update with both formats:

```typescript
// Goal: Add email, remove phone, update name

// Using Merge Patch
const mergePatch = {
	name: 'Jane',
	email: 'jane@example.com',
	phone: null,
};

// Using JSON Patch
const jsonPatch = [
	{ op: 'replace', path: '/name', value: 'Jane' },
	{ op: 'add', path: '/email', value: 'jane@example.com' },
	{ op: 'remove', path: '/phone' },
];
```

Merge Patch is more intuitive for simple cases but less powerful for complex operations.

---

## Error Handling

Merge patch is more forgiving than JSON Patch. Most edge cases are handled gracefully:

```typescript
import { applyMergePatch } from '@jsonpath/merge-patch';

// Merging into non-object replaces it
applyMergePatch('not an object', { a: 1 });
// { a: 1 }

// Empty patch = no changes
applyMergePatch({ a: 1 }, {});
// { a: 1 }

// Non-object patch replaces target
applyMergePatch({ a: 1 }, 'string');
// 'string'
```
