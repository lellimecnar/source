# JSONPath Ecosystem (v2)

## Goal

Implement the `@jsonpath/*` plugin-first JSONPath ecosystem described in [specs/jsonpath.md](../../specs/jsonpath.md), using this monorepo’s publishable-package conventions (Vite `dist/` + per-package Vitest + `pnpm verify:exports`).

## Prerequisites

Make sure that the user is currently on the `feat/jsonpath/ecosystem-v2` branch before beginning implementation.
If the branch does not exist, create it from `master`.

### Step-by-Step Instructions

#### Step 1: Scaffold all `@jsonpath/*` workspaces (publishable + internal harness)

- [ ] From repo root, scaffold all packages with the repo’s standard Vite/Vitest layout.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

/**
 * Repo conventions used:
 * - ESM packages (`type: module`)
 * - Vite build to dist/ with preserveModules
 * - d.ts generation via vite-plugin-dts
 * - Unit tests via per-package vitest.config.ts, discovered by root vitest.config.ts
 * - Export verification via `pnpm -w verify:exports` (checks dist files exist)
 */

const repoRoot = process.cwd();

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

function jsonStringify(obj) {
	return JSON.stringify(obj, null, '\t') + '\n';
}

function buildPackageJson({
	name,
	description,
	privatePkg,
	bin,
	dependencies,
	peerDependencies,
}) {
	const isDistLike = true;

	const pkg = {
		name,
		version: '0.0.1',
		description,
		license: 'MIT',
		sideEffects: false,
		type: 'module',
		...(privatePkg ? { private: true } : {}),
		...(isDistLike
			? {
				exports: {
					'.': {
						types: './dist/index.d.ts',
						default: './dist/index.js',
					},
				},
				main: './dist/index.js',
				types: './dist/index.d.ts',
				files: ['dist'],
			}
			: {}),
		...(bin ? { bin } : {}),
		scripts: {
			build: privatePkg ? 'vite build' : 'pnpm run clean && vite build',
			clean: "node -e \"require('node:fs').rmSync('dist', { recursive: true, force: true })\"",
			dev: 'vite build --watch',
			lint: 'eslint .',
			prepack: 'pnpm run build',
			test: 'vitest run',
			'test:coverage': 'vitest run --coverage',
			'test:watch': 'vitest',
			'type-check': 'tsgo --noEmit',
			...(bin ? { postbuild: "node -e \"require('node:fs').cpSync('bin', 'dist/bin', { recursive: true })\"" } : {}),
		},
		dependencies: dependencies ?? {},
		devDependencies: {
			'@lellimecnar/eslint-config': 'workspace:*',
			'@lellimecnar/typescript-config': 'workspace:*',
			'@lellimecnar/vite-config': 'workspace:^',
			'@lellimecnar/vitest-config': 'workspace:*',
			'@types/jest': '^29.5.12',
			'@types/node': '^24',
			'@vitest/coverage-v8': '^4.0.16',
			eslint: '^8.57.1',
			typescript: '~5.5',
			vite: '^7.3.0',
			'vite-plugin-dts': '^4.5.4',
			'vite-tsconfig-paths': '^6.0.3',
			vitest: '^4.0.16',
		},
		peerDependencies: peerDependencies ?? {},
		...(privatePkg
			? {}
			: {
				publishConfig: {
					access: 'public',
				},
			}),
	};

	return pkg;
}

const viteConfig = `import { createRequire } from 'node:module';\nimport { defineConfig, mergeConfig } from 'vite';\nimport dts from 'vite-plugin-dts';\n\nimport { viteNodeConfig } from '@lellimecnar/vite-config/node';\n\nconst require = createRequire(import.meta.url);\nconst pkg = require('./package.json');\n\nconst externalDeps = [\n\t...Object.keys(pkg.dependencies ?? {}),\n\t...Object.keys(pkg.peerDependencies ?? {}),\n];\n\nconst external = (id) =>\n\tid.startsWith('node:') ||\n\texternalDeps.some((dep) => id === dep || id.startsWith(\`\${dep}/\`));\n\nexport default defineConfig(\n\tmergeConfig(viteNodeConfig(), {\n\t\tplugins: [\n\t\t\tdts({\n\t\t\t\tentryRoot: 'src',\n\t\t\t\ttsconfigPath: 'tsconfig.json',\n\t\t\t\toutDir: 'dist',\n\t\t\t}),\n\t\t],\n\t\tbuild: {\n\t\t\toutDir: 'dist',\n\t\t\tlib: {\n\t\t\t\tentry: 'src/index.ts',\n\t\t\t\tformats: ['es'],\n\t\t\t},\n\t\t\trollupOptions: {\n\t\t\t\texternal,\n\t\t\t\toutput: {\n\t\t\t\t\tpreserveModules: true,\n\t\t\t\t\tpreserveModulesRoot: 'src',\n\t\t\t\t\tentryFileNames: '[name].js',\n\t\t\t\t},\n\t\t\t},\n\t\t},\n\t}),\n);\n`;

const vitestConfig = `import { defineConfig } from 'vitest/config';\n\nimport { vitestBaseConfig } from '@lellimecnar/vitest-config';\n\nexport default defineConfig(vitestBaseConfig());\n`;

const tsconfig = `{
\t"extends": "@lellimecnar/typescript-config",
\t"compilerOptions": {
\t\t"outDir": "./dist",
\t\t"rootDir": "./src",
\t\t"noEmit": false,
\t\t"declaration": true,
\t\t"declarationMap": true,
\t\t"sourceMap": true,
\t\t"module": "ESNext",
\t\t"moduleResolution": "Bundler"
\t},
\t"include": ["src/**/*"],
\t"exclude": ["dist", "node_modules"]
}
`;

const eslintRc = `module.exports = {
\textends: ['@lellimecnar/eslint-config'],
\tignorePatterns: ['!./*.json', '!./*.js', '!./src/**/*'],
\trules: {
\t\t'@typescript-eslint/ban-types': 'warn',
\t\t'@typescript-eslint/no-extraneous-class': 'warn',
\t\t'@typescript-eslint/no-unnecessary-condition': 'warn',
\t\t'@typescript-eslint/no-unsafe-return': 'warn',
\t\t'@typescript-eslint/prefer-nullish-coalescing': 'warn',
\t\t'func-names': 'warn',
\t},
};
`;

/**
 * Package inventory (from plans/jsonpath/plan.md Step 1).
 * Packages live under packages/jsonpath/* (so pnpm-workspace.yaml must include 'packages/jsonpath/*').
 */
const packages = [
	// Framework
	{ dir: 'jsonpath/core', name: '@jsonpath/core', description: 'JSONPath engine framework (plugin-first; no features).', privatePkg: false },
	{ dir: 'jsonpath/ast', name: '@jsonpath/ast', description: 'Feature-agnostic JSONPath AST node types.', privatePkg: false },
	{ dir: 'jsonpath/lexer', name: '@jsonpath/lexer', description: 'Feature-agnostic JSONPath lexer infrastructure.', privatePkg: false },
	{ dir: 'jsonpath/parser', name: '@jsonpath/parser', description: 'Feature-agnostic JSONPath parser infrastructure.', privatePkg: false },
	{ dir: 'jsonpath/printer', name: '@jsonpath/printer', description: 'Feature-agnostic JSONPath printer infrastructure.', privatePkg: false },

	// RFC bundle + feature plugins
	{ dir: 'jsonpath/plugin-rfc-9535', name: '@jsonpath/plugin-rfc-9535', description: 'RFC 9535 bundle plugin preset wiring.', privatePkg: false },

	// Syntax plugins
	{ dir: 'jsonpath/plugin-syntax-root', name: '@jsonpath/plugin-syntax-root', description: 'RFC 9535 root selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-syntax-current', name: '@jsonpath/plugin-syntax-current', description: 'RFC 9535 current selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-syntax-child-member', name: '@jsonpath/plugin-syntax-child-member', description: 'RFC 9535 child member selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-syntax-child-index', name: '@jsonpath/plugin-syntax-child-index', description: 'RFC 9535 child index + slice selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-syntax-wildcard', name: '@jsonpath/plugin-syntax-wildcard', description: 'RFC 9535 wildcard selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-syntax-union', name: '@jsonpath/plugin-syntax-union', description: 'RFC 9535 union selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-syntax-descendant', name: '@jsonpath/plugin-syntax-descendant', description: 'RFC 9535 descendant selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-syntax-filter', name: '@jsonpath/plugin-syntax-filter', description: 'RFC 9535 filter selector container syntax plugin.', privatePkg: false },

	// Filter expression plugins
	{ dir: 'jsonpath/plugin-filter-literals', name: '@jsonpath/plugin-filter-literals', description: 'RFC 9535 filter literals plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-filter-comparison', name: '@jsonpath/plugin-filter-comparison', description: 'RFC 9535 filter comparison operators plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-filter-boolean', name: '@jsonpath/plugin-filter-boolean', description: 'RFC 9535 filter boolean operators plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-filter-existence', name: '@jsonpath/plugin-filter-existence', description: 'RFC 9535 filter existence semantics plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-filter-functions', name: '@jsonpath/plugin-filter-functions', description: 'RFC 9535 filter function call plugin.', privatePkg: false },
	{ dir: 'jsonpath/plugin-filter-regex', name: '@jsonpath/plugin-filter-regex', description: 'RFC 9535 filter regex wiring plugin (delegates to iregexp).', privatePkg: false },

	// RFC functions
	{ dir: 'jsonpath/plugin-functions-core', name: '@jsonpath/plugin-functions-core', description: 'RFC 9535 functions core plugin.', privatePkg: false },

	// Result views
	{ dir: 'jsonpath/plugin-result-value', name: '@jsonpath/plugin-result-value', description: 'Result view: value.', privatePkg: false },
	{ dir: 'jsonpath/plugin-result-node', name: '@jsonpath/plugin-result-node', description: 'Result view: node.', privatePkg: false },
	{ dir: 'jsonpath/plugin-result-path', name: '@jsonpath/plugin-result-path', description: 'Result view: path.', privatePkg: false },
	{ dir: 'jsonpath/plugin-result-pointer', name: '@jsonpath/plugin-result-pointer', description: 'Result view: pointer.', privatePkg: false },
	{ dir: 'jsonpath/plugin-result-parent', name: '@jsonpath/plugin-result-parent', description: 'Result view: parent.', privatePkg: false },
	{ dir: 'jsonpath/plugin-result-types', name: '@jsonpath/plugin-result-types', description: 'Result view aggregator: types.', privatePkg: false },

	// Standards-adjacent
	{ dir: 'jsonpath/plugin-iregexp', name: '@jsonpath/plugin-iregexp', description: 'RFC 9485 I-Regexp support plugin.', privatePkg: false },

	// Security/tooling
	{ dir: 'jsonpath/plugin-script-expressions', name: '@jsonpath/plugin-script-expressions', description: 'SES sandboxed script expressions plugin (opt-in).', privatePkg: false },
	{ dir: 'jsonpath/plugin-validate', name: '@jsonpath/plugin-validate', description: 'Validation orchestration plugin.', privatePkg: false },

	// Optional non-RFC extensions
	{ dir: 'jsonpath/plugin-parent-selector', name: '@jsonpath/plugin-parent-selector', description: 'Optional extension: parent selector.', privatePkg: false },
	{ dir: 'jsonpath/plugin-property-name-selector', name: '@jsonpath/plugin-property-name-selector', description: 'Optional extension: property-name selector.', privatePkg: false },
	{ dir: 'jsonpath/plugin-type-selectors', name: '@jsonpath/plugin-type-selectors', description: 'Optional extension: type selectors.', privatePkg: false },

	// Compat
	{ dir: 'jsonpath/compat-jsonpath', name: '@jsonpath/compat-jsonpath', description: 'Compatibility adapter for dchester/jsonpath.', privatePkg: false },
	{ dir: 'jsonpath/compat-jsonpath-plus', name: '@jsonpath/compat-jsonpath-plus', description: 'Compatibility adapter for jsonpath-plus.', privatePkg: false },

	// Mutation
	{ dir: 'jsonpath/pointer', name: '@jsonpath/pointer', description: 'RFC 6901 JSON Pointer helpers (hardened).', privatePkg: false },
	{ dir: 'jsonpath/patch', name: '@jsonpath/patch', description: 'RFC 6902 JSON Patch helpers (hardened).', privatePkg: false },
	{ dir: 'jsonpath/mutate', name: '@jsonpath/mutate', description: 'Mutation utilities built on pointers/patch.', privatePkg: false },

	// Validators
	{ dir: 'jsonpath/validator-json-schema', name: '@jsonpath/validator-json-schema', description: 'JSON Schema validator adapter (Ajv).', privatePkg: false },
	{ dir: 'jsonpath/validator-zod', name: '@jsonpath/validator-zod', description: 'Zod validator adapter.', privatePkg: false },
	{ dir: 'jsonpath/validator-yup', name: '@jsonpath/validator-yup', description: 'Yup validator adapter.', privatePkg: false },

	// CLI + bundle
	{ dir: 'jsonpath/cli', name: '@jsonpath/cli', description: 'JSONPath CLI (JSON config only).', privatePkg: false, bin: { jsonpath: './dist/bin/jsonpath.js' } },
	{ dir: 'jsonpath/complete', name: '@jsonpath/complete', description: 'Convenience bundle (wiring only).', privatePkg: false },

	// Internal (NOT published)
	{ dir: 'jsonpath/compat-harness', name: '@lellimecnar/jsonpath-compat-harness', description: 'Internal: compares upstream jsonpath/jsonpath-plus vs @jsonpath compat.', privatePkg: true },
	{ dir: 'jsonpath/conformance', name: '@lellimecnar/jsonpath-conformance', description: 'Internal: conformance corpus fixtures + helpers.', privatePkg: true },
];

for (const p of packages) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);
	ensureDir(pkgDir);

	const pkgJson = buildPackageJson({
		name: p.name,
		description: p.description,
		privatePkg: Boolean(p.privatePkg),
		bin: p.bin,
		dependencies: {},
		peerDependencies: {},
	});

	writeFile(path.join(pkgDir, 'package.json'), jsonStringify(pkgJson));
	writeFile(path.join(pkgDir, 'vite.config.ts'), viteConfig);
	writeFile(path.join(pkgDir, 'vitest.config.ts'), vitestConfig);
	writeFile(path.join(pkgDir, 'tsconfig.json'), tsconfig);
	writeFile(path.join(pkgDir, '.eslintrc.cjs'), eslintRc);
	writeFile(
		path.join(pkgDir, 'src', 'index.ts'),
		`export const __package = ${JSON.stringify(p.name)};\n`,
	);
	writeFile(
		path.join(pkgDir, 'README.md'),
		`# ${p.name}\n\n${p.description}\n`,
	);

	if (p.bin) {
		writeFile(path.join(pkgDir, 'bin', 'jsonpath.js'), "#!/usr/bin/env node\nimport '../index.js';\n");
	}
}

console.log(`Scaffolded ${packages.length} packages under packages/jsonpath/`);
NODE
```

##### Step 1 Verification Checklist

- [ ] `pnpm -w turbo build --filter=@jsonpath/*` succeeds.
- [ ] `pnpm -w turbo test --filter=@jsonpath/* -- --passWithNoTests` succeeds.
- [ ] `pnpm -w verify:exports` prints `Export verification passed.`

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(jsonpath): scaffold @jsonpath/* workspaces

Scaffold publishable and internal JSONPath packages using monorepo Vite/Vitest conventions.

completes: step 1 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: Define shared error model + diagnostics contract (`@jsonpath/core`)

- [ ] Create the shared error model + diagnostics contract files.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'core');

write(
	path.join(pkgDir, 'src', 'errors', 'codes.ts'),
	`export type JsonPathErrorCode =\n\t| 'JSONPATH_SYNTAX_ERROR'\n\t| 'JSONPATH_EVALUATION_ERROR'\n\t| 'JSONPATH_PLUGIN_ERROR'\n\t| 'JSONPATH_CONFIG_ERROR';\n\nexport const JsonPathErrorCodes = {\n\tSyntax: 'JSONPATH_SYNTAX_ERROR',\n\tEvaluation: 'JSONPATH_EVALUATION_ERROR',\n\tPlugin: 'JSONPATH_PLUGIN_ERROR',\n\tConfig: 'JSONPATH_CONFIG_ERROR',\n} as const satisfies Record<string, JsonPathErrorCode>;\n`,
);

write(
	path.join(pkgDir, 'src', 'errors', 'types.ts'),
	`import type { JsonPathErrorCode } from './codes';\n\nexport type JsonPathLocation = {\n\toffset: number;\n\tline?: number;\n\tcolumn?: number;\n};\n\nexport type JsonPathErrorMeta = {\n\tcode: JsonPathErrorCode;\n\tmessage: string;\n\texpression?: string;\n\tlocation?: JsonPathLocation;\n\tpluginIds?: string[];\n\toptions?: unknown;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'errors', 'JsonPathError.ts'),
	`import type { JsonPathErrorMeta } from './types';\n\nexport class JsonPathError extends Error {\n\tpublic readonly code: JsonPathErrorMeta['code'];\n\tpublic readonly expression?: string;\n\tpublic readonly location?: JsonPathErrorMeta['location'];\n\tpublic readonly pluginIds?: string[];\n\tpublic readonly options?: unknown;\n\n\tpublic constructor(meta: JsonPathErrorMeta, cause?: unknown) {\n\t\tsuper(meta.message, cause ? { cause } : undefined);\n\t\tthis.name = 'JsonPathError';\n\t\tthis.code = meta.code;\n\t\tthis.expression = meta.expression;\n\t\tthis.location = meta.location;\n\t\tthis.pluginIds = meta.pluginIds;\n\t\tthis.options = meta.options;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'diagnostics', 'types.ts'),
	`import type { JsonPathErrorCode } from '../errors/codes';\nimport type { JsonPathLocation } from '../errors/types';\n\nexport type JsonPathDiagnostic = {\n\tlevel: 'error' | 'warning' | 'info';\n\tcode: JsonPathErrorCode;\n\tmessage: string;\n\texpression?: string;\n\tlocation?: JsonPathLocation;\n\tpluginId?: string;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'diagnostics', 'collect.ts'),
	`import type { JsonPathDiagnostic } from './types';\n\nexport class DiagnosticsCollector {\n\tprivate readonly items: JsonPathDiagnostic[] = [];\n\tpublic add(diag: JsonPathDiagnostic): void {\n\t\tthis.items.push(diag);\n\t}\n\tpublic all(): readonly JsonPathDiagnostic[] {\n\t\treturn this.items;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'errors.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { JsonPathError } from './errors/JsonPathError';\nimport { JsonPathErrorCodes } from './errors/codes';\n\ndescribe('JsonPathError', () => {\n\tit('creates a structured error with code and optional cause', () => {\n\t\tconst cause = new Error('root cause');\n\t\tconst err = new JsonPathError({\n\t\t\tcode: JsonPathErrorCodes.Syntax,\n\t\t\tmessage: 'bad syntax',\n\t\t\texpression: '$..',\n\t\t\tlocation: { offset: 2, line: 1, column: 3 },\n\t\t\tpluginIds: ['@jsonpath/plugin-syntax-root'],\n\t\t\toptions: { safe: true },\n\t\t}, cause);\n\n\t\texpect(err.name).toBe('JsonPathError');\n\t\texpect(err.code).toBe(JsonPathErrorCodes.Syntax);\n\t\texpect(err.expression).toBe('$..');\n\t\texpect(err.location?.offset).toBe(2);\n\t\texpect(err.pluginIds).toEqual(['@jsonpath/plugin-syntax-root']);\n\t\texpect(err.options).toEqual({ safe: true });\n\t\texpect(err.cause).toBe(cause);\n\t});\n});\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export { JsonPathError } from './errors/JsonPathError';\nexport { JsonPathErrorCodes } from './errors/codes';\nexport type { JsonPathErrorCode } from './errors/codes';\nexport type { JsonPathErrorMeta, JsonPathLocation } from './errors/types';\n\nexport { DiagnosticsCollector } from './diagnostics/collect';\nexport type { JsonPathDiagnostic } from './diagnostics/types';\n`,
);

console.log('Wrote @jsonpath/core error + diagnostics primitives');
NODE
```

##### Step 2 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 2 STOP & COMMIT

```txt
feat(jsonpath-core): add error + diagnostics contracts

Adds JsonPathError (with machine-readable codes) and a basic diagnostics model used by core and plugins.

completes: step 2 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: Implement plugin capability/dependency resolution + deterministic ordering (`@jsonpath/core`)

- [ ] Add plugin metadata/types + deterministic ordering + conflict detection.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'core');

write(
	path.join(pkgDir, 'src', 'plugins', 'types.ts'),
	`export type JsonPathPluginId = string;\n\nexport type JsonPathCapability = string;\n\nexport type JsonPathPluginMeta = {\n\tid: JsonPathPluginId;\n\tcapabilities?: readonly JsonPathCapability[];\n\tdependsOn?: readonly JsonPathPluginId[];\n\toptionalDependsOn?: readonly JsonPathPluginId[];\n\tpeerDependencies?: readonly string[];\n};\n\nexport type JsonPathPlugin<Config = unknown> = {\n\tmeta: JsonPathPluginMeta;\n\tconfigure?: (config: Config | undefined) => void;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'order.ts'),
	`import type { JsonPathPlugin } from './types';\n\nexport function orderPluginsDeterministically(plugins: readonly JsonPathPlugin[]): JsonPathPlugin[] {\n\t// Preserve explicit input order only when duplicates are not present;\n\t// otherwise, keep stable by plugin id.
\tconst seen = new Set<string>();\n\tconst deduped: JsonPathPlugin[] = [];\n\tfor (const p of plugins) {\n\t\tif (seen.has(p.meta.id)) continue;\n\t\tseen.add(p.meta.id);\n\t\tdeduped.push(p);\n\t}\n\n\treturn [...deduped].sort((a, b) => a.meta.id.localeCompare(b.meta.id));\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'resolve.ts'),
	`import { JsonPathError } from '../errors/JsonPathError';\nimport { JsonPathErrorCodes } from '../errors/codes';\nimport type { JsonPathCapability, JsonPathPlugin, JsonPathPluginId } from './types';\nimport { orderPluginsDeterministically } from './order';\n\nexport type ResolvePluginsResult = {\n\tordered: readonly JsonPathPlugin[];\n\tbyId: ReadonlyMap<JsonPathPluginId, JsonPathPlugin>;\n};\n\nfunction list(p?: readonly string[]): readonly string[] {\n\treturn p ?? [];\n}\n\nexport function resolvePlugins(plugins: readonly JsonPathPlugin[]): ResolvePluginsResult {\n\tconst ordered = orderPluginsDeterministically(plugins);\n\tconst byId = new Map<JsonPathPluginId, JsonPathPlugin>();\n\tfor (const p of ordered) byId.set(p.meta.id, p);\n\n\t// Dependency validation
\tfor (const p of ordered) {\n\t\tfor (const dep of list(p.meta.dependsOn)) {\n\t\t\tif (!byId.has(dep)) {\n\t\t\t\tthrow new JsonPathError({\n\t\t\t\t\tcode: JsonPathErrorCodes.Plugin,\n\t\t\t\t\tmessage: `Missing required plugin dependency: ${p.meta.id} depends on ${dep}`,\n\t\t\t\t\tpluginIds: [p.meta.id, dep],\n\t\t\t\t});\n\t\t\t}\n\t\t}\n\t}\n\n\t// Capability conflict detection (exact match)
\tconst capabilityToOwner = new Map<JsonPathCapability, JsonPathPluginId>();\n\tfor (const p of ordered) {\n\t\tfor (const cap of list(p.meta.capabilities)) {\n\t\t\tconst owner = capabilityToOwner.get(cap);\n\t\t\tif (owner && owner !== p.meta.id) {\n\t\t\t\tthrow new JsonPathError({\n\t\t\t\t\tcode: JsonPathErrorCodes.Plugin,\n\t\t\t\t\tmessage: `Capability conflict: ${cap} claimed by ${owner} and ${p.meta.id}`,\n\t\t\t\t\tpluginIds: [owner, p.meta.id],\n\t\t\t\t});\n\t\t\t}\n\t\t\tcapabilityToOwner.set(cap, p.meta.id);\n\t\t}\n\t}\n\n\treturn { ordered, byId };\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'resolve.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { resolvePlugins } from './resolve';\n\nfunction plugin(id: string, caps: string[] = [], deps: string[] = []) {\n\treturn {\n\t\tmeta: { id, capabilities: caps, dependsOn: deps },\n\t};\n}\n\ndescribe('resolvePlugins', () => {\n\tit('orders deterministically by plugin id', () => {\n\t\tconst result = resolvePlugins([plugin('b'), plugin('a')]);\n\t\texpect(result.ordered.map((p) => p.meta.id)).toEqual(['a', 'b']);\n\t});\n\n\tit('throws when required dependencies are missing', () => {\n\t\texpect(() => resolvePlugins([plugin('a', [], ['missing'])])).toThrow(/Missing required plugin dependency/);\n\t});\n\n\tit('throws on capability conflicts', () => {\n\t\texpect(() => resolvePlugins([plugin('a', ['cap:x']), plugin('b', ['cap:x'])])).toThrow(/Capability conflict/);\n\t});\n});\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'registry.ts'),
	`import type { JsonPathPlugin, JsonPathPluginId } from './types';\n\nexport class PluginRegistry {\n\tprivate readonly pluginsById: Map<JsonPathPluginId, JsonPathPlugin> = new Map();\n\n\tpublic register(plugin: JsonPathPlugin): void {\n\t\tthis.pluginsById.set(plugin.meta.id, plugin);\n\t}\n\n\tpublic get(id: JsonPathPluginId): JsonPathPlugin | undefined {\n\t\treturn this.pluginsById.get(id);\n\t}\n\n\tpublic all(): readonly JsonPathPlugin[] {\n\t\treturn [...this.pluginsById.values()];\n\t}\n}\n`,
);

// Export from core index
const indexPath = path.join(pkgDir, 'src', 'index.ts');
const existingIndex = fs.readFileSync(indexPath, 'utf8');
if (!existingIndex.includes("from './plugins")) {
	fs.writeFileSync(
		indexPath,
		existingIndex +
			"\nexport type { JsonPathPlugin, JsonPathPluginMeta, JsonPathPluginId, JsonPathCapability } from './plugins/types';\nexport { resolvePlugins } from './plugins/resolve';\nexport { PluginRegistry } from './plugins/registry';\n",
		'utf8',
	);
}

console.log('Wrote @jsonpath/core plugin resolution + ordering');
NODE
```

##### Step 3 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 3 STOP & COMMIT

```txt
feat(jsonpath-core): add deterministic plugin resolver

Adds plugin metadata, deterministic ordering, dependency checks, and capability conflict detection.

completes: step 3 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 4: Implement `@jsonpath/ast` (feature-agnostic AST nodes + visitors)

- [ ] Create AST node types and visitor helpers.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(p, c) { ensureDir(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'ast');

write(path.join(pkgDir, 'src', 'nodes.ts'), `export type AstNodeBase<TKind extends string> = {\n\tkind: TKind;\n};\n\nexport type JsonPathAst = PathNode;\n\nexport type PathNode = AstNodeBase<'Path'> & {\n\tsegments: SegmentNode[];\n};\n\nexport type SegmentNode = AstNodeBase<'Segment'> & {\n\tselectors: SelectorNode[];\n};\n\nexport type SelectorNode = AstNodeBase<string> & Record<string, unknown>;\n\nexport function path(segments: SegmentNode[]): PathNode {\n\treturn { kind: 'Path', segments };\n}\n\nexport function segment(selectors: SelectorNode[]): SegmentNode {\n\treturn { kind: 'Segment', selectors };\n}\n`);

write(path.join(pkgDir, 'src', 'visitor.ts'), `import type { PathNode, SegmentNode, SelectorNode } from './nodes';\n\nexport type Visitor = {\n\tPath?: (node: PathNode) => void;\n\tSegment?: (node: SegmentNode) => void;\n\tSelector?: (node: SelectorNode) => void;\n};\n\nexport function visitPath(node: PathNode, visitor: Visitor): void {\n\tvisitor.Path?.(node);\n\tfor (const seg of node.segments) {\n\t\tvisitor.Segment?.(seg);\n\t\tfor (const sel of seg.selectors) visitor.Selector?.(sel);\n\t}\n}\n`);

write(path.join(pkgDir, 'src', 'printable.ts'), `import type { JsonPathAst } from './nodes';\n\nexport type PrintableAst = {\n\tast: JsonPathAst;\n};\n\nexport function printable(ast: JsonPathAst): PrintableAst {\n\treturn { ast };\n}\n`);

write(path.join(pkgDir, 'src', 'index.ts'), `export * from './nodes';\nexport * from './visitor';\nexport * from './printable';\n`);

write(path.join(pkgDir, 'src', 'nodes.spec.ts'), `import { describe, expect, it } from 'vitest';\n\nimport { path, segment } from './nodes';\n\ndescribe('@jsonpath/ast', () => {\n\tit('constructs a basic AST', () => {\n\t\tconst ast = path([segment([{ kind: 'Root' }])]);\n\t\texpect(ast.kind).toBe('Path');\n\t\texpect(ast.segments).toHaveLength(1);\n\t});\n});\n`);

console.log('Wrote @jsonpath/ast');
NODE
```

##### Step 4 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/ast` succeeds.

#### Step 4 STOP & COMMIT

```txt
feat(jsonpath-ast): add feature-agnostic AST node types

Adds minimal immutable AST node shapes and a visitor utility.

completes: step 4 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 5: Implement `@jsonpath/lexer` (feature-agnostic tokenization infrastructure)

- [ ] Create basic token/scanner/stream primitives.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(p, c) { ensureDir(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'lexer');

write(path.join(pkgDir, 'src', 'token.ts'), `export type TokenKind = string;\n\nexport type Token = {\n\tkind: TokenKind;\n\tlexeme: string;\n\toffset: number;\n};\n`);

write(path.join(pkgDir, 'src', 'stream.ts'), `import type { Token } from './token';\n\nexport class TokenStream {\n\tprivate readonly tokens: readonly Token[];\n\tprivate index = 0;\n\n\tpublic constructor(tokens: readonly Token[]) {\n\t\tthis.tokens = tokens;\n\t}\n\n\tpublic peek(): Token | undefined {\n\t\treturn this.tokens[this.index];\n\t}\n\n\tpublic next(): Token | undefined {\n\t\tconst t = this.tokens[this.index];\n\t\tif (t) this.index += 1;\n\t\treturn t;\n\t}\n}\n`);

write(path.join(pkgDir, 'src', 'scanner.ts'), `import type { Token, TokenKind } from './token';\n\nexport type ScanRule = (input: string, offset: number) => Token | null;\n\nexport class Scanner {\n\tprivate readonly rules: Map<TokenKind, ScanRule> = new Map();\n\n\tpublic register(kind: TokenKind, rule: ScanRule): void {\n\t\tthis.rules.set(kind, rule);\n\t}\n\n\tpublic scanAll(input: string): Token[] {\n\t\tconst tokens: Token[] = [];\n\t\tlet offset = 0;\n\t\twhile (offset < input.length) {\n\t\t\tlet matched = false;\n\t\t\t// Skip whitespace by default
\t\t\tconst ch = input[offset];\n\t\t\tif (ch === ' ' || ch === '\\t' || ch === '\\n' || ch === '\\r') {\n\t\t\t\toffset += 1;\n\t\t\t\tcontinue;\n\t\t\t}\n\n\t\t\tfor (const [kind, rule] of this.rules.entries()) {\n\t\t\t\tconst token = rule(input, offset);\n\t\t\t\tif (token) {\n\t\t\t\t\ttokens.push({ ...token, kind });\n\t\t\t\t\toffset += token.lexeme.length;\n\t\t\t\t\tmatched = true;\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\n\t\t\tif (!matched) {\n\t\t\t\t// Unknown character becomes a 1-char token.
\t\t\t\ttokens.push({ kind: 'Unknown', lexeme: input[offset], offset });\n\t\t\t\toffset += 1;\n\t\t\t}\n\t\t}\n\t\treturn tokens;\n\t}\n}\n`);

write(path.join(pkgDir, 'src', 'index.ts'), `export * from './token';\nexport * from './scanner';\nexport * from './stream';\n`);

write(path.join(pkgDir, 'src', 'scanner.spec.ts'), `import { describe, expect, it } from 'vitest';\n\nimport { Scanner } from './scanner';\n\ndescribe('@jsonpath/lexer', () => {\n\tit('scans simple punctuation rules', () => {\n\t\tconst s = new Scanner();\n\t\ts.register('Dollar', (input, offset) => (input[offset] === '$' ? { lexeme: '$', offset, kind: 'Dollar' } : null));\n\t\tconst tokens = s.scanAll('$.');\n\t\texpect(tokens.map((t) => t.kind)).toEqual(['Dollar', 'Unknown']);\n\t});\n});\n`);

console.log('Wrote @jsonpath/lexer');
NODE
```

##### Step 5 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 5 STOP & COMMIT

```txt
feat(jsonpath-lexer): add scanner + token stream primitives

Adds a basic rule-driven scanner and token stream used by syntax plugins.

completes: step 5 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 6: Implement `@jsonpath/parser` (feature-agnostic + Pratt utilities)

- [ ] Add minimal parser context and Pratt operator registration primitives.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(p, c) { ensureDir(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'parser');

write(path.join(pkgDir, 'src', 'context.ts'), `import type { TokenStream } from '@jsonpath/lexer';\n\nexport type ParserContext = {\n\tinput: string;\n\ttokens: TokenStream;\n};\n`);

write(path.join(pkgDir, 'src', 'pratt', 'types.ts'), `export type PrattOperator = {\n\tid: string;\n\tprecedence: number;\n};\n\nexport class PrattRegistry {\n\tprivate readonly ops: PrattOperator[] = [];\n\tpublic register(op: PrattOperator): void {\n\t\tthis.ops.push(op);\n\t}\n\tpublic all(): readonly PrattOperator[] {\n\t\treturn this.ops;\n\t}\n}\n`);

write(path.join(pkgDir, 'src', 'parser.ts'), `import type { ParserContext } from './context';\nimport type { PathNode } from '@jsonpath/ast';\nimport { path } from '@jsonpath/ast';\n\nexport type SegmentParser = (ctx: ParserContext) => PathNode | null;\n\nexport class JsonPathParser {\n\tprivate readonly segmentParsers: SegmentParser[] = [];\n\tpublic registerSegmentParser(p: SegmentParser): void {\n\t\tthis.segmentParsers.push(p);\n\t}\n\tpublic parse(ctx: ParserContext): PathNode {\n\t\t// Framework-only placeholder: returns empty path when no parsers installed.
\t\tfor (const p of this.segmentParsers) {\n\t\t\tconst result = p(ctx);\n\t\t\tif (result) return result;\n\t\t}\n\t\treturn path([]);\n\t}\n}\n`);

write(path.join(pkgDir, 'src', 'index.ts'), `export * from './context';\nexport * from './parser';\nexport * from './pratt/types';\n`);

write(path.join(pkgDir, 'src', 'pratt.spec.ts'), `import { describe, expect, it } from 'vitest';\n\nimport { PrattRegistry } from './pratt/types';\n\ndescribe('@jsonpath/parser pratt', () => {\n\tit('registers operators', () => {\n\t\tconst r = new PrattRegistry();\n\t\tr.register({ id: '==', precedence: 10 });\n\t\texpect(r.all()).toHaveLength(1);\n\t});\n});\n`);

console.log('Wrote @jsonpath/parser');
NODE
```

##### Step 6 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/ast` succeeds.

#### Step 6 STOP & COMMIT

```txt
feat(jsonpath-parser): add parser context + pratt registry primitives

Adds framework-only parser context and Pratt operator registry.

completes: step 6 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 7: Implement `@jsonpath/printer` (AST-to-string infrastructure)

- [ ] Add printer options + a minimal AST-to-string printer.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(p, c) { ensureDir(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'printer');

write(path.join(pkgDir, 'src', 'options.ts'), `export type PrintOptions = {\n\t// Reserved for future stable formatting options\n\tmode?: 'compact' | 'pretty';\n};\n`);

write(path.join(pkgDir, 'src', 'printer.ts'), `import type { JsonPathAst } from '@jsonpath/ast';\nimport type { PrintOptions } from './options';\n\nexport function printAst(ast: JsonPathAst, _options?: PrintOptions): string {\n\t// Framework-only stable placeholder: emits a minimal sentinel.
\t// Result/path plugins own stable JSONPath formatting.
\treturn ast.kind === 'Path' ? '$' : '$';\n}\n`);

write(path.join(pkgDir, 'src', 'index.ts'), `export * from './options';\nexport * from './printer';\n`);

write(path.join(pkgDir, 'src', 'printer.spec.ts'), `import { describe, expect, it } from 'vitest';\n\nimport { path } from '@jsonpath/ast';\nimport { printAst } from './printer';\n\ndescribe('@jsonpath/printer', () => {\n\tit('prints a placeholder path', () => {\n\t\texpect(printAst(path([]))).toBe('$');\n\t});\n});\n`);

console.log('Wrote @jsonpath/printer');
NODE
```

##### Step 7 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/lexer` succeeds.

#### Step 7 STOP & COMMIT

```txt
feat(jsonpath-printer): add minimal AST printer infrastructure

Adds a framework-only printer API used by path result views and diagnostics.

completes: step 7 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 8: Implement `@jsonpath/core` engine wiring (framework-only pipeline)

- [ ] Add `createEngine()` that resolves plugins and exposes compile/parse/evaluate stubs.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(p, c) { ensureDir(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'core');

write(path.join(pkgDir, 'src', 'engine.ts'), `import type { PathNode } from '@jsonpath/ast';\n\nexport type CompileResult = {\n\texpression: string;\n\tast: PathNode;\n};\n\nexport type EvaluateOptions = {\n\tresultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';\n};\n\nexport type JsonPathEngine = {\n\tcompile: (expression: string) => CompileResult;\n\tparse: (expression: string) => PathNode;\n\tevaluateSync: (compiled: CompileResult, json: unknown, options?: EvaluateOptions) => unknown[];\n\tevaluateAsync: (compiled: CompileResult, json: unknown, options?: EvaluateOptions) => Promise<unknown[]>;\n};\n`);

write(path.join(pkgDir, 'src', 'createEngine.ts'), `import { Scanner, TokenStream } from '@jsonpath/lexer';\nimport { JsonPathParser } from '@jsonpath/parser';\nimport { path } from '@jsonpath/ast';\n\nimport type { JsonPathEngine, CompileResult, EvaluateOptions } from './engine';\nimport type { JsonPathPlugin } from './plugins/types';\nimport { resolvePlugins } from './plugins/resolve';\n\nexport type CreateEngineOptions = {\n\tplugins: readonly JsonPathPlugin[];\t\n\toptions?: {\n\t\tmaxDepth?: number;\n\t\tmaxResults?: number;\n\t};\n};\n\nexport function createEngine({ plugins }: CreateEngineOptions): JsonPathEngine {\n\t// Resolve (deterministic order + deps + conflicts)
\tresolvePlugins(plugins);\n\n\tconst scanner = new Scanner();\t\n\tconst parser = new JsonPathParser();\n\n\tconst parse = (expression: string) => {\n\t\tconst tokens = scanner.scanAll(expression);\n\t\treturn parser.parse({ input: expression, tokens: new TokenStream(tokens) }) ?? path([]);\n\t};\n\n\tconst compile = (expression: string): CompileResult => ({ expression, ast: parse(expression) });\n\n\tconst evaluateSync = (_compiled: CompileResult, _json: unknown, _options?: EvaluateOptions) => {\n\t\t// Framework-only: evaluation semantics are provided by plugins.
\t\treturn [];\n\t};\n\n\tconst evaluateAsync = async (compiled: CompileResult, json: unknown, options?: EvaluateOptions) =>\n\t\tevaluateSync(compiled, json, options);\n\n\treturn { compile, parse, evaluateSync, evaluateAsync };\n}\n`);

write(path.join(pkgDir, 'src', 'compile.ts'), `export { createEngine } from './createEngine';\n`);

write(path.join(pkgDir, 'src', 'engine.spec.ts'), `import { describe, expect, it } from 'vitest';\n\nimport { createEngine } from './createEngine';\n\ndescribe('@jsonpath/core engine', () => {\n\tit('creates an engine and compiles expressions', () => {\n\t\tconst engine = createEngine({ plugins: [] });\n\t\tconst compiled = engine.compile('$.x');\n\t\texpect(compiled.expression).toBe('$.x');\n\t\texpect(compiled.ast.kind).toBe('Path');\n\t});\n});\n`);

// Re-export createEngine
const indexPath = path.join(pkgDir, 'src', 'index.ts');
const existingIndex = fs.readFileSync(indexPath, 'utf8');
if (!existingIndex.includes("createEngine")) {
	fs.writeFileSync(indexPath, existingIndex + "\nexport { createEngine } from './createEngine';\nexport type { JsonPathEngine } from './engine';\n", 'utf8');
}

console.log('Wrote @jsonpath/core engine wiring');
NODE
```

##### Step 8 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/parser` succeeds.

#### Step 8 STOP & COMMIT

```txt
feat(jsonpath-core): add framework-only engine wiring

Adds createEngine() with parse/compile/evaluate entry points; semantics are delegated to plugins.

completes: step 8 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 9: RFC 9535 syntax plugin shells (root/current/child-member/wildcard)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-syntax-root add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-syntax-current add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-syntax-child-member add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-syntax-wildcard add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
```

- [ ] In each package, replace `src/index.ts` with a wiring-only export of `plugin` (metadata only) and add `src/index.spec.ts` verifying `plugin.meta.id` and `plugin.meta.capabilities`.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

const plugins = [
	{
		dir: 'jsonpath-plugin-syntax-root',
		id: '@jsonpath/plugin-syntax-root',
		capabilities: ['syntax:rfc9535:root'],
	},
	{
		dir: 'jsonpath-plugin-syntax-current',
		id: '@jsonpath/plugin-syntax-current',
		capabilities: ['syntax:rfc9535:current'],
	},
	{
		dir: 'jsonpath-plugin-syntax-child-member',
		id: '@jsonpath/plugin-syntax-child-member',
		capabilities: ['syntax:rfc9535:child-member'],
	},
	{
		dir: 'jsonpath-plugin-syntax-wildcard',
		id: '@jsonpath/plugin-syntax-wildcard',
		capabilities: ['syntax:rfc9535:wildcard'],
	},
];

for (const p of plugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);

	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);

	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

console.log('Wrote RFC 9535 syntax plugin shells (part 1)');
NODE
```

##### Step 9 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-syntax-root --filter @jsonpath/plugin-syntax-current --filter @jsonpath/plugin-syntax-child-member --filter @jsonpath/plugin-syntax-wildcard` succeeds.

#### Step 9 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 syntax plugin shells (part 1)

Adds wiring-only plugin exports + tests for root/current/child-member/wildcard.

completes: step 9 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 10: RFC 9535 syntax plugin shells (child-index/slice + union)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-syntax-child-index add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-syntax-union add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
```

- [ ] Replace `src/index.ts` in each package with a wiring-only `plugin` export + add `src/index.spec.ts`.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

const plugins = [
	{
		dir: 'jsonpath-plugin-syntax-child-index',
		id: '@jsonpath/plugin-syntax-child-index',
		capabilities: ['syntax:rfc9535:child-index', 'syntax:rfc9535:slice'],
	},
	{
		dir: 'jsonpath-plugin-syntax-union',
		id: '@jsonpath/plugin-syntax-union',
		capabilities: ['syntax:rfc9535:union'],
	},
];

for (const p of plugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);

	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);

	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

console.log('Wrote RFC 9535 syntax plugin shells (part 2)');
NODE
```

##### Step 10 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-syntax-child-index --filter @jsonpath/plugin-syntax-union` succeeds.

#### Step 10 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 syntax plugin shells (part 2)

Adds wiring-only plugin exports + tests for child-index/slice and union.

completes: step 10 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 11: RFC 9535 syntax plugin shells (descendant + filter container)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-syntax-descendant add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-syntax-filter add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/lexer@workspace:* @jsonpath/parser@workspace:*
```

- [ ] Replace `src/index.ts` in each package with a wiring-only `plugin` export + add `src/index.spec.ts`.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

const plugins = [
	{
		dir: 'jsonpath-plugin-syntax-descendant',
		id: '@jsonpath/plugin-syntax-descendant',
		capabilities: ['syntax:rfc9535:descendant'],
	},
	{
		dir: 'jsonpath-plugin-syntax-filter',
		id: '@jsonpath/plugin-syntax-filter',
		capabilities: ['syntax:rfc9535:filter-container'],
	},
];

for (const p of plugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);

	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);

	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

console.log('Wrote RFC 9535 syntax plugin shells (part 3)');
NODE
```

##### Step 11 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-syntax-descendant --filter @jsonpath/plugin-syntax-filter` succeeds.

#### Step 11 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 syntax plugin shells (part 3)

Adds wiring-only plugin exports + tests for descendant and filter container.

completes: step 11 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 12: Filter expression plugin shells (literals/boolean/comparison)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-filter-literals add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-filter-boolean add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-filter-comparison add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/parser@workspace:*
```

- [ ] Replace `src/index.ts` in each package with wiring-only `plugin` exports + add tests.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

const plugins = [
	{
		dir: 'jsonpath-plugin-filter-literals',
		id: '@jsonpath/plugin-filter-literals',
		capabilities: ['filter:rfc9535:literals'],
	},
	{
		dir: 'jsonpath-plugin-filter-boolean',
		id: '@jsonpath/plugin-filter-boolean',
		capabilities: ['filter:rfc9535:boolean'],
	},
	{
		dir: 'jsonpath-plugin-filter-comparison',
		id: '@jsonpath/plugin-filter-comparison',
		capabilities: ['filter:rfc9535:comparison'],
	},
];

for (const p of plugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);

	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);

	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

console.log('Wrote filter plugin shells (part 1)');
NODE
```

##### Step 12 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-filter-literals --filter @jsonpath/plugin-filter-boolean --filter @jsonpath/plugin-filter-comparison` succeeds.

#### Step 12 STOP & COMMIT

```txt
feat(jsonpath): add filter plugin shells (part 1)

Adds wiring-only plugin exports + tests for filter literals/boolean/comparison.

completes: step 12 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 13: Filter expression plugin shells (existence/functions/regex)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-filter-existence add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/parser@workspace:*
pnpm --filter @jsonpath/plugin-functions-core add @jsonpath/core@workspace:*
pnpm --filter @jsonpath/plugin-filter-functions add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/parser@workspace:* @jsonpath/plugin-functions-core@workspace:*
pnpm --filter @jsonpath/plugin-iregexp add @jsonpath/core@workspace:*
pnpm --filter @jsonpath/plugin-filter-regex add @jsonpath/core@workspace:* @jsonpath/ast@workspace:* @jsonpath/parser@workspace:* @jsonpath/plugin-iregexp@workspace:*
```

- [ ] Replace `src/index.ts` in each package with wiring-only `plugin` exports + add tests.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

const plugins = [
	{
		dir: 'jsonpath-plugin-filter-existence',
		id: '@jsonpath/plugin-filter-existence',
		capabilities: ['filter:rfc9535:existence'],
	},
	{
		dir: 'jsonpath-plugin-functions-core',
		id: '@jsonpath/plugin-functions-core',
		capabilities: ['functions:rfc9535:core'],
	},
	{
		dir: 'jsonpath-plugin-filter-functions',
		id: '@jsonpath/plugin-filter-functions',
		capabilities: ['filter:rfc9535:functions'],
		dependsOn: ['@jsonpath/plugin-functions-core'],
	},
	{
		dir: 'jsonpath-plugin-iregexp',
		id: '@jsonpath/plugin-iregexp',
		capabilities: ['regex:rfc9485:iregexp'],
	},
	{
		dir: 'jsonpath-plugin-filter-regex',
		id: '@jsonpath/plugin-filter-regex',
		capabilities: ['filter:rfc9535:regex'],
		dependsOn: ['@jsonpath/plugin-iregexp'],
	},
];

for (const p of plugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);

	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},${p.dependsOn ? `\n\t\tdependsOn: ${JSON.stringify(p.dependsOn)},` : ''}\n\t},\n};\n`,
	);

	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});${p.dependsOn ? `\n\t\texpect(plugin.meta.dependsOn).toEqual(${JSON.stringify(p.dependsOn)});` : ''}\n\t});\n});\n`,
	);
}

console.log('Wrote filter plugin shells (part 2)');
NODE
```

##### Step 13 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-filter-existence --filter @jsonpath/plugin-functions-core --filter @jsonpath/plugin-filter-functions --filter @jsonpath/plugin-iregexp --filter @jsonpath/plugin-filter-regex` succeeds.

#### Step 13 STOP & COMMIT

```txt
feat(jsonpath): add filter plugin shells (part 2)

Adds wiring-only plugin exports + tests for filter existence/functions/regex and dependencies.

completes: step 13 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 14: Implement minimal FunctionRegistry contract (`@jsonpath/plugin-functions-core`)

- [ ] Create `src/registry.ts` containing a `FunctionRegistry` with `register(name, fn)` and `get(name)`.
- [ ] Ensure `src/index.ts` exports `FunctionRegistry` and a wiring-only `plugin` export.
- [ ] Add `src/index.spec.ts` validating the registry and plugin metadata.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'plugin-functions-core');

write(
	path.join(pkgDir, 'src', 'registry.ts'),
	`export type JsonPathFunction = (...args: unknown[]) => unknown;\n\nexport class FunctionRegistry {\n\tprivate readonly fns: Map<string, JsonPathFunction> = new Map();\n\n\tpublic register(name: string, fn: JsonPathFunction): void {\n\t\tthis.fns.set(name, fn);\n\t}\n\n\tpublic get(name: string): JsonPathFunction | undefined {\n\t\treturn this.fns.get(name);\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport { FunctionRegistry } from './registry';\nexport type { JsonPathFunction } from './registry';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-functions-core',\n\t\tcapabilities: ['functions:rfc9535:core'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { FunctionRegistry, plugin } from './index';\n\ndescribe('@jsonpath/plugin-functions-core', () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-functions-core');\n\t\texpect(plugin.meta.capabilities).toEqual(['functions:rfc9535:core']);\n\t});\n\n\tit('registers and resolves functions', () => {\n\t\tconst r = new FunctionRegistry();\n\t\tr.register('len', (x) => String(x).length);\n\t\texpect(r.get('len')?.('abc')).toBe(3);\n\t});\n});\n`,
);

console.log('Wrote FunctionRegistry + plugin shell');
NODE
```

##### Step 14 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-functions-core` succeeds.

#### Step 14 STOP & COMMIT

```txt
feat(jsonpath): add RFC function registry contract

Adds @jsonpath/plugin-functions-core with FunctionRegistry API surface and unit tests.

completes: step 14 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 15: Result view plugin shells + aggregator (`@jsonpath/plugin-result-*`)

- [ ] Add required deps:

```bash
pnpm --filter @jsonpath/plugin-result-value add @jsonpath/core@workspace:*
pnpm --filter @jsonpath/plugin-result-node add @jsonpath/core@workspace:*
pnpm --filter @jsonpath/plugin-result-path add @jsonpath/core@workspace:* @jsonpath/printer@workspace:*
pnpm --filter @jsonpath/plugin-result-pointer add @jsonpath/core@workspace:* @jsonpath/pointer@workspace:*
pnpm --filter @jsonpath/plugin-result-parent add @jsonpath/core@workspace:*
pnpm --filter @jsonpath/plugin-result-types add @jsonpath/core@workspace:* @jsonpath/plugin-result-value@workspace:* @jsonpath/plugin-result-node@workspace:* @jsonpath/plugin-result-path@workspace:* @jsonpath/plugin-result-pointer@workspace:* @jsonpath/plugin-result-parent@workspace:*
```

- [ ] For each `@jsonpath/plugin-result-*` package: export wiring-only `plugin` + unit test.
- [ ] In `@jsonpath/plugin-result-types`, export a stable `plugins` array re-exporting the 5 result plugins.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

const resultPlugins = [
	{ dir: 'jsonpath-plugin-result-value', id: '@jsonpath/plugin-result-value', capabilities: ['result:value'] },
	{ dir: 'jsonpath-plugin-result-node', id: '@jsonpath/plugin-result-node', capabilities: ['result:node'] },
	{ dir: 'jsonpath-plugin-result-path', id: '@jsonpath/plugin-result-path', capabilities: ['result:path'] },
	{ dir: 'jsonpath-plugin-result-pointer', id: '@jsonpath/plugin-result-pointer', capabilities: ['result:pointer'] },
	{ dir: 'jsonpath-plugin-result-parent', id: '@jsonpath/plugin-result-parent', capabilities: ['result:parent'] },
];

for (const p of resultPlugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

const typesDir = path.join(repoRoot, 'packages', 'jsonpath', 'plugin-result-types');
write(
	path.join(typesDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nimport { plugin as value } from '@jsonpath/plugin-result-value';\nimport { plugin as node } from '@jsonpath/plugin-result-node';\nimport { plugin as pathPlugin } from '@jsonpath/plugin-result-path';\nimport { plugin as pointer } from '@jsonpath/plugin-result-pointer';\nimport { plugin as parent } from '@jsonpath/plugin-result-parent';\n\nexport const plugins = [value, node, pathPlugin, pointer, parent] as const satisfies readonly JsonPathPlugin[];\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-result-types',\n\t\tcapabilities: ['result:types'],\n\t\tdependsOn: plugins.map((p) => p.meta.id),\n\t},\n};\n`,
);

write(
	path.join(typesDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { plugin, plugins } from './index';\n\ndescribe('@jsonpath/plugin-result-types', () => {\n\tit('exports plugin list and metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-result-types');\n\t\texpect(plugins).toHaveLength(5);\n\t});\n});\n`,
);

console.log('Wrote result view plugin shells + aggregator');
NODE
```

##### Step 15 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-result-* -- --passWithNoTests` succeeds.

#### Step 15 STOP & COMMIT

```txt
feat(jsonpath): add result view plugin shells

Adds wiring-only result view plugins and an aggregator list.

completes: step 15 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 16: Implement baseline I-Regexp helper (`@jsonpath/plugin-iregexp`)

- [ ] Add `src/iregexp.ts` exporting `matches(pattern: string, value: string): boolean` using `RegExp`.
- [ ] Export `matches` and wiring-only `plugin` from `src/index.ts`.
- [ ] Add unit tests.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'plugin-iregexp');

write(
	path.join(pkgDir, 'src', 'iregexp.ts'),
	`export function matches(pattern: string, value: string): boolean {\n\ttry {\n\t\treturn new RegExp(pattern).test(value);\n\t} catch {\n\t\treturn false;\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport { matches } from './iregexp';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-iregexp',\n\t\tcapabilities: ['regex:rfc9485:iregexp'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { matches, plugin } from './index';\n\ndescribe('@jsonpath/plugin-iregexp', () => {\n\tit('matches via RegExp', () => {\n\t\texpect(matches('^a', 'abc')).toBe(true);\n\t\texpect(matches('^a', 'xbc')).toBe(false);\n\t});\n\n\tit('returns false on invalid patterns', () => {\n\t\texpect(matches('(', 'abc')).toBe(false);\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-iregexp');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-iregexp baseline');
NODE
```

##### Step 16 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-iregexp` succeeds.

#### Step 16 STOP & COMMIT

```txt
feat(jsonpath): add i-regexp plugin baseline

Adds @jsonpath/plugin-iregexp baseline matcher helper + plugin metadata.

completes: step 16 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 17: RFC 9535 preset bundle (`@jsonpath/plugin-rfc-9535`)

- [ ] Add deps on all RFC syntax/filter/function/result plugins:

```bash
pnpm --filter @jsonpath/plugin-rfc-9535 add \
	@jsonpath/core@workspace:* \
	@jsonpath/plugin-syntax-root@workspace:* \
	@jsonpath/plugin-syntax-current@workspace:* \
	@jsonpath/plugin-syntax-child-member@workspace:* \
	@jsonpath/plugin-syntax-child-index@workspace:* \
	@jsonpath/plugin-syntax-wildcard@workspace:* \
	@jsonpath/plugin-syntax-union@workspace:* \
	@jsonpath/plugin-syntax-descendant@workspace:* \
	@jsonpath/plugin-syntax-filter@workspace:* \
	@jsonpath/plugin-filter-literals@workspace:* \
	@jsonpath/plugin-filter-boolean@workspace:* \
	@jsonpath/plugin-filter-comparison@workspace:* \
	@jsonpath/plugin-filter-existence@workspace:* \
	@jsonpath/plugin-functions-core@workspace:* \
	@jsonpath/plugin-filter-functions@workspace:* \
	@jsonpath/plugin-iregexp@workspace:* \
	@jsonpath/plugin-filter-regex@workspace:* \
	@jsonpath/plugin-result-value@workspace:* \
	@jsonpath/plugin-result-node@workspace:* \
	@jsonpath/plugin-result-path@workspace:* \
	@jsonpath/plugin-result-pointer@workspace:* \
	@jsonpath/plugin-result-parent@workspace:* \
	@jsonpath/plugin-result-types@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'plugin-rfc-9535');

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\nimport { createEngine } from '@jsonpath/core';\n\nimport { plugin as root } from '@jsonpath/plugin-syntax-root';\nimport { plugin as current } from '@jsonpath/plugin-syntax-current';\nimport { plugin as childMember } from '@jsonpath/plugin-syntax-child-member';\nimport { plugin as childIndex } from '@jsonpath/plugin-syntax-child-index';\nimport { plugin as wildcard } from '@jsonpath/plugin-syntax-wildcard';\nimport { plugin as union } from '@jsonpath/plugin-syntax-union';\nimport { plugin as descendant } from '@jsonpath/plugin-syntax-descendant';\nimport { plugin as filterContainer } from '@jsonpath/plugin-syntax-filter';\n\nimport { plugin as literals } from '@jsonpath/plugin-filter-literals';\nimport { plugin as boolOps } from '@jsonpath/plugin-filter-boolean';\nimport { plugin as comparison } from '@jsonpath/plugin-filter-comparison';\nimport { plugin as existence } from '@jsonpath/plugin-filter-existence';\nimport { plugin as functionsCore } from '@jsonpath/plugin-functions-core';\nimport { plugin as filterFunctions } from '@jsonpath/plugin-filter-functions';\nimport { plugin as iregexp } from '@jsonpath/plugin-iregexp';\nimport { plugin as filterRegex } from '@jsonpath/plugin-filter-regex';\n\nimport { plugin as resultValue } from '@jsonpath/plugin-result-value';\nimport { plugin as resultNode } from '@jsonpath/plugin-result-node';\nimport { plugin as resultPath } from '@jsonpath/plugin-result-path';\nimport { plugin as resultPointer } from '@jsonpath/plugin-result-pointer';\nimport { plugin as resultParent } from '@jsonpath/plugin-result-parent';\nimport { plugin as resultTypes } from '@jsonpath/plugin-result-types';\n\nexport const rfc9535Plugins = [\n\troot,\n\tcurrent,\n\tchildMember,\n\tchildIndex,\n\twildcard,\n\tunion,\n\tdescendant,\n\tfilterContainer,\n\tliterals,\n\tboolOps,\n\tcomparison,\n\texistence,\n\tfunctionsCore,\n\tfilterFunctions,\n\tiregexp,\n\tfilterRegex,\n\tresultValue,\n\tresultNode,\n\tresultPath,\n\tresultPointer,\n\tresultParent,\n\tresultTypes,\n] as const satisfies readonly JsonPathPlugin[];\n\nexport function createRfc9535Engine() {\n\treturn createEngine({ plugins: rfc9535Plugins });\n}\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-rfc-9535',\n\t\tcapabilities: ['preset:rfc9535'],\n\t\tdependsOn: rfc9535Plugins.map((p) => p.meta.id),\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { createRfc9535Engine, plugin, rfc9535Plugins } from './index';\n\ndescribe('@jsonpath/plugin-rfc-9535', () => {\n\tit('exports a preset list', () => {\n\t\texpect(rfc9535Plugins.length).toBeGreaterThan(5);\n\t});\n\n\tit('creates an engine', () => {\n\t\tconst engine = createRfc9535Engine();\n\t\tconst compiled = engine.compile('$.x');\n\t\texpect(compiled.expression).toBe('$.x');\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-rfc-9535');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-rfc-9535 preset');
NODE
```

##### Step 17 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-rfc-9535` succeeds.

#### Step 17 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 preset plugin

Adds @jsonpath/plugin-rfc-9535 wiring-only preset and createRfc9535Engine().

completes: step 17 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 18: SES script expressions plugin (`@jsonpath/plugin-script-expressions`) (opt-in)

- [ ] Add dependency on `ses`.
- [ ] Export `createCompartment({ endowments? })` and wiring-only `plugin`.
- [ ] Add unit test validating a compartment can be created.
- [ ] Add required deps:

```bash
pnpm --filter @jsonpath/plugin-script-expressions add @jsonpath/core@workspace:* ses
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'plugin-script-expressions');

write(
	path.join(pkgDir, 'src', 'compartment.ts'),
	`import 'ses';\n\nexport type CreateCompartmentOptions = {\n\tendowments?: Record<string, unknown>;\n};\n\nexport function createCompartment(options: CreateCompartmentOptions = {}) {\n\tconst Compartment = (globalThis).Compartment as unknown;\n\tif (typeof Compartment !== 'function') {\n\t\tthrow new Error('SES Compartment is not available. Ensure `ses` is installed and imported.');\n\t}\n\treturn new (Compartment as any)(options.endowments ?? {});\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport { createCompartment } from './compartment';\nexport type { CreateCompartmentOptions } from './compartment';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-script-expressions',\n\t\tcapabilities: ['filter:script:ses'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { createCompartment, plugin } from './index';\n\ndescribe('@jsonpath/plugin-script-expressions', () => {\n\tit('creates a SES compartment', () => {\n\t\tconst c = createCompartment({ endowments: { x: 1 } });\n\t\texpect(typeof (c as any).evaluate).toBe('function');\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-script-expressions');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-script-expressions');
NODE
```

##### Step 18 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-script-expressions` succeeds.

#### Step 18 STOP & COMMIT

```txt
feat(jsonpath): add opt-in SES script expressions plugin

Adds @jsonpath/plugin-script-expressions with SES Compartment wiring.

completes: step 18 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 19: JSON Pointer package (`@jsonpath/pointer`) with hardening

- [ ] Implement pointer parse/get/set/remove with forbidden segments `__proto__`, `prototype`, `constructor`.
- [ ] Add unit tests covering forbidden segment rejection.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'pointer');

write(
	path.join(pkgDir, 'src', 'forbidden.ts'),
	`export const ForbiddenPointerSegments = new Set(['__proto__', 'prototype', 'constructor']);\n\nexport function assertNotForbiddenSegment(segment: string): void {\n\tif (ForbiddenPointerSegments.has(segment)) {\n\t\tthrow new Error(\`Forbidden JSON Pointer segment: \${segment}\`);\n\t}\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'parse.ts'),
	`import { assertNotForbiddenSegment } from './forbidden';\n\nfunction decode(segment: string): string {\n\t// RFC 6901: ~1 => / and ~0 => ~\n\treturn segment.replace(/~1/g, '/').replace(/~0/g, '~');\n}\n\nexport function parsePointer(pointer: string): string[] {\n\tif (pointer === '') return [];\n\tif (!pointer.startsWith('/')) throw new Error('JSON Pointer must start with "/" or be empty.');\n\tconst parts = pointer.split('/').slice(1).map(decode);\n\tfor (const p of parts) assertNotForbiddenSegment(p);\n\treturn parts;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'get.ts'),
	`import { parsePointer } from './parse';\n\nexport function getByPointer(root: unknown, pointer: string): unknown {\n\tconst parts = parsePointer(pointer);\n\tlet current: any = root as any;\n\tfor (const part of parts) {\n\t\tif (current == null) return undefined;\n\t\tcurrent = current[part];\n\t}\n\treturn current;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'mutate.ts'),
	`import { parsePointer } from './parse';\n\nfunction isObjectLike(value: unknown): value is Record<string, unknown> | unknown[] {\n\treturn typeof value === 'object' && value !== null;\n}\n\nfunction cloneContainer(value: unknown): any {\n\tif (Array.isArray(value)) return value.slice();\n\tif (isObjectLike(value)) return { ...(value as any) };\n\treturn value;\n}\n\nexport function setByPointer(root: unknown, pointer: string, value: unknown): unknown {\n\tconst parts = parsePointer(pointer);\n\tif (parts.length === 0) throw new Error('Cannot set the document root via JSON Pointer.');\n\n\tconst nextRoot: any = cloneContainer(root);\n\tlet current: any = nextRoot;\n\tlet original: any = root as any;\n\n\tfor (let i = 0; i < parts.length - 1; i += 1) {\n\t\tconst part = parts[i];\n\t\tconst origChild = isObjectLike(original) ? (original as any)[part] : undefined;\n\t\tconst child = cloneContainer(origChild ?? {});\n\t\t(current as any)[part] = child;\n\t\tcurrent = child;\n\t\toriginal = origChild;\n\t}\n\n\tconst last = parts[parts.length - 1];\n\t(current as any)[last] = value;\n\treturn nextRoot;\n}\n\nexport function removeByPointer(root: unknown, pointer: string): unknown {\n\tconst parts = parsePointer(pointer);\n\tif (parts.length === 0) throw new Error('Cannot remove the document root via JSON Pointer.');\n\n\tconst nextRoot: any = cloneContainer(root);\n\tlet current: any = nextRoot;\n\tlet original: any = root as any;\n\n\tfor (let i = 0; i < parts.length - 1; i += 1) {\n\t\tconst part = parts[i];\n\t\tconst origChild = isObjectLike(original) ? (original as any)[part] : undefined;\n\t\tif (!isObjectLike(origChild)) return nextRoot;\n\t\tconst child = cloneContainer(origChild);\n\t\t(current as any)[part] = child;\n\t\tcurrent = child;\n\t\toriginal = origChild;\n\t}\n\n\tconst last = parts[parts.length - 1];\n\tif (Array.isArray(current)) {\n\t\tconst idx = Number(last);\n\t\tif (Number.isInteger(idx)) current.splice(idx, 1);\n\t\treturn nextRoot;\n\t}\n\tif (isObjectLike(current)) {\n\t\tdelete (current as any)[last];\n\t}\n\treturn nextRoot;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export { ForbiddenPointerSegments, assertNotForbiddenSegment } from './forbidden';\nexport { parsePointer } from './parse';\nexport { getByPointer } from './get';\nexport { setByPointer, removeByPointer } from './mutate';\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { getByPointer, removeByPointer, setByPointer } from './index';\n\ndescribe('@jsonpath/pointer', () => {\n\tit('gets values', () => {\n\t\texpect(getByPointer({ a: { b: 1 } }, '/a/b')).toBe(1);\n\t\texpect(getByPointer({ a: { b: 1 } }, '/a/missing')).toBeUndefined();\n\t});\n\n\tit('sets values immutably', () => {\n\t\tconst root = { a: { b: 1 } };\n\t\tconst next = setByPointer(root, '/a/b', 2) as any;\n\t\texpect((root as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBe(2);\n\t});\n\n\tit('rejects forbidden segments', () => {\n\t\texpect(() => setByPointer({}, '/__proto__/x', 1)).toThrow(/Forbidden JSON Pointer segment/);\n\t\texpect(() => removeByPointer({}, '/constructor/x')).toThrow(/Forbidden JSON Pointer segment/);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/pointer (hardened)');
NODE
```

##### Step 19 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 19 STOP & COMMIT

```txt
feat(jsonpath): add JSON Pointer utilities (hardened)

Adds @jsonpath/pointer with get/set/remove and prototype-pollution protections.

completes: step 19 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 20: JSON Patch package (`@jsonpath/patch`)

- [ ] Implement `applyPatch(doc, ops)` supporting `add`, `replace`, and `remove`, delegating to `@jsonpath/pointer`.
- [ ] Add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/patch add @jsonpath/pointer@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'patch');

write(
	path.join(pkgDir, 'src', 'types.ts'),
	`export type JsonPatchOp =\n\t| { op: 'add'; path: string; value: unknown }\n\t| { op: 'replace'; path: string; value: unknown }\n\t| { op: 'remove'; path: string };\n`,
);

write(
	path.join(pkgDir, 'src', 'apply.ts'),
	`import type { JsonPatchOp } from './types';\n\nimport { removeByPointer, setByPointer } from '@jsonpath/pointer';\n\nexport function applyPatch(doc: unknown, ops: readonly JsonPatchOp[]): unknown {\n\tlet current: unknown = doc;\n\tfor (const op of ops) {\n\t\tif (op.op === 'add' || op.op === 'replace') {\n\t\t\tcurrent = setByPointer(current, op.path, op.value);\n\t\t\tcontinue;\n\t\t}\n\t\tif (op.op === 'remove') {\n\t\t\tcurrent = removeByPointer(current, op.path);\n\t\t\tcontinue;\n\t\t}\n\t\tconst _exhaustive: never = op;\n\t\tthrow new Error('Unsupported JSON Patch operation');\n\t}\n\treturn current;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export type { JsonPatchOp } from './types';\nexport { applyPatch } from './apply';\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { applyPatch } from './index';\n\ndescribe('@jsonpath/patch', () => {\n\tit('applies add/replace/remove operations', () => {\n\t\tconst doc = { a: { b: 1 }, xs: [1, 2, 3] };\n\t\tconst next = applyPatch(doc, [\n\t\t\t{ op: 'replace', path: '/a/b', value: 2 },\n\t\t\t{ op: 'add', path: '/a/c', value: 3 },\n\t\t\t{ op: 'remove', path: '/xs/1' },\n\t\t]) as any;\n\t\texpect((doc as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBe(2);\n\t\texpect(next.a.c).toBe(3);\n\t\texpect(next.xs).toEqual([1, 3]);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/patch');
NODE
```

##### Step 20 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/patch` succeeds.

#### Step 20 STOP & COMMIT

```txt
feat(jsonpath): add JSON Patch apply helper

Adds @jsonpath/patch with applyPatch for add/replace/remove operations.

completes: step 20 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 21: Mutation helpers (`@jsonpath/mutate`)

- [ ] Implement pointer-based helpers like `setAll(doc, pointers, value)` and `removeAll(doc, pointers)`.
- [ ] Add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/mutate add @jsonpath/pointer@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'mutate');

write(
	path.join(pkgDir, 'src', 'mutate.ts'),
	`import { removeByPointer, setByPointer } from '@jsonpath/pointer';\n\nexport function setAll(root: unknown, pointers: readonly string[], value: unknown): unknown {\n\tlet current: unknown = root;\n\tfor (const p of pointers) current = setByPointer(current, p, value);\n\treturn current;\n}\n\nexport function removeAll(root: unknown, pointers: readonly string[]): unknown {\n\tlet current: unknown = root;\n\tfor (const p of pointers) current = removeByPointer(current, p);\n\treturn current;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export { setAll, removeAll } from './mutate';\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { removeAll, setAll } from './index';\n\ndescribe('@jsonpath/mutate', () => {\n\tit('sets multiple pointers', () => {\n\t\tconst root = { a: { b: 1 }, c: { d: 2 } };\n\t\tconst next = setAll(root, ['/a/b', '/c/d'], 9) as any;\n\t\texpect((root as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBe(9);\n\t\texpect(next.c.d).toBe(9);\n\t});\n\n\tit('removes multiple pointers', () => {\n\t\tconst root = { a: { b: 1, c: 2 } };\n\t\tconst next = removeAll(root, ['/a/b']) as any;\n\t\texpect((root as any).a.b).toBe(1);\n\t\texpect(next.a.b).toBeUndefined();\n\t\texpect(next.a.c).toBe(2);\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/mutate');
NODE
```

##### Step 21 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/mutate` succeeds.

#### Step 21 STOP & COMMIT

```txt
feat(jsonpath): add pointer-based mutation helpers

Adds @jsonpath/mutate utilities for applying set/remove operations across multiple pointers.

completes: step 21 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 22: Validation orchestration plugin (`@jsonpath/plugin-validate`)

- [ ] Implement a common `Issue` model and a `ValidatorAdapter` interface.
- [ ] Implement `validateAll(values, adapter)` and add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-validate add @jsonpath/core@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'plugin-validate');

write(
	path.join(pkgDir, 'src', 'types.ts'),
	`export type Issue = {\n\tmessage: string;\n\tcode?: string;\n\tpath?: string;\n\tmeta?: unknown;\n};\n\nexport type ValidatorAdapter = {\n\tid: string;\n\tvalidate: (value: unknown) => readonly Issue[];\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'validate.ts'),
	`import type { Issue, ValidatorAdapter } from './types';\n\nexport function validateAll(values: readonly unknown[], adapter: ValidatorAdapter): Issue[] {\n\tconst issues: Issue[] = [];\n\tfor (const v of values) issues.push(...adapter.validate(v));\n\treturn issues;\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport type { Issue, ValidatorAdapter } from './types';\nexport { validateAll } from './validate';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: '@jsonpath/plugin-validate',\n\t\tcapabilities: ['validate'],\n\t},\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { plugin, validateAll, type ValidatorAdapter } from './index';\n\ndescribe('@jsonpath/plugin-validate', () => {\n\tit('validates multiple values', () => {\n\t\tconst adapter: ValidatorAdapter = {\n\t\t\tid: 'test',\n\t\t\tvalidate: (v) => (v === 1 ? [{ message: 'bad', code: 'E_BAD' }] : []),\n\t\t};\n\t\texpect(validateAll([0, 1, 2], adapter)).toEqual([{ message: 'bad', code: 'E_BAD' }]);\n\t});\n\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe('@jsonpath/plugin-validate');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/plugin-validate');
NODE
```

##### Step 22 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-validate` succeeds.

#### Step 22 STOP & COMMIT

```txt
feat(jsonpath): add validation orchestration plugin

Adds @jsonpath/plugin-validate with a common Issue model and adapter interface.

completes: step 22 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 23: Validator adapters (`@jsonpath/validator-*`)

- [ ] Implement adapters:
  - `@jsonpath/validator-json-schema` (Ajv)
  - `@jsonpath/validator-zod`
  - `@jsonpath/validator-yup`
- [ ] Each exports `create*Adapter(schema)` returning `{ id, validate(value): Issue[] }`.
- [ ] Add unit tests.
- [ ] Add required deps:

```bash
pnpm --filter @jsonpath/validator-json-schema add @jsonpath/plugin-validate@workspace:* ajv
pnpm --filter @jsonpath/validator-zod add @jsonpath/plugin-validate@workspace:* zod
pnpm --filter @jsonpath/validator-yup add @jsonpath/plugin-validate@workspace:* yup
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

// Ajv adapter
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'validator-json-schema');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import Ajv from 'ajv';\n\nimport type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';\n\nexport type JsonSchema = Record<string, unknown>;\n\nexport function createJsonSchemaAdapter(schema: JsonSchema): ValidatorAdapter {\n\tconst ajv = new Ajv({ allErrors: true, strict: false });\n\tconst validate = ajv.compile(schema as any);\n\n\treturn {\n\t\tid: '@jsonpath/validator-json-schema',\n\t\tvalidate: (value: unknown): Issue[] => {\n\t\t\tconst ok = validate(value as any);\n\t\t\tif (ok) return [];\n\t\t\tconst errors = validate.errors ?? [];\n\t\t\treturn errors.map((e) => ({\n\t\t\t\tmessage: e.message ?? 'Schema validation error',\n\t\t\t\tcode: String(e.keyword ?? 'schema'),\n\t\t\t\tpath: String(e.instancePath ?? ''),\n\t\t\t\tmeta: e,\n\t\t\t}));\n\t\t},\n\t};\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { createJsonSchemaAdapter } from './index';\n\ndescribe('@jsonpath/validator-json-schema', () => {\n\tit('returns issues for invalid values', () => {\n\t\tconst adapter = createJsonSchemaAdapter({ type: 'number' });\n\t\texpect(adapter.validate('x').length).toBeGreaterThan(0);\n\t\texpect(adapter.validate(1)).toEqual([]);\n\t});\n});\n`,
	);
}

// Zod adapter
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'validator-zod');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { ZodTypeAny } from 'zod';\n\nimport type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';\n\nexport function createZodAdapter(schema: ZodTypeAny): ValidatorAdapter {\n\treturn {\n\t\tid: '@jsonpath/validator-zod',\n\t\tvalidate: (value: unknown): Issue[] => {\n\t\t\tconst result = schema.safeParse(value);\n\t\t\tif (result.success) return [];\n\t\t\treturn result.error.issues.map((i) => ({\n\t\t\t\tmessage: i.message,\n\t\t\t\tcode: i.code,\n\t\t\t\tpath: i.path.length ? '/' + i.path.join('/') : '',\n\t\t\t\tmeta: i,\n\t\t\t}));\n\t\t},\n\t};\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { z } from 'zod';\n\nimport { createZodAdapter } from './index';\n\ndescribe('@jsonpath/validator-zod', () => {\n\tit('returns issues for invalid values', () => {\n\t\tconst adapter = createZodAdapter(z.object({ a: z.number() }));\n\t\texpect(adapter.validate({ a: 'x' }).length).toBeGreaterThan(0);\n\t\texpect(adapter.validate({ a: 1 })).toEqual([]);\n\t});\n});\n`,
	);
}

// Yup adapter
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'validator-yup');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { AnySchema, ValidationError } from 'yup';\n\nimport type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';\n\nexport function createYupAdapter(schema: AnySchema): ValidatorAdapter {\n\treturn {\n\t\tid: '@jsonpath/validator-yup',\n\t\tvalidate: (value: unknown): Issue[] => {\n\t\t\ttry {\n\t\t\t\tschema.validateSync(value, { abortEarly: false });\n\t\t\t\treturn [];\n\t\t\t} catch (err) {\n\t\t\t\tconst e = err as ValidationError;\n\t\t\t\tconst inner = e.inner?.length ? e.inner : [e];\n\t\t\t\treturn inner.map((i) => ({\n\t\t\t\t\tmessage: i.message,\n\t\t\t\t\tcode: i.type ?? 'yup',\n\t\t\t\t\tpath: i.path ? '/' + String(i.path).split('.').join('/') : '',\n\t\t\t\t\tmeta: i,\n\t\t\t\t}));\n\t\t\t}\n\t\t},\n\t};\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport * as yup from 'yup';\n\nimport { createYupAdapter } from './index';\n\ndescribe('@jsonpath/validator-yup', () => {\n\tit('returns issues for invalid values', () => {\n\t\tconst adapter = createYupAdapter(yup.object({ a: yup.number().required() }));\n\t\texpect(adapter.validate({ a: 'x' }).length).toBeGreaterThan(0);\n\t\texpect(adapter.validate({ a: 1 })).toEqual([]);\n\t});\n});\n`,
	);
}

console.log('Wrote validator adapters');
NODE
```

##### Step 23 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/validator-* -- --passWithNoTests` succeeds.

#### Step 23 STOP & COMMIT

```txt
feat(jsonpath): add validator adapters (ajv/zod/yup)

Adds validator adapter packages mapping schema errors into the @jsonpath/plugin-validate Issue model.

completes: step 23 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 24: Optional non-RFC extension plugin shells

- [ ] Add wiring-only plugin shells + tests:
  - `@jsonpath/plugin-parent-selector`
  - `@jsonpath/plugin-property-name-selector`
  - `@jsonpath/plugin-type-selectors`
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-parent-selector add @jsonpath/core@workspace:*
pnpm --filter @jsonpath/plugin-property-name-selector add @jsonpath/core@workspace:*
pnpm --filter @jsonpath/plugin-type-selectors add @jsonpath/core@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

const plugins = [
	{ dir: 'jsonpath-plugin-parent-selector', id: '@jsonpath/plugin-parent-selector', capabilities: ['extension:parent-selector'] },
	{ dir: 'jsonpath-plugin-property-name-selector', id: '@jsonpath/plugin-property-name-selector', capabilities: ['extension:property-name-selector'] },
	{ dir: 'jsonpath-plugin-type-selectors', id: '@jsonpath/plugin-type-selectors', capabilities: ['extension:type-selectors'] },
];

for (const p of plugins) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import type { JsonPathPlugin } from '@jsonpath/core';\n\nexport const plugin: JsonPathPlugin = {\n\tmeta: {\n\t\tid: ${JSON.stringify(p.id)},\n\t\tcapabilities: ${JSON.stringify(p.capabilities)},\n\t},\n};\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { plugin } from './index';\n\ndescribe(${JSON.stringify(p.id)}, () => {\n\tit('exports plugin metadata', () => {\n\t\texpect(plugin.meta.id).toBe(${JSON.stringify(p.id)});\n\t\texpect(plugin.meta.capabilities).toEqual(${JSON.stringify(p.capabilities)});\n\t});\n});\n`,
	);
}

console.log('Wrote optional extension plugin shells');
NODE
```

##### Step 24 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-parent-selector --filter @jsonpath/plugin-property-name-selector --filter @jsonpath/plugin-type-selectors` succeeds.

#### Step 24 STOP & COMMIT

```txt
feat(jsonpath): add optional extension plugin shells

Adds wiring-only plugin exports for non-RFC extensions used by compat scenarios.

completes: step 24 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 25: Compatibility packages (initial delegation shims)

- [ ] Implement `@jsonpath/compat-jsonpath` delegating to `jsonpath`.
- [ ] Implement `@jsonpath/compat-jsonpath-plus` delegating to `jsonpath-plus`.
- [ ] Add unit tests for both.
- [ ] Add required third-party deps:

```bash
pnpm --filter @jsonpath/compat-jsonpath add jsonpath
pnpm --filter @jsonpath/compat-jsonpath-plus add jsonpath-plus
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

// dchester/jsonpath compat
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'compat-jsonpath');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`import jp from 'jsonpath';\n\n// Minimal drop-in surface: re-export the library API.\n\nexport default jp;\nexport const { query, value, paths, nodes, parent, apply } = jp as any;\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport jp, { query } from './index';\n\ndescribe('@jsonpath/compat-jsonpath', () => {\n\tit('delegates to jsonpath', () => {\n\t\tconst obj = { a: { b: 1 } };\n\t\texpect(query(obj, '$.a.b')).toEqual([1]);\n\t\texpect((jp as any).query(obj, '$.a.b')).toEqual([1]);\n\t});\n});\n`,
	);
}

// jsonpath-plus compat
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath', 'compat-jsonpath-plus');
	write(
		path.join(pkgDir, 'src', 'index.ts'),
		`export { JSONPath } from 'jsonpath-plus';\n\nexport type JSONPathEvalMode = 'safe' | 'native' | false;\n\nexport function readJsonPath(json: unknown, pathExpr: string, evalMode: JSONPathEvalMode = 'safe'): unknown {\n\tconst results = JSONPath<unknown[]>({ path: pathExpr, json: json as any, wrap: true, eval: evalMode });\n\tif (!Array.isArray(results) || results.length === 0) return undefined;\n\tif (results.length === 1) return results[0];\n\treturn results;\n}\n\nexport function findJsonPathPointers(json: unknown, pathExpr: string, evalMode: JSONPathEvalMode = 'safe'): string[] {\n\tconst pointers = JSONPath<string[]>({ path: pathExpr, json: json as any, wrap: true, resultType: 'pointer', eval: evalMode });\n\treturn Array.isArray(pointers) ? pointers : [];\n}\n`,
	);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { findJsonPathPointers, readJsonPath } from './index';\n\ndescribe('@jsonpath/compat-jsonpath-plus', () => {\n\tit('reads values and enumerates pointers', () => {\n\t\tconst obj = { a: { b: 1 } };\n\t\texpect(readJsonPath(obj, '$.a.b')).toBe(1);\n\t\texpect(findJsonPathPointers(obj, '$.a.b')).toEqual(['/a/b']);\n\t});\n});\n`,
	);
}

console.log('Wrote initial compat shims');
NODE
```

##### Step 25 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/compat-* -- --passWithNoTests` succeeds.

#### Step 25 STOP & COMMIT

```txt
feat(jsonpath): add initial compat shims

Adds @jsonpath/compat-jsonpath and @jsonpath/compat-jsonpath-plus as initial delegation shims.

completes: step 25 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 26: Conformance corpus + compat harness

- [ ] In `@lellimecnar/jsonpath-conformance`, add a minimal corpus export (documents + query list).
- [ ] In `@lellimecnar/jsonpath-compat-harness`, add tests comparing upstream outputs vs compat shims.
- [ ] Add required deps:

```bash
pnpm --filter @lellimecnar/jsonpath-compat-harness add \
	@lellimecnar/jsonpath-conformance@workspace:* \
	@jsonpath/compat-jsonpath-plus@workspace:* \
	jsonpath-plus
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const repoRoot = process.cwd();

// Conformance corpus
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath-conformance');
	write(
		path.join(pkgDir, 'src', 'corpus.ts'),
		`export type ConformanceDocument = {\n\tname: string;\n\tjson: unknown;\n};\n\nexport type ConformanceCase = {\n\tname: string;\n\tpath: string;\n};\n\nexport const documents: ConformanceDocument[] = [\n\t{ name: 'simple', json: { a: { b: 1 }, xs: [1, 2] } },\n];\n\nexport const cases: ConformanceCase[] = [\n\t{ name: 'child member', path: '$.a.b' },\n\t{ name: 'array wildcard', path: '$.xs[*]' },\n];\n`,
	);
	write(path.join(pkgDir, 'src', 'index.ts'), `export * from './corpus';\n`);
	write(
		path.join(pkgDir, 'src', 'index.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { cases, documents } from './index';\n\ndescribe('@lellimecnar/jsonpath-conformance', () => {\n\tit('exports a minimal corpus', () => {\n\t\texpect(documents.length).toBeGreaterThan(0);\n\t\texpect(cases.length).toBeGreaterThan(0);\n\t});\n});\n`,
	);
}

// Compat harness
{
	const pkgDir = path.join(repoRoot, 'packages', 'jsonpath-compat-harness');
	write(
		path.join(pkgDir, 'src', 'compat.spec.ts'),
		`import { describe, expect, it } from 'vitest';\n\nimport { JSONPath } from 'jsonpath-plus';\n\nimport { documents } from '@lellimecnar/jsonpath-conformance';\nimport { findJsonPathPointers } from '@jsonpath/compat-jsonpath-plus';\n\ndescribe('@lellimecnar/jsonpath-compat-harness', () => {\n\tit('compares pointer enumeration to upstream jsonpath-plus', () => {\n\t\tconst doc = documents.find((d) => d.name === 'simple')!;\n\t\tconst upstream = JSONPath<string[]>({\n\t\t\tpath: '$.a.b',\n\t\t\tjson: doc.json as any,\n\t\t\twrap: true,\n\t\t\tresultType: 'pointer',\n\t\t\teval: 'safe',\n\t\t});\n\t\tconst ours = findJsonPathPointers(doc.json, '$.a.b', 'safe');\n\t\texpect(ours).toEqual(upstream);\n\t});\n});\n`,
	);
}

console.log('Wrote conformance corpus + compat harness');
NODE
```

##### Step 26 Verification Checklist

- [ ] `pnpm -w turbo test --filter @lellimecnar/jsonpath-compat-harness` succeeds.

#### Step 26 STOP & COMMIT

```txt
test(jsonpath): add conformance corpus + compat harness

Adds internal conformance corpus and a harness comparing upstream libraries vs compat shims.

completes: step 26 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 27: CLI package (`@jsonpath/cli`) (JSON-only config)

- [ ] Implement JSON-only config schema and loader (no YAML).
- [ ] Wire a runner to `createRfc9535Engine()`.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/cli add @jsonpath/plugin-rfc-9535@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-cli');

write(path.join(pkgDir, 'bin', 'jsonpath.js'), "#!/usr/bin/env node\nimport '../index.js';\n");

write(
	path.join(pkgDir, 'src', 'config.ts'),
	`export type JsonPathCliConfig = {\n\tpath: string;\n\tjson: unknown;\n\tresultType?: 'value' | 'node' | 'path' | 'pointer' | 'parent';\n};\n\nexport function parseConfig(input: unknown): JsonPathCliConfig {\n\tif (!input || typeof input !== 'object') throw new Error('Config must be an object.');\n\tconst obj = input as any;\n\tif (typeof obj.path !== 'string') throw new Error('Config.path must be a string.');\n\treturn {\n\t\tpath: obj.path,\n\t\tjson: obj.json,\n\t\tresultType: obj.resultType,\n\t};\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'run.ts'),
	`import fs from 'node:fs';\n\nimport { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';\n\nimport { parseConfig } from './config';\n\nexport function runJsonPathCli(configPath: string): unknown[] {\n\tconst raw = fs.readFileSync(configPath, 'utf8');\n\tconst parsed = parseConfig(JSON.parse(raw));\n\n\tconst engine = createRfc9535Engine();\n\tconst compiled = engine.compile(parsed.path);\n\treturn engine.evaluateSync(compiled, parsed.json, { resultType: parsed.resultType });\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`import process from 'node:process';\n\nimport { runJsonPathCli } from './run';\n\nfunction main(): void {\n\tconst configPath = process.argv[2];\n\tif (!configPath) {\n\t\tprocess.stderr.write('Usage: jsonpath <config.json>\\n');\n\t\tprocess.exit(2);\n\t}\n\tconst results = runJsonPathCli(configPath);\n\tprocess.stdout.write(JSON.stringify(results, null, 2) + '\\n');\n}\n\nmain();\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { parseConfig } from './config';\n\ndescribe('@jsonpath/cli', () => {\n\tit('parses a minimal JSON config', () => {\n\t\tconst cfg = parseConfig({ path: '$.a', json: { a: 1 } });\n\t\texpect(cfg.path).toBe('$.a');\n\t\texpect(cfg.json).toEqual({ a: 1 });\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/cli skeleton');
NODE
```

##### Step 27 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/cli` succeeds.
- [ ] `pnpm -w verify:exports` remains green.

#### Step 27 STOP & COMMIT

```txt
feat(jsonpath): add JSON-only CLI package skeleton

Adds @jsonpath/cli with JSON-only config schema + loader and runner wiring.

completes: step 27 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 28: Convenience bundle (`@jsonpath/complete`)

- [ ] Add `@jsonpath/complete` that re-exports `createRfc9535Engine()` and the preset plugin list.
- [ ] Add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/complete add @jsonpath/plugin-rfc-9535@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-complete');

write(path.join(pkgDir, 'src', 'index.ts'), `export { createRfc9535Engine, rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';\n`);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { createRfc9535Engine, rfc9535Plugins } from './index';\n\ndescribe('@jsonpath/complete', () => {\n\tit('re-exports RFC 9535 preset', () => {\n\t\texpect(rfc9535Plugins.length).toBeGreaterThan(5);\n\t\tconst engine = createRfc9535Engine();\n\t\texpect(engine.compile('$.x').expression).toBe('$.x');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/complete');
NODE
```

##### Step 28 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/complete` succeeds.

#### Step 28 STOP & COMMIT

```txt
feat(jsonpath): add @jsonpath/complete convenience bundle

Adds @jsonpath/complete to re-export the RFC 9535 preset engine + plugin list.

completes: step 28 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 29: Security regression coverage (internal)

- [ ] Add a minimal regression test ensuring forbidden pointer segments throw.
- [ ] Add required workspace deps:

```bash
pnpm --filter @lellimecnar/jsonpath-conformance add @jsonpath/pointer@workspace:*
```

- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-conformance');

write(
	path.join(pkgDir, 'src', 'security.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { setByPointer } from '@jsonpath/pointer';\n\ndescribe('security regression: pointer hardening', () => {\n\tit('rejects prototype-pollution segments', () => {\n\t\texpect(() => setByPointer({}, '/__proto__/x', 1)).toThrow();\n\t\texpect(() => setByPointer({}, '/constructor/x', 1)).toThrow();\n\t\texpect(() => setByPointer({}, '/prototype/x', 1)).toThrow();\n\t});\n});\n`,
);

console.log('Added security regression tests');
NODE
```

##### Step 29 Verification Checklist

- [ ] `pnpm -w turbo test --filter @lellimecnar/jsonpath-conformance` succeeds.

#### Step 29 STOP & COMMIT

```txt
test(jsonpath): add security regression tests

Adds internal regression coverage for hardening against prototype pollution.

completes: step 29 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 30: Documentation updates

- [ ] Create `docs/api/jsonpath.md` documenting the new package surfaces and a minimal usage example.
- [ ] Copy and paste code below into `terminal`:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

const filePath = path.join(process.cwd(), 'docs', 'api', 'jsonpath.md');
ensureDir(path.dirname(filePath));

fs.writeFileSync(
	filePath,
	`# JSONPath API\n\nThis document provides an overview of the @jsonpath plugin-first JSONPath packages in this monorepo.\n\n## Overview\n\nThe ecosystem is split into a small framework package (@jsonpath/core) and many wiring-only plugins.\nThe initial implementation focuses on scaffolding and stable public surfaces, not full RFC 9535 semantics.\n\n## Key Packages\n\n- @jsonpath/core: Engine framework (no JSONPath semantics)\n- @jsonpath/plugin-rfc-9535: Preset wiring + createRfc9535Engine()\n- @jsonpath/complete: Convenience re-export bundle\n- @jsonpath/pointer, @jsonpath/patch, @jsonpath/mutate: Pointer/Patch/mutation utilities\n- @jsonpath/plugin-validate + @jsonpath/validator-*: Validation orchestration + adapters\n\n## Example\n\n\`\`\`ts\nimport { createRfc9535Engine } from '@jsonpath/complete';\n\nconst engine = createRfc9535Engine();\nconst compiled = engine.compile('$.a');\nconst results = engine.evaluateSync(compiled, { a: 1 });\nconsole.log(results);\n\`\`\`\n\n## Commands\n\n- Build: pnpm -w turbo build --filter=@jsonpath/*\n- Test: pnpm -w turbo test --filter=@jsonpath/* -- --passWithNoTests\n- Verify exports: pnpm -w verify:exports\n`,
	'utf8',
);

console.log('Wrote docs/api/jsonpath.md');
NODE
```

##### Step 30 Verification Checklist

- [ ] `pnpm -w turbo build --filter=@jsonpath/*` is green.
- [ ] `pnpm -w turbo test --filter @jsonpath/* -- --passWithNoTests` is green.
- [ ] `pnpm -w verify:exports` is green.

#### Step 30 STOP & COMMIT

```txt
docs(jsonpath): add @jsonpath ecosystem API doc

Adds docs/api/jsonpath.md describing the JSONPath packages and how to use the RFC preset.

completes: step 30 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
