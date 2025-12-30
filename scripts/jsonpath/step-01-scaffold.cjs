/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 1)

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
			clean:
				"node -e \"require('node:fs').rmSync('dist', { recursive: true, force: true })\"",
			dev: 'vite build --watch',
			lint: 'eslint .',
			prepack: 'pnpm run build',
			test: 'vitest run',
			'test:coverage': 'vitest run --coverage',
			'test:watch': 'vitest',
			'type-check': 'tsgo --noEmit',
			...(bin
				? {
						postbuild:
							"node -e \"require('node:fs').cpSync('bin', 'dist/bin', { recursive: true })\"",
					}
				: {}),
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
	{
		dir: 'jsonpath/core',
		name: '@jsonpath/core',
		description: 'JSONPath engine framework (plugin-first; no features).',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/ast',
		name: '@jsonpath/ast',
		description: 'Feature-agnostic JSONPath AST node types.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/lexer',
		name: '@jsonpath/lexer',
		description: 'Feature-agnostic JSONPath lexer infrastructure.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/parser',
		name: '@jsonpath/parser',
		description: 'Feature-agnostic JSONPath parser infrastructure.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/printer',
		name: '@jsonpath/printer',
		description: 'Feature-agnostic JSONPath printer infrastructure.',
		privatePkg: false,
	},

	// RFC bundle + feature plugins
	{
		dir: 'jsonpath/plugin-rfc-9535',
		name: '@jsonpath/plugin-rfc-9535',
		description: 'RFC 9535 bundle plugin preset wiring.',
		privatePkg: false,
	},

	// Syntax plugins
	{
		dir: 'jsonpath/plugin-syntax-root',
		name: '@jsonpath/plugin-syntax-root',
		description: 'RFC 9535 root selector syntax plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-syntax-current',
		name: '@jsonpath/plugin-syntax-current',
		description: 'RFC 9535 current selector syntax plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-syntax-child-member',
		name: '@jsonpath/plugin-syntax-child-member',
		description: 'RFC 9535 child member selector syntax plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-syntax-child-index',
		name: '@jsonpath/plugin-syntax-child-index',
		description: 'RFC 9535 child index + slice selector syntax plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-syntax-wildcard',
		name: '@jsonpath/plugin-syntax-wildcard',
		description: 'RFC 9535 wildcard selector syntax plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-syntax-union',
		name: '@jsonpath/plugin-syntax-union',
		description: 'RFC 9535 union selector syntax plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-syntax-descendant',
		name: '@jsonpath/plugin-syntax-descendant',
		description: 'RFC 9535 descendant selector syntax plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-syntax-filter',
		name: '@jsonpath/plugin-syntax-filter',
		description: 'RFC 9535 filter selector container syntax plugin.',
		privatePkg: false,
	},

	// Filter expression plugins
	{
		dir: 'jsonpath/plugin-filter-literals',
		name: '@jsonpath/plugin-filter-literals',
		description: 'RFC 9535 filter literals plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-filter-comparison',
		name: '@jsonpath/plugin-filter-comparison',
		description: 'RFC 9535 filter comparison operators plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-filter-boolean',
		name: '@jsonpath/plugin-filter-boolean',
		description: 'RFC 9535 filter boolean operators plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-filter-existence',
		name: '@jsonpath/plugin-filter-existence',
		description: 'RFC 9535 filter existence semantics plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-filter-functions',
		name: '@jsonpath/plugin-filter-functions',
		description: 'RFC 9535 filter function call plugin.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-filter-regex',
		name: '@jsonpath/plugin-filter-regex',
		description: 'RFC 9535 filter regex wiring plugin (delegates to iregexp).',
		privatePkg: false,
	},

	// RFC functions
	{
		dir: 'jsonpath/plugin-functions-core',
		name: '@jsonpath/plugin-functions-core',
		description: 'RFC 9535 functions core plugin.',
		privatePkg: false,
	},

	// Result views
	{
		dir: 'jsonpath/plugin-result-value',
		name: '@jsonpath/plugin-result-value',
		description: 'Result view: value.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-result-node',
		name: '@jsonpath/plugin-result-node',
		description: 'Result view: node.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-result-path',
		name: '@jsonpath/plugin-result-path',
		description: 'Result view: path.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-result-pointer',
		name: '@jsonpath/plugin-result-pointer',
		description: 'Result view: pointer.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-result-parent',
		name: '@jsonpath/plugin-result-parent',
		description: 'Result view: parent.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-result-types',
		name: '@jsonpath/plugin-result-types',
		description: 'Result view aggregator: types.',
		privatePkg: false,
	},

	// Standards-adjacent
	{
		dir: 'jsonpath/plugin-iregexp',
		name: '@jsonpath/plugin-iregexp',
		description: 'RFC 9485 I-Regexp support plugin.',
		privatePkg: false,
	},

	// Security/tooling
	{
		dir: 'jsonpath/plugin-script-expressions',
		name: '@jsonpath/plugin-script-expressions',
		description: 'SES sandboxed script expressions plugin (opt-in).',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-validate',
		name: '@jsonpath/plugin-validate',
		description: 'Validation orchestration plugin.',
		privatePkg: false,
	},

	// Optional non-RFC extensions
	{
		dir: 'jsonpath/plugin-parent-selector',
		name: '@jsonpath/plugin-parent-selector',
		description: 'Optional extension: parent selector.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-property-name-selector',
		name: '@jsonpath/plugin-property-name-selector',
		description: 'Optional extension: property-name selector.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/plugin-type-selectors',
		name: '@jsonpath/plugin-type-selectors',
		description: 'Optional extension: type selectors.',
		privatePkg: false,
	},

	// Compat
	{
		dir: 'jsonpath/compat-jsonpath',
		name: '@jsonpath/compat-jsonpath',
		description: 'Compatibility adapter for dchester/jsonpath.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/compat-jsonpath-plus',
		name: '@jsonpath/compat-jsonpath-plus',
		description: 'Compatibility adapter for jsonpath-plus.',
		privatePkg: false,
	},

	// Mutation
	{
		dir: 'jsonpath/pointer',
		name: '@jsonpath/pointer',
		description: 'RFC 6901 JSON Pointer helpers (hardened).',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/patch',
		name: '@jsonpath/patch',
		description: 'RFC 6902 JSON Patch helpers (hardened).',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/mutate',
		name: '@jsonpath/mutate',
		description: 'Mutation utilities built on pointers/patch.',
		privatePkg: false,
	},

	// Validators
	{
		dir: 'jsonpath/validator-json-schema',
		name: '@jsonpath/validator-json-schema',
		description: 'JSON Schema validator adapter (Ajv).',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/validator-zod',
		name: '@jsonpath/validator-zod',
		description: 'Zod validator adapter.',
		privatePkg: false,
	},
	{
		dir: 'jsonpath/validator-yup',
		name: '@jsonpath/validator-yup',
		description: 'Yup validator adapter.',
		privatePkg: false,
	},

	// CLI + bundle
	{
		dir: 'jsonpath/cli',
		name: '@jsonpath/cli',
		description: 'JSONPath CLI (JSON config only).',
		privatePkg: false,
		bin: { jsonpath: './dist/bin/jsonpath.js' },
	},
	{
		dir: 'jsonpath/complete',
		name: '@jsonpath/complete',
		description: 'Convenience bundle (wiring only).',
		privatePkg: false,
	},

	// Internal (NOT published)
	{
		dir: 'jsonpath/compat-harness',
		name: '@lellimecnar/jsonpath-compat-harness',
		description:
			'Internal: compares upstream jsonpath/jsonpath-plus vs @jsonpath compat.',
		privatePkg: true,
	},
	{
		dir: 'jsonpath/conformance',
		name: '@lellimecnar/jsonpath-conformance',
		description: 'Internal: conformance corpus fixtures + helpers.',
		privatePkg: true,
	},
];

for (const p of packages) {
	const pkgDir = path.join(repoRoot, 'packages', p.dir);
	ensureDir(pkgDir);

	const pkgJson = buildPackageJson({
		name: p.name,
		description: p.description,
		privatePkg: p.privatePkg,
		bin: p.bin,
		dependencies: {
			...(p.name === '@jsonpath/core'
				? {
						'@jsonpath/ast': 'workspace:*',
						'@jsonpath/lexer': 'workspace:*',
						'@jsonpath/parser': 'workspace:*',
					}
				: {}),
		},
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
		writeFile(
			path.join(pkgDir, 'bin', 'jsonpath.js'),
			"#!/usr/bin/env node\nimport '../index.js';\n",
		);
	}
}

console.log(`Scaffolded ${packages.length} packages under packages/jsonpath/`);
