# JSONPath Integration Readiness — PR Implementation Guide (Steps 1–13)

Source plan: `plans/jsonpath-integration-readiness/plan.md`

This document is designed to be **executed sequentially** and to be **copy‑paste ready**. Every step includes:

- A checklist of concrete actions
- Full code blocks (new files) and exact replacement blocks (edits)
- Tests (Vitest) written first (Red → Green → Refactor)
- Verification commands
- A **STOP & COMMIT** section with a conventional commit message

Repo conventions (confirmed in this monorepo):

- TypeScript packages are ESM and use relative imports with `.js` in source.
- Exports are managed via `src/index.ts`.
- Tests use **Vitest** and typically live in `src/__tests__/*.spec.ts`.
- Packages build via Vite and use `@lellimecnar/*-config` presets.

Run commands from repo root.

---

## Prerequisites (run once)

- [x] `pnpm install`
- [x] Ensure the RFC 9535 compliance suite exists (postinstall clones it):
  - Confirm `node_modules/jsonpath-compliance-test-suite/cts.json` is present.

---

## Step 1 — RFC 6901 JSON Pointer completion (DataMap compatibility + clearer errors)

### Goal

Add JSONPointer instance methods required by `@data-map/core` and split pointer errors into syntax vs resolution.

### Checklist

- [x] Add `PointerSyntaxError` and `PointerResolutionError`
- [x] Add instance methods:
  - [x] `resolve(root)` (alias of `evaluate(root)`)
  - [x] `exists(root)` (distinguish “missing” vs “present undefined”)
  - [x] `parent()`
  - [x] `concat(other)`
- [x] Add factories and helpers:
  - [x] `static fromTokens(tokens)`
  - [x] `normalize(pointer)`
  - [x] `isValid(pointer)` (standalone)
- [x] Add tests for the above

### Files

- `packages/jsonpath/pointer/src/errors.ts` (new)
- `packages/jsonpath/pointer/src/normalize.ts` (new)
- `packages/jsonpath/pointer/src/pointer.ts` (edit)
- `packages/jsonpath/pointer/src/index.ts` (edit)
- `packages/jsonpath/pointer/src/__tests__/normalize.spec.ts` (new)
- `packages/jsonpath/pointer/src/__tests__/pointer.spec.ts` (edit)

### TDD (Red)

Create the new tests first.

#### New file: `packages/jsonpath/pointer/src/__tests__/normalize.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import { normalize } from '../normalize.js';
import { JSONPointer } from '../pointer.js';

describe('normalize', () => {
	it('canonicalizes token encoding (~ and /)', () => {
		const tokens = ['a~b/c'];
		expect(normalize(tokens)).toBe('/a~0b~1c');
		expect(normalize('/a~0b~1c')).toBe('/a~0b~1c');
		expect(normalize(new JSONPointer('/a~0b~1c'))).toBe('/a~0b~1c');
	});

	it('preserves empty pointer', () => {
		expect(normalize('')).toBe('');
	});
});
```

#### Add tests to existing: `packages/jsonpath/pointer/src/__tests__/pointer.spec.ts`

Append these cases in an appropriate `describe(...)` block:

```ts
it('JSONPointer.resolve() is an alias of evaluate()', () => {
	const data = { a: { b: 1 } };
	const ptr = new JSONPointer('/a/b');
	expect(ptr.resolve(data)).toBe(1);
	expect(ptr.evaluate(data)).toBe(1);
});

it('JSONPointer.exists() distinguishes missing vs present undefined', () => {
	const data: any = { a: { b: undefined } };
	const ptr = new JSONPointer('/a/b');
	expect(ptr.resolve(data)).toBeUndefined();
	expect(ptr.exists(data)).toBe(true);
	expect(new JSONPointer('/a/missing').exists(data)).toBe(false);
});

it('JSONPointer.parent() returns parent pointer', () => {
	const ptr = new JSONPointer('/a/b/c');
	expect(ptr.parent().toString()).toBe('/a/b');
	expect(new JSONPointer('').parent().toString()).toBe('');
});

it('JSONPointer.concat() joins token paths', () => {
	const a = new JSONPointer('/a/b');
	const c = new JSONPointer('/c');
	expect(a.concat(c).toString()).toBe('/a/b/c');
});
```

### Implementation (Green)

#### New file: `packages/jsonpath/pointer/src/errors.ts`

```ts
import { JSONPointerError } from '@jsonpath/core';

export class PointerSyntaxError extends JSONPointerError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, options);
		this.name = 'PointerSyntaxError';
	}
}

export class PointerResolutionError extends JSONPointerError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, options);
		this.name = 'PointerResolutionError';
	}
}
```

#### New file: `packages/jsonpath/pointer/src/normalize.ts`

```ts
import { JSONPointer } from './pointer.js';

export function normalize(
	pointer: string | JSONPointer | readonly string[],
): string {
	if (pointer instanceof JSONPointer) {
		return JSONPointer.format(pointer.getTokens());
	}

	if (Array.isArray(pointer)) {
		return JSONPointer.format([...pointer]);
	}

	return JSONPointer.format(JSONPointer.parse(pointer));
}

export function isValid(pointer: string): boolean {
	try {
		JSONPointer.parse(pointer);
		return true;
	} catch {
		return false;
	}
}
```

#### Replace file content: `packages/jsonpath/pointer/src/pointer.ts`

```ts
import { PointerSyntaxError } from './errors.js';

/**
 * JSON Pointer (RFC 6901) implementation.
 */
export class JSONPointer {
	private tokens: string[];

	constructor(pointer: string | string[]) {
		if (Array.isArray(pointer)) {
			this.tokens = pointer;
		} else {
			this.tokens = JSONPointer.parse(pointer);
		}
	}

	static fromTokens(tokens: string[]): JSONPointer {
		return new JSONPointer(tokens);
	}

	/**
	 * Parses a JSON Pointer string into tokens.
	 */
	static parse(pointer: string): string[] {
		if (pointer === '') {
			return [];
		}

		if (!pointer.startsWith('/')) {
			throw new PointerSyntaxError(
				'Invalid JSON Pointer: must start with "/" or be empty',
				{ path: pointer },
			);
		}

		const parts = pointer.split('/').slice(1);
		return parts.map((part) => {
			// RFC 6901 §3: '~' MUST be followed by '0' or '1'.
			if (/~[^01]/.test(part) || part.endsWith('~')) {
				throw new PointerSyntaxError(
					`Invalid tilde sequence in JSON Pointer: ${part}`,
					{ path: pointer },
				);
			}
			return part.replace(/~1/g, '/').replace(/~0/g, '~');
		});
	}

	/**
	 * Formats tokens into a JSON Pointer string.
	 */
	static format(tokens: string[]): string {
		if (tokens.length === 0) {
			return '';
		}

		return `/${tokens
			.map((token) => token.toString().replace(/~/g, '~0').replace(/\//g, '~1'))
			.join('/')}`;
	}

	/**
	 * Evaluates the pointer against a JSON object.
	 */
	evaluate(root: any): any {
		let current = root;

		for (const token of this.tokens) {
			if (current === null || typeof current !== 'object') {
				return undefined;
			}

			if (Array.isArray(current)) {
				// RFC 6901 §4: array indices must not have leading zeros
				if (!/^(0|[1-9][0-9]*)$/.test(token)) {
					return undefined;
				}
				const index = Number.parseInt(token, 10);
				if (index < 0 || index >= current.length) {
					return undefined;
				}
				current = current[index];
			} else {
				if (!(token in current)) {
					return undefined;
				}
				current = current[token];
			}
		}

		return current;
	}

	/** DataMap compatibility alias for evaluate(). */
	resolve<T = any>(root: unknown): T | undefined {
		return this.evaluate(root) as T | undefined;
	}

	/**
	 * DataMap compatibility: distinguish missing vs present undefined.
	 */
	exists(root: unknown): boolean {
		let current: any = root;

		for (const token of this.tokens) {
			if (current === null || typeof current !== 'object') {
				return false;
			}

			if (Array.isArray(current)) {
				if (!/^(0|[1-9][0-9]*)$/.test(token)) {
					return false;
				}
				const index = Number.parseInt(token, 10);
				if (index < 0 || index >= current.length) {
					return false;
				}
				current = current[index];
			} else {
				if (!(token in current)) {
					return false;
				}
				current = current[token];
			}
		}

		return true;
	}

	parent(): JSONPointer {
		if (this.tokens.length === 0) return new JSONPointer([]);
		return new JSONPointer(this.tokens.slice(0, -1));
	}

	concat(other: JSONPointer): JSONPointer {
		return new JSONPointer([...this.tokens, ...other.getTokens()]);
	}

	getTokens(): string[] {
		return [...this.tokens];
	}

	toString(): string {
		return JSONPointer.format(this.tokens);
	}
}

/** Helper to evaluate a JSON Pointer string against a root object. */
export function evaluatePointer(root: any, pointer: string): any {
	return new JSONPointer(pointer).evaluate(root);
}
```

#### Update exports: `packages/jsonpath/pointer/src/index.ts`

Add these exports near the top (alongside existing exports):

```ts
export * from './errors.js';
export * from './normalize.js';
```

### Verification

- Run: `pnpm --filter @jsonpath/pointer test`

### STOP & COMMIT

Commit message:

```text
feat(pointer): add resolve/exists + normalize helpers
```

---

## Step 2 — Relative JSON Pointer (draft-bhutton-relative-json-pointer)

### Goal

Add optional relative pointer support without affecting core RFC 6901 behavior.

### Checklist

- [x] Implement parsing + validation
- [x] Implement `RelativeJSONPointer#toAbsolute(current)` and `#resolve(root, current)`
- [x] Export from pointer index
- [x] Add tests for draft examples + bounds

### Files

- `packages/jsonpath/pointer/src/relative-pointer.ts` (new)
- `packages/jsonpath/pointer/src/index.ts` (edit)
- `packages/jsonpath/pointer/src/__tests__/relative-pointer.spec.ts` (new)

### New file: `packages/jsonpath/pointer/src/relative-pointer.ts`

```ts
import { JSONPointer } from './pointer.js';
import { PointerResolutionError, PointerSyntaxError } from './errors.js';

export interface ParsedRelativePointer {
	readonly ancestors: number;
	readonly suffix: JSONPointer;
	readonly indexReference: boolean;
}

export function parseRelativePointer(pointer: string): ParsedRelativePointer {
	const match = /^(?<n>0|[1-9][0-9]*)(?<rest>.*)$/.exec(pointer);
	if (!match?.groups) {
		throw new PointerSyntaxError(`Invalid relative JSON Pointer: ${pointer}`, {
			path: pointer,
		});
	}

	const ancestors = Number.parseInt(match.groups.n!, 10);
	let rest = match.groups.rest ?? '';

	let indexReference = false;
	if (rest.startsWith('#')) {
		indexReference = true;
		rest = rest.slice(1);
	}

	if (rest !== '' && !rest.startsWith('/')) {
		throw new PointerSyntaxError(
			`Invalid relative JSON Pointer suffix (must be empty or start with '/'): ${pointer}`,
			{ path: pointer },
		);
	}

	return {
		ancestors,
		suffix: new JSONPointer(rest),
		indexReference,
	};
}

export function isRelativePointer(pointer: string): boolean {
	try {
		parseRelativePointer(pointer);
		return true;
	} catch {
		return false;
	}
}

export class RelativeJSONPointer {
	private readonly parsed: ParsedRelativePointer;

	constructor(pointer: string) {
		this.parsed = parseRelativePointer(pointer);
	}

	toAbsolute(current: JSONPointer): JSONPointer {
		const currentTokens = current.getTokens();
		if (this.parsed.ancestors > currentTokens.length) {
			throw new PointerResolutionError(
				`Relative pointer traversal out of bounds: ${this.parsed.ancestors}`,
			);
		}

		const baseTokens = currentTokens.slice(
			0,
			currentTokens.length - this.parsed.ancestors,
		);

		return new JSONPointer([...baseTokens, ...this.parsed.suffix.getTokens()]);
	}

	resolve(root: unknown, current: JSONPointer): unknown {
		const abs = this.toAbsolute(current);
		if (this.parsed.indexReference) {
			const tokens = abs.getTokens();
			return tokens.length === 0 ? undefined : tokens[tokens.length - 1];
		}
		return abs.resolve(root);
	}

	toString(): string {
		const suffixStr = JSONPointer.format(this.parsed.suffix.getTokens());
		return `${this.parsed.ancestors}${this.parsed.indexReference ? '#' : ''}${suffixStr}`;
	}
}

export function resolveRelative(
	root: unknown,
	current: JSONPointer,
	relative: string,
): unknown {
	return new RelativeJSONPointer(relative).resolve(root, current);
}
```

### Export: `packages/jsonpath/pointer/src/index.ts`

Add:

```ts
export * from './relative-pointer.js';
```

### New test: `packages/jsonpath/pointer/src/__tests__/relative-pointer.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import { JSONPointer } from '../pointer.js';
import {
	RelativeJSONPointer,
	parseRelativePointer,
	resolveRelative,
	isRelativePointer,
} from '../relative-pointer.js';

describe('Relative JSON Pointer', () => {
	it('parses prefix and suffix', () => {
		expect(parseRelativePointer('0').ancestors).toBe(0);
		expect(parseRelativePointer('2/foo').ancestors).toBe(2);
		expect(parseRelativePointer('2/foo').suffix.toString()).toBe('/foo');
	});

	it('resolves relative values', () => {
		const root = { a: { b: { c: 1 } } };
		const current = new JSONPointer('/a/b');
		expect(resolveRelative(root, current, '0/c')).toBe(1);
		expect(resolveRelative(root, current, '1/b/c')).toBe(1);
	});

	it('resolves key reference via #', () => {
		const root = { a: { b: { c: 1 } } };
		const current = new JSONPointer('/a/b');
		const rel = new RelativeJSONPointer('0/c#');
		expect(rel.resolve(root, current)).toBe('c');
	});

	it('validates with isRelativePointer()', () => {
		expect(isRelativePointer('0')).toBe(true);
		expect(isRelativePointer('1/foo')).toBe(true);
		expect(isRelativePointer('x/foo')).toBe(false);
		expect(isRelativePointer('1foo')).toBe(false);
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/pointer test`

### STOP & COMMIT

```text
feat(pointer): add Relative JSON Pointer support
```

---

## Step 3 — RFC 6902 JSON Patch completion (mutate-by-default, immutable/atomic/testPatch)

### Goal

Align patch semantics with `json-p3` expectations (mutate in-place by default) while keeping strict validation and adding an explicit immutable API.

### Checklist

- [ ] Change `applyPatch()` default to mutate (no clone by default)
- [ ] Introduce `ApplyOptions` with `strictMode` and `atomic`
- [ ] Add `applyPatchImmutable()`
- [ ] Add `testPatch()`
- [ ] Add `createPatch()` alias in diff
- [ ] Add `PatchBuilder.build()` alias and option-aware `apply()`
- [ ] Add tests for mutation/immutable/atomic/testPatch

### Files

- `packages/jsonpath/patch/src/patch.ts` (edit)
- `packages/jsonpath/patch/src/diff.ts` (edit)
- `packages/jsonpath/patch/src/builder.ts` (edit)
- `packages/jsonpath/patch/src/__tests__/patch.spec.ts` (edit)

### TDD (Red)

Add tests first.

#### Add to `packages/jsonpath/patch/src/__tests__/patch.spec.ts`

```ts
import { applyPatch, applyPatchImmutable, testPatch } from '../patch.js';

it('applyPatch mutates target by default', () => {
	const data: any = { foo: 'bar' };
	const result = applyPatch(data, [{ op: 'add', path: '/baz', value: 'qux' }]);
	expect(result).toBe(data);
	expect(data).toEqual({ foo: 'bar', baz: 'qux' });
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

it('atomic=true applies all-or-nothing', () => {
	const data: any = { a: 1 };
	expect(() =>
		applyPatch(
			data,
			[
				{ op: 'add', path: '/b', value: 2 },
				{ op: 'remove', path: '/does-not-exist' },
			],
			{ atomic: true },
		),
	).toThrow();
	expect(data).toEqual({ a: 1 });
});
```

### Implementation (Green)

#### Replace `ApplyOptions` and apply semantics in `packages/jsonpath/patch/src/patch.ts`

Make these exact edits:

1. Replace the `ApplyOptions` interface with:

```ts
export interface ApplyOptions {
	readonly strictMode?: boolean;
	readonly atomic?: boolean;
}
```

2. Replace `applyPatch(...)` with this full implementation:

```ts
export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const { strictMode = true, atomic = false } = options;

	const working = atomic ? structuredClone(target) : target;
	let result = working;

	patch.forEach((operation, index) => {
		try {
			validateOperation(operation);

			switch (operation.op) {
				case 'add':
					result = applyAdd(result, operation.path, operation.value);
					break;
				case 'remove':
					if (strictMode) {
						result = applyRemove(result, operation.path);
						break;
					}
					try {
						result = applyRemove(result, operation.path);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						result = applyReplace(result, operation.path, operation.value);
						break;
					}
					try {
						result = applyReplace(result, operation.path, operation.value);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						result = applyAdd(result, operation.path, operation.value);
					}
					break;
				case 'move':
					result = applyMove(result, operation.from, operation.path);
					break;
				case 'copy':
					result = applyCopy(result, operation.from, operation.path);
					break;
				case 'test':
					applyTest(result, operation.path, operation.value);
					break;
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{ operationIndex: index, operation: (operation as any).op },
					);
			}
		} catch (err) {
			if (err instanceof JSONPathError) {
				if (err instanceof JSONPatchError && err.operationIndex !== undefined) {
					throw err;
				}
				throw new JSONPatchError(err.message, {
					path: (operation as any).path,
					operationIndex: index,
					operation: operation.op,
					cause: err,
				});
			}
			throw err;
		}
	});

	if (atomic) {
		if (
			target &&
			typeof target === 'object' &&
			result &&
			typeof result === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(result)) {
				target.length = 0;
				target.push(...result);
				return target;
			}

			for (const key of Object.keys(target)) delete target[key];
			Object.assign(target, result);
			return target;
		}
		return result;
	}

	return result;
}
```

3. Add these new functions below `applyPatch(...)`:

```ts
export function applyPatchImmutable(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const clone = structuredClone(target);
	return applyPatch(clone, patch, { ...options, atomic: false });
}

export function testPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): void {
	applyPatchImmutable(target, patch, options);
}
```

#### Builder: add `build()` and option-aware `apply()` in `packages/jsonpath/patch/src/builder.ts`

Inside the `PatchBuilder` class:

- Add:

```ts
build(): PatchOperation[] {
	return this.toOperations();
}
```

- Replace `apply(target: any)` with:

```ts
apply(target: any, options?: Parameters<typeof applyPatch>[2]): any {
	return applyPatch(target, this.operations, options);
}
```

#### Diff: add `createPatch()` alias in `packages/jsonpath/patch/src/diff.ts`

Append:

```ts
export function createPatch(
	source: any,
	target: any,
	options?: { invertible?: boolean },
): PatchOperation[] {
	return diff(source, target, options);
}
```

### Verification

- Run: `pnpm --filter @jsonpath/patch test`
- Keep existing RFC6902 compliance test wired: `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts`

### STOP & COMMIT

```text
feat(patch): mutate-by-default + immutable/atomic/testPatch
```

---

## Step 4 — RFC 7386 Merge Patch completion (createMergePatch + options)

### Goal

Complete merge-patch utilities: generate merge patches and allow configurable array/null behavior.

### Checklist

- [ ] Add `createMergePatch(source, target)`
- [ ] Add `applyMergePatch(target, patch, options?)` (keep existing export stable)
- [ ] Add tests for create/apply and options

### Files

- `packages/jsonpath/merge-patch/src/merge-patch.ts` (edit)
- `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts` (edit)

### Implementation (copy/paste)

Add the following exports to `packages/jsonpath/merge-patch/src/merge-patch.ts` (keep existing `applyMergePatch` if present, but ensure signatures match):

```ts
export interface MergePatchOptions {
	/** When patch value is null: delete property (default: 'delete') */
	readonly nullBehavior?: 'delete' | 'set-null';

	/** Strategy for arrays (default: 'replace') */
	readonly arrayMergeStrategy?: 'replace';
}

function isObject(value: any): value is Record<string, any> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function applyMergePatch(
	target: any,
	patch: any,
	options: MergePatchOptions = {},
): any {
	const { nullBehavior = 'delete', arrayMergeStrategy = 'replace' } = options;

	// RFC 7386: non-object patch replaces target.
	if (!isObject(patch)) {
		return patch;
	}

	// RFC 7386: if target is not an object, treat as empty object.
	const out: Record<string, any> = isObject(target) ? { ...target } : {};

	for (const key of Object.keys(patch)) {
		const value = patch[key];
		if (value === null) {
			if (nullBehavior === 'delete') {
				delete out[key];
			} else {
				out[key] = null;
			}
			continue;
		}

		if (Array.isArray(value)) {
			if (arrayMergeStrategy === 'replace') {
				out[key] = value;
			}
			continue;
		}

		if (isObject(value)) {
			out[key] = applyMergePatch(out[key], value, options);
			continue;
		}

		out[key] = value;
	}

	return out;
}

export function createMergePatch(source: any, target: any): any {
	// RFC 7386 algorithm: scalar/array differences produce replacement,
	// object differences produce object patch with deletions as null.
	if (!isObject(source) || !isObject(target)) {
		return deepEqual(source, target) ? {} : structuredClone(target);
	}

	const patch: Record<string, any> = {};
	const keys = new Set([...Object.keys(source), ...Object.keys(target)]);

	for (const key of keys) {
		if (!(key in target)) {
			patch[key] = null;
			continue;
		}
		if (!(key in source)) {
			patch[key] = structuredClone(target[key]);
			continue;
		}

		const s = source[key];
		const t = target[key];
		if (deepEqual(s, t)) continue;

		if (isObject(s) && isObject(t)) {
			const child = createMergePatch(s, t);
			if (isObject(child) && Object.keys(child).length === 0) continue;
			patch[key] = child;
			continue;
		}

		patch[key] = structuredClone(t);
	}

	return patch;
}
```

Note: this uses `deepEqual` from `@jsonpath/core` if already imported in the file. If not, add:

```ts
import { deepEqual } from '@jsonpath/core';
```

### Tests

Add to `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyMergePatch, createMergePatch } from '../merge-patch.js';

describe('createMergePatch', () => {
	it('creates a patch that transforms source into target', () => {
		const source = { a: 1, b: { c: 2 }, d: 3 };
		const target = { a: 1, b: { c: 9 }, e: 4 };
		const patch = createMergePatch(source, target);
		const out = applyMergePatch(source, patch);
		expect(out).toEqual(target);
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/merge-patch test`

### STOP & COMMIT

```text
feat(merge-patch): add createMergePatch + options
```

---

## Step 5 — Evaluator QueryResult pointer objects (for DataMap parity)

### Goal

Make pointer outputs first-class objects while preserving existing APIs where possible.

**Important compatibility choice (recommended for this repo):**

- Keep `QueryResult.paths(): PathSegment[][]` and `normalizedPaths(): string[]` as-is.
- Change `QueryResult.pointers()` to return `JSONPointer[]`.
- Add `pointerStrings()` for callers that want strings.

This avoids a large cross-package type break while still supporting DataMap’s `.pointers().map(p => p.toString())` expectation.

### Checklist

- [ ] Update evaluator `QueryResult` to return `JSONPointer[]` from `pointers()`
- [ ] Add `pointerStrings(): string[]`
- [ ] Add tests verifying pointer objects and string parity
- [ ] Update any in-repo callers expecting `string[]`

### Files

- `packages/jsonpath/evaluator/src/query-result.ts` (edit)
- `packages/jsonpath/evaluator/src/__tests__/query-result.spec.ts` (new)
- `packages/jsonpath/jsonpath/src/transform.ts` (edit in Step 7, but check now)

### Implementation

Edit `packages/jsonpath/evaluator/src/query-result.ts`:

1. Add import:

```ts
import { JSONPointer } from '@jsonpath/pointer';
```

2. Replace `pointers()` method with:

```ts
pointers(): JSONPointer[] {
	return this.results.map((r) => new JSONPointer(pathToPointer(r.path)));
}

pointerStrings(): string[] {
	return this.results.map((r) => pathToPointer(r.path));
}
```

3. Keep `normalizedPaths()` untouched.

### New test: `packages/jsonpath/evaluator/src/__tests__/query-result.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../index.js';

describe('QueryResult pointers()', () => {
	it('returns JSONPointer objects that match the string form', () => {
		const data = { a: { b: [10, 20] } };
		const ast = parse('$.a.b[1]');
		const result = evaluate(data, ast);

		const ptr = result.pointers()[0]!;
		expect(ptr.toString()).toBe('/a/b/1');
		expect(result.pointerStrings()[0]).toBe('/a/b/1');
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/evaluator test`

### STOP & COMMIT

```text
feat(evaluator): return JSONPointer objects from pointers()
```

---

## Step 6 — Function registry unification + built-in function expansion

### Goal

Make `@jsonpath/functions` the primary public surface for function registration/lookup and add the missing built-ins from the plan.

### Checklist

- [ ] Re-export core registry helpers from `@jsonpath/functions`
- [ ] Update evaluator to import `getFunction` from `@jsonpath/functions`
- [ ] Add built-ins: `min`, `max`, `avg`, `sum`, `keys`, `type`
- [ ] Add tests for new built-ins

### Files

- `packages/jsonpath/functions/src/registry.ts` (edit)
- `packages/jsonpath/functions/src/index.ts` (edit)
- `packages/jsonpath/functions/src/__tests__/functions.spec.ts` (edit)
- `packages/jsonpath/evaluator/src/evaluator.ts` (edit)

### Implementation

#### Update exports: `packages/jsonpath/functions/src/index.ts`

Replace content with:

```ts
export * from './registry.js';

export {
	getFunction,
	hasFunction,
	registerFunction,
	unregisterFunction,
	functionRegistry,
} from '@jsonpath/core';
```

#### Add built-in functions in `packages/jsonpath/functions/src/registry.ts`

Append these definitions (and include them in `builtins`):

```ts
function numeric(values: unknown[]): number[] {
	return values.filter(
		(v): v is number => typeof v === 'number' && Number.isFinite(v),
	);
}

export const minFn: FunctionDefinition<[unknown[]], number | undefined> = {
	name: 'min',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		return nums.length ? Math.min(...nums) : undefined;
	},
};

export const maxFn: FunctionDefinition<[unknown[]], number | undefined> = {
	name: 'max',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		return nums.length ? Math.max(...nums) : undefined;
	},
};

export const sumFn: FunctionDefinition<[unknown[]], number> = {
	name: 'sum',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		return nums.reduce((a, b) => a + b, 0);
	},
};

export const avgFn: FunctionDefinition<[unknown[]], number | undefined> = {
	name: 'avg',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown[]) => {
		const nums = numeric(
			nodes.map((n: any) =>
				n && typeof n === 'object' && 'value' in n ? n.value : n,
			),
		);
		if (!nums.length) return undefined;
		return nums.reduce((a, b) => a + b, 0) / nums.length;
	},
};

export const keysFn: FunctionDefinition<[unknown], string[] | undefined> = {
	name: 'keys',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
			return Object.keys(val as any);
		}
		return undefined;
	},
};

export const typeFn: FunctionDefinition<[unknown], string> = {
	name: 'type',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (val === null) return 'null';
		if (Array.isArray(val)) return 'array';
		return typeof val;
	},
};
```

Then update the `builtins` array to include these functions.

#### Update evaluator registry import in `packages/jsonpath/evaluator/src/evaluator.ts`

Replace:

```ts
import '@jsonpath/functions';
import { getFunction } from '@jsonpath/core';
```

With:

```ts
import '@jsonpath/functions';
import { getFunction } from '@jsonpath/functions';
```

### Tests

In `packages/jsonpath/functions/src/__tests__/functions.spec.ts`, add:

```ts
import { getFunction } from '@jsonpath/functions';

it('registers min/max/sum/avg', () => {
	const min = getFunction('min')!;
	const max = getFunction('max')!;
	const sum = getFunction('sum')!;
	const avg = getFunction('avg')!;

	const nodes = [{ value: 1 }, { value: 3 }, { value: 2 }] as any;
	expect(min.evaluate(nodes)).toBe(1);
	expect(max.evaluate(nodes)).toBe(3);
	expect(sum.evaluate(nodes)).toBe(6);
	expect(avg.evaluate(nodes)).toBe(2);
});

it('registers keys/type', () => {
	const keys = getFunction('keys')!;
	const type = getFunction('type')!;
	expect(keys.evaluate({ a: 1, b: 2 } as any)).toEqual(['a', 'b']);
	expect(type.evaluate(null as any)).toBe('null');
	expect(type.evaluate([1] as any)).toBe('array');
	expect(type.evaluate(1 as any)).toBe('number');
});
```

### Verification

- Run: `pnpm --filter @jsonpath/functions test`
- Run: `pnpm --filter @jsonpath/evaluator test`

### STOP & COMMIT

```text
feat(functions): unify registry surface + add missing built-ins
```

---

## Step 7 — Facade API enhancements + transform correctness (use JSON Pointer for patches)

### Goal

Ensure `transform`/`omit` build JSON Patch operations using JSON Pointer paths, not JSONPath strings.

### Checklist

- [ ] Add `first()` convenience alias
- [ ] Fix `transform()` to patch by pointer strings
- [ ] Fix `omit()` to remove by pointer strings
- [ ] Add/adjust tests

### Files

- `packages/jsonpath/jsonpath/src/facade.ts` (edit)
- `packages/jsonpath/jsonpath/src/transform.ts` (edit)
- `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts` (edit)

### Implementation

#### Facade: add `first()`

In `packages/jsonpath/jsonpath/src/facade.ts`, add:

```ts
export const first = value;
```

#### Transform: use pointers

In `packages/jsonpath/jsonpath/src/transform.ts`, ensure you build patch ops using pointer strings:

```ts
const results = query(root, path);

const patch = results.pointers().map((p) => ({
	op: 'remove',
	path: p.toString(),
}));
```

For `transform`, use `replace`:

```ts
const patch = results.nodes().map((node, i) => ({
	op: 'replace',
	path: results.pointers()[i]!.toString(),
	value: fn(node.value),
}));
```

### Tests

Add to `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts`:

```ts
import { first } from '../facade.js';

it('first() is an alias of value()', () => {
	const data = { a: { b: [1] } };
	expect(first(data, '$.a.b[0]')).toBe(1);
});
```

Add a new test file if transform tests don’t exist: `packages/jsonpath/jsonpath/src/__tests__/transform.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { transform, omit } from '../transform.js';

describe('transform/omit', () => {
	it('transform replaces matched values', () => {
		const data: any = { a: { b: [1, 2] } };
		transform(data, '$.a.b[*]', (v) => v * 10);
		expect(data).toEqual({ a: { b: [10, 20] } });
	});

	it('omit removes matched values', () => {
		const data: any = { a: { b: [1, 2] }, c: 3 };
		omit(data, '$.c');
		expect(data).toEqual({ a: { b: [1, 2] } });
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/jsonpath test`

### STOP & COMMIT

```text
fix(jsonpath): use JSON Pointer paths for transform/omit
```

---

## Step 8 — Schema validation system (`@jsonpath/schema`) (adapter-based)

### Goal

Create a new package that defines a schema adapter interface and core helpers that delegate schema-aware validation to adapters.

### Checklist

- [ ] Scaffold new package `packages/jsonpath/schema`
- [ ] Define adapter interface and result types
- [ ] Implement validator creation and helper functions (delegating to adapter)
- [ ] Add tests using a mock adapter

### Files (new)

- `packages/jsonpath/schema/package.json`
- `packages/jsonpath/schema/tsconfig.json`
- `packages/jsonpath/schema/vite.config.ts`
- `packages/jsonpath/schema/vitest.config.ts`
- `packages/jsonpath/schema/.eslintrc.cjs`
- `packages/jsonpath/schema/src/index.ts`
- `packages/jsonpath/schema/src/types.ts`
- `packages/jsonpath/schema/src/validator.ts`
- `packages/jsonpath/schema/src/__tests__/validator.spec.ts`

### Scaffold (copy/paste)

Use existing package patterns (see `@jsonpath/pointer`).

#### `packages/jsonpath/schema/package.json`

```json
{
	"name": "@jsonpath/schema",
	"version": "0.1.0",
	"description": "Schema adapter interfaces for JSONPath validation",
	"keywords": ["jsonpath", "schema"],
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@jsonpath/core": "workspace:*",
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/patch": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

#### `packages/jsonpath/schema/tsconfig.json`

```json
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"]
		}
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"]
}
```

#### `packages/jsonpath/schema/vite.config.ts`

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			tsconfigPaths(),
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

#### `packages/jsonpath/schema/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/pointer': path.resolve(__dirname, '../pointer/src/index.ts'),
			'@jsonpath/patch': path.resolve(__dirname, '../patch/src/index.ts'),
		},
	},
});
```

#### `packages/jsonpath/schema/.eslintrc.cjs`

```js
module.exports = require('@lellimecnar/eslint-config/node');
```

### Core code

#### `packages/jsonpath/schema/src/types.ts`

```ts
import type { JSONPointer } from '@jsonpath/pointer';
import type { PatchOperation } from '@jsonpath/patch';

export type Schema = unknown;

export interface ValidationError {
	readonly pointer?: JSONPointer;
	readonly code: string;
	readonly message: string;
	readonly expected?: unknown;
	readonly received?: unknown;
}

export interface ValidationResult {
	readonly valid: boolean;
	readonly errors: readonly ValidationError[];
}

export interface SchemaAdapter<TSchema = Schema> {
	readonly name: string;

	/**
	 * Return a TypeScript type string for the schema at pointer.
	 */
	inferTypeScript(schema: TSchema, pointer?: JSONPointer): string;

	/**
	 * Validate a value intended for pointer.
	 */
	validateValue(
		schema: TSchema,
		pointer: JSONPointer,
		value: unknown,
	): ValidationResult;

	/**
	 * Validate a patch against the schema.
	 */
	validatePatch(
		schema: TSchema,
		patch: readonly PatchOperation[],
	): ValidationResult;
}

export class SchemaValidationError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message);
		this.name = 'SchemaValidationError';
		if (options?.cause) (this as any).cause = options.cause;
	}
}
```

#### `packages/jsonpath/schema/src/validator.ts`

```ts
import type { JSONPointer } from '@jsonpath/pointer';
import type { PatchOperation } from '@jsonpath/patch';
import type { SchemaAdapter, Schema, ValidationResult } from './types.js';
import { SchemaValidationError } from './types.js';

export interface SchemaValidator<TSchema = Schema> {
	readonly adapterName: string;
	validateValue(
		schema: TSchema,
		pointer: JSONPointer,
		value: unknown,
	): ValidationResult;
	validatePatch(
		schema: TSchema,
		patch: readonly PatchOperation[],
	): ValidationResult;
	inferTypeScript(schema: TSchema, pointer?: JSONPointer): string;
}

class AdapterBackedSchemaValidator<
	TSchema,
> implements SchemaValidator<TSchema> {
	readonly adapterName: string;

	constructor(private readonly adapter: SchemaAdapter<TSchema>) {
		this.adapterName = adapter.name;
	}

	validateValue(
		schema: TSchema,
		pointer: JSONPointer,
		value: unknown,
	): ValidationResult {
		try {
			return this.adapter.validateValue(schema, pointer, value);
		} catch (err) {
			throw new SchemaValidationError('Schema adapter validateValue failed', {
				cause: err,
			});
		}
	}

	validatePatch(
		schema: TSchema,
		patch: readonly PatchOperation[],
	): ValidationResult {
		try {
			return this.adapter.validatePatch(schema, patch);
		} catch (err) {
			throw new SchemaValidationError('Schema adapter validatePatch failed', {
				cause: err,
			});
		}
	}

	inferTypeScript(schema: TSchema, pointer?: JSONPointer): string {
		try {
			return this.adapter.inferTypeScript(schema, pointer);
		} catch (err) {
			throw new SchemaValidationError('Schema adapter inferTypeScript failed', {
				cause: err,
			});
		}
	}
}

export function createSchemaValidator<TSchema = Schema>(
	adapter: SchemaAdapter<TSchema>,
): SchemaValidator<TSchema> {
	return new AdapterBackedSchemaValidator(adapter);
}
```

#### `packages/jsonpath/schema/src/index.ts`

```ts
export * from './types.js';
export * from './validator.js';
```

### Tests

#### `packages/jsonpath/schema/src/__tests__/validator.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { JSONPointer } from '@jsonpath/pointer';

import { createSchemaValidator } from '../validator.js';
import type { SchemaAdapter } from '../types.js';

describe('@jsonpath/schema', () => {
	it('delegates to adapter', () => {
		const adapter: SchemaAdapter<any> = {
			name: 'mock',
			inferTypeScript: () => 'string',
			validateValue: (_schema, pointer, value) => {
				return {
					valid: pointer.toString() === '/a' && value === 'ok',
					errors:
						pointer.toString() === '/a' && value === 'ok'
							? []
							: [{ code: 'INVALID', message: 'bad', pointer }],
				};
			},
			validatePatch: () => ({ valid: true, errors: [] }),
		};

		const validator = createSchemaValidator(adapter);
		expect(validator.adapterName).toBe('mock');
		expect(validator.inferTypeScript({}, new JSONPointer('/a'))).toBe('string');

		const ok = validator.validateValue({}, new JSONPointer('/a'), 'ok');
		expect(ok.valid).toBe(true);

		const bad = validator.validateValue({}, new JSONPointer('/a'), 'nope');
		expect(bad.valid).toBe(false);
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/schema test`

### STOP & COMMIT

```text
feat(schema): add schema adapter package
```

---

## Step 9 — json-p3 compatibility layer (`@jsonpath/compat-json-p3`)

### Goal

Provide a drop-in-compatible subset of `json-p3` used by `@data-map/core`.

### Checklist

- [ ] Add new package `@jsonpath/compat-json-p3`
- [ ] Implement `jsonpath.query(path, data)` arg-order wrapper
- [ ] Implement `jsonpatch.apply(patch, target)` wrapper
- [ ] Re-export `JSONPointer`
- [ ] Add parity tests vs `@jsonpath/jsonpath` usage

### Files (new)

- `packages/jsonpath/compat-json-p3/package.json`
- `packages/jsonpath/compat-json-p3/tsconfig.json`
- `packages/jsonpath/compat-json-p3/vite.config.ts`
- `packages/jsonpath/compat-json-p3/vitest.config.ts`
- `packages/jsonpath/compat-json-p3/.eslintrc.cjs`
- `packages/jsonpath/compat-json-p3/src/index.ts`
- `packages/jsonpath/compat-json-p3/src/jsonpath.ts`
- `packages/jsonpath/compat-json-p3/src/jsonpatch.ts`
- `packages/jsonpath/compat-json-p3/src/__tests__/compat.spec.ts`

### Scaffold

Use the same structure as `@jsonpath/pointer` for config files; adjust vitest aliases to point to `../jsonpath/src/index.ts`, `../patch/src/index.ts`, `../pointer/src/index.ts`, `../evaluator/src/index.ts`.

### Core code

#### `packages/jsonpath/compat-json-p3/src/jsonpath.ts`

```ts
import type { EvaluatorOptions } from '@jsonpath/core';
import * as facade from '@jsonpath/jsonpath';

export const jsonpath = {
	query(path: string, data: any, options?: EvaluatorOptions) {
		return facade.query(data, path, options);
	},
	value(path: string, data: any, options?: EvaluatorOptions) {
		return facade.value(data, path, options);
	},
};
```

#### `packages/jsonpath/compat-json-p3/src/jsonpatch.ts`

```ts
import type { PatchOperation } from '@jsonpath/patch';
import { applyPatch } from '@jsonpath/patch';

export const jsonpatch = {
	apply(patch: PatchOperation[], target: any) {
		return applyPatch(target, patch);
	},
};
```

#### `packages/jsonpath/compat-json-p3/src/index.ts`

```ts
export { JSONPointer } from '@jsonpath/pointer';
export { jsonpath } from './jsonpath.js';
export { jsonpatch } from './jsonpatch.js';
```

### Tests

#### `packages/jsonpath/compat-json-p3/src/__tests__/compat.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { jsonpath, jsonpatch, JSONPointer } from '../index.js';
import { query } from '@jsonpath/jsonpath';

describe('@jsonpath/compat-json-p3', () => {
	it('jsonpath.query() matches facade.query() values', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const compat = jsonpath.query('$.users[*].name', data);
		const native = query(data, '$.users[*].name');
		expect(compat.values()).toEqual(native.values());
	});

	it('jsonpatch.apply() mutates target', () => {
		const target: any = { a: 1 };
		jsonpatch.apply([{ op: 'replace', path: '/a', value: 2 } as any], target);
		expect(target).toEqual({ a: 2 });
	});

	it('re-exports JSONPointer', () => {
		const ptr = new JSONPointer('/a');
		expect(ptr.resolve({ a: 1 })).toBe(1);
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/compat-json-p3 test`

### STOP & COMMIT

```text
feat(compat-json-p3): add json-p3 compatibility wrapper
```

---

## Step 10 — Benchmarks package (`@jsonpath/benchmarks`)

### Goal

Create a benchmark workspace using `vitest bench`.

### Checklist

- [ ] Add package `packages/jsonpath/benchmarks`
- [ ] Add at least one benchmark for query evaluation

### Files (new)

- `packages/jsonpath/benchmarks/package.json`
- `packages/jsonpath/benchmarks/tsconfig.json`
- `packages/jsonpath/benchmarks/vitest.config.ts`
- `packages/jsonpath/benchmarks/src/query.bench.ts`

### Code

#### `packages/jsonpath/benchmarks/src/query.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { queryValues } from '@jsonpath/jsonpath';

const data = {
	store: {
		book: Array.from({ length: 1_000 }, (_, i) => ({
			title: `Book ${i}`,
			price: i,
			category: i % 2 === 0 ? 'fiction' : 'reference',
		})),
	},
};

describe('queryValues()', () => {
	bench('titles', () => {
		queryValues(data, '$.store.book[*].title');
	});

	bench('filter', () => {
		queryValues(
			data,
			'$.store.book[?(@.category == "fiction" && @.price < 500)].title',
		);
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/benchmarks bench`

### STOP & COMMIT

```text
chore(benchmarks): add vitest bench workspace
```

---

## Step 11 — Plugin system (minimal hooks + evaluator wiring)

### Goal

Introduce a small plugin hook surface usable by `@data-map/*` without destabilizing evaluator behavior.

### Checklist

- [ ] Add plugin types + `PluginManager` in `@jsonpath/core`
- [ ] Allow `EvaluatorOptions.plugins?: JSONPathPlugin[]`
- [ ] Wire `beforeEvaluate/afterEvaluate/onError` hooks in evaluator
- [ ] Tests for order + isolation

### Files

- `packages/jsonpath/core/src/plugins.ts` (new)
- `packages/jsonpath/core/src/index.ts` (edit)
- `packages/jsonpath/core/src/types.ts` (edit)
- `packages/jsonpath/evaluator/src/evaluator.ts` (edit)
- `packages/jsonpath/evaluator/src/__tests__/plugins.spec.ts` (new)

### New file: `packages/jsonpath/core/src/plugins.ts`

```ts
import type { EvaluatorOptions, QueryResult } from './types.js';

export interface BeforeEvaluateContext {
	readonly root: unknown;
	readonly query: unknown;
	readonly options?: EvaluatorOptions;
}

export interface AfterEvaluateContext {
	readonly result: QueryResult;
}

export interface EvaluateErrorContext {
	readonly error: unknown;
}

export interface JSONPathPlugin {
	readonly name: string;

	beforeEvaluate?(ctx: BeforeEvaluateContext): void;
	afterEvaluate?(ctx: AfterEvaluateContext): void;
	onError?(ctx: EvaluateErrorContext): void;
}

export class PluginManager {
	constructor(private readonly plugins: readonly JSONPathPlugin[]) {}

	static from(options?: {
		plugins?: readonly JSONPathPlugin[];
	}): PluginManager {
		return new PluginManager(options?.plugins ?? []);
	}

	beforeEvaluate(ctx: BeforeEvaluateContext): void {
		this.run('beforeEvaluate', ctx);
	}

	afterEvaluate(ctx: AfterEvaluateContext): void {
		this.run('afterEvaluate', ctx);
	}

	onError(ctx: EvaluateErrorContext): void {
		this.run('onError', ctx);
	}

	private run(
		hook: 'beforeEvaluate' | 'afterEvaluate' | 'onError',
		ctx: any,
	): void {
		for (const plugin of this.plugins) {
			const fn = (plugin as any)[hook];
			if (!fn) continue;
			try {
				fn.call(plugin, ctx);
			} catch {
				// isolation: plugin failures never break evaluation
			}
		}
	}
}
```

### Export plugins

In `packages/jsonpath/core/src/index.ts`, add:

```ts
export * from './plugins.js';
```

### Extend EvaluatorOptions

In `packages/jsonpath/core/src/types.ts`, add:

```ts
import type { JSONPathPlugin } from './plugins.js';
```

and add to `EvaluatorOptions`:

```ts
readonly plugins?: readonly JSONPathPlugin[];
```

### Wire into evaluator

In `packages/jsonpath/evaluator/src/evaluator.ts`, create a manager once and call it around evaluate.

Add:

```ts
import { PluginManager } from '@jsonpath/core';
```

Then, inside `evaluate(...)`:

```ts
const plugins = PluginManager.from({ plugins: options?.plugins });
plugins.beforeEvaluate({ root, query: ast, options });
try {
	const result = existingEvaluate(root, ast, options);
	plugins.afterEvaluate({ result });
	return result;
} catch (error) {
	plugins.onError({ error });
	throw error;
}
```

### Tests

#### `packages/jsonpath/evaluator/src/__tests__/plugins.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../index.js';

describe('plugins', () => {
	it('runs hooks and isolates failures', () => {
		const calls: string[] = [];
		const ok = {
			name: 'ok',
			beforeEvaluate: () => calls.push('ok:before'),
			afterEvaluate: () => calls.push('ok:after'),
		};
		const bad = {
			name: 'bad',
			beforeEvaluate: () => {
				calls.push('bad:before');
				throw new Error('boom');
			},
		};
		const ast = parse('$.a');
		const result = evaluate({ a: 1 }, ast, {
			plugins: [ok as any, bad as any],
		});
		expect(result.values()).toEqual([1]);
		expect(calls).toContain('ok:before');
		expect(calls).toContain('ok:after');
		expect(calls).toContain('bad:before');
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/core test`
- Run: `pnpm --filter @jsonpath/evaluator test`

### STOP & COMMIT

```text
feat(plugins): add plugin hooks + evaluator wiring
```

---

## Step 12 — Documentation + tested examples

### Goal

Add docs for the new surfaces and keep examples executable.

### Checklist

- [ ] Add docs markdown pages
- [ ] Add example TS modules
- [ ] Add a Vitest smoke test that runs the examples

### Files

- `packages/jsonpath/docs/guides/compat-json-p3.md` (new)
- `packages/jsonpath/docs/guides/plugins.md` (new)
- `packages/jsonpath/docs/guides/schema-validation.md` (new)
- `packages/jsonpath/docs/guides/benchmarks.md` (new)
- `packages/jsonpath/jsonpath/examples/compat-json-p3.ts` (new)
- `packages/jsonpath/jsonpath/examples/plugins.ts` (new)
- `packages/jsonpath/jsonpath/examples/schema-validation.ts` (new)
- `packages/jsonpath/jsonpath/src/__tests__/examples.spec.ts` (new)

### Example: `packages/jsonpath/jsonpath/examples/compat-json-p3.ts`

```ts
import { jsonpath } from '@jsonpath/compat-json-p3';

export function runCompatExample(): string[] {
	const data = { users: [{ name: 'A' }, { name: 'B' }] };
	const result = jsonpath.query('$.users[*].name', data);
	return result.values();
}
```

### Example test: `packages/jsonpath/jsonpath/src/__tests__/examples.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { runCompatExample } from '../../examples/compat-json-p3.js';

describe('examples', () => {
	it('compat-json-p3 example runs', () => {
		expect(runCompatExample()).toEqual(['A', 'B']);
	});
});
```

### Verification

- Run: `pnpm --filter @jsonpath/jsonpath test`

### STOP & COMMIT

```text
docs(jsonpath): add integration guides + tested examples
```

---

## Step 13 — @data-map/core integration parity tests

### Goal

Prove `@jsonpath/compat-json-p3` can act as a drop-in for the `json-p3` subset used by DataMap.

### Checklist

- [ ] Add dev dependency on `@jsonpath/compat-json-p3`
- [ ] Add Vitest alias wiring in data-map so tests run against `src` for jsonpath packages
- [ ] Add parity tests comparing results with `json-p3`

### Files

- `packages/data-map/core/package.json` (edit)
- `packages/data-map/core/vitest.config.ts` (edit)
- `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts` (new)

### Package devDependency

In `packages/data-map/core/package.json`, add:

```json
{
	"@jsonpath/compat-json-p3": "workspace:*"
}
```

### Vitest aliases

In `packages/data-map/core/vitest.config.ts`, add resolve aliases for `@jsonpath/*` packages pointing to `../../jsonpath/*/src/index.ts` (matching existing patterns).

### Test

Create `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	jsonpath as p3Jsonpath,
	jsonpatch as p3Jsonpatch,
	JSONPointer as P3JSONPointer,
} from 'json-p3';
import {
	jsonpath as compatJsonpath,
	jsonpatch as compatJsonpatch,
	JSONPointer as CompatJSONPointer,
} from '@jsonpath/compat-json-p3';

describe('json-p3 parity (compat-json-p3)', () => {
	it('query values and pointers match common patterns', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const p3 = p3Jsonpath.query('$.users[*].name', data);
		const compat = compatJsonpath.query('$.users[*].name', data);
		expect(compat.values()).toEqual(p3.values());
		expect(
			compat.pointers().map((p: any) => p.toString?.() ?? String(p)),
		).toEqual(p3.pointers().map((p: any) => p.toString?.() ?? String(p)));
	});

	it('JSONPointer resolve/exists match', () => {
		const data: any = { a: { b: [1, 2] } };
		const p3 = new P3JSONPointer('/a/b/1');
		const compat = new CompatJSONPointer('/a/b/1');
		expect(compat.resolve(data)).toEqual(p3.resolve(data));
		expect(compat.exists(data)).toEqual(p3.exists(data));
	});

	it('jsonpatch.apply mutates in place', () => {
		const ops: any[] = [{ op: 'replace', path: '/a', value: 2 }];
		const t1: any = { a: 1 };
		const t2: any = { a: 1 };
		p3Jsonpatch.apply(ops as any, t1);
		compatJsonpatch.apply(ops as any, t2);
		expect(t2).toEqual(t1);
	});
});
```

### Verification

- Run: `pnpm --filter @data-map/core test`

### STOP & COMMIT

```text
test(data-map): add json-p3 parity suite for compat-json-p3
```

---

## Final verification (after Step 13)

- [ ] `pnpm --filter @jsonpath/pointer test`
- [ ] `pnpm --filter @jsonpath/patch test`
- [ ] `pnpm --filter @jsonpath/merge-patch test`
- [ ] `pnpm --filter @jsonpath/evaluator test`
- [ ] `pnpm --filter @jsonpath/functions test`
- [ ] `pnpm --filter @jsonpath/jsonpath test`
- [ ] `pnpm --filter @jsonpath/schema test`
- [ ] `pnpm --filter @jsonpath/compat-json-p3 test`
- [ ] `pnpm --filter @data-map/core test`

# JSONPath Integration Readiness — Implementation (Steps 1–3)

This document is the **actionable implementation guide** for Steps 1–3 from `plan.md`.

Conventions (repo-specific):

- TS sources use **ESM-style imports with `.js` extensions** for relative imports (e.g. `./normalize.js`).
- New exports are added via `src/index.ts`.
- Tests use **Vitest** and live under `src/__tests__/*.spec.ts`.

---

## Step 1 — JSON Pointer completion (RFC 6901 + DataMap needs)

### Goals

- Provide instance APIs required by `@data-map/core`: `pointer.resolve(root)` and `pointer.exists(root)`.
- Provide `normalize()` helper to produce a canonical RFC 6901 pointer string.
- Provide clearer error taxonomy for pointer syntax vs resolution.

### Checklist

- [ ] Add pointer-specific error classes (syntax vs resolution)
- [ ] Add `JSONPointer#resolve()` and `JSONPointer#exists()` instance methods
- [ ] Add `normalize()` utility (exported)
- [ ] Ensure standalone resolution helpers remain available and (where appropriate) reuse the instance methods
- [ ] Add/adjust tests for: resolve/exists + normalize canonicalization

### Files

- `packages/jsonpath/pointer/src/pointer.ts` (change: add methods + use new error types)
- `packages/jsonpath/pointer/src/normalize.ts` (new)
- `packages/jsonpath/pointer/src/errors.ts` (new)
- `packages/jsonpath/pointer/src/index.ts` (change: export new modules)
- `packages/jsonpath/pointer/src/resolve.ts` (optional change: reuse instance methods)
- `packages/jsonpath/pointer/src/__tests__/pointer.spec.ts` (change)
- `packages/jsonpath/pointer/src/__tests__/normalize.spec.ts` (new)

### Suggested edits

#### 1) New file: `packages/jsonpath/pointer/src/errors.ts`

```ts
import { JSONPointerError } from '@jsonpath/core';

export class PointerSyntaxError extends JSONPointerError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, options);
		this.name = 'PointerSyntaxError';
	}
}

export class PointerResolutionError extends JSONPointerError {
	constructor(message: string, options?: { path?: string; cause?: Error }) {
		super(message, options);
		this.name = 'PointerResolutionError';
	}
}
```

#### 2) New file: `packages/jsonpath/pointer/src/normalize.ts`

Canonicalization rule (minimal and safe):

- Parse → tokens → format.
- This normalizes redundant escaping and ensures the correct `~0` / `~1` encoding.

```ts
import { JSONPointer } from './pointer.js';

/**
 * Returns a canonical RFC 6901 JSON Pointer string.
 *
 * - `''` stays `''`
 * - Non-empty pointers become `/<escaped>/<escaped>/...`
 */
export function normalize(
	pointer: string | JSONPointer | readonly string[],
): string {
	if (pointer instanceof JSONPointer) {
		return JSONPointer.format(pointer.getTokens());
	}

	if (Array.isArray(pointer)) {
		return JSONPointer.format([...pointer]);
	}

	return JSONPointer.format(JSONPointer.parse(pointer));
}
```

#### 3) Update exports: `packages/jsonpath/pointer/src/index.ts`

Insert alongside existing exports:

```ts
export * from './errors.js';
export * from './normalize.js';
```

#### 4) Update class: `packages/jsonpath/pointer/src/pointer.ts`

**A. Import error classes**

Replace the current import at the top:

```ts
-import { JSONPointerError } from '@jsonpath/core';
+import { PointerSyntaxError } from './errors.js';
```

(Keep `JSONPointerError` out of this file; prefer the more specific `PointerSyntaxError` for parse-time failures.)

**B. Parse errors should throw `PointerSyntaxError`**

In `static parse(pointer: string)` change the throw sites:

```ts
throw new PointerSyntaxError(
	'Invalid JSON Pointer: must start with "/" or be empty',
);
```

and

```ts
throw new PointerSyntaxError(`Invalid tilde sequence in JSON Pointer: ${part}`);
```

**C. Add instance methods**

Insert these methods inside `export class JSONPointer` (recommended placement: after `evaluate()`):

```ts
	/**
	 * DataMap compatibility: resolve a pointer against data.
	 * Alias of `evaluate()`.
	 */
	resolve<T = any>(root: unknown): T | undefined {
		return this.evaluate(root) as T | undefined;
	}

	/**
	 * DataMap compatibility: check whether a pointer exists.
	 * Distinguishes between "missing" vs a present `undefined` property by using `in` checks.
	 */
	exists(root: unknown): boolean {
		let current: any = root;

		for (const token of this.tokens) {
			if (current === null || typeof current !== 'object') {
				return false;
			}

			if (Array.isArray(current)) {
				if (!/^(0|[1-9][0-9]*)$/.test(token)) {
					return false;
				}
				const index = Number.parseInt(token, 10);
				if (index < 0 || index >= current.length) {
					return false;
				}
				current = current[index];
			} else {
				if (!(token in current)) {
					return false;
				}
				current = current[token];
			}
		}

		return true;
	}
```

> Note: `evaluate()` intentionally returns `undefined` on “not found”. `exists()` is the companion API that can reliably answer existence even when the value is `undefined`.

#### 5) (Optional but recommended) Reuse instance logic in `packages/jsonpath/pointer/src/resolve.ts`

Replace the `exists()` implementation to delegate:

```ts
export function exists(data: any, pointer: string | string[]): boolean {
	return new JSONPointer(pointer).exists(data);
}
```

(Leave `resolve()` using `evaluate()` or switch to `.resolve()`; both are equivalent.)

### Tests

#### A) Modify existing tests: `packages/jsonpath/pointer/src/__tests__/pointer.spec.ts`

Add one test to prove `exists()` distinguishes missing vs present-undefined:

```ts
it('JSONPointer.exists() should treat present undefined as existing', () => {
	const data: any = { a: { b: undefined } };
	const ptr = new JSONPointer('/a/b');
	expect(ptr.exists(data)).toBe(true);
	expect(ptr.resolve(data)).toBeUndefined();
});
```

(Placement: under `describe('resolution', () => { ... })` or in a new `describe('instance methods', ...)` block.)

#### B) New test file: `packages/jsonpath/pointer/src/__tests__/normalize.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import { normalize } from '../normalize.js';
import { JSONPointer } from '../pointer.js';

describe('normalize', () => {
	it('should canonicalize equivalent pointers', () => {
		// token contains "~" and "/" -> must be encoded as ~0 and ~1
		const tokens = ['a~b/c'];
		expect(normalize(tokens)).toBe('/a~0b~1c');
		expect(normalize('/a~0b~1c')).toBe('/a~0b~1c');
		expect(normalize(new JSONPointer('/a~0b~1c'))).toBe('/a~0b~1c');
	});

	it('should preserve empty pointer', () => {
		expect(normalize('')).toBe('');
	});
});
```

### Conventional commit

```text
feat(pointer): add JSONPointer resolve/exists + normalize
```

---

## Step 2 — Relative JSON Pointer (optional, minimal but correct)

### Goals

- Provide **Relative JSON Pointer** support as a small, isolated addition.
- Keep API surface minimal:
  - Parse relative pointer strings
  - Resolve relative pointers given a “current” absolute `JSONPointer`
  - Convert to an absolute pointer

### Checklist

- [ ] Add `RelativeJSONPointer` implementation and parser
- [ ] Export from `@jsonpath/pointer` via `src/index.ts`
- [ ] Add Vitest coverage for the draft examples and error cases

### Files

- `packages/jsonpath/pointer/src/relative-pointer.ts` (new)
- `packages/jsonpath/pointer/src/index.ts` (change: export)
- `packages/jsonpath/pointer/src/__tests__/relative-pointer.spec.ts` (new)

### Suggested implementation

#### 1) New file: `packages/jsonpath/pointer/src/relative-pointer.ts`

```ts
import { JSONPointer } from './pointer.js';
import { PointerSyntaxError, PointerResolutionError } from './errors.js';

export interface ParsedRelativePointer {
	ancestors: number;
	suffix: JSONPointer;
	indexReference: boolean;
}

export function parseRelativePointer(pointer: string): ParsedRelativePointer {
	const match = /^(?<n>0|[1-9][0-9]*)(?<rest>.*)$/.exec(pointer);
	if (!match?.groups) {
		throw new PointerSyntaxError(`Invalid relative JSON Pointer: ${pointer}`);
	}

	const ancestors = Number.parseInt(match.groups.n!, 10);
	let rest = match.groups.rest ?? '';

	let indexReference = false;
	if (rest.startsWith('#')) {
		indexReference = true;
		rest = rest.slice(1);
	}

	// rest is either empty or an absolute-pointer-like suffix starting with '/'
	if (rest !== '' && !rest.startsWith('/')) {
		throw new PointerSyntaxError(
			`Invalid relative JSON Pointer suffix (must be empty, '#', or start with '/'): ${pointer}`,
		);
	}

	return {
		ancestors,
		suffix: new JSONPointer(rest),
		indexReference,
	};
}

export function isRelativePointer(pointer: string): boolean {
	try {
		parseRelativePointer(pointer);
		return true;
	} catch {
		return false;
	}
}

export class RelativeJSONPointer {
	private readonly parsed: ParsedRelativePointer;

	constructor(pointer: string) {
		this.parsed = parseRelativePointer(pointer);
	}

	toAbsolute(current: JSONPointer): JSONPointer {
		const currentTokens = current.getTokens();
		if (this.parsed.ancestors > currentTokens.length) {
			throw new PointerResolutionError(
				`Relative pointer traversal out of bounds: ${this.parsed.ancestors}`,
			);
		}

		const baseTokens = currentTokens.slice(
			0,
			currentTokens.length - this.parsed.ancestors,
		);

		return new JSONPointer([...baseTokens, ...this.parsed.suffix.getTokens()]);
	}

	resolve(root: unknown, current: JSONPointer): unknown {
		const abs = this.toAbsolute(current);

		if (this.parsed.indexReference) {
			const tokens = abs.getTokens();
			return tokens.length === 0 ? undefined : tokens[tokens.length - 1];
		}

		return abs.resolve(root);
	}

	toString(): string {
		const { ancestors, suffix, indexReference } = this.parsed;
		const suffixStr = JSONPointer.format(suffix.getTokens());
		return `${ancestors}${indexReference ? '#' : ''}${suffixStr}`;
	}
}

export function resolveRelative(
	root: unknown,
	current: JSONPointer,
	relative: string,
): unknown {
	return new RelativeJSONPointer(relative).resolve(root, current);
}
```

#### 2) Export from `packages/jsonpath/pointer/src/index.ts`

Add:

```ts
export * from './relative-pointer.js';
```

### Tests

#### New test file: `packages/jsonpath/pointer/src/__tests__/relative-pointer.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import { JSONPointer } from '../pointer.js';
import {
	RelativeJSONPointer,
	parseRelativePointer,
	resolveRelative,
	isRelativePointer,
} from '../relative-pointer.js';

describe('Relative JSON Pointer', () => {
	it('should parse ancestor prefix and suffix', () => {
		expect(parseRelativePointer('0')).toEqual({
			ancestors: 0,
			suffix: new JSONPointer(''),
			indexReference: false,
		});
		expect(parseRelativePointer('2/foo').ancestors).toBe(2);
	});

	it('should resolve value relative to current pointer', () => {
		const root = { a: { b: { c: 1 } } };
		const current = new JSONPointer('/a/b');
		expect(resolveRelative(root, current, '0/c')).toBe(1);
		expect(resolveRelative(root, current, '1/b/c')).toBe(1);
	});

	it('should resolve key reference via #', () => {
		const root = { a: { b: { c: 1 } } };
		const current = new JSONPointer('/a/b');
		const rel = new RelativeJSONPointer('0/c#');
		// key/index of the resolved pointer is the last token
		expect(rel.resolve(root, current)).toBe('c');
	});

	it('should validate via isRelativePointer()', () => {
		expect(isRelativePointer('0')).toBe(true);
		expect(isRelativePointer('1/foo')).toBe(true);
		expect(isRelativePointer('x/foo')).toBe(false);
		expect(isRelativePointer('1foo')).toBe(false);
	});
});
```

### Conventional commit

```text
feat(pointer): add minimal Relative JSON Pointer support
```

---

## Step 3 — JSON Patch completion (align with json-p3 semantics)

### Goals

- Make `applyPatch()` **mutate in-place by default** (json-p3 compatibility).
- Add `applyPatchImmutable()` for immutable usage.
- Add `ApplyOptions` with `strictMode` and `atomic`.
- Add `testPatch()` dry-run validator.
- Complete `PatchBuilder` to match documented API (`build()` at minimum).
- Add diff alias `createPatch()` (keep `diff()` for existing callers).

### Checklist

- [ ] Change `applyPatch()` default behavior to mutate in-place
- [ ] Add `applyPatchImmutable()`
- [ ] Replace `ApplyOptions` with `{ strictMode, atomic }` (and update internal usage)
- [ ] Add `testPatch()`
- [ ] Extend `PatchBuilder` with `build()` and options-aware apply
- [ ] Add `createPatch()` alias (diff)
- [ ] Update existing Vitest tests + add new tests for mutation/atomic/immutable

### Files

- `packages/jsonpath/patch/src/patch.ts` (change)
- `packages/jsonpath/patch/src/builder.ts` (change)
- `packages/jsonpath/patch/src/diff.ts` (change)
- `packages/jsonpath/patch/src/index.ts` (change: exports already wildcard)
- `packages/jsonpath/patch/src/__tests__/patch.spec.ts` (change)
- `packages/jsonpath/patch/src/__tests__/builder.spec.ts` (change)
- `packages/jsonpath/patch/src/__tests__/diff.spec.ts` (optional change)
- `packages/jsonpath/patch/src/__tests__/atomic.spec.ts` (new; optional if you prefer to extend patch.spec)

### Suggested edits

#### 1) Update options + apply semantics: `packages/jsonpath/patch/src/patch.ts`

**A. Replace the existing `ApplyOptions` interface**

Replace:

```ts
export interface ApplyOptions {
	readonly strict?: boolean;
	readonly clone?: boolean;
}
```

With:

```ts
export interface ApplyOptions {
	/** When true, enforce RFC behavior strictly (default: true) */
	readonly strictMode?: boolean;

	/** When true, apply is all-or-nothing (default: false) */
	readonly atomic?: boolean;
}
```

**B. Update `applyPatch()` to mutate by default**

Change the function signature and initialization:

```ts
export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const { strictMode = true, atomic = false } = options;

	// If atomic, we apply against a clone first and only commit on success.
	const working = atomic ? structuredClone(target) : target;
	let result = working;

	patch.forEach((operation, index) => {
		try {
			validateOperation(operation);

			switch (operation.op) {
				case 'add':
					result = applyAdd(result, operation.path, operation.value);
					break;
				case 'remove':
					if (strictMode) {
						result = applyRemove(result, operation.path);
						break;
					}
					try {
						result = applyRemove(result, operation.path);
					} catch (err: any) {
						// Non-strict: missing paths are a no-op
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						result = applyReplace(result, operation.path, operation.value);
						break;
					}
					try {
						result = applyReplace(result, operation.path, operation.value);
					} catch (err: any) {
						// Non-strict: missing path behaves like add
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						result = applyAdd(result, operation.path, operation.value);
					}
					break;
				case 'move':
					result = applyMove(result, operation.from, operation.path);
					break;
				case 'copy':
					result = applyCopy(result, operation.from, operation.path);
					break;
				case 'test':
					applyTest(result, operation.path, operation.value);
					break;
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{ operationIndex: index, operation: (operation as any).op },
					);
			}
		} catch (err) {
			// keep the existing wrapping behavior from the current implementation
			throw err;
		}
	});

	if (atomic) {
		// Commit back into the original reference when possible.
		// For objects/arrays, mutate target in-place to match working.
		if (
			target &&
			typeof target === 'object' &&
			result &&
			typeof result === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(result)) {
				target.length = 0;
				target.push(...result);
				return target;
			}

			// object → object
			for (const key of Object.keys(target)) {
				delete target[key];
			}
			Object.assign(target, result);
			return target;
		}

		// If we cannot commit in-place (primitive roots, type mismatch), return result.
		return result;
	}

	return result;
}
```

Non-strict mode is intentionally minimal and only relaxes two behaviors:

- `remove` on a missing path becomes a no-op
- `replace` on a missing path behaves like `add`

(Everything else remains RFC-strict.)

Notes:

- `strictMode` should continue to behave like current implementation (throw on missing paths, invalid indices, etc.).
- Current code already behaves “strict” for `remove`/`replace`/`move`/`copy`/`test`.
- Keep `validateOperation()` call regardless of `strictMode` (missing required keys is always an error).

**C. Add `applyPatchImmutable()`**

Insert below `applyPatch()`:

```ts
export function applyPatchImmutable(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const clone = structuredClone(target);
	return applyPatch(clone, patch, { ...options, atomic: false });
}
```

(Immutable can delegate to `applyPatch()` with a cloned root; atomic is unnecessary because the clone is disposable.)

**D. Add `testPatch()` dry-run validator**

Insert below `applyPatchImmutable()`:

```ts
export function testPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): void {
	applyPatchImmutable(target, patch, options);
}
```

This “validator” style matches existing error strategy: success is silent; failures throw `JSONPatchError` with metadata.

#### 2) PatchBuilder completion: `packages/jsonpath/patch/src/builder.ts`

**A. Add `build()` alias expected by docs**

Insert into `PatchBuilder`:

```ts
	build(): PatchOperation[] {
		return this.toOperations();
	}
```

**B. Make `apply()` accept options and pass through**

Replace:

```ts
apply(target: any): any {
	return applyPatch(target, this.operations);
}
```

With:

```ts
apply(target: any, options?: Parameters<typeof applyPatch>[2]): any {
	return applyPatch(target, this.operations, options);
}
```

(Keep type-simple; avoids new exported types in builder.ts.)

#### 3) Add `createPatch()` alias: `packages/jsonpath/patch/src/diff.ts`

Add below `export function diff(...)`:

```ts
/** Alias for diff() - clearer name for consumers */
export function createPatch(
	source: any,
	target: any,
	options?: { invertible?: boolean },
): PatchOperation[] {
	return diff(source, target, options);
}
```

(If you want to support richer options later, this can become the preferred API while preserving `diff()`.)

### Tests

#### A) Update `packages/jsonpath/patch/src/__tests__/patch.spec.ts`

Add mutation assertions (example: in the first test):

```ts
it('should apply add operation (mutates by default)', () => {
	const data = { foo: 'bar' };
	const result = applyPatch(data, [{ op: 'add', path: '/baz', value: 'qux' }]);
	expect(result).toBe(data);
	expect(data).toEqual({ foo: 'bar', baz: 'qux' });
});
```

Also add immutable variant coverage:

```ts
it('applyPatchImmutable should not mutate original', () => {
	const data = { foo: 'bar' };
	const result = applyPatchImmutable(data, [
		{ op: 'add', path: '/baz', value: 'qux' },
	]);
	expect(result).toEqual({ foo: 'bar', baz: 'qux' });
	expect(data).toEqual({ foo: 'bar' });
});
```

And dry-run validator:

```ts
it('testPatch should validate without mutating', () => {
	const data = { foo: 'bar' };
	expect(() =>
		testPatch(data, [{ op: 'test', path: '/foo', value: 'bar' }]),
	).not.toThrow();
	expect(data).toEqual({ foo: 'bar' });

	expect(() =>
		testPatch(data, [{ op: 'test', path: '/foo', value: 'nope' }]),
	).toThrow();
	expect(data).toEqual({ foo: 'bar' });
});
```

> Remember to update imports at the top of the file:

```ts
import {
	applyPatch,
	applyWithInverse,
	applyPatchImmutable,
	testPatch,
} from '../patch.js';
```

#### B) Update `packages/jsonpath/patch/src/__tests__/builder.spec.ts`

Replace `.toOperations()` calls with `.build()` to align with docs (keep `.toOperations()` if you want, but the docs already advertise `build()`):

```ts
const patch = builder()
	.add('/a', 1)
	.replace('/b', 2)
	.remove('/c')
	.move('/d', '/e')
	.copy('/f', '/g')
	.test('/h', 3)
	.build();
```

#### C) (Optional) Add atomic behavior test

New file: `packages/jsonpath/patch/src/__tests__/atomic.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { applyPatch } from '../patch.js';

describe('applyPatch atomic option', () => {
	it('should roll back all changes on failure when atomic=true', () => {
		const data = { a: 1 };

		expect(() =>
			applyPatch(
				data,
				[
					{ op: 'add', path: '/b', value: 2 },
					{ op: 'remove', path: '/does-not-exist' },
				],
				{ atomic: true },
			),
		).toThrow();

		expect(data).toEqual({ a: 1 });
	});
});
```

### Conventional commit

```text
feat(patch): mutate-by-default applyPatch + immutable/atomic/validate
```

---

## Step 4 — Merge Patch completion (RFC 7386)

### Current state

- `@jsonpath/merge-patch` already implements `applyMergePatch()` in `packages/jsonpath/merge-patch/src/merge-patch.ts`.
- Tests cover the RFC 7386 examples in `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts`.
- The current implementation is **immutable-by-default** (returns a new object for merge-patch objects, and returns the patch for non-object patches).

### Goals

- Add an explicit **mutable** variant for callers that want in-place mutation (parity with `@jsonpath/patch`’s in-place API direction).
- Keep the existing `applyMergePatch()` behavior unchanged.
- Add tests that lock in mutation vs immutability behavior and a few non-JSON edge cases that occur in JS.

### Checklist

- [ ] Keep `applyMergePatch(target, patch)` behavior as-is
- [ ] Add `applyMergePatchMutable(target, patch)` that mutates object/array roots in-place when the patch is a merge-patch object
- [ ] Ensure deletion behavior (`null` removes key) works identically in both variants
- [ ] Add Vitest coverage for: immutability, mutability, and `undefined` (JS-only) behavior

### Files

- `packages/jsonpath/merge-patch/src/merge-patch.ts` (change)
- `packages/jsonpath/merge-patch/src/index.ts` (optional change: export new symbol)
- `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts` (change)

### Suggested edits

#### 1) Add mutable variant: `packages/jsonpath/merge-patch/src/merge-patch.ts`

Add this new exported function (leave `applyMergePatch()` unchanged):

```ts
/**
 * Mutable variant of JSON Merge Patch (RFC 7386).
 *
 * - If `patch` is not an object (or is null/array), returns `patch` (replacement).
 * - If `patch` is an object, applies changes to the provided `target` object in-place.
 */
export function applyMergePatchMutable(target: any, patch: any): any {
	if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
		return patch;
	}

	if (target === null || typeof target !== 'object' || Array.isArray(target)) {
		// RFC 7386: if target is not an object, treat it as an empty object
		target = {};
	}

	for (const key of Object.keys(patch)) {
		const value = patch[key];
		if (value === null) {
			delete target[key];
			continue;
		}

		const current = target[key];
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			// merge-patch object: recurse
			target[key] = applyMergePatchMutable(current, value);
		} else {
			// primitives/arrays replace
			target[key] = value;
		}
	}

	return target;
}
```

#### 2) Export from index: `packages/jsonpath/merge-patch/src/index.ts`

No change needed if using `export * from './merge-patch.js';` (it will pick up the new export).

### Tests

#### Update: `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts`

Add tests to lock in immutability vs mutability:

```ts
import { describe, it, expect } from 'vitest';
import { applyMergePatch, applyMergePatchMutable } from '../merge-patch.js';

describe('JSON Merge Patch', () => {
	it('applyMergePatch should not mutate object targets', () => {
		const target = { a: { b: 1 }, c: 2 };
		const out = applyMergePatch(target, { a: { b: 2 } });

		expect(out).toEqual({ a: { b: 2 }, c: 2 });
		expect(out).not.toBe(target);
		expect(target).toEqual({ a: { b: 1 }, c: 2 });
	});

	it('applyMergePatchMutable should mutate object targets in-place', () => {
		const target: any = { a: { b: 1 }, c: 2 };
		const out = applyMergePatchMutable(target, { a: { b: 2 }, c: null });

		expect(out).toBe(target);
		expect(target).toEqual({ a: { b: 2 } });
	});

	it('JS-only: undefined in patch sets property to undefined', () => {
		const target: any = { a: 1 };
		const out = applyMergePatch(target, { a: undefined });
		expect(out).toHaveProperty('a', undefined);
	});
});
```

### Conventional commit

```text
feat(merge-patch): add mutable merge patch variant
```

---

## Step 5 — RFC 9535 evaluator/result normalization

### Current state

- `@jsonpath/evaluator` currently returns:
  - `QueryResult#pointers(): string[]` (RFC 6901 strings)
  - `QueryResult#normalizedPaths(): string[]` (RFC 9535 “Normalized Path” strings)
  - `QueryResult#paths(): PathSegment[][]` (segment arrays)
  - `QueryResult#nodes(): QueryNode[]` (rich node objects)

### Goals

- Make **pointer data first-class** by returning `JSONPointer` objects (from `@jsonpath/pointer`).
- Provide a result API that is easier to consume:
  - `nodes()` returns `{ value, pointer }[]` for the common case
  - `paths()` returns normalized JSONPath strings
  - Provide `segments()` for the segment arrays
- Extract and export a `normalizePath()` helper (and a small options object).

### Checklist

- [ ] Add `normalizePath()` helper (exported)
- [ ] Update `QueryResult` type contract in `@jsonpath/core` to support pointer objects without importing `@jsonpath/pointer`
- [ ] Update evaluator `QueryResult` implementation to:
  - return `JSONPointer[]` from `pointers()`
  - return normalized JSONPath strings from `paths()`
  - return `{ value, pointer }[]` from `nodes()`
  - keep a compatibility surface for existing callers (documented below)
- [ ] Update facade + transform callers to use pointer objects
- [ ] Add Vitest coverage for normalization and for the new methods

### Files

- `packages/jsonpath/core/src/types.ts` (change)
- `packages/jsonpath/core/src/__tests__/types.spec.ts` (change)
- `packages/jsonpath/evaluator/src/query-result.ts` (change)
- `packages/jsonpath/evaluator/src/index.ts` (optional change: export normalizePath)
- `packages/jsonpath/evaluator/src/__tests__/query-result.spec.ts` (new)
- `packages/jsonpath/jsonpath/src/facade.ts` (change; Step 7 also touches)
- `packages/jsonpath/jsonpath/src/transform.ts` (change; Step 7 also touches)

### Suggested edits

#### 1) Update the core `QueryResult` contract: `packages/jsonpath/core/src/types.ts`

To avoid introducing a dependency from `@jsonpath/core` → `@jsonpath/pointer`, make the pointer type a generic.

Replace the current `QueryResult` interface with this shape:

```ts
export interface QueryResultNode<TValue = unknown, TPointer = unknown> {
	readonly value: TValue;
	readonly pointer: TPointer;
}

export interface QueryResult<T = unknown, TPointer = string> extends Iterable<
	QueryNode<T>
> {
	values: () => T[];

	/** Segment arrays (previously `paths()`) */
	segments: () => PathSegment[][];

	/** RFC 9535 normalized paths (previously `normalizedPaths()`) */
	paths: () => string[];

	/** RFC 6901 pointers */
	pointers: () => TPointer[];

	/** Common-case nodes for consumers */
	nodes: () => QueryResultNode<T, TPointer>[];

	/** Rich nodes (existing shape) */
	rawNodes: () => QueryNode<T>[];

	first: () => QueryNode<T> | undefined;
	last: () => QueryNode<T> | undefined;
	isEmpty: () => boolean;
	readonly length: number;
	map: <U>(fn: (value: T, node: QueryNode<T>) => U) => U[];
	filter: (
		fn: (value: T, node: QueryNode<T>) => boolean,
	) => QueryResult<T, TPointer>;
	forEach: (fn: (value: T, node: QueryNode<T>) => void) => void;
	parents: () => QueryResult<unknown, TPointer>;

	/**
	 * Back-compat shim: keep `normalizedPaths()` for existing callers.
	 * (Implementation should delegate to `paths()`.)
	 */
	normalizedPaths: () => string[];

	/**
	 * Back-compat shim: keep `paths()`-as-segments behavior via a renamed method.
	 * Callers should move to `segments()`.
	 */
	// NOTE: do not reintroduce `paths(): PathSegment[][]` here.
}
```

This is a breaking change at the type level, but the intent is to keep runtime behavior easy to migrate:

- Old `paths(): PathSegment[][]` → new `segments(): PathSegment[][]`
- Old `normalizedPaths(): string[]` → new `paths(): string[]` (and keep `normalizedPaths()` as an alias)
- Old `pointers(): string[]` → new `pointers(): JSONPointer[]` in evaluator
- Old `nodes(): QueryNode[]` → new `rawNodes(): QueryNode[]` (and `nodes()` becomes the simplified form)

#### 2) Extract `normalizePath()` and update evaluator result: `packages/jsonpath/evaluator/src/query-result.ts`

**A) Add import for pointer objects**

```ts
import { JSONPointer } from '@jsonpath/pointer';
```

**B) Replace internal helpers with exported `normalizePath()`**

Add near the top (new types + helper):

```ts
export interface NormalizePathOptions {
	/** Root symbol for normalized paths (default: '$') */
	readonly rootSymbol?: '$' | '@';
}

export function normalizePath(
	path: readonly PathSegment[],
	options: NormalizePathOptions = {},
): string {
	const { rootSymbol = '$' } = options;
	let out = rootSymbol;
	for (const seg of path) {
		if (typeof seg === 'number') {
			out += `[${seg}]`;
		} else {
			out += `['${escapeNormalizedPathName(seg)}']`;
		}
	}
	return out;
}

function pathToPointerObject(path: readonly PathSegment[]): JSONPointer {
	if (path.length === 0) return new JSONPointer('');
	return new JSONPointer(
		path.map((seg) => (typeof seg === 'number' ? String(seg) : seg)),
	);
}
```

**C) Update `QueryResult` methods (changed functions only)**

Update the class to implement the new core interface:

```ts
export class QueryResult<T = unknown> implements CoreQueryResult<
	T,
	JSONPointer
> {
	constructor(
		private readonly results: QueryResultNode<T>[],
		private readonly options: NormalizePathOptions = {},
	) {}

	values(): T[] {
		return this.results.map((r) => r.value);
	}

	segments(): PathSegment[][] {
		return this.results.map((r) => [...r.path]);
	}

	paths(): string[] {
		return this.results.map((r) => normalizePath(r.path, this.options));
	}

	normalizedPaths(): string[] {
		return this.paths();
	}

	pointers(): JSONPointer[] {
		return this.results.map((r) => pathToPointerObject(r.path));
	}

	nodes(): Array<{ value: T; pointer: JSONPointer }> {
		return this.results.map((r) => ({
			value: r.value,
			pointer: pathToPointerObject(r.path),
		}));
	}

	rawNodes(): QueryResultNode<T>[] {
		return [...this.results];
	}

	first(): QueryResultNode<T> | undefined {
		return this.results[0];
	}

	last(): QueryResultNode<T> | undefined {
		return this.results[this.results.length - 1];
	}

	isEmpty(): boolean {
		return this.results.length === 0;
	}

	get length(): number {
		return this.results.length;
	}

	map<U>(fn: (value: T, node: QueryResultNode<T>) => U): U[] {
		return this.results.map((n) => fn(n.value, n));
	}

	filter(fn: (value: T, node: QueryResultNode<T>) => boolean): QueryResult<T> {
		return new QueryResult(
			this.results.filter((n) => fn(n.value, n)),
			this.options,
		);
	}

	forEach(fn: (value: T, node: QueryResultNode<T>) => void): void {
		for (const n of this.results) fn(n.value, n);
	}

	parents(): QueryResult {
		const seen = new Set<string>();
		const parentNodes: QueryResultNode[] = [];

		for (const n of this.results) {
			if (n.parent === undefined) continue;
			const parentPath = n.path.slice(0, -1);
			const key = pathToPointerObject(parentPath).toString();
			if (seen.has(key)) continue;
			seen.add(key);

			parentNodes.push({
				value: n.parent,
				path: parentPath,
				root: n.root,
			});
		}

		return new QueryResult(parentNodes, this.options);
	}

	[Symbol.iterator](): Iterator<QueryResultNode<T>> {
		return this.results[Symbol.iterator]();
	}
}
```

**D) Keep iterator semantics**

Keep `[Symbol.iterator]()` as-is (it should still iterate rich `QueryNode`s).

#### 3) Export helper: `packages/jsonpath/evaluator/src/index.ts`

Add:

```ts
export { normalizePath, type NormalizePathOptions } from './query-result.js';
```

### Tests

#### New file: `packages/jsonpath/evaluator/src/__tests__/query-result.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../index.js';

describe('QueryResult normalization', () => {
	it('paths() should return RFC 9535 normalized paths', () => {
		const data = { a: { b: [10, 20] } };
		const ast = parse('$.a.b[1]');
		const result = evaluate(data, ast);
		expect(result.paths()).toEqual(["$['a']['b'][1]"]);
		expect(result.normalizedPaths()).toEqual(["$['a']['b'][1]"]);
	});

	it('pointers() should return JSONPointer objects', () => {
		const data = { a: { b: [10, 20] } };
		const ast = parse('$.a.b[1]');
		const result = evaluate(data, ast);
		const ptr = result.pointers()[0]!;
		expect(ptr.toString()).toBe('/a/b/1');
	});

	it('nodes() should return {value,pointer}', () => {
		const data = { a: { b: [10, 20] } };
		const ast = parse('$.a.b[1]');
		const result = evaluate(data, ast);
		const node = result.nodes()[0]!;
		expect(node.value).toBe(20);
		expect(node.pointer.toString()).toBe('/a/b/1');
	});
});
```

#### Update: `packages/jsonpath/core/src/__tests__/types.spec.ts`

Update the `QueryResult` shape expectations to match the new interface:

```ts
import { describe, it, expect } from 'vitest';
import type { QueryNode, QueryResult } from '../types.js';

describe('types', () => {
	it('should allow creating a QueryNode', () => {
		const node: QueryNode<number> = {
			value: 42,
			path: ['a', 0],
			root: { a: [42] },
			parent: [42],
			parentKey: 0,
		};

		expect(node.value).toBe(42);
		expect(node.path).toEqual(['a', 0]);
		expect(node.parentKey).toBe(0);
	});

	it('should define QueryResult interface structure', () => {
		const mockResult: Partial<QueryResult<number>> = {
			length: 1,
			isEmpty: () => false,
			values: () => [42],
			segments: () => [['a']],
			paths: () => ["$['a']"],
			normalizedPaths: () => ["$['a']"],
			pointers: () => ['/a'],
			nodes: () => [{ value: 42, pointer: '/a' } as any],
			rawNodes: () => [{ value: 42, path: ['a'], root: {} } as any],
		};

		expect(mockResult.length).toBe(1);
		expect(mockResult.isEmpty?.()).toBe(false);
		expect(mockResult.values?.()).toEqual([42]);
	});
});
```

### Conventional commit

```text
feat(evaluator): return JSONPointer objects + normalized result helpers
```

---

## Step 6 — Function registry unification

### Current state

- The _actual_ registry (Map + `getFunction()`/`registerFunction()`) lives in `@jsonpath/core` at `packages/jsonpath/core/src/registry.ts`.
- `@jsonpath/functions` currently defines and registers built-ins (in `packages/jsonpath/functions/src/registry.ts`) by calling `registerFunction()` from `@jsonpath/core`.
- `@jsonpath/evaluator` imports `@jsonpath/functions` for side-effect registration but still calls `getFunction()` from `@jsonpath/core`.

### Goals

- Make `@jsonpath/functions` the **source-of-truth import surface** for function lookup and registration.
- Avoid introducing a dependency from `@jsonpath/core` → `@jsonpath/functions`.
- Preserve `getFunction()` compatibility for existing callers.

### Checklist

- [ ] Re-export `getFunction` (and friends) from `@jsonpath/functions`
- [ ] Update evaluator to import `getFunction` from `@jsonpath/functions`
- [ ] Keep `@jsonpath/core` registry implementation unchanged (still the backing store)
- [ ] Add/adjust tests to prove evaluator uses the same registry

### Files

- `packages/jsonpath/functions/src/index.ts` (change)
- `packages/jsonpath/evaluator/src/evaluator.ts` (change)
- `packages/jsonpath/functions/src/__tests__/functions.spec.ts` (optional change)

### Suggested edits

#### 1) Re-export registry API: `packages/jsonpath/functions/src/index.ts`

Add explicit re-exports so consumers can use `@jsonpath/functions` as the single entrypoint:

```ts
export * from './registry.js';

// Re-export core registry API to make @jsonpath/functions the public surface.
export {
	getFunction,
	hasFunction,
	registerFunction,
	unregisterFunction,
	functionRegistry,
} from '@jsonpath/core';
```

#### 2) Update evaluator import surface: `packages/jsonpath/evaluator/src/evaluator.ts`

Replace:

```ts
import '@jsonpath/functions';
import { getFunction } from '@jsonpath/core';
```

With:

```ts
import '@jsonpath/functions';
import { getFunction } from '@jsonpath/functions';
```

This keeps the side-effect registration behavior but makes `@jsonpath/functions` the authoritative import path.

### Tests

No new tests strictly required (current `packages/jsonpath/functions/src/__tests__/functions.spec.ts` already exercises `getFunction()`), but if you want to lock the unification intent in:

#### Update: `packages/jsonpath/functions/src/__tests__/functions.spec.ts`

Change the import:

```ts
-import { getFunction } from '@jsonpath/core';
+import { getFunction } from '@jsonpath/functions';
```

### Conventional commit

```text
refactor(functions): make @jsonpath/functions the registry entrypoint
```

---

## Step 7 — Facade enhancements and remaining gaps

### Current state

- `@jsonpath/jsonpath` already provides:
  - Query API: `query`, `queryValues`, `queryPaths` (normalized paths), `compileQuery`, `value`, `exists`, `count`, `stream`, `match`.
  - Cache API: `clearCache()` and `getCacheStats()` in `packages/jsonpath/jsonpath/src/cache.ts` (exported via `src/index.ts`).
  - Transform API: `transform`, `project`, `pick`, `omit` in `packages/jsonpath/jsonpath/src/transform.ts` (exported via `src/index.ts`).

Noted deltas to address:

- `transform()` and `omit()` currently build JSON Patch paths from JSONPath strings/segments in ways that do **not** line up with JSON Patch’s requirement for JSON Pointer paths.
- There is no simple `first()` helper (though `value()` exists).
- Runtime validation is parse-only (`validateQuery()`); facade does not validate options/inputs.

### Goals

- Ensure transform utilities generate **correct JSON Patch operations** by using JSON Pointer strings.
- Add small convenience methods (`first`, `clearCache`, `getCacheStats`) on the facade surface (thin wrappers).
- Add lightweight runtime validation helpers without adding new dependencies.

### Checklist

- [ ] Fix `transform()` to use `QueryResult#nodes()` / `pointer.toString()` for JSON Patch paths
- [ ] Fix `omit()` to remove by pointer paths (not normalized JSONPath strings)
- [ ] Add `first()` convenience helper (alias of `value()`)
- [ ] Add `clearCache()` and `getCacheStats()` re-exports from facade (optional; keeps everything accessible from `facade.ts`)
- [ ] Add/extend Vitest tests for `transform` and `omit`

### Files

- `packages/jsonpath/jsonpath/src/facade.ts` (change)
- `packages/jsonpath/jsonpath/src/transform.ts` (change)
- `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts` (change)
- `packages/jsonpath/jsonpath/src/__tests__/integration.spec.ts` (optional change)

### Suggested edits

#### 1) Add facade convenience wrappers: `packages/jsonpath/jsonpath/src/facade.ts`

Add imports at top:

```ts
import { clearCache, getCacheStats } from './cache.js';
```

Add new exports near `value()` / `exists()` / `count()`:

```ts
/** Alias of value() */
export const first = value;

export { clearCache, getCacheStats };
```

#### 2) Fix transform paths: `packages/jsonpath/jsonpath/src/transform.ts`

Update `transform()` to build JSON Patch paths using JSON Pointer strings.

Once Step 5 lands (where `QueryResult#nodes()` returns `{ value, pointer }[]` and `pointer` is a `JSONPointer`), the intended end state for `transform()` is:

```ts
export function transform<T = any>(
	root: T,
	path: string,
	fn: (value: any) => any,
): T {
	const results = query(root, path);
	const patch: PatchOperation[] = results.nodes().map(({ value, pointer }) => ({
		op: 'replace',
		path: pointer.toString(),
		value: fn(value),
	}));

	return applyPatch(root, patch);
}
```

#### 3) Fix omit to remove by pointer: `packages/jsonpath/jsonpath/src/transform.ts`

Replace the remove patch logic with:

```ts
const patch: PatchOperation[] = results.pointers().map((p) => ({
	op: 'remove',
	path: p.toString(),
}));
```

### Tests

#### Update: `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts`

Add a test for `first()`:

```ts
import {
	query,
	queryValues,
	queryPaths,
	compileQuery,
	first,
} from '../facade.js';

it('should execute first()', () => {
	const v = first(data, '$.store.book[0].title');
	expect(v).toBe('Book 1');
});
```

#### Add new tests: `packages/jsonpath/jsonpath/src/__tests__/integration.spec.ts`

Add transform/omit coverage (or create a dedicated `transform.spec.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { transform, omit } from '../transform.js';

describe('transform utilities', () => {
	it('transform should replace matched values', () => {
		const data = { a: { b: [1, 2] } };
		const out = transform(data, '$.a.b[*]', (v) => v * 10);
		expect(out).toEqual({ a: { b: [10, 20] } });
	});

	it('omit should remove matched values', () => {
		const data: any = { a: { b: [1, 2] }, c: 3 };
		const out = omit(data, ["$['c']"]);
		expect(out).toEqual({ a: { b: [1, 2] } });
	});
});
```

### Conventional commit

```text
fix(jsonpath): align transform/omit with JSON Pointer patch paths
```

---

## Step 8 — New schema validation package (`packages/jsonpath/schema/*`)

### Goals

- Create a **minimal, dependency-free schema validation adapter** layer.
- Keep `@jsonpath/*` free of a hard dependency on any specific JSON Schema library (Ajv, etc).
- Provide just enough scaffolding so other packages can depend on _types + contract_ now, and swap validator implementations later.

### Checklist

- [ ] Scaffold new workspace package: `@jsonpath/schema`
- [ ] Define minimal public types: schema input type, issues/errors, validation result
- [ ] Implement `createSchemaValidator()` wrapper that delegates to a provided adapter
- [ ] Provide a safe default behavior when no adapter is configured (throw a clear error)
- [ ] Add Vitest coverage for adapter delegation + error surface

### File operations

- Create: `packages/jsonpath/schema/package.json`
- Create: `packages/jsonpath/schema/tsconfig.json`
- Create: `packages/jsonpath/schema/vite.config.ts`
- Create: `packages/jsonpath/schema/vitest.config.ts`
- Create: `packages/jsonpath/schema/.eslintrc.cjs`
- Create: `packages/jsonpath/schema/src/index.ts`
- Create: `packages/jsonpath/schema/src/types.ts`
- Create: `packages/jsonpath/schema/src/validator.ts`
- Create: `packages/jsonpath/schema/src/__tests__/validator.spec.ts`

### Suggested implementation

#### 1) New file: `packages/jsonpath/schema/src/types.ts`

```ts
export type JSONSchema = unknown;

export interface SchemaValidationIssue {
	readonly path?: string;
	readonly message: string;
	readonly keyword?: string;
}

export interface SchemaValidationResult {
	readonly valid: boolean;
	readonly issues: readonly SchemaValidationIssue[];
}

export interface SchemaValidatorAdapter {
	/**
	 * Validate `value` against `schema`.
	 *
	 * Implementations should be pure and side-effect free.
	 */
	validate(schema: JSONSchema, value: unknown): SchemaValidationResult;
}

export class SchemaValidationError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message);
		this.name = 'SchemaValidationError';
		if (options?.cause) (this as any).cause = options.cause;
	}
}
```

#### 2) New file: `packages/jsonpath/schema/src/validator.ts`

```ts
import type {
	JSONSchema,
	SchemaValidationResult,
	SchemaValidatorAdapter,
} from './types.js';
import { SchemaValidationError } from './types.js';

export interface SchemaValidator {
	validate(schema: JSONSchema, value: unknown): SchemaValidationResult;
}

class AdapterBackedSchemaValidator implements SchemaValidator {
	constructor(private readonly adapter: SchemaValidatorAdapter) {}

	validate(schema: JSONSchema, value: unknown): SchemaValidationResult {
		try {
			return this.adapter.validate(schema, value);
		} catch (err) {
			throw new SchemaValidationError('Schema validation failed', {
				cause: err,
			});
		}
	}
}

class UnconfiguredSchemaValidator implements SchemaValidator {
	validate(_schema: JSONSchema, _value: unknown): SchemaValidationResult {
		throw new SchemaValidationError(
			'No schema validator configured. Provide a SchemaValidatorAdapter via createSchemaValidator(adapter).',
		);
	}
}

export function createSchemaValidator(
	adapter?: SchemaValidatorAdapter,
): SchemaValidator {
	return adapter
		? new AdapterBackedSchemaValidator(adapter)
		: new UnconfiguredSchemaValidator();
}
```

#### 3) New file: `packages/jsonpath/schema/src/index.ts`

```ts
export * from './types.js';
export * from './validator.js';
```

#### 4) New test file: `packages/jsonpath/schema/src/__tests__/validator.spec.ts`

```ts
import { describe, it, expect, vi } from 'vitest';

import { createSchemaValidator } from '../validator.js';
import type { SchemaValidatorAdapter } from '../types.js';

describe('@jsonpath/schema', () => {
	it('throws a clear error when no adapter is configured', () => {
		const validator = createSchemaValidator();
		expect(() => validator.validate({}, { a: 1 })).toThrow(
			/No schema validator configured/i,
		);
	});

	it('delegates to adapter.validate(schema, value)', () => {
		const adapter: SchemaValidatorAdapter = {
			validate: vi.fn().mockReturnValue({ valid: true, issues: [] }),
		};

		const validator = createSchemaValidator(adapter);
		expect(validator.validate({ any: 'schema' }, { a: 1 })).toEqual({
			valid: true,
			issues: [],
		});
		expect(adapter.validate).toHaveBeenCalledWith({ any: 'schema' }, { a: 1 });
	});
});
```

### Conventional commit

```text
feat(schema): scaffold schema validation adapter package
```

---

## Step 9 — `compat-json-p3` package (drop-in `json-p3` wrapper)

### Goals

- Provide `@jsonpath/compat-json-p3` that is a **drop-in replacement** for the subset of `json-p3` used by `@data-map/core`.
- Match `json-p3` calling conventions where they differ (notably **argument order**).
- Keep the implementation thin: **delegate** to existing `@jsonpath/*` packages.

### Checklist

- [ ] Scaffold new workspace package: `@jsonpath/compat-json-p3`
- [ ] Implement `jsonpath.query(path, data, options?)` by delegating to `@jsonpath/jsonpath.query(data, path, options)`
- [ ] Implement `jsonpatch.apply(ops, target, options?)` by delegating to `@jsonpath/patch` (in-place semantics)
- [ ] Re-export `JSONPointer` from `@jsonpath/pointer`
- [ ] Add parity tests for `query()` result values + pointers + basic patch mutation

### File operations

- Create: `packages/jsonpath/compat-json-p3/package.json`
- Create: `packages/jsonpath/compat-json-p3/tsconfig.json`
- Create: `packages/jsonpath/compat-json-p3/vite.config.ts`
- Create: `packages/jsonpath/compat-json-p3/vitest.config.ts`
- Create: `packages/jsonpath/compat-json-p3/.eslintrc.cjs`
- Create: `packages/jsonpath/compat-json-p3/src/index.ts`
- Create: `packages/jsonpath/compat-json-p3/src/jsonpath.ts`
- Create: `packages/jsonpath/compat-json-p3/src/jsonpatch.ts`
- Create: `packages/jsonpath/compat-json-p3/src/__tests__/compat.spec.ts`

### Suggested implementation

#### 1) New file: `packages/jsonpath/compat-json-p3/src/jsonpath.ts`

```ts
import type { EvaluatorOptions, QueryResult } from '@jsonpath/core';
import * as facade from '@jsonpath/jsonpath';

/**
 * `json-p3`-compatible JSONPath facade.
 *
 * NOTE: json-p3 uses (path, data), while @jsonpath/jsonpath uses (data, path).
 */
export const jsonpath = {
	query(path: string, data: any, options?: EvaluatorOptions): QueryResult {
		return facade.query(data, path, options);
	},

	value(path: string, data: any, options?: EvaluatorOptions): any {
		return facade.value(data, path, options);
	},
};
```

#### 2) New file: `packages/jsonpath/compat-json-p3/src/jsonpatch.ts`

```ts
import type { PatchOperation } from '@jsonpath/patch';
import { applyPatch } from '@jsonpath/patch';

/**
 * `json-p3`-compatible JSON Patch facade.
 *
 * json-p3 mutates the passed target by default.
 *
 * - If Step 3 has landed: `applyPatch()` already mutates by default.
 * - If Step 3 has not landed yet: pass `{ clone: false }` to force in-place.
 */
export const jsonpatch = {
	apply(patch: PatchOperation[], target: any): any {
		return applyPatch(target, patch as any, { clone: false });
	},
};
```

#### 3) New file: `packages/jsonpath/compat-json-p3/src/index.ts`

```ts
export { JSONPointer } from '@jsonpath/pointer';

export { jsonpath } from './jsonpath.js';
export { jsonpatch } from './jsonpatch.js';
```

#### 4) New test file: `packages/jsonpath/compat-json-p3/src/__tests__/compat.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import { jsonpath, jsonpatch, JSONPointer } from '../index.js';
import { query } from '@jsonpath/jsonpath';

describe('@jsonpath/compat-json-p3', () => {
	it('jsonpath.query() matches @jsonpath/jsonpath.query() (arg order)', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };

		const compat = jsonpath.query('$.users[*].name', data);
		const native = query(data, '$.users[*].name');

		expect(compat.values()).toEqual(native.values());
		expect(compat.pointers()).toEqual(native.pointers());
	});

	it('jsonpatch.apply() mutates target in place', () => {
		const target: any = { a: 1 };
		jsonpatch.apply([{ op: 'replace', path: '/a', value: 2 } as any], target);
		expect(target).toEqual({ a: 2 });
	});

	it('re-exports JSONPointer', () => {
		const ptr = new JSONPointer('/a');
		expect(ptr.resolve({ a: 1 } as any)).toBe(1);
	});
});
```

### Conventional commit

```text
feat(compat-json-p3): add json-p3-compatible wrapper package
```

---

## Step 10 — Benchmarks package (`packages/jsonpath/benchmarks/*`)

### Goals

- Add a dedicated workspace package for **repeatable performance benchmarks**.
- Use tooling consistent with the repo: **Vitest bench mode** (preferred) rather than adding new runtime dependencies.
- Provide one example benchmark for query evaluation.

### Checklist

- [ ] Scaffold a new workspace package: `@jsonpath/benchmarks` (recommended to mark as `private`)
- [ ] Add scripts: `bench`, `bench:watch`
- [ ] Add `vitest.config.ts` configured for `*.bench.ts` files
- [ ] Add a single benchmark file (query hot path)

### File operations

- Create: `packages/jsonpath/benchmarks/package.json`
- Create: `packages/jsonpath/benchmarks/tsconfig.json`
- Create: `packages/jsonpath/benchmarks/vitest.config.ts`
- Create: `packages/jsonpath/benchmarks/src/query.bench.ts`

### Suggested implementation

#### 1) New file: `packages/jsonpath/benchmarks/package.json`

```json
{
	"name": "@jsonpath/benchmarks",
	"version": "0.1.0",
	"private": true,
	"type": "module",
	"scripts": {
		"bench": "vitest bench",
		"bench:watch": "vitest bench --watch",
		"lint": "eslint .",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@jsonpath/jsonpath": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vitest": "^4.0.16"
	}
}
```

#### 2) New file: `packages/jsonpath/benchmarks/src/query.bench.ts`

```ts
import { bench, describe } from 'vitest';
import { queryValues } from '@jsonpath/jsonpath';

const data = {
	store: {
		book: Array.from({ length: 1_000 }, (_, i) => ({
			title: `Book ${i}`,
			price: i,
			category: i % 2 === 0 ? 'fiction' : 'reference',
		})),
	},
};

describe('jsonpath queryValues()', () => {
	bench('$.store.book[*].title', () => {
		queryValues(data, '$.store.book[*].title');
	});

	bench('filter: fiction and price < 500', () => {
		queryValues(
			data,
			'$.store.book[?(@.category == "fiction" && @.price < 500)].title',
		);
	});
});
```

### Conventional commit

```text
chore(benchmarks): add vitest bench workspace package
```

---

## Step 11 — Plugin system (interfaces + `PluginManager` + wiring)

### Goals

- Define a **minimal plugin contract** for JSONPath evaluation.
- Add a `PluginManager` that:
  - runs hooks in order,
  - isolates plugin failures (one plugin failing doesn’t prevent others from running),
  - never replaces the primary evaluation error with a plugin error.
- Wire plugin hooks into the evaluator entrypoint.

### Checklist

- [ ] Add core plugin types: `JSONPathPlugin`, hook context types, `PluginManager`
- [ ] Extend evaluator options to accept `plugins?: JSONPathPlugin[]`
- [ ] Wire hooks into `@jsonpath/evaluator.evaluate()` (before/after/error)
- [ ] Add tests covering:
  - hook invocation order
  - isolation (plugin A throws, plugin B still runs)
  - failure handling (evaluation error preserved even if plugin throws)

### File operations

- Create: `packages/jsonpath/core/src/plugins.ts`
- Update: `packages/jsonpath/core/src/index.ts` (export plugins)
- Update: `packages/jsonpath/core/src/types.ts` (add `plugins?: ...` to `EvaluatorOptions`)
- Update: `packages/jsonpath/evaluator/src/evaluator.ts` (wire manager)
- Create: `packages/jsonpath/evaluator/src/__tests__/plugins.spec.ts`

### Suggested implementation

#### 1) New file: `packages/jsonpath/core/src/plugins.ts`

```ts
import type { EvaluatorOptions, QueryResult } from './types.js';

export interface BeforeEvaluateContext {
	readonly root: unknown;
	readonly query: unknown;
	readonly options?: EvaluatorOptions;
}

export interface AfterEvaluateContext {
	readonly result: QueryResult;
}

export interface EvaluateErrorContext {
	readonly error: unknown;
}

export interface JSONPathPlugin {
	readonly name: string;

	beforeEvaluate?(ctx: BeforeEvaluateContext): void;
	afterEvaluate?(ctx: AfterEvaluateContext): void;
	onError?(ctx: EvaluateErrorContext): void;
}

export class PluginManager {
	constructor(private readonly plugins: readonly JSONPathPlugin[]) {}

	static from(options?: {
		plugins?: readonly JSONPathPlugin[];
	}): PluginManager {
		return new PluginManager(options?.plugins ?? []);
	}

	beforeEvaluate(ctx: BeforeEvaluateContext): void {
		this.run('beforeEvaluate', ctx);
	}

	afterEvaluate(ctx: AfterEvaluateContext): void {
		this.run('afterEvaluate', ctx);
	}

	onError(ctx: EvaluateErrorContext): void {
		this.run('onError', ctx);
	}

	private run(
		hook: 'beforeEvaluate' | 'afterEvaluate' | 'onError',
		ctx: any,
	): void {
		for (const plugin of this.plugins) {
			const fn = (plugin as any)[hook];
			if (!fn) continue;
			try {
				fn.call(plugin, ctx);
			} catch {
				// Isolation rule: plugin failures never break evaluation or mask errors.
				// (We intentionally swallow here. If we later want observability, add a
				// dedicated "reporter" plugin rather than changing core behavior.)
			}
		}
	}
}
```

#### 2) Update exports: `packages/jsonpath/core/src/index.ts`

Add:

```ts
export * from './plugins.js';
```

#### 3) Update options type: `packages/jsonpath/core/src/types.ts`

Extend `EvaluatorOptions`:

```ts
import type { JSONPathPlugin } from './plugins.js';

export interface EvaluatorOptions {
	// ...existing fields...
	readonly plugins?: readonly JSONPathPlugin[];
}
```

#### 4) Wire into evaluator: `packages/jsonpath/evaluator/src/evaluator.ts`

Key glue (minimal):

```ts
import { PluginManager } from '@jsonpath/core';

class Evaluator {
	private readonly plugins: PluginManager;

	constructor(root: any, options?: EvaluatorOptions) {
		this.root = root;
		this.options = withDefaults(options);
		this.plugins = PluginManager.from({ plugins: options?.plugins });
	}

	public evaluate(ast: QueryNode): QueryResult {
		this.plugins.beforeEvaluate({
			root: this.root,
			query: ast,
			options: this.options,
		});
		try {
			// ...existing evaluation...
			const result = new QueryResult(currentNodes);
			this.plugins.afterEvaluate({ result });
			return result;
		} catch (error) {
			this.plugins.onError({ error });
			throw error;
		}
	}
}
```

#### 5) New test file: `packages/jsonpath/evaluator/src/__tests__/plugins.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../evaluator.js';

describe('plugins', () => {
	it('runs hooks and isolates plugin failures', () => {
		const calls: string[] = [];

		const okPlugin = {
			name: 'ok',
			beforeEvaluate: () => calls.push('ok:before'),
			afterEvaluate: () => calls.push('ok:after'),
		};
		const badPlugin = {
			name: 'bad',
			beforeEvaluate: () => {
				calls.push('bad:before');
				throw new Error('boom');
			},
			afterEvaluate: () => calls.push('bad:after'),
		};

		const ast = parse('$.a');
		const result = evaluate({ a: 1 }, ast, {
			plugins: [okPlugin as any, badPlugin as any],
		});

		expect(result.values()).toEqual([1]);
		// ok plugin should still run even if bad plugin throws.
		expect(calls).toContain('ok:before');
		expect(calls).toContain('ok:after');
		// bad plugin was invoked
		expect(calls).toContain('bad:before');
	});

	it('preserves evaluation errors even if plugin onError throws', () => {
		const ast = parse('$.a');
		expect(() =>
			evaluate(null, ast, {
				plugins: [
					{
						name: 'error-plugin',
						onError: () => {
							throw new Error('plugin-error');
						},
					} as any,
				],
			}),
		).toThrow();
	});
});
```

### Conventional commit

```text
feat(plugins): add plugin manager + evaluator hook integration
```

---

## Step 12 — Docs (structure + keeping examples tested)

### Goals

- Add documentation for the new integration surfaces:
  - schema validation (`@jsonpath/schema`)
  - json-p3 compatibility (`@jsonpath/compat-json-p3`)
  - plugin system
  - benchmarks
- Keep code examples **executable and tested** so docs don’t drift.

### Checklist

- [ ] Add docs pages under `packages/jsonpath/docs/` describing each integration surface
- [ ] Move any non-trivial code examples into `.ts` files (not inline-only in Markdown)
- [ ] Add a Vitest “examples smoke” test that imports and runs the example modules
- [ ] Ensure docs reference the example files by path, so edits are naturally coupled

### File operations (proposal)

- Create: `packages/jsonpath/docs/guides/compat-json-p3.md`
- Create: `packages/jsonpath/docs/guides/plugins.md`
- Create: `packages/jsonpath/docs/guides/schema-validation.md`
- Create: `packages/jsonpath/docs/guides/benchmarks.md`

Tested examples (recommended pattern):

- Create: `packages/jsonpath/jsonpath/examples/compat-json-p3.ts`
- Create: `packages/jsonpath/jsonpath/examples/plugins.ts`
- Create: `packages/jsonpath/jsonpath/examples/schema-validation.ts`
- Create: `packages/jsonpath/jsonpath/src/__tests__/examples.spec.ts`

### Suggested implementation

#### 1) Example module: `packages/jsonpath/jsonpath/examples/compat-json-p3.ts`

```ts
import { jsonpath } from '@jsonpath/compat-json-p3';

export function runCompatExample(): string[] {
	const data = { users: [{ name: 'A' }, { name: 'B' }] };
	const result = jsonpath.query('$.users[*].name', data);
	return result.values();
}
```

#### 2) Test harness: `packages/jsonpath/jsonpath/src/__tests__/examples.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import { runCompatExample } from '../../examples/compat-json-p3.js';

describe('docs examples', () => {
	it('compat-json-p3 example runs', () => {
		expect(runCompatExample()).toEqual(['A', 'B']);
	});
});
```

### Conventional commit

```text
docs(jsonpath): add integration guides with tested examples
```

---

## Step 13 — `@data-map/core` integration tests (json-p3 parity)

### Goals

- Add a focused integration spec proving `@jsonpath/compat-json-p3` is a viable drop-in for the `json-p3` subset `@data-map/core` depends on.
- Compare outputs for the key patterns used by DataMap:
  - query → values
  - query → pointers
  - recursive descent
  - JSON Pointer resolve/exists
  - JSON Patch apply (in-place)

### Checklist

- [ ] Add dev dependency: `@jsonpath/compat-json-p3` (workspace)
- [ ] Update `packages/data-map/core/vitest.config.ts` to alias `@jsonpath/*` packages to their `src/index.ts` (so tests don’t depend on build artifacts)
- [ ] Add `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts`
- [ ] Ensure the suite runs alongside existing compliance tests

### File operations

- Update: `packages/data-map/core/package.json` (devDependencies)
- Update: `packages/data-map/core/vitest.config.ts` (workspace aliases)
- Create: `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts`

### Suggested implementation

#### 1) Update: `packages/data-map/core/package.json`

Add to `devDependencies`:

```json
{
	"@jsonpath/compat-json-p3": "workspace:*"
}
```

#### 2) Update: `packages/data-map/core/vitest.config.ts`

Extend resolve aliases (keep existing coverage thresholds):

```ts
import path from 'path';

export default defineConfig({
	...base,
	resolve: {
		alias: {
			'@jsonpath/compat-json-p3': path.resolve(
				__dirname,
				'../../jsonpath/compat-json-p3/src/index.ts',
			),
			'@jsonpath/jsonpath': path.resolve(
				__dirname,
				'../../jsonpath/jsonpath/src/index.ts',
			),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../../jsonpath/evaluator/src/index.ts',
			),
			'@jsonpath/parser': path.resolve(
				__dirname,
				'../../jsonpath/parser/src/index.ts',
			),
			'@jsonpath/lexer': path.resolve(
				__dirname,
				'../../jsonpath/lexer/src/index.ts',
			),
			'@jsonpath/functions': path.resolve(
				__dirname,
				'../../jsonpath/functions/src/index.ts',
			),
			'@jsonpath/compiler': path.resolve(
				__dirname,
				'../../jsonpath/compiler/src/index.ts',
			),
			'@jsonpath/core': path.resolve(
				__dirname,
				'../../jsonpath/core/src/index.ts',
			),
			'@jsonpath/pointer': path.resolve(
				__dirname,
				'../../jsonpath/pointer/src/index.ts',
			),
			'@jsonpath/patch': path.resolve(
				__dirname,
				'../../jsonpath/patch/src/index.ts',
			),
		},
	},
});
```

#### 3) New test file: `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import {
	jsonpath as p3Jsonpath,
	jsonpatch as p3Jsonpatch,
	JSONPointer as P3JSONPointer,
} from 'json-p3';
import {
	jsonpath as compatJsonpath,
	jsonpatch as compatJsonpatch,
	JSONPointer as CompatJSONPointer,
} from '@jsonpath/compat-json-p3';

describe('jsonpath integration parity (json-p3 vs @jsonpath/compat-json-p3)', () => {
	it('query values match for common patterns', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		expect(p3Jsonpath.query('$.users[*].name', data).values()).toEqual(
			compatJsonpath.query('$.users[*].name', data).values(),
		);
	});

	it('query pointers match for common patterns', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		expect(p3Jsonpath.query('$.users[*].name', data).pointers()).toEqual(
			compatJsonpath.query('$.users[*].name', data).pointers(),
		);
	});

	it('supports recursive descent', () => {
		const data = { a: { b: { name: 'x' } }, c: { name: 'y' } };
		const p3 = p3Jsonpath.query('$..name', data).values().slice().sort();
		const compat = compatJsonpath
			.query('$..name', data)
			.values()
			.slice()
			.sort();
		expect(p3).toEqual(compat);
	});

	it('JSONPointer resolve/exists are compatible', () => {
		const data: any = { a: { b: [1, 2] } };
		const p3 = new P3JSONPointer('/a/b/1');
		const compat = new CompatJSONPointer('/a/b/1');
		expect(p3.resolve(data)).toEqual(compat.resolve(data));
		expect(p3.exists(data)).toEqual(compat.exists(data));
	});

	it('jsonpatch.apply mutates target in place', () => {
		const ops: any[] = [{ op: 'replace', path: '/a', value: 2 }];

		const p3Target: any = { a: 1 };
		const compatTarget: any = { a: 1 };

		p3Jsonpatch.apply(ops as any, p3Target);
		compatJsonpatch.apply(ops as any, compatTarget);

		expect(p3Target).toEqual(compatTarget);
	});
});
```

### Conventional commit

```text
test(data-map): add json-p3 vs compat-json-p3 integration parity suite
```
