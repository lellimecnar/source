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
 * Directory names remain flat under packages/ so pnpm-workspace.yaml already includes them.
 */
const packages = [
	// Framework
	{ dir: 'jsonpath-core', name: '@jsonpath/core', description: 'JSONPath engine framework (plugin-first; no features).', privatePkg: false },
	{ dir: 'jsonpath-ast', name: '@jsonpath/ast', description: 'Feature-agnostic JSONPath AST node types.', privatePkg: false },
	{ dir: 'jsonpath-lexer', name: '@jsonpath/lexer', description: 'Feature-agnostic JSONPath lexer infrastructure.', privatePkg: false },
	{ dir: 'jsonpath-parser', name: '@jsonpath/parser', description: 'Feature-agnostic JSONPath parser infrastructure.', privatePkg: false },
	{ dir: 'jsonpath-printer', name: '@jsonpath/printer', description: 'Feature-agnostic JSONPath printer infrastructure.', privatePkg: false },

	// RFC bundle + feature plugins
	{ dir: 'jsonpath-plugin-rfc-9535', name: '@jsonpath/plugin-rfc-9535', description: 'RFC 9535 bundle plugin preset wiring.', privatePkg: false },

	// Syntax plugins
	{ dir: 'jsonpath-plugin-syntax-root', name: '@jsonpath/plugin-syntax-root', description: 'RFC 9535 root selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-syntax-current', name: '@jsonpath/plugin-syntax-current', description: 'RFC 9535 current selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-syntax-child-member', name: '@jsonpath/plugin-syntax-child-member', description: 'RFC 9535 child member selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-syntax-child-index', name: '@jsonpath/plugin-syntax-child-index', description: 'RFC 9535 child index + slice selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-syntax-wildcard', name: '@jsonpath/plugin-syntax-wildcard', description: 'RFC 9535 wildcard selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-syntax-union', name: '@jsonpath/plugin-syntax-union', description: 'RFC 9535 union selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-syntax-descendant', name: '@jsonpath/plugin-syntax-descendant', description: 'RFC 9535 descendant selector syntax plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-syntax-filter', name: '@jsonpath/plugin-syntax-filter', description: 'RFC 9535 filter selector container syntax plugin.', privatePkg: false },

	// Filter expression plugins
	{ dir: 'jsonpath-plugin-filter-literals', name: '@jsonpath/plugin-filter-literals', description: 'RFC 9535 filter literals plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-filter-comparison', name: '@jsonpath/plugin-filter-comparison', description: 'RFC 9535 filter comparison operators plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-filter-boolean', name: '@jsonpath/plugin-filter-boolean', description: 'RFC 9535 filter boolean operators plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-filter-existence', name: '@jsonpath/plugin-filter-existence', description: 'RFC 9535 filter existence semantics plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-filter-functions', name: '@jsonpath/plugin-filter-functions', description: 'RFC 9535 filter function call plugin.', privatePkg: false },
	{ dir: 'jsonpath-plugin-filter-regex', name: '@jsonpath/plugin-filter-regex', description: 'RFC 9535 filter regex wiring plugin (delegates to iregexp).', privatePkg: false },

	// RFC functions
	{ dir: 'jsonpath-plugin-functions-core', name: '@jsonpath/plugin-functions-core', description: 'RFC 9535 functions core plugin.', privatePkg: false },

	// Result views
	{ dir: 'jsonpath-plugin-result-value', name: '@jsonpath/plugin-result-value', description: 'Result view: value.', privatePkg: false },
	{ dir: 'jsonpath-plugin-result-node', name: '@jsonpath/plugin-result-node', description: 'Result view: node.', privatePkg: false },
	{ dir: 'jsonpath-plugin-result-path', name: '@jsonpath/plugin-result-path', description: 'Result view: path.', privatePkg: false },
	{ dir: 'jsonpath-plugin-result-pointer', name: '@jsonpath/plugin-result-pointer', description: 'Result view: pointer.', privatePkg: false },
	{ dir: 'jsonpath-plugin-result-parent', name: '@jsonpath/plugin-result-parent', description: 'Result view: parent.', privatePkg: false },
	{ dir: 'jsonpath-plugin-result-types', name: '@jsonpath/plugin-result-types', description: 'Result view aggregator: types.', privatePkg: false },

	// Standards-adjacent
	{ dir: 'jsonpath-plugin-iregexp', name: '@jsonpath/plugin-iregexp', description: 'RFC 9485 I-Regexp support plugin.', privatePkg: false },

	// Security/tooling
	{ dir: 'jsonpath-plugin-script-expressions', name: '@jsonpath/plugin-script-expressions', description: 'SES sandboxed script expressions plugin (opt-in).', privatePkg: false },
	{ dir: 'jsonpath-plugin-validate', name: '@jsonpath/plugin-validate', description: 'Validation orchestration plugin.', privatePkg: false },

	// Optional non-RFC extensions
	{ dir: 'jsonpath-plugin-parent-selector', name: '@jsonpath/plugin-parent-selector', description: 'Optional extension: parent selector.', privatePkg: false },
	{ dir: 'jsonpath-plugin-property-name-selector', name: '@jsonpath/plugin-property-name-selector', description: 'Optional extension: property-name selector.', privatePkg: false },
	{ dir: 'jsonpath-plugin-type-selectors', name: '@jsonpath/plugin-type-selectors', description: 'Optional extension: type selectors.', privatePkg: false },

	// Compat
	{ dir: 'jsonpath-compat-jsonpath', name: '@jsonpath/compat-jsonpath', description: 'Compatibility adapter for dchester/jsonpath.', privatePkg: false },
	{ dir: 'jsonpath-compat-jsonpath-plus', name: '@jsonpath/compat-jsonpath-plus', description: 'Compatibility adapter for jsonpath-plus.', privatePkg: false },

	// Mutation
	{ dir: 'jsonpath-pointer', name: '@jsonpath/pointer', description: 'RFC 6901 JSON Pointer helpers (hardened).', privatePkg: false },
	{ dir: 'jsonpath-patch', name: '@jsonpath/patch', description: 'RFC 6902 JSON Patch helpers (hardened).', privatePkg: false },
	{ dir: 'jsonpath-mutate', name: '@jsonpath/mutate', description: 'Mutation utilities built on pointers/patch.', privatePkg: false },

	// Validators
	{ dir: 'jsonpath-validator-json-schema', name: '@jsonpath/validator-json-schema', description: 'JSON Schema validator adapter (Ajv).', privatePkg: false },
	{ dir: 'jsonpath-validator-zod', name: '@jsonpath/validator-zod', description: 'Zod validator adapter.', privatePkg: false },
	{ dir: 'jsonpath-validator-yup', name: '@jsonpath/validator-yup', description: 'Yup validator adapter.', privatePkg: false },

	// CLI + bundle
	{ dir: 'jsonpath-cli', name: '@jsonpath/cli', description: 'JSONPath CLI (JSON config only).', privatePkg: false, bin: { jsonpath: './dist/bin/jsonpath.js' } },
	{ dir: 'jsonpath-complete', name: '@jsonpath/complete', description: 'Convenience bundle (wiring only).', privatePkg: false },

	// Internal (NOT published)
	{ dir: 'jsonpath-compat-harness', name: '@lellimecnar/jsonpath-compat-harness', description: 'Internal: compares upstream jsonpath/jsonpath-plus vs @jsonpath compat.', privatePkg: true },
	{ dir: 'jsonpath-conformance', name: '@lellimecnar/jsonpath-conformance', description: 'Internal: conformance corpus fixtures + helpers.', privatePkg: true },
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

console.log(`Scaffolded ${packages.length} packages under packages/`);
NODE
```

##### Step 1 Verification Checklist

- [ ] `pnpm -w turbo build --filter=@jsonpath/*` succeeds.
- [ ] `pnpm -w test --filter=@jsonpath/* -- --passWithNoTests` succeeds.
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

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-core');

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

- [ ] `pnpm --filter @jsonpath/core test` succeeds.

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

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-core');

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

- [ ] `pnpm --filter @jsonpath/core test` succeeds.

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

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-ast');

write(path.join(pkgDir, 'src', 'nodes.ts'), `export type AstNodeBase<TKind extends string> = {\n\tkind: TKind;\n};\n\nexport type JsonPathAst = PathNode;\n\nexport type PathNode = AstNodeBase<'Path'> & {\n\tsegments: SegmentNode[];\n};\n\nexport type SegmentNode = AstNodeBase<'Segment'> & {\n\tselectors: SelectorNode[];\n};\n\nexport type SelectorNode = AstNodeBase<string> & Record<string, unknown>;\n\nexport function path(segments: SegmentNode[]): PathNode {\n\treturn { kind: 'Path', segments };\n}\n\nexport function segment(selectors: SelectorNode[]): SegmentNode {\n\treturn { kind: 'Segment', selectors };\n}\n`);

write(path.join(pkgDir, 'src', 'visitor.ts'), `import type { PathNode, SegmentNode, SelectorNode } from './nodes';\n\nexport type Visitor = {\n\tPath?: (node: PathNode) => void;\n\tSegment?: (node: SegmentNode) => void;\n\tSelector?: (node: SelectorNode) => void;\n};\n\nexport function visitPath(node: PathNode, visitor: Visitor): void {\n\tvisitor.Path?.(node);\n\tfor (const seg of node.segments) {\n\t\tvisitor.Segment?.(seg);\n\t\tfor (const sel of seg.selectors) visitor.Selector?.(sel);\n\t}\n}\n`);

write(path.join(pkgDir, 'src', 'printable.ts'), `import type { JsonPathAst } from './nodes';\n\nexport type PrintableAst = {\n\tast: JsonPathAst;\n};\n\nexport function printable(ast: JsonPathAst): PrintableAst {\n\treturn { ast };\n}\n`);

write(path.join(pkgDir, 'src', 'index.ts'), `export * from './nodes';\nexport * from './visitor';\nexport * from './printable';\n`);

write(path.join(pkgDir, 'src', 'nodes.spec.ts'), `import { describe, expect, it } from 'vitest';\n\nimport { path, segment } from './nodes';\n\ndescribe('@jsonpath/ast', () => {\n\tit('constructs a basic AST', () => {\n\t\tconst ast = path([segment([{ kind: 'Root' }])]);\n\t\texpect(ast.kind).toBe('Path');\n\t\texpect(ast.segments).toHaveLength(1);\n\t});\n});\n`);

console.log('Wrote @jsonpath/ast');
NODE
```

##### Step 4 Verification Checklist

- [ ] `pnpm --filter @jsonpath/ast test` succeeds.

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

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-lexer');

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

- [ ] `pnpm --filter @jsonpath/lexer test` succeeds.

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

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-parser');

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

- [ ] `pnpm --filter @jsonpath/parser test` succeeds.

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

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-printer');

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

- [ ] `pnpm --filter @jsonpath/printer test` succeeds.

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

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-core');

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

- [ ] `pnpm --filter @jsonpath/core test` succeeds.

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

##### Step 9 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/plugin-syntax-root --filter @jsonpath/plugin-syntax-current --filter @jsonpath/plugin-syntax-child-member --filter @jsonpath/plugin-syntax-wildcard` succeeds.

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

##### Step 10 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/plugin-syntax-child-index --filter @jsonpath/plugin-syntax-union` succeeds.

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

##### Step 11 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/plugin-syntax-descendant --filter @jsonpath/plugin-syntax-filter` succeeds.

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

##### Step 12 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/plugin-filter-literals --filter @jsonpath/plugin-filter-boolean --filter @jsonpath/plugin-filter-comparison` succeeds.

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

##### Step 13 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/plugin-filter-existence --filter @jsonpath/plugin-functions-core --filter @jsonpath/plugin-filter-functions --filter @jsonpath/plugin-iregexp --filter @jsonpath/plugin-filter-regex` succeeds.

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

##### Step 14 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-functions-core test` succeeds.

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

##### Step 15 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/plugin-result-* -- --passWithNoTests` succeeds.

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

##### Step 16 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-iregexp test` succeeds.

#### Step 16 STOP & COMMIT

```txt
feat(jsonpath): add i-regexp plugin baseline

Adds @jsonpath/plugin-iregexp baseline matcher helper + plugin metadata.

completes: step 16 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 17: RFC 9535 preset bundle (`@jsonpath/plugin-rfc-9535`)

- [ ] Add deps on all RFC syntax/filter/function/result plugins.
- [ ] Implement `rfc9535Plugins` array and `createRfc9535Engine()` that calls `createEngine({ plugins: rfc9535Plugins })`.
- [ ] Add unit tests verifying it creates an engine.

##### Step 17 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-rfc-9535 test` succeeds.

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

##### Step 18 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-script-expressions test` succeeds.

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

##### Step 19 Verification Checklist

- [ ] `pnpm --filter @jsonpath/pointer test` succeeds.

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

##### Step 20 Verification Checklist

- [ ] `pnpm --filter @jsonpath/patch test` succeeds.

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

##### Step 21 Verification Checklist

- [ ] `pnpm --filter @jsonpath/mutate test` succeeds.

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

##### Step 22 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-validate test` succeeds.

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

##### Step 23 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/validator-* -- --passWithNoTests` succeeds.

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

##### Step 24 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/plugin-parent-selector --filter @jsonpath/plugin-property-name-selector --filter @jsonpath/plugin-type-selectors` succeeds.

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

##### Step 25 Verification Checklist

- [ ] `pnpm -w test --filter @jsonpath/compat-* -- --passWithNoTests` succeeds.

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

##### Step 26 Verification Checklist

- [ ] `pnpm --filter @lellimecnar/jsonpath-compat-harness test` succeeds.

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

##### Step 27 Verification Checklist

- [ ] `pnpm --filter @jsonpath/cli test` succeeds.
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

##### Step 28 Verification Checklist

- [ ] `pnpm --filter @jsonpath/complete test` succeeds.

#### Step 28 STOP & COMMIT

```txt
feat(jsonpath): add @jsonpath/complete convenience bundle

Adds @jsonpath/complete to re-export the RFC 9535 preset engine + plugin list.

completes: step 28 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 29: Security regression coverage (internal)

- [ ] Add a minimal regression test ensuring forbidden pointer segments throw.

##### Step 29 Verification Checklist

- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test` succeeds.

#### Step 29 STOP & COMMIT

```txt
test(jsonpath): add security regression tests

Adds internal regression coverage for hardening against prototype pollution.

completes: step 29 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 30: Documentation updates

- [ ] Create `docs/api/jsonpath.md` documenting the new package surfaces and a minimal usage example.

##### Step 30 Verification Checklist

- [ ] `pnpm -w turbo build --filter=@jsonpath/*` is green.
- [ ] `pnpm -w test --filter @jsonpath/* -- --passWithNoTests` is green.
- [ ] `pnpm -w verify:exports` is green.

#### Step 30 STOP & COMMIT

```txt
docs(jsonpath): add @jsonpath ecosystem API doc

Adds docs/api/jsonpath.md describing the JSONPath packages and how to use the RFC preset.

completes: step 30 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
