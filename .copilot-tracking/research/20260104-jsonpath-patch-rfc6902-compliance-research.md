<!-- markdownlint-disable-file -->

# Task Research Notes: RFC 6902 compliance testing for @jsonpath/patch

## Research Executed

### File Analysis

- plans/jsonpath-patch-rfc-compliance/plan.md
  - Defines 5-step plan: add `json-patch-tests` as devDependency, add TS fixtures types, loader utility, Vitest runner, and docs updates.
- package.json
  - Monorepo uses `pnpm@9.12.2`, `turbo`, Node engine `^24.12.0`, root `postinstall` downloads `jsonpath-compliance-test-suite` into `node_modules/`.
- turbo.json
  - Turbo tasks include `test` (no dependsOn), `test:coverage` depends on `^build`.
- packages/jsonpath/patch/package.json
  - `@jsonpath/patch` uses `type: module`, exports `./dist/index.js`, tests run via `vitest run`.
- packages/jsonpath/patch/src/index.ts
  - Re-exports patch, diff, builder modules.
- packages/jsonpath/patch/src/patch.ts
  - Exports `PatchOperation`, `ApplyOptions`, `applyPatch()`, `applyWithInverse()`.
  - Uses `JSONPatchError` + wraps `JSONPathError` with metadata.
  - Default `options.clone = true` via JSON stringify/parse.
- packages/jsonpath/patch/src/**tests**/\*
  - Existing unit tests use `vitest` with `expect(...).toEqual(...)` and `expect(() => ...).toThrow()` patterns.
- packages/jsonpath/evaluator/src/**tests**/compliance.spec.ts
  - Existing “compliance tests” harness pattern for RFC 9535 (JSONPath) using downloaded `node_modules/jsonpath-compliance-test-suite/cts.json`.
- scripts/node/download-compliance-tests.mjs
  - Root `postinstall` clones `jsonpath-standard/jsonpath-compliance-test-suite` into `node_modules/jsonpath-compliance-test-suite`.

### Code Search Results

- jsonpath-compliance-test-suite
  - Found in packages/jsonpath/evaluator/src/**tests**/compliance.spec.ts (hard-coded relative path to root node_modules).
- spec_tests / tests.json / json-patch-tests
  - Present locally under the `@jsonpath/patch` workspace node_modules:
    - `packages/jsonpath/patch/node_modules/json-patch-test-suite/spec_tests.json`
    - `packages/jsonpath/patch/node_modules/json-patch-test-suite/tests.json`
  - Upstream repository URL: `https://github.com/json-patch/json-patch-tests`
  - Upstream package name (from upstream package.json): `json-patch-test-suite` (not `json-patch-tests`).
- workspace:\* / external git deps
  - `workspace:*` is used extensively for internal package dependencies.
  - No existing `github:` / `git+https:` dependencies were found in initial `package.json` scans; external compliance suite currently arrives via `postinstall` script clone.

### External Research

- #githubRepo:"json-patch/json-patch-tests README test format"
  - Test format: each test file is a JSON array of records with fields `doc`, `patch`, optional `expected` or `error`, optional `comment`, optional `disabled`; comment-only records are allowed.

### Project Conventions

- Standards referenced: pnpm workspace filters, Turborepo task orchestration, Vitest as primary runner for packages, ESM (`type: module`) packages with `import.meta.url` usage.
- Instructions followed: repo workspace constraints (`workspace:*`), prefer Vitest in packages, avoid cross-workspace `cd`, and mirror existing compliance harness structure from evaluator.

## Key Discoveries

### Project Structure

- Monorepo toolchain:
  - `pnpm@9.12.2` via root `packageManager`.
  - `turbo` orchestrates tasks (`pnpm test` runs `turbo test -- --passWithNoTests`).
  - Node is pinned: root `engines.node` is `^24.12.0`.
- Test runners:
  - Package-level unit tests generally use Vitest (e.g., `@jsonpath/patch` script `test: vitest run`).
  - The mobile Expo app uses Jest (`jest-expo`) per repo conventions, but JSONPath packages are Vitest-first.
- Compliance-suite precedent:
  - There is already a compliance test downloader for RFC 9535 (`jsonpath-compliance-test-suite`) via root `postinstall`.
  - Evaluator compliance tests load `cts.json` from root node_modules with `fs.existsSync()` gate + “skip” test when missing.

- @jsonpath/patch current state
  - Package metadata
  - Workspace: `packages/jsonpath/patch`
  - Package name: `@jsonpath/patch`
  - Module system: `type: module`
  - Build: Vite library build from `src/index.ts` to `dist/` with preserved modules.
  - Scripts (packages/jsonpath/patch/package.json)
  - `build`: `vite build`
  - `dev`: `vite build --watch`
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `test:coverage`: `vitest run --coverage`
  - `type-check`: `tsgo --noEmit`
  - Dependencies
  - `@jsonpath/core`: `workspace:*`
  - `@jsonpath/pointer`: `workspace:*`
  - DevDependencies
  - Shared configs via `workspace:*`: `@lellimecnar/*-config`
  - Tooling: `vitest`, `vite`, `typescript`, `eslint`, `@types/node`.
  - External RFC 6902 suite already present in workspace node_modules: `json-patch-test-suite`.
  - Entrypoints and exports
  - `src/index.ts` re-exports:
    - `export * from './patch.js'`
    - `export * from './diff.js'`
    - `export * from './builder.js'`
  - Patch application API (src/patch.ts)
    - `export type PatchOperation = ...` (union of 6 RFC6902 ops)
    - `export interface ApplyOptions { strict?: boolean; clone?: boolean }`
    - `export function applyPatch(target, patch, options?): any`
    - `export function applyWithInverse(target, patch, options?): { result; inverse }`
  - Diff API (src/diff.ts)
    - `export function diff(source, target, options?): PatchOperation[]`
  - Builder API (src/builder.ts)
    - `export class PatchBuilder`
    - `export function builder(): PatchBuilder`
  - Error types used
  - `applyPatch` throws `JSONPatchError` (from `@jsonpath/core`) when wrapping `JSONPathError`.
  - `JSONPatchError` fields: `operationIndex?: number`, `operation?: string`, plus base `path?: string` via `JSONPathError`.
  - Existing tests
  - Location: `packages/jsonpath/patch/src/__tests__/`
  - Files: `patch.spec.ts`, `diff.spec.ts`, `builder.spec.ts`
  - No `__fixtures__` folder currently.

- Compliance harness precedent (RFC 9535)
  - RFC 9535 compliance runner
  - File: `packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts`
  - Fixture source: root-level `node_modules/jsonpath-compliance-test-suite/cts.json` (downloaded by root `postinstall`).
  - Loader pattern:
    - Compute absolute path with `path.resolve(__dirname, '../../../../../node_modules/...')`.
    - `fs.existsSync(...)` gate.
    - `JSON.parse(fs.readFileSync(...))`.
  - Iteration pattern:
    - `describe('RFC 9535 Compliance Suite', () => { cts.tests.forEach(test => it(test.name, ...)) })`.
  - Skip logic:
    - If file missing, define a `describe` with a single `it('should skip if ... is missing', () => console.warn(...))`.
  - Assertion patterns for unknown JSON:
    - `expect(actual).toEqual(expected)` for exact expected arrays.
    - `expect(expectedAlternatives).toContainEqual(actual)` when compliance suite supplies multiple acceptable results.
  - Failure reporting:
    - Uses Vitest’s standard assertion messages (no custom reporter, no snapshots).

### Implementation Patterns

- `@jsonpath/patch` public API surface (from exports + src):
  - `applyPatch(target, patch, options?)` returns patched document; default clone is true.
  - `applyWithInverse(target, patch, options?)` returns `{ result, inverse }`.
  - `PatchOperation` union includes standard RFC6902 ops with `path`/`from`/`value` shapes.
  - `diff(source, target)` generates patch operations.
  - `PatchBuilder` fluent API via `builder()`.
- Error model:
  - `applyPatch` wraps `JSONPathError` into `JSONPatchError` and includes `operationIndex`, `operation`, and `path` metadata.
  - `JSONPatchError` extends `JSONPathError` and uses error code `PATCH_ERROR`.
- Test assertion conventions:
  - Equality: `expect(actual).toEqual(expected)` for JSON-shaped outputs.
  - Error: `expect(() => fn()).toThrow()`; no snapshot usage in `@jsonpath/patch` tests.

### Complete Examples

```typescript
// packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts
// Existing compliance harness pattern for RFC 9535
// - Loads fixture JSON only if file exists
// - Generates tests dynamically
// - Provides a single "skip" test if missing

const ctsPath = path.resolve(
	__dirname,
	'../../../../../node_modules/jsonpath-compliance-test-suite/cts.json',
);

if (fs.existsSync(ctsPath)) {
	const cts: TestSuite = JSON.parse(fs.readFileSync(ctsPath, 'utf-8'));

	describe('RFC 9535 Compliance Suite', () => {
		cts.tests.forEach((test) => {
			it(test.name, () => {
				// invalid selectors => parse should throw
				// otherwise parse + evaluate, then compare values
			});
		});
	});
} else {
	describe('RFC 9535 Compliance Suite', () => {
		it('should skip if cts.json is missing', () => {
			console.warn('cts.json not found, skipping compliance tests');
		});
	});
}
```

### API and Schema Documentation

- `json-patch-tests` schema (from upstream README):
  - File is a JSON array of test records.
  - Fields:
    - `doc` (required except comment-only records)
    - `patch` (required except comment-only records)
    - `expected` (success expected output)
    - `error` (expected failure)
    - `comment` (string)
    - `disabled` (boolean)
  - Records with only `comment` are allowed.

### Configuration Examples

```json
// packages/jsonpath/patch/package.json (scripts)
{
	"test": "vitest run",
	"test:watch": "vitest",
	"test:coverage": "vitest run --coverage"
}
```

### Technical Requirements

- The plan’s step 3 needs robust fixture resolution under pnpm:
  - pnpm uses a content-addressed store and a `.pnpm/` folder under `node_modules`.
  - When adding `json-patch-tests` as a devDependency for `@jsonpath/patch`, files may be reachable via Node resolution from within the `@jsonpath/patch` workspace.
  - Node 24 supports `import.meta.resolve` in ESM; also `createRequire(import.meta.url)` can be used for `require.resolve`.

- Fixture/package naming and docs constraints:
  - Upstream repo is `json-patch/json-patch-tests`, but its package name is `json-patch-test-suite`.
  - A robust loader should try both candidate folder names to avoid brittleness.
- Workspace already contains the suite in `packages/jsonpath/patch/node_modules/json-patch-test-suite/`.
- `@jsonpath/patch` package.json currently includes `README.md` in `files`, but `packages/jsonpath/patch/README.md` does not exist.
  - Documentation for the package exists under `packages/jsonpath/docs/packages/patch.md`.

## Recommended Approach

Mirror the existing RFC 9535 compliance harness style (gate on fixture existence, dynamic `it()` generation, single skip test when missing), but implement a more robust resolution strategy than evaluator’s hard-coded relative path.

1. Add `json-patch-tests` as a devDependency of `@jsonpath/patch` (per plan step 1).
2. Add strong TS test-fixture types to match upstream format (including comment-only records).
3. Implement a loader that:
   - Resolves JSON files via `import.meta.resolve` (preferred in ESM/Node24).
   - Falls back to `createRequire(import.meta.url).resolve()`.
   - Falls back to searching upward for a `node_modules/json-patch-tests` folder.
4. Add a Vitest runner that:
   - Loads both suites.
   - Skips gracefully when suite missing.
   - Skips `disabled: true` cases.
   - Ignores comment-only records.
   - For success cases: runs `applyPatch(doc, patch, { clone: true })` and compares to `expected` with `toEqual`.
   - For error cases: asserts `applyPatch(...)` throws (optionally also validate thrown error class).

## Implementation Guidance

- **Objectives**: Add RFC 6902 compliance coverage by executing upstream `json-patch-tests` suites inside `@jsonpath/patch` Vitest.
- **Key Tasks**: Step 2 types file; Step 3 loader; Step 4 spec runner; Step 5 docs updates.
- **Dependencies**: `json-patch-tests` installed for tests to run; otherwise tests should “skip”.
- **Success Criteria**: `pnpm --filter @jsonpath/patch test` runs suite when available and does not hard-fail when missing.

- **Step 2 (types)**: Create `packages/jsonpath/patch/src/__tests__/__fixtures__/rfc6902-types.ts`

```ts
export type RFC6902SuiteName = 'spec_tests' | 'tests';

/**
 * Upstream test records are intentionally loose:
 * - "doc" and "patch" are required for executable tests
 * - comment-only records are allowed
 * - error cases often contain malformed/missing fields
 *
 * Keep these types permissive so the loader can parse everything,
 * and the runner can decide whether to skip/execute/expect-throw.
 */
export interface RFC6902TestRecord {
	comment?: string;
	doc?: unknown;
	patch?: unknown;
	expected?: unknown;
	error?: string;
	disabled?: boolean;
}

export interface RFC6902Suite {
	name: RFC6902SuiteName;
	filePath: string;
	records: RFC6902TestRecord[];
}
```

- **Step 3 (loader)**: Create `packages/jsonpath/patch/src/__tests__/__fixtures__/load-rfc-tests.ts`

```ts
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
	RFC6902Suite,
	RFC6902SuiteName,
	RFC6902TestRecord,
} from './rfc6902-types.js';

const require = createRequire(import.meta.url);

function isFilePath(p: string): boolean {
	try {
		return fs.statSync(p).isFile();
	} catch {
		return false;
	}
}

function tryResolveWithImportMeta(specifier: string): string | null {
	try {
		// Node 24 ESM: import.meta.resolve returns a URL string
		// eslint-disable-next-line no-undef
		const resolved = (import.meta as any).resolve(specifier) as string;
		if (resolved.startsWith('file:')) {
			return fileURLToPath(new URL(resolved));
		}
		return resolved;
	} catch {
		return null;
	}
}

function tryResolveWithRequire(specifier: string): string | null {
	try {
		return require.resolve(specifier);
	} catch {
		return null;
	}
}

function* walkUpDirs(fromDir: string): Generator<string> {
	let current = path.resolve(fromDir);
	for (let i = 0; i < 25; i++) {
		yield current;
		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}
}

function findInNodeModules(
	startDir: string,
	pkgName: string,
	fileName: string,
): string | null {
	for (const dir of walkUpDirs(startDir)) {
		const direct = path.join(dir, 'node_modules', pkgName, fileName);
		if (isFilePath(direct)) return direct;

		// pnpm layout fallback: node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/<file>
		const pnpmDir = path.join(dir, 'node_modules', '.pnpm');
		if (!fs.existsSync(pnpmDir)) continue;
		let entries: string[] = [];
		try {
			entries = fs.readdirSync(pnpmDir);
		} catch {
			continue;
		}

		for (const entry of entries) {
			// Common patterns:
			// - json-patch-test-suite@1.1.0
			// - json-patch-test-suite@github.com+json-patch+json-patch-tests@<hash>
			if (!entry.startsWith(`${pkgName}@`)) continue;
			const candidate = path.join(
				pnpmDir,
				entry,
				'node_modules',
				pkgName,
				fileName,
			);
			if (isFilePath(candidate)) return candidate;
		}
	}

	return null;
}

function resolveSuiteFile(
	fileName: 'spec_tests.json' | 'tests.json',
): string | null {
	// The upstream repo is json-patch/json-patch-tests, but the npm package name is json-patch-test-suite.
	const candidatePackages = ['json-patch-test-suite', 'json-patch-tests'];

	for (const pkg of candidatePackages) {
		const byImportMeta = tryResolveWithImportMeta(`${pkg}/${fileName}`);
		if (byImportMeta && isFilePath(byImportMeta)) return byImportMeta;

		const byRequire = tryResolveWithRequire(`${pkg}/${fileName}`);
		if (byRequire && isFilePath(byRequire)) return byRequire;

		// Fallback: walk up from CWD and from this file's folder
		const byCwd = findInNodeModules(process.cwd(), pkg, fileName);
		if (byCwd) return byCwd;

		const hereDir = path.dirname(fileURLToPath(import.meta.url));
		const byHere = findInNodeModules(hereDir, pkg, fileName);
		if (byHere) return byHere;
	}

	return null;
}

function parseSuiteJson(filePath: string): RFC6902TestRecord[] {
	const raw = fs.readFileSync(filePath, 'utf-8');
	const parsed = JSON.parse(raw) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error(`RFC6902 suite JSON is not an array: ${filePath}`);
	}
	return parsed as RFC6902TestRecord[];
}

export function loadRfc6902Suites(): {
	spec: RFC6902Suite;
	tests: RFC6902Suite;
} | null {
	const specPath = resolveSuiteFile('spec_tests.json');
	const testsPath = resolveSuiteFile('tests.json');

	if (!specPath || !testsPath) {
		return null;
	}

	const spec: RFC6902Suite = {
		name: 'spec_tests' satisfies RFC6902SuiteName,
		filePath: specPath,
		records: parseSuiteJson(specPath),
	};

	const tests: RFC6902Suite = {
		name: 'tests' satisfies RFC6902SuiteName,
		filePath: testsPath,
		records: parseSuiteJson(testsPath),
	};

	return { spec, tests };
}
```

- **Step 4 (runner)**: Create `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts`

```ts
import { describe, it, expect } from 'vitest';

import { applyPatch } from '../patch.js';
import { loadRfc6902Suites } from './__fixtures__/load-rfc-tests.js';
import type { RFC6902TestRecord } from './__fixtures__/rfc6902-types.js';

function titleFor(record: RFC6902TestRecord, index: number): string {
	if (record.comment && record.comment.trim().length > 0) {
		return record.comment.trim();
	}
	return `case #${index}`;
}

function cloneJson(value: unknown): any {
	// Node 24 has structuredClone; test fixtures are JSON-safe.
	return structuredClone(value);
}

function runRecord(record: RFC6902TestRecord): void {
	// Comment-only records are allowed upstream
	if (record.doc === undefined || record.patch === undefined) {
		return;
	}

	const doc = cloneJson(record.doc);
	const patch = cloneJson(record.patch);

	const expectsError =
		typeof record.error === 'string' && record.error.length > 0;

	if (expectsError) {
		expect(() => applyPatch(doc, patch as any, { clone: true })).toThrow();
		return;
	}

	if (record.expected === undefined) {
		// Upstream says expected or error; if neither is present, skip silently.
		return;
	}

	const expected = cloneJson(record.expected);
	const result = applyPatch(doc, patch as any, { clone: true });
	// NOTE: toEqual is appropriate for unknown JSON; key order is not significant.
	expect(result).toEqual(expected);
}

const suites = loadRfc6902Suites();

if (!suites) {
	describe('RFC 6902 Compliance Suite (json-patch-test-suite)', () => {
		it('should skip if json-patch-test-suite is missing', () => {
			console.warn(
				'json-patch-test-suite not found, skipping RFC 6902 compliance tests',
			);
		});
	});
} else {
	const { spec, tests } = suites;

	describe('RFC 6902 Compliance Suite (json-patch-test-suite)', () => {
		describe(`spec_tests.json (${spec.records.length} records)`, () => {
			spec.records.forEach((record, index) => {
				const name = titleFor(record, index);
				if (record.disabled) {
					it.skip(name, () => {});
					return;
				}
				// Comment-only record
				if (record.doc === undefined || record.patch === undefined) {
					it.skip(name, () => {});
					return;
				}
				it(name, () => {
					runRecord(record);
				});
			});
		});

		describe(`tests.json (${tests.records.length} records)`, () => {
			tests.records.forEach((record, index) => {
				const name = titleFor(record, index);
				if (record.disabled) {
					it.skip(name, () => {});
					return;
				}
				if (record.doc === undefined || record.patch === undefined) {
					it.skip(name, () => {});
					return;
				}
				it(name, () => {
					runRecord(record);
				});
			});
		});
	});
}
```

- **Step 5 (docs)**:
  - Create `packages/jsonpath/patch/RFC_COMPLIANCE.md`.
  - Since `packages/jsonpath/patch/README.md` is currently missing, either create it (thin link-style README) or add a short “RFC Compliance” section to `packages/jsonpath/docs/packages/patch.md`.

RFC_COMPLIANCE.md suggested content (copy/paste):

````md
# RFC 6902 Compliance: @jsonpath/patch

This package runs the upstream RFC 6902 JSON Patch test suite (`json-patch-test-suite`) as part of its Vitest tests.

## How to run

```bash
pnpm --filter @jsonpath/patch test
```

## Test Suites

- `spec_tests.json`: cases from RFC 6902 Appendix A
- `tests.json`: extended edge cases

## Current Status

Track results here after running tests:

- spec_tests.json: PASS: ** / ** | FAIL: ** / ** | SKIP(disabled/comment-only): \_\_
- tests.json: PASS: ** / ** | FAIL: ** / ** | SKIP(disabled/comment-only): \_\_

## Known Deviations

List any failing cases with a short explanation and the related spec section.

- Example: “Leading zeros in array indices should throw” (RFC 6901/6902 pointer interpretation)
````

README update:

- `packages/jsonpath/patch/README.md` does not currently exist, even though it is listed in `files` in package.json.
- Preferred options:
  1. Create `packages/jsonpath/patch/README.md` as a thin package README that links to `packages/jsonpath/docs/packages/patch.md` and to `RFC_COMPLIANCE.md`.
  2. If the repo intends to avoid per-package READMEs, update `packages/jsonpath/docs/packages/patch.md` with a short “Compliance” section that links to `RFC_COMPLIANCE.md` and shows the test command.

Suggested insertion point for docs (`packages/jsonpath/docs/packages/patch.md`):

- Add a short section near “Features” or after “Installation”:

Doc insertion snippet (copy/paste):

````md
## RFC Compliance

This package runs the upstream RFC 6902 JSON Patch test suite (`json-patch-test-suite`) in CI.

```bash
pnpm --filter @jsonpath/patch test
```

See `packages/jsonpath/patch/RFC_COMPLIANCE.md` for current status.
````

Caveats / notes about json-patch-test-suite (upstream):

- The files are JSON arrays of records.
- Some records are “comment-only” (no `doc`/`patch`) and should be skipped.
- Some records are `disabled: true` and should be skipped.
- Some tests expect errors for malformed patches (e.g., missing `path`, `path: null`, missing `value`, missing `from`).
  - Your runner should treat these as “must throw”, not “must match error string”.
- Some tests exercise root patching using `path: ""` (empty JSON Pointer) for whole-document replacement.
- Some tests are disabled upstream for duplicate JSON member keys (not representable safely in JS objects).
- Error strings are descriptive guidance, not required to match exactly.
