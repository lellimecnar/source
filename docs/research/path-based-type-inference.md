# TypeScript Path-Based Type Inference Research Report

> **For:** DataMap class implementation (`@data-map/*`)
> **Date:** June 2025
> **Scope:** Compile-time type inference for `.get(path)` and `.set(path, value)` using JSONPath/JSON Pointer strings

## Executive Summary

This report analyzes TypeScript techniques for inferring value types from path strings at compile time. The goal is to enable type-safe access to nested data structures where the path is a string literal (e.g., `$.user.name` or `/user/name`).

**Key Findings:**

1. **Template literal types** combined with **recursive conditional types** are the foundational TypeScript features for this pattern
2. **type-fest's `Paths` and `Get` types** provide the most practical existing implementation
3. **Tuple-based paths** (ts-toolbelt) offer better type safety but require different path format
4. TypeScript has inherent limitations: ~45-50 levels of recursion depth, union explosion with large schemas
5. The hybrid approach (string paths parsed to tuples at type level) is recommended for DataMap

---

## 1. Existing Library Approaches

### 1.1 type-fest: String-Based Paths

**Library:** `type-fest` (npm: type-fest)
**Approach:** Generates union of all possible dot-notation paths as string literals

```typescript
import type { Paths, Get } from 'type-fest';

type Config = {
	database: {
		host: string;
		port: number;
		credentials: {
			username: string;
			password: string;
		};
	};
	features: string[];
};

// Generate all valid paths
type ConfigPath = Paths<Config>;
// => 'database' | 'database.host' | 'database.port' | 'database.credentials'
//    | 'database.credentials.username' | 'database.credentials.password'
//    | 'features' | `features.${number}`

// Get type at path
type Username = Get<Config, 'database.credentials.username'>; // string
type Port = Get<Config, 'database.port'>; // number
```

**Pros:**

- String paths match JSONPath/JSON Pointer format conceptually
- Comprehensive path generation including array indices
- Battle-tested with edge cases handled
- Supports optional properties with `| undefined`

**Cons:**

- Union explosion with deeply nested or wide objects
- Path generation is expensive at compile time
- No built-in support for JSON Pointer format (`/a/b` vs `a.b`)

### 1.2 ts-toolbelt: Tuple-Based Paths

**Library:** `ts-toolbelt` (npm: ts-toolbelt)
**Approach:** Uses tuple arrays for path segments, provides `O.Path<T, PathTuple>`

```typescript
import { O, S } from 'ts-toolbelt';

type AppState = {
	user: {
		profile: {
			name: string;
			age: number;
		};
		settings: {
			theme: 'light' | 'dark';
		};
	};
};

// Get type using tuple path
type UserName = O.Path<AppState, ['user', 'profile', 'name']>; // string
type Theme = O.Path<AppState, ['user', 'settings', 'theme']>; // 'light' | 'dark'

// Invalid paths return `never`
type Invalid = O.Path<AppState, ['user', 'nonexistent']>; // never

// Split string to tuple using S.Split
type PathTuple = S.Split<'user.profile.name', '.'>; // ['user', 'profile', 'name']
```

**Pros:**

- Returns `never` for invalid paths (type-safe)
- More performant than generating all paths upfront
- String-to-tuple conversion available (`S.Split`)
- Rich ecosystem of complementary utilities

**Cons:**

- Tuple format differs from JSONPath/JSON Pointer
- Requires string parsing at type level to use with string paths
- `S.Split` has recursion limits

### 1.3 Lodash: Runtime Patterns with Basic Typing

**Library:** `@types/lodash`
**Approach:** Runtime path resolution with limited TypeScript support

```typescript
import _ from 'lodash';

const obj = {
	a: [{ b: { c: 3 } }],
};

// Runtime access - return type is `any` without overloads
_.get(obj, 'a[0].b.c'); // 3
_.get(obj, ['a', '0', 'b', 'c']); // 3

// Typed access requires explicit generic
_.get<number>(obj, 'a[0].b.c');
```

**Pros:**

- Handles complex path formats (`a[0].b.c`)
- `_.toPath()` converts strings to arrays
- Mature runtime implementation

**Cons:**

- Type inference is weak (often `any`)
- No compile-time path validation
- Not suitable for type-safe APIs

### 1.4 State Management Libraries (Zustand, Jotai, Valtio)

These libraries use different approaches:

**Zustand:** Selector functions, not path strings

```typescript
const useBearStore = create<State>()((set) => ({
	bears: 0,
	fish: { count: 10 },
}));

// Selector pattern - type-safe but no path strings
const fishCount = useBearStore((state) => state.fish.count);
```

**Jotai:** Atom-based with `focusAtom` and optics

```typescript
import { focusAtom } from 'jotai-optics';

const baseAtom = atom({ a: { b: 5 } });
const bAtom = focusAtom(baseAtom, (optic) => optic.prop('a').prop('b'));
```

**Valtio:** Proxy-based with direct access

```typescript
const state = proxy({ user: { name: 'John' } });
const snap = useSnapshot(state);
// Direct property access: snap.user.name
```

**Key Insight:** None of these use string paths for type inference. They prefer:

- Selector functions (Zustand, Recoil)
- Optics/lenses (Jotai with jotai-optics)
- Proxy objects (Valtio)

---

## 2. TypeScript Features for Path-Based Typing

### 2.1 Template Literal Types (Primary Building Block)

Template literal types allow parsing and manipulating string types:

```typescript
// Basic template literal
type Greeting = `Hello, ${string}!`;
type Valid = Greeting extends `Hello, World!` ? true : false; // true

// Splitting strings
type Split<
	S extends string,
	D extends string,
> = S extends `${infer Head}${D}${infer Tail}`
	? [Head, ...Split<Tail, D>]
	: S extends ''
		? []
		: [S];

type Path = Split<'user.profile.name', '.'>; // ['user', 'profile', 'name']

// JSON Pointer parsing
type SplitPointer<S extends string> = S extends `/${infer Head}/${infer Tail}`
	? [Head, ...SplitPointer<`/${Tail}`>]
	: S extends `/${infer Last}`
		? [Last]
		: S extends ''
			? []
			: never;

type PointerPath = SplitPointer<'/user/profile/name'>; // ['user', 'profile', 'name']
```

### 2.2 Recursive Conditional Types

Traverse nested structures using recursion:

```typescript
type Get<T, Path extends readonly string[]> = Path extends []
	? T
	: Path extends [infer Head extends string, ...infer Tail extends string[]]
		? Head extends keyof T
			? Get<T[Head], Tail>
			: undefined
		: never;

type State = { user: { profile: { name: string } } };
type Name = Get<State, ['user', 'profile', 'name']>; // string
type Invalid = Get<State, ['user', 'unknown']>; // undefined
```

### 2.3 The `infer` Keyword

Extract types from patterns:

```typescript
// Extract array element type
type ElementOf<T> = T extends (infer E)[] ? E : never;

// Extract from template literal
type ExtractFirst<S extends string> = S extends `${infer First}.${string}`
	? First
	: S;

type First = ExtractFirst<'user.profile.name'>; // 'user'

// Infer with constraints
type ParseInt<S extends string> = S extends `${infer N extends number}`
	? N
	: never;

type Num = ParseInt<'42'>; // 42 (literal type)
```

### 2.4 Mapped Types with Path Generation

Generate all possible paths for a type:

```typescript
type Paths<T, Prefix extends string = ''> = T extends object
	? {
			[K in keyof T & string]: `${Prefix}${K}` | Paths<T[K], `${Prefix}${K}.`>;
		}[keyof T & string]
	: never;

type State = {
	user: {
		name: string;
		age: number;
	};
	settings: {
		theme: string;
	};
};

type AllPaths = Paths<State>;
// 'user' | 'user.name' | 'user.age' | 'settings' | 'settings.theme'
```

### 2.5 Key Distributive Pattern

Handle union types correctly:

```typescript
type GetPath<T, P extends string> = P extends `${infer Head}.${infer Tail}`
	? Head extends keyof T
		? GetPath<T[Head], Tail>
		: undefined
	: P extends keyof T
		? T[P]
		: undefined;
```

---

## 3. DataMap Type Implementation Recommendations

### 3.1 Core Type Definitions

```typescript
// Parse JSON Pointer to path tuple
type ParsePointer<S extends string> = S extends ''
	? [] // Root pointer
	: S extends `/${infer Rest}`
		? SplitSlash<Rest>
		: never;

type SplitSlash<S extends string> = S extends `${infer Head}/${infer Tail}`
	? [DecodePointerSegment<Head>, ...SplitSlash<Tail>]
	: S extends ''
		? []
		: [DecodePointerSegment<S>];

// Handle JSON Pointer escape sequences (~0 = ~, ~1 = /)
type DecodePointerSegment<S extends string> = S extends `${infer A}~1${infer B}`
	? `${A}/${DecodePointerSegment<B>}`
	: S extends `${infer A}~0${infer B}`
		? `${A}~${DecodePointerSegment<B>}`
		: S;

// Parse dot-notation JSONPath (simplified)
type ParseDotPath<S extends string> = S extends `$.${infer Rest}`
	? Split<Rest, '.'>
	: S extends `$`
		? []
		: Split<S, '.'>;

// Unified path parser
type ParsePath<S extends string> = S extends '' | '/'
	? [] // Root
	: S extends `/${string}`
		? ParsePointer<S>
		: S extends `$.${string}` | '$'
			? ParseDotPath<S>
			: Split<S, '.'>; // Fallback to dot-notation
```

### 3.2 Type-Safe Get/Set

```typescript
// Get type at path
type GetAtPath<T, P extends readonly string[]> = P extends []
	? T
	: P extends [infer Head extends string, ...infer Tail extends string[]]
		? Head extends keyof T
			? GetAtPath<T[Head], Tail>
			: T extends readonly (infer E)[]
				? Head extends `${number}`
					? GetAtPath<E, Tail>
					: undefined
				: undefined
		: never;

// Combined: parse string path and get type
type Get<T, Path extends string> = GetAtPath<T, ParsePath<Path>>;

// Example usage
interface AppState {
	users: Array<{
		id: number;
		profile: {
			name: string;
			email: string;
		};
	}>;
	settings: {
		theme: 'light' | 'dark';
	};
}

type T1 = Get<AppState, '/users/0/profile/name'>; // string
type T2 = Get<AppState, '$.settings.theme'>; // 'light' | 'dark'
type T3 = Get<AppState, '/users/0'>; // { id: number; profile: {...} }
type T4 = Get<AppState, '/invalid/path'>; // undefined
```

### 3.3 Path Autocomplete

Generate valid paths for IDE autocomplete:

```typescript
// Generate JSON Pointer paths
type PointerPaths<
	T,
	Prefix extends string = '',
> = T extends readonly (infer E)[]
	? Prefix | `${Prefix}/${number}` | PointerPaths<E, `${Prefix}/${number}`>
	: T extends object
		?
				| Prefix
				| {
						[K in keyof T & string]:
							| `${Prefix}/${EncodePointerSegment<K>}`
							| PointerPaths<T[K], `${Prefix}/${EncodePointerSegment<K>}`>;
				  }[keyof T & string]
		: Prefix;

// Encode segment for JSON Pointer (~ → ~0, / → ~1)
type EncodePointerSegment<S extends string> = S extends `${infer A}~${infer B}`
	? `${A}~0${EncodePointerSegment<B>}`
	: S extends `${infer A}/${infer B}`
		? `${A}~1${EncodePointerSegment<B>}`
		: S;

type ValidPaths = PointerPaths<AppState>;
// '' | '/users' | '/users/0' | '/users/0/id' | '/users/0/profile' | ...
```

### 3.4 DataMap Class Signature

```typescript
class DataMap<T extends object> {
	constructor(initialValue: T, options?: DataMapOptions<T>);

	// Type-safe get
	get<P extends PointerPaths<T>>(path: P): Get<T, P>;
	get(path: string): unknown; // Fallback for dynamic paths

	// Type-safe set
	set<P extends PointerPaths<T>>(path: P, value: Get<T, P>): this;
	set(path: string, value: unknown): this; // Fallback

	// Resolve with full metadata
	resolve<P extends PointerPaths<T>>(path: P): ResolvedMatch<Get<T, P>>[];
}
```

---

## 4. Limitations and Workarounds

### 4.1 Recursion Depth Limit

**Problem:** TypeScript limits recursive type instantiation to ~45-50 levels.

**Symptoms:**

- Error: "Type instantiation is excessively deep and possibly infinite"
- Deeply nested objects fail to generate paths

**Workarounds:**

```typescript
// Depth limiter using tuple counter
type Paths<
	T,
	Prefix extends string = '',
	Depth extends unknown[] = [],
> = Depth['length'] extends 10 // Max depth
	? Prefix
	: T extends object
		? {
				[K in keyof T & string]:
					| `${Prefix}${K}`
					| Paths<T[K], `${Prefix}${K}.`, [...Depth, unknown]>;
			}[keyof T & string]
		: never;

// Alternative: lazy evaluation with branded types
type Shallow<T> = T extends object ? { [K in keyof T]: T[K] } : T;
```

### 4.2 Union Explosion

**Problem:** Wide objects with many keys create exponential path unions, slowing IDE.

**Impact:**

```typescript
type WideObject = {
	a1: string;
	a2: string;
	/* ... */ a100: string;
	b: { c1: string; c2: string; /* ... */ c100: string };
};
// Paths<WideObject> generates 100 + 100*100 = 10,100 paths
```

**Workarounds:**

1. **Limit path depth** (see above)
2. **Exclude certain branches:**
   ```typescript
   type Paths<T, Exclude extends string = never> = T extends object
   	? {
   			[K in Exclude<keyof T & string, Exclude>]:
   				| `${K}`
   				| Paths<T[K], Exclude>;
   		}[keyof T & string]
   	: never;
   ```
3. **Use branded types for known hot spots**
4. **Defer path generation with intersection types**

### 4.3 Optional and Nullable Properties

**Problem:** Optional properties must include `| undefined` in the return type.

**Solution:**

```typescript
type Get<T, P extends readonly string[]> = P extends []
	? T
	: P extends [infer H extends string, ...infer R extends string[]]
		? H extends keyof T
			? undefined extends T[H]
				? Get<NonNullable<T[H]>, R> | undefined
				: Get<T[H], R>
			: undefined
		: never;
```

### 4.4 Array Index Types

**Problem:** Array indices can be specific (`0`) or general (`number`).

**Solution:**

```typescript
type GetArrayElement<
	T,
	Index extends string,
	Rest extends string[],
> = T extends readonly (infer E)[]
	? Index extends `${number}`
		? GetAtPath<E, Rest>
		: undefined
	: undefined;
```

### 4.5 Dynamic Paths (Runtime Strings)

**Problem:** Paths computed at runtime cannot be typed.

**Solution:** Overload pattern with fallback:

```typescript
class DataMap<T> {
	// Literal path - fully typed
	get<P extends Paths<T>>(path: P): Get<T, P>;
	// Runtime string - returns unknown
	get(path: string): unknown;

	get(path: string): unknown {
		// Implementation
	}
}
```

---

## 5. Performance Considerations

### 5.1 Compile-Time Performance

| Approach           | Path Generation | Path Lookup | IDE Responsiveness  |
| ------------------ | --------------- | ----------- | ------------------- |
| type-fest Paths    | Slow (upfront)  | Fast        | Degrades with depth |
| ts-toolbelt O.Path | N/A             | Medium      | Good                |
| Custom recursive   | Configurable    | Medium      | Configurable        |

### 5.2 Recommendations for DataMap

1. **Generate paths lazily** using conditional types rather than upfront unions
2. **Limit depth to 6-8 levels** for path autocomplete
3. **Use branded types** for frequently accessed deep paths
4. **Consider caching** compiled types in `.d.ts` files
5. **Profile with `@typescript/analyze-trace`** for large schemas

---

## 6. Comparison Matrix

| Feature                    | type-fest      | ts-toolbelt | Custom Implementation |
| -------------------------- | -------------- | ----------- | --------------------- |
| Path format                | Dot-notation   | Tuple       | Configurable          |
| JSON Pointer support       | ❌             | ❌          | ✅                    |
| JSONPath support           | ❌             | ❌          | Partial               |
| Invalid path handling      | `undefined`    | `never`     | Configurable          |
| Array index typing         | ✅             | ✅          | ✅                    |
| Recursion limit handling   | ❌             | ❌          | ✅                    |
| Optional property handling | ✅             | Partial     | ✅                    |
| Path autocomplete          | ✅             | ❌          | ✅                    |
| Bundle size impact         | 0 (types only) | 0           | 0                     |

---

## 7. Recommended Architecture for DataMap

### 7.1 Type Layer

```
┌─────────────────────────────────────────────────────────────┐
│                     DataMap<T>                               │
├─────────────────────────────────────────────────────────────┤
│  ParsePath<S>          → Converts string to tuple           │
│    ├─ ParsePointer     → /a/b → ['a', 'b']                  │
│    ├─ ParseJSONPath    → $.a.b → ['a', 'b']                 │
│    └─ ParseRelative    → 0/a → context-relative             │
├─────────────────────────────────────────────────────────────┤
│  GetAtPath<T, Path[]>  → Traverses type using tuple         │
├─────────────────────────────────────────────────────────────┤
│  PointerPaths<T>       → Generates valid path union         │
│    (depth-limited)                                          │
├─────────────────────────────────────────────────────────────┤
│  Get<T, StringPath>    → Combines parse + traverse          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Implementation Strategy

1. **Phase 1:** Implement `ParsePointer` and `GetAtPath` for JSON Pointer support
2. **Phase 2:** Add `PointerPaths` for autocomplete (with depth limit)
3. **Phase 3:** Add `ParseJSONPath` for basic `$.a.b` patterns
4. **Phase 4:** Handle edge cases (arrays, optionals, escapes)

### 7.3 Example Implementation

See [specs/data-map-types.ts](../specs/data-map-types.ts) for complete type definitions.

---

## 8. References

- [TypeScript Handbook: Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [type-fest source: Paths](https://github.com/sindresorhus/type-fest/blob/main/source/paths.d.ts)
- [ts-toolbelt docs: Object.Path](https://millsp.github.io/ts-toolbelt/modules/object.html#path)
- [RFC 6901: JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901)
- [RFC 6902: JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902)
- [json-p3 documentation](https://github.com/jg-rp/json-p3)

---

## Appendix A: Complete Type Definitions

```typescript
// ============================================================
// DataMap Path-Based Type Inference Types
// ============================================================

// --- String Utilities ---

type Split<S extends string, D extends string> = S extends ''
	? []
	: S extends `${infer H}${D}${infer T}`
		? [H, ...Split<T, D>]
		: [S];

// --- JSON Pointer Parsing ---

type DecodePointerSegment<S extends string> = S extends `${infer A}~1${infer B}`
	? `${A}/${DecodePointerSegment<B>}`
	: S extends `${infer A}~0${infer B}`
		? `${A}~${DecodePointerSegment<B>}`
		: S;

type ParsePointer<S extends string> = S extends ''
	? []
	: S extends `/${infer Rest}`
		? ParsePointerRest<Rest>
		: never;

type ParsePointerRest<S extends string> = S extends ''
	? []
	: S extends `${infer H}/${infer T}`
		? [DecodePointerSegment<H>, ...ParsePointerRest<T>]
		: [DecodePointerSegment<S>];

// --- JSONPath Parsing (simplified $. notation) ---

type ParseJSONPath<S extends string> = S extends '$'
	? []
	: S extends `$.${infer Rest}`
		? Split<Rest, '.'>
		: S extends `$[${infer Index}]${infer Rest}`
			? [Index, ...ParseJSONPathBracket<Rest>]
			: never;

type ParseJSONPathBracket<S extends string> = S extends ''
	? []
	: S extends `.${infer Rest}`
		? Split<Rest, '.'>
		: S extends `[${infer Index}]${infer Rest}`
			? [Index, ...ParseJSONPathBracket<Rest>]
			: never;

// --- Unified Path Parser ---

type ParsePath<S extends string> = S extends ''
	? []
	: S extends `/${string}`
		? ParsePointer<S>
		: S extends `$${string}`
			? ParseJSONPath<S>
			: Split<S, '.'>;

// --- Path Traversal ---

type GetAtPath<T, P extends readonly string[]> = P extends []
	? T
	: P extends [infer H extends string, ...infer R extends string[]]
		? H extends keyof T
			? GetAtPath<T[H], R>
			: T extends readonly (infer E)[]
				? H extends `${number}`
					? GetAtPath<E, R>
					: undefined
				: undefined
		: never;

// --- Combined Get ---

type Get<T, Path extends string> = GetAtPath<T, ParsePath<Path>>;

// --- Path Generation (depth-limited) ---

type PointerPaths<
	T,
	Prefix extends string = '',
	Depth extends unknown[] = [],
> = Depth['length'] extends 8
	? Prefix
	: T extends readonly (infer E)[]
		? Prefix | PointerPaths<E, `${Prefix}/${number}`, [...Depth, unknown]>
		: T extends object
			?
					| Prefix
					| {
							[K in keyof T & string]: PointerPaths<
								T[K],
								`${Prefix}/${K}`,
								[...Depth, unknown]
							>;
					  }[keyof T & string]
			: Prefix;

// --- DataMap Interface ---

interface DataMap<T extends object> {
	get<P extends PointerPaths<T> & string>(path: P): Get<T, P>;
	get(path: string): unknown;

	set<P extends PointerPaths<T> & string>(path: P, value: Get<T, P>): this;
	set(path: string, value: unknown): this;

	resolve<P extends PointerPaths<T> & string>(
		path: P,
	): Array<{ pointer: P; value: Get<T, P> }>;
}
```
