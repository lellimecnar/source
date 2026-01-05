# jsonpath-gap-remediation

## Goal

Bring the `@jsonpath/*` library suite substantially closer to RFC compliance by implementing the gaps listed in [plans/jsonpath-gap-remediation/plan.md](plan.md), prioritizing correctness (interpreter-mode) and API completeness.

## Requirements baseline

This repo does not contain `structured-autonomy-generate.prompt.md` (searched, not found). This implementation guide is therefore written to the concrete checklist requirements provided in the task context:

- [ ] Every step is actionable with checkboxes and an ≈3 SP breakdown.
- [ ] Every code change is either copy/paste-ready (full blocks or patch hunks) or has an explicit “gap note” that points back to [plans/jsonpath-gap-remediation/plan.md](plan.md).
- [ ] Commands match monorepo conventions (`pnpm` + Turborepo; per-package tests via `pnpm --filter <pkg> test`).
- [ ] Each step includes a conventional commit message.

## Prerequisites

- [ ] Confirm the working tree is clean.
- [ ] Ensure you are on the `master` branch.

### Repository Commands (this monorepo)

- [ ] Build all: `pnpm build`
- [ ] Test all: `pnpm test`
- [ ] Type-check all: `pnpm type-check`

- [ ] Verify dist exports: `pnpm verify:exports`

### Per-package Commands (JSONPath suite)

- [ ] `pnpm --filter @jsonpath/core test`
- [ ] `pnpm --filter @jsonpath/lexer test`
- [ ] `pnpm --filter @jsonpath/parser test`
- [ ] `pnpm --filter @jsonpath/evaluator test`
- [ ] `pnpm --filter @jsonpath/functions test`
- [ ] `pnpm --filter @jsonpath/jsonpath test`
- [ ] `pnpm --filter @jsonpath/pointer test`
- [ ] `pnpm --filter @jsonpath/patch test`
- [ ] `pnpm --filter @jsonpath/merge-patch test`

### Conventional Commits

- [ ] Use `feat(scope): ...` / `fix(scope): ...` / `docs(scope): ...`.
- [ ] Scope for this plan: `jsonpath-gap-remediation`.

---

## Step-by-Step Instructions

> Notes for this repo:
>
> - Packages use `vite build` and `vitest` per-package, wired through Turborepo (`pnpm build`, `pnpm test`, etc.).
> - Imports use ESM (`type: "module"`) and `.js` extension in TS source exports.

---

#### Step 1: Introduce RFC 9535 `Nothing` (Core + Cross-Package)

- [ ] (≈3 SP) Add the `Nothing` symbol + type guard in `packages/jsonpath/core/src/nothing.ts`.
- [ ] (≈3 SP) Export `Nothing` + `isNothing` from `packages/jsonpath/core/src/index.ts`.
- [ ] (≈3 SP) Replace `undefined`-as-Nothing semantics in `packages/jsonpath/evaluator/src/evaluator.ts` (and later `@jsonpath/functions`) with the sentinel.
- [ ] (≈3 SP) Add unit tests for the sentinel in `packages/jsonpath/core/src/__tests__/nothing.spec.ts`.

Gap note (why there is no `types.ts` patch):

- [ ] `packages/jsonpath/core/src/types.ts` currently does not define a value-union type where `Nothing` belongs; treat `Nothing` as a runtime sentinel exported from `@jsonpath/core`.

- [ ] Copy and paste into `packages/jsonpath/core/src/nothing.ts` (new file):

```ts
export const Nothing = Symbol.for('@jsonpath/nothing');
export type Nothing = typeof Nothing;

export function isNothing(value: unknown): value is Nothing {
	return value === Nothing;
}
```

- [ ] Copy and paste into `packages/jsonpath/core/src/index.ts` (append exports):

```ts
export * from './nothing.js';
```

- [ ] Update `packages/jsonpath/evaluator/src/evaluator.ts` to use `Nothing`/`isNothing` (copy-paste patch; matches current file layout):

```diff
*** Begin Patch
*** Update File: packages/jsonpath/evaluator/src/evaluator.ts
@@
 import {
 	JSONPathError,
 	JSONPathTypeError,
 	JSONPathSyntaxError,
 	JSONPathSecurityError,
 	JSONPathLimitError,
 	JSONPathTimeoutError,
 	JSONPathFunctionError,
+	Nothing,
+	isNothing,
 	type EvaluatorOptions,
 	type PathSegment,
 	PluginManager,
 } from '@jsonpath/core';
@@
 				case NodeType.FunctionCall: {
 					const fn = getFunction(expr.name);
 					if (!fn || expr.args.length !== fn.signature.length) {
 						// RFC 9535: Unknown function or wrong arg count results in "Nothing"
-						return undefined;
+						return Nothing;
 					}
@@
 					// RFC 9535: If any argument is "Nothing", the result is "Nothing"
-					if (args.some((arg) => arg === undefined)) {
-						return undefined;
-					}
+					if (args.some((arg) => isNothing(arg))) {
+						return Nothing;
+					}
@@
 							if (paramType === 'NodesType') {
-								if (!isNodeList) return undefined; // Type mismatch
+								if (!isNodeList) return Nothing; // Type mismatch
 								processedArgs.push(arg.nodes);
@@
 									} else {
-										return undefined; // Non-singular query for ValueType
+										return Nothing; // Non-singular query for ValueType
 									}
@@
 								const result = fn.evaluate(...processedArgs);
-								if (result === undefined) return undefined;
+								if (result === undefined) return Nothing;
@@
 						} catch (err) {
 							// RFC 9535: Errors in function evaluation result in "Nothing"
-							return undefined;
+							return Nothing;
 						}
 				}
 				default:
-					return undefined;
+					return Nothing;
 			}
@@
 	private isTruthy(val: any): boolean {
-		if (val === undefined) return false; // "Nothing" is falsy
+		if (isNothing(val)) return false; // "Nothing" is falsy
*** End Patch
```

- [ ] Add new tests in `packages/jsonpath/core/src/__tests__/nothing.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Nothing, isNothing } from '../nothing.js';

describe('Nothing', () => {
	it('is a stable symbol', () => {
		expect(Nothing).toBe(Symbol.for('@jsonpath/nothing'));
	});

	it('type guard works', () => {
		expect(isNothing(Nothing)).toBe(true);
		expect(isNothing(undefined)).toBe(false);
		expect(isNothing(null)).toBe(false);
		expect(isNothing(Symbol('x'))).toBe(false);
	});
});
```

##### Step 1 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`
- [ ] `pnpm --filter @jsonpath/evaluator test`
- [ ] Ensure no TS errors in `@jsonpath/evaluator` for `Nothing` usage

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-gap-remediation): introduce RFC Nothing sentinel

Add `Nothing` symbol to @jsonpath/core and begin migrating evaluator semantics away from `undefined`-as-Nothing.

completes: step 1 of 19 for jsonpath-gap-remediation
```

---

#### Step 2: Parser AST Source + Strict Mode

- [ ] (≈3 SP) Add `QueryNode.source` to `packages/jsonpath/parser/src/nodes.ts`.
- [ ] (≈3 SP) Add `ParserOptions.strict` and wire options through `Parser` + `parse()` in `packages/jsonpath/parser/src/parser.ts`.
- [ ] (≈3 SP) Enforce strict mode (minimum in this repo: disallow shorthand `.true/.false/.null` selectors when strict).
- [ ] (≈3 SP) Add targeted parser tests.

- [ ] Apply this patch to add `QueryNode.source`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/parser/src/nodes.ts
@@
 export interface QueryNode extends ASTNode {
 	readonly type: NodeType.Query;
 	readonly root: boolean; // true = $, false = @
+	/** Raw source for this query node (substring spanning startPos..endPos). */
+	readonly source: string;
 	readonly segments: SegmentNode[];
 }
*** End Patch
```

- [ ] Apply this patch to add `ParserOptions.strict`, populate `QueryNode.source`, and accept options in `parse()`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/parser/src/parser.ts
@@
 import {
 	NodeType,
 	type QueryNode,
@@
 	isSingularQuery,
 } from './nodes.js';

+export interface ParserOptions {
+	/** When true, reject non-RFC conveniences/extensions. */
+	readonly strict?: boolean;
+}
@@
 export class Parser {
 	private lexer: Lexer;
+	private options: Required<ParserOptions>;
@@
-	constructor(input: string | Lexer) {
-		this.lexer = typeof input === 'string' ? new Lexer(input) : input;
+	constructor(input: string | Lexer, options?: ParserOptions) {
+		this.lexer = typeof input === 'string' ? new Lexer(input) : input;
+		this.options = { strict: false, ...options };
 	}
@@
 		return {
 			type: NodeType.Query,
 			startPos: start,
 			endPos: this.lexer.peek().start,
 			root: isRoot,
+			source: this.lexer.input.slice(start, this.lexer.peek().start),
 			segments,
 		};
 	}
@@
-		} else if (
-			next.type === TokenType.IDENT ||
-			next.type === TokenType.TRUE ||
-			next.type === TokenType.FALSE ||
-			next.type === TokenType.NULL
-		) {
+		} else if (
+			next.type === TokenType.IDENT ||
+			(!this.options.strict &&
+				(next.type === TokenType.TRUE ||
+					next.type === TokenType.FALSE ||
+					next.type === TokenType.NULL))
+		) {
@@
 }
@@
-export function parse(input: string): QueryNode {
+export function parse(input: string, options?: ParserOptions): QueryNode {
@@
-	return new Parser(input).parse();
+	return new Parser(input, options).parse();
 }
*** End Patch
```

- [ ] Add strict-mode coverage to `packages/jsonpath/parser/src/__tests__/parser.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/parser/src/__tests__/parser.spec.ts
@@
 	it('should throw on invalid index selector $[1.0]', () => {
 		expect(() => parse('$[1.0]')).toThrow();
 	});
+
+	it('should reject shorthand keyword selectors in strict mode', () => {
+		expect(() => parse('$.true', { strict: true })).toThrow();
+		expect(() => parse('$.false', { strict: true })).toThrow();
+		expect(() => parse('$.null', { strict: true })).toThrow();
+	});
+
+	it('should allow shorthand keyword selectors when not strict', () => {
+		expect(() => parse('$.true')).not.toThrow();
+	});
 });
*** End Patch
```

##### Step 2 Verification Checklist

- [ ] `pnpm --filter @jsonpath/parser test`

#### Step 2 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): expand parser AST + strict mode

Add query source tracking and strict parsing behavior.

completes: step 2 of 19 for jsonpath-gap-remediation
```

---

#### Step 3: Evaluator Options Enforcement + Evaluator Class

- [ ] (≈3 SP) Audit `packages/jsonpath/evaluator/src/evaluator.ts` for correct enforcement of: `maxFilterDepth`, `detectCircular`, `maxDepth`, `maxResults`, `maxNodes`.
- [ ] (≈3 SP) Add missing unit tests only for behaviors not already covered.
- [ ] (≈3 SP) Export a reusable `Evaluator` class façade without breaking existing `evaluate()`.

- [ ] If `Evaluator` is not exported, apply this minimal patch:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/evaluator/src/evaluator.ts
@@
-class Evaluator {
+export class Evaluator {
*** End Patch
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @jsonpath/evaluator test`

#### Step 3 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): enforce evaluator limits + class API

Add/verify option enforcement and export a reusable Evaluator class interface.

completes: step 3 of 19 for jsonpath-gap-remediation
```

---

#### Step 4: Pointer Instance Methods + RelativePointer

- [ ] (≈3 SP) Audit `packages/jsonpath/pointer/src/pointer.ts` for existing compatibility instance methods.
- [ ] (≈3 SP) Audit `packages/jsonpath/pointer/src/relative-pointer.ts` and `packages/jsonpath/pointer/src/__tests__/relative-pointer.spec.ts`.
- [ ] (≈3 SP) Add only the missing aliases/tests required by the gap list in `plan.md`.

Gap note (why there is no patch block here):

- [ ] This repo already has `JSONPointer.resolve()` and `JSONPointer.exists()` and a `relative-pointer.ts` implementation; the exact missing alias surface must be taken directly from [plans/jsonpath-gap-remediation/plan.md](plan.md).

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @jsonpath/pointer test`

#### Step 4 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): pointer instance methods + relative pointer

Add any missing json-p3 compatible pointer instance methods and finalize RelativePointer support.

completes: step 4 of 19 for jsonpath-gap-remediation
```

---

#### Step 5: Patch Options & Advanced Features

- [ ] (≈3 SP) Audit current `@jsonpath/patch` exports in `packages/jsonpath/patch/src/index.ts`.
- [ ] (≈3 SP) Implement the `atomic` -> `mutate` rename (breaking), updating call sites/tests.
- [ ] (≈3 SP) Add `applyWithErrors()` and `applyWithInverse()` per the gap definitions in `plan.md`.
- [ ] (≈3 SP) Add JSONPath-based bulk operations and wire them through the facade if required.

Gap note (why there is no patch block here):

- [ ] The exact patch APIs depend on current exported functions/types in `packages/jsonpath/patch/src`; implement with test-first changes scoped to that package, then update facade re-exports in Step 18.

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @jsonpath/patch test`

#### Step 5 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): patch options + inverse/errors + jsonpath ops

Implement patch options (mutate/validate/hooks), add inverse/errors helpers, and JSONPath bulk patch operations.

completes: step 5 of 19 for jsonpath-gap-remediation
```

---

#### Step 6: Merge Patch Utilities

- [ ] (≈3 SP) Add `isValidMergePatch()`.
- [ ] (≈3 SP) Add tracing and JSONPatch conversion helpers.

##### Step 6 Verification Checklist

- [ ] `pnpm --filter @jsonpath/merge-patch test`

#### Step 6 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): merge-patch validation/trace/conversion

Add validation helpers, traceable mergePatch, and JSONPatch conversion utilities.

completes: step 6 of 19 for jsonpath-gap-remediation
```

---

#### Step 7: Functions Package Improvements + RFC 9485 I-Regexp

- [ ] (≈3 SP) Add explicit builtin registration exports in `packages/jsonpath/functions/src/index.ts`.
- [ ] (≈3 SP) Improve I-Regexp validation/conversion (pin exact behavior to tests).
- [ ] (≈3 SP) Standardize Nothing behavior (`Nothing` internally; return `null` to end-user only where required by the gap list).

Gap note (why there is no patch block here):

- [ ] The exact `null` boundary depends on whether the caller is internal evaluator vs public facade. Implement Step 1 first so the sentinel is available.

##### Step 7 Verification Checklist

- [ ] `pnpm --filter @jsonpath/functions test`

#### Step 7 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): functions registration + i-regexp compliance

Add explicit builtin registration exports and improve RFC 9485 I-Regexp compliance.

completes: step 7 of 19 for jsonpath-gap-remediation
```

---

#### Step 8: Facade Configuration, Cache Management, Multi-Query

- [ ] (≈3 SP) Implement `configure()`, `getConfig()`, `reset()` in `packages/jsonpath/jsonpath/src`.
- [ ] (≈3 SP) Add `clearCache()` and `getCacheStats()`.
- [ ] (≈3 SP) Implement `multiQuery()` and `QuerySet`.

Gap note (why there is no patch block here):

- [ ] These APIs must be aligned with the existing facade exports in `packages/jsonpath/jsonpath/src/index.ts`; implement with tests in that package.

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @jsonpath/jsonpath test`

#### Step 8 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): facade config/cache + multi-query

Implement JSONPath facade configuration, cache stats/clearing, and multi-query execution helpers.

completes: step 8 of 19 for jsonpath-gap-remediation
```

---

#### Step 9: Secure Query + Transform/Merge Utilities

- [ ] (≈3 SP) Add `secureQuery()` facade helper using `SecureQueryOptions` from `@jsonpath/core`.
- [ ] (≈3 SP) Add `transformAll()` and `projectWith()`.
- [ ] (≈3 SP) Add `merge()` and `mergeWith()`.

Gap note (why there is no patch block here):

- [ ] Keep changes scoped to `packages/jsonpath/jsonpath/src` and its tests; do not change evaluator security semantics beyond what is already enforced.

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @jsonpath/jsonpath test`

#### Step 9 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): secureQuery + transform/merge utilities

Add secureQuery restrictions and facade utilities for transform/project and merge.

completes: step 9 of 19 for jsonpath-gap-remediation
```

---

#### Step 10: Plugin Context & Dependency Resolution

- [ ] (≈3 SP) Add a `PluginContext` concept in `packages/jsonpath/core/src/plugins.ts`.
- [ ] (≈3 SP) Implement dependency/version resolution in plugin manager (keep changes test-driven).

Gap note (why there is no patch block here):

- [ ] This touches plugin system semantics; implement with small, isolated changes and targeted unit tests in `@jsonpath/core`.

##### Step 10 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 10 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): plugin context + dependency resolution

Implement plugin context registration and dependency/version resolution in plugin manager.

completes: step 10 of 19 for jsonpath-gap-remediation
```

---

#### Step 11: New Package `@jsonpath/plugin-extended`

- [ ] (≈3 SP) Add new workspace package under `packages/jsonpath/plugin-extended` (package.json + build/test configs consistent with other `packages/jsonpath/*`).
- [ ] (≈3 SP) Implement parent (`^`) and property name (`~`) selectors (requires lexer+parser tokens first).

Gap note (why there is no patch block here):

- [ ] Lexer currently does not tokenize `^` or `~`, so selector implementation must be coordinated across `@jsonpath/lexer`, `@jsonpath/parser`, and `@jsonpath/evaluator`.

##### Step 11 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-extended test`

#### Step 11 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): add plugin-extended selectors

Introduce @jsonpath/plugin-extended with parent and property-name selectors.

completes: step 11 of 19 for jsonpath-gap-remediation
```

---

#### Step 12: New Package `@jsonpath/plugin-types`

- [ ] (≈3 SP) Add new workspace package under `packages/jsonpath/plugin-types`.
- [ ] (≈3 SP) Implement type predicate and coercion functions (register via plugin system).

##### Step 12 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-types test`

#### Step 12 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): add plugin-types predicates/coercion

Introduce @jsonpath/plugin-types with type predicates and coercion helpers.

completes: step 12 of 19 for jsonpath-gap-remediation
```

---

#### Step 13: New Package `@jsonpath/plugin-arithmetic`

- [ ] (≈3 SP) Add new workspace package under `packages/jsonpath/plugin-arithmetic`.
- [ ] (≈3 SP) Implement arithmetic operators (requires lexer token support first).

Gap note (why there is no patch block here):

- [ ] Lexer token set currently excludes arithmetic operators; add tokenizer support and parser operator precedence before implementing evaluator semantics.

##### Step 13 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-arithmetic test`

#### Step 13 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): add plugin-arithmetic operators

Introduce @jsonpath/plugin-arithmetic with + - * / % operators.

completes: step 13 of 19 for jsonpath-gap-remediation
```

---

#### Step 14: New Package `@jsonpath/plugin-extras`

- [ ] (≈3 SP) Add new workspace package under `packages/jsonpath/plugin-extras`.
- [ ] (≈3 SP) Implement extras functions and tests.

Gap note (why there is no patch block here):

- [ ] Keep extras behind explicit plugin registration to avoid changing baseline RFC behavior.

##### Step 14 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-extras test`

#### Step 14 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): add plugin-extras utility functions

Introduce @jsonpath/plugin-extras with string/array/aggregation utility functions.

completes: step 14 of 19 for jsonpath-gap-remediation
```

---

#### Step 15: New Package `@jsonpath/plugin-path-builder`

- [ ] (≈3 SP) Add new workspace package under `packages/jsonpath/plugin-path-builder`.
- [ ] (≈3 SP) Implement `PathBuilder` and `FilterBuilder`.

Gap note (why there is no patch block here):

- [ ] Builder APIs are design-sensitive. Write API-level tests in this new package before implementing the fluent API.

##### Step 15 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-path-builder test`

#### Step 15 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): add plugin-path-builder

Introduce @jsonpath/plugin-path-builder with fluent API for building JSONPath queries.

completes: step 15 of 19 for jsonpath-gap-remediation
```

---

#### Step 16: Performance Benchmarks & Bundle Analysis

- [ ] (≈3 SP) Add a benchmarks workspace under `packages/jsonpath/benchmarks`.
- [ ] (≈3 SP) Add benchmark scenarios and basic reporting.
- [ ] (≈3 SP) Add CI workflow to prevent regressions (wire through Turborepo tasks).

Gap note (why there is no patch block here):

- [ ] Keep this aligned with existing CI patterns in the repo and avoid introducing non-standard runners.

##### Step 16 Verification Checklist

- [ ] `pnpm --filter @jsonpath/benchmarks test`

#### Step 16 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): add jsonpath benchmarks + CI perf gate

Add benchmark scenarios and bundle size/performance checks.

completes: step 16 of 19 for jsonpath-gap-remediation
```

---

#### Step 17: Compliance Test Suites (RFC 9535/6901/6902/7386)

- [ ] (≈3 SP) Add/complete test runners that execute compliance suites using Vitest per package.
- [ ] (≈3 SP) Ensure the suites are wired into `pnpm test` and pass.

Note:

- [ ] The repo already downloads compliance tests in `postinstall` (root `package.json`). This step should wire those fixtures into per-package vitest tests under `packages/jsonpath/*/src/__tests__`.

##### Step 17 Verification Checklist

- [ ] `pnpm --filter @jsonpath/evaluator test`
- [ ] `pnpm --filter @jsonpath/pointer test`
- [ ] `pnpm --filter @jsonpath/patch test`
- [ ] `pnpm --filter @jsonpath/merge-patch test`

#### Step 17 STOP & COMMIT

```txt
feat(jsonpath-gap-remediation): integrate RFC compliance suites

Wire RFC CTS/test suites for JSONPath, JSON Pointer, JSON Patch, and JSON Merge Patch.

completes: step 17 of 19 for jsonpath-gap-remediation
```

---

#### Step 18: Documentation & Re-exports

- [ ] (≈3 SP) Ensure the facade re-exports all relevant APIs from `packages/jsonpath/jsonpath/src/index.ts`.
- [ ] (≈3 SP) Update package README and docs.

Docs scope:

- [ ] Update `docs/api/jsonpath.md` and package READMEs under `packages/jsonpath/*/README.md` only.

##### Step 18 Verification Checklist

- [ ] `pnpm --filter @jsonpath/jsonpath test`

#### Step 18 STOP & COMMIT

```txt
docs(jsonpath-gap-remediation): update docs and facade re-exports

Update documentation and ensure facade re-exports match the spec.

completes: step 18 of 19 for jsonpath-gap-remediation
```

---

#### Step 19: Final Integration & Cleanup

- [ ] (≈3 SP) Run full repo build and test.
- [ ] (≈3 SP) Verify no circular deps and dist exports.
- [ ] (≈3 SP) Prepare release metadata.

##### Step 19 Verification Checklist

- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm verify:exports`

#### Step 19 STOP & COMMIT

```txt
chore(jsonpath-gap-remediation): final integration and cleanup

Run full integration pass, validate builds/tests/exports, and complete cleanup for release.

completes: step 19 of 19 for jsonpath-gap-remediation
```
