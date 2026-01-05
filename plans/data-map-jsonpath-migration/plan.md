# DataMap JSONPath Migration: json-p3 → @jsonpath/\*

**Branch:** `feat/data-map-native-jsonpath`
**Description:** Migrate `@data-map/core` from `json-p3` to native `@jsonpath/*` packages with performance optimizations

## Goal

Replace the external `json-p3` dependency with the workspace's native `@jsonpath/*` packages to:

1. Eliminate external dependency and reduce bundle size
2. Leverage performance features: AST caching, pre-compilation (on by default), streaming
3. Enable direct access to advanced JSONPath features including streaming API
4. Unify the codebase on a single JSONPath implementation
5. Normalize all JSONPath errors to DataMap-specific error types

## API Mapping

| json-p3 Usage                             | @jsonpath/\* Replacement                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `jsonpath.query(path, data)`              | `query(data, path)` ⚠️ args swapped                                       |
| `nodes.pointers().map(p => p.toString())` | `result.normalizedPaths()` or `result.pointers().map(p => p.toPointer())` |
| `nodes.values()`                          | `result.values()` ✅ same                                                 |
| `new JSONPointer(str).resolve(data)`      | `new JSONPointer(str).resolve(data)` ✅ same                              |
| `new JSONPointer(str).exists(data)`       | `evaluatePointer(data, str) !== undefined` or use `.evaluate()`           |
| `jsonpatch.apply(ops, target)`            | `applyPatch(target, ops)` ⚠️ args swapped                                 |

## Files to Modify

### Source Files (4 files)

| File                   | Changes                                                   |
| ---------------------- | --------------------------------------------------------- |
| `src/DataMap.ts`       | Replace `jsonpath.query()`, update argument order         |
| `src/patch/apply.ts`   | Replace `jsonpatch.apply()`                               |
| `src/patch/builder.ts` | Replace `JSONPointer` import, add `exists` helper         |
| `src/patch/array.ts`   | Replace `JSONPointer` import, update resolve/exists usage |

### Configuration & Documentation (3 files)

| File               | Changes                                       |
| ------------------ | --------------------------------------------- |
| `package.json`     | Update dependencies                           |
| `AGENTS.md`        | Update requirement stating "MUST use json-p3" |
| `vitest.config.ts` | Verify/update aliases if needed               |

### Test Files (2 files)

| File                                         | Changes             |
| -------------------------------------------- | ------------------- |
| `src/__tests__/jsonpath-integration.spec.ts` | Update parity tests |
| `src/__tests__/spec-compliance.spec.ts`      | Update references   |

---

## Implementation Steps

### Step 1: Update Dependencies and Configuration

**Files:**

- `packages/data-map/core/package.json`
- `packages/data-map/core/AGENTS.md`

**What:**
Replace `json-p3` dependency with native `@jsonpath/*` packages. Update AGENTS.md to reflect the new requirement.

**Changes:**

```json
// package.json dependencies
{
	"dependencies": {
		"@jsonpath/jsonpath": "workspace:*",
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/patch": "workspace:*"
	}
}
```

Remove `json-p3` from dependencies. Remove `@jsonpath/compat-json-p3` from devDependencies (no longer needed).

**Testing:**

- Run `pnpm install` to verify workspace resolution
- Run `pnpm turbo -F @data-map/core type-check` to identify type errors (expected at this stage)

---

### Step 2: Create Pointer Compatibility Wrapper

**Files:**

- `packages/data-map/core/src/utils/jsonpath.ts` (new file)

**What:**
Create a thin utility module that provides a unified interface for common JSONPath/Pointer operations, optimized for DataMap's usage patterns. This centralizes migration concerns and enables performance optimizations.

**Implementation:**

```typescript
// src/utils/jsonpath.ts
import {
	query as jpQuery,
	compileQuery,
	stream as jpStream,
} from '@jsonpath/jsonpath';
import { JSONPointer, evaluatePointer } from '@jsonpath/pointer';
import { applyPatch as jpApplyPatch } from '@jsonpath/patch';
import type { PatchOperation } from '@jsonpath/patch';
import type { QueryResultNode } from '@jsonpath/evaluator';
import { JSONPathError, JSONPathSyntaxError } from '@jsonpath/core';

/**
 * DataMap-specific error for JSONPath/Pointer operations.
 */
export class DataMapPathError extends Error {
	readonly code: string;
	readonly path?: string;
	readonly cause?: Error;

	constructor(
		message: string,
		options?: { code?: string; path?: string; cause?: Error },
	) {
		super(message);
		this.name = 'DataMapPathError';
		this.code = options?.code ?? 'PATH_ERROR';
		this.path = options?.path;
		this.cause = options?.cause;
	}
}

/**
 * Normalize @jsonpath/* errors to DataMapPathError.
 */
function normalizeError(error: unknown, path?: string): DataMapPathError {
	if (error instanceof DataMapPathError) return error;
	if (error instanceof JSONPathSyntaxError) {
		return new DataMapPathError(`Invalid JSONPath syntax: ${error.message}`, {
			code: 'SYNTAX_ERROR',
			path,
			cause: error,
		});
	}
	if (error instanceof JSONPathError) {
		return new DataMapPathError(error.message, {
			code: 'PATH_ERROR',
			path,
			cause: error,
		});
	}
	if (error instanceof Error) {
		return new DataMapPathError(error.message, { path, cause: error });
	}
	return new DataMapPathError(String(error), { path });
}

/**
 * Re-export JSONPointer class for direct usage.
 * Note: @jsonpath/pointer's JSONPointer.resolve() is compatible with json-p3's API.
 */
export { JSONPointer } from '@jsonpath/pointer';

/**
 * Execute a JSONPath query and return pointer strings + values.
 * Optimized to avoid creating intermediate JSONPointer objects.
 */
export function queryWithPointers(
	data: unknown,
	path: string,
): { pointers: string[]; values: unknown[] } {
	try {
		const result = jpQuery(data, path);
		return {
			pointers: result.normalizedPaths(), // Direct string array, no .map()
			values: result.values(),
		};
	} catch (error) {
		throw normalizeError(error, path);
	}
}

/**
 * Stream JSONPath query results for memory-efficient iteration over large datasets.
 * Use this instead of queryWithPointers when processing large result sets.
 */
export function* streamQuery(
	data: unknown,
	path: string,
): Generator<QueryResultNode> {
	try {
		yield* jpStream(data, path);
	} catch (error) {
		throw normalizeError(error, path);
	}
}

/**
 * Evaluate a JSON Pointer against data.
 * Uses evaluatePointer for single-use pointers (faster than creating JSONPointer instance).
 */
export function resolvePointer(data: unknown, pointer: string): unknown {
	try {
		return evaluatePointer(data, pointer);
	} catch (error) {
		throw normalizeError(error, pointer);
	}
}

/**
 * Check if a pointer path exists in data.
 */
export function pointerExists(data: unknown, pointer: string): boolean {
	try {
		return evaluatePointer(data, pointer) !== undefined;
	} catch {
		return false;
	}
}

/**
 * Apply JSON Patch operations to target (mutates in-place by default).
 */
export function applyOperations(
	target: unknown,
	ops: PatchOperation[],
	options?: { mutate?: boolean },
): unknown {
	try {
		return jpApplyPatch(target, ops, { mutate: options?.mutate ?? true });
	} catch (error) {
		throw normalizeError(error);
	}
}

/**
 * Compile a JSONPath query for repeated execution.
 * Use this for subscription patterns where the same query runs multiple times.
 */
export { compileQuery } from '@jsonpath/jsonpath';
```

**Performance Rationale:**

1. `result.normalizedPaths()` returns `string[]` directly instead of `pointers().map(p => p.toString())`
2. `evaluatePointer()` is faster than `new JSONPointer().resolve()` for single-use
3. Compilation support for subscription patterns enables major performance gains
4. `streamQuery()` enables memory-efficient iteration for large datasets

**Error Handling:**
All errors are normalized to `DataMapPathError` with:

- `code`: Error classification (`SYNTAX_ERROR`, `PATH_ERROR`)
- `path`: The path/pointer that caused the error
- `cause`: Original error for debugging

**Testing:**

- Unit test the new utility module
- Verify type correctness with `pnpm turbo -F @data-map/core type-check`

---

### Step 3: Migrate DataMap.ts JSONPath Queries

**Files:**

- `packages/data-map/core/src/DataMap.ts`

**What:**
Update the `resolve()` method and any other JSONPath query usages to use the new utility module. The key change is argument order (`data, path` instead of `path, data`) and using `normalizedPaths()` for efficiency.

**Before:**

```typescript
import { jsonpath, JSONPointer } from 'json-p3';
// ...
const nodes = jsonpath.query(pathOrPointer, this._data as any);
const pointers = nodes.pointers().map((p) => p.toString());
const values = nodes.values();
```

**After:**

```typescript
import { JSONPointer, queryWithPointers } from './utils/jsonpath';
// ...
const { pointers, values } = queryWithPointers(this._data, pathOrPointer);
```

**Additional Changes:**

- Update all `JSONPointer` usages to use the re-exported class
- The `peek()` method uses `JSONPointer.resolve()` which is API-compatible

**Testing:**

- Run `pnpm turbo -F @data-map/core test` to verify query behavior
- Ensure all existing tests pass without modification

---

### Step 4: Migrate Patch Application

**Files:**

- `packages/data-map/core/src/patch/apply.ts`

**What:**
Replace `jsonpatch.apply()` with `@jsonpath/patch`'s `applyPatch()`. Note the argument order is swapped.

**Before:**

```typescript
import { jsonpatch } from 'json-p3';
// ...
jsonpatch.apply(ops as any, working as any);
```

**After:**

```typescript
import { applyPatch } from '@jsonpath/patch';
// ...
applyPatch(working, ops, { mutate: true });
```

**Performance Note:**
Using `mutate: true` since we're already working on a `structuredClone()` copy. This avoids an extra clone inside `applyPatch()`.

**Testing:**

- Run patch-specific tests
- Verify `applyOperations()` returns correct `affectedPointers` and `structuralPointers`

---

### Step 5: Migrate Patch Builder Module

**Files:**

- `packages/data-map/core/src/patch/builder.ts`

**What:**
Replace `json-p3` JSONPointer import with `@jsonpath/pointer`. Update `exists` check to use the helper or direct evaluation.

**Before:**

```typescript
import { JSONPointer } from 'json-p3';

function getAtPointer(data: unknown, pointer: string): unknown {
	return new JSONPointer(pointer).resolve(data as any);
}

function existsAtPointer(data: unknown, pointer: string): boolean {
	try {
		return new JSONPointer(pointer).exists(data as any);
	} catch {
		return false;
	}
}
```

**After:**

```typescript
import { JSONPointer, pointerExists, resolvePointer } from '../utils/jsonpath';

function getAtPointer(data: unknown, pointer: string): unknown {
	return resolvePointer(data, pointer);
}

function existsAtPointer(data: unknown, pointer: string): boolean {
	return pointerExists(data, pointer);
}
```

**Testing:**

- Run `buildSetPatch` and `ensureParentContainers` tests
- Verify intermediate container creation works correctly

---

### Step 6: Migrate Array Patch Module

**Files:**

- `packages/data-map/core/src/patch/array.ts`

**What:**
Same pattern as builder.ts - replace JSONPointer import and update resolve/exists helpers.

**Before:**

```typescript
import { JSONPointer } from 'json-p3';

function resolveArray(data: unknown, pointer: string): unknown[] {
	try {
		const v = new JSONPointer(pointer).resolve(data as any);
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

function existsPointer(data: unknown, pointer: string): boolean {
	try {
		return new JSONPointer(pointer).exists(data as any);
	} catch {
		return false;
	}
}
```

**After:**

```typescript
import { pointerExists, resolvePointer } from '../utils/jsonpath';

function resolveArray(data: unknown, pointer: string): unknown[] {
	try {
		const v = resolvePointer(data, pointer);
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

function existsPointer(data: unknown, pointer: string): boolean {
	return pointerExists(data, pointer);
}
```

**Testing:**

- Run array operation tests (push, pop, shift, unshift, splice, sort, shuffle)
- Verify all array mutations produce correct patch operations

---

### Step 7: Update Tests and Cleanup

**Files:**

- `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts`
- `packages/data-map/core/src/__tests__/spec-compliance.spec.ts`
- `packages/data-map/core/package.json` (remove json-p3 and compat layer)

**What:**
Remove parity tests and json-p3 references. Clean up all dependencies.

**Changes:**

1. Remove `json-p3` parity tests entirely (no longer needed)
2. Remove `@jsonpath/compat-json-p3` from devDependencies
3. Update test descriptions that reference `json-p3`
4. Add tests for `DataMapPathError` normalization
5. Add tests for `streamQuery()` API
6. Run full test suite with coverage

**Testing:**

- `pnpm turbo -F @data-map/core test:coverage`
- Verify coverage thresholds are met (90% statements, 90% lines, 85% branches, 95% functions)

---

### Step 8: Performance Optimization - Query Compilation for Subscriptions

**Files:**

- `packages/data-map/core/src/subscription/manager.ts`
- `packages/data-map/core/src/subscription/types.ts`

**What:**
Implement query pre-compilation for subscription patterns (enabled by default, opt-out). When a subscription uses a JSONPath (not a pointer), compile it once at registration time and reuse the compiled query for notifications.

**Implementation:**

```typescript
// In subscription/types.ts
export interface SubscriptionConfig<T, Ctx> {
  path: string;
  // ... existing fields

  /**
   * Disable query pre-compilation for this subscription.
   * Pre-compilation is enabled by default for JSONPath subscriptions.
   * Set to true to disable (useful for one-time subscriptions or debugging).
   * @default false
   */
  noPrecompile?: boolean;
}

// In subscription/manager.ts
import { compileQuery, type CompiledQuery } from '../utils/jsonpath';
import { detectPathType } from '../path/detect';

interface InternalSubscription {
  config: SubscriptionConfig<any, any>;
  compiledQuery?: CompiledQuery; // Cached compiled query
}

// In subscription registration
register(config: SubscriptionConfig<T, Ctx>): Subscription {
  const pathType = detectPathType(config.path);
  let compiledQuery: CompiledQuery | undefined;

  // Pre-compile JSONPath queries by default
  if (pathType === 'jsonpath' && !config.noPrecompile) {
    compiledQuery = compileQuery(config.path);
  }

  // Store compiledQuery with subscription for reuse in notifications
  // ...
}
```

**Performance Benefit:**
Subscriptions that fire frequently (e.g., on every data change) skip parsing and AST construction overhead. The compiled query is a direct executable function.

**Opt-out Usage:**

```typescript
dataMap.subscribe({
	path: '$.users[*].name',
	noPrecompile: true, // Disable for this subscription
	on: { resolve: (matches) => console.log(matches) },
});
```

**Testing:**

- Verify compiled queries produce identical results to uncompiled
- Test `noPrecompile: true` disables compilation
- Verify memory is freed when subscription is unsubscribed

---

### Step 9: Expose Streaming API for Large Dataset Resolution

**Files:**

- `packages/data-map/core/src/DataMap.ts`

**What:**
Expose the streaming API for memory-efficient resolution of large datasets. Add `resolveStream()` method that yields results one at a time instead of collecting all matches into an array.

**Implementation:**

```typescript
// In DataMap.ts
import { streamQuery, type QueryResultNode } from './utils/jsonpath';

/**
 * Stream-resolve a JSONPath query for memory-efficient iteration.
 * Use this instead of resolve() when expecting many matches.
 *
 * @example
 * for (const match of dataMap.resolveStream('$.items[*]')) {
 *   console.log(match.pointer, match.value);
 * }
 */
*resolveStream(
  pathOrPointer: string,
  options: CallOptions = {}
): Generator<ResolvedMatch> {
  const strict = options.strict ?? this._strict;
  const pathType = detectPathType(pathOrPointer);
  const ctx = this._context as any;

  if (pathType !== 'jsonpath') {
    // For pointers, fall back to regular resolve (single result)
    const matches = this.resolve(pathOrPointer, options);
    for (const match of matches) {
      yield match;
    }
    return;
  }

  try {
    for (const node of streamQuery(this._data, pathOrPointer)) {
      const pointer = node.path; // normalized path string
      const value = cloneSnapshot(
        this._defs.applyGetter(pointer, node.value, ctx)
      );

      this._subs.scheduleNotify(
        pointer,
        'resolve',
        'on',
        value,
        undefined,
        undefined,
        pathOrPointer,
      );

      yield { pointer, value };
    }
  } catch (error) {
    if (strict) throw error;
    return;
  }
}
```

**Internal Usage:**
Update internal methods to use streaming where beneficial:

- Subscription matching for wildcard paths with many matches
- Batch operations that iterate over all matches

**Public API:**

```typescript
// Memory-efficient iteration
for (const { pointer, value } of dataMap.resolveStream('$.items[*]')) {
	processItem(pointer, value);
}

// Or with early exit
for (const match of dataMap.resolveStream('$.users[*]')) {
	if (match.value.isActive) {
		foundActiveUser = match;
		break; // Stop iteration early
	}
}
```

**Testing:**

- Test streaming produces same results as `resolve()`
- Test early exit doesn't leak resources
- Test error handling in strict mode

---

## Risk Assessment

| Risk                           | Likelihood | Impact | Mitigation                                         |
| ------------------------------ | ---------- | ------ | -------------------------------------------------- |
| Argument order errors          | Medium     | High   | Thorough test coverage, TypeScript will catch most |
| `exists()` behavior difference | Low        | Medium | Utility wrapper normalizes behavior                |
| Error type differences         | Low        | Low    | All errors normalized to `DataMapPathError`        |
| Performance regression         | Low        | Medium | Pre-compilation enabled by default                 |
| Streaming API edge cases       | Low        | Low    | Comprehensive tests for generator lifecycle        |

## Success Criteria

- [ ] All existing tests pass without modification (except test descriptions)
- [ ] No `json-p3` imports remain in source files
- [ ] No `@jsonpath/compat-json-p3` in dependencies
- [ ] Bundle size reduced (no external JSONPath dep)
- [ ] Type checking passes
- [ ] Coverage thresholds maintained
- [ ] All errors normalized to `DataMapPathError`
- [ ] `resolveStream()` API exposed and tested
- [ ] Query pre-compilation enabled by default for subscriptions

## Rollback Plan

If issues arise post-merge:

1. Revert to `json-p3` by restoring package.json dependency
2. The utility wrapper pattern makes rollback straightforward - only `src/utils/jsonpath.ts` needs to change
3. `DataMapPathError` can wrap json-p3 errors with same interface

---

## Appendix: Dependency Graph After Migration

```
@data-map/core
├── @jsonpath/jsonpath (facade)
│   ├── @jsonpath/evaluator
│   ├── @jsonpath/compiler
│   ├── @jsonpath/parser
│   ├── @jsonpath/functions
│   └── @jsonpath/core
├── @jsonpath/pointer
└── @jsonpath/patch
    ├── @jsonpath/pointer
    └── @jsonpath/core
```

All dependencies are workspace packages (`workspace:*`), eliminating external runtime dependencies for JSONPath functionality.
