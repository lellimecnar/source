# JSONPath RFC 9535 Compliance (PR A: C01–C05)

## Goal

Deliver **PR A** of the RFC 9535 compliance plan: conformance harness foundations + core plugin hook infrastructure + baseline lexer tokenization groundwork, while keeping `master` green and **not** claiming RFC compliance yet.

## Prerequisites

Make sure that the user is currently on the `jsonpath/rfc9535-compliance` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from `master`.

### Step-by-Step Instructions

#### Step 1 (C01): Conformance harness + richer RFC corpus schema

- [ ] Update the conformance corpus schema to support RFC-style cases (documents + cases + per-case expectations).
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/corpus.ts`:

```ts
export type ConformanceProfile =
	| 'rfc9535-draft'
	| 'rfc9535-core'
	| 'rfc9535-full';

export type ConformanceDocument = {
	name: string;
	json: unknown;
};

export type ConformanceExpectation = {
	values?: unknown[];
	pathsOrdered?: string[];
	pathsAnyOrder?: string[];
};

export type ConformanceCase = {
	name: string;
	profile: ConformanceProfile;
	documentName: string;
	query: string;
	expect?: ConformanceExpectation;
};

// Minimal, RFC-flavored documents for early harness wiring.
// NOTE: These are intentionally small. Expand as RFC coverage grows.
export const documents: ConformanceDocument[] = [
	{
		name: 'simple',
		json: { a: { b: 1 }, xs: [1, 2] },
	},
	{
		name: 'rfc-bookstore-mini',
		json: {
			o: { 'j j': 42, k: 1 },
			store: {
				book: [
					{
						category: 'reference',
						author: 'Nigel Rees',
						title: 'Sayings',
						price: 8.95,
					},
					{
						category: 'fiction',
						author: 'Evelyn Waugh',
						title: 'Sword',
						price: 12.99,
					},
				],
			},
		},
	},
];

// Early RFC-targeted cases.
// These are expected to FAIL until PR B+ implements parsing + evaluation.
export const cases: ConformanceCase[] = [
	{
		name: 'rfc: root normalized path ($) (expected to fail until resultType:path exists)',
		profile: 'rfc9535-draft',
		documentName: 'rfc-bookstore-mini',
		query: '$',
		expect: {
			pathsOrdered: ['$'],
		},
	},
	{
		name: 'rfc: child member with space (expected to fail until selectors exist)',
		profile: 'rfc9535-draft',
		documentName: 'rfc-bookstore-mini',
		query: "$.o['j j']",
		expect: {
			values: [42],
		},
	},
];
```

- [ ] Add a minimal harness runner that can execute a conformance case against a provided engine.
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/harness.ts`:

```ts
import type { JsonPathEngine } from '@jsonpath/core';

import type { ConformanceCase } from './corpus';
import { documents } from './corpus';

export type ConformanceRunOptions = {
	resultType?: 'value' | 'path';
};

export function runConformanceCase(
	engine: JsonPathEngine,
	testCase: ConformanceCase,
	options?: ConformanceRunOptions,
): unknown[] {
	const doc = documents.find((d) => d.name === testCase.documentName);
	if (!doc) {
		throw new Error(
			`Unknown conformance document: ${testCase.documentName}. Available: ${documents
				.map((d) => d.name)
				.join(', ')}`,
		);
	}

	const compiled = engine.compile(testCase.query);

	// Map conformance options onto engine options.
	const engineOptions =
		options?.resultType === 'path'
			? { resultType: 'path' as const }
			: undefined;

	return engine.evaluateSync(compiled, doc.json, engineOptions);
}
```

- [ ] Export the harness helper.
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/index.ts`:

```ts
export * from './corpus';
export * from './harness';
```

- [ ] Update the conformance package dependencies so its tests can instantiate the RFC preset engine.
- [ ] Copy and paste code below into `packages/jsonpath/conformance/package.json`:

```json
{
	"name": "@lellimecnar/jsonpath-conformance",
	"version": "0.0.1",
	"private": true,
	"description": "Internal: conformance corpus fixtures + helpers.",
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
	"files": ["dist"],
	"scripts": {
		"build": "vite build",
		"clean": "node -e \"require('node:fs').rmSync('dist', { recursive: true, force: true })\"",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"prepack": "pnpm run build",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@jsonpath/plugin-rfc-9535": "workspace:^",
		"@jsonpath/pointer": "workspace:^"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/jest": "^29.5.12",
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

- [ ] Update conformance tests to:
  - [ ] verify the corpus exports still work, and
  - [ ] encode “known failing” RFC tests using `it.fails(...)` so `master` stays green.
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/index.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import { cases, documents, runConformanceCase } from './index';

describe('@lellimecnar/jsonpath-conformance', () => {
	it('exports a corpus with documents + cases', () => {
		expect(documents.length).toBeGreaterThan(0);
		expect(cases.length).toBeGreaterThan(0);
	});

	it.fails('RFC 9535 (draft): root normalized path ($)', () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-draft' });
		const testCase = cases.find((c) => c.query === '$')!;
		const out = runConformanceCase(engine, testCase, { resultType: 'path' });
		expect(out).toEqual(['$']);
	});

	it.fails("RFC 9535 (draft): $.o['j j'] selects the member value", () => {
		const engine = createRfc9535Engine({ profile: 'rfc9535-draft' });
		const testCase = cases.find((c) => c.query.includes("['j j']"))!;
		const out = runConformanceCase(engine, testCase);
		expect(out).toEqual([42]);
	});
});
```

##### Step 1 Verification Checklist

- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`
- [ ] Verify the suite is green (the RFC tests are expected failures via `it.fails`).

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-rfc9535): scaffold RFC conformance corpus + harness

- Expand conformance corpus schema for RFC-style documents and cases
- Add minimal runner for executing a case against an engine
- Add expected-failing RFC tests gated by it.fails

completes: step 1 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2 (C02): Core runtime Node + Location model (framework-only)

- [ ] Add a minimal internal location model (member names + array indexes).
- [ ] Copy and paste code below into `packages/jsonpath/core/src/runtime/location.ts`:

```ts
export type LocationComponent =
	| { kind: 'member'; name: string }
	| { kind: 'index'; index: number };

export type Location = {
	components: readonly LocationComponent[];
};

export function rootLocation(): Location {
	return { components: [] };
}

export function appendMember(location: Location, name: string): Location {
	return { components: [...location.components, { kind: 'member', name }] };
}

export function appendIndex(location: Location, index: number): Location {
	return { components: [...location.components, { kind: 'index', index }] };
}
```

- [ ] Add a minimal internal Node model.
- [ ] Copy and paste code below into `packages/jsonpath/core/src/runtime/node.ts`:

```ts
import type { Location } from './location';
import { rootLocation } from './location';

export type JsonPathNode = {
	value: unknown;
	location: Location;
};

export function rootNode(value: unknown): JsonPathNode {
	return {
		value,
		location: rootLocation(),
	};
}
```

- [ ] Add unit tests for the model (no RFC semantics).
- [ ] Copy and paste code below into `packages/jsonpath/core/src/runtime/location.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { appendIndex, appendMember, rootLocation } from './location';

describe('@jsonpath/core runtime location', () => {
	it('creates a root location', () => {
		expect(rootLocation()).toEqual({ components: [] });
	});

	it('appends member + index components immutably', () => {
		const root = rootLocation();
		const withMember = appendMember(root, 'a');
		const withIndex = appendIndex(withMember, 2);

		expect(root).toEqual({ components: [] });
		expect(withMember).toEqual({ components: [{ kind: 'member', name: 'a' }] });
		expect(withIndex).toEqual({
			components: [
				{ kind: 'member', name: 'a' },
				{ kind: 'index', index: 2 },
			],
		});
	});
});
```

##### Step 2 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): add core node + location runtime model

- Introduce internal Location and Node primitives
- Add unit tests for immutability and composition

completes: step 2 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3 (C03): Core evaluation pipeline skeleton (segments over nodelists)

- [ ] Add internal registries for selector evaluators and result mappers.
- [ ] Copy and paste code below into `packages/jsonpath/core/src/runtime/hooks.ts`:

```ts
import type { SelectorNode } from '@jsonpath/ast';

import type { JsonPathNode } from './node';

export type SelectorEvaluator = (
	input: JsonPathNode,
	selector: SelectorNode,
) => readonly JsonPathNode[];

export class EvaluatorRegistry {
	private readonly selectorEvaluators = new Map<string, SelectorEvaluator>();

	public registerSelector(kind: string, evaluator: SelectorEvaluator): void {
		this.selectorEvaluators.set(kind, evaluator);
	}

	public getSelector(kind: string): SelectorEvaluator | undefined {
		return this.selectorEvaluators.get(kind);
	}
}

export type ResultType = 'value' | 'node' | 'path' | 'pointer' | 'parent';

export type ResultMapper = (nodes: readonly JsonPathNode[]) => unknown[];

export class ResultRegistry {
	private readonly mappers = new Map<ResultType, ResultMapper>();

	public register(type: ResultType, mapper: ResultMapper): void {
		this.mappers.set(type, mapper);
	}

	public get(type: ResultType): ResultMapper | undefined {
		return this.mappers.get(type);
	}
}
```

- [ ] Update the engine evaluation implementation to:
  - [ ] initialize a root nodelist,
  - [ ] apply each segment’s selectors over the current list, and
  - [ ] map nodes into results (default supports `resultType: 'value'` and `'node'`).
- [ ] Copy and paste code below into `packages/jsonpath/core/src/createEngine.ts`:

```ts
import { Scanner, TokenStream } from '@jsonpath/lexer';
import { JsonPathParser } from '@jsonpath/parser';
import { path } from '@jsonpath/ast';

import type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';
import type { JsonPathPlugin } from './plugins/types';
import { resolvePlugins } from './plugins/resolve';
import { JsonPathError } from './errors/JsonPathError';
import { JsonPathErrorCodes } from './errors/codes';

import { rootNode } from './runtime/node';
import type { JsonPathNode } from './runtime/node';
import { EvaluatorRegistry, ResultRegistry } from './runtime/hooks';

export type CreateEngineOptions = {
	plugins: readonly JsonPathPlugin[];
	options?: {
		maxDepth?: number;
		maxResults?: number;
		plugins?: Record<string, unknown>;
	};
};

export function createEngine({
	plugins,
	options,
}: CreateEngineOptions): JsonPathEngine {
	// Resolve (deterministic order + deps + conflicts)
	const resolved = resolvePlugins(plugins);

	const scanner = new Scanner();
	const parser = new JsonPathParser();

	// Runtime registries (populated by plugins in PR A Step 4)
	const evaluators = new EvaluatorRegistry();
	const results = new ResultRegistry();

	const parse = (expression: string) => {
		const tokens = scanner.scanAll(expression);
		return (
			parser.parse({ input: expression, tokens: new TokenStream(tokens) }) ??
			path([])
		);
	};

	const compile = (expression: string): CompileResult => ({
		expression,
		ast: parse(expression),
	});

	const evaluateSync = (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => {
		let nodes: JsonPathNode[] = [rootNode(json)];

		for (const seg of compiled.ast.segments) {
			const next: JsonPathNode[] = [];
			for (const inputNode of nodes) {
				for (const selector of seg.selectors) {
					const evalSelector = evaluators.getSelector(selector.kind);
					if (!evalSelector) {
						throw new JsonPathError({
							code: JsonPathErrorCodes.Evaluation,
							message: `No evaluator registered for selector kind: ${selector.kind}`,
						});
					}
					next.push(...evalSelector(inputNode, selector));
				}
			}
			nodes = next;
		}

		const resultType = evaluateOptions?.resultType ?? 'value';
		const mapper = results.get(resultType as any);
		if (mapper) return mapper(nodes);

		// Safe defaults for early scaffolding.
		if (resultType === 'value') return nodes.map((n) => n.value);
		if (resultType === 'node') return nodes;

		throw new JsonPathError({
			code: JsonPathErrorCodes.Config,
			message: `No result mapper registered for resultType: ${resultType}`,
		});
	};

	const evaluateAsync = async (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => evaluateSync(compiled, json, evaluateOptions);

	// PR A Step 4 will populate registries and config.
	// Keep the resolved result referenced to avoid unused warnings until then.
	void resolved;
	void options;

	return { compile, parse, evaluateSync, evaluateAsync };
}
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): add core evaluation pipeline skeleton

- Add evaluator/result registries
- Implement root nodelist initialization and segment/selector iteration
- Provide default resultType mappers for value/node

completes: step 3 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4 (C04): Plugin hook extension points + per-plugin config plumbing

- [ ] Extend the plugin type so plugins can register lexer/parsers/evaluators/results.
- [ ] Copy and paste code below into `packages/jsonpath/core/src/plugins/types.ts`:

```ts
import type { Scanner } from '@jsonpath/lexer';
import type { JsonPathParser } from '@jsonpath/parser';

import type { EvaluatorRegistry, ResultRegistry } from '../runtime/hooks';

export type JsonPathPluginId = string;

export type JsonPathCapability = string;

export type JsonPathPluginMeta = {
	id: JsonPathPluginId;
	capabilities?: readonly JsonPathCapability[];
	dependsOn?: readonly JsonPathPluginId[];
	optionalDependsOn?: readonly JsonPathPluginId[];
	peerDependencies?: readonly string[];
};

export type EngineHooks = {
	registerTokens?: (scanner: Scanner) => void;
	registerParsers?: (parser: JsonPathParser) => void;
	registerEvaluators?: (registry: EvaluatorRegistry) => void;
	registerResults?: (registry: ResultRegistry) => void;
};

export type JsonPathPlugin<Config = unknown> = {
	meta: JsonPathPluginMeta;
	configure?: (config: Config | undefined) => void;
	hooks?: EngineHooks;
};
```

- [ ] Wire plugin hooks + plugin config into engine creation.
- [ ] Copy and paste code below into `packages/jsonpath/core/src/createEngine.ts` (this replaces Step 3’s file with the hook wiring added):

```ts
import { Scanner, TokenStream } from '@jsonpath/lexer';
import { JsonPathParser } from '@jsonpath/parser';
import { path } from '@jsonpath/ast';

import type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';
import type { JsonPathPlugin } from './plugins/types';
import { resolvePlugins } from './plugins/resolve';
import { JsonPathError } from './errors/JsonPathError';
import { JsonPathErrorCodes } from './errors/codes';

import { rootNode } from './runtime/node';
import type { JsonPathNode } from './runtime/node';
import { EvaluatorRegistry, ResultRegistry } from './runtime/hooks';

export type CreateEngineOptions = {
	plugins: readonly JsonPathPlugin[];
	options?: {
		maxDepth?: number;
		maxResults?: number;
		plugins?: Record<string, unknown>;
	};
};

export function createEngine({
	plugins,
	options,
}: CreateEngineOptions): JsonPathEngine {
	// Resolve (deterministic order + deps + conflicts)
	const resolved = resolvePlugins(plugins);

	const scanner = new Scanner();
	const parser = new JsonPathParser();

	// Runtime registries populated by plugins
	const evaluators = new EvaluatorRegistry();
	const results = new ResultRegistry();

	// Configure plugins + register hooks in deterministic order
	for (const plugin of resolved.ordered) {
		const pluginConfig = options?.plugins?.[plugin.meta.id];
		plugin.configure?.(pluginConfig as any);
		plugin.hooks?.registerTokens?.(scanner);
		plugin.hooks?.registerParsers?.(parser);
		plugin.hooks?.registerEvaluators?.(evaluators);
		plugin.hooks?.registerResults?.(results);
	}

	const parse = (expression: string) => {
		const tokens = scanner.scanAll(expression);
		return (
			parser.parse({ input: expression, tokens: new TokenStream(tokens) }) ??
			path([])
		);
	};

	const compile = (expression: string): CompileResult => ({
		expression,
		ast: parse(expression),
	});

	const evaluateSync = (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => {
		let nodes: JsonPathNode[] = [rootNode(json)];

		for (const seg of compiled.ast.segments) {
			const next: JsonPathNode[] = [];
			for (const inputNode of nodes) {
				for (const selector of seg.selectors) {
					const evalSelector = evaluators.getSelector(selector.kind);
					if (!evalSelector) {
						throw new JsonPathError({
							code: JsonPathErrorCodes.Evaluation,
							message: `No evaluator registered for selector kind: ${selector.kind}`,
						});
					}
					next.push(...evalSelector(inputNode, selector));
				}
			}
			nodes = next;
		}

		const resultType = evaluateOptions?.resultType ?? 'value';
		const mapper = results.get(resultType as any);
		if (mapper) return mapper(nodes);

		// Safe defaults for early scaffolding.
		if (resultType === 'value') return nodes.map((n) => n.value);
		if (resultType === 'node') return nodes;

		throw new JsonPathError({
			code: JsonPathErrorCodes.Config,
			message: `No result mapper registered for resultType: ${resultType}`,
		});
	};

	const evaluateAsync = async (
		compiled: CompileResult,
		json: unknown,
		evaluateOptions?: EvaluateOptions,
	) => evaluateSync(compiled, json, evaluateOptions);

	return { compile, parse, evaluateSync, evaluateAsync };
}
```

- [ ] Add a core test proving hooks can register parser/evaluator/results.
- [ ] Copy and paste code below into `packages/jsonpath/core/src/engine.plugins.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { path, segment } from '@jsonpath/ast';

import { createEngine } from './createEngine';

import type { JsonPathPlugin } from './plugins/types';

describe('@jsonpath/core plugin hooks', () => {
	it('allows plugins to register parser + evaluator + result mapper', () => {
		const plugin: JsonPathPlugin<{ sentinel?: string }> = {
			meta: { id: 'test.plugin' },
			configure: () => undefined,
			hooks: {
				registerParsers: (parser) => {
					parser.registerSegmentParser(() =>
						path([
							segment([
								{
									kind: 'TestSelector',
								},
							]),
						]),
					);
				},
				registerEvaluators: (registry) => {
					registry.registerSelector('TestSelector', (input) => [input]);
				},
				registerResults: (registry) => {
					registry.register('value', (nodes) =>
						nodes.map((n) => ({ ok: true, v: n.value })),
					);
				},
			},
		};

		const engine = createEngine({
			plugins: [plugin],
			options: {
				plugins: {
					'test.plugin': { sentinel: 'x' },
				},
			},
		});

		const compiled = engine.compile('ignored');
		const out = engine.evaluateSync(compiled, { a: 1 });
		expect(out).toEqual([{ ok: true, v: { a: 1 } }]);
	});
});
```

- [ ] Update the RFC bundle engine factory to accept a profile and pass it via per-plugin config.
- [ ] Copy and paste code below into `packages/jsonpath/plugin-rfc-9535/src/index.ts`:

```ts
import type { JsonPathPlugin } from '@jsonpath/core';
import { createEngine } from '@jsonpath/core';
import { plugin as boolOps } from '@jsonpath/plugin-filter-boolean';
import { plugin as comparison } from '@jsonpath/plugin-filter-comparison';
import { plugin as existence } from '@jsonpath/plugin-filter-existence';
import { plugin as filterFunctions } from '@jsonpath/plugin-filter-functions';
import { plugin as literals } from '@jsonpath/plugin-filter-literals';
import { plugin as filterRegex } from '@jsonpath/plugin-filter-regex';
import { plugin as functionsCore } from '@jsonpath/plugin-functions-core';
import { plugin as iregexp } from '@jsonpath/plugin-iregexp';
import { plugin as resultNode } from '@jsonpath/plugin-result-node';
import { plugin as resultParent } from '@jsonpath/plugin-result-parent';
import { plugin as resultPath } from '@jsonpath/plugin-result-path';
import { plugin as resultPointer } from '@jsonpath/plugin-result-pointer';
import { plugin as resultTypes } from '@jsonpath/plugin-result-types';
import { plugin as resultValue } from '@jsonpath/plugin-result-value';
import { plugin as childIndex } from '@jsonpath/plugin-syntax-child-index';
import { plugin as childMember } from '@jsonpath/plugin-syntax-child-member';
import { plugin as current } from '@jsonpath/plugin-syntax-current';
import { plugin as descendant } from '@jsonpath/plugin-syntax-descendant';
import { plugin as filterContainer } from '@jsonpath/plugin-syntax-filter';
import { plugin as root } from '@jsonpath/plugin-syntax-root';
import { plugin as union } from '@jsonpath/plugin-syntax-union';
import { plugin as wildcard } from '@jsonpath/plugin-syntax-wildcard';

export type Rfc9535Profile = 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full';

export type Rfc9535EngineOptions = {
	profile?: Rfc9535Profile;
};

export const rfc9535Plugins = [
	root,
	current,
	childMember,
	childIndex,
	wildcard,
	union,
	descendant,
	filterContainer,
	literals,
	boolOps,
	comparison,
	existence,
	functionsCore,
	filterFunctions,
	iregexp,
	filterRegex,
	resultValue,
	resultNode,
	resultPath,
	resultPointer,
	resultParent,
	resultTypes,
] as const satisfies readonly JsonPathPlugin[];

export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	return createEngine({
		plugins: rfc9535Plugins,
		options: {
			plugins: {
				'@jsonpath/plugin-rfc-9535': {
					profile: options?.profile ?? 'rfc9535-draft',
				},
			},
		},
	});
}

export const plugin: JsonPathPlugin<{ profile?: Rfc9535Profile }> = {
	meta: {
		id: '@jsonpath/plugin-rfc-9535',
		capabilities: ['preset:rfc9535'],
		dependsOn: rfc9535Plugins.map((p) => p.meta.id),
	},
	configure: () => undefined,
};
```

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`
- [ ] `pnpm --filter @jsonpath/plugin-rfc-9535 test`
- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): add core plugin hooks + per-plugin config

- Extend plugin type with hook registration points
- Wire plugin config + hook execution into createEngine
- Add core test proving hooks can register parser/evaluator/results
- Add profile option to createRfc9535Engine and pass config to preset plugin

completes: step 4 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5 (C05): Lexer RFC token kinds + minimal scanner rules

- [ ] Add canonical RFC token kind constants and a helper to register minimal punctuation scan rules.
- [ ] Copy and paste code below into `packages/jsonpath/lexer/src/token.ts`:

```ts
export const TokenKinds = {
	Unknown: 'Unknown',

	// Identifiers / literals (wired later)
	Identifier: 'Identifier',
	Number: 'Number',
	String: 'String',

	// Punctuation / operators
	Dollar: 'Dollar',
	At: 'At',
	DotDot: 'DotDot',
	Dot: 'Dot',
	LBracket: 'LBracket',
	RBracket: 'RBracket',
	Comma: 'Comma',
	Star: 'Star',
	Colon: 'Colon',
	LParen: 'LParen',
	RParen: 'RParen',
	Question: 'Question',
	Bang: 'Bang',
	EqEq: 'EqEq',
	NotEq: 'NotEq',
	LtEq: 'LtEq',
	GtEq: 'GtEq',
	Lt: 'Lt',
	Gt: 'Gt',
} as const;

export type TokenKind =
	| (typeof TokenKinds)[keyof typeof TokenKinds]
	| (string & {});

export type Token = {
	kind: TokenKind;
	lexeme: string;
	offset: number;
};
```

- [ ] Add the RFC 9535 punctuation scan rule registration helper.
- [ ] Copy and paste code below into `packages/jsonpath/lexer/src/rfc9535.ts`:

```ts
import type { Scanner } from './scanner';
import { TokenKinds } from './token';

export function registerRfc9535ScanRules(scanner: Scanner): void {
	// IMPORTANT: order matters for multi-character operators.
	scanner.register(TokenKinds.DotDot, (input, offset) =>
		input.startsWith('..', offset)
			? { lexeme: '..', offset, kind: TokenKinds.DotDot }
			: null,
	);
	scanner.register(TokenKinds.EqEq, (input, offset) =>
		input.startsWith('==', offset)
			? { lexeme: '==', offset, kind: TokenKinds.EqEq }
			: null,
	);
	scanner.register(TokenKinds.NotEq, (input, offset) =>
		input.startsWith('!=', offset)
			? { lexeme: '!=', offset, kind: TokenKinds.NotEq }
			: null,
	);
	scanner.register(TokenKinds.LtEq, (input, offset) =>
		input.startsWith('<=', offset)
			? { lexeme: '<=', offset, kind: TokenKinds.LtEq }
			: null,
	);
	scanner.register(TokenKinds.GtEq, (input, offset) =>
		input.startsWith('>=', offset)
			? { lexeme: '>=', offset, kind: TokenKinds.GtEq }
			: null,
	);

	const singles: Array<[string, string]> = [
		['$', TokenKinds.Dollar],
		['@', TokenKinds.At],
		['.', TokenKinds.Dot],
		['[', TokenKinds.LBracket],
		[']', TokenKinds.RBracket],
		[',', TokenKinds.Comma],
		['*', TokenKinds.Star],
		[':', TokenKinds.Colon],
		['(', TokenKinds.LParen],
		[')', TokenKinds.RParen],
		['?', TokenKinds.Question],
		['!', TokenKinds.Bang],
		['<', TokenKinds.Lt],
		['>', TokenKinds.Gt],
	];

	for (const [lexeme, kind] of singles) {
		scanner.register(kind, (input, offset) =>
			input[offset] === lexeme ? { lexeme, offset, kind } : null,
		);
	}
}
```

- [ ] Export the helper.
- [ ] Copy and paste code below into `packages/jsonpath/lexer/src/index.ts`:

```ts
export * from './token';
export * from './scanner';
export * from './stream';
export * from './rfc9535';
```

- [ ] Update lexer tests to validate multi-char operator priority (`..` before `.`).
- [ ] Copy and paste code below into `packages/jsonpath/lexer/src/scanner.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { Scanner } from './scanner';
import { TokenKinds } from './token';
import { registerRfc9535ScanRules } from './rfc9535';

describe('@jsonpath/lexer', () => {
	it('scans RFC punctuation rules with correct precedence', () => {
		const s = new Scanner();
		registerRfc9535ScanRules(s);
		const tokens = s.scanAll('$..a');
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.Dollar,
			TokenKinds.DotDot,
			TokenKinds.Unknown,
		]);
	});

	it('scans operators like == and >= as single tokens', () => {
		const s = new Scanner();
		registerRfc9535ScanRules(s);
		const tokens = s.scanAll('== >= <= !=');
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.EqEq,
			TokenKinds.GtEq,
			TokenKinds.LtEq,
			TokenKinds.NotEq,
		]);
	});
});
```

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @jsonpath/lexer test`
- [ ] `pnpm --filter @jsonpath/core test`

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): add RFC9535 punctuation tokenization helpers

- Define canonical TokenKinds for RFC punctuation and operators
- Add registerRfc9535ScanRules(scanner) helper
- Add lexer tests covering precedence for multi-char operators

completes: step 5 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Next PRs (outline only)

PR A intentionally stops at framework hooks + harness + tokenization scaffolding. The remaining RFC plan from `plans/jsonpath-rfc9535/plan.md` should be delivered as follow-up PRs (PR B–PR F), each with its own `implementation.md` focused on a narrow, testable contract:

- PR B (C06–C14): RFC AST nodes + parsing root/segments/selectors + evaluator semantics for child/wildcard/index/slice under `rfc9535-core`.
- PR C (C15–C18): filter parsing + evaluation enabled only for `rfc9535-full`.
- PR D (C19–C25): function parsing + typing + implementations for `length/count/match/search/value` under `rfc9535-full`.
- PR E (C26–C28): location tracking + normalized path serialization (`resultType: 'path'`) under `rfc9535-full`.
- PR F (C23–C24 if split): RFC 9485 I-Regexp validation + matcher, used by `match/search`.
