<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Benchmark Expansion (plans/jsonpath-benchmark-expansion/plan.md)

## Research Executed

### File Analysis

- plans/jsonpath-benchmark-expansion/plan.md
  - Benchmark expansion scope, new fixtures/adapters/reporting utilities, adds baselines for `json-p3`, `fast-json-patch`, `json-pointer`, `rfc6902`, `json-merge-patch`.

- package.json
  - Monorepo scripts (`turbo build|dev|lint|test|type-check`) and workspace entry scripts.
- turbo.json
  - Turbo task graph; `test` depends on `^build`; persistent `dev`/`test:watch`; `type-check` depends on `^build`.
- pnpm-workspace.yaml
  - Workspaces include `packages/jsonpath/*` (so `@jsonpath/benchmarks` is a first-class workspace).
- vitest.config.ts
  - Root Vitest multi-project runner; `reporters: ['json','default']` and `outputFile: './test-output.json'`.

- packages/jsonpath/benchmarks/package.json
  - Benchmark runner is `vitest bench` via `pnpm --filter @jsonpath/benchmarks bench`.
- packages/jsonpath/benchmarks/vitest.config.ts
  - Extends shared `vitestBaseConfig()` and aliases `@jsonpath/*` imports directly to sibling package `src/index.ts` for source-level benchmarking.
- packages/jsonpath/benchmarks/src/\*.bench.ts
  - Existing benchmark structure and naming patterns.

- packages/config-vitest/base.ts
  - Shared Vitest defaults; notably writes `test-output.json` per-package and enables JSON reporter.

- packages/jsonpath/jsonpath/src/facade.ts
  - Canonical query API shape (`query`, `queryValues`, `queryPaths`, `compileQuery`, `stream`, plus pointer/patch/mergePatch convenience functions).

- packages/jsonpath/compiler/src/compiler.ts
  - JIT `Compiler` and functional `compile(ast, options)` API.

- packages/jsonpath/pointer/src/pointer.ts
  - `JSONPointer` API (parse/format/evaluate/resolve/set/remove) and `evaluatePointer()` helper.

- packages/jsonpath/patch/src/patch.ts
  - RFC6902 operations + `applyPatch`/`validate`/`applyWithErrors`/`applyWithInverse` etc.

- packages/jsonpath/merge-patch/src/merge-patch.ts
  - RFC7386 `applyMergePatch` + `createMergePatch`.

- packages/jsonpath/compat-json-p3/src/\*.ts
  - Existing repo-local compatibility adapter for json-p3-style APIs (path-first calling convention).

- packages/jsonpath/docs/guides/benchmarks.md
  - Internal doc confirming benchmark location (`src/*.bench.ts`) and command.

### Code Search Results

- vitestBaseConfig
  - packages/config-vitest/base.ts defines defaults used by most workspaces.

- vitest bench
  - packages/jsonpath/benchmarks/package.json: `"bench": "vitest bench"`
  - packages/data-map/core/package.json: `"bench": "vitest bench"`

- test-output.json
  - Root vitest config writes `./test-output.json` (repo root)
  - Shared vitest base config writes `test-output.json` (workspace root)
  - .gitignore ignores `**/test-output.json`

### External Research

- #githubRepo:"N/A (external web avoided by request)"
  - Not executed.
- #fetch:N/A (external web avoided by request)
  - Not executed.

### Project Conventions

- Standards referenced: pnpm workspaces + Turborepo task orchestration; Vitest per-package configs using `@lellimecnar/vitest-config`; TypeScript ESM (`"type":"module"`); package `exports` pointing to `dist`.
- Instructions followed: repo `AGENTS.md` (pnpm/turbo commands), workspace `copilot-instructions.md` (workspace:\* deps), task prompt requirement to avoid external web and prefer workspace tools.

## Key Discoveries

### Project Structure

- Monorepo is pnpm + Turborepo.
  - Root scripts are in package.json; notable for this work:
    - `pnpm test` → `turbo test`
    - `pnpm type-check` → `turbo type-check`
    - `pnpm lint` → `turbo lint`
    - `pnpm --filter @jsonpath/benchmarks bench` → `vitest bench`

- Vitest is configured as a multi-project runner at the root, but each workspace also has its own vitest config.
  - Root: vitest.config.ts uses `projects: [...]` and writes `./test-output.json`.
  - Shared: packages/config-vitest/base.ts sets `reporters: ['json','default']` and `outputFile: 'test-output.json'`.
  - Practical implication for benchmarking: `vitest bench` in a workspace likely emits console output plus writes `test-output.json` in that workspace directory (ignored by git).

### Implementation Patterns

#### Benchmarks package (`@jsonpath/benchmarks`)

- Entry point: there is no `src/index.ts`; the package is a private runner with `src/*.bench.ts` files.
- Naming convention: `*.bench.ts` under packages/jsonpath/benchmarks/src.
- Each bench file uses Vitest benchmark primitives:
  - `import { bench, describe } from 'vitest'`
  - Calls are grouped with `describe(...)` and measured with `bench(name, fn)`.

- Existing patterns worth matching:
  - Data is constructed inline in each bench file, usually with `Array.from({ length: N }, ...)`.
  - External libraries without types are tolerated with `// @ts-expect-error` for the import.
  - Bench code calls the JSONPath facade (`query`, `queryValues`) rather than deep internal evaluator APIs.

- Source-level aliasing is already set up:
  - packages/jsonpath/benchmarks/vitest.config.ts aliases `@jsonpath/jsonpath`, `@jsonpath/compiler`, `@jsonpath/pointer`, `@jsonpath/patch`, etc. to sibling `../<pkg>/src/index.ts`.
  - This is important for the expansion plan: new adapters/fixtures can import `@jsonpath/*` package names and still benchmark source (not built dist).

#### Fixture/module exporting pattern (repo-wide)

- Common pattern is “folder + index.ts that re-exports leaf modules”:
  - Example: packages/data-map/core/src/**fixtures**/index.ts → `export * from './data'; export * from './helpers';`
  - Similar index re-export patterns exist across apps/packages (e.g., UI component folders).

- Test-only fixtures often live under `src/__tests__/__fixtures__/...`:
  - Example: packages/jsonpath/patch/src/**tests**/**fixtures**/load-rfc-tests.ts uses `createRequire(import.meta.url)` + `require.resolve(...)` to locate data in node_modules.
  - Implication for benchmark expansion: if you add cross-library fixtures (e.g., JSON patch corpora), locating them from node_modules via `createRequire` is an existing, accepted pattern.

### Complete Examples

```ts
// Source: packages/jsonpath/jsonpath/src/facade.ts
// (Key surface API used by benchmarks)
export function query(root: any, path: string, options?: EvaluatorOptions): QueryResult;
export function queryValues(root: any, path: string, options?: EvaluatorOptions): any[];
export function queryPaths(root: any, path: string, options?: EvaluatorOptions): string[];
export function compileQuery(path: string, options?: EvaluatorOptions): CompiledQuery;
export function* stream(root: any, path: string, options?: EvaluatorOptions): Generator<QueryResultNode>;
```

### API and Schema Documentation

#### `@jsonpath/jsonpath` (facade-first API)

- Import path: `@jsonpath/jsonpath`.
- Primary query entrypoints (verified in packages/jsonpath/jsonpath/src/facade.ts):
  - `query(root, path, options?)` → returns `QueryResult` (from `@jsonpath/evaluator`).
  - `queryValues(root, path, options?)` → `any[]` (calls `.values()` on `QueryResult`).
  - `queryPaths(root, path, options?)` → `string[]` (normalized `$[...]` paths).
  - `compileQuery(path, options?)` → `CompiledQuery`.
  - `parseQuery(query, options?)` caches AST and enforces `secure.maxQueryLength` when present.
  - Convenience: `value/first`, `exists`, `count`, `toPointer/toPointers`, `stream`.

- Convenience re-exports (same facade file):
  - `parse` from `@jsonpath/parser`, `evaluate` from `@jsonpath/evaluator`, `compile` from `@jsonpath/compiler`.
  - Pointer/Patch/MergePatch helpers: `JSONPointer`, `evaluatePointer`, `applyPatch`, `applyPatchImmutable`, `applyMergePatch`, `createMergePatch`.

#### `@jsonpath/compiler`

- Import path: `@jsonpath/compiler`.
- API (packages/jsonpath/compiler/src/compiler.ts):
  - `class Compiler { compile(ast: QueryNode): CompiledQuery }`
  - `compile(ast: QueryNode, options?: CompilerOptions): CompiledQuery` (convenience wrapper).
- Notes for benchmarks:
  - Compiled queries carry metadata (`compiled.ast`, `compiled.source`, `compiled.compilationTime`) via `Object.assign`.

#### `@jsonpath/pointer`

- Import path: `@jsonpath/pointer`.
- Primary API (packages/jsonpath/pointer/src/pointer.ts):
  - `class JSONPointer` with `parse`, `format`, `evaluate`, `resolve`, `resolveOrThrow`, `exists`, `set`, `remove`.
  - `evaluatePointer(root, pointer)` helper.

#### `@jsonpath/patch`

- Import path: `@jsonpath/patch`.
- Primary API (packages/jsonpath/patch/src/patch.ts):
  - `type PatchOperation` (RFC6902 union).
  - `applyPatch(target, patch, options?: ApplyOptions)` (clones for atomicity; optional `mutate`, `validate`, `continueOnError`).
  - `applyPatchImmutable(...)` convenience.
  - `validate(patch)`.
  - `applyWithErrors(...)` and `applyWithInverse(...)` exist and can be useful for future benchmark categories.

#### `@jsonpath/merge-patch`

- Import path: `@jsonpath/merge-patch`.
- API (packages/jsonpath/merge-patch/src/merge-patch.ts):
  - `applyMergePatch(target, patch, options?: MergePatchOptions)`.
  - `createMergePatch(source, target)`.

#### `@jsonpath/compat-json-p3` (already in-repo)

- Import path: `@jsonpath/compat-json-p3`.
- Provides a “json-p3-like” calling convention without installing `json-p3`:
  - `jsonpath.query(path, data, options?)` and `jsonpath.value(path, data, options?)`.
  - `jsonpatch.apply(patchOps, target)`.
- This is directly relevant to the benchmark expansion plan item “json-p3 argument order differs: path first”.

### Configuration Examples

```ts
// Source: packages/jsonpath/benchmarks/vitest.config.ts
// Benchmarks run against TS sources via aliases to sibling packages.
export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/jsonpath': path.resolve(__dirname, '../jsonpath/src/index.ts'),
			'@jsonpath/compiler': path.resolve(__dirname, '../compiler/src/index.ts'),
			'@jsonpath/pointer': path.resolve(__dirname, '../pointer/src/index.ts'),
			'@jsonpath/patch': path.resolve(__dirname, '../patch/src/index.ts'),
			'@jsonpath/merge-patch': path.resolve(
				__dirname,
				'../merge-patch/src/index.ts',
			),
		},
	},
});
```

### Technical Requirements

- Workspaces are ESM (`"type": "module"`), so new benchmark utilities should follow ESM import conventions.
- Workspace deps should use `workspace:*` for internal packages (already true in @jsonpath/benchmarks).
- Benchmarks should use the existing alias strategy (import `@jsonpath/*` package names; vitest config handles source mapping).
- If adding external libraries without types, the existing approach is `// @ts-expect-error` on the import.

## Recommended Approach

Implement the benchmark expansion plan using the existing repo patterns:

- Keep all benchmark entry files as `packages/jsonpath/benchmarks/src/*.bench.ts` and use `describe/bench` from Vitest.
- Introduce `src/fixtures/*` and `src/adapters/*` as planned, using the repo’s “folder + index.ts re-exports” convention (mirroring `src/__fixtures__/index.ts` in other packages).
- Prefer using the already-present `@jsonpath/compat-json-p3` for “json-p3 style” path-first baselines unless the plan explicitly requires benchmarking the real `json-p3` dependency (the compat layer may differ in performance characteristics because it is a wrapper around `@jsonpath/jsonpath`).
- For reporting, initially lean on Vitest’s existing reporters:
  - console output (human readable)
  - `test-output.json` generated per run (machine readable) due to `vitestBaseConfig()`.

## Implementation Guidance

- **Objectives**: Expand `@jsonpath/benchmarks` to cover missing libraries and operation categories, using reproducible datasets and normalized adapters.
- **Key Tasks**:
  - Add planned external deps to packages/jsonpath/benchmarks/package.json.
  - Add `src/fixtures/*` with datasets and generator functions.
  - Add `src/adapters/*` to normalize API differences across libraries.
  - Add new `*.bench.ts` files in categories (fundamentals, filters, scale, pointer, patch, merge-patch, memory).
- **Dependencies**:
  - Uses `vitest bench` and shared `@lellimecnar/vitest-config`.
  - Uses `@jsonpath/jsonpath` facade for most comparisons.
- **Success Criteria**:
  - `pnpm --filter @jsonpath/benchmarks bench` runs all new benches without import errors.
  - Bench files follow `src/*.bench.ts` convention and produce stable outputs (console + `test-output.json`).
