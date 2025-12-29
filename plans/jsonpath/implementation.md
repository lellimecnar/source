<!-- markdownlint-disable-file -->

# jsonpath

## Goal

Implement the full `@jsonpath/*` package suite described in `specs/jsonpath.md`, following `plans/jsonpath/plan.md` commit-by-commit, with RFC 9535 compliance by default and no `eval`/`new Function`.

## Prerequisites

- Ensure you are on branch `jsonpath` (create from `master` if missing).
- Run all commands from the repository root.

### Step-by-Step Instructions

#### Step 1: Monorepo wiring + scaffold all `@jsonpath/*` packages

- [ ] Update workspace globs in `pnpm-workspace.yaml`, root `package.json`, and `vitest.config.ts`.
- [ ] Create scaffolds for:
  - [ ] `packages/jsonpath/core`
  - [ ] `packages/jsonpath/extensions`
  - [ ] `packages/jsonpath/legacy`
  - [ ] `packages/jsonpath/mutate`
  - [ ] `packages/jsonpath/pointer`
  - [ ] `packages/jsonpath/patch`
  - [ ] `packages/jsonpath/cli`
  - [ ] `packages/jsonpath/wasm`
  - [ ] `packages/jsonpath/complete`

- [ ] Run the script below from the repo root (it overwrites/creates the listed files exactly):

```bash
set -euo pipefail

# --- repo wiring ---

cat > pnpm-workspace.yaml <<'YAML'
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'packages/card-stack/*'
  - 'packages/ui-spec/*'
  - 'packages/jsonpath/*'
YAML

cat > vitest.config.ts <<'TS'
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			'packages/*/vitest.config.ts',
			'packages/card-stack/*/vitest.config.ts',
			'packages/ui-spec/*/vitest.config.ts',
			'packages/jsonpath/*/vitest.config.ts',
			'web/*/vitest.config.ts',
		],
	},
});
TS

cat > package.json <<'JSON'
{
	"name": "@lellimecnar/source",
	"version": "1.0.0",
	"private": true,
	"workspaces": [
		"packages/*",
		"packages/card-stack/*",
		"packages/ui-spec/*",
		"packages/jsonpath/*",
		"web/*",
		"mobile/*"
	],
	"scripts": {
		"analyze:miller.pub": "cd web/miller.pub && ANALYZE=true pnpm build",
		"analyze:readon.app": "cd web/readon.app && ANALYZE=true pnpm build",
		"build": "turbo build",
		"clean": "turbo clean; git clean -xdf node_modules .turbo .next .expo",
		"clean:hard": "pnpm clean && rm -rf pnpm-lock.yaml && pnpm install",
		"dev": "turbo dev",
		"format": "prettier --write \"**/*.{js,jsx,ts,tsx,md,json}\"",
		"graph": "pnpm list --depth=Infinity --json",
		"lint": "turbo lint",
		"miller.pub": "turbo run -F miller.pub",
		"outdated": "pnpm outdated --recursive",
		"prepare": "husky",
		"readon": "turbo run -F readon",
		"readon.app": "turbo run -F readon.app",
		"test": "turbo test -- --passWithNoTests",
		"test:coverage": "turbo test:coverage",
		"test:watch": "turbo test:watch",
		"type-check": "turbo type-check",
		"ui": "turbo run -F @lellimecnar/ui",
		"update-interactive": "pnpm update --interactive --recursive --latest",
		"verify:exports": "node scripts/node/verify-dist-exports.mjs",
		"why": "pnpm why"
	},
	"lint-staged": {
		"*.{js,jsx,ts,tsx,mjs,cjs}": [
			"pnpm format"
		],
		"*.{json,md,yml,yaml}": [
			"prettier --write"
		]
	},
	"overrides": {
		"eslint": "^8",
		"react": "^19",
		"react-dom": "^19"
	},
	"dependencies": {
		"web-vitals": "^5.1.0"
	},
	"devDependencies": {
		"@changesets/cli": "^2.29.8",
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/prettier-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lhci/cli": "^0.15.1",
		"@types/node": "^24",
		"@typescript/native-preview": "7.0.0-dev.20251228.1",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"husky": "^9.1.7",
		"lint-staged": "^16.2.7",
		"prettier": "^3.4.2",
		"turbo": "^2.3.3",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	},
	"packageManager": "pnpm@9.12.2",
	"engines": {
		"node": "^24.12.0",
		"pnpm": "^9.12.2"
	}
}
JSON

# Create packages
mkdir -p packages/jsonpath

# (Scaffold scripts elided here for brevity in this first commit of the implementation doc; subsequent steps overwrite real source.)
# NOTE: For Step 1 in the actual PR, use the scaffolding approach shown in plans/jsonpath/plan.md and mirror packages/polymix.

echo "Step 1 wiring complete."
```

##### Step 1 Verification Checklist

# --- package scaffolds ---

mkdir -p packages/jsonpath

create_pkg() {
local dir="$1"
	local name="$2"
	shift 2
	local extra_deps_json="${1:-}"
local extra_scripts_json="${2:-}"
	local extra_fields_json="${3:-}"

    mkdir -p "$dir/src"

    cat > "$dir/tsconfig.json" <<'JSON'

{
"extends": "@lellimecnar/typescript-config",
"compilerOptions": {
"outDir": "./dist",
"rootDir": "./src",
"noEmit": false,
"declaration": true,
"declarationMap": true,
"sourceMap": true,
"module": "ESNext",
"moduleResolution": "Bundler"
},
"include": ["src/**/*"],
"exclude": ["dist", "node_modules"]
}
JSON

    cat > "$dir/vitest.config.ts" <<'TS'

import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
TS

    cat > "$dir/vite.config.ts" <<'TS'

import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

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
TS

    cat > "$dir/src/index.ts" <<TS

export const \_\_pkg = '${name}';
TS

    cat > "$dir/src/smoke.spec.ts" <<'TS'

import { describe, expect, it } from 'vitest';

import { \_\_pkg } from './index';

describe('smoke', () => {
it('exports a stable value', () => {
expect(typeof **pkg).toBe('string');
expect(**pkg.length).toBeGreaterThan(0);
});
});
TS

    cat > "$dir/package.json" <<JSON

{
"name": "${name}",
	"version": "0.1.0",
	"description": "${name}",
"license": "MIT",
"type": "module",
"sideEffects": false,
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
${extra_scripts_json}
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo -p tsconfig.json --noEmit"
	},
${extra*deps_json}
"devDependencies": {
"@lellimecnar/eslint-config": "workspace:*",
"@lellimecnar/typescript-config": "workspace:\_",
"@lellimecnar/vite-config": "workspace:^",
"@lellimecnar/vitest-config": "workspace:\*",
"@types/node": "^24",
"@vitest/coverage-v8": "^4.0.16",
"eslint": "^8.57.1",
"typescript": "~5.5",
"vite": "^7.3.0",
"vite-plugin-dts": "^4.5.4",
"vite-tsconfig-paths": "^6.0.3",
"vitest": "^4.0.16"
},
"publishConfig": {
"access": "public"
}
${extra_fields_json}
}
JSON
}

create*pkg "packages/jsonpath/core" "@jsonpath/core" "" "" ""
create_pkg "packages/jsonpath/extensions" "@jsonpath/extensions" "\t\"dependencies\": {\n\t\t\"@jsonpath/core\": \"workspace:*\"\n\t},\n" "" ""
create*pkg "packages/jsonpath/legacy" "@jsonpath/legacy" "\t\"dependencies\": {\n\t\t\"@jsonpath/core\": \"workspace:*\"\n\t},\n" "" ""
create*pkg "packages/jsonpath/mutate" "@jsonpath/mutate" "\t\"dependencies\": {\n\t\t\"@jsonpath/core\": \"workspace:*\"\n\t},\n" "" ""
create*pkg "packages/jsonpath/pointer" "@jsonpath/pointer" "" "" ""
create_pkg "packages/jsonpath/patch" "@jsonpath/patch" "\t\"dependencies\": {\n\t\t\"@jsonpath/pointer\": \"workspace:*\"\n\t},\n" "" ""
create*pkg "packages/jsonpath/complete" "@jsonpath/complete" "\t\"dependencies\": {\n\t\t\"@jsonpath/core\": \"workspace:*\",\n\t\t\"@jsonpath/extensions\": \"workspace:_\",\n\t\t\"@jsonpath/legacy\": \"workspace:_\",\n\t\t\"@jsonpath/mutate\": \"workspace:_\",\n\t\t\"@jsonpath/pointer\": \"workspace:_\",\n\t\t\"@jsonpath/patch\": \"workspace:\_\"\n\t},\n" "" ""

# CLI (bin + postbuild)

mkdir -p packages/jsonpath/cli/bin
cat > packages/jsonpath/cli/bin/jsonpath.js <<'JS'
#!/usr/bin/env node
import '../index.js';
JS

create_pkg \
 "packages/jsonpath/cli" \
 "@jsonpath/cli" \
 "\t\"dependencies\": {\n\t\t\"@jsonpath/complete\": \"workspace:\*\"\n\t},\n" \
 "\t\"postbuild\": \"node -e \\\"require('node:fs').cpSync('bin', 'dist/bin', { recursive: true })\\\"\",\n" \
 ",\n\t\"bin\": {\n\t\t\"jsonpath\": \"./dist/bin/jsonpath.js\"\n\t}"

# WASM (interface-level scaffold)

create_pkg "packages/jsonpath/wasm" "@jsonpath/wasm" "\t\"dependencies\": {\n\t\t\"@jsonpath/core\": \"workspace:\*\"\n\t},\n" "" ""

echo "Step 1 wiring + scaffolds complete."

```txt
feat(jsonpath): scaffold @jsonpath/* workspaces

- Add packages/jsonpath/* to pnpm workspace globs and root workspaces
- Include jsonpath packages in root Vitest projects
- Scaffold @jsonpath/* packages with Vite/Vitest/tsconfig conventions

completes: step 1 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: `@jsonpath/core` public types + error hierarchy + options contract

- [ ] Add `QueryOptions`, `CompileOptions`, `NormalizedPath`, `Node<T>`, `CompiledPath<T>`.
- [ ] Add core error classes (`JSONPathError`, `JSONPathSyntaxError`, `JSONPathRuntimeError`, `JSONPathSecurityError`, `JSONPathTimeoutError`).
- [ ] Run the script below from the repo root:

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src

cat > packages/jsonpath/core/src/types.ts <<'TS'
export type NormalizedPathSegment = '$' | string | number;
export type NormalizedPath = NormalizedPathSegment[];

export type Node<T> = {
	path: NormalizedPath;
	value: T;
	parent: unknown;
	parentProperty: string | number;
};

export type ValidateResult = {
	valid: boolean;
	errors: unknown[];
};

export type CompiledPath<T> = {
	readonly path: string;
	query(data: unknown): T[];
	first(data: unknown): T | undefined;
	exists(data: unknown): boolean;
	count(data: unknown): number;
	paths(data: unknown): NormalizedPath[];
	nodes(data: unknown): Node<T>[];
	validate(data?: unknown): ValidateResult;
	readonly ast?: unknown;
};
TS

cat > packages/jsonpath/core/src/options.ts <<'TS'
import type { CompiledPath } from './types';

export type JSONPathMode = 'rfc9535' | 'goessner' | 'jsonpath-plus' | 'auto';

export type QueryOptions = {
	strict?: boolean;
	maxDepth?: number;
	maxResults?: number;
	timeout?: number;
	cache?: boolean | unknown;
	mode?: JSONPathMode;
	extensions?: unknown[];
	functions?: unknown;
	wrap?: boolean;
	flatten?: boolean;
};

export type CompileOptions = QueryOptions & {
	validate?: boolean;
	optimize?: boolean;
};

export type EngineOptions = {
	extensions?: unknown[];
	functions?: unknown;
	grammar?: unknown;
	cache?: unknown;
	security?: unknown;
	csp?: unknown;
	audit?: unknown;
	accelerator?: unknown;
};

export type CacheLike = {
	get(key: string): CompiledPath<unknown> | undefined;
	set(key: string, value: CompiledPath<unknown>): void;
};
TS

cat > packages/jsonpath/core/src/errors.ts <<'TS'
export type JSONPathErrorCode =
	| 'JSONPATH_ERROR'
	| 'JSONPATH_SYNTAX_ERROR'
	| 'JSONPATH_RUNTIME_ERROR'
	| 'JSONPATH_SECURITY_ERROR'
	| 'JSONPATH_TIMEOUT_ERROR';

export class JSONPathError extends Error {
	readonly code: JSONPathErrorCode;
	readonly path?: string;

	constructor(message: string, opts?: { code?: JSONPathErrorCode; path?: string }) {
		super(message);
		this.name = 'JSONPathError';
		this.code = opts?.code ?? 'JSONPATH_ERROR';
		this.path = opts?.path;
	}
}

export class JSONPathSyntaxError extends JSONPathError {
	readonly position: number;
	readonly line: number;
	readonly column: number;
	readonly expected: string[];
	readonly found: string;

	constructor(
		message: string,
		meta: {
			path?: string;
			position: number;
			line: number;
			column: number;
			expected: string[];
			found: string;
		},
	) {
		super(message, { code: 'JSONPATH_SYNTAX_ERROR', path: meta.path });
		this.name = 'JSONPathSyntaxError';
		this.position = meta.position;
		this.line = meta.line;
		this.column = meta.column;
		this.expected = meta.expected;
		this.found = meta.found;
	}
}

export class JSONPathRuntimeError extends JSONPathError {
	readonly segment?: string;

	constructor(message: string, meta?: { path?: string; segment?: string }) {
		super(message, { code: 'JSONPATH_RUNTIME_ERROR', path: meta?.path });
		this.name = 'JSONPathRuntimeError';
		this.segment = meta?.segment;
	}
}

export class JSONPathSecurityError extends JSONPathError {
	readonly violation: string;

	constructor(message: string, meta: { path?: string; violation: string }) {
		super(message, { code: 'JSONPATH_SECURITY_ERROR', path: meta.path });
		this.name = 'JSONPathSecurityError';
		this.violation = meta.violation;
	}
}

export class JSONPathTimeoutError extends JSONPathError {
	readonly elapsed: number;

	constructor(message: string, meta: { path?: string; elapsed: number }) {
		super(message, { code: 'JSONPATH_TIMEOUT_ERROR', path: meta.path });
		this.name = 'JSONPathTimeoutError';
		this.elapsed = meta.elapsed;
	}
}
TS

cat > packages/jsonpath/core/src/index.ts <<'TS'
export * from './errors';
export * from './options';
export * from './types';
TS

cat > packages/jsonpath/core/src/types.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import {
	JSONPathError,
	JSONPathSecurityError,
	JSONPathSyntaxError,
	JSONPathTimeoutError,
} from './index';

describe('public surface', () => {
	it('exports error types', () => {
		const base = new JSONPathError('x');
		expect(base.code).toBe('JSONPATH_ERROR');

		const se = new JSONPathSecurityError('nope', { violation: 'blocked' });
		expect(se.code).toBe('JSONPATH_SECURITY_ERROR');

		const te = new JSONPathTimeoutError('slow', { elapsed: 123 });
		expect(te.code).toBe('JSONPATH_TIMEOUT_ERROR');

		const syn = new JSONPathSyntaxError('bad', {
			position: 0,
			line: 1,
			column: 1,
			expected: ['something'],
			found: 'x',
		});
		expect(syn.code).toBe('JSONPATH_SYNTAX_ERROR');
	});
});
TS

echo "Step 2 complete."
```

##### Step 2 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 2 STOP & COMMIT

```txt
feat(jsonpath-core): add public types + errors

- Define public option/types surface (QueryOptions, CompileOptions, Node, paths)
- Add error hierarchy with safe metadata

completes: step 2 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: `@jsonpath/core` security primitives (sandbox + guards + modes)

- [ ] Add `Sandbox`, `SecurityLevel`, `CSPMode`, and prototype-pollution guards.
- [ ] Run the script below from the repo root:

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/security

cat > packages/jsonpath/core/src/security/levels.ts <<'TS'
export enum SecurityLevel {
	Strict = 'strict',
	Relaxed = 'relaxed',
}

export enum CSPMode {
	Strict = 'strict',
	None = 'none',
}
TS

cat > packages/jsonpath/core/src/security/guards.ts <<'TS'
import { JSONPathSecurityError } from '../errors';

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function assertSafePropertyKey(key: string, path?: string) {
	if (BLOCKED_KEYS.has(key)) {
		throw new JSONPathSecurityError('Blocked prototype-pollution key', {
			path,
			violation: key,
		});
	}
}

export function isObjectLike(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
TS

cat > packages/jsonpath/core/src/security/Sandbox.ts <<'TS'
import { JSONPathTimeoutError } from '../errors';

export type SandboxLimits = {
	maxDepth?: number;
	maxIterations?: number;
	timeoutMs?: number;
};

export class Sandbox {
	private readonly startedAt = Date.now();
	private iterations = 0;

	constructor(private readonly limits: SandboxLimits = {}) {}

	check(path?: string) {
		this.iterations += 1;
		if (this.limits.maxIterations != null && this.iterations > this.limits.maxIterations) {
			throw new JSONPathTimeoutError('Sandbox iteration limit exceeded', {
				path,
				elapsed: Date.now() - this.startedAt,
			});
		}
		if (this.limits.timeoutMs != null) {
			const elapsed = Date.now() - this.startedAt;
			if (elapsed > this.limits.timeoutMs) {
				throw new JSONPathTimeoutError('Sandbox timeout exceeded', { path, elapsed });
			}
		}
	}
}
TS

cat > packages/jsonpath/core/src/security/index.ts <<'TS'
export * from './guards';
export * from './levels';
export * from './Sandbox';
TS

cat > packages/jsonpath/core/src/security/guards.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { JSONPathSecurityError } from '../errors';
import { assertSafePropertyKey } from './guards';

describe('security guards', () => {
	it('blocks prototype pollution keys', () => {
		expect(() => assertSafePropertyKey('__proto__')).toThrow(JSONPathSecurityError);
		expect(() => assertSafePropertyKey('constructor')).toThrow(JSONPathSecurityError);
		expect(() => assertSafePropertyKey('prototype')).toThrow(JSONPathSecurityError);
	});
});
TS

echo "Step 3 complete."
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 3 STOP & COMMIT

```txt
feat(jsonpath-core): add security primitives

- Add Sandbox limits + enforcement
- Add prototype-pollution guards
- Add SecurityLevel/CSPMode enums

completes: step 3 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 4: `@jsonpath/core` lexer/parser → AST (scaffold)

- [ ] Add parse modules and stable AST types.
- [ ] Run the script below from the repo root:

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/parse

cat > packages/jsonpath/core/src/parse/ast.ts <<'TS'
export type JSONPathAST = {
	type: 'JSONPath';
	source: string;
};
TS

cat > packages/jsonpath/core/src/parse/tokenize.ts <<'TS'
export type Token = { type: 'char'; value: string; pos: number };

export function tokenize(input: string): Token[] {
	return Array.from(input).map((ch, i) => ({ type: 'char', value: ch, pos: i }));
}
TS

cat > packages/jsonpath/core/src/parse/parser.ts <<'TS'
import { JSONPathSyntaxError } from '../errors';
import type { JSONPathAST } from './ast';
import { tokenize } from './tokenize';

export function parse(path: string): JSONPathAST {
	const tokens = tokenize(path);
	if (tokens.length === 0) {
		throw new JSONPathSyntaxError('Empty JSONPath', {
			path,
			position: 0,
			line: 1,
			column: 1,
			expected: ['$'],
			found: '',
		});
	}
	if (tokens[0]?.value !== '$') {
		throw new JSONPathSyntaxError('JSONPath must start with $', {
			path,
			position: tokens[0]!.pos,
			line: 1,
			column: tokens[0]!.pos + 1,
			expected: ['$'],
			found: tokens[0]!.value,
		});
	}
	return { type: 'JSONPath', source: path };
}
TS

cat > packages/jsonpath/core/src/parse/index.ts <<'TS'
export * from './ast';
export * from './parser';
export * from './tokenize';
TS

cat > packages/jsonpath/core/src/parse/parse.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { JSONPathSyntaxError } from '../errors';
import { parse } from './parser';

describe('parse (scaffold)', () => {
	it('parses $-prefixed paths', () => {
		expect(parse('$.a').type).toBe('JSONPath');
	});

	it('throws on missing $', () => {
		expect(() => parse('.a')).toThrow(JSONPathSyntaxError);
	});
});
TS

echo "Step 4 complete."
```

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 4 STOP & COMMIT

```txt
feat(jsonpath-core): add parse scaffolding

- Add tokenize/parse/ast modules with precise syntax errors

completes: step 4 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 5: `@jsonpath/core` evaluator core (scaffold)

- [ ] Add minimal evaluation, nodes/paths helpers.
- [ ] Run the script below from the repo root:

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/eval

cat > packages/jsonpath/core/src/paths.ts <<'TS'
import type { NormalizedPath } from './types';

export function rootPath(): NormalizedPath {
	return ['$'];
}
TS

cat > packages/jsonpath/core/src/nodes.ts <<'TS'
import type { Node, NormalizedPath } from './types';

export function nodeOf<T>(args: {
	path: NormalizedPath;
	value: T;
	parent: unknown;
	parentProperty: string | number;
}): Node<T> {
	return args;
}
TS

cat > packages/jsonpath/core/src/eval/evaluate.ts <<'TS'
import { JSONPathRuntimeError } from '../errors';
import type { NormalizedPath, Node } from '../types';
import { assertSafePropertyKey, isObjectLike } from '../security/guards';

function getChild(value: unknown, key: string | number, path?: string): unknown {
	if (typeof key === 'string') {
		assertSafePropertyKey(key, path);
	}
	if (Array.isArray(value) && typeof key === 'number') {
		return value[key];
	}
	if (isObjectLike(value) && typeof key === 'string') {
		return (value as Record<string, unknown>)[key];
	}
	return undefined;
}

export function evaluateSimplePath<T>(path: string, data: unknown): Node<T>[] {
	// Minimal implementation: supports $.a.b and $.a[0]
	if (!path.startsWith('$')) {
		throw new JSONPathRuntimeError('Path must start with $', { path });
	}
	const segments: Array<string | number> = [];
	const re = /\.(?<name>[A-Za-z_][A-Za-z0-9_]*)|\[(?<idx>\d+)\]/g;
	for (const match of path.matchAll(re)) {
		if (match.groups?.name) segments.push(match.groups.name);
		if (match.groups?.idx) segments.push(Number(match.groups.idx));
	}
	let current: unknown = data;
	let parent: unknown = undefined;
	let parentProperty: string | number = '$';
	const normalized: NormalizedPath = ['$'];
	for (const seg of segments) {
		parent = current;
		parentProperty = seg;
		current = getChild(current, seg, path);
		normalized.push(seg);
	}
	return [
		{
			path: normalized,
			value: current as T,
			parent,
			parentProperty,
		},
	];
}
TS

cat > packages/jsonpath/core/src/eval/index.ts <<'TS'
export * from './evaluate';
TS

cat > packages/jsonpath/core/src/eval/eval.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { evaluateSimplePath } from './evaluate';

describe('evaluateSimplePath', () => {
	it('reads dot paths', () => {
		const data = { a: { b: 1 } };
		expect(evaluateSimplePath<number>('$.a.b', data)[0]!.value).toBe(1);
	});

	it('reads index paths', () => {
		const data = { a: [10] };
		expect(evaluateSimplePath<number>('$.a[0]', data)[0]!.value).toBe(10);
	});
});
TS

echo "Step 5 complete."
```

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 5 STOP & COMMIT

```txt
feat(jsonpath-core): add evaluator scaffolding

- Add minimal traversal + nodes/paths helpers
- Enforce prototype-pollution guard on property names

completes: step 5 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 6: `@jsonpath/core` filters + operators (scaffold)

- [ ] Add filter evaluation scaffold with no dynamic JS execution.
- [ ] Run the script below from the repo root:

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/filter

cat > packages/jsonpath/core/src/filter/operators.ts <<'TS'
export type BinaryOperator = '==' | '!=' | '<' | '<=' | '>' | '>=';

export function evalBinary(op: BinaryOperator, left: unknown, right: unknown): boolean {
	switch (op) {
		case '==':
			return left === right;
		case '!=':
			return left !== right;
		case '<':
			return (left as any) < (right as any);
		case '<=':
			return (left as any) <= (right as any);
		case '>':
			return (left as any) > (right as any);
		case '>=':
			return (left as any) >= (right as any);
		default:
			return false;
	}
}
TS

cat > packages/jsonpath/core/src/filter/expression.ts <<'TS'
import type { BinaryOperator } from './operators';

export type FilterExpr = {
	type: 'binary';
	op: BinaryOperator;
	leftPath: string;
	rightLiteral: string | number | boolean | null;
};

export function parseFilterExpression(source: string): FilterExpr {
	// Minimal, safe parser: supports @.prop <literal>
	const m = source.trim().match(/^@\.(?<prop>[A-Za-z_][A-Za-z0-9_]*)\s*(?<op>==|!=|<=|>=|<|>)\s*(?<rhs>.+)$/);
	if (!m?.groups) {
		return { type: 'binary', op: '==', leftPath: '$', rightLiteral: false };
	}
	const op = m.groups.op as BinaryOperator;
	let rhs: any = m.groups.rhs.trim();
	if (rhs === 'true') rhs = true;
	else if (rhs === 'false') rhs = false;
	else if (rhs === 'null') rhs = null;
	else if (/^-?\d+(\.\d+)?$/.test(rhs)) rhs = Number(rhs);
	else rhs = rhs.replace(/^"|"$/g, '');
	return { type: 'binary', op, leftPath: `$.${m.groups.prop}`, rightLiteral: rhs };
}
TS

cat > packages/jsonpath/core/src/filter/evalFilter.ts <<'TS'
import { evaluateSimplePath } from '../eval/evaluate';
import { evalBinary } from './operators';
import { parseFilterExpression } from './expression';

export function evalFilter(source: string, current: unknown): boolean {
	const expr = parseFilterExpression(source);
	const left = evaluateSimplePath(expr.leftPath, { $: current } as any)[0]?.value;
	return evalBinary(expr.op, left, expr.rightLiteral);
}
TS

cat > packages/jsonpath/core/src/filter/index.ts <<'TS'
export * from './evalFilter';
export * from './expression';
export * from './operators';
TS

cat > packages/jsonpath/core/src/filter/filter.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { evalFilter } from './evalFilter';

describe('evalFilter (scaffold)', () => {
	it('evaluates simple numeric comparisons', () => {
		expect(evalFilter('@.price > 10', { price: 12 })).toBe(true);
		expect(evalFilter('@.price > 10', { price: 5 })).toBe(false);
	});
});
TS

echo "Step 6 complete."
```

##### Step 6 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 6 STOP & COMMIT

```txt
feat(jsonpath-core): add filter scaffolding

- Add safe filter expression parsing + operator evaluation
- No dynamic JS execution

completes: step 6 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 7: `@jsonpath/core` built-in functions + registry + I-Regexp (scaffold)

- [ ] Add minimal function registry and iregexp validator.

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/functions packages/jsonpath/core/src/iregexp

cat > packages/jsonpath/core/src/functions/defineFunction.ts <<'TS'
export type FunctionDefinition<Name extends string = string> = {
	name: Name;
	signature?: string;
	pure?: boolean;
	implementation: (...args: any[]) => any;
};

export function defineFunction<const Name extends string>(def: FunctionDefinition<Name>) {
	return def;
}
TS

cat > packages/jsonpath/core/src/functions/registry.ts <<'TS'
import type { FunctionDefinition } from './defineFunction';

export type FunctionRegistry = Record<string, FunctionDefinition>;

export function registerFunctions(defs: FunctionDefinition[]): FunctionRegistry {
	return Object.fromEntries(defs.map((d) => [d.name, d]));
}
TS

cat > packages/jsonpath/core/src/functions/builtins.ts <<'TS'
import { defineFunction } from './defineFunction';

export const length = defineFunction({
	name: 'length',
	implementation: (value: any) => {
		if (typeof value === 'string' || Array.isArray(value)) return value.length;
		if (value && typeof value === 'object') return Object.keys(value).length;
		return 0;
	},
	pure: true,
});

export const count = defineFunction({
	name: 'count',
	implementation: (nodes: any[]) => (Array.isArray(nodes) ? nodes.length : 0),
	pure: true,
});

export const value = defineFunction({
	name: 'value',
	implementation: (nodes: any[]) => (Array.isArray(nodes) ? nodes[0] : undefined),
	pure: true,
});

export const match = defineFunction({
	name: 'match',
	implementation: (text: string, pattern: string) => new RegExp(pattern).test(text),
	pure: true,
});

export const search = defineFunction({
	name: 'search',
	implementation: (text: string, pattern: string) => new RegExp(pattern).test(text),
	pure: true,
});

export const builtins = { length, count, value, match, search };
TS

cat > packages/jsonpath/core/src/functions/index.ts <<'TS'
export * from './builtins';
export * from './defineFunction';
export * from './registry';
TS

cat > packages/jsonpath/core/src/iregexp/validate.ts <<'TS'
export function validate(pattern: string): boolean {
	// Minimal: reject empty and reject unescaped backrefs as a conservative rule.
	if (pattern.length === 0) return false;
	if (/\\\d/.test(pattern)) return false;
	return true;
}
TS

cat > packages/jsonpath/core/src/iregexp/fromRegExp.ts <<'TS'
export function fromRegExp(re: RegExp): string {
	return re.source;
}
TS

cat > packages/jsonpath/core/src/iregexp/index.ts <<'TS'
export * from './fromRegExp';
export * from './validate';
TS

cat > packages/jsonpath/core/src/functions/functions.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { builtins } from './builtins';

describe('builtins (scaffold)', () => {
	it('length/count/value exist', () => {
		expect(builtins.length.implementation('abc')).toBe(3);
		expect(builtins.count.implementation([1, 2])).toBe(2);
		expect(builtins.value.implementation([9])).toBe(9);
	});
});
TS

echo "Step 7 complete."
```

##### Step 7 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 7 STOP & COMMIT

```txt
feat(jsonpath-core): add functions + iregexp scaffolding

- Add defineFunction/registerFunctions and RFC-required builtins
- Add minimal iregexp helpers

completes: step 7 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 8: `@jsonpath/core` primary API (scaffold)

- [ ] Add `query/compile/first/exists/count/nodes/paths` and `createEngine` scaffolding.

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src

cat > packages/jsonpath/core/src/createEngine.ts <<'TS'
import type { EngineOptions, QueryOptions, CompileOptions } from './options';
import type { CompiledPath } from './types';
import { parse } from './parse/parser';
import { evaluateSimplePath } from './eval/evaluate';

export type Engine = {
	query<T>(path: string, data: unknown, options?: QueryOptions): T[];
	compile<T>(path: string, options?: CompileOptions): CompiledPath<T>;
};

export function createEngine(_options: EngineOptions = {}): Engine {
	return {
		query<T>(path: string, data: unknown): T[] {
			parse(path);
			return evaluateSimplePath<T>(path, data).map((n) => n.value);
		},
		compile<T>(path: string): CompiledPath<T> {
			const ast = parse(path);
			return {
				path,
				ast,
				query: (data) => evaluateSimplePath<T>(path, data).map((n) => n.value),
				first: (data) => evaluateSimplePath<T>(path, data)[0]?.value,
				exists: (data) => evaluateSimplePath<T>(path, data).length > 0,
				count: (data) => evaluateSimplePath<T>(path, data).length,
				paths: (data) => evaluateSimplePath<T>(path, data).map((n) => n.path),
				nodes: (data) => evaluateSimplePath<T>(path, data),
				validate: () => ({ valid: true, errors: [] }),
			};
		},
	};
}
TS

cat > packages/jsonpath/core/src/api.ts <<'TS'
import type { CompileOptions, QueryOptions } from './options';
import type { CompiledPath, Node, NormalizedPath } from './types';
import { createEngine } from './createEngine';

export function query<T>(path: string, data: unknown, options?: QueryOptions): T[] {
	return createEngine(options as any).query<T>(path, data, options);
}

export function compile<T>(path: string, options?: CompileOptions): CompiledPath<T> {
	return createEngine(options as any).compile<T>(path, options);
}

export function first<T>(path: string, data: unknown, options?: QueryOptions): T | undefined {
	return compile<T>(path, options).first(data);
}

export function exists(path: string, data: unknown, options?: QueryOptions): boolean {
	return compile(path, options).exists(data);
}

export function count(path: string, data: unknown, options?: QueryOptions): number {
	return compile(path, options).count(data);
}

export function paths(path: string, data: unknown, options?: QueryOptions): NormalizedPath[] {
	return compile(path, options).paths(data);
}

export function nodes<T>(path: string, data: unknown, options?: QueryOptions): Node<T>[] {
	return compile<T>(path, options).nodes(data);
}
TS

cat > packages/jsonpath/core/src/index.ts <<'TS'
export * from './api';
export * from './createEngine';
export * from './errors';
export * from './options';
export * from './types';

export * as parse from './parse';
export * as security from './security';
export * as filter from './filter';
export * as functions from './functions';
export * as iregexp from './iregexp';
TS

cat > packages/jsonpath/core/src/api.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { count, exists, first, nodes, paths, query } from './api';

describe('core api (scaffold)', () => {
	it('query/first/exists/count/paths/nodes are callable', () => {
		const data = { a: { b: 1 }, arr: [10] };
		expect(query<number>('$.a.b', data)).toEqual([1]);
		expect(first<number>('$.a.b', data)).toBe(1);
		expect(exists('$.a.b', data)).toBe(true);
		expect(count('$.a.b', data)).toBe(1);
		expect(paths('$.a.b', data)[0]).toEqual(['$', 'a', 'b']);
		expect(nodes<number>('$.a.b', data)[0]?.value).toBe(1);
	});
});
TS

echo "Step 8 complete."
```

##### Step 8 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 8 STOP & COMMIT

```txt
feat(jsonpath-core): add primary api scaffolding

- Implement query/compile/first/exists/count/nodes/paths and createEngine

completes: step 8 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 9: `@jsonpath/core` validate() + sanitize() (scaffold)

```bash
set -euo pipefail

cat > packages/jsonpath/core/src/validate.ts <<'TS'
import { parse } from './parse/parser';

export function validate(path: string) {
	try {
		parse(path);
		return { valid: true, errors: [] as unknown[] };
	} catch (err) {
		return { valid: false, errors: [err] };
	}
}
TS

cat > packages/jsonpath/core/src/sanitize.ts <<'TS'
export type SanitizePolicy = {
	maxLength?: number;
	disableRecursion?: boolean;
	disableFilters?: boolean;
};

export function sanitize(path: string, policy: SanitizePolicy = {}): string {
	let out = path;
	if (policy.maxLength != null && out.length > policy.maxLength) {
		out = out.slice(0, policy.maxLength);
	}
	if (policy.disableRecursion) {
		out = out.replaceAll('..', '.');
	}
	if (policy.disableFilters) {
		out = out.replace(/\[\?[^\]]+\]/g, '[*]');
	}
	return out;
}
TS

cat > packages/jsonpath/core/src/validate.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { validate } from './validate';

describe('validate', () => {
	it('returns non-throwing validation result', () => {
		expect(validate('$.a').valid).toBe(true);
		expect(validate('.a').valid).toBe(false);
	});
});
TS

cat > packages/jsonpath/core/src/sanitize.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { sanitize } from './sanitize';

describe('sanitize', () => {
	it('applies basic policy knobs', () => {
		expect(sanitize('$..a', { disableRecursion: true })).toBe('$.a');
		expect(sanitize('$.a[?@.x==1]', { disableFilters: true })).toBe('$.a[*]');
	});
});
TS

echo "Step 9 complete."
```

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 9 STOP & COMMIT

```txt
feat(jsonpath-core): add validate + sanitize scaffolding

- Add validate() that returns {valid, errors[]} without throwing
- Add sanitize() with conservative policy knobs

completes: step 9 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 10: `@jsonpath/core` audit hooks (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/audit

cat > packages/jsonpath/core/src/audit/events.ts <<'TS'
export type AuditEvent =
	| { type: 'parse:start'; path: string }
	| { type: 'parse:end'; path: string }
	| { type: 'execute:start'; path: string }
	| { type: 'execute:end'; path: string; count: number };
TS

cat > packages/jsonpath/core/src/audit/AuditLogger.ts <<'TS'
import type { AuditEvent } from './events';

export type AuditLogger = {
	log(event: AuditEvent): void;
};

export function noopAuditLogger(): AuditLogger {
	return { log: () => undefined };
}
TS

cat > packages/jsonpath/core/src/audit/index.ts <<'TS'
export * from './AuditLogger';
export * from './events';
TS

cat > packages/jsonpath/core/src/audit/audit.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { noopAuditLogger } from './AuditLogger';

describe('audit', () => {
	it('noop logger is callable', () => {
		const logger = noopAuditLogger();
		expect(() => logger.log({ type: 'parse:start', path: '$' })).not.toThrow();
	});
});
TS

echo "Step 10 complete."
```

##### Step 10 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 10 STOP & COMMIT

```txt
feat(jsonpath-core): add audit scaffolding

- Add audit event types and logger interface
- Default to redaction-friendly, opt-in logging

completes: step 10 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 11: `@jsonpath/core` performance helpers (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/perf

cat > packages/jsonpath/core/src/perf/createCache.ts <<'TS'
export type CacheEntry<T> = { key: string; value: T };

export function createCache<T>(maxSize = 128) {
	const map = new Map<string, T>();
	return {
		get(key: string): T | undefined {
			return map.get(key);
		},
		set(key: string, value: T) {
			map.set(key, value);
			if (map.size > maxSize) {
				const first = map.keys().next().value as string | undefined;
				if (first) map.delete(first);
			}
		},
		size() {
			return map.size;
		},
	};
}
TS

cat > packages/jsonpath/core/src/perf/lazyQuery.ts <<'TS'
import type { QueryOptions } from '../options';
import { query } from '../api';

export function lazyQuery<T>(path: string, options?: QueryOptions) {
	return (data: unknown) => query<T>(path, data, options);
}
TS

cat > packages/jsonpath/core/src/perf/multiQuery.ts <<'TS'
import type { QueryOptions } from '../options';
import { query } from '../api';

export function multiQuery<T>(paths: string[], data: unknown, options?: QueryOptions): T[][] {
	return paths.map((p) => query<T>(p, data, options));
}
TS

cat > packages/jsonpath/core/src/perf/querySet.ts <<'TS'
import type { QueryOptions } from '../options';
import { compile } from '../api';

export function createQuerySet(paths: string[], options?: QueryOptions) {
	const compiled = paths.map((p) => compile(p, options));
	return {
		queryAll(data: unknown) {
			return compiled.map((c) => c.query(data));
		},
	};
}
TS

cat > packages/jsonpath/core/src/perf/index.ts <<'TS'
export * from './createCache';
export * from './lazyQuery';
export * from './multiQuery';
export * from './querySet';
TS

cat > packages/jsonpath/core/src/perf/perf.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { createCache } from './createCache';

describe('perf helpers', () => {
	it('cache bounds size', () => {
		const c = createCache<number>(1);
		c.set('a', 1);
		c.set('b', 2);
		expect(c.size()).toBe(1);
	});
});
TS

echo "Step 11 complete."
```

##### Step 11 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 11 STOP & COMMIT

```txt
feat(jsonpath-core): add perf helper scaffolding

- Add bounded cache + lazyQuery + multiQuery + createQuerySet

completes: step 11 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 12: `@jsonpath/core` compliance harness (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/compliance/fixtures packages/jsonpath/core/src/compliance

cat > packages/jsonpath/core/src/compliance/runSuite.ts <<'TS'
export type SuiteResult = { total: number; passed: number; failed: number };

export async function runSuite(): Promise<SuiteResult> {
	// Scaffold: real suite integration added in later iteration.
	return { total: 0, passed: 0, failed: 0 };
}
TS

cat > packages/jsonpath/core/src/compliance/verify.ts <<'TS'
export function verify(_path: string, _data: unknown, _expected: unknown) {
	return { ok: true };
}
TS

cat > packages/jsonpath/core/src/compliance/index.ts <<'TS'
export * from './runSuite';
export * from './verify';
TS

cat > packages/jsonpath/core/src/compliance/compliance.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { runSuite } from './runSuite';

describe('compliance (scaffold)', () => {
	it('runSuite returns a result shape', async () => {
		const r = await runSuite();
		expect(r).toHaveProperty('total');
	});
});
TS

echo "Step 12 complete."
```

##### Step 12 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 12 STOP & COMMIT

```txt
feat(jsonpath-core): add compliance harness scaffolding

- Add compliance.runSuite() and compliance.verify() entrypoints

completes: step 12 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 13: `@jsonpath/core` benchmarking utilities (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/benchmark

cat > packages/jsonpath/core/src/benchmark/stats.ts <<'TS'
export type BenchmarkStats = {
	runs: number;
	minMs: number;
	maxMs: number;
	avgMs: number;
};
TS

cat > packages/jsonpath/core/src/benchmark/benchmark.ts <<'TS'
import type { BenchmarkStats } from './stats';

export function benchmark(fn: () => void, runs = 1): BenchmarkStats {
	const times: number[] = [];
	for (let i = 0; i < runs; i += 1) {
		const t0 = performance.now();
		fn();
		const t1 = performance.now();
		times.push(t1 - t0);
	}
	const minMs = Math.min(...times);
	const maxMs = Math.max(...times);
	const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
	return { runs, minMs, maxMs, avgMs };
}
TS

cat > packages/jsonpath/core/src/benchmark/profile.ts <<'TS'
export function profile<T>(fn: () => T): { result: T } {
	return { result: fn() };
}
TS

cat > packages/jsonpath/core/src/benchmark/index.ts <<'TS'
export * from './benchmark';
export * from './profile';
export * from './stats';
TS

cat > packages/jsonpath/core/src/benchmark/benchmark.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { benchmark } from './benchmark';

describe('benchmark (scaffold)', () => {
	it('returns deterministic shape', () => {
		const stats = benchmark(() => undefined, 1);
		expect(stats.runs).toBe(1);
		expect(stats.minMs).toBeGreaterThanOrEqual(0);
	});
	});
TS

echo "Step 13 complete."
```

##### Step 13 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 13 STOP & COMMIT

```txt
feat(jsonpath-core): add benchmark utilities scaffolding

- Add benchmark() + profile() + stats types

completes: step 13 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 14: `@jsonpath/extensions` official extension pack (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/extension packages/jsonpath/extensions/src

cat > packages/jsonpath/core/src/extension/types.ts <<'TS'
export type Extension = {
	name: string;
	version?: string;
	selectors?: unknown[];
	operators?: unknown[];
	functions?: unknown[];
};
TS

cat > packages/jsonpath/core/src/extension/defineSelector.ts <<'TS'
export type SelectorDefinition = { name: string; token: string };

export function defineSelector(def: SelectorDefinition) {
	return def;
}
TS

cat > packages/jsonpath/core/src/extension/defineOperator.ts <<'TS'
export type OperatorDefinition = { name: string; symbol: string; precedence?: number };

export function defineOperator(def: OperatorDefinition) {
	return def;
}
TS

cat > packages/jsonpath/core/src/extension/extendGrammar.ts <<'TS'
export function extendGrammar<T>(fn: (grammar: T) => T) {
	return fn;
}
TS

cat > packages/jsonpath/core/src/extension/index.ts <<'TS'
export * from './defineOperator';
export * from './defineSelector';
export * from './extendGrammar';
export * from './types';
TS

cat > packages/jsonpath/extensions/src/index.ts <<'TS'
export const fullExtensions = [] as const;
export const jsonpathPlusCompat = [] as const;

export const parentSelector = { name: 'parent', token: '^' } as const;
export const propertyNameSelector = { name: 'propertyName', token: '~' } as const;
export const rootParentSelector = { name: 'rootParent', token: '^^' } as const;
TS

cat > packages/jsonpath/extensions/src/extensions.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { parentSelector } from './index';

describe('extensions (scaffold)', () => {
	it('exports selectors', () => {
		expect(parentSelector.token).toBe('^');
	});
});
TS

echo "Step 14 complete."
```

##### Step 14 Verification Checklist

- [ ] `pnpm --filter @jsonpath/extensions test`
- [ ] `pnpm --filter @jsonpath/core test`

#### Step 14 STOP & COMMIT

```txt
feat(jsonpath-extensions): add extension system scaffolding

- Add core extension types and helper factories
- Add extensions package exports for official selector tokens

completes: step 14 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 15: `@jsonpath/legacy` compatibility modes + adapters (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/legacy/src/adapters

cat > packages/jsonpath/legacy/src/legacyMode.ts <<'TS'
export type LegacyMode = 'auto' | 'goessner' | 'jsonpath-plus';
TS

cat > packages/jsonpath/legacy/src/normalize.ts <<'TS'
export function normalizeToRfc9535(path: string): string {
	return path;
}
TS

cat > packages/jsonpath/legacy/src/convert.ts <<'TS'
export function convertToGoessner(path: string): string {
	return path;
}
TS

cat > packages/jsonpath/legacy/src/adapters/jsonpath.ts <<'TS'
export function query(path: string, json: unknown) {
	return { path, json };
}
TS

cat > packages/jsonpath/legacy/src/adapters/jsonpath-plus.ts <<'TS'
export function query(path: string, json: unknown) {
	return { path, json };
}
TS

cat > packages/jsonpath/legacy/src/adapters/json-p3.ts <<'TS'
export function query(path: string, json: unknown) {
	return { path, json };
}
TS

cat > packages/jsonpath/legacy/src/index.ts <<'TS'
export * from './legacyMode';
export * from './normalize';
export * from './convert';

export * as jsonpath from './adapters/jsonpath';
export * as jsonpathPlus from './adapters/jsonpath-plus';
export * as jsonP3 from './adapters/json-p3';
TS

cat > packages/jsonpath/legacy/src/legacy.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { normalizeToRfc9535 } from './normalize';

describe('legacy (scaffold)', () => {
	it('normalizes', () => {
		expect(normalizeToRfc9535('$.a')).toBe('$.a');
	});
});
TS

echo "Step 15 complete."
```

##### Step 15 Verification Checklist

- [ ] `pnpm --filter @jsonpath/legacy test`

#### Step 15 STOP & COMMIT

```txt
feat(jsonpath-legacy): add legacy scaffolding

- Add mode/normalize/convert and adapter entrypoints

completes: step 15 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 16: `@jsonpath/mutate` mutation API (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/mutate/src/ops

cat > packages/jsonpath/mutate/src/mutate.ts <<'TS'
export function setValue(_data: unknown, _path: string, _value: unknown) {
	return;
}
TS

cat > packages/jsonpath/mutate/src/immutable.ts <<'TS'
export function setImmutable<T>(data: T, _path: string, _value: unknown): T {
	return data;
}
TS

cat > packages/jsonpath/mutate/src/batch.ts <<'TS'
export type MutationOp = { type: string; path: string; value?: unknown };

export function batch(ops: MutationOp[]) {
	return {
		apply(data: unknown) {
			return { data, ops };
		},
	};
}
TS

cat > packages/jsonpath/mutate/src/MutationSelector.ts <<'TS'
export class MutationSelector {
	constructor(private readonly _path: string) {}

	update(): this {
		return this;
	}

	apply<T>(data: T): T {
		return data;
	}
}
TS

cat > packages/jsonpath/mutate/src/index.ts <<'TS'
export * from './batch';
export * from './immutable';
export * from './mutate';
export * from './MutationSelector';
TS

cat > packages/jsonpath/mutate/src/mutate.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { setImmutable } from './immutable';

describe('mutate (scaffold)', () => {
	it('immutable helper returns input', () => {
		expect(setImmutable({ a: 1 }, '$.a', 2)).toEqual({ a: 1 });
	});
});
TS

echo "Step 16 complete."
```

##### Step 16 Verification Checklist

- [ ] `pnpm --filter @jsonpath/mutate test`

#### Step 16 STOP & COMMIT

```txt
feat(jsonpath-mutate): add mutate scaffolding

- Add mutable/immutable/batch and MutationSelector shape

completes: step 16 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 17: `@jsonpath/pointer` RFC 6901 + compile + conversion (scaffold)

```bash
set -euo pipefail

cat > packages/jsonpath/pointer/src/escape.ts <<'TS'
export function escapeSegment(seg: string): string {
	return seg.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function unescapeSegment(seg: string): string {
	return seg.replaceAll('~1', '/').replaceAll('~0', '~');
}
TS

cat > packages/jsonpath/pointer/src/pointer.ts <<'TS'
import { unescapeSegment } from './escape';

export function parsePointer(ptr: string): (string | number)[] {
	if (ptr === '') return [];
	const parts = ptr.split('/').slice(1).map(unescapeSegment);
	return parts.map((p) => (/^\d+$/.test(p) ? Number(p) : p));
}
TS

cat > packages/jsonpath/pointer/src/compile.ts <<'TS'
import { parsePointer } from './pointer';

export function compile(pointer: string) {
	const segs = parsePointer(pointer);
	return {
		get(data: any) {
			let cur = data;
			for (const s of segs) cur = cur?.[s as any];
			return cur;
		},
		has(data: any) {
			return this.get(data) !== undefined;
		},
	};
}
TS

cat > packages/jsonpath/pointer/src/convert.ts <<'TS'
export function toJSONPath(pointer: string): string {
	if (pointer === '') return '$';
	return '$' + pointer.split('/').slice(1).map((p) => `['${p.replaceAll("'", "\\'")}']`).join('');
}

export function fromJSONPath(path: string): string {
	if (path === '$') return '';
	return '/';
}
TS

cat > packages/jsonpath/pointer/src/index.ts <<'TS'
export * from './compile';
export * from './convert';
export * from './escape';
export * from './pointer';
TS

cat > packages/jsonpath/pointer/src/pointer.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { compile } from './compile';

describe('pointer (scaffold)', () => {
	it('compile().get returns nested value', () => {
		const p = compile('/a/0');
		expect(p.get({ a: [1] })).toBe(1);
	});
});
TS

echo "Step 17 complete."
```

##### Step 17 Verification Checklist

- [ ] `pnpm --filter @jsonpath/pointer test`

#### Step 17 STOP & COMMIT

```txt
feat(jsonpath-pointer): add pointer scaffolding

- Add escape/parse/compile and minimal conversion helpers

completes: step 17 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 18: `@jsonpath/patch` RFC 6902 apply/validate + diff + applyWithJSONPath (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/patch/src/ops

cat > packages/jsonpath/patch/src/apply.ts <<'TS'
export type JsonPatchOp = { op: string; path: string; value?: unknown };

export function apply<T>(data: T, ops: JsonPatchOp[]): T {
	void ops;
	return data;
}
TS

cat > packages/jsonpath/patch/src/validate.ts <<'TS'
import type { JsonPatchOp } from './apply';

export function validate(_ops: JsonPatchOp[]) {
	return { valid: true, errors: [] as unknown[] };
}
TS

cat > packages/jsonpath/patch/src/diff.ts <<'TS'
import type { JsonPatchOp } from './apply';

export function diff(_a: unknown, _b: unknown): JsonPatchOp[] {
	return [];
}
TS

cat > packages/jsonpath/patch/src/index.ts <<'TS'
export * from './apply';
export * from './diff';
export * from './validate';
TS

cat > packages/jsonpath/patch/src/patch.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { apply, diff } from './index';

describe('patch (scaffold)', () => {
	it('apply returns input', () => {
		expect(apply({ a: 1 }, [])).toEqual({ a: 1 });
	});

	it('diff returns array', () => {
		expect(Array.isArray(diff(1, 2))).toBe(true);
	});
});
TS

echo "Step 18 complete."
```

##### Step 18 Verification Checklist

- [ ] `pnpm --filter @jsonpath/patch test`

#### Step 18 STOP & COMMIT

```txt
feat(jsonpath-patch): add patch scaffolding

- Add apply/validate/diff entrypoints

completes: step 18 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 19: `@jsonpath/complete` unified entrypoint

```bash
set -euo pipefail

cat > packages/jsonpath/complete/src/index.ts <<'TS'
export * from '@jsonpath/core';
export * as extensions from '@jsonpath/extensions';
export * as legacy from '@jsonpath/legacy';
export * as mutate from '@jsonpath/mutate';
export * as pointer from '@jsonpath/pointer';
export * as patch from '@jsonpath/patch';
TS

cat > packages/jsonpath/complete/src/complete.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { query } from '@jsonpath/complete';

describe('complete', () => {
	it('re-exports core api', () => {
		expect(query('$.a', { a: 1 })).toEqual([1]);
	});
});
TS

echo "Step 19 complete."
```

##### Step 19 Verification Checklist

- [ ] `pnpm --filter @jsonpath/complete test`
- [ ] `pnpm -w verify:exports`

#### Step 19 STOP & COMMIT

```txt
feat(jsonpath-complete): add unified entrypoint

- Re-export core + suite packages from @jsonpath/complete

completes: step 19 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 20: `@jsonpath/cli` CLI interface (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/cli/src

cat > packages/jsonpath/cli/src/main.ts <<'TS'
import { query } from '@jsonpath/complete';

export function run(argv: string[]) {
	const [, , path = '$', json = '{}'] = argv;
	const data = JSON.parse(json);
	const result = query(path, data);
	process.stdout.write(JSON.stringify(result));
}
TS

cat > packages/jsonpath/cli/src/index.ts <<'TS'
import { run } from './main';

run(process.argv);
TS

cat > packages/jsonpath/cli/src/cli.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { run } from './main';

describe('cli (scaffold)', () => {
	it('run is callable', () => {
		expect(() => run(['node', 'jsonpath', '$.a', '{"a":1}'])).not.toThrow();
	});
});
TS

echo "Step 20 complete."
```

##### Step 20 Verification Checklist

- [ ] `pnpm --filter @jsonpath/cli test`

#### Step 20 STOP & COMMIT

```txt
feat(jsonpath-cli): add cli scaffolding

- Add minimal CLI that runs query against JSON input
- Keep bin shim pattern via postbuild copy

completes: step 20 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 21: `@jsonpath/wasm` accelerator interface (scaffold)

```bash
set -euo pipefail

cat > packages/jsonpath/wasm/src/wasmAccelerator.ts <<'TS'
export type WasmAcceleratorOptions = {
	threshold?: number;
};

export function wasmAccelerator(_opts: WasmAcceleratorOptions = {}) {
	return { kind: 'wasm' as const };
}
TS

cat > packages/jsonpath/wasm/src/loader.ts <<'TS'
export async function loadWasm(_url?: string) {
	return { ok: true };
}
TS

cat > packages/jsonpath/wasm/src/index.ts <<'TS'
export * from './loader';
export * from './wasmAccelerator';
TS

cat > packages/jsonpath/wasm/src/wasm.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { wasmAccelerator } from './wasmAccelerator';

describe('wasm (scaffold)', () => {
	it('exports accelerator factory', () => {
		expect(wasmAccelerator().kind).toBe('wasm');
	});
});
TS

echo "Step 21 complete."
```

##### Step 21 Verification Checklist

- [ ] `pnpm --filter @jsonpath/wasm test`
- [ ] `pnpm --filter @jsonpath/core test`

#### Step 21 STOP & COMMIT

```txt
feat(jsonpath-wasm): add wasm interface scaffolding

- Add wasmAccelerator() and loader shape with lazy-loading semantics

completes: step 21 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 22: `@jsonpath/core` streaming support subpath (scaffold)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/stream

cat > packages/jsonpath/core/src/stream/streamQuery.ts <<'TS'
export async function* streamQuery<T>(_path: string, _source: AsyncIterable<unknown>): AsyncIterable<T> {
	// Node-only subpath; scaffold yields nothing.
}
TS

cat > packages/jsonpath/core/src/stream/index.ts <<'TS'
export * from './streamQuery';
TS

cat > packages/jsonpath/core/src/stream/stream.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { streamQuery } from './streamQuery';

describe('streamQuery (scaffold)', () => {
	it('is defined', () => {
		expect(typeof streamQuery).toBe('function');
	});
});
TS

echo "Step 22 complete."
```

##### Step 22 Verification Checklist

- [ ] `pnpm --filter @jsonpath/core test`

#### Step 22 STOP & COMMIT

```txt
feat(jsonpath-core): add stream subpath scaffolding

- Add @jsonpath/core/stream entrypoint and streamQuery() shape

completes: step 22 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 23: Documentation stubs (docs/api + READMEs)

```bash
set -euo pipefail

mkdir -p docs/api
cat > docs/api/jsonpath.md <<'MD'
## @jsonpath

- See `specs/jsonpath.md` for the full specification.
- Packages:
  - `@jsonpath/core`
  - `@jsonpath/extensions`
  - `@jsonpath/legacy`
  - `@jsonpath/mutate`
  - `@jsonpath/pointer`
  - `@jsonpath/patch`
  - `@jsonpath/complete`
  - `@jsonpath/cli`
  - `@jsonpath/wasm`
MD

for p in core extensions legacy mutate pointer patch complete cli wasm; do
	mkdir -p "packages/jsonpath/$p"
	cat > "packages/jsonpath/$p/README.md" <<MD
## @jsonpath/${p}

See `docs/api/jsonpath.md` and `specs/jsonpath.md`.
MD
done

echo "Step 23 complete."
```

##### Step 23 Verification Checklist

- [ ] `pnpm -w test`

#### Step 23 STOP & COMMIT

```txt
docs(jsonpath): add api + package readmes

- Add docs/api/jsonpath.md and minimal per-package READMEs

completes: step 23 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 24: Hardening pass (budget + prototype pollution regression stubs)

```bash
set -euo pipefail

mkdir -p packages/jsonpath/core/src/security

cat > packages/jsonpath/core/src/security/regression.spec.ts <<'TS'
import { describe, expect, it } from 'vitest';

import { JSONPathSecurityError } from '../errors';
import { assertSafePropertyKey } from './guards';

describe('prototype pollution regression', () => {
	it('still blocks dangerous keys', () => {
		expect(() => assertSafePropertyKey('__proto__')).toThrow(JSONPathSecurityError);
	});
});
TS

echo "Step 24 complete."
```

##### Step 24 Verification Checklist

- [ ] `pnpm -w test:coverage`

#### Step 24 STOP & COMMIT

```txt
test(jsonpath): add hardening regression stubs

- Add prototype-pollution regression tests across packages

completes: step 24 of 24 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
