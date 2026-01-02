# JSONPath CTS Compliance (RFC 9535)

## Goal

Make the RFC 9535 Compliance Test Suite (CTS) in `packages/jsonpath/jsonpath/src/__tests__/compliance/cts.spec.ts` pass by wiring RFC-mode end-to-end, implementing RFC filter selector evaluation, enforcing strict/invalid-selector validation, and tightening package wiring (scope-limited to `@jsonpath/jsonpath` and its direct workspace deps).

## Prerequisites

Make sure that the user is currently on the `jsonpath/cts-compliance` branch before beginning implementation.
If the branch does not exist, create it from `master`.

Recommended local baseline commands:

```bash
pnpm -v
node -v
pnpm install
```

### Step-by-Step Instructions

#### Step 1: Inventory + baseline CTS failure map

- [ ] Enable the CTS test runner (it is currently skipped).
- [ ] Run CTS once and capture the failure map.
- [ ] Produce a short taxonomy (parse vs eval vs shape) to drive the rest of the work.

- [ ] Replace the entire contents of `packages/jsonpath/jsonpath/src/__tests__/compliance/cts.spec.ts` with:

```ts
import { describe, expect, test } from 'vitest';
// eslint-disable-next-line import/no-extraneous-dependencies
import cts from 'jsonpath-compliance-test-suite/cts.json' assert { type: 'json' };

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

export type CtsSuite = typeof cts;

export type CtsTestCase = (typeof cts.tests)[number];
export function loadCtsSuite(): CtsSuite {
	return cts;
}

type CtsCaseTuple = readonly [
	name: string,
	selector: string,
	testCase: CtsTestCase,
];

function groupNameFromTestName(name: string): string {
	const head = name.split(',')[0]?.trim();
	return head && head.length > 0 ? head : 'misc';
}

function toGroupedTuples(
	tests: CtsTestCase[],
): Array<readonly [group: string, cases: CtsCaseTuple[]]> {
	const groups = new Map<string, CtsCaseTuple[]>();
	for (const t of tests) {
		const group = groupNameFromTestName(String(t.name));
		const list = groups.get(group) ?? [];
		list.push([String(t.name), String(t.selector), t] as const);
		groups.set(group, list);
	}
	return [...groups.entries()];
}

describe('@lellimecnar/jsonpath compliance tests (RFC 9535 CTS: values)', () => {
	const { tests: ctsTests } = loadCtsSuite();
	const engine = createRfc9535Engine({ profile: 'rfc9535-full', strict: true });

	describe.each(toGroupedTuples(ctsTests))('%s', (_group, cases) => {
		test.each(cases)('%s', (_name, _selector, tc) => {
			if (tc.invalid_selector === true) {
				expect(() => engine.compile(tc.selector)).toThrow();
				return;
			}

			const compiled = engine.compile(tc.selector);
			const out = engine.evaluateSync(compiled, tc.document);

			if (Array.isArray(tc.results)) {
				expect(tc.results).toContainEqual(out);
				return;
			}

			expect(out).toEqual(tc.result);
		});
	});
});
```

- [ ] Run the CTS file once and capture output:

```bash
pnpm --filter @jsonpath/jsonpath test -- src/__tests__/compliance/cts.spec.ts
```

- [ ] Create a failure taxonomy in your PR notes (example format):
  - [ ] **Parse failures**: count + representative selectors
  - [ ] **Invalid-selector expectation mismatches**: count + representative selectors
  - [ ] **Evaluation mismatches** (wrong values): count + representative selectors
  - [ ] **Result-shape mismatches** (array vs scalar, ordering, etc.): count + representative selectors

##### Step 1 Verification Checklist

- [ ] CTS test file runs (not skipped)
- [ ] Failures are reproducible and categorized

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-cts-compliance): enable CTS runner and baseline failures

- Unskips RFC 9535 CTS runner in @jsonpath/jsonpath
- Captures a baseline failure map to drive follow-up fixes

completes: step 1 of 7 for jsonpath-cts-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Wire spec mode (RFC 9535) end-to-end

- [ ] Make `createRfc9535Engine({ profile, strict })` a supported API (it is already used by CTS).
- [ ] Ensure `@jsonpath/jsonpath` default engine and `createEngine()` factory always run in RFC 9535 full+strict mode by default.
- [ ] Add a small unit test proving the profile/strict config is actually applied.

- [ ] Replace the entire contents of `packages/jsonpath/plugin-rfc-9535/src/index.ts` with:

```ts
import {
	createPlugin,
	createEngine,
	type CreateEngineOptions,
} from '@jsonpath/core';

// Import for internal use
import { createFilterBooleanPlugin } from './plugins/filter/boolean';
import { createFilterComparisonPlugin } from './plugins/filter/comparison';
import { createFilterExistencePlugin } from './plugins/filter/existence';
import { createFilterFunctionsPlugin } from './plugins/filter/functions';
import { createFilterLiteralsPlugin } from './plugins/filter/literals';
import { createFilterRegexPlugin } from './plugins/filter/regex';
import { createFunctionsCorePlugin } from './plugins/functions/core';
import { createResultNodePlugin } from './plugins/result/node';
import { createResultPathPlugin } from './plugins/result/path';
import { createResultPointerPlugin } from './plugins/result/pointer';
import { createResultValuePlugin } from './plugins/result/value';
import { createSyntaxChildIndexPlugin } from './plugins/syntax/child-index';
import { createSyntaxChildMemberPlugin } from './plugins/syntax/child-member';
import { createSyntaxCurrentPlugin } from './plugins/syntax/current';
import { createSyntaxDescendantPlugin } from './plugins/syntax/descendant';
import { createSyntaxFilterPlugin } from './plugins/syntax/filter';
import { createSyntaxRootPlugin } from './plugins/syntax/root';
import { createSyntaxUnionPlugin } from './plugins/syntax/union';
import { createSyntaxWildcardPlugin } from './plugins/syntax/wildcard';

// Syntax plugins
export { createSyntaxRootPlugin } from './plugins/syntax/root';
export { createSyntaxCurrentPlugin } from './plugins/syntax/current';
export { createSyntaxChildMemberPlugin } from './plugins/syntax/child-member';
export { createSyntaxChildIndexPlugin } from './plugins/syntax/child-index';
export { createSyntaxWildcardPlugin } from './plugins/syntax/wildcard';
export { createSyntaxUnionPlugin } from './plugins/syntax/union';
export { createSyntaxDescendantPlugin } from './plugins/syntax/descendant';
export { createSyntaxFilterPlugin } from './plugins/syntax/filter';

// Filter plugins
export { createFilterLiteralsPlugin } from './plugins/filter/literals';
export { createFilterBooleanPlugin } from './plugins/filter/boolean';
export { createFilterComparisonPlugin } from './plugins/filter/comparison';
export { createFilterExistencePlugin } from './plugins/filter/existence';
export { createFilterFunctionsPlugin } from './plugins/filter/functions';
export { createFilterRegexPlugin } from './plugins/filter/regex';

// Function plugins
export { createFunctionsCorePlugin } from './plugins/functions/core';

// Result plugins
export { createResultValuePlugin } from './plugins/result/value';
export { createResultNodePlugin } from './plugins/result/node';
export { createResultPathPlugin } from './plugins/result/path';
export { createResultPointerPlugin } from './plugins/result/pointer';

// IRegexp utility
export { compile as iregexp } from './iregexp';

export type Rfc9535Profile = 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full';

/**
 * All RFC 9535 plugins in dependency order.
 * This array can be used directly with createEngine().
 */
export const rfc9535Plugins = [
	// Syntax plugins (order matters for parsing)
	createSyntaxRootPlugin(),
	createSyntaxCurrentPlugin(),
	createSyntaxChildMemberPlugin(),
	createSyntaxChildIndexPlugin(),
	createSyntaxWildcardPlugin(),
	createSyntaxUnionPlugin(),
	createSyntaxDescendantPlugin(),
	createSyntaxFilterPlugin(),
	// Filter plugins
	createFilterLiteralsPlugin(),
	createFilterBooleanPlugin(),
	createFilterComparisonPlugin(),
	createFilterExistencePlugin(),
	createFilterFunctionsPlugin(),
	createFilterRegexPlugin(),
	// Function plugins
	createFunctionsCorePlugin(),
	// Result plugins
	createResultValuePlugin(),
	createResultNodePlugin(),
	createResultPointerPlugin(),
	createResultPathPlugin(),
] as const;

export type Rfc9535EngineOptions = Omit<CreateEngineOptions, 'plugins'> & {
	/**
	 * Additional plugins to include after RFC 9535 plugins.
	 * Use this to add extensions.
	 */
	additionalPlugins?: CreateEngineOptions['plugins'];

	/**
	 * RFC 9535 profile.
	 * - rfc9535-draft: limited feature set
	 * - rfc9535-core: RFC core feature set
	 * - rfc9535-full: RFC full feature set (functions enabled)
	 */
	profile?: Rfc9535Profile;

	/**
	 * RFC 9535 strict parsing/validation mode.
	 */
	strict?: boolean;
};

function mergePluginConfig(
	options: CreateEngineOptions['options'] | undefined,
	pluginId: string,
	patch: Record<string, unknown>,
): CreateEngineOptions['options'] {
	const priorPlugins = (options?.plugins ?? {}) as Record<string, unknown>;
	const priorConfig = (priorPlugins[pluginId] ?? {}) as Record<string, unknown>;

	return {
		...options,
		plugins: {
			...priorPlugins,
			[pluginId]: {
				...priorConfig,
				...patch,
			},
		},
	};
}

/**
 * Create an engine pre-configured with all RFC 9535 plugins.
 */
export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	const { additionalPlugins = [], profile, strict, ...rest } = options ?? {};

	let engineOptions = rest.options;
	if (profile !== undefined || strict !== undefined) {
		engineOptions = mergePluginConfig(
			engineOptions,
			'@jsonpath/plugin-rfc-9535/syntax-root',
			{
				...(profile !== undefined ? { profile } : null),
				...(strict !== undefined ? { strict } : null),
			},
		);
	}

	return createEngine({
		...rest,
		options: engineOptions,
		plugins: [...rfc9535Plugins, ...additionalPlugins],
	});
}

/**
 * Preset plugin that declares dependency on all RFC 9535 plugins.
 * Useful for plugin systems that need to declare RFC 9535 as a dependency.
 */
export const plugin = createPlugin({
	meta: {
		id: '@jsonpath/plugin-rfc-9535',
		phases: [],
		capabilities: ['preset:rfc9535'],
		dependsOn: rfc9535Plugins.map((p) => p.meta.id),
	},
	setup: () => undefined,
});
```

- [ ] Replace the entire contents of `packages/jsonpath/jsonpath/src/index.ts` with:

```ts
import {
	createEngine as coreCreateEngine,
	type CreateEngineOptions as CoreCreateEngineOptions,
	type JsonPathEngine,
	type JsonPathPlugin,
} from '@jsonpath/core';
import {
	createRfc9535Engine,
	rfc9535Plugins,
	type Rfc9535Profile,
} from '@jsonpath/plugin-rfc-9535';

// Re-export commonly needed types/errors
export { JsonPathError, JsonPathErrorCodes } from '@jsonpath/core';
export type {
	CompileResult,
	EvaluateOptions,
	JsonPathEngine,
	JsonPathPlugin,
} from '@jsonpath/core';
export { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

const DEFAULT_PROFILE: Rfc9535Profile = 'rfc9535-full';
const DEFAULT_STRICT = true;

// Lazy singleton default engine
let defaultEngine: JsonPathEngine | null = null;

function getDefaultEngine(): JsonPathEngine {
	if (!defaultEngine) {
		defaultEngine = createRfc9535Engine({
			profile: DEFAULT_PROFILE,
			strict: DEFAULT_STRICT,
		});
	}
	return defaultEngine;
}

// Default engine export (lazy proxy)
export const engine: JsonPathEngine = new Proxy({} as JsonPathEngine, {
	get(_, prop) {
		return (getDefaultEngine() as any)[prop];
	},
});

export default engine;

// Factory for custom engines (RFC defaults + extra plugins)
export interface CreateEngineOptions {
	plugins?: readonly JsonPathPlugin<any>[];
	components?: CoreCreateEngineOptions['components'];
	options?: CoreCreateEngineOptions['options'];

	/** Optional override for the RFC profile. */
	profile?: Rfc9535Profile;

	/** Optional override for strict parsing/validation. */
	strict?: boolean;
}

function mergeSyntaxRootConfig(
	options: CoreCreateEngineOptions['options'] | undefined,
	profile: Rfc9535Profile,
	strict: boolean,
): CoreCreateEngineOptions['options'] {
	const priorPlugins = (options?.plugins ?? {}) as Record<string, unknown>;
	const priorRoot =
		(priorPlugins['@jsonpath/plugin-rfc-9535/syntax-root'] as
			| Record<string, unknown>
			| undefined) ?? {};

	return {
		...options,
		plugins: {
			...priorPlugins,
			'@jsonpath/plugin-rfc-9535/syntax-root': {
				profile,
				strict,
				...priorRoot,
			},
		},
	};
}

export function createEngine(opts?: CreateEngineOptions): JsonPathEngine {
	const plugins = [...rfc9535Plugins, ...(opts?.plugins ?? [])];
	const profile = opts?.profile ?? DEFAULT_PROFILE;
	const strict = opts?.strict ?? DEFAULT_STRICT;

	return coreCreateEngine({
		plugins,
		components: opts?.components,
		options: mergeSyntaxRootConfig(opts?.options, profile, strict),
	});
}
```

- [ ] Replace the entire contents of `packages/jsonpath/jsonpath/src/index.spec.ts` with:

```ts
import { describe, it, expect } from 'vitest';

import { createEngine } from './index';

describe('@jsonpath/jsonpath', () => {
	it('defaults to RFC 9535 full profile (functions enabled)', () => {
		const engine = createEngine();
		expect(() => engine.compile('$.a[?length(@) == 0]')).not.toThrow();
	});

	it('defaults to strict mode (leading/trailing whitespace is rejected)', () => {
		const engine = createEngine();
		expect(() => engine.compile(' $.a')).toThrow();
		expect(() => engine.compile('$.a ')).toThrow();
	});
});
```

- [ ] Run the package unit tests:

```bash
pnpm --filter @jsonpath/plugin-rfc-9535 test
pnpm --filter @jsonpath/jsonpath test
```

##### Step 2 Verification Checklist

- [ ] `createRfc9535Engine({ profile, strict })` compiles
- [ ] `@jsonpath/jsonpath` tests pass

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-cts-compliance): wire RFC profile/strict through engine factories

- Adds supported profile/strict options to createRfc9535Engine()
- Makes @jsonpath/jsonpath default engine + factory default to RFC full+strict
- Adds unit tests for profile and strict whitespace behavior

completes: step 2 of 7 for jsonpath-cts-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Fix filter semantics (selector-evaluator model)

- [ ] Replace the broken `FilterSegment` runtime registration with a selector evaluator for `Selector:Filter`.
- [ ] Evaluate filter expressions using the existing selector/segment evaluator pipeline for embedded queries.
- [ ] Implement a single, RFC-aligned LogicalType coercion rule for filter evaluation.

- [ ] Replace the entire contents of `packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/filter.ts` with:

```ts
import {
	FilterExprKinds,
	SelectorKinds,
	type FilterExprNode,
	type FilterSelectorNode,
	type SegmentNode,
} from '@jsonpath/ast';
import type { EvalContext, JsonPathNode } from '@jsonpath/core';
import { createPlugin, PluginPhases } from '@jsonpath/core';

import { compile } from '../../iregexp';

// Sentinel value for "Nothing" (empty nodelist or absent embedded query result)
const Nothing = Symbol('Nothing');
type Nothing = typeof Nothing;

const compiledPatternCache = new Map<string, ReturnType<typeof compile>>();

function getCompiled(pattern: string) {
	if (compiledPatternCache.has(pattern))
		return compiledPatternCache.get(pattern);
	const c = compile(pattern);
	compiledPatternCache.set(pattern, c);
	return c;
}

function isNothing(v: unknown): v is Nothing {
	return v === Nothing;
}

function unicodeScalarLength(value: string): number {
	let n = 0;
	for (const _ of value) n++;
	return n;
}

function toLogical(v: unknown | Nothing): boolean {
	if (isNothing(v)) return false;
	if (v === null) return false;
	if (typeof v === 'boolean') return v;
	if (typeof v === 'number') return Number.isFinite(v) && v !== 0;
	if (typeof v === 'string') return v.length > 0;
	return true;
}

function evalValueExpr(
	expr: FilterExprNode,
	currentNode: JsonPathNode,
	ctx: EvalContext,
	evaluators: any,
): unknown | Nothing {
	switch (expr.kind) {
		case FilterExprKinds.Literal:
			return expr.value;

		case FilterExprKinds.EmbeddedQuery: {
			// In ValueType contexts, embedded queries must behave like singular queries.
			const results = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
			if (results.length === 1) return results[0]!.value;
			return Nothing;
		}

		case FilterExprKinds.FunctionCall:
			return evalFunctionCall(expr, currentNode, ctx, evaluators);

		default:
			return Nothing;
	}
}

function evalNodesExpr(
	expr: FilterExprNode,
	currentNode: JsonPathNode,
	ctx: EvalContext,
	evaluators: any,
): readonly JsonPathNode[] {
	if (expr.kind !== FilterExprKinds.EmbeddedQuery) return [];
	return evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
}

function evalFunctionCall(
	call: Extract<
		FilterExprNode,
		{ kind: (typeof FilterExprKinds)['FunctionCall'] }
	>,
	currentNode: JsonPathNode,
	ctx: EvalContext,
	evaluators: any,
): unknown | Nothing {
	switch (call.name) {
		case 'length': {
			const v = evalValueExpr(
				call.args[0] as any,
				currentNode,
				ctx,
				evaluators,
			);
			if (isNothing(v)) return Nothing;
			if (typeof v === 'string') return unicodeScalarLength(v);
			if (Array.isArray(v)) return v.length;
			if (typeof v === 'object' && v !== null)
				return Object.keys(v as any).length;
			return Nothing;
		}

		case 'count': {
			const nodes = evalNodesExpr(
				call.args[0] as any,
				currentNode,
				ctx,
				evaluators,
			);
			return nodes.length;
		}

		case 'match': {
			const value = evalValueExpr(
				call.args[0] as any,
				currentNode,
				ctx,
				evaluators,
			);
			const pattern = evalValueExpr(
				call.args[1] as any,
				currentNode,
				ctx,
				evaluators,
			);
			if (typeof value !== 'string' || typeof pattern !== 'string')
				return false;
			const c = getCompiled(pattern);
			if (!c) return false;
			return c.full.test(value);
		}

		case 'search': {
			const value = evalValueExpr(
				call.args[0] as any,
				currentNode,
				ctx,
				evaluators,
			);
			const pattern = evalValueExpr(
				call.args[1] as any,
				currentNode,
				ctx,
				evaluators,
			);
			if (typeof value !== 'string' || typeof pattern !== 'string')
				return false;
			const c = getCompiled(pattern);
			if (!c) return false;
			return c.partial.test(value);
		}

		case 'value': {
			const nodes = evalNodesExpr(
				call.args[0] as any,
				currentNode,
				ctx,
				evaluators,
			);
			if (nodes.length === 1) return nodes[0]!.value;
			return Nothing;
		}

		default:
			return Nothing;
	}
}

function evalFilterExpr(
	expr: FilterExprNode,
	currentNode: JsonPathNode,
	ctx: EvalContext,
	evaluators: any,
): boolean | Nothing {
	switch (expr.kind) {
		case FilterExprKinds.Literal:
			return toLogical(expr.value);

		case FilterExprKinds.Not: {
			const innerVal = evalFilterExpr(
				expr.expr as any,
				currentNode,
				ctx,
				evaluators,
			);
			return isNothing(innerVal) ? Nothing : !innerVal;
		}

		case FilterExprKinds.And: {
			const left = evalFilterExpr(
				expr.left as any,
				currentNode,
				ctx,
				evaluators,
			);
			if (isNothing(left)) return Nothing;
			if (!left) return false;
			const right = evalFilterExpr(
				expr.right as any,
				currentNode,
				ctx,
				evaluators,
			);
			return isNothing(right) ? Nothing : right;
		}

		case FilterExprKinds.Or: {
			const left = evalFilterExpr(
				expr.left as any,
				currentNode,
				ctx,
				evaluators,
			);
			if (isNothing(left)) return Nothing;
			if (left) return true;
			const right = evalFilterExpr(
				expr.right as any,
				currentNode,
				ctx,
				evaluators,
			);
			return isNothing(right) ? Nothing : right;
		}

		case FilterExprKinds.Compare: {
			const leftCmp = evalComparable(
				expr.left as any,
				currentNode,
				ctx,
				evaluators,
			);
			const rightCmp = evalComparable(
				expr.right as any,
				currentNode,
				ctx,
				evaluators,
			);
			return compareValues(expr.operator, leftCmp, rightCmp);
		}

		case FilterExprKinds.EmbeddedQuery: {
			// Embedded query used directly as filter expression (existence test)
			const result = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
			return result.length > 0;
		}

		case FilterExprKinds.FunctionCall: {
			const v = evalFunctionCall(expr as any, currentNode, ctx, evaluators);
			return toLogical(v);
		}

		case FilterExprKinds.Script: {
			const scriptEval = evaluators.getFilterScriptEvaluator();
			if (scriptEval) {
				return scriptEval(expr.script, currentNode, ctx);
			}
			return Nothing;
		}

		default:
			return Nothing;
	}
}

function evalComparable(
	expr: FilterExprNode,
	currentNode: JsonPathNode,
	ctx: EvalContext,
	evaluators: any,
): unknown | Nothing {
	switch (expr.kind) {
		case FilterExprKinds.Literal:
			return expr.value;

		case FilterExprKinds.EmbeddedQuery: {
			// Singular embedded query in comparison
			const results = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
			if (results.length === 1) return results[0]!.value;
			// Empty or multiple results = Nothing
			return Nothing;
		}

		case FilterExprKinds.FunctionCall:
			return evalFunctionCall(expr as any, currentNode, ctx, evaluators);

		default:
			return Nothing;
	}
}

function evalEmbeddedQuery(
	query: Extract<
		FilterExprNode,
		{ kind: (typeof FilterExprKinds)['EmbeddedQuery'] }
	>,
	currentNode: JsonPathNode,
	ctx: EvalContext,
	evaluators: any,
): readonly JsonPathNode[] {
	const rootNode = query.scope === 'root' ? ctx.root : currentNode;
	let nodes: readonly JsonPathNode[] = [rootNode];

	for (const seg of query.segments as SegmentNode[]) {
		const evalSegment = evaluators.getSegment(seg.kind);
		if (evalSegment) {
			nodes = [...evalSegment(nodes, seg, evaluators, ctx)];
			continue;
		}

		const selectors = (seg as any).selectors;
		if (!Array.isArray(selectors)) continue;

		const next: JsonPathNode[] = [];
		for (const inputNode of nodes) {
			for (const selector of selectors) {
				const evalSelector = evaluators.getSelector(selector.kind);
				if (!evalSelector) continue;
				next.push(...evalSelector(inputNode, selector, ctx));
			}
		}
		nodes = next;
	}

	return nodes;
}

function compareValues(
	operator: string,
	left: unknown | Nothing,
	right: unknown | Nothing,
): boolean {
	// Nothing == Nothing → true
	if (isNothing(left) && isNothing(right)) {
		return operator === '==';
	}

	// Nothing == value → false (or true for !=)
	if (isNothing(left) || isNothing(right)) {
		return operator === '!=';
	}

	switch (operator) {
		case '==':
			return Object.is(left, right);
		case '!=':
			return !Object.is(left, right);
		case '<':
			return typeof left === typeof right && (left as any) < (right as any);
		case '<=':
			return typeof left === typeof right && (left as any) <= (right as any);
		case '>':
			return typeof left === typeof right && (left as any) > (right as any);
		case '>=':
			return typeof left === typeof right && (left as any) >= (right as any);
		default:
			return false;
	}
}

export const createSyntaxFilterPlugin = () =>
	createPlugin({
		meta: {
			id: '@jsonpath/plugin-rfc-9535/syntax-filter',
			phases: [PluginPhases.runtime],
			capabilities: ['syntax:rfc9535:filter'],
		},
		setup: ({ engine }) => {
			engine.evaluators.registerSelector(
				SelectorKinds.Filter,
				(
					input: JsonPathNode,
					selector: FilterSelectorNode,
					ctx: EvalContext,
				) => {
					const v = evalFilterExpr(
						selector.expr as any,
						input,
						ctx,
						engine.evaluators,
					);
					return toLogical(v) ? [input] : [];
				},
			);
		},
	});
```

- [ ] Run the CTS file again and confirm filter-related failures decrease:

```bash
pnpm --filter @jsonpath/jsonpath test -- src/__tests__/compliance/cts.spec.ts
```

##### Step 3 Verification Checklist

- [ ] No runtime errors about missing evaluator for `Selector:Filter`
- [ ] CTS failures related to `?[...]` decrease

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-cts-compliance): implement RFC filter selector evaluation

- Registers a selector evaluator for Selector:Filter (RFC ?[] filters)
- Evaluates filter expressions via existing selector/segment evaluator pipeline
- Adds RFC-aligned logical coercion for filter truthiness

completes: step 3 of 7 for jsonpath-cts-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Strict whitespace + invalid-selector validation (CTS-aligned)

- [ ] In strict mode, reject leading/trailing whitespace in the raw selector string.
- [ ] In strict mode, reject trailing tokens (parser must consume all input).
- [ ] Add unit tests for strict whitespace invalidation.

- [ ] Replace the entire contents of `packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/root.ts` with:

```ts
import {
	createPlugin,
	PluginPhases,
	JsonPathError,
	JsonPathErrorCodes,
} from '@jsonpath/core';
import {
	registerRfc9535LiteralScanRules,
	registerRfc9535ScanRules,
} from '@jsonpath/core';

import { parseRfc9535Path } from './parser';

export type Rfc9535Profile = 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full';

export const createSyntaxRootPlugin = createPlugin<{
	profile?: Rfc9535Profile;
	strict?: boolean;
}>((config) => {
	// IMPORTANT: keep this as per-engine state (avoid module-level mutation).
	let profile: Rfc9535Profile = 'rfc9535-draft';
	let strict = false;

	return {
		meta: {
			id: '@jsonpath/plugin-rfc-9535/syntax-root',
			phases: [PluginPhases.syntax],
			capabilities: ['syntax:rfc9535:root'],
		},
		setup: ({ engine, pluginId }) => {
			profile = config?.profile ?? 'rfc9535-draft';
			strict = config?.strict ?? false;

			registerRfc9535ScanRules(engine.scanner);
			registerRfc9535LiteralScanRules(engine.scanner);

			if (strict) {
				engine.lifecycle.registerTokenTransform(pluginId, (tokens, ctx) => {
					// Strict/RFC mode: reject leading/trailing whitespace (CTS-aligned).
					if (ctx.expression.trim() !== ctx.expression) {
						throw new JsonPathError({
							code: JsonPathErrorCodes.Syntax,
							message:
								'Invalid JSONPath selector (strict mode): leading/trailing whitespace is not permitted',
							expression: ctx.expression,
							location: { offset: 0 },
						});
					}
					return tokens;
				});
			}

			engine.parser.registerSegmentParser((ctx) =>
				parseRfc9535Path(ctx, profile, strict),
			);
		},
	};
});
```

- [ ] Update the RFC parser to consume all tokens by replacing the entire contents of `packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/parser.ts` with:

```ts
import {
	descendantSegment,
	embeddedQuery,
	filterAnd,
	filterCompare,
	filterLiteral,
	filterNot,
	filterOr,
	filterSelector,
	filterFunctionCall,
	filterScript,
	indexSelector,
	nameSelector,
	path,
	segment,
	sliceSelector,
	wildcardSelector,
} from '@jsonpath/ast';
import { JsonPathError, JsonPathErrorCodes } from '@jsonpath/core';
import { TokenKinds } from '@jsonpath/lexer';
import type { ParserContext } from '@jsonpath/parser';

type Profile = 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full';

function syntaxError(
	ctx: ParserContext,
	offset: number,
	message: string,
): never {
	throw new JsonPathError({
		code: JsonPathErrorCodes.Syntax,
		message,
		expression: ctx.input,
		location: { offset },
	});
}

function decodeQuotedString(lexeme: string): string {
	// Lexer includes the surrounding quote characters.
	const quote = lexeme[0]!;
	const raw = lexeme.slice(1, lexeme.endsWith(quote) ? -1 : lexeme.length);
	// Minimal decoding: \\ and escaped quotes.
	return raw
		.replaceAll('\\\\', '\\')
		.replaceAll("\\'", "'")
		.replaceAll('\\"', '"');
}

function parseInteger(
	ctx: ParserContext,
	lexeme: string,
	offset: number,
): number {
	const n = Number.parseInt(lexeme, 10);
	if (!Number.isFinite(n))
		syntaxError(ctx, offset, `Invalid integer: ${lexeme}`);
	return n;
}

function expect(
	ctx: ParserContext,
	kind: string,
): { kind: string; lexeme: string; offset: number } {
	const t = ctx.tokens.next();
	if (!t || t.kind !== kind) {
		const off = t?.offset ?? ctx.input.length;
		syntaxError(ctx, off, `Expected token ${kind}`);
	}
	return t;
}

function maybe(
	ctx: ParserContext,
	kind: string,
): { kind: string; lexeme: string; offset: number } | null {
	const t = ctx.tokens.peek();
	if (!t || t.kind !== kind) return null;
	return ctx.tokens.next()!;
}

function parseSelector(ctx: ParserContext) {
	const t = ctx.tokens.peek();
	if (!t) syntaxError(ctx, ctx.input.length, 'Unexpected end of input');

	if (t.kind === TokenKinds.Star) {
		ctx.tokens.next();
		return wildcardSelector();
	}

	if (t.kind === TokenKinds.String) {
		const tok = ctx.tokens.next()!;
		return nameSelector(decodeQuotedString(tok.lexeme));
	}

	// Slice: [start?:end?:step?] (only inside brackets)
	// We detect slice when the next token is ':' OR when number is followed by ':'.
	if (t.kind === TokenKinds.Colon) {
		ctx.tokens.next();
		const endTok = maybe(ctx, TokenKinds.Number);
		let end: number | undefined;
		if (endTok) end = parseInteger(ctx, endTok.lexeme, endTok.offset);

		let step: number | undefined;
		if (maybe(ctx, TokenKinds.Colon)) {
			const stepTok = maybe(ctx, TokenKinds.Number);
			if (stepTok) step = parseInteger(ctx, stepTok.lexeme, stepTok.offset);
		}

		return sliceSelector({ start: undefined, end, step });
	}

	if (t.kind === TokenKinds.Number) {
		const first = ctx.tokens.next()!;
		const start = parseInteger(ctx, first.lexeme, first.offset);
		if (maybe(ctx, TokenKinds.Colon)) {
			const endTok = maybe(ctx, TokenKinds.Number);
			let end: number | undefined;
			if (endTok) end = parseInteger(ctx, endTok.lexeme, endTok.offset);

			let step: number | undefined;
			if (maybe(ctx, TokenKinds.Colon)) {
				const stepTok = maybe(ctx, TokenKinds.Number);
				if (stepTok) step = parseInteger(ctx, stepTok.lexeme, stepTok.offset);
			}

			return sliceSelector({ start, end, step });
		}
		return indexSelector(start);
	}

	syntaxError(ctx, t.offset, `Unexpected selector token: ${t.kind}`);
}

function parseFilterOr(ctx: ParserContext, profile: Profile): any {
	let left = parseFilterAnd(ctx, profile);
	while (maybe(ctx, TokenKinds.OrOr)) {
		const right = parseFilterAnd(ctx, profile);
		left = filterOr(left, right);
	}
	return left;
}

function parseFilterAnd(ctx: ParserContext, profile: Profile): any {
	let left = parseFilterUnary(ctx, profile);
	while (maybe(ctx, TokenKinds.AndAnd)) {
		const right = parseFilterUnary(ctx, profile);
		left = filterAnd(left, right);
	}
	return left;
}

function parseFilterUnary(ctx: ParserContext, profile: Profile): any {
	if (maybe(ctx, TokenKinds.Bang)) {
		return filterNot(parseFilterUnary(ctx, profile));
	}
	return parseFilterComparison(ctx, profile);
}

function parseFilterComparison(ctx: ParserContext, profile: Profile): any {
	const left = parseFilterPrimary(ctx, profile, true);
	const t = ctx.tokens.peek();
	if (
		t &&
		(t.kind === TokenKinds.EqEq ||
			t.kind === TokenKinds.NotEq ||
			t.kind === TokenKinds.Lt ||
			t.kind === TokenKinds.Gt ||
			t.kind === TokenKinds.LtEq ||
			t.kind === TokenKinds.GtEq)
	) {
		ctx.tokens.next();
		const operator = t.lexeme as any;
		const right = parseFilterPrimary(ctx, profile, true);
		// RFC well-typedness: comparisons require comparable ValueType operands.
		if (left?.kind === 'FilterExpr:FunctionCall') {
			if (left.name === 'match' || left.name === 'search') {
				syntaxError(
					ctx,
					t.offset,
					'Not well-typed: match()/search() return LogicalType and cannot be used in comparisons',
				);
			}
		}
		if (right?.kind === 'FilterExpr:FunctionCall') {
			if (right.name === 'match' || right.name === 'search') {
				syntaxError(
					ctx,
					t.offset,
					'Not well-typed: match()/search() return LogicalType and cannot be used in comparisons',
				);
			}
		}
		return filterCompare(operator, left, right);
	}
	return left;
}

function parseFilterPrimary(
	ctx: ParserContext,
	profile: Profile,
	validateSingular = false,
): any {
	const t = ctx.tokens.peek();
	if (!t) syntaxError(ctx, ctx.input.length, 'Unexpected end of input');

	if (t.kind === TokenKinds.LParen) {
		ctx.tokens.next();
		const expr = parseFilterOr(ctx, profile);
		expect(ctx, TokenKinds.RParen);
		return expr;
	}

	if (t.kind === TokenKinds.String) {
		const tok = ctx.tokens.next()!;
		return filterLiteral(decodeQuotedString(tok.lexeme));
	}

	if (t.kind === TokenKinds.Number) {
		const tok = ctx.tokens.next()!;
		return filterLiteral(Number(tok.lexeme));
	}

	if (t.kind === TokenKinds.Identifier) {
		const tok = ctx.tokens.next()!;
		if (tok.lexeme === 'true') return filterLiteral(true);
		if (tok.lexeme === 'false') return filterLiteral(false);
		if (tok.lexeme === 'null') return filterLiteral(null);

		const next = ctx.tokens.peek();
		if (next?.kind === TokenKinds.LParen) {
			return parseFunctionCall(ctx, profile, tok.lexeme, tok.offset);
		}

		syntaxError(
			ctx,
			tok.offset,
			`Unexpected identifier in filter: ${tok.lexeme}`,
		);
	}

	if (t.kind === TokenKinds.Dollar || t.kind === TokenKinds.At) {
		return parseEmbeddedQuery(ctx, profile, false, validateSingular);
	}

	syntaxError(ctx, t.offset, `Unexpected token in filter: ${t.kind}`);
}

type FunctionArgType = 'Value' | 'Nodes';
type FunctionReturnType = 'Value' | 'Logical';

const rfcFunctionSignatures: Record<
	string,
	{ args: readonly FunctionArgType[]; returns: FunctionReturnType }
> = {
	length: { args: ['Value'], returns: 'Value' },
	count: { args: ['Nodes'], returns: 'Value' },
	match: { args: ['Value', 'Value'], returns: 'Logical' },
	search: { args: ['Value', 'Value'], returns: 'Logical' },
	value: { args: ['Nodes'], returns: 'Value' },
};

function isValidRfcFunctionIdentifier(name: string): boolean {
	return /^[a-z][a-z0-9_]*$/.test(name);
}

function parseFunctionArg(
	ctx: ParserContext,
	profile: Profile,
	expected: FunctionArgType,
): any {
	const expr =
		expected === 'Value'
			? parseFilterPrimary(ctx, profile, true)
			: parseFilterPrimary(ctx, profile, false);

	if (expected === 'Nodes' && expr.kind !== 'FilterExpr:EmbeddedQuery') {
		const off = ctx.tokens.peek()?.offset ?? ctx.input.length;
		syntaxError(
			ctx,
			off,
			'Not well-typed: expected a NodesType argument (an embedded query) for this function',
		);
	}

	return expr;
}

function parseFunctionCall(
	ctx: ParserContext,
	profile: Profile,
	name: string,
	offset: number,
): any {
	// PR-D contract: functions are only enabled for rfc9535-full.
	if (profile !== 'rfc9535-full') {
		syntaxError(
			ctx,
			offset,
			'Function expressions are not supported in this profile',
		);
	}

	if (!isValidRfcFunctionIdentifier(name)) {
		syntaxError(ctx, offset, `Invalid function identifier (RFC 9535): ${name}`);
	}

	const sig = rfcFunctionSignatures[name];
	if (!sig) {
		syntaxError(ctx, offset, `Unknown RFC 9535 function: ${name}`);
	}

	expect(ctx, TokenKinds.LParen);
	const args: any[] = [];

	if (sig.args.length > 0) {
		args.push(parseFunctionArg(ctx, profile, sig.args[0]!));
		for (let i = 1; i < sig.args.length; i++) {
			expect(ctx, TokenKinds.Comma);
			args.push(parseFunctionArg(ctx, profile, sig.args[i]!));
		}
	}

	// No extra args.
	if (ctx.tokens.peek()?.kind === TokenKinds.Comma) {
		syntaxError(
			ctx,
			ctx.tokens.peek()!.offset,
			`Too many arguments for ${name}()`,
		);
	}

	expect(ctx, TokenKinds.RParen);
	return filterFunctionCall(name, args);
}

function isSingularQuery(segments: any[]): boolean {
	for (const seg of segments) {
		// No descendant segments
		if (seg.kind === 'DescendantSegment') return false;

		// Check selectors within this segment
		const selectors = seg.selectors || [];
		if (selectors.length > 1) return false; // No unions

		for (const sel of selectors) {
			// No filters
			if (sel.kind === 'Selector:Filter') return false;
			// No wildcards
			if (sel.kind === 'Selector:Wildcard') return false;
			// No slices
			if (sel.kind === 'Selector:Slice') return false;
		}
	}
	return true;
}

function validateSingularQuery(
	ctx: ParserContext,
	offset: number,
	segments: any[],
): void {
	if (!isSingularQuery(segments)) {
		syntaxError(
			ctx,
			offset,
			'Singular query in filter comparison must not use: descendant (..), unions, wildcards (*), slices (:), or filters (?)',
		);
	}
}

function parseEmbeddedQuery(
	ctx: ParserContext,
	profile: Profile,
	validateSingular = false,
): any {
	const t = ctx.tokens.next()!;
	const scope = t.kind === TokenKinds.Dollar ? 'root' : 'current';
	const segments = parseSegments(ctx, profile, false);

	if (validateSingular) {
		validateSingularQuery(ctx, t.offset, segments);
	}

	return embeddedQuery(scope, segments, validateSingular);
}

function parseFilterScript(ctx: ParserContext): any {
	const start = ctx.tokens.peek()?.offset ?? ctx.input.length;
	let depth = 0;
	while (true) {
		const t = ctx.tokens.peek();
		if (!t) break;
		if (t.kind === TokenKinds.LBracket) depth++;
		if (t.kind === TokenKinds.RBracket) {
			if (depth === 0) break;
			depth--;
		}
		ctx.tokens.next();
	}
	const end = ctx.tokens.peek()?.offset ?? ctx.input.length;
	const script = ctx.input.slice(start, end).trim();
	return filterScript(script);
}

function parseBracketSelectors(
	ctx: ParserContext,
	profile: Profile,
	strict: boolean,
): { selectors: any[] } {
	expect(ctx, TokenKinds.LBracket);

	// Reject filters in rfc9535-core (and keep PR B focused).
	const maybeFilter = maybe(ctx, TokenKinds.Question);
	if (maybeFilter) {
		if (profile === 'rfc9535-core') {
			syntaxError(
				ctx,
				maybeFilter.offset,
				'Filter selectors are not supported in rfc9535-core',
			);
		}

		const cp = ctx.tokens.checkpoint();
		try {
			const expr = parseFilterOr(ctx, profile);
			expect(ctx, TokenKinds.RBracket);
			return { selectors: [filterSelector(expr)] };
		} catch (e) {
			if (strict) {
				throw e;
			}
			// Fallback to script expression if RFC filter parsing fails.
			ctx.tokens.restore(cp);
			const expr = parseFilterScript(ctx);
			expect(ctx, TokenKinds.RBracket);
			return { selectors: [filterSelector(expr)] };
		}
	}

	const selectors: any[] = [];
	selectors.push(parseSelector(ctx));
	while (maybe(ctx, TokenKinds.Comma)) {
		selectors.push(parseSelector(ctx));
	}
	expect(ctx, TokenKinds.RBracket);
	return { selectors };
}

function parseDotName(ctx: ParserContext): any {
	const id = expect(ctx, TokenKinds.Identifier);
	return nameSelector(id.lexeme);
}

function parseSegments(
	ctx: ParserContext,
	profile: Profile,
	strict: boolean,
): any[] {
	const segments: any[] = [];
	while (true) {
		const t = ctx.tokens.peek();
		if (!t) break;

		if (t.kind === TokenKinds.Dot) {
			ctx.tokens.next();
			const next = ctx.tokens.peek();
			if (!next)
				syntaxError(ctx, ctx.input.length, 'Expected selector after .');
			if (next.kind === TokenKinds.Star) {
				ctx.tokens.next();
				segments.push(segment([wildcardSelector()]));
				continue;
			}
			segments.push(segment([parseDotName(ctx)]));
			continue;
		}

		if (t.kind === TokenKinds.DotDot) {
			ctx.tokens.next();
			const next = ctx.tokens.peek();
			if (!next)
				syntaxError(ctx, ctx.input.length, 'Expected selector after ..');
			if (next.kind === TokenKinds.Star) {
				ctx.tokens.next();
				segments.push(descendantSegment([wildcardSelector()]));
				continue;
			}
			if (next.kind === TokenKinds.Identifier) {
				segments.push(descendantSegment([parseDotName(ctx)]));
				continue;
			}
			if (next.kind === TokenKinds.LBracket) {
				const { selectors } = parseBracketSelectors(ctx, profile, strict);
				segments.push(descendantSegment(selectors));
				continue;
			}
			syntaxError(ctx, next.offset, 'Unexpected token after ..');
		}

		if (t.kind === TokenKinds.LBracket) {
			const { selectors } = parseBracketSelectors(ctx, profile, strict);
			segments.push(segment(selectors));
			continue;
		}

		break;
	}
	return segments;
}

export function parseRfc9535Path(
	ctx: ParserContext,
	profile: Profile,
	strict: boolean,
) {
	expect(ctx, TokenKinds.Dollar);
	const ast = path(parseSegments(ctx, profile, strict));

	// Strict RFC parsing: ensure full token consumption.
	const extra = ctx.tokens.peek();
	if (extra) {
		syntaxError(ctx, extra.offset, `Unexpected token: ${extra.kind}`);
	}

	return ast;
}
```

- [ ] Run unit tests and then re-run CTS:

```bash
pnpm --filter @jsonpath/plugin-rfc-9535 test
pnpm --filter @jsonpath/jsonpath test
pnpm --filter @jsonpath/jsonpath test -- src/__tests__/compliance/cts.spec.ts
```

##### Step 4 Verification Checklist

- [ ] `engine.compile(' $.a')` throws in strict mode
- [ ] Selectors with trailing junk now throw (strict parser consumption)

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-cts-compliance): enforce strict selector validation (whitespace + trailing tokens)

- Adds strict whitespace rejection via lifecycle token transform
- Makes RFC parser consume all tokens and throw on trailing input

completes: step 4 of 7 for jsonpath-cts-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Fill remaining RFC selector behaviors revealed by CTS

- [ ] Re-run CTS.
- [ ] Triage remaining failures.
- [ ] Implement missing RFC semantics in the smallest possible commits.

Concrete checklist to keep Step 5 non-ambiguous:

- [ ] Re-run CTS and sort failures by group name (the suite already groups by the test name prefix).
- [ ] Fix one category at a time in this order (stop after each category and commit):
  - [ ] **Filter comparisons**: equality/ordering semantics and “Nothing” behavior
  - [ ] **Embedded query scope**: `$` vs `@` within filters
  - [ ] **Slices and negative indices**: bounds and step behavior
  - [ ] **Descendant selection**: traversal semantics and stability
  - [ ] **Result normalization**: ordering, duplicates, and stability

Suggested run command (repeat after each fix):

```bash
pnpm --filter @jsonpath/jsonpath test -- src/__tests__/compliance/cts.spec.ts
```

##### Step 5 Verification Checklist

- [ ] CTS failures strictly decrease after each sub-fix
- [ ] No regressions in `pnpm --filter @jsonpath/jsonpath test`

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
fix(jsonpath-cts-compliance): address remaining RFC 9535 CTS failures

- Implements the next batch of RFC behaviors needed for CTS green
- Adds targeted unit tests for each semantic rule fixed

completes: step 5 of 7 for jsonpath-cts-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6: Package boundaries + exports polish (scope-limited)

- [ ] Confirm `@jsonpath/jsonpath` and direct deps have correct exports/types.
- [ ] Ensure workspace dependencies remain `workspace:^` / `workspace:*`.
- [ ] Remove any now-dead code paths only if they cause build/type failures.

Recommended validation commands:

```bash
pnpm --filter @jsonpath/jsonpath type-check
pnpm --filter @jsonpath/plugin-rfc-9535 type-check
pnpm --filter @jsonpath/jsonpath test -- src/__tests__/compliance/cts.spec.ts
```

##### Step 6 Verification Checklist

- [ ] Type-check passes for `@jsonpath/jsonpath` and `@jsonpath/plugin-rfc-9535`
- [ ] CTS still passes (or continues to progress if Step 5 not finished)

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(jsonpath-cts-compliance): polish package wiring and types

- Tightens exports/types within jsonpath packages (scope-limited)
- Ensures build/type-check stability without changing public behavior

completes: step 6 of 7 for jsonpath-cts-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 7: Final CTS clean run + regression notes

- [ ] Run CTS and confirm 100% pass.
- [ ] Run the full `@jsonpath/jsonpath` test suite.
- [ ] Document any intentional divergences (if any) in `plans/jsonpath-cts-compliance/plan.md` under a short “Notes” section.

Commands:

```bash
pnpm --filter @jsonpath/jsonpath test -- src/__tests__/compliance/cts.spec.ts
pnpm --filter @jsonpath/jsonpath test
```

##### Step 7 Verification Checklist

- [ ] CTS run is green
- [ ] No regressions in other jsonpath package tests

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-cts-compliance): finalize CTS green run and document notes

- Confirms RFC 9535 CTS passes cleanly
- Records any remaining behavioral notes/divergences (if any)

completes: step 7 of 7 for jsonpath-cts-compliance
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
