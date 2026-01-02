<!-- markdownlint-disable-file -->

# Task Research Notes: UI-Spec packages under `packages/ui-spec/*`

## Research Executed

### File Analysis

- `plans/ui-spec/plan.md`
  - Defines target packages (`@ui-spec/core`, `@ui-spec/react`, optional `@ui-spec/adapter-shadcn`) and mandates: `json-p3` JSONPath reads, RFC 6902 JSON Patch mutations via `store.patch([...])`, no embedded function strings (no UIScript), and Vitest + `happy-dom` for tests.
- `spec/design-ui-spec-json-p3.md`
  - Normative requirements for JSONPath (RFC 9535) and JSON Patch (RFC 6902) usage.
- `spec/spec-architecture-ui-spec-packages.md`
  - Normative package taxonomy, dependency direction rules, and cross-cutting JSONPath/JSON Patch rules.
- `plan/architecture-ui-spec-core-1.md`, `plan/architecture-ui-spec-1.md`
  - Implementation tasks and required error prefixes for core store + wrapper boundary around `json-p3`.
- `specs/ui-spec.md`
  - Full UI-Spec design doc; confirms `json-p3` requirement; covers broader features (routing, validation, UIScript) that are explicitly out-of-scope for the initial UI-Spec packages plan.

- `packages/utils/package.json`
  - Representative “publishable TS library package” fields + scripts.
- `packages/utils/vite.config.ts`
  - Canonical Vite library build pattern: `viteNodeConfig()` + `vite-plugin-dts`, `preserveModules`, externalize deps/peerDeps.
- `packages/utils/vitest.config.ts`
  - Canonical Vitest base config consumption via `@lellimecnar/vitest-config`.
- `packages/utils/tsconfig.json`
  - Canonical TS package config extending `@lellimecnar/typescript-config/react.json` with `module=ESNext`, `moduleResolution=Bundler`, path alias `@/*`.
- `packages/utils/.eslintrc.cjs`
  - Canonical package ESLint wiring using `@lellimecnar/eslint-config` + `parserOptions.project`.

- `packages/config-vitest/{base.ts,browser.ts,setup/testing-library.ts,package.json}`
  - Shared Vitest config package; browser preset uses `happy-dom`; shared Testing Library setup loads `@testing-library/jest-dom/vitest` and auto-cleanup.

- `packages/ui/{package.json,vitest.config.ts}`
  - Shows `happy-dom` + Testing Library deps and uses `vitestBrowserConfigHappyDom()`.

- `packages/card-stack/core/{package.json,vite.config.ts,vitest.config.ts}` and `packages/polymix/{package.json,vite.config.ts,vitest.config.ts}`
  - Confirms the same Vite/Vitest patterns as `packages/utils` for TS library packages.

- `package.json`, `turbo.json`
  - Confirms repo-level commands: `turbo build`, `turbo test`, `turbo type-check`, and per-workspace execution via `pnpm --filter`.

### Code Search Results

- `json-p3`
  - Matches found only in documentation/plans/specs (no implementation code); no matches in `pnpm-lock.yaml`.
- `happy-dom`
  - Used by `@lellimecnar/vitest-config/browser` and installed in `packages/ui` and web apps.
- `@testing-library/*`
  - Centralized setup exists in `packages/config-vitest/setup/testing-library.ts`.
- `@lellimecnar/vitest-config`
  - Widely used across packages for consistent Vitest setup.
- `@lellimecnar/eslint-config`
  - Used in root and per-package ESLint configs.

### External Research

- Not executed (request was repo-specific; no external docs were fetched).

### Project Conventions

- Standards referenced: workspace `pnpm + turborepo`, granular exports for `@lellimecnar/ui`, shared configs in `packages/config-*`.
- Instructions followed: workspace `AGENTS.md` + repository Copilot instructions (tooling + workspace conventions).

## Key Discoveries

### Project Structure

- The monorepo already declares `packages/ui-spec/*` as a workspace in the root `package.json` (`workspaces` array includes `"packages/ui-spec/*"`).
- TS library packages generally follow a consistent pattern:
  - ESM (`"type": "module"`)
  - `exports["."]` pointing to `dist/index.js` + `dist/index.d.ts`
  - Build via Vite library build (ES output) + `vite-plugin-dts`
  - Tests via Vitest and shared config package
  - Lint via `eslint .` using `@lellimecnar/eslint-config`
  - Type-check via `tsgo --noEmit`

### Implementation Patterns

#### Pattern: `package.json` for publishable TS library

Representative snippet from `packages/utils/package.json`:

```json
{
	"name": "@lellimecnar/utils",
	"version": "0.1.0",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"scripts": {
		"build": "vite build",
		"lint": "eslint .",
		"type-check": "tsgo --noEmit"
	}
}
```

Additional package scripts with tests (representative from `packages/card-stack/core/package.json`):

```json
{
	"scripts": {
		"build": "vite build",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	}
}
```

Notes:

- `packages/polymix/package.json` adds a `clean` step and `prepack` for publishing, but still uses the same underlying `vite build` + `vitest` + `tsgo` conventions.

#### Pattern: TS package `tsconfig.json`

Representative snippet from `packages/utils/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/react.json",
	"compilerOptions": {
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"paths": {
			"*": ["./*"],
			"@/*": ["./src/*"],
		},
	},
	"include": ["src/**/*.ts", "src/**/*.mts"],
	"exclude": ["dist", "build", "node_modules"],
}
```

UI/component packages extend the same base but include TSX and sometimes extra root-level patterns (representative from `packages/ui/tsconfig.json`).

#### Pattern: Vite library build config for TS packages

Canonical pattern (identical across `packages/utils`, `packages/card-stack/core`, `packages/polymix`):

```ts
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
			dts({ entryRoot: 'src', tsconfigPath: 'tsconfig.json', outDir: 'dist' }),
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

Key implications for `packages/ui-spec/*`:

- Externalize all `dependencies` + `peerDependencies` so consumers don’t get bundled React/framework deps.
- `preserveModules` keeps stable per-file exports and improves tree-shaking.

#### Pattern: Vitest config and happy-dom usage

Node/base preset usage (representative from `packages/utils/vitest.config.ts`):

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
export default defineConfig(vitestBaseConfig());
```

Browser preset uses `happy-dom` (from `packages/config-vitest/browser.ts`):

```ts
export function vitestBrowserConfigHappyDom(): ViteUserConfig {
	const base = vitestBaseConfig();
	return {
		...base,
		test: {
			...base.test,
			environment: 'happy-dom',
			setupFiles: [
				...(base.test?.setupFiles ?? []),
				resolveLocalFile('./setup/testing-library.ts'),
			],
		},
	};
}
```

Concrete usage in UI package (from `packages/ui/vitest.config.ts`):

```ts
import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';
const base = vitestBrowserConfigHappyDom();
export default defineConfig({
	...base,
	resolve: { alias: { '@/': new URL('./src/', import.meta.url).pathname } },
});
```

Next.js apps use the Next App Router preset (representative from `web/miller.pub/vitest.config.ts`):

```ts
import { vitestBrowserConfigHappyDomNextAppRouter } from '@lellimecnar/vitest-config/browser';
const base = vitestBrowserConfigHappyDomNextAppRouter();
export default defineConfig({ ...base, resolve: { alias: { '@/': ... } } });
```

#### Pattern: Testing Library setup (React + happy-dom)

Central setup file (from `packages/config-vitest/setup/testing-library.ts`):

```ts
import { createRequire } from 'node:module';
import { afterEach } from 'vitest';

try {
	const require = createRequire(import.meta.url);
	require('@testing-library/jest-dom/vitest');
	const { cleanup } = require('@testing-library/react');
	afterEach(() => cleanup());
} catch {
	// no-op
}
```

Implications:

- `@testing-library/jest-dom/vitest` is the supported matcher import.
- Setup is tolerant: if Testing Library packages aren’t installed in a workspace, it no-ops.

#### json-p3 specifics (repo evidence + plan-derived API expectations)

Verified repo state:

- There is **no existing implementation code** importing `json-p3`.
- `pnpm-lock.yaml` contains **no `json-p3` entries** (search for `json-p3`, `/json-p3@`, `json-p3@` returned no matches).

Plan-derived (documented) expectations for how `json-p3` will be used:

- `plans/ui-spec/plan.md` specifies a strict boundary module that is the only place allowed to import from `json-p3`, and it expects:

```markdown
- Implement `src/jsonp3.ts` as the **only** module allowed to import from `json-p3`.
- Provide adapter APIs used everywhere else in core:
  - `createJsonp3FunctionRegistry()`
  - `createJsonp3Evaluator({ registry })`
  - `jsonp3FindAll(path, doc) -> Array<{ value: unknown; path: string }>`
```

- `spec/design-ui-spec-json-p3.md` defines the normative behavior regardless of the concrete `json-p3` API shape:
  - JSONPath evaluation must be RFC 9535 semantics and must be performed by `json-p3`.
  - All mutations must be RFC 6902 JSON Patch operations and applied via `patch([...])`.
  - Write helpers must enforce “exactly one match” targeting.

Inferred caveats (explicitly called out as risks in plans, not verified by code):

- `plan/architecture-ui-spec-core-1.md` and `plan/architecture-ui-spec-1.md` list as risks/assumptions that `json-p3` may not directly provide JSON Pointer-compatible locations for JSONPath matches, and that patch semantics might differ from strict RFC 6902.

#### Pattern: ESLint wiring for packages

Typical package-level `.eslintrc.cjs` (from `packages/utils/.eslintrc.cjs`):

```js
module.exports = {
	extends: ['@lellimecnar/eslint-config'],
	ignorePatterns: ['!./*.json', '!./*.js', '!./src/**/*'],
	parserOptions: { project: ['./tsconfig.json'] },
};
```

Root `.eslintrc.js` is configured to ignore `./packages/**` (packages are expected to carry their own ESLint config):

```js
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	ignorePatterns: [
		'./packages/**',
		'**/dist/**',
		'**/build/**',
		'**/node_modules/**',
	],
};
```

### API and Schema Documentation (UI-Spec constraints)

From `spec/design-ui-spec-json-p3.md` (normative):

- JSONPath evaluation MUST use `json-p3` and interpret JSONPath strings as RFC 9535.
- Mutation MUST use RFC 6902 JSON Patch, exposed as `patch(operations)` and applied atomically.
- Write helpers that accept JSONPath targets MUST enforce “exactly one match” semantics:
  - 0 matches → throw, no state change
  - > 1 match → throw, no state change

From `spec/spec-architecture-ui-spec-packages.md` (normative):

- `@ui-spec/core` must not depend on framework bindings; bindings depend on core.
- Router and validation are optional add-ons.
- Cross-cutting: all JSONPath and JSON Patch behavior is standardized on `json-p3`.

From `plans/ui-spec/plan.md` (repo plan constraints):

- UI-Spec initial PR explicitly excludes router + validation packages.
- UI-Spec packages should standardize on Vitest and `happy-dom` (no Jest, no jsdom).
- Plan states “no embedded function strings (no UIScript)” and to use `json-p3` function registry.

### Technical Requirements

- Build/test conventions are turbo-driven at the repo root (`package.json` and `turbo.json`):
  - `pnpm build` → `turbo build`
  - `pnpm test` → `turbo test -- --passWithNoTests`
  - `pnpm type-check` → `turbo type-check`
  - Workspaces can be targeted via `pnpm --filter <workspace> <script>`.

Concrete per-workspace script commands (observed in existing packages like `@card-stack/core` and `@lellimecnar/ui`):

- Build: `vite build` (or Tailwind CSS build for `@lellimecnar/ui`)
- Test: `vitest run`
- Test watch: `vitest`
- Coverage: `vitest run --coverage`
- Type-check: `tsgo --noEmit`
- Lint: `eslint .`

## Recommended Approach

Adopt the established “TS library package” pattern (as in `packages/utils` / `packages/card-stack/core`) for new `packages/ui-spec/*` packages:

- **Build**: Vite library mode + `vite-plugin-dts` + `preserveModules` + externalize deps/peerDeps.
- **Type-check**: `tsgo --noEmit` (matches repo convention).
- **Tests**:
  - `@ui-spec/core`: `vitestBaseConfig()` (Node-like) is sufficient if tests are non-DOM.
  - `@ui-spec/react` and `@ui-spec/adapter-shadcn`: use `vitestBrowserConfigHappyDom()` to match repo-wide React testing pattern.
- **Testing Library**: rely on `@lellimecnar/vitest-config/browser`’s setup, and add `@testing-library/*` deps only where needed.
- **ESLint**: package-level `.eslintrc.cjs` extending `@lellimecnar/eslint-config` with `parserOptions.project`.

Concrete dependency/version guidance based on existing repo usage (these are present today):

- `happy-dom`: `^20.0.11` (present in `packages/ui/package.json` and web apps)
- `@testing-library/react`: `^16.3.1` (present in `packages/ui/package.json` and web apps)
- `@testing-library/jest-dom`: `^6.9.1` (present in `packages/ui/package.json` and web apps)
- `@testing-library/user-event`: `^14.6.1` (present in `packages/ui/package.json` and web apps)
- `vitest`: `^4.0.16` (present in root and packages)
- `@vitest/coverage-v8`: `^4.0.16` (present in root and packages)
- `vite`: `^7.3.0` (present in root and packages)
- `vite-plugin-dts`: `^4.5.4` (present in root and packages)
- `typescript`: `~5.5` (present in root and packages)
- `@types/node`: `^24` (present in root and some packages)

## Implementation Guidance

- **Objectives**:
  - Align new `@ui-spec/*` packages with proven monorepo build/test/type-check patterns.
  - Enforce UI-Spec constraints: JSONPath via `json-p3`, mutation via RFC 6902 JSON Patch, strict single-match targeting for writes.
- **Key Tasks**:
  - Scaffold packages with consistent `package.json` scripts and TS/Vite/Vitest/ESLint configs.
  - Implement a `json-p3` boundary module as mandated by the plan docs.
- **Dependencies**:
  - `@lellimecnar/vite-config` and `@lellimecnar/vitest-config` are the canonical shared configs.
- **Success Criteria**:
  - `pnpm --filter @ui-spec/core build && pnpm --filter @ui-spec/core test && pnpm --filter @ui-spec/core type-check` passes (once packages exist).
  - `@ui-spec/react` tests run in `happy-dom` and can use Testing Library matchers.

## Uncertainties / Missing Info

- **`json-p3` dependency version**: No `json-p3` entries were found in `pnpm-lock.yaml`, and there is no existing code importing `json-p3` in the repo. The exact version to pin is therefore **not currently derivable from the repository state**.
- **`json-p3` API surface**: The planned wrappers mention evaluator + function registry concepts, but there is no verified in-repo usage to confirm exact import names, return shapes, or pointer/path metadata availability. The only concrete requirements are the ones stated in the plan/spec documents (e.g., “must use `json-p3`” and “must apply JSON Patch”).
- **`.github/PACKAGE_TEMPLATE.md`** appears partially out-of-date relative to current repo practice (it references `tsc`/Jest patterns, while packages now use `tsgo`/Vitest/Vite). Use the live packages (`packages/utils`, `packages/card-stack/core`) as the authoritative pattern.

- **React peer version for `@ui-spec/react`**: The repo root enforces `react`/`react-dom` via overrides (`"react": "^19"`, `"react-dom": "^19"`), but some packages (e.g., `@lellimecnar/ui`) declare `peerDependencies.react` as `^18`. Before choosing peer ranges for `@ui-spec/react`, confirm whether the intended peer constraint is `^19` or a broader range.
