## JSONPath Performance Optimization (v2)

This is a copy/paste-oriented execution guide for the v2 plan in
`plans/jsonpath-performance-optimization/plan.md`.

### Constraints (match v2 plan)

- **Breaking change allowed**: `@jsonpath/patch` defaults to `mutate: true`.
- **Performance-first**: remove per-iteration allocations and avoid `structuredClone`.
- **Warn-only perf checks**: perf regressions should not fail CI.
- Run commands from the repo root (do not `cd` into packages).

### Quick commands

- Install: `pnpm install`
- Core tests: `pnpm --filter @jsonpath/core test`
- Patch tests: `pnpm --filter @jsonpath/patch test`
- Merge-patch tests: `pnpm --filter @jsonpath/merge-patch test`
- Evaluator tests: `pnpm --filter @jsonpath/evaluator test`
- Benchmarks: `pnpm --filter @jsonpath/benchmarks bench`

---

## Step-by-step

### Step 1: Add `fastDeepClone` to `@jsonpath/core`

**Files**

- `packages/jsonpath/core/src/clone.ts` (new)
- `packages/jsonpath/core/src/index.ts` (edit)
- `packages/jsonpath/core/src/__tests__/clone.spec.ts` (new)

#### Step 1.1 — Create `packages/jsonpath/core/src/clone.ts`

Create the file with the exact implementation from the v2 plan:

```ts
// packages/jsonpath/core/src/clone.ts
export function fastDeepClone<T>(value: T): T {
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		const result = new Array(value.length);
		for (let i = 0; i < value.length; i++) {
			result[i] = fastDeepClone(value[i]);
		}
		return result as T;
	}

	const result: Record<string, unknown> = {};
	for (const key in value) {
		if (Object.prototype.hasOwnProperty.call(value, key)) {
			result[key] = fastDeepClone((value as Record<string, unknown>)[key]);
		}
	}
	return result as T;
}
```

#### Step 1.2 — Export from `packages/jsonpath/core/src/index.ts`

Add this export:

```ts
export * from './clone.js';
```

Place it alongside the other exports (ordering doesn’t matter functionally).

#### Step 1.3 — Add tests: `packages/jsonpath/core/src/__tests__/clone.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { fastDeepClone } from '../clone.js';

describe('fastDeepClone', () => {
	it('returns primitives as-is', () => {
		expect(fastDeepClone(1)).toBe(1);
		expect(fastDeepClone('x')).toBe('x');
		expect(fastDeepClone(true)).toBe(true);
		expect(fastDeepClone(null)).toBe(null);
	});

	it('clones arrays and nested objects', () => {
		const input = { a: [1, { b: 2 }], c: 3 };
		const out = fastDeepClone(input);

		expect(out).toEqual(input);
		expect(out).not.toBe(input);
		expect(out.a).not.toBe(input.a);
		expect(out.a[1]).not.toBe(input.a[1]);
	});

	it('preserves undefined values (plan requirement)', () => {
		const input: any = { a: undefined, b: { c: undefined }, d: [undefined] };
		const out: any = fastDeepClone(input);

		expect(Object.prototype.hasOwnProperty.call(out, 'a')).toBe(true);
		expect(out.a).toBe(undefined);
		expect(out.b).toEqual({ c: undefined });
		expect(out.d).toEqual([undefined]);
	});
});
```

#### Step 1 verification

- `pnpm --filter @jsonpath/core test`
- `pnpm --filter @jsonpath/core type-check`

#### Step 1 STOP & COMMIT

```txt
perf(core): add fastDeepClone utility

Add a JSON-only deep clone implementation that bypasses structuredClone.
Export fastDeepClone from @jsonpath/core and cover it with unit tests.

completes: step 1 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 2: Move patch helpers to module scope + default `mutate: true`

**Files**

- `packages/jsonpath/patch/src/patch.ts`
- `packages/jsonpath/patch/src/__tests__/options.spec.ts`

#### Step 2.1 — Flip default `mutate` to true

In `applyPatch(...)`, change:

```ts
mutate = false,
```

to:

```ts
mutate = true,
```

This matches the v2 plan and existing docs (“mutates by default”).

#### Step 2.2 — Move `setAt`/`removeAt`/`replaceAt` out of the patch loop

In `packages/jsonpath/patch/src/patch.ts`, these three helpers currently live inside the
`for (let index = 0; index < patch.length; index++) { ... }` loop (allocation hotspot).

Cut them out of the loop and paste them at module scope (above `applyPatch`). Keep their
implementations unchanged.

Paste this block at module scope:

```ts
function setAt(doc: any, tokens: string[], value: any, allowCreate: boolean) {
	if (tokens.length === 0) return value;
	let parent = doc;
	// Always require parent path to exist - never create intermediate paths
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object') {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		if (!(k in parent)) {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (last === '-') {
			parent.push(value);
			return doc;
		}
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i > parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 0, value);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot add to non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!allowCreate && !(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	parent[last] = value;
	return doc;
}

function removeAt(doc: any, tokens: string[]) {
	if (tokens.length === 0)
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 1);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot remove from non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	delete parent[last];
	return doc;
}

function replaceAt(doc: any, tokens: string[], value: any) {
	if (tokens.length === 0) return value;
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[i] = value;
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot replace in non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	parent[last] = value;
	return doc;
}
```

Then, inside the loop, delete the old inline definitions and keep the call sites
unchanged (they now resolve to the module-scope functions).

#### Step 2.3 — Update tests for new default behavior

In `packages/jsonpath/patch/src/__tests__/options.spec.ts`, update the default-mutation
test:

- Change “should not mutate by default” to “should mutate by default”.
- Update assertions so `data` is updated and `result === data`.

Example:

```ts
it('should mutate by default', () => {
	const data = { a: 1 };
	const result = applyPatch(data, [{ op: 'replace', path: '/a', value: 2 }]);
	expect(result).toEqual({ a: 2 });
	expect(data).toEqual({ a: 2 });
	expect(result).toBe(data);
});
```

#### Step 2 verification

- `pnpm --filter @jsonpath/patch test`

#### Step 2 STOP & COMMIT

```txt
perf(patch)!: default mutate true; de-allocate loop helpers

Move setAt/removeAt/replaceAt to module scope to avoid per-iteration closures.
Flip applyPatch default to mutate:true for performance-first behavior.

BREAKING CHANGE: applyPatch now mutates by default.
completes: step 2 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 3: Replace `structuredClone` with `fastDeepClone` in patch

**Files**

- `packages/jsonpath/patch/src/patch.ts`

#### Step 3.1 — Import `fastDeepClone`

Update the import at the top of `patch.ts`:

```ts
import {
	JSONPathError,
	JSONPatchError,
	deepEqual,
	fastDeepClone,
} from '@jsonpath/core';
```

#### Step 3.2 — Replace all `structuredClone(...)` in this file

As verified in the repo, there are multiple `structuredClone(` call sites (not only the
`workingRoot` initializer). Replace all of them with `fastDeepClone`.

At minimum, cover these known locations:

1. `workingRoot` initialization (two call sites)
2. `copy` operation: `structuredClone(value)`
3. `applyWithErrors`: `const workingResult = structuredClone(target)`
4. `applyWithInverse`: `let working = structuredClone(target)`

After edits, `grep structuredClone(` in this file should return **0** matches.

#### Step 3 verification

- `pnpm --filter @jsonpath/patch test`

#### Step 3 STOP & COMMIT

```txt
perf(patch): replace structuredClone with fastDeepClone

Use @jsonpath/core fastDeepClone to remove structuredClone overhead from patch hot paths.

completes: step 3 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 4: Add bounded pointer token caching in patch

**Files**

- `packages/jsonpath/patch/src/patch.ts`

#### Step 4.1 — Add bounded cache at module scope

Add this at module scope (near other helpers):

```ts
const TOKEN_CACHE_MAX = 1000;
const tokenCache = new Map<string, string[]>();

function parseTokensCached(
	ptr: string,
	parseTokensImpl: (ptr: string) => string[],
): string[] {
	const cached = tokenCache.get(ptr);
	if (cached) return cached;

	const tokens = parseTokensImpl(ptr);
	if (tokenCache.size >= TOKEN_CACHE_MAX) {
		const firstKey = tokenCache.keys().next().value as string | undefined;
		if (firstKey !== undefined) tokenCache.delete(firstKey);
	}
	tokenCache.set(ptr, tokens);
	return tokens;
}
```

#### Step 4.2 — Use cached parsing for `path` and `from`

In the loop where you currently do:

```ts
const pathTokens = parseTokens(operation.path);
const fromTokens =
	'from' in operation ? parseTokens((operation as any).from) : null;
```

Change to:

```ts
const pathTokens = parseTokensCached(operation.path, parseTokens);
const fromTokens =
	'from' in operation
		? parseTokensCached((operation as any).from, parseTokens)
		: null;
```

#### Step 4 verification

- `pnpm --filter @jsonpath/patch test`

#### Step 4 STOP & COMMIT

```txt
perf(patch): cache parsed pointer tokens

Add a bounded cache for JSON Pointer token parsing to reduce repeated work in batch patch operations.

completes: step 4 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 5: Optimize `createMergePatch` (remove clones + avoid Set)

**Files**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`

Replace the entire `createMergePatch` function with a single-pass version and remove per-key cloning.

```ts
import { deepEqual } from '@jsonpath/core';

export function createMergePatch(source: any, target: any): any {
	// RFC 7386: scalar/array differences produce replacement,
	// object differences produce object patch with deletions as null.
	if (!isPlainObject(source) || !isPlainObject(target)) {
		return deepEqual(source, target) ? {} : target;
	}

	const patch: Record<string, any> = {};

	for (const key in source) {
		if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
		if (!(key in target)) patch[key] = null;
	}

	for (const key in target) {
		if (!Object.prototype.hasOwnProperty.call(target, key)) continue;

		if (!(key in source)) {
			patch[key] = target[key];
			continue;
		}

		const s = source[key];
		const t = target[key];
		if (deepEqual(s, t)) continue;

		if (isPlainObject(s) && isPlainObject(t)) {
			const child = createMergePatch(s, t);
			if (isPlainObject(child) && Object.keys(child).length === 0) continue;
			patch[key] = child;
			continue;
		}

		patch[key] = t;
	}

	return patch;
}
```

Note: This intentionally returns references (per v2 plan Step 5). Step 6 applies cloning where needed.

#### Step 5 verification

- `pnpm --filter @jsonpath/merge-patch test`

#### Step 5 STOP & COMMIT

```txt
perf(merge-patch): speed up createMergePatch

Eliminate unnecessary structuredClone usage and avoid Set([...Object.keys]) allocations.
Return references in generated patch (safe because patch is a new object).

completes: step 5 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 6: Use `fastDeepClone` in merge-patch apply (remaining clones)

**Files**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`

If there are any remaining clone sites after Step 5 (or if apply semantics require cloning
for non-mutation paths), replace `structuredClone` with `fastDeepClone` for consistency.

#### Step 6 verification

- `pnpm --filter @jsonpath/merge-patch test`

#### Step 6 STOP & COMMIT

```txt
perf(merge-patch): use fastDeepClone where cloning is required

Replace remaining structuredClone usage with @jsonpath/core fastDeepClone.

completes: step 6 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 7: Pre-compute evaluator fast-path eligibility

**Files**

- `packages/jsonpath/evaluator/src/evaluator.ts`

The v2 plan calls out repeated per-call checks in `evaluateSimpleChain`.
Implement a constructor-computed flag.

Add these fields/helpers to the evaluator class:

```ts
private readonly canUseSimpleChainFastPath: boolean;
private readonly canUseWildcardChainFastPath: boolean;

private computeFastPathEligibility(): {
	simple: boolean;
	wildcard: boolean;
} {
	if (this.options.detectCircular) return { simple: false, wildcard: false };
	if (this.hasEvaluationHooks) return { simple: false, wildcard: false };
	const { allowPaths, blockPaths } = this.options.secure;
	if ((allowPaths?.length ?? 0) > 0 || (blockPaths?.length ?? 0) > 0) {
		return { simple: false, wildcard: false };
	}

	const simple = this.options.maxResults !== 0;
	const wildcard = !(this.options.maxResults > 0 && this.options.maxResults < 10_000);
	return { simple, wildcard };
}
```

Initialize them after `this.hasEvaluationHooks` is known:

```ts
const elig = this.computeFastPathEligibility();
this.canUseSimpleChainFastPath = elig.simple;
this.canUseWildcardChainFastPath = elig.wildcard;
```

Then early-return in both fast-path functions:

```ts
if (!this.canUseSimpleChainFastPath) return null;
```

and:

```ts
if (!this.canUseWildcardChainFastPath) return null;
```

Keep the remaining ast-dependent checks (like maxDepth vs chain length).

#### Step 7 verification

- `pnpm --filter @jsonpath/evaluator test`

#### Step 7 STOP & COMMIT

```txt
perf(evaluator): precompute fast-path eligibility

Avoid repeating option/hook/security checks on every evaluateSimpleChain/evaluateWildcardChain call.

completes: step 7 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 8: Lazy pointer computation in evaluator fast paths

**Files**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/query-result.ts` (note: repo uses `query-result.ts`, not `result.ts`)

The repo already supports lazy pointer generation via `pointerStringForNode(...)` in
`query-result.ts`. Step 8 is implemented by removing eager pointer computation in fast paths.

#### Step 8.1 — `evaluateSimpleChain`: remove eager pointer building

In `evaluateSimpleChain`, delete the block that builds `ptr` from `path` and stop setting
`_cachedPointer`.

Return nodes with `path` only:

```ts
const node = {
	value: current,
	path,
	root: this.root,
	parent,
	parentKey,
};
```

#### Step 8.2 — `evaluateWildcardChain`: remove eager pointer building

In `evaluateWildcardChain`, there is a conversion loop that currently builds cached pointers.
Remove the pointer construction and return nodes without `_cachedPointer`.

#### Step 8 verification

- `pnpm --filter @jsonpath/evaluator test`

#### Step 8 STOP & COMMIT

```txt
perf(evaluator): defer pointer string computation in fast paths

Remove eager pointer string computation in evaluateSimpleChain/evaluateWildcardChain.
Pointers remain available via QueryResult.pointerStrings() and lazy computation.

completes: step 8 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 9: Benchmarks + audit report + baselines

**Files**

- `packages/jsonpath/benchmarks/AUDIT_REPORT_v5.md`
- `packages/jsonpath/benchmarks/baseline.json` (exists today)

The plan calls for a `PERFORMANCE_BASELINES.json` file. The repo already has `baseline.json`.

Pick one strategy and apply consistently:

1. **Plan-aligned rename**: rename `baseline.json` → `PERFORMANCE_BASELINES.json` and update imports.
2. **Repo-aligned keep**: keep `baseline.json` and update values + add new baselines.

Update `AUDIT_REPORT_v5.md` with post-change benchmark results.

#### Step 9 verification

- `pnpm --filter @jsonpath/benchmarks bench`

#### Step 9 STOP & COMMIT

```txt
docs(benchmarks): update audit report and baselines

Refresh AUDIT_REPORT_v5.md and update baseline ops/sec values after performance work.

completes: step 9 of 10 for jsonpath-performance-optimization-v2
```

---

### Step 10: Warn-only performance regression tests

**Files**

- `packages/jsonpath/benchmarks/src/performance-regression.spec.ts` (already exists)
- Optional: `packages/jsonpath/benchmarks/vitest.config.ts` if you add new test paths

The repo already has a warn-only regression suite. Extend it to cover:

- Patch single replace
- Patch batch
- Merge-patch generate
- Evaluator simple path

Keep the current behavior: warn via `console.warn(...)`, never fail CI.

If you renamed baselines in Step 9, update this import:

```ts
import baseline from '../baseline.json' assert { type: 'json' };
```

#### Step 10 verification

- `pnpm --filter @jsonpath/benchmarks test`

#### Step 10 STOP & COMMIT

```txt
test(benchmarks): extend warn-only perf regression coverage

Add/extend warn-only regression checks for patch, merge-patch, and evaluator fast paths.

completes: step 10 of 10 for jsonpath-performance-optimization-v2
```

---

## Completion checklist

- All package tests pass for touched packages.
- `structuredClone` removed from patch hot paths.
- Default `applyPatch` mutates by default, and tests reflect the breaking change.
- Benchmarks updated and regression checks remain warn-only.

# JSONPath Performance Optimization (v2)

## Goal

Close the remaining performance gaps identified in `plans/jsonpath-performance-optimization/plan.md` by optimizing:

- `@jsonpath/patch` (RFC 6902)
- `@jsonpath/merge-patch` (RFC 7386)
- `@jsonpath/evaluator` simple-path hot path

This guide is written to be copy/paste-ready with explicit stop points for testing + committing.

## Prerequisites

- Make sure you are on the `feat/jsonpath-performance-optimization-v2` branch before starting.
- Run all commands from the repository root (do not `cd` into packages).

### Quick Commands

- Install deps: `pnpm install`
- Run all tests (repo): `pnpm test`
- Type-check (repo): `pnpm type-check`
- Benchmarks: `pnpm --filter @jsonpath/benchmarks bench`

---

## Step-by-Step Instructions

### Step 1: Add `fastDeepClone` to `@jsonpath/core`

- [ ] Add a JSON-only deep clone helper that skips `structuredClone` entirely for predictable performance.
- [ ] Export it from the `@jsonpath/core` public entrypoint.
- [ ] Add unit tests for primitives, arrays, nested objects, and "does not call structuredClone".

#### Step 1.1 — Create `packages/jsonpath/core/src/clone.ts`

- [x] Copy and paste code below into `packages/jsonpath/core/src/clone.ts`:

```ts
/**
 * @jsonpath/core
 *
 * Fast cloning utilities.
 *
 * `fastDeepClone` is optimized for JSON-shaped data (plain objects + arrays + primitives).
 * It intentionally does NOT use `structuredClone` for predictable performance.
 *
 * @packageDocumentation
 */

import { isArray, isObject, isPrimitive } from './utils.js';

export function fastDeepClone<T>(value: T): T {
	if (isPrimitive(value)) return value;

	if (isArray(value)) {
		const out = new Array(value.length);
		for (let i = 0; i < value.length; i++) {
			out[i] = fastDeepClone(value[i]);
		}
		return out as unknown as T;
	}

	if (isObject(value)) {
		const out: Record<string, unknown> = {};
		for (const key in value) {
			if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
			const v = (value as Record<string, unknown>)[key];
			if (v !== undefined) {
				out[key] = fastDeepClone(v);
			}
		}
		return out as unknown as T;
	}

	// Non-JSON objects (Date, Map, etc) are returned as-is (consistent with deepClone fallback).
	return value;
}
```

#### Step 1.2 — Export from `packages/jsonpath/core/src/index.ts`

- [x] Copy and paste code below into `packages/jsonpath/core/src/index.ts`:

```ts
/**
 * @jsonpath/core
 *
 * JSONPath core implementation
 *
 * @packageDocumentation
 */

export * from './types.js';
export * from './errors.js';
export * from './plugins.js';
export * from './registry.js';
export * from './clone.js';
export * from './utils.js';
export * from './nothing.js';
export * from './lexer.js';
```

#### Step 1.3 — Add tests: `packages/jsonpath/core/src/__tests__/clone.spec.ts`

- [x] Copy and paste code below into `packages/jsonpath/core/src/__tests__/clone.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { fastDeepClone } from '../clone.js';

describe('fastDeepClone', () => {
	it('returns primitives as-is', () => {
		expect(fastDeepClone(1)).toBe(1);
		expect(fastDeepClone('x')).toBe('x');
		expect(fastDeepClone(true)).toBe(true);
		expect(fastDeepClone(null)).toBe(null);
	});

	it('clones arrays and nested objects', () => {
		const input = { a: [1, { b: 2 }], c: 3 };
		const out = fastDeepClone(input);

		expect(out).toEqual(input);
		expect(out).not.toBe(input);
		expect(out.a).not.toBe(input.a);
		expect(out.a[1]).not.toBe(input.a[1]);
	});

	it('omits undefined object properties (JSON-shaped semantics)', () => {
		const input: any = { a: 1, b: undefined, c: { d: undefined, e: 2 } };
		const out: any = fastDeepClone(input);

		expect(out).toEqual({ a: 1, c: { e: 2 } });
	});

	it('does not call structuredClone', () => {
		const original = globalThis.structuredClone;
		const spy = vi.fn(() => {
			throw new Error('should not be called');
		});

		// @ts-expect-error test override
		globalThis.structuredClone = spy;

		try {
			const input = { a: [1, { b: 2 }] };
			const out = fastDeepClone(input);
			expect(out).toEqual(input);
			expect(spy).not.toHaveBeenCalled();
		} finally {
			// @ts-expect-error restore
			globalThis.structuredClone = original;
		}
	});
});
```

##### Step 1 Verification Checklist

- [x] `pnpm --filter @jsonpath/core test`
- [x] `pnpm --filter @jsonpath/core type-check`

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(core): add fastDeepClone utility

Add a predictable, JSON-only deep clone implementation that bypasses structuredClone.
Export fastDeepClone from @jsonpath/core and cover it with unit tests.

completes: step 1 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 2: Move patch helpers to module scope + default `mutate: true`

This step reduces per-operation allocations (closure creation inside the loop) and flips the default behavior for performance.

Important: this is a **breaking change**. Immutability remains available via `applyPatchImmutable` or by cloning before calling `applyPatch`.

#### Step 2.1 — Replace `packages/jsonpath/patch/src/patch.ts` (Step 2 state)

- [ ] Copy and paste code below into `packages/jsonpath/patch/src/patch.ts`:

```ts
import { JSONPathError, JSONPatchError, deepEqual } from '@jsonpath/core';
import { JSONPointer } from '@jsonpath/pointer';

export type PatchOperation =
	| { op: 'add'; path: string; value: any }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: any }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: any };

export interface ApplyOptions {
	readonly strictMode?: boolean;
	readonly mutate?: boolean;
	readonly validate?: boolean;
	readonly continueOnError?: boolean;
	readonly atomicApply?: boolean;
	readonly inverse?: boolean;
	readonly before?: (data: unknown, op: PatchOperation, index: number) => void;
	readonly after?: (
		data: unknown,
		op: PatchOperation,
		index: number,
		result: unknown,
	) => void;
}

/**
 * Validates that a patch operation has all required parameters per RFC 6902.
 * @throws {JSONPatchError} if a required parameter is missing
 */
function validateOperation(operation: Record<string, unknown>): void {
	const op = operation.op as string;

	// RFC 6902 §4.1, §4.3, §4.6: add, replace, test require 'value'
	if (
		(op === 'add' || op === 'replace' || op === 'test') &&
		!('value' in operation)
	) {
		throw new JSONPatchError(
			`Missing required 'value' parameter for '${op}' operation`,
		);
	}

	// RFC 6902 §4.4, §4.5: move, copy require 'from'
	if ((op === 'move' || op === 'copy') && !('from' in operation)) {
		throw new JSONPatchError(
			`Missing required 'from' parameter for '${op}' operation`,
		);
	}
}

/**
 * Validates a patch document without applying it.
 * @throws {JSONPatchError} if any operation is invalid
 */
export function validate(patch: PatchOperation[]): void {
	patch.forEach((op, index) => {
		try {
			validateOperation(op as any);
		} catch (err: any) {
			if (err instanceof JSONPatchError) {
				throw new JSONPatchError(err.message, {
					...err,
					operationIndex: index,
				});
			}
			throw new JSONPatchError(err.message, {
				operationIndex: index,
				operation: op.op,
			});
		}
	});
}

function unescapePointer(s: string): string {
	return s.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parseTokens(ptr: string): string[] {
	if (ptr === '') return [];
	if (!ptr.startsWith('/')) {
		throw new JSONPathError(`Invalid JSON Pointer: ${ptr}`, 'PATCH_ERROR');
	}
	// Keep empty segments (valid pointer into "" property)
	return ptr.split('/').slice(1).map(unescapePointer);
}

function getAt(doc: any, tokens: string[]): any {
	let curr = doc;
	for (const t of tokens) {
		if (curr === null || typeof curr !== 'object') return undefined;
		curr = curr[t];
	}
	return curr;
}

function setAt(
	doc: any,
	tokens: string[],
	value: any,
	_allowCreate: boolean,
): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	// Always require parent path to exist - never create intermediate paths
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object') {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		if (!(k in parent)) {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (last === '-') {
			parent.push(value);
			return doc;
		}
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i > parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 0, value);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot add to non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	parent[last] = value;
	return doc;
}

function removeAt(doc: any, tokens: string[]): any {
	if (tokens.length === 0)
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 1);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot remove from non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	delete parent[last];
	return doc;
}

function replaceAt(doc: any, tokens: string[], value: any): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[i] = value;
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot replace in non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	parent[last] = value;
	return doc;
}

/**
 * JSON Patch (RFC 6902) implementation.
 */
export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const {
		strictMode = true,
		mutate = true,
		validate: shouldValidate = false,
		continueOnError = false,
		atomicApply = true,
		before,
		after,
	} = options;

	if (shouldValidate) {
		validate(patch);
	}

	// When atomicApply is enabled, always work on a clone and only copy back on success.
	// Note: cloning strategy is optimized in Step 3.
	const workingRoot = atomicApply
		? structuredClone(target)
		: mutate
			? target
			: structuredClone(target);
	let working = workingRoot;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (before) before(working, operation, index);
			validateOperation(operation);

			const pathTokens = parseTokens(operation.path);
			const fromTokens =
				'from' in operation ? parseTokens((operation as any).from) : null;

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = setAt(working, pathTokens, (operation as any).value, true);
					break;
				case 'remove':
					if (strictMode) {
						opResult = removeAt(working, pathTokens);
						break;
					}
					try {
						opResult = removeAt(working, pathTokens);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
						break;
					}
					try {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						opResult = setAt(
							working,
							pathTokens,
							(operation as any).value,
							true,
						);
					}
					break;
				case 'move': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					if ((operation as any).from === operation.path) break;
					if (operation.path.startsWith(`${(operation as any).from}/`)) {
						throw new JSONPathError(
							'Cannot move a path to its own child',
							'PATCH_ERROR',
						);
					}
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					removeAt(working, fromTokens);
					opResult = setAt(working, pathTokens, value, true);
					break;
				}
				case 'copy': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					opResult = setAt(working, pathTokens, structuredClone(value), true);
					break;
				}
				case 'test': {
					const actual = getAt(working, pathTokens);
					if (!deepEqual(actual, (operation as any).value)) {
						throw new JSONPathError(
							`Test failed: expected ${JSON.stringify((operation as any).value)}, got ${JSON.stringify(actual)}`,
							'TEST_FAILED',
						);
					}
					break;
				}
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{
							operationIndex: index,
							operation: (operation as any).op,
						},
					);
			}

			working = opResult;
			if (after) after(working, operation, index, opResult);
		} catch (err) {
			if (continueOnError) continue;
			if (err instanceof JSONPathError) {
				throw new JSONPatchError(err.message, {
					path: (operation as any).path,
					operationIndex: index,
					operation: operation.op,
					cause: err,
				});
			}
			throw err;
		}
	}

	// If atomic+mutate, copy back into original target now.
	if (atomicApply && mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
				return target;
			}

			for (const key of Object.keys(target)) delete target[key];
			Object.assign(target, working);
			return target;
		}
		return working;
	}

	return working;
}

export function applyPatchImmutable(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	return applyPatch(target, patch, { ...options, mutate: false });
}

export function testPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): void {
	applyPatch(target, patch, { ...options, mutate: false });
}

/**
 * Applies a patch and returns the result along with any errors encountered.
 */
export function applyWithErrors<T>(
	target: T,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): {
	result: T;
	errors: { index: number; operation: PatchOperation; error: Error }[];
} {
	const errors: { index: number; operation: PatchOperation; error: Error }[] =
		[];

	// NOTE: We intentionally do NOT call applyPatch here.
	// applyWithErrors needs to collect and return errors; applying once and then re-applying
	// is wasted work and becomes unsafe once applyPatch defaults to mutate: true.

	const workingResult = structuredClone(target);
	let working = workingResult;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (options.before) options.before(working, operation, index);

			validateOperation(operation);

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = patchAdd(working, operation.path, operation.value);
					break;
				case 'remove':
					opResult = patchRemove(working, operation.path);
					break;
				case 'replace':
					opResult = patchReplace(working, operation.path, operation.value);
					break;
				case 'move':
					opResult = patchMove(working, operation.from, operation.path);
					break;
				case 'copy':
					opResult = patchCopy(working, operation.from, operation.path);
					break;
				case 'test':
					patchTest(working, operation.path, operation.value);
					break;
			}
			working = opResult;
			if (options.after) options.after(working, operation, index, opResult);
		} catch (err: any) {
			errors.push({ index, operation, error: err });
		}
	}

	if (options.mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				(target as any).length = 0;
				(target as any).push(...working);
			} else {
				for (const key of Object.keys(target as any))
					delete (target as any)[key];
				Object.assign(target as any, working);
			}
			return { result: target, errors };
		}
	}

	return { result: working, errors };
}

/**
 * Applies a patch and returns the result along with an inverse patch.
 */
export function applyWithInverse(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): { result: any; inverse: PatchOperation[] } {
	const inverse: PatchOperation[] = [];
	const { mutate = false } = options;
	let working = structuredClone(target);

	// To generate an inverse patch, we need to record the state before each operation
	patch.forEach((operation) => {
		const pointer = new JSONPointer(operation.path);
		const oldValue = pointer.evaluate(working);

		switch (operation.op) {
			case 'add':
				working = patchAdd(working, operation.path, operation.value);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'remove':
				working = patchRemove(working, operation.path);
				inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				break;
			case 'replace':
				working = patchReplace(working, operation.path, operation.value);
				inverse.unshift({
					op: 'replace',
					path: operation.path,
					value: oldValue,
				});
				break;
			case 'move': {
				const fromPointer = new JSONPointer(operation.from);
				const fromValue = fromPointer.evaluate(working);
				void fromValue;
				working = patchMove(working, operation.from, operation.path);
				// Inverse of move is move back, but we also need to restore the value at the destination if it existed
				if (oldValue !== undefined) {
					inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				}
				inverse.unshift({
					op: 'move',
					from: operation.path,
					path: operation.from,
				});
				break;
			}
			case 'copy':
				working = patchCopy(working, operation.from, operation.path);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'test':
				patchTest(working, operation.path, operation.value);
				// test operations don't need an inverse as they don't mutate
				break;
		}
	});

	if (mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
			} else {
				for (const key of Object.keys(target)) delete target[key];
				Object.assign(target, working);
			}
			return { result: target, inverse };
		}
	}

	return { result: working, inverse };
}

export function patchAdd(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(
			`Parent path not found: ${JSONPointer.format(parentPath)}`,
			'PATH_NOT_FOUND',
		);
	}

	if (Array.isArray(parent)) {
		if (lastKey === '-') {
			parent.push(value);
		} else {
			if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
				throw new JSONPathError(
					`Invalid array index: ${lastKey}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			const index = parseInt(lastKey, 10);
			if (index < 0 || index > parent.length) {
				throw new JSONPathError(
					`Index out of bounds: ${index}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			parent.splice(index, 0, value);
		}
	} else if (typeof parent === 'object' && parent !== null) {
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot add to non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchRemove(target: any, path: string): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(index, 1);
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		delete parent[lastKey];
	} else {
		throw new JSONPathError(
			`Cannot remove from non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchReplace(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[index] = value;
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot replace in non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchMove(target: any, from: string, path: string): any {
	if (from === path) return target;
	if (path.startsWith(`${from}/`)) {
		throw new JSONPathError(
			`Cannot move a path to its own child: ${from} -> ${path}`,
			'PATCH_ERROR',
		);
	}

	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	patchRemove(target, from);
	return patchAdd(target, path, value);
}

export function patchCopy(target: any, from: string, path: string): any {
	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	return patchAdd(target, path, JSON.parse(JSON.stringify(value)));
}

export function patchTest(target: any, path: string, value: any): void {
	const actual = new JSONPointer(path).evaluate(target);
	if (!deepEqual(actual, value)) {
		throw new JSONPathError(
			`Test failed: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
			'TEST_FAILED',
		);
	}
}
```

#### Step 2.2 — Update `packages/jsonpath/patch/src/__tests__/options.spec.ts`

- [ ] Copy and paste code below into `packages/jsonpath/patch/src/__tests__/options.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
	applyPatch,
	applyWithErrors,
	applyWithInverse,
	validate,
} from '../patch.js';
import { builder } from '../builder.js';

describe('Patch Options & Advanced Features', () => {
	describe('mutate option', () => {
		it('should mutate by default (breaking change)', () => {
			const data = { a: 1 };
			const result = applyPatch(data, [
				{ op: 'replace', path: '/a', value: 2 },
			]);

			expect(result).toEqual({ a: 2 });
			expect(data).toEqual({ a: 2 });
			expect(result).toBe(data);
		});

		it('should not mutate when mutate: false', () => {
			const data = { a: 1 };
			const result = applyPatch(
				data,
				[{ op: 'replace', path: '/a', value: 2 }],
				{ mutate: false },
			);
			expect(result).toEqual({ a: 2 });
			expect(data).toEqual({ a: 1 });
			expect(result).not.toBe(data);
		});
	});

	describe('hooks', () => {
		it('should call before and after hooks', () => {
			const data = { a: 1 };
			const before = vi.fn();
			const after = vi.fn();

			applyPatch(data, [{ op: 'replace', path: '/a', value: 2 }], {
				before,
				after,
			});

			expect(before).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ op: 'replace' }),
				0,
			);
			expect(after).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ op: 'replace' }),
				0,
				expect.any(Object),
			);
		});
	});

	describe('applyWithErrors', () => {
		it('should collect errors and continue if requested', () => {
			const data = { a: 1 };
			const patch = [
				{ op: 'replace', path: '/a', value: 2 },
				{ op: 'remove', path: '/non-existent' },
				{ op: 'add', path: '/b', value: 3 },
			];

			const { result, errors } = applyWithErrors(data, patch);

			expect(result).toEqual({ a: 2, b: 3 });
			expect(errors).toHaveLength(1);
			expect(errors[0].index).toBe(1);
			expect(errors[0].error.message).toContain('Property not found');
		});
	});

	describe('validate', () => {
		it('should validate operations without applying', () => {
			expect(() =>
				validate([{ op: 'add', path: '/a', value: 1 }]),
			).not.toThrow();
			expect(() => validate([{ op: 'add', path: '/a' } as any])).toThrow(
				"Missing required 'value' parameter",
			);
		});
	});

	describe('PatchBuilder extensions', () => {
		it('should support when()', () => {
			const b = builder()
				.when(true)
				.add('/a', 1)
				.when(false)
				.add('/b', 2)
				.build();
			expect(b).toEqual([{ op: 'add', path: '/a', value: 1 }]);
		});

		it('should support ifExists()', () => {
			const data = { a: 1 };
			const b = builder(data)
				.ifExists('/a')
				.add('/a-exists', true)
				.ifExists('/b')
				.add('/b-exists', true)
				.build();

			expect(b).toEqual([{ op: 'add', path: '/a-exists', value: true }]);
		});

		it('should support ifNotExists()', () => {
			const data = { a: 1 };
			const b = builder(data)
				.ifNotExists('/a')
				.add('/a-not-exists', true)
				.ifNotExists('/b')
				.add('/b-not-exists', true)
				.build();

			expect(b).toEqual([{ op: 'add', path: '/b-not-exists', value: true }]);
		});

		it('should throw error when using ifNotExists() without target', () => {
			expect(() => {
				builder().ifNotExists('/a').add('/a', 1);
			}).toThrow('ifNotExists() requires a target document');
		});

		it('should work with nested paths in ifNotExists()', () => {
			const data = { a: { b: 1 } };
			const b = builder(data)
				.ifNotExists('/a/c')
				.add('/a/c', 2)
				.ifNotExists('/a/b')
				.add('/a/b-modified', 3)
				.build();

			expect(b).toEqual([{ op: 'add', path: '/a/c', value: 2 }]);
		});

		it('should chain multiple ifNotExists() conditions', () => {
			const data = { x: 1 };
			const b = builder(data)
				.ifNotExists('/y')
				.add('/y', 2)
				.ifNotExists('/z')
				.add('/z', 3)
				.ifNotExists('/x')
				.add('/x-copy', 4)
				.build();

			expect(b).toEqual([
				{ op: 'add', path: '/y', value: 2 },
				{ op: 'add', path: '/z', value: 3 },
			]);
		});

		it('should support replaceAll()', () => {
			const data = { items: [{ val: 1 }, { val: 2 }] };
			const b = builder(data).replaceAll('$.items[*].val', 0).build();

			expect(b).toEqual([
				{ op: 'replace', path: '/items/0/val', value: 0 },
				{ op: 'replace', path: '/items/1/val', value: 0 },
			]);
		});

		it('should support removeAll()', () => {
			const data = { items: [1, 2, 3] };
			const b = builder(data).removeAll('$.items[*]').build();

			// Should be in reverse order to avoid index shifts
			expect(b).toEqual([
				{ op: 'remove', path: '/items/2' },
				{ op: 'remove', path: '/items/1' },
				{ op: 'remove', path: '/items/0' },
			]);
		});
	});
});
```

#### Step 2.3 — Update `packages/jsonpath/patch/src/__tests__/patch.spec.ts`

- [ ] Copy and paste code below into `packages/jsonpath/patch/src/__tests__/patch.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	applyPatch,
	applyWithInverse,
	applyPatchImmutable,
	testPatch,
} from '../patch.js';

describe('JSON Patch', () => {
	it('should apply add operation', () => {
		const data = { foo: 'bar' };
		expect(
			applyPatch(data, [{ op: 'add', path: '/baz', value: 'qux' }]),
		).toEqual({
			foo: 'bar',
			baz: 'qux',
		});
		expect(applyPatch([1, 2], [{ op: 'add', path: '/1', value: 3 }])).toEqual([
			1, 3, 2,
		]);
		expect(applyPatch([1, 2], [{ op: 'add', path: '/-', value: 3 }])).toEqual([
			1, 2, 3,
		]);
	});

	it('should apply remove operation', () => {
		const data = { foo: 'bar', baz: 'qux' };
		expect(applyPatch(data, [{ op: 'remove', path: '/baz' }])).toEqual({
			foo: 'bar',
		});
		expect(applyPatch([1, 2, 3], [{ op: 'remove', path: '/1' }])).toEqual([
			1, 3,
		]);
	});

	it('should apply replace operation', () => {
		const data = { foo: 'bar' };
		expect(
			applyPatch(data, [{ op: 'replace', path: '/foo', value: 'baz' }]),
		).toEqual({
			foo: 'baz',
		});
	});

	it('should apply move operation', () => {
		const data = { foo: { bar: 'baz' }, qux: 'quux' };
		expect(
			applyPatch(data, [{ op: 'move', from: '/foo/bar', path: '/qux' }]),
		).toEqual({
			foo: {},
			qux: 'baz',
		});
	});

	it('should apply copy operation', () => {
		const data = { foo: { bar: 'baz' }, qux: 'quux' };
		expect(
			applyPatch(data, [{ op: 'copy', from: '/foo/bar', path: '/qux' }]),
		).toEqual({
			foo: { bar: 'baz' },
			qux: 'baz',
		});
	});

	it('should apply test operation', () => {
		const data = { foo: 'bar' };
		expect(() =>
			applyPatch(data, [{ op: 'test', path: '/foo', value: 'bar' }]),
		).not.toThrow();
		expect(() =>
			applyPatch(data, [{ op: 'test', path: '/foo', value: 'baz' }]),
		).toThrow();
	});

	it('should throw JSONPatchError with metadata on failure', () => {
		const data = { foo: 'bar' };
		try {
			applyPatch(data, [
				{ op: 'test', path: '/foo', value: 'bar' },
				{ op: 'remove', path: '/nonexistent' },
			]);
		} catch (err: any) {
			expect(err.name).toBe('JSONPatchError');
			expect(err.operationIndex).toBe(1);
			expect(err.operation).toBe('remove');
			expect(err.path).toBe('/nonexistent');
		}
	});

	describe('applyWithInverse', () => {
		it('should generate inverse for add', () => {
			const data = { a: 1 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'add', path: '/b', value: 2 },
			]);
			expect(result).toEqual({ a: 1, b: 2 });
			expect(inverse).toEqual([{ op: 'remove', path: '/b' }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for remove', () => {
			const data = { a: 1, b: 2 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'remove', path: '/b' },
			]);
			expect(result).toEqual({ a: 1 });
			expect(inverse).toEqual([{ op: 'add', path: '/b', value: 2 }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for replace', () => {
			const data = { a: 1 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'replace', path: '/a', value: 2 },
			]);
			expect(result).toEqual({ a: 2 });
			expect(inverse).toEqual([{ op: 'replace', path: '/a', value: 1 }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for move', () => {
			const data = { a: 1, b: 2 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'move', from: '/a', path: '/c' },
			]);
			expect(result).toEqual({ b: 2, c: 1 });
			expect(inverse).toEqual([{ op: 'move', from: '/c', path: '/a' }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for move (overwriting)', () => {
			const data = { a: 1, b: 2 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'move', from: '/a', path: '/b' },
			]);
			expect(result).toEqual({ b: 1 });
			expect(inverse).toEqual([
				{ op: 'move', from: '/b', path: '/a' },
				{ op: 'add', path: '/b', value: 2 },
			]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for copy', () => {
			const data = { a: 1 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'copy', from: '/a', path: '/b' },
			]);
			expect(result).toEqual({ a: 1, b: 1 });
			expect(inverse).toEqual([{ op: 'remove', path: '/b' }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for multiple operations in reverse order', () => {
			const data = { a: 1 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'add', path: '/b', value: 2 },
				{ op: 'replace', path: '/a', value: 3 },
			]);
			expect(result).toEqual({ a: 3, b: 2 });
			expect(inverse).toEqual([
				{ op: 'replace', path: '/a', value: 1 },
				{ op: 'remove', path: '/b' },
			]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});
	});

	it('applyPatch mutates by default (breaking change)', () => {
		const data: any = { foo: 'bar' };
		const result = applyPatch(data, [
			{ op: 'add', path: '/baz', value: 'qux' },
		]);
		expect(result).toBe(data);
		expect(data).toEqual({ foo: 'bar', baz: 'qux' });
	});

	it('applyPatch does not mutate original when mutate: false', () => {
		const data: any = { foo: 'bar' };
		const result = applyPatch(
			data,
			[{ op: 'add', path: '/baz', value: 'qux' }],
			{ mutate: false },
		);
		expect(result).not.toBe(data);
		expect(result).toEqual({ foo: 'bar', baz: 'qux' });
		expect(data).toEqual({ foo: 'bar' });
	});

	it('applyPatchImmutable does not mutate original', () => {
		const data: any = { foo: 'bar' };
		const result = applyPatchImmutable(data, [
			{ op: 'add', path: '/baz', value: 'qux' },
		]);
		expect(result).toEqual({ foo: 'bar', baz: 'qux' });
		expect(data).toEqual({ foo: 'bar' });
	});

	it('testPatch validates without mutating', () => {
		const data: any = { a: 1 };
		expect(() =>
			testPatch(data, [{ op: 'test', path: '/a', value: 1 }]),
		).not.toThrow();
		expect(data).toEqual({ a: 1 });
	});

	it('applyPatch is atomic (all-or-nothing)', () => {
		const data: any = { a: 1 };
		expect(() =>
			applyPatch(
				data,
				[
					{ op: 'add', path: '/b', value: 2 },
					{ op: 'remove', path: '/does-not-exist' },
				],
				{ mutate: true },
			),
		).toThrow();
		expect(data).toEqual({ a: 1 });
	});
});
```

##### Step 2 Verification Checklist

- [ ] `pnpm --filter @jsonpath/patch test`
- [ ] `pnpm --filter @jsonpath/patch type-check`

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(patch): module-scope helpers + default mutate

- Move applyPatch helper functions to module scope to avoid per-iteration closures
- Change applyPatch default to mutate for performance (breaking)
- Update tests to reflect new default behavior

completes: step 2 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 3: Replace `structuredClone` with `fastDeepClone` in `@jsonpath/patch`

This step removes the `structuredClone` overhead from patch application. It relies on Step 1.

#### Step 3.1 — Replace `packages/jsonpath/patch/src/patch.ts` (Step 3 state)

- [ ] Copy and paste code below into `packages/jsonpath/patch/src/patch.ts`:

```ts
import {
	JSONPathError,
	JSONPatchError,
	deepEqual,
	fastDeepClone,
} from '@jsonpath/core';
import { JSONPointer } from '@jsonpath/pointer';

export type PatchOperation =
	| { op: 'add'; path: string; value: any }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: any }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: any };

export interface ApplyOptions {
	readonly strictMode?: boolean;
	readonly mutate?: boolean;
	readonly validate?: boolean;
	readonly continueOnError?: boolean;
	readonly atomicApply?: boolean;
	readonly inverse?: boolean;
	readonly before?: (data: unknown, op: PatchOperation, index: number) => void;
	readonly after?: (
		data: unknown,
		op: PatchOperation,
		index: number,
		result: unknown,
	) => void;
}

function validateOperation(operation: Record<string, unknown>): void {
	const op = operation.op as string;

	if (
		(op === 'add' || op === 'replace' || op === 'test') &&
		!('value' in operation)
	) {
		throw new JSONPatchError(
			`Missing required 'value' parameter for '${op}' operation`,
		);
	}

	if ((op === 'move' || op === 'copy') && !('from' in operation)) {
		throw new JSONPatchError(
			`Missing required 'from' parameter for '${op}' operation`,
		);
	}
}

export function validate(patch: PatchOperation[]): void {
	patch.forEach((op, index) => {
		try {
			validateOperation(op as any);
		} catch (err: any) {
			if (err instanceof JSONPatchError) {
				throw new JSONPatchError(err.message, {
					...err,
					operationIndex: index,
				});
			}
			throw new JSONPatchError(err.message, {
				operationIndex: index,
				operation: op.op,
			});
		}
	});
}

function unescapePointer(s: string): string {
	return s.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parseTokens(ptr: string): string[] {
	if (ptr === '') return [];
	if (!ptr.startsWith('/')) {
		throw new JSONPathError(`Invalid JSON Pointer: ${ptr}`, 'PATCH_ERROR');
	}
	return ptr.split('/').slice(1).map(unescapePointer);
}

function getAt(doc: any, tokens: string[]): any {
	let curr = doc;
	for (const t of tokens) {
		if (curr === null || typeof curr !== 'object') return undefined;
		curr = curr[t];
	}
	return curr;
}

function setAt(
	doc: any,
	tokens: string[],
	value: any,
	_allowCreate: boolean,
): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object') {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		if (!(k in parent)) {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (last === '-') {
			parent.push(value);
			return doc;
		}
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i > parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 0, value);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot add to non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	parent[last] = value;
	return doc;
}

function removeAt(doc: any, tokens: string[]): any {
	if (tokens.length === 0)
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 1);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot remove from non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	delete parent[last];
	return doc;
}

function replaceAt(doc: any, tokens: string[], value: any): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[i] = value;
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot replace in non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	parent[last] = value;
	return doc;
}

export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const {
		strictMode = true,
		mutate = true,
		validate: shouldValidate = false,
		continueOnError = false,
		atomicApply = true,
		before,
		after,
	} = options;

	if (shouldValidate) {
		validate(patch);
	}

	const workingRoot = atomicApply
		? fastDeepClone(target)
		: mutate
			? target
			: fastDeepClone(target);
	let working = workingRoot;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (before) before(working, operation, index);
			validateOperation(operation);

			const pathTokens = parseTokens(operation.path);
			const fromTokens =
				'from' in operation ? parseTokens((operation as any).from) : null;

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = setAt(working, pathTokens, (operation as any).value, true);
					break;
				case 'remove':
					if (strictMode) {
						opResult = removeAt(working, pathTokens);
						break;
					}
					try {
						opResult = removeAt(working, pathTokens);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
						break;
					}
					try {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						opResult = setAt(
							working,
							pathTokens,
							(operation as any).value,
							true,
						);
					}
					break;
				case 'move': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					if ((operation as any).from === operation.path) break;
					if (operation.path.startsWith(`${(operation as any).from}/`)) {
						throw new JSONPathError(
							'Cannot move a path to its own child',
							'PATCH_ERROR',
						);
					}
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					removeAt(working, fromTokens);
					opResult = setAt(working, pathTokens, value, true);
					break;
				}
				case 'copy': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					opResult = setAt(working, pathTokens, fastDeepClone(value), true);
					break;
				}
				case 'test': {
					const actual = getAt(working, pathTokens);
					if (!deepEqual(actual, (operation as any).value)) {
						throw new JSONPathError(
							`Test failed: expected ${JSON.stringify((operation as any).value)}, got ${JSON.stringify(actual)}`,
							'TEST_FAILED',
						);
					}
					break;
				}
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{
							operationIndex: index,
							operation: (operation as any).op,
						},
					);
			}

			working = opResult;
			if (after) after(working, operation, index, opResult);
		} catch (err) {
			if (continueOnError) continue;
			if (err instanceof JSONPathError) {
				throw new JSONPatchError(err.message, {
					path: (operation as any).path,
					operationIndex: index,
					operation: operation.op,
					cause: err,
				});
			}
			throw err;
		}
	}

	if (atomicApply && mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
				return target;
			}

			for (const key of Object.keys(target)) delete target[key];
			Object.assign(target, working);
			return target;
		}
		return working;
	}

	return working;
}

export function applyPatchImmutable(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	return applyPatch(target, patch, { ...options, mutate: false });
}

export function testPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): void {
	applyPatch(target, patch, { ...options, mutate: false });
}

export function applyWithErrors<T>(
	target: T,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): {
	result: T;
	errors: { index: number; operation: PatchOperation; error: Error }[];
} {
	const errors: { index: number; operation: PatchOperation; error: Error }[] =
		[];
	const workingResult = fastDeepClone(target);
	let working = workingResult;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (options.before) options.before(working, operation, index);
			validateOperation(operation);

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = patchAdd(working, operation.path, operation.value);
					break;
				case 'remove':
					opResult = patchRemove(working, operation.path);
					break;
				case 'replace':
					opResult = patchReplace(working, operation.path, operation.value);
					break;
				case 'move':
					opResult = patchMove(working, operation.from, operation.path);
					break;
				case 'copy':
					opResult = patchCopy(working, operation.from, operation.path);
					break;
				case 'test':
					patchTest(working, operation.path, operation.value);
					break;
			}
			working = opResult;
			if (options.after) options.after(working, operation, index, opResult);
		} catch (err: any) {
			errors.push({ index, operation, error: err });
		}
	}

	if (options.mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				(target as any).length = 0;
				(target as any).push(...working);
			} else {
				for (const key of Object.keys(target as any))
					delete (target as any)[key];
				Object.assign(target as any, working);
			}
			return { result: target, errors };
		}
	}

	return { result: working, errors };
}

export function applyWithInverse(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): { result: any; inverse: PatchOperation[] } {
	const inverse: PatchOperation[] = [];
	const { mutate = false } = options;
	let working = fastDeepClone(target);

	patch.forEach((operation) => {
		const pointer = new JSONPointer(operation.path);
		const oldValue = pointer.evaluate(working);

		switch (operation.op) {
			case 'add':
				working = patchAdd(working, operation.path, operation.value);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'remove':
				working = patchRemove(working, operation.path);
				inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				break;
			case 'replace':
				working = patchReplace(working, operation.path, operation.value);
				inverse.unshift({
					op: 'replace',
					path: operation.path,
					value: oldValue,
				});
				break;
			case 'move': {
				working = patchMove(working, operation.from, operation.path);
				if (oldValue !== undefined) {
					inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				}
				inverse.unshift({
					op: 'move',
					from: operation.path,
					path: operation.from,
				});
				break;
			}
			case 'copy':
				working = patchCopy(working, operation.from, operation.path);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'test':
				patchTest(working, operation.path, operation.value);
				break;
		}
	});

	if (mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
			} else {
				for (const key of Object.keys(target)) delete target[key];
				Object.assign(target, working);
			}
			return { result: target, inverse };
		}
	}

	return { result: working, inverse };
}

export function patchAdd(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(
			`Parent path not found: ${JSONPointer.format(parentPath)}`,
			'PATH_NOT_FOUND',
		);
	}

	if (Array.isArray(parent)) {
		if (lastKey === '-') {
			parent.push(value);
		} else {
			if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
				throw new JSONPathError(
					`Invalid array index: ${lastKey}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			const index = parseInt(lastKey, 10);
			if (index < 0 || index > parent.length) {
				throw new JSONPathError(
					`Index out of bounds: ${index}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			parent.splice(index, 0, value);
		}
	} else if (typeof parent === 'object' && parent !== null) {
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot add to non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchRemove(target: any, path: string): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(index, 1);
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		delete parent[lastKey];
	} else {
		throw new JSONPathError(
			`Cannot remove from non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchReplace(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[index] = value;
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot replace in non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchMove(target: any, from: string, path: string): any {
	if (from === path) return target;
	if (path.startsWith(`${from}/`)) {
		throw new JSONPathError(
			`Cannot move a path to its own child: ${from} -> ${path}`,
			'PATCH_ERROR',
		);
	}

	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	patchRemove(target, from);
	return patchAdd(target, path, value);
}

export function patchCopy(target: any, from: string, path: string): any {
	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	return patchAdd(target, path, JSON.parse(JSON.stringify(value)));
}

export function patchTest(target: any, path: string, value: any): void {
	const actual = new JSONPointer(path).evaluate(target);
	if (!deepEqual(actual, value)) {
		throw new JSONPathError(
			`Test failed: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
			'TEST_FAILED',
		);
	}
}
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @jsonpath/patch test`
- [ ] `pnpm --filter @jsonpath/patch type-check`
- [ ] Optional: `pnpm --filter @jsonpath/benchmarks bench:patch`

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(patch): replace structuredClone with fastDeepClone

Use @jsonpath/core fastDeepClone for patch cloning to reduce structuredClone overhead.

completes: step 3 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 4: Add pointer token caching in `@jsonpath/patch`

This step speeds up batch patches that reuse the same paths by caching parsed JSON Pointer tokens.

#### Step 4.1 — Replace `packages/jsonpath/patch/src/patch.ts` (Step 4 state)

- [ ] Copy and paste code below into `packages/jsonpath/patch/src/patch.ts`:

```ts
import {
	JSONPathError,
	JSONPatchError,
	deepEqual,
	fastDeepClone,
} from '@jsonpath/core';
import { JSONPointer } from '@jsonpath/pointer';

export type PatchOperation =
	| { op: 'add'; path: string; value: any }
	| { op: 'remove'; path: string }
	| { op: 'replace'; path: string; value: any }
	| { op: 'move'; from: string; path: string }
	| { op: 'copy'; from: string; path: string }
	| { op: 'test'; path: string; value: any };

export interface ApplyOptions {
	readonly strictMode?: boolean;
	readonly mutate?: boolean;
	readonly validate?: boolean;
	readonly continueOnError?: boolean;
	readonly atomicApply?: boolean;
	readonly inverse?: boolean;
	readonly before?: (data: unknown, op: PatchOperation, index: number) => void;
	readonly after?: (
		data: unknown,
		op: PatchOperation,
		index: number,
		result: unknown,
	) => void;
}

function validateOperation(operation: Record<string, unknown>): void {
	const op = operation.op as string;

	if (
		(op === 'add' || op === 'replace' || op === 'test') &&
		!('value' in operation)
	) {
		throw new JSONPatchError(
			`Missing required 'value' parameter for '${op}' operation`,
		);
	}

	if ((op === 'move' || op === 'copy') && !('from' in operation)) {
		throw new JSONPatchError(
			`Missing required 'from' parameter for '${op}' operation`,
		);
	}
}

export function validate(patch: PatchOperation[]): void {
	patch.forEach((op, index) => {
		try {
			validateOperation(op as any);
		} catch (err: any) {
			if (err instanceof JSONPatchError) {
				throw new JSONPatchError(err.message, {
					...err,
					operationIndex: index,
				});
			}
			throw new JSONPatchError(err.message, {
				operationIndex: index,
				operation: op.op,
			});
		}
	});
}

function unescapePointer(s: string): string {
	return s.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parseTokensImpl(ptr: string): string[] {
	if (ptr === '') return [];
	if (!ptr.startsWith('/')) {
		throw new JSONPathError(`Invalid JSON Pointer: ${ptr}`, 'PATCH_ERROR');
	}
	return ptr.split('/').slice(1).map(unescapePointer);
}

const TOKEN_CACHE_MAX = 1000;
const tokenCache = new Map<string, string[]>();

function parseTokens(ptr: string): string[] {
	const cached = tokenCache.get(ptr);
	if (cached) return cached;

	const tokens = parseTokensImpl(ptr);

	if (tokenCache.size >= TOKEN_CACHE_MAX) {
		const firstKey = tokenCache.keys().next().value as string | undefined;
		if (firstKey !== undefined) tokenCache.delete(firstKey);
	}

	tokenCache.set(ptr, tokens);
	return tokens;
}

function getAt(doc: any, tokens: string[]): any {
	let curr = doc;
	for (const t of tokens) {
		if (curr === null || typeof curr !== 'object') return undefined;
		curr = curr[t];
	}
	return curr;
}

function setAt(
	doc: any,
	tokens: string[],
	value: any,
	_allowCreate: boolean,
): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object') {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		if (!(k in parent)) {
			throw new JSONPathError(
				`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (last === '-') {
			parent.push(value);
			return doc;
		}
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i > parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 0, value);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot add to non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	parent[last] = value;
	return doc;
}

function removeAt(doc: any, tokens: string[]): any {
	if (tokens.length === 0)
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(i, 1);
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot remove from non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	delete parent[last];
	return doc;
}

function replaceAt(doc: any, tokens: string[], value: any): any {
	if (tokens.length === 0) return value;
	let parent = doc;
	for (let i = 0; i < tokens.length - 1; i++) {
		const k = tokens[i]!;
		if (parent === null || typeof parent !== 'object' || !(k in parent)) {
			throw new JSONPathError(
				`Path not found: /${tokens.join('/')}`,
				'PATH_NOT_FOUND',
			);
		}
		parent = parent[k];
	}
	const last = tokens[tokens.length - 1]!;
	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(last)) {
			throw new JSONPathError(
				`Invalid array index: ${last}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const i = Number(last);
		if (i < 0 || i >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${i}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[i] = value;
		return doc;
	}
	if (parent === null || typeof parent !== 'object') {
		throw new JSONPathError(
			'Cannot replace in non-object/non-array parent',
			'PATCH_ERROR',
		);
	}
	if (!(last in parent)) {
		throw new JSONPathError(`Property not found: ${last}`, 'PATH_NOT_FOUND');
	}
	parent[last] = value;
	return doc;
}

export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const {
		strictMode = true,
		mutate = true,
		validate: shouldValidate = false,
		continueOnError = false,
		atomicApply = true,
		before,
		after,
	} = options;

	if (shouldValidate) {
		validate(patch);
	}

	const workingRoot = atomicApply
		? fastDeepClone(target)
		: mutate
			? target
			: fastDeepClone(target);
	let working = workingRoot;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (before) before(working, operation, index);
			validateOperation(operation);

			const pathTokens = parseTokens(operation.path);
			const fromTokens =
				'from' in operation ? parseTokens((operation as any).from) : null;

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = setAt(working, pathTokens, (operation as any).value, true);
					break;
				case 'remove':
					if (strictMode) {
						opResult = removeAt(working, pathTokens);
						break;
					}
					try {
						opResult = removeAt(working, pathTokens);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
						break;
					}
					try {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						opResult = setAt(
							working,
							pathTokens,
							(operation as any).value,
							true,
						);
					}
					break;
				case 'move': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					if ((operation as any).from === operation.path) break;
					if (operation.path.startsWith(`${(operation as any).from}/`)) {
						throw new JSONPathError(
							'Cannot move a path to its own child',
							'PATCH_ERROR',
						);
					}
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					removeAt(working, fromTokens);
					opResult = setAt(working, pathTokens, value, true);
					break;
				}
				case 'copy': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					opResult = setAt(working, pathTokens, fastDeepClone(value), true);
					break;
				}
				case 'test': {
					const actual = getAt(working, pathTokens);
					if (!deepEqual(actual, (operation as any).value)) {
						throw new JSONPathError(
							`Test failed: expected ${JSON.stringify((operation as any).value)}, got ${JSON.stringify(actual)}`,
							'TEST_FAILED',
						);
					}
					break;
				}
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{
							operationIndex: index,
							operation: (operation as any).op,
						},
					);
			}

			working = opResult;
			if (after) after(working, operation, index, opResult);
		} catch (err) {
			if (continueOnError) continue;
			if (err instanceof JSONPathError) {
				throw new JSONPatchError(err.message, {
					path: (operation as any).path,
					operationIndex: index,
					operation: operation.op,
					cause: err,
				});
			}
			throw err;
		}
	}

	if (atomicApply && mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
				return target;
			}

			for (const key of Object.keys(target)) delete target[key];
			Object.assign(target, working);
			return target;
		}
		return working;
	}

	return working;
}

export function applyPatchImmutable(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	return applyPatch(target, patch, { ...options, mutate: false });
}

export function testPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): void {
	applyPatch(target, patch, { ...options, mutate: false });
}

export function applyWithErrors<T>(
	target: T,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): {
	result: T;
	errors: { index: number; operation: PatchOperation; error: Error }[];
} {
	const errors: { index: number; operation: PatchOperation; error: Error }[] =
		[];
	const workingResult = fastDeepClone(target);
	let working = workingResult;

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (options.before) options.before(working, operation, index);
			validateOperation(operation);

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = patchAdd(working, operation.path, operation.value);
					break;
				case 'remove':
					opResult = patchRemove(working, operation.path);
					break;
				case 'replace':
					opResult = patchReplace(working, operation.path, operation.value);
					break;
				case 'move':
					opResult = patchMove(working, operation.from, operation.path);
					break;
				case 'copy':
					opResult = patchCopy(working, operation.from, operation.path);
					break;
				case 'test':
					patchTest(working, operation.path, operation.value);
					break;
			}
			working = opResult;
			if (options.after) options.after(working, operation, index, opResult);
		} catch (err: any) {
			errors.push({ index, operation, error: err });
		}
	}

	if (options.mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				(target as any).length = 0;
				(target as any).push(...working);
			} else {
				for (const key of Object.keys(target as any))
					delete (target as any)[key];
				Object.assign(target as any, working);
			}
			return { result: target, errors };
		}
	}

	return { result: working, errors };
}

export function applyWithInverse(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): { result: any; inverse: PatchOperation[] } {
	const inverse: PatchOperation[] = [];
	const { mutate = false } = options;
	let working = fastDeepClone(target);

	patch.forEach((operation) => {
		const pointer = new JSONPointer(operation.path);
		const oldValue = pointer.evaluate(working);

		switch (operation.op) {
			case 'add':
				working = patchAdd(working, operation.path, operation.value);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'remove':
				working = patchRemove(working, operation.path);
				inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				break;
			case 'replace':
				working = patchReplace(working, operation.path, operation.value);
				inverse.unshift({
					op: 'replace',
					path: operation.path,
					value: oldValue,
				});
				break;
			case 'move': {
				working = patchMove(working, operation.from, operation.path);
				if (oldValue !== undefined) {
					inverse.unshift({ op: 'add', path: operation.path, value: oldValue });
				}
				inverse.unshift({
					op: 'move',
					from: operation.path,
					path: operation.from,
				});
				break;
			}
			case 'copy':
				working = patchCopy(working, operation.from, operation.path);
				if (oldValue === undefined) {
					inverse.unshift({ op: 'remove', path: operation.path });
				} else {
					inverse.unshift({
						op: 'replace',
						path: operation.path,
						value: oldValue,
					});
				}
				break;
			case 'test':
				patchTest(working, operation.path, operation.value);
				break;
		}
	});

	if (mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
			} else {
				for (const key of Object.keys(target)) delete target[key];
				Object.assign(target, working);
			}
			return { result: target, inverse };
		}
	}

	return { result: working, inverse };
}

export function patchAdd(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(
			`Parent path not found: ${JSONPointer.format(parentPath)}`,
			'PATH_NOT_FOUND',
		);
	}

	if (Array.isArray(parent)) {
		if (lastKey === '-') {
			parent.push(value);
		} else {
			if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
				throw new JSONPathError(
					`Invalid array index: ${lastKey}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			const index = parseInt(lastKey, 10);
			if (index < 0 || index > parent.length) {
				throw new JSONPathError(
					`Index out of bounds: ${index}`,
					'INVALID_ARRAY_INDEX',
				);
			}
			parent.splice(index, 0, value);
		}
	} else if (typeof parent === 'object' && parent !== null) {
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot add to non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchRemove(target: any, path: string): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent.splice(index, 1);
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		delete parent[lastKey];
	} else {
		throw new JSONPathError(
			`Cannot remove from non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchReplace(target: any, path: string, value: any): any {
	const pointer = new JSONPointer(path);
	const tokens = pointer.getTokens();

	if (tokens.length === 0) {
		return value;
	}

	const parentPath = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentPath).evaluate(target);

	if (parent === undefined) {
		throw new JSONPathError(`Path not found: ${path}`, 'PATH_NOT_FOUND');
	}

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			throw new JSONPathError(
				`Invalid array index: ${lastKey}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		const index = parseInt(lastKey, 10);
		if (index < 0 || index >= parent.length) {
			throw new JSONPathError(
				`Index out of bounds: ${index}`,
				'INVALID_ARRAY_INDEX',
			);
		}
		parent[index] = value;
	} else if (typeof parent === 'object' && parent !== null) {
		if (!(lastKey in parent)) {
			throw new JSONPathError(
				`Property not found: ${lastKey}`,
				'PATH_NOT_FOUND',
			);
		}
		parent[lastKey] = value;
	} else {
		throw new JSONPathError(
			`Cannot replace in non-object/non-array parent`,
			'PATCH_ERROR',
		);
	}

	return target;
}

export function patchMove(target: any, from: string, path: string): any {
	if (from === path) return target;
	if (path.startsWith(`${from}/`)) {
		throw new JSONPathError(
			`Cannot move a path to its own child: ${from} -> ${path}`,
			'PATCH_ERROR',
		);
	}

	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	patchRemove(target, from);
	return patchAdd(target, path, value);
}

export function patchCopy(target: any, from: string, path: string): any {
	const value = new JSONPointer(from).evaluate(target);
	if (value === undefined) {
		throw new JSONPathError(`From path not found: ${from}`, 'PATH_NOT_FOUND');
	}
	return patchAdd(target, path, JSON.parse(JSON.stringify(value)));
}

export function patchTest(target: any, path: string, value: any): void {
	const actual = new JSONPointer(path).evaluate(target);
	if (!deepEqual(actual, value)) {
		throw new JSONPathError(
			`Test failed: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
			'TEST_FAILED',
		);
	}
}
```

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @jsonpath/patch test`
- [ ] `pnpm --filter @jsonpath/benchmarks bench:patch`

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(patch): cache parsed pointer tokens

Add a bounded cache for parsed JSON Pointer tokens to speed up batch operations with repeated paths.

completes: step 4 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 5: Eliminate unnecessary clones + double key iteration in merge-patch generate

#### Step 5.1 — Replace `packages/jsonpath/merge-patch/src/merge-patch.ts` (Step 5 state)

- [ ] Copy and paste code below into `packages/jsonpath/merge-patch/src/merge-patch.ts`:

```ts
import { deepEqual } from '@jsonpath/core';

/**
 * JSON Merge Patch (RFC 7386) implementation.
 */
export interface MergePatchOptions {
	/** When patch value is null: delete property (default: 'delete') */
	readonly nullBehavior?: 'delete' | 'set-null';

	/** Strategy for arrays (default: 'replace') */
	readonly arrayMergeStrategy?: 'replace';

	/** Whether to mutate the target object (default: true) */
	readonly mutate?: boolean;
}

function isPlainObject(value: unknown): value is Record<string, any> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function applyMergePatch(
	target: any,
	patch: any,
	options: MergePatchOptions = {},
): any {
	const {
		nullBehavior = 'delete',
		arrayMergeStrategy = 'replace',
		mutate = true,
	} = options;

	if (!isPlainObject(patch)) {
		return patch;
	}

	if (!isPlainObject(target)) {
		if (mutate) return patch;
		target = {};
	}

	const out: Record<string, any> = mutate ? target : { ...target };

	for (const key in patch) {
		if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
		const value = patch[key];

		if (value === null) {
			if (nullBehavior === 'delete') delete out[key];
			else out[key] = null;
			continue;
		}

		if (Array.isArray(value)) {
			if (arrayMergeStrategy === 'replace') out[key] = value;
			continue;
		}

		if (isPlainObject(value) && isPlainObject(out[key])) {
			out[key] = applyMergePatch(out[key], value, { ...options, mutate: true });
			continue;
		}

		out[key] = value;
	}

	return out;
}

export function createMergePatch(source: any, target: any): any {
	// RFC 7386 algorithm: scalar/array differences produce replacement,
	// object differences produce object patch with deletions as null.
	if (!isPlainObject(source) || !isPlainObject(target)) {
		return deepEqual(source, target) ? {} : target;
	}

	const patch: Record<string, any> = {};

	for (const key in source) {
		if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

		if (!Object.prototype.hasOwnProperty.call(target, key)) {
			patch[key] = null;
			continue;
		}

		const s = source[key];
		const t = target[key];
		if (deepEqual(s, t)) continue;

		if (isPlainObject(s) && isPlainObject(t)) {
			const child = createMergePatch(s, t);
			if (isPlainObject(child) && Object.keys(child).length === 0) continue;
			patch[key] = child;
			continue;
		}

		patch[key] = t;
	}

	for (const key in target) {
		if (!Object.prototype.hasOwnProperty.call(target, key)) continue;
		if (Object.prototype.hasOwnProperty.call(source, key)) continue;
		patch[key] = target[key];
	}

	return patch;
}
```

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @jsonpath/merge-patch test`
- [ ] `pnpm --filter @jsonpath/merge-patch type-check`
- [ ] Optional: `pnpm --filter @jsonpath/benchmarks bench --testNamePattern='Merge Patch'`

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(merge-patch): speed up createMergePatch

Eliminate per-key structuredClone usage and avoid Set([...Object.keys]) allocation by using two for-in passes.

completes: step 5 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 6: Use `fastDeepClone` in merge-patch for any remaining cloning needs

This aligns merge-patch with the shared cloning strategy without reintroducing `structuredClone`.

#### Step 6.1 — Replace `packages/jsonpath/merge-patch/src/merge-patch.ts` (Step 6 state)

- [ ] Copy and paste code below into `packages/jsonpath/merge-patch/src/merge-patch.ts`:

```ts
import { deepEqual, fastDeepClone } from '@jsonpath/core';

export interface MergePatchOptions {
	readonly nullBehavior?: 'delete' | 'set-null';
	readonly arrayMergeStrategy?: 'replace';
	readonly mutate?: boolean;
}

function isPlainObject(value: unknown): value is Record<string, any> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function applyMergePatch(
	target: any,
	patch: any,
	options: MergePatchOptions = {},
): any {
	const {
		nullBehavior = 'delete',
		arrayMergeStrategy = 'replace',
		mutate = true,
	} = options;

	if (!isPlainObject(patch)) {
		return patch;
	}

	if (!isPlainObject(target)) {
		if (mutate) return patch;
		target = {};
	}

	const out: Record<string, any> = mutate ? target : { ...target };

	for (const key in patch) {
		if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
		const value = patch[key];

		if (value === null) {
			if (nullBehavior === 'delete') delete out[key];
			else out[key] = null;
			continue;
		}

		if (Array.isArray(value)) {
			if (arrayMergeStrategy === 'replace') out[key] = value;
			continue;
		}

		if (isPlainObject(value) && isPlainObject(out[key])) {
			out[key] = applyMergePatch(out[key], value, { ...options, mutate: true });
			continue;
		}

		out[key] = value;
	}

	return out;
}

export function createMergePatch(source: any, target: any): any {
	if (!isPlainObject(source) || !isPlainObject(target)) {
		return deepEqual(source, target) ? {} : fastDeepClone(target);
	}

	const patch: Record<string, any> = {};

	for (const key in source) {
		if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

		if (!Object.prototype.hasOwnProperty.call(target, key)) {
			patch[key] = null;
			continue;
		}

		const s = source[key];
		const t = target[key];
		if (deepEqual(s, t)) continue;

		if (isPlainObject(s) && isPlainObject(t)) {
			const child = createMergePatch(s, t);
			if (isPlainObject(child) && Object.keys(child).length === 0) continue;
			patch[key] = child;
			continue;
		}

		patch[key] = t;
	}

	for (const key in target) {
		if (!Object.prototype.hasOwnProperty.call(target, key)) continue;
		if (Object.prototype.hasOwnProperty.call(source, key)) continue;
		patch[key] = target[key];
	}

	return patch;
}
```

##### Step 6 Verification Checklist

- [ ] `pnpm --filter @jsonpath/merge-patch test`

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(merge-patch): use fastDeepClone for top-level replacements

Replace remaining structuredClone-like cloning needs with fastDeepClone in createMergePatch.

completes: step 6 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 7: Pre-compute fast path eligibility in evaluator

This reduces repeated option checks in `evaluateSimpleChain`.

#### Step 7.1 — Update constructor + add eligibility helper

- [ ] In `packages/jsonpath/evaluator/src/evaluator.ts`, add a new field:
  - [ ] `private readonly canUseSimpleChainFastPath: boolean;`

- [ ] Replace the `constructor(...)` with the code below:

```ts
constructor(root: any, options?: EvaluatorOptions) {
    this.root = root;
    this.options = withDefaults(options);

    const { allowPaths, blockPaths } = this.options.secure;
    const hasSecurity =
        (allowPaths?.length ?? 0) > 0 || (blockPaths?.length ?? 0) > 0;
    this.securityEnabled = hasSecurity;

    if (!hasSecurity) {
        this.isNodeAllowed = () => true;
    } else {
        this.isNodeAllowed = (node) => this.checkPathRestrictions(node);
    }

    // Check if any plugin has evaluation hooks (not just function registration)
    this.hasEvaluationHooks = this.options.plugins.some(
        (p) => p.beforeEvaluate || p.afterEvaluate || p.onError,
    );

    this.canUseSimpleChainFastPath = this.computeSimpleChainFastPathEligibility();
}
```

- [ ] Add this method near `evaluateSimpleChain(...)`:

```ts
private computeSimpleChainFastPathEligibility(): boolean {
    if (this.options.detectCircular) return false;
    if (this.hasEvaluationHooks) return false;
    if (this.options.maxResults === 0) return false;

    const { allowPaths, blockPaths } = this.options.secure;
    if ((allowPaths?.length ?? 0) > 0 || (blockPaths?.length ?? 0) > 0) return false;

    return true;
}
```

#### Step 7.2 — Update `evaluateSimpleChain(...)` gate

- [ ] In `packages/jsonpath/evaluator/src/evaluator.ts`, update the early fast-path gate to:

```ts
if (!this.canUseSimpleChainFastPath) return null;
```

##### Step 7 Verification Checklist

- [ ] `pnpm --filter @jsonpath/evaluator test`

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(evaluator): precompute simple-chain fast path eligibility

Reduce per-call option checking by caching eligibility for the simple-chain fast path at construction time.

completes: step 7 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 8: Lazy pointer string computation for evaluator simple path

This avoids computing JSON Pointer strings when they are never read by the caller.

#### Step 8.1 — Remove eager pointer computation in `evaluateSimpleChain`

- [ ] In `packages/jsonpath/evaluator/src/evaluator.ts`, remove the eager `ptr` computation block in `evaluateSimpleChain` and do not set `_cachedPointer` on the returned node.

- [ ] Replace the node construction in `evaluateSimpleChain` with:

```ts
const node = {
	value: current,
	path,
	root: this.root,
	parent,
	parentKey,
};
```

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @jsonpath/evaluator test`

#### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(evaluator): lazy pointer string computation in simple-chain fast path

Avoid eagerly computing JSON Pointer strings for simple-chain results when the pointer is never accessed.

completes: step 8 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 9: Run benchmarks and update audit report + baselines

Note: this repo already uses `packages/jsonpath/benchmarks/baseline.json` and `packages/jsonpath/benchmarks/src/performance-regression.spec.ts` for warn-only regression checks.

#### Step 9.1 — Run benchmarks

- [ ] Run the full suite: `pnpm --filter @jsonpath/benchmarks bench`
- [ ] Run patch-focused subset: `pnpm --filter @jsonpath/benchmarks bench:patch`

#### Step 9.2 — Update the audit report

- [ ] Update `packages/jsonpath/benchmarks/AUDIT_REPORT_v5.md` with post-optimization numbers.
- [ ] Ensure the “Breaking change: mutate: true is now default” is reflected for patch.

#### Step 9.3 — Update baselines (warn-only)

- [ ] Update `packages/jsonpath/benchmarks/baseline.json` with new baseline numbers.

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @jsonpath/benchmarks exec vitest run src/performance-regression.spec.ts`

#### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
docs(benchmarks): update audit report + baselines

Refresh AUDIT_REPORT_v5.md and baseline.json after performance optimizations.

completes: step 9 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 10: Add performance regression checks for patch + merge-patch

This extends the existing warn-only regression tests with coverage for the specific gaps addressed by this plan.

#### Step 10.1 — Update `packages/jsonpath/benchmarks/baseline.json`

- [ ] Copy and paste code below into `packages/jsonpath/benchmarks/baseline.json` (fill in real values after Step 9):

```json
{
	"simpleQuery": {
		"opsPerSec": 300000
	},
	"filterQuery": {
		"opsPerSec": 80000
	},
	"recursiveQuery": {
		"opsPerSec": 50000
	},
	"patchSingleReplace": {
		"opsPerSec": 180000
	},
	"patchBatch": {
		"opsPerSec": 130000
	},
	"mergePatchGenerate": {
		"opsPerSec": 2400000
	}
}
```

#### Step 10.2 — Update regression test

- [ ] Copy and paste code below into `packages/jsonpath/benchmarks/src/performance-regression.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import baseline from '../baseline.json' assert { type: 'json' };
import { queryValues } from '@jsonpath/jsonpath';
import { STORE_DATA } from './fixtures/index.js';
import { applyPatch } from '@jsonpath/patch';
import { createMergePatch } from '@jsonpath/merge-patch';

function opsPerSec(iterations: number, elapsedMs: number): number {
	return iterations / (elapsedMs / 1000);
}

describe('Performance Regression (warn-only)', () => {
	it('simple query should not regress >10%', () => {
		const iterations = 10_000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			queryValues(STORE_DATA, '$.store.book[0].title');
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = (baseline as any).simpleQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Performance regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		expect(true).toBe(true);
	});

	it('filter query should not regress >10%', () => {
		const iterations = 5_000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			queryValues(STORE_DATA, '$.store.book[?@.price < 20]');
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = (baseline as any).filterQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Performance regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		expect(true).toBe(true);
	});

	it('recursive query should not regress >10%', () => {
		const iterations = 2_000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			queryValues(STORE_DATA, '$..price');
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = (baseline as any).recursiveQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Performance regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		expect(true).toBe(true);
	});

	it('patch single replace should not regress >10%', () => {
		const iterations = 5_000;
		const doc = { a: 0 };
		const patch = [{ op: 'replace', path: '/a', value: 1 }] as const;

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			// Clone explicitly to avoid mutation accumulation across iterations
			applyPatch({ ...doc }, patch as any);
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = (baseline as any).patchSingleReplace.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Patch regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		expect(true).toBe(true);
	});

	it('merge-patch generate should not regress >10%', () => {
		const iterations = 10_000;
		const a = { x: 1, y: { z: 2 }, arr: [1, 2, 3] };
		const b = { x: 1, y: { z: 9 }, arr: [1, 2, 3], k: 4 };

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			createMergePatch(a, b);
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = (baseline as any).mergePatchGenerate.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Merge-patch regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		expect(true).toBe(true);
	});
});
```

##### Step 10 Verification Checklist

- [ ] `pnpm --filter @jsonpath/benchmarks exec vitest run src/performance-regression.spec.ts`

#### Step 10 STOP & COMMIT

Multiline conventional commit message:

```txt
test(benchmarks): add warn-only regressions for patch + merge-patch

Extend performance-regression.spec.ts and baseline.json to cover the remaining performance gaps.

completes: step 10 of 10 for jsonpath-performance-optimization-v2
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Post-Implementation Checklist

- [ ] All package test suites pass:
  - `pnpm --filter @jsonpath/core test`
  - `pnpm --filter @jsonpath/patch test`
  - `pnpm --filter @jsonpath/merge-patch test`
  - `pnpm --filter @jsonpath/evaluator test`
- [ ] Benchmarks updated + audit report refreshed:
  - `pnpm --filter @jsonpath/benchmarks bench`
