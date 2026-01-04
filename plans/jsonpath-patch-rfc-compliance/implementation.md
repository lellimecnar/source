# jsonpath-patch-rfc-compliance

## Goal

Add RFC 6902 (JSON Patch) spec compliance testing to `@jsonpath/patch` by wiring in the official `json-patch/json-patch-tests` suite (via the published `json-patch-test-suite` package) and running it under Vitest.

## Prerequisites

Make sure that the user is currently on the `master` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from master.

### Step-by-Step Instructions

#### Step 1: Add External Test Suite Dependency

- [x] Run:

```bash
pnpm add -D --filter @jsonpath/patch json-patch-test-suite
```

- [x] Confirm the suite files exist:

```bash
ls -la packages/jsonpath/patch/node_modules/json-patch-test-suite/tests.json
ls -la packages/jsonpath/patch/node_modules/json-patch-test-suite/spec_tests.json
```

- [x] Ensure `packages/jsonpath/patch/package.json` includes the new dev dependency by replacing the file contents with:

```json
{
	"name": "@jsonpath/patch",
	"version": "0.1.0",
	"description": "JSONPath patch implementation",
	"keywords": ["jsonpath", "json", "patch"],
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
		"@jsonpath/pointer": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"json-patch-test-suite": "^1.1.0",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

##### Step 1 Verification Checklist

- [x] `pnpm install` succeeds
- [x] `packages/jsonpath/patch/node_modules/json-patch-test-suite/tests.json` exists
- [x] `packages/jsonpath/patch/node_modules/json-patch-test-suite/spec_tests.json` exists

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-patch): add RFC 6902 test suite dependency

- Add json-patch-test-suite as a devDependency of @jsonpath/patch
- Confirm suite JSON fixtures are available locally for Vitest

completes: step 1 of 5 for jsonpath-patch-rfc-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Create Type Definitions for RFC 6902 Test Cases

- [x] Create `packages/jsonpath/patch/src/__tests__/__fixtures__/rfc6902-types.ts` with:

```typescript
import type { PatchOperation } from '../../patch.js';

export interface RFC6902TestCase {
	comment?: string;
	doc: unknown;
	patch: PatchOperation[];
	expected?: unknown;
	error?: string;
	disabled?: boolean;
}
```

##### Step 2 Verification Checklist

- [x] `pnpm --filter @jsonpath/patch type-check` passes

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-patch): add RFC 6902 fixture types

- Add typed RFC6902 test case interface for loading the upstream suite

completes: step 2 of 5 for jsonpath-patch-rfc-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Create Test Loader Utility

- [x] Create `packages/jsonpath/patch/src/__tests__/__fixtures__/load-rfc-tests.ts` with:

```typescript
import * as fs from 'node:fs';
import { createRequire } from 'node:module';

import type { RFC6902TestCase } from './rfc6902-types.js';

const require = createRequire(import.meta.url);

export type RFC6902SuiteFile = 'spec_tests.json' | 'tests.json';

function resolveSuiteFilePath(file: RFC6902SuiteFile): string | null {
	const candidates = [
		`json-patch-test-suite/${file}`,
		`json-patch-tests/${file}`,
	];

	for (const candidate of candidates) {
		try {
			return require.resolve(candidate);
		} catch {
			// keep trying
		}
	}

	return null;
}

export function loadRFC6902TestCases(
	file: RFC6902SuiteFile,
): RFC6902TestCase[] | null {
	const filePath = resolveSuiteFilePath(file);
	if (!filePath) {
		return null;
	}

	const raw = fs.readFileSync(filePath, 'utf8');
	const parsed = JSON.parse(raw) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(`RFC6902 suite ${file} did not parse to an array`);
	}

	return parsed as RFC6902TestCase[];
}
```

##### Step 3 Verification Checklist

- [x] `pnpm --filter @jsonpath/patch test` can run (it may still fail overall until Step 4 exists)
- [x] In a Node REPL, `require.resolve('json-patch-test-suite/tests.json')` works

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-patch): add RFC 6902 suite loader

- Add a pnpm-resilient loader for json-patch-tests JSON fixtures
- Gracefully returns null when the suite isn’t installed

completes: step 3 of 5 for jsonpath-patch-rfc-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Implement RFC 6902 Compliance Test Runner

- [ ] Create `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts` with:

```typescript
import { describe, it, expect } from 'vitest';

import { applyPatch } from '../patch.js';
import { loadRFC6902TestCases } from './__fixtures__/load-rfc-tests.js';
import type { RFC6902TestCase } from './__fixtures__/rfc6902-types.js';

function formatName(testCase: RFC6902TestCase, index: number): string {
	const comment = testCase.comment?.trim();
	return comment ? `${index}: ${comment}` : `${index}`;
}

function runSuite(label: string, cases: RFC6902TestCase[]): void {
	describe(label, () => {
		cases.forEach((testCase, index) => {
			const name = formatName(testCase, index);

			if (testCase.disabled) {
				it.skip(name, () => {});
				return;
			}

			// Some upstream entries can be comment-only; skip safely.
			if (!('doc' in testCase) || !('patch' in testCase)) {
				it.skip(`${name} (missing doc/patch)`, () => {});
				return;
			}

			if (typeof testCase.error === 'string') {
				it(name, () => {
					const doc = structuredClone(testCase.doc);
					const patch = structuredClone(testCase.patch);

					expect(() => applyPatch(doc, patch)).toThrow();
				});
				return;
			}

			it(name, () => {
				const doc = structuredClone(testCase.doc);
				const patch = structuredClone(testCase.patch);
				const expected = structuredClone(testCase.expected);

				const actual = applyPatch(doc, patch);
				expect(actual).toEqual(expected);
			});
		});
	});
}

const specTests = loadRFC6902TestCases('spec_tests.json');
const tests = loadRFC6902TestCases('tests.json');

if (!specTests && !tests) {
	describe('RFC 6902 Compliance Suite', () => {
		it('should skip if json-patch test suite is missing', () => {
			console.warn(
				'json-patch test suite not found; install json-patch-test-suite to enable RFC 6902 compliance tests',
			);
		});
	});
} else {
	describe('RFC 6902 Compliance Suite', () => {
		if (specTests) {
			runSuite('spec_tests.json (RFC Appendix examples)', specTests);
		}
		if (tests) {
			runSuite('tests.json (extended suite)', tests);
		}
	});
}
```

- [ ] Run:

```bash
pnpm --filter @jsonpath/patch test
```

##### Step 4 Verification Checklist

- [ ] Tests execute (pass or fail) without crashing
- [ ] Suite missing case prints a skip warning instead of crashing
- [ ] `spec_tests.json` and `tests.json` are both executed when installed

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-patch): add RFC 6902 compliance runner

- Add Vitest harness to execute official json-patch-tests fixtures
- Dynamically generates success/error cases and skips disabled tests

completes: step 4 of 5 for jsonpath-patch-rfc-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Document Compliance Status

- [ ] Create `packages/jsonpath/patch/RFC_COMPLIANCE.md` with:

````markdown
# RFC 6902 Compliance (JSON Patch)

This package (`@jsonpath/patch`) includes a test harness that executes the official RFC 6902 JSON Patch test suite maintained at https://github.com/json-patch/json-patch-tests.

## Test Suite Source

The suite is consumed via the `json-patch-test-suite` npm package, which vendors the upstream `tests.json` and `spec_tests.json` fixture files.

## Running Compliance Tests

From the repo root:

```bash
pnpm --filter @jsonpath/patch test
```
````

## Counting Tests

To count the total number of upstream test cases per file:

```bash
node -e "const fs=require('fs'); const p=require.resolve('json-patch-test-suite/spec_tests.json'); const s=JSON.parse(fs.readFileSync(p,'utf8')); console.log('spec_tests.json:', s.length);"
node -e "const fs=require('fs'); const p=require.resolve('json-patch-test-suite/tests.json'); const s=JSON.parse(fs.readFileSync(p,'utf8')); console.log('tests.json:', s.length);"
```

## Known Deviations (Baseline)

The compliance runner is intended to surface any RFC 6902 gaps as failing tests. If failures are observed, document them here with:

- The failing upstream test name/comment
- The RFC section
- The observed behavior vs expected behavior
- A rationale (if intentional)
- A remediation plan (if unintentional)

Suggested areas to watch (common RFC 6902 pitfalls):

- Leading zeros in array indices
- Missing required fields (`path`, `value`, `from`)
- Invalid JSON Pointer syntax
- Unrecognized operations

````

- [ ] Create `packages/jsonpath/patch/README.md` with:

```markdown
# @jsonpath/patch

RFC 6902 (JSON Patch) implementation used by the `@jsonpath/*` ecosystem.

## Install

```bash
pnpm add @jsonpath/patch
````

## Usage

```ts
import { applyPatch } from '@jsonpath/patch';

const doc = { foo: 'bar' };
const next = applyPatch(doc, [{ op: 'add', path: '/baz', value: 'qux' }]);
// => { foo: 'bar', baz: 'qux' }
```

## RFC 6902 Compliance Testing

This package can execute the official upstream JSON Patch test suite.

See `RFC_COMPLIANCE.md` for how to run the suite and track deviations.

````

- [ ] Run:

```bash
pnpm --filter @jsonpath/patch test
````

##### Step 5 Verification Checklist

- [ ] `packages/jsonpath/patch/RFC_COMPLIANCE.md` explains how to run + count tests
- [ ] `packages/jsonpath/patch/README.md` references compliance testing

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
docs(jsonpath-patch): add RFC 6902 compliance docs

- Add RFC_COMPLIANCE.md describing how to run/count upstream fixtures
- Add package README referencing compliance harness

completes: step 5 of 5 for jsonpath-patch-rfc-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
