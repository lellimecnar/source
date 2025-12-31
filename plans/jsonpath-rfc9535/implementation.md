## JSONPath RFC 9535 Compliance (PR A: C01–C05)

## Goal

Deliver **PR A** of the RFC 9535 compliance plan: conformance harness foundations + core plugin hook infrastructure + baseline lexer tokenization groundwork, while keeping `master` green and **not** claiming RFC compliance yet.

## Prerequisites

Make sure that the user is currently on the `jsonpath/rfc9535-compliance` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from `master`.

### Step-by-Step Instructions

#### Step 1 (C01): Conformance harness + richer RFC corpus schema

- [x] Update the conformance corpus schema to support RFC-style cases (documents + cases + per-case expectations).
- [x] Copy and paste code below into `packages/jsonpath/conformance/src/corpus.ts`:

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

- [x] Add a minimal harness runner that can execute a conformance case against a provided engine.
- [x] Copy and paste code below into `packages/jsonpath/conformance/src/harness.ts`:

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

- [x] Export the harness helper.
- [x] Copy and paste code below into `packages/jsonpath/conformance/src/index.ts`:

```ts
export * from './corpus';
export * from './harness';
```

- [x] Update the conformance package dependencies so its tests can instantiate the RFC preset engine.
- [x] Copy and paste code below into `packages/jsonpath/conformance/package.json`:

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

- [x] Update conformance tests to:
  - [x] verify the corpus exports still work, and
  - [x] encode “known failing” RFC tests using `it.fails(...)` so `master` stays green.
- [x] Copy and paste code below into `packages/jsonpath/conformance/src/index.spec.ts`:

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

- [x] Add a minimal internal location model (member names + array indexes).
- [x] Copy and paste code below into `packages/jsonpath/core/src/runtime/location.ts`:

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

- [x] Add a minimal internal Node model.
- [x] Copy and paste code below into `packages/jsonpath/core/src/runtime/node.ts`:

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

- [x] Add unit tests for the model (no RFC semantics).
- [x] Copy and paste code below into `packages/jsonpath/core/src/runtime/location.spec.ts`:

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

- [x] `pnpm --filter @jsonpath/core test`

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

- [x] Add internal registries for selector evaluators and result mappers.
- [x] Copy and paste code below into `packages/jsonpath/core/src/runtime/hooks.ts`:

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

- [x] Update the engine evaluation implementation to:
  - [x] initialize a root nodelist,
  - [x] apply each segment’s selectors over the current list, and
  - [x] map nodes into results (default supports `resultType: 'value'` and `'node'`).
- [x] Copy and paste code below into `packages/jsonpath/core/src/createEngine.ts`:

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

- [x] `pnpm --filter @jsonpath/core test`

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

- [x] Extend the plugin type so plugins can register lexer/parsers/evaluators/results.
- [x] Copy and paste code below into `packages/jsonpath/core/src/plugins/types.ts`:

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

- [x] Wire plugin hooks + plugin config into engine creation.
- [x] Copy and paste code below into `packages/jsonpath/core/src/createEngine.ts` (this replaces Step 3’s file with the hook wiring added):

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

- [x] Add a core test proving hooks can register parser/evaluator/results.
- [x] Copy and paste code below into `packages/jsonpath/core/src/engine.plugins.spec.ts`:

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

- [x] Update the RFC bundle engine factory to accept a profile and pass it via per-plugin config.
- [x] Copy and paste code below into `packages/jsonpath/plugin-rfc-9535/src/index.ts`:

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

- [x] `pnpm --filter @jsonpath/core test`
- [x] `pnpm --filter @jsonpath/plugin-rfc-9535 test`
- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`

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

- [x] Add canonical RFC token kind constants and a helper to register minimal punctuation scan rules.
- [x] Copy and paste code below into `packages/jsonpath/lexer/src/token.ts`:

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

- [x] Add the RFC 9535 punctuation scan rule registration helper.
- [x] Copy and paste code below into `packages/jsonpath/lexer/src/rfc9535.ts`:

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

- [x] Export the helper.
- [x] Copy and paste code below into `packages/jsonpath/lexer/src/index.ts`:

```ts
export * from './token';
export * from './scanner';
export * from './stream';
export * from './rfc9535';
```

- [x] Update lexer tests to validate multi-char operator priority (`..` before `.`).
- [x] Copy and paste code below into `packages/jsonpath/lexer/src/scanner.spec.ts`:

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

- [x] `pnpm --filter @jsonpath/lexer test`
- [x] `pnpm --filter @jsonpath/core test`

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

## PR B: RFC 9535 Core Selectors (C06–C14)

## Goal

Deliver **PR B** of the RFC 9535 compliance plan: implement RFC-ish AST nodes + parsing for `$` and core segments/selectors, plus evaluation semantics for child + descendant segments, name/wildcard/index/slice selectors under `profile: 'rfc9535-core'`.

## Prerequisites

Make sure that the user is currently on the `jsonpath/rfc9535-compliance` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from `master`.

### Step-by-Step Instructions

#### Step 1 (C06): Extend AST with RFC segment + selector node shapes

- [x] Update AST types to represent descendant segments and the core selector kinds.
- [x] Copy and paste code below into `packages/jsonpath/ast/src/nodes.ts` (this replaces the file):

```ts
export type AstNodeBase<TKind extends string> = {
	kind: TKind;
};

export type JsonPathAst = PathNode;

export const SelectorKinds = {
	Name: 'Selector:Name',
	Wildcard: 'Selector:Wildcard',
	Index: 'Selector:Index',
	Slice: 'Selector:Slice',
} as const;

export type NameSelectorNode = AstNodeBase<(typeof SelectorKinds)['Name']> & {
	name: string;
};

export type WildcardSelectorNode = AstNodeBase<
	(typeof SelectorKinds)['Wildcard']
>;

export type IndexSelectorNode = AstNodeBase<(typeof SelectorKinds)['Index']> & {
	index: number;
};

export type SliceSelectorNode = AstNodeBase<(typeof SelectorKinds)['Slice']> & {
	start?: number;
	end?: number;
	step?: number;
};

export type SelectorNode =
	| NameSelectorNode
	| WildcardSelectorNode
	| IndexSelectorNode
	| SliceSelectorNode
	| (AstNodeBase<string> & Record<string, unknown>);

export type ChildSegmentNode = AstNodeBase<'Segment'> & {
	selectors: SelectorNode[];
};

export type DescendantSegmentNode = AstNodeBase<'DescendantSegment'> & {
	selectors: SelectorNode[];
};

export type SegmentNode = ChildSegmentNode | DescendantSegmentNode;

export type PathNode = AstNodeBase<'Path'> & {
	segments: SegmentNode[];
};

export function path(segments: SegmentNode[]): PathNode {
	return { kind: 'Path', segments };
}

export function segment(selectors: SelectorNode[]): ChildSegmentNode {
	return { kind: 'Segment', selectors };
}

export function descendantSegment(
	selectors: SelectorNode[],
): DescendantSegmentNode {
	return { kind: 'DescendantSegment', selectors };
}

export function nameSelector(name: string): NameSelectorNode {
	return { kind: SelectorKinds.Name, name };
}

export function wildcardSelector(): WildcardSelectorNode {
	return { kind: SelectorKinds.Wildcard };
}

export function indexSelector(index: number): IndexSelectorNode {
	return { kind: SelectorKinds.Index, index };
}

export function sliceSelector(args: {
	start?: number;
	end?: number;
	step?: number;
}): SliceSelectorNode {
	return {
		kind: SelectorKinds.Slice,
		start: args.start,
		end: args.end,
		step: args.step,
	};
}
```

- [x] Add unit tests proving the new node constructors/types work.
- [x] Copy and paste code below into `packages/jsonpath/ast/src/nodes.spec.ts` (this replaces the file):

```ts
import { describe, expect, it } from 'vitest';

import {
	descendantSegment,
	indexSelector,
	nameSelector,
	path,
	segment,
	sliceSelector,
	wildcardSelector,
} from './nodes';

describe('@jsonpath/ast RFC-ish nodes', () => {
	it('builds a path with child + descendant segments', () => {
		const ast = path([
			segment([nameSelector('store')]),
			descendantSegment([wildcardSelector()]),
		]);
		expect(ast.kind).toBe('Path');
		expect(ast.segments.map((s) => s.kind)).toEqual([
			'Segment',
			'DescendantSegment',
		]);
	});

	it('creates selector nodes with stable kinds', () => {
		expect(nameSelector('a')).toEqual({ kind: 'Selector:Name', name: 'a' });
		expect(wildcardSelector()).toEqual({ kind: 'Selector:Wildcard' });
		expect(indexSelector(-1)).toEqual({ kind: 'Selector:Index', index: -1 });
		expect(sliceSelector({ start: 1, end: 3, step: 2 })).toEqual({
			kind: 'Selector:Slice',
			start: 1,
			end: 3,
			step: 2,
		});
	});
});
```

##### Step 1 Verification Checklist

- [x] `pnpm --filter @jsonpath/ast test`

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): add RFC segment + selector AST nodes

- Add DescendantSegment node shape
- Add core selector node shapes (name/wildcard/index/slice)
- Add small vitest coverage for constructors

completes: step 1 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2 (C07): Add RFC 9535 literal scan rules (identifier/number/string)

- [x] Add a lexer helper that tokenizes identifiers, integers, and JSONPath string literals.
- [x] Copy and paste code below into `packages/jsonpath/lexer/src/rfc9535-literals.ts` (new file):

```ts
import type { Scanner } from './scanner';
import { TokenKinds } from './token';

function isAlpha(ch: string): boolean {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isDigit(ch: string): boolean {
	return ch >= '0' && ch <= '9';
}

export function registerRfc9535LiteralScanRules(scanner: Scanner): void {
	// Identifiers (for dot-notation names): [A-Za-z_][A-Za-z0-9_]*
	scanner.register(TokenKinds.Identifier, (input, offset) => {
		const first = input[offset];
		if (!first || !isAlpha(first)) return null;
		let i = offset + 1;
		while (i < input.length) {
			const ch = input[i];
			if (!ch) break;
			if (isAlpha(ch) || isDigit(ch)) {
				i += 1;
				continue;
			}
			break;
		}
		return {
			kind: TokenKinds.Identifier,
			lexeme: input.slice(offset, i),
			offset,
		};
	});

	// Integers (for indexes/slices): -?[0-9]+
	scanner.register(TokenKinds.Number, (input, offset) => {
		let i = offset;
		if (input[i] === '-') i += 1;
		const startDigits = i;
		while (i < input.length && isDigit(input[i]!)) i += 1;
		if (i === startDigits) return null;
		return { kind: TokenKinds.Number, lexeme: input.slice(offset, i), offset };
	});

	// String literals: single or double quoted, with backslash escapes.
	// The parser is responsible for decoding escapes; lexer just captures the full lexeme.
	scanner.register(TokenKinds.String, (input, offset) => {
		const quote = input[offset];
		if (quote !== "'" && quote !== '"') return null;
		let i = offset + 1;
		while (i < input.length) {
			const ch = input[i]!;
			if (ch === '\\') {
				// Skip escaped character (or unicode escape body).
				i += 2;
				continue;
			}
			if (ch === quote) {
				i += 1;
				return {
					kind: TokenKinds.String,
					lexeme: input.slice(offset, i),
					offset,
				};
			}
			i += 1;
		}
		// Unterminated string. Return null so the scanner emits Unknown and the parser fails fast.
		return null;
	});
}
```

- [x] Export the new helper.
- [x] Copy and paste code below into `packages/jsonpath/lexer/src/index.ts` (add the export):

```ts
export * from './scanner';
export * from './stream';
export * from './token';
export * from './rfc9535';
export * from './rfc9535-literals';
```

- [x] Add lexer tests.
- [x] Copy and paste code below into `packages/jsonpath/lexer/src/rfc9535-literals.spec.ts` (new file):

```ts
import { describe, expect, it } from 'vitest';

import { Scanner } from './scanner';
import { registerRfc9535LiteralScanRules } from './rfc9535-literals';
import { TokenKinds } from './token';

describe('@jsonpath/lexer rfc9535 literals', () => {
	it('scans identifiers', () => {
		const s = new Scanner();
		registerRfc9535LiteralScanRules(s);
		expect(s.scanAll('abc _x A1')).toEqual([
			{ kind: TokenKinds.Identifier, lexeme: 'abc', offset: 0 },
			{ kind: TokenKinds.Identifier, lexeme: '_x', offset: 4 },
			{ kind: TokenKinds.Identifier, lexeme: 'A1', offset: 7 },
		]);
	});

	it('scans integers', () => {
		const s = new Scanner();
		registerRfc9535LiteralScanRules(s);
		expect(s.scanAll('0 -1 42')).toEqual([
			{ kind: TokenKinds.Number, lexeme: '0', offset: 0 },
			{ kind: TokenKinds.Number, lexeme: '-1', offset: 2 },
			{ kind: TokenKinds.Number, lexeme: '42', offset: 5 },
		]);
	});

	it('scans string literals', () => {
		const s = new Scanner();
		registerRfc9535LiteralScanRules(s);
		const tokens = s.scanAll("'a' \"b\" 'j\\\\ j'");
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.String,
			TokenKinds.String,
			TokenKinds.String,
		]);
		expect(tokens.map((t) => t.lexeme)).toEqual(["'a'", '"b"', "'j\\\\ j'"]);
	});
});
```

##### Step 2 Verification Checklist

- [x] `pnpm --filter @jsonpath/lexer test`

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): add RFC9535 literal tokenization helpers

- Add identifier, integer, and string literal scan rules
- Export helpers and add vitest coverage

completes: step 2 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3 (C08–C09): Add RFC 9535 core parser (root + segments + selectors)

- [x] Implement a minimal RFC 9535 parser as a plugin-installed segment parser. This keeps `@jsonpath/parser` framework-only and moves RFC behavior into syntax plugins.
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-root/src/parser.ts` (new file):

```ts
import {
	descendantSegment,
	indexSelector,
	nameSelector,
	path,
	segment,
	sliceSelector,
	wildcardSelector,
} from '@jsonpath/ast';
import { TokenKinds } from '@jsonpath/lexer';
import type { ParserContext } from '@jsonpath/parser';

import { JsonPathError } from '@jsonpath/core';
import { JsonPathErrorCodes } from '@jsonpath/core';

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
	const quote = lexeme[0];
	const raw = lexeme.slice(1, lexeme.endsWith(quote) ? -1 : undefined);
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

function parseSelector(
	ctx: ParserContext,
):
	| ReturnType<typeof nameSelector>
	| ReturnType<typeof wildcardSelector>
	| ReturnType<typeof indexSelector>
	| ReturnType<typeof sliceSelector> {
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

function parseBracketSelectors(
	ctx: ParserContext,
	profile: Profile,
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
		syntaxError(
			ctx,
			maybeFilter.offset,
			'Filter selectors are not implemented yet',
		);
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

export function parseRfc9535Path(ctx: ParserContext, profile: Profile) {
	const first = expect(ctx, TokenKinds.Dollar);
	void first;

	const segments: any[] = [];
	while (ctx.tokens.peek()) {
		const t = ctx.tokens.peek()!;
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
				const { selectors } = parseBracketSelectors(ctx, profile);
				segments.push(descendantSegment(selectors));
				continue;
			}
			syntaxError(ctx, next.offset, 'Unexpected token after ..');
		}

		if (t.kind === TokenKinds.LBracket) {
			const { selectors } = parseBracketSelectors(ctx, profile);
			segments.push(segment(selectors));
			continue;
		}

		syntaxError(ctx, t.offset, `Unexpected token in path: ${t.kind}`);
	}

	return path(segments);
}
```

- [x] Update the root syntax plugin to install lexer rules + parser.
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-root/src/index.ts` (this replaces the file):

```ts
import type { JsonPathPlugin } from '@jsonpath/core';
import {
	registerRfc9535ScanRules,
	registerRfc9535LiteralScanRules,
} from '@jsonpath/lexer';

import { parseRfc9535Path } from './parser';

type Profile = 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full';

export function createSyntaxRootPlugin(): JsonPathPlugin<{
	profile?: Profile;
}> {
	// IMPORTANT: keep this as per-engine state (avoid module-level mutation).
	let profile: Profile = 'rfc9535-draft';

	return {
		meta: {
			id: '@jsonpath/plugin-syntax-root',
			capabilities: ['syntax:rfc9535:root'],
		},
		configure: (cfg) => {
			profile = cfg?.profile ?? 'rfc9535-draft';
		},
		hooks: {
			registerTokens: (scanner) => {
				registerRfc9535ScanRules(scanner);
				registerRfc9535LiteralScanRules(scanner);
			},
			registerParsers: (parser) => {
				parser.registerSegmentParser((ctx) => parseRfc9535Path(ctx, profile));
			},
		},
	};
}

// Back-compat singleton (prefer createSyntaxRootPlugin() in presets/tests).
export const plugin = createSyntaxRootPlugin();
```

- [x] Add plugin tests for basic parsing.
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-root/src/index.spec.ts` (this replaces the file):

```ts
import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { createSyntaxRootPlugin, plugin } from './index';

describe('@jsonpath/plugin-syntax-root', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-root');
		expect(plugin.meta.capabilities).toEqual(['syntax:rfc9535:root']);
	});
});

describe('@jsonpath/plugin-syntax-root parser', () => {
	it('parses $ and dot-notation', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const ast = engine.parse('$.store.book');
		expect(ast.kind).toBe('Path');
		expect(ast.segments).toHaveLength(2);
	});

	it('parses bracket selectors', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const ast = engine.parse("$['a'][0]");
		expect(ast.segments).toHaveLength(2);
	});

	it('parses descendant segments', () => {
		const engine = createEngine({
			plugins: [createSyntaxRootPlugin()],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const ast = engine.parse('$..author');
		expect(ast.segments[0]!.kind).toBe('DescendantSegment');
	});
});
```

##### Step 3 Verification Checklist

- [x] `pnpm --filter @jsonpath/plugin-syntax-root test`

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): implement RFC9535 core path parser

- Add minimal RFC9535 parser in plugin-syntax-root
- Wire token scan rules + literal scan rules
- Add vitest coverage for $/dot/bracket/descendant parsing

completes: step 3 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4 (C10): Add a segment-evaluator hook (framework-only) + export runtime helpers

This is a **required architecture fix** to keep `@jsonpath/core` framework-only:

- Core should not hard-code RFC segment semantics like `DescendantSegment`.
- Instead, core should provide an extension point for **segment evaluation** (similar to selector evaluators).

Also, PR B syntax plugins need to build `Location`s, but `@jsonpath/core` only exports `"."` (no subpath exports). So we must export the runtime location/node helpers from the package root.

- [x] Update `EvaluatorRegistry` to support segment evaluators.
- [x] Copy and paste code below into `packages/jsonpath/core/src/runtime/hooks.ts` (replace the file):

```ts
import type { SegmentNode, SelectorNode } from '@jsonpath/ast';

import type { JsonPathNode } from './node';

export type SelectorEvaluator = (
	input: JsonPathNode,
	selector: SelectorNode,
) => readonly JsonPathNode[];

export type SegmentEvaluator = (
	inputs: readonly JsonPathNode[],
	segment: SegmentNode,
	evaluators: EvaluatorRegistry,
) => readonly JsonPathNode[];

export class EvaluatorRegistry {
	private readonly selectorEvaluators = new Map<string, SelectorEvaluator>();
	private readonly segmentEvaluators = new Map<string, SegmentEvaluator>();

	public registerSelector(kind: string, evaluator: SelectorEvaluator): void {
		this.selectorEvaluators.set(kind, evaluator);
	}

	public getSelector(kind: string): SelectorEvaluator | undefined {
		return this.selectorEvaluators.get(kind);
	}

	public registerSegment(kind: string, evaluator: SegmentEvaluator): void {
		this.segmentEvaluators.set(kind, evaluator);
	}

	public getSegment(kind: string): SegmentEvaluator | undefined {
		return this.segmentEvaluators.get(kind);
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

- [x] Update `evaluateSync` to use a segment evaluator when available, otherwise fall back to the default “apply selectors” behavior.
- [x] Copy and paste code below into `packages/jsonpath/core/src/createEngine.ts` (replace only `evaluateSync` with this version):

```ts
const evaluateSync = (
	compiled: CompileResult,
	json: unknown,
	evaluateOptions?: EvaluateOptions,
) => {
	let nodes: JsonPathNode[] = [rootNode(json)];

	for (const seg of compiled.ast.segments) {
		const evalSegment = evaluators.getSegment(seg.kind);
		if (evalSegment) {
			nodes = [...evalSegment(nodes, seg as any, evaluators)];
			continue;
		}

		const selectors = (seg as any).selectors;
		if (!Array.isArray(selectors)) {
			throw new JsonPathError({
				code: JsonPathErrorCodes.Evaluation,
				message: `No segment evaluator registered for segment kind: ${seg.kind}`,
			});
		}

		const next: JsonPathNode[] = [];
		for (const inputNode of nodes) {
			for (const selector of selectors) {
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
```

- [x] Export runtime helpers from `@jsonpath/core` (required so syntax plugins do not use invalid deep imports).
- [x] Copy and paste code below into `packages/jsonpath/core/src/index.ts` (append these exports):

```ts
export type { Location, LocationComponent } from './runtime/location';
export { appendIndex, appendMember, rootLocation } from './runtime/location';
export type { JsonPathNode } from './runtime/node';
export { rootNode } from './runtime/node';
```

- [x] Add a core test proving segment evaluators are invoked.
- [x] Copy and paste code below into `packages/jsonpath/core/src/engine.segment-evaluator.spec.ts` (new file):

```ts
import { describe, expect, it } from 'vitest';

import { nameSelector, path, segment } from '@jsonpath/ast';
import type { JsonPathPlugin } from './plugins/types';

import { createEngine } from './createEngine';

const segmentOverride: JsonPathPlugin = {
	meta: { id: 'test:segment-override' },
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSegment('Segment', () => []);
		},
	},
};

describe('@jsonpath/core segment evaluator hook', () => {
	it('invokes a registered segment evaluator by kind', () => {
		const engine = createEngine({ plugins: [segmentOverride] });
		const compiled = {
			expression: '$.x',
			ast: path([segment([nameSelector('x')])]),
		};
		const out = engine.evaluateSync(compiled as any, { x: 1 });
		expect(out).toEqual([]);
	});
});
```

##### Step 4 Verification Checklist

- [x] `pnpm --filter @jsonpath/core test`

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): add segment evaluator hook + export runtime helpers

- Add framework-level segment evaluator registry
- Update core evaluation loop to dispatch by segment kind
- Export Location/Node helpers from @jsonpath/core package root

completes: step 4 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5 (C10): Implement DescendantSegment semantics in `@jsonpath/plugin-syntax-descendant`

- [x] Implement descendant segment evaluation semantics via the new segment evaluator hook.
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-descendant/src/index.ts` (this replaces the file):

```ts
import {
	JsonPathError,
	JsonPathErrorCodes,
	appendIndex,
	appendMember,
} from '@jsonpath/core';
import type { JsonPathPlugin } from '@jsonpath/core';
import type { SegmentNode } from '@jsonpath/ast';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-descendant',
		capabilities: ['syntax:rfc9535:descendant'],
	},
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSegment(
				'DescendantSegment',
				(inputs, segment: SegmentNode & { selectors: any[] }, evaluators) => {
					function descendantsOrSelf(node: any): any[] {
						const out: any[] = [node];
						const queue: any[] = [node];
						while (queue.length) {
							const current = queue.shift()!;
							const v = current.value;
							if (Array.isArray(v)) {
								for (let i = 0; i < v.length; i += 1) {
									const child = {
										value: v[i],
										location: appendIndex(current.location, i),
									};
									out.push(child);
									queue.push(child);
								}
								continue;
							}
							if (isRecord(v)) {
								for (const key of Object.keys(v).sort()) {
									const child = {
										value: v[key],
										location: appendMember(current.location, key),
									};
									out.push(child);
									queue.push(child);
								}
							}
						}
						return out;
					}

					const expanded = inputs.flatMap((n) => descendantsOrSelf(n));
					const next: any[] = [];
					for (const inputNode of expanded) {
						for (const selector of segment.selectors) {
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
					return next;
				},
			);
		},
	},
};
```

- [x] Add a focused plugin test proving `$..x` works end-to-end.
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-descendant/src/index.spec.ts` (new file):

```ts
import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { plugin as childMember } from '@jsonpath/plugin-syntax-child-member';
import { createSyntaxRootPlugin } from '@jsonpath/plugin-syntax-root';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-descendant (value)', () => {
	it('selects all descendants matching a name', () => {
		const root = createSyntaxRootPlugin();
		const engine = createEngine({
			plugins: [root, plugin, childMember],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile('$..x'), {
			x: 1,
			a: { x: 2 },
			b: { c: { x: 3 } },
		});
		expect(out).toEqual([1, 2, 3]);
	});
});
```

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-syntax-descendant test`

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): implement DescendantSegment via segment evaluator hook

- Register segment evaluator for DescendantSegment in syntax-descendant plugin
- Add focused end-to-end plugin test for $..name

completes: step 5 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6 (C11–C14): Implement core selector evaluators (name/wildcard/index/slice)

- [x] Implement the selector evaluators in their respective syntax plugins.

- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-child-member/src/index.ts` (this replaces the file):

```ts
import type { JsonPathPlugin } from '@jsonpath/core';
import { SelectorKinds } from '@jsonpath/ast';

import { appendMember } from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-child-member',
		capabilities: ['syntax:rfc9535:child-member'],
	},
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSelector(SelectorKinds.Name, (input, selector: any) => {
				if (!isRecord(input.value)) return [];
				const name = String(selector.name);
				if (!(name in input.value)) return [];
				return [
					{
						value: (input.value as any)[name],
						location: appendMember(input.location, name),
					},
				];
			});
		},
	},
};
```

- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-wildcard/src/index.ts` (this replaces the file):

```ts
import type { JsonPathPlugin } from '@jsonpath/core';
import { SelectorKinds } from '@jsonpath/ast';

import { appendIndex, appendMember } from '@jsonpath/core';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-wildcard',
		capabilities: ['syntax:rfc9535:wildcard'],
	},
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSelector(SelectorKinds.Wildcard, (input) => {
				const v = input.value;
				if (Array.isArray(v)) {
					return v.map((item, i) => ({
						value: item,
						location: appendIndex(input.location, i),
					}));
				}
				if (isRecord(v)) {
					const keys = Object.keys(v).sort();
					return keys.map((k) => ({
						value: (v as any)[k],
						location: appendMember(input.location, k),
					}));
				}
				return [];
			});
		},
	},
};
```

- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-child-index/src/index.ts` (this replaces the file):

```ts
import type { JsonPathPlugin } from '@jsonpath/core';
import { SelectorKinds } from '@jsonpath/ast';

import { appendIndex } from '@jsonpath/core';

function normalizeIndex(index: number, length: number): number {
	if (index < 0) return length + index;
	return index;
}

function computeSliceIndices(args: {
	start?: number;
	end?: number;
	step?: number;
	length: number;
}): number[] {
	const step = args.step ?? 1;
	if (step === 0) return [];

	const length = args.length;
	const startRaw = args.start ?? (step > 0 ? 0 : length - 1);
	const endRaw = args.end ?? (step > 0 ? length : -1);

	let start = startRaw;
	let end = endRaw;

	// Normalize negative to relative.
	if (start < 0) start = length + start;
	if (end < 0) end = length + end;

	const out: number[] = [];
	if (step > 0) {
		for (let i = Math.max(0, start); i < Math.min(length, end); i += step)
			out.push(i);
		return out;
	}

	for (let i = Math.min(length - 1, start); i > Math.max(-1, end); i += step)
		out.push(i);
	return out;
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-child-index',
		capabilities: ['syntax:rfc9535:child-index', 'syntax:rfc9535:slice'],
	},
	hooks: {
		registerEvaluators: (registry) => {
			registry.registerSelector(SelectorKinds.Index, (input, selector: any) => {
				if (!Array.isArray(input.value)) return [];
				const idx = normalizeIndex(Number(selector.index), input.value.length);
				if (idx < 0 || idx >= input.value.length) return [];
				return [
					{
						value: input.value[idx],
						location: appendIndex(input.location, idx),
					},
				];
			});

			registry.registerSelector(SelectorKinds.Slice, (input, selector: any) => {
				if (!Array.isArray(input.value)) return [];
				const indices = computeSliceIndices({
					start: selector.start as any,
					end: selector.end as any,
					step: selector.step as any,
					length: input.value.length,
				});
				return indices.map((i) => ({
					value: input.value[i],
					location: appendIndex(input.location, i),
				}));
			});
		},
	},
};
```

- [x] Add tests to each syntax plugin proving evaluation results.

- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-child-member/src/index.spec.ts` (new file):

```ts
import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { plugin as root } from '@jsonpath/plugin-syntax-root';
import { plugin } from './index';

describe('@jsonpath/plugin-syntax-child-member', () => {
	it("selects $.o['j j']", () => {
		const engine = createEngine({
			plugins: [root, plugin],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile("$.o['j j']"), {
			o: { 'j j': 42 },
		});
		expect(out).toEqual([42]);
	});
});
```

- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-wildcard/src/index.spec.ts` (append a value test):

```ts
import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { plugin as root } from '@jsonpath/plugin-syntax-root';
import { plugin } from './index';

describe('@jsonpath/plugin-syntax-wildcard (value)', () => {
	it('selects all array items', () => {
		const engine = createEngine({
			plugins: [root, plugin],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile('$[*]'), [1, 2, 3]);
		expect(out).toEqual([1, 2, 3]);
	});
});
```

- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-child-index/src/index.spec.ts` (new file):

```ts
import { describe, expect, it } from 'vitest';

import { createEngine } from '@jsonpath/core';
import { plugin as root } from '@jsonpath/plugin-syntax-root';
import { plugin } from './index';

describe('@jsonpath/plugin-syntax-child-index (value)', () => {
	it('selects index selectors', () => {
		const engine = createEngine({
			plugins: [root, plugin],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile('$[0,-1]'), [1, 2, 3]);
		expect(out).toEqual([1, 3]);
	});

	it('selects slice selectors', () => {
		const engine = createEngine({
			plugins: [root, plugin],
			options: {
				plugins: {
					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-core' },
				},
			},
		});
		const out = engine.evaluateSync(engine.compile('$[1:3]'), [1, 2, 3, 4]);
		expect(out).toEqual([2, 3]);
	});
});
```

##### Step 6 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-syntax-child-member test`
- [ ] `pnpm --filter @jsonpath/plugin-syntax-wildcard test`
- [ ] `pnpm --filter @jsonpath/plugin-syntax-child-index test`
- [ ] `pnpm --filter @jsonpath/core test`

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): implement core selector evaluators

- Add evaluators for name, wildcard, index, and slice selectors
- Add focused per-plugin tests running through @jsonpath/core

completes: step 6 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 7 (C12–C14): Wire profile config to syntax plugins via RFC preset engine

- [x] Update the RFC preset engine so `profile` is passed to the syntax-root plugin (and any other plugin that needs profile gating).
- [x] In `packages/jsonpath/plugin-rfc-9535/src/index.ts`, add this import near the top of the file:

```ts
import { createSyntaxRootPlugin } from '@jsonpath/plugin-syntax-root';
```

- [x] Copy and paste code below into `packages/jsonpath/plugin-rfc-9535/src/index.ts` (replace only `createRfc9535Engine` with this version):

```ts
export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	const profile = options?.profile ?? 'rfc9535-draft';
	// IMPORTANT: create a fresh syntax-root plugin instance per engine to avoid shared mutable state.
	const root = createSyntaxRootPlugin();
	return createEngine({
		plugins: [
			root,
			...rfc9535Plugins.filter(
				(p) => p.meta.id !== '@jsonpath/plugin-syntax-root',
			),
		],
		options: {
			plugins: {
				'@jsonpath/plugin-rfc-9535': { profile },
				'@jsonpath/plugin-syntax-root': { profile },
			},
		},
	});
}
```

##### Step 7 Verification Checklist

- [x] `pnpm --filter @jsonpath/plugin-rfc-9535 test`

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): pass profile config to syntax-root plugin

- Ensure syntax-root can enforce rfc9535-core feature gates

completes: step 7 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 8: Flip conformance cases from expected-failing to passing for rfc9535-core

- [ ] Extend the conformance corpus with core-selector cases that should pass under `rfc9535-core`.
- [ ] Update `packages/jsonpath/conformance/src/corpus.ts` to add cases like:
  - [ ] `$` value output (resultType:value)
  - [ ] `$.o['j j']` member select
  - [ ] `$[*]` wildcard
  - [ ] `$[0,-1]` index union
  - [ ] `$..author` descendant name

- [ ] Update `packages/jsonpath/conformance/src/index.spec.ts` to convert the corresponding `it.fails(...)` tests into normal `it(...)` tests for `profile: 'rfc9535-core'`.

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-rfc9535): enable passing rfc9535-core conformance cases

- Add core-selector conformance cases and assertions
- Convert selected it.fails() cases to it() under rfc9535-core

completes: step 8 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 9: Keep rfc9535-core rejecting unsupported syntax (filters/functions/paths)

- [ ] Add conformance cases asserting that filter syntax (e.g. `$[?@.a]`) fails fast under `rfc9535-core` with `JsonPathError` code `JSONPATH_SYNTAX_ERROR`.
- [ ] Ensure `packages/jsonpath/plugin-syntax-root/src/parser.ts` throws the stable error message `Filter selectors are not supported in rfc9535-core`.

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-rfc9535): enforce rfc9535-core unsupported syntax failures

- Add conformance cases for filter rejection under rfc9535-core

completes: step 9 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 10: PR B exit validation

- [ ] Run the PR B package test suite:
  - [ ] `pnpm --filter @jsonpath/ast test`
  - [ ] `pnpm --filter @jsonpath/lexer test`
  - [ ] `pnpm --filter @jsonpath/core test`
  - [ ] `pnpm --filter @jsonpath/plugin-syntax-root test`
  - [ ] `pnpm --filter @jsonpath/plugin-syntax-descendant test`
  - [ ] `pnpm --filter @jsonpath/plugin-syntax-child-member test`
  - [ ] `pnpm --filter @jsonpath/plugin-syntax-wildcard test`
  - [ ] `pnpm --filter @jsonpath/plugin-syntax-child-index test`
  - [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`

##### Step 10 Verification Checklist

- [ ] Conformance: all `rfc9535-core` tests for core selectors are green
- [ ] Conformance: filter/function/path tests remain expected failures or are explicitly rejected under core

#### Step 10 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(jsonpath-rfc9535): complete PR B core selector compliance

- Ship RFC9535 core parsing and evaluation for selectors/segments
- Keep rfc9535-core rejecting unsupported features

completes: step 10 of 10 for jsonpath-rfc9535 (PR B)
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Remaining PRs (outline only)

- PR C (C15–C18): filter parsing + evaluation enabled only for `rfc9535-full`.
- PR D (C19–C25): function parsing + typing + implementations for `length/count/match/search/value` under `rfc9535-full`.
- PR E (C26–C28): normalized paths (`resultType: 'path'`) under `rfc9535-full`.
- PR F (C23–C24 if split): RFC 9485 I-Regexp validation + matcher, used by `match/search`.

### Remaining commits not explicitly assigned to a PR yet

The master plan includes additional compliance requirements that must be implemented before claiming `rfc9535-full` compliance:

- C29: string literal escape + Unicode handling (upgrade `decodeQuotedString` and any lexer/string handling to match RFC requirements; add conformance cases).
- C30: integer range validity checks (I-JSON exact integer constraints; add conformance cases).
- C31: descendant traversal edge cases + ordering semantics (ensure behavior matches RFC; add conformance cases).
- C32: union semantics and duplicate-retention rules (ensure selector unions behave per RFC; add conformance cases).
- C34: error codes + offsets (ensure stable `JsonPathError` codes and correct `location.offset` for parse/eval failures; add conformance cases).
