<!-- markdownlint-disable-file -->

# Task Research Notes: jsonpath implementation plan support

## Research Executed

### File Analysis

- package.json
  - Monorepo scripts (`turbo build/test/type-check`) and toolchain versions: Node `^24.12.0`, pnpm `9.12.2`, TypeScript `~5.5`, Vite `^7.3.0`, Vitest `^4.0.16`, `vite-plugin-dts` `^4.5.4`, `vite-tsconfig-paths` `^6.0.3`.

- vitest.config.ts
  - Root Vitest uses `test.projects` globs to run per-workspace `vitest.config.ts` files (packages, card-stack, ui-spec, web).

- scripts/node/verify-dist-exports.mjs
  - Validates that any `package.json` `main`, `types`, and `exports` targets pointing at `./dist/*` actually exist on disk; used by root script `verify:exports`.

- packages/config-vite/base.ts
  - Shared Vite base config: adds `vite-tsconfig-paths` plugin and sets `build.emptyOutDir: true`.

- packages/config-vite/node.ts
  - Node build config composes `viteBaseConfig()`; packages can override target/externalization.

- packages/config-vite/browser.ts
  - Browser build config composes `viteBaseConfig()`.

- packages/config-vitest/base.ts
  - Shared Vitest base config: `globals: true`, `passWithNoTests: true`, coverage via `@vitest/coverage-v8`, and shared `setupFiles` (`setup/reflect-metadata.ts`).

- packages/config-vitest/browser.ts
  - `vitestBrowserConfigHappyDom()` uses `happy-dom`, extends `setupFiles` with `setup/testing-library.ts`.
  - `vitestBrowserConfigHappyDomNextAppRouter()` further extends `setupFiles` with `setup/next-app-router.ts`.

- packages/config-vitest/browser-jsdom.ts
  - `vitestBrowserConfigJsdom()` swaps environment to `jsdom` while preserving the happy-dom baseline config.

- packages/polymix/vite.config.ts
  - Representative library build: `build.lib.entry = 'src/index.ts'`, format `es`, output `preserveModules: true`, `preserveModulesRoot: 'src'`, `entryFileNames: '[name].js'`.
  - Types via `vite-plugin-dts` with `entryRoot: 'src'`, `tsconfigPath: 'tsconfig.json'`, `outDir: 'dist'`.
  - Externalization: `node:` builtins + `dependencies`/`peerDependencies` (incl deep imports `dep/*`).

- packages/polymix/package.json
  - ESM library publishing: `type: "module"`, `exports` points to `./dist/index.js` and `./dist/index.d.ts`, `files: ["dist"]`, `prepack` runs build.

- packages/ui-spec/cli/package.json
  - CLI `bin` points at `./dist/bin/uispec.js`.
  - `postbuild` copies `bin/` into `dist/bin/` to satisfy the bin entry.

- packages/ui-spec/core/src/bindings/jsonpath.ts
  - Existing JSON traversal utilities:
    - JSONPath read helper based on `jsonpath-plus`.
    - JSONPath “pointer” enumeration (via `resultType: 'pointer'`).
    - JSON Pointer get/set/remove helpers with `~0`/`~1` decoding.

### Code Search Results

- "\"bin\"\\s\*:"
  - 1 match: packages/ui-spec/cli/package.json

- postbuild|prepack|copy|cp
  - `prepack` pattern: packages/polymix/package.json
  - CLI bin copy pattern: packages/ui-spec/cli/package.json (`postbuild` copies `bin` → `dist/bin`)

- viteNodeConfig\(|@lellimecnar/vite-config/node
  - Matches in many packages’ `vite.config.ts`, including card-stack, utils, ui-spec packages, and polymix (shared pattern).

### External Research

- #fetch:https://vite.dev/guide/build.html#library-mode
  - Library mode uses `build.lib` and recommends externalizing deps you don’t want bundled (example external `['vue']`).
  - Library mode produces `es`+`umd` for single entry, and `es`+`cjs` for multiple entries.

- #fetch:https://rollupjs.org/configuration-options/#output-preservemodules
  - `output.preserveModules`: creates separate chunks for all modules using original module names; requires `output.dir`; tree-shaking still applies; can emit plugin “virtual” files as real output.

- #fetch:https://rollupjs.org/configuration-options/#output-preservemodulesroot
  - `output.preserveModulesRoot`: strips a directory prefix from output paths when `preserveModules` is enabled; explicitly called out as useful in monorepos and when non-externalized third-party modules affect output structure.

- #fetch:https://vitest.dev/guide/workspace
  - “Workspace” is deprecated in favor of `test.projects` (functionally the same).
  - Root config with `test.projects` can be glob patterns or inline configs.
  - Project configs don’t inherit root config unless `extends: true` is used; some options are root-only (notably `coverage`, `reporters`).

- #fetch:https://vitest.dev/config/projects.html#projects
  - `projects` is an array of project configurations (default `[]`), each representing a Vitest project.

- #fetch:https://github.com/qmhc/unplugin-dts
  - `vite-plugin-dts` is the legacy Vite-only package; the project recommends `unplugin-dts` going forward.
  - The plugin supports `entryRoot`, `outDir`, and `tsconfigPath`; `entryRoot` is called out as useful for monorepos.

- #fetch:https://drager.github.io/wasm-pack/book/commands/build.html
  - `wasm-pack build` generates a `pkg` directory by default; supports `--out-dir`, `--out-name`.
  - `--target` customizes JS output and wasm loading; includes targets `bundler` (default), `nodejs`, `web`, `no-modules`, `deno`.

- #fetch:https://drager.github.io/wasm-pack/book/commands/new.html
  - `wasm-pack new <name>` creates a project using `cargo-generate`, supports `--template` and `--mode`.

- #fetch:https://drager.github.io/wasm-pack/book/commands/test.html
  - `wasm-pack test` can run tests across environments (node and browsers), supports `--headless`.

- #fetch:https://drager.github.io/wasm-pack/book/commands/pack-and-publish.html
  - `pack`/`publish` operate on the `pkg` directory; `pack` creates a tarball and `publish` publishes to npm; uses `npm pack`/`npm publish` under the hood; supports `publish --tag`.

- #fetch:https://rustwasm.github.io/docs/wasm-pack/
  - Confirms rustwasm.github.io domain docs are no longer maintained and directs readers to drager.github.io.

- #fetch:https://github.com/endojs/endo/blob/master/packages/ses/README.md
  - SES introduces `lockdown()` to tamper-proof intrinsics and reduce cross-program interference.
  - `harden()` recursively freezes an object graph surface.
  - `Compartment` provides a separate evaluation environment with its own `globalThis` and module system.

### Project Conventions

- Standards referenced: pnpm workspaces + Turborepo; per-package Vite library builds; per-package Vitest configs aggregated via root `test.projects`; ESM package publishing with granular `exports` and `files: ["dist"]`.
- Instructions followed: repository workspace rules in AGENTS.md and .github/copilot-instructions.md; Task Researcher constraints (research-only, write only under `.copilot-tracking/research/`).

## Key Discoveries

### Project Structure

- Libraries are built with Vite in “library mode” patterns, producing ESM output to `dist/` while preserving module structure (`preserveModules`) to keep stable file-level imports.
- Tests are configured per package, aggregated from root via `vitest.config.ts` using `test.projects` globs.
- Published packages rely on `package.json` `exports` pointing into `./dist/*`, and the repo enforces that with `scripts/node/verify-dist-exports.mjs`.
- CLI packages use `bin` pointing to `dist/bin/*` and copy runtime bin shims into dist in `postbuild`.

### Implementation Patterns

- **Vite library builds (Node)**
  - Shared config entry-point: `@lellimecnar/vite-config/node` → `viteNodeConfig()` (composes `viteBaseConfig()`).
  - Package-specific `vite.config.ts` adds:
    - `vite-plugin-dts` configured with `entryRoot: 'src'` and `outDir: 'dist'`.
    - Rollup output with `preserveModules: true` and `preserveModulesRoot: 'src'`.
    - Externalization function: `node:` builtins + all `dependencies` and `peerDependencies` (including deep imports).

- **Vitest multi-project**
  - Root config uses `test.projects` globs.
  - Shared config entry-point: `@lellimecnar/vitest-config` and its browser variants.
  - Coverage is configured in the shared base config (monorepo-wide behavior).

- **JSON traversal utilities already exist**
  - `packages/ui-spec/core/src/bindings/jsonpath.ts` provides a ready-made set of JSONPath + JSON Pointer utilities.
  - JSONPath uses `jsonpath-plus` with configurable `eval` mode (`safe` by default).

### Complete Examples

```ts
// Representative library build pattern (from packages/polymix/vite.config.ts)
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
			lib: { entry: 'src/index.ts', formats: ['es'] },
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
```

### API and Schema Documentation

- **Vite “Library Mode”**: `build.lib` for libraries, and explicitly recommends externalizing dependencies (example shows `rollupOptions.external: ['vue']`). See: https://vite.dev/guide/build.html#library-mode
- **Rollup preserved-module output**:
  - `output.preserveModules` creates per-module output chunks and still tree-shakes. See: https://rollupjs.org/configuration-options/#output-preservemodules
  - `output.preserveModulesRoot` strips a directory prefix and is described as useful for monorepos. See: https://rollupjs.org/configuration-options/#output-preservemodulesroot
- **Vitest projects**: “workspace” deprecated in favor of `test.projects` (same concept). See: https://vitest.dev/guide/workspace

### Configuration Examples

```ts
// Root Vitest multi-project setup (from vitest.config.ts)
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			'packages/*/vitest.config.ts',
			'packages/card-stack/*/vitest.config.ts',
			'packages/ui-spec/*/vitest.config.ts',
			'web/*/vitest.config.ts',
		],
	},
});
```

```json
// CLI bin + postbuild dist-copy (from packages/ui-spec/cli/package.json)
{
	"bin": {
		"uispec": "./dist/bin/uispec.js"
	},
	"scripts": {
		"build": "vite build",
		"postbuild": "node -e \"require('node:fs').cpSync('bin', 'dist/bin', { recursive: true })\""
	}
}
```

### Technical Requirements

- Node engine: `^24.12.0` (root `package.json`)
- pnpm: `9.12.2` (root `package.json` `packageManager`)
- TypeScript: `~5.5`
- Vite: `^7.3.0` for library builds
- Vitest: `^4.0.16` for tests, with multi-project via `test.projects`
- `vite-tsconfig-paths` used in shared base configs for both Vite and Vitest

## Recommended Approach

Build any new JSONPath-focused library/CLI in this monorepo by following the established Vite+Vitest+exports conventions:

- Use Vite “library mode” style config with Rollup output `preserveModules: true` + `preserveModulesRoot: 'src'` to keep stable per-module output and align with the repo’s dist structure.
- Generate types into `dist/` with `vite-plugin-dts` configured with `entryRoot: 'src'` and `outDir: 'dist'` (matching existing packages).
- Externalize all runtime deps (and peers) using the existing pattern: treat `node:` builtins as external and externalize `dependencies` + `peerDependencies` including deep imports.
- If a CLI is needed, keep the runtime shim under `bin/` and copy it into `dist/bin` during `postbuild`, with `package.json` `bin` pointing to `./dist/bin/<name>.js`.
- Reuse the existing JSONPath + JSON Pointer helpers in `packages/ui-spec/core/src/bindings/jsonpath.ts` as the starting point for JSON traversal behavior (it already supports:
  - JSONPath evaluation with `jsonpath-plus`;
  - pointer discovery via JSONPath resultType `pointer`;
  - pointer get/set/remove utilities).

## Implementation Guidance

- **Objectives**: Provide JSONPath evaluation and/or pointer-based traversal that matches repo conventions for packaging, exports, tests, and generated types.
- **Key Tasks**: Create package scaffold with Vite config matching preserveModules + dts; add `exports` → `./dist/*`; wire Vitest config (project-level) into root projects glob; run export verification via `pnpm verify:exports`.
- **Dependencies**: `@lellimecnar/vite-config` (node/browser), `@lellimecnar/vitest-config`, `vite-plugin-dts`, and any JSONPath runtime library (existing usage suggests `jsonpath-plus`).
- **Success Criteria**: `vite build` outputs correct `dist/` structure; `verify:exports` passes; `vitest` runs under root `test.projects`; types are emitted to `dist/` and referenced by `package.json`.
