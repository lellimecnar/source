# Path System

Deep dive into path detection, compilation, and matching in `@data-map/core`.

## Overview

The path system provides a unified interface for working with both JSON Pointer (RFC 6901) and JSONPath (RFC 9535) expressions. This enables users to choose the syntax that best fits their use case while maintaining consistent behavior.

## Path Types

### JSON Pointer (RFC 6901)

Direct path addressing using slash-separated segments:

```
/users/0/name        → data.users[0].name
/config/settings     → data.config.settings
/items/-             → End of items array
```

**Characteristics:**

- Always starts with `/`
- Exact path, no wildcards
- Fast O(n) traversal where n = segments

### JSONPath (RFC 9535)

Query language with pattern matching capabilities:

```
$.users[0].name      → Exact path
$.users[*].name      → All user names
$.users[?@.active]   → Filtered users
$..name              → All names (recursive)
```

**Characteristics:**

- Always starts with `$`
- Supports wildcards, filters, slices
- Pattern matching against structure

## Path Detection

### Algorithm

```typescript
function detectPathType(path: string): PathType {
	if (path.startsWith('/')) {
		return 'pointer';
	}
	if (path.startsWith('$')) {
		return 'jsonpath';
	}
	if (/^\d+/.test(path)) {
		return 'relative-pointer';
	}
	throw new Error('Unknown path type');
}
```

### Examples

| Input        | Detected Type      |
| ------------ | ------------------ |
| `/users/0`   | `pointer`          |
| `$.users[0]` | `jsonpath`         |
| `0/name`     | `relative-pointer` |
| `users`      | Error              |

## Path Compilation

### Segment Types

Compiled paths consist of typed segments:

```typescript
type SegmentType =
	| 'static' // Exact match: .name, /0
	| 'index' // Array index: [0], [1]
	| 'wildcard' // All children: [*], .*
	| 'slice' // Array slice: [1:3], [::2]
	| 'filter' // Predicate: [?@.active]
	| 'recursive'; // Descendant: ..
```

### Compilation Process

```typescript
interface CompiledPattern {
	original: string;
	type: PathType;
	segments: CompiledSegment[];
	isStatic: boolean; // No wildcards/filters
}

interface CompiledSegment {
	type: SegmentType;
	value: string | number | null;
	predicate?: (node: unknown) => boolean;
}
```

**Example Compilation:**

```
$.users[*].name

Segments:
  1. { type: 'static', value: 'users' }
  2. { type: 'wildcard', value: null }
  3. { type: 'static', value: 'name' }
```

### Caching

Compiled patterns are cached for performance:

```typescript
const patternCache = new Map<string, CompiledPattern>();

export function compilePathPattern(path: string): CompiledPattern {
	let pattern = patternCache.get(path);
	if (!pattern) {
		pattern = doCompile(path);
		patternCache.set(path, pattern);
	}
	return pattern;
}
```

### JSON Serialization

Compiled patterns can be serialized for debugging or persistence:

```typescript
const pattern = compilePathPattern('$.users[*].name');

JSON.stringify(pattern);
// Uses toJSON() method internally

// Output includes:
// - original: the source pattern string
// - type: 'pointer' | 'jsonpath' | 'relative-pointer'
// - segments: array of compiled segments
// - isStatic: whether pattern has no wildcards
```

This is useful for:

- Debugging subscription patterns
- Persisting compiled patterns across sessions
- Inspecting pattern structure in logs

## Pattern Matching

### Static Matching

For exact pointer-to-pointer comparison:

```typescript
function matchStaticPath(pattern: string, pointer: string): boolean {
	return pattern === pointer || pointer.startsWith(pattern + '/');
}
```

### Dynamic Matching

For JSONPath patterns against concrete pointers:

```typescript
function matchDynamicPath(pattern: CompiledPattern, pointer: string): boolean {
	const pointerSegments = parsePointer(pointer);
	return matchSegments(pattern.segments, pointerSegments, 0, 0);
}
```

### Recursive Segment Matching

The recursive descent (`..`) requires special handling:

```typescript
// Pattern: $..name
// Matches: /name, /user/name, /a/b/c/name

function matchRecursive(
	patternSegs: CompiledSegment[],
	pointerSegs: string[],
	pi: number, // pattern index
	si: number, // string index
): boolean {
	// Try matching at current position
	if (matchSegments(patternSegs, pointerSegs, pi + 1, si)) {
		return true;
	}
	// Try skipping one pointer segment
	if (si < pointerSegs.length) {
		return matchRecursive(patternSegs, pointerSegs, pi, si + 1);
	}
	return false;
}
```

## Pattern Expansion

### Purpose

Expands a pattern against data to get all matching pointers:

```typescript
const pointers = expandPattern('$.users[*].name', data);
// ['/users/0/name', '/users/1/name', '/users/2/name']
```

### Algorithm

```typescript
function expandPattern(pattern: string, data: unknown): string[] {
	const compiled = compilePathPattern(pattern);

	if (compiled.isStatic) {
		return [pointerFromPattern(compiled)];
	}

	return walkAndMatch(compiled.segments, data, '', 0);
}

function walkAndMatch(
	segments: CompiledSegment[],
	node: unknown,
	currentPointer: string,
	segmentIndex: number,
): string[] {
	if (segmentIndex >= segments.length) {
		return [currentPointer];
	}

	const segment = segments[segmentIndex];
	const results: string[] = [];

	switch (segment.type) {
		case 'static':
			if (isObject(node) && segment.value in node) {
				results.push(
					...walkAndMatch(
						segments,
						node[segment.value],
						`${currentPointer}/${escapePointer(segment.value)}`,
						segmentIndex + 1,
					),
				);
			}
			break;

		case 'wildcard':
			if (Array.isArray(node)) {
				node.forEach((item, i) => {
					results.push(
						...walkAndMatch(
							segments,
							item,
							`${currentPointer}/${i}`,
							segmentIndex + 1,
						),
					);
				});
			} else if (isObject(node)) {
				Object.entries(node).forEach(([key, value]) => {
					results.push(
						...walkAndMatch(
							segments,
							value,
							`${currentPointer}/${escapePointer(key)}`,
							segmentIndex + 1,
						),
					);
				});
			}
			break;

		case 'filter':
			if (Array.isArray(node)) {
				node.forEach((item, i) => {
					if (segment.predicate!(item)) {
						results.push(
							...walkAndMatch(
								segments,
								item,
								`${currentPointer}/${i}`,
								segmentIndex + 1,
							),
						);
					}
				});
			}
			break;

		// ... other segment types
	}

	return results;
}
```

## Pointer Escaping

RFC 6901 requires escaping special characters:

```typescript
function escapePointer(segment: string): string {
	return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapePointer(segment: string): string {
	return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}
```

| Character | Escaped |
| --------- | ------- |
| `~`       | `~0`    |
| `/`       | `~1`    |

## JSONPath to Pointer Conversion

For static JSONPath expressions:

```typescript
function jsonpathToPointer(jsonpath: string): string | null {
	if (!isStaticJsonpath(jsonpath)) {
		return null; // Can't convert dynamic paths
	}

	// $.users[0].name → /users/0/name
	return jsonpath
		.replace(/^\$\.?/, '/')
		.replace(/\[(\d+)\]/g, '/$1')
		.replace(/\./g, '/');
}
```

## Subscription Path Matching

### The Challenge

Subscriptions use patterns, mutations use pointers:

```typescript
// Subscription
store.subscribe({ path: '$.users[*].name', ... });

// Mutation
store.set('/users/5/name', 'Alice');

// Question: Should the subscription fire?
```

### The Solution

Match the mutation pointer against expanded subscription patterns:

```typescript
function shouldNotify(
	subscriptionPattern: string,
	mutatedPointer: string,
	data: unknown,
): boolean {
	const compiled = compilePathPattern(subscriptionPattern);

	if (compiled.isStatic) {
		return matchStaticPath(compiled.original, mutatedPointer);
	}

	// Check if mutated pointer matches the pattern
	return matchDynamicPath(compiled, mutatedPointer);
}
```

### Bloom Filter Optimization

For large numbers of subscriptions, a Bloom filter provides fast negative lookup:

```typescript
class SubscriptionMatcher {
	private _bloom: BloomFilter;
	private _patterns: Map<string, CompiledPattern>;

	mightMatch(pointer: string): boolean {
		// O(1) negative check
		if (!this._bloom.mightContain(pointer)) {
			return false;
		}
		// Full pattern matching
		return this.fullMatch(pointer);
	}
}
```

## Performance Characteristics

| Operation           | Complexity  | Notes                      |
| ------------------- | ----------- | -------------------------- |
| Path detection      | O(1)        | First character check      |
| Pattern compilation | O(n)        | n = path length, cached    |
| Static matching     | O(min(m,n)) | m,n = segment counts       |
| Dynamic matching    | O(n×m)      | Pattern × pointer segments |
| Pattern expansion   | O(n×d)      | n = data size, d = depth   |

## Error Handling

### Invalid Paths

```typescript
compilePathPattern('invalid');
// Error: Unknown path type

compilePathPattern('$.users[');
// Error: Unclosed bracket

compilePathPattern('/a//b');
// Error: Empty segment
```

### Path Not Found

In non-strict mode, missing paths return `undefined`:

```typescript
store.get('/missing/path'); // undefined
```

In strict mode, throws:

```typescript
store.get('/missing/path', { strict: true });
// Error: Path not found: /missing/path
```

## See Also

- [Architecture Overview](./design-overview.md)
- [Patch System](./patch-system.md)
- [RFC 6901 - JSON Pointer](https://tools.ietf.org/html/rfc6901)
- [RFC 9535 - JSONPath](https://tools.ietf.org/html/rfc9535)
