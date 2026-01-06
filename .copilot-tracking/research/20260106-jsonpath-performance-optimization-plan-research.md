<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Performance Optimization (plans/jsonpath-performance-optimization/plan.md)

This note is constrained to facts verified by direct file reads and searches in this workspace on 2026-01-06.

## Research Executed

### File Analysis

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/plans/jsonpath-performance-optimization/plan.md
  - Steps 1–10, expected impacts, and explicitly targeted files.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/package.json
  - Root scripts are Turborepo-driven; engines pin Node and pnpm.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/turbo.json
  - `test` depends on `^build` (important for “run a single package’s tests” planning).

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/vitest.config.ts
  - Vitest “projects” are per-workspace `vitest.config.ts` files.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/facade.ts
  - Facade uses `compileQuery()` already; default plugins are registered globally at module load.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/cache.ts
  - Parsed AST caching + compiled query caching via a module-level `Compiler` instance.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/compiler/src/compiler.ts
  - Current “compile” returns an interpreted function; codegen is generated but not executed.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/compiler/src/codegen/generators.ts
  - Contains a “simple path” fast-path generator, but it is currently only emitted as JS source.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/evaluator.ts
  - Interpreter is generator-driven; `Evaluator.evaluate()` materializes via `Array.from(this.stream(...))`.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/query-result.ts
  - `QueryResultNode` supports lazy-path chain fields (`_pathParent`, `_pathSegment`) and pointer caching.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/query-result-pool.ts
  - Pooling exists (`QueryResultPool`) and is used by evaluator.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/parser/src/nodes.ts
  - AST node types are structurally typed with `readonly` fields, but nodes are plain JS objects.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/parser/src/parser.ts
  - Parser validates function calls against builtins and `functionRegistry` at parse-time.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/core/src/registry.ts
  - `functionRegistry` + `getFunction()` are defined here.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/functions/src/index.ts
  - Re-exports `getFunction` / `functionRegistry` from core; builtins register on module import.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/patch/src/patch.ts
  - `applyPatch()` clones by default and then optionally “copies back” when `mutate: true`.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/merge-patch/src/merge-patch.ts
  - `applyMergePatch()` defaults `mutate: true`; uses `Object.keys()` + recursion.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/package.json
  - Benchmarks package runs `vitest bench` (no `test` script currently).

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/vitest.config.ts
  - Aliases `@jsonpath/*` to local `src/index.ts` for benchmark runs.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/docs/api/jsonpath.md
  - Public API reference for facade (query/stream/compileQuery/etc).

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/docs/packages/patch.md
  - Patch docs currently assert “immutable” behavior.

### Code Search Results

- compileQuery usage
  - packages/jsonpath/jsonpath/src/facade.ts (query uses compileQuery)
  - packages/jsonpath/jsonpath/src/**tests**/compiled-cache.spec.ts
  - packages/jsonpath/benchmarks/src/compilation-caching.bench.ts

- evaluator streaming + eager evaluation
  - packages/jsonpath/evaluator/src/evaluator.ts: `Evaluator.evaluate(ast)` uses `Array.from(this.stream(ast))`
  - packages/jsonpath/evaluator/src/evaluator.ts: exported `evaluate(root, ast, options?)` and `stream(root, ast, options?)`

- function registry + lookups
  - packages/jsonpath/core/src/registry.ts: `functionRegistry`, `getFunction`, `registerFunction`
  - packages/jsonpath/parser/src/parser.ts: `functionRegistry.get(name)` for validation
  - packages/jsonpath/evaluator/src/evaluator.ts: `getFunction(expr.name)` during filter evaluation
  - packages/jsonpath/compiler/src/codegen/expressions.ts: emits `getFunction(name).evaluate(...)`

- patch cloning/mutation
  - packages/jsonpath/patch/src/patch.ts: always `structuredClone(target)`; `mutate` only copies back at the end
  - packages/jsonpath/jsonpath/src/transform.ts: calls `applyPatch(root, patch)` without options

### External Research

- None (workspace-only). This research intentionally avoids external docs to keep output 100% grounded in the repo’s current code.

### Project Conventions

- Standards referenced: monorepo conventions in /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/AGENTS.md
- Instructions followed: Task Researcher mode (research-only), repo is pnpm + Turborepo; jsonpath packages are ESM + Vitest.

## Key Discoveries

### Project-Wide Analysis (stack, structure, commands)

Stack / tooling (verified in root package.json and AGENTS.md):

- Node: `^24.12.0`
- pnpm: `9.12.2` (`packageManager: pnpm@9.12.2`)
- Build system: Turborepo (`turbo.json`)
- Language: TypeScript (5.5 family)
- Testing:
  - Most packages (including `packages/jsonpath/*`): Vitest (`vitest run`)
  - Mobile Expo app: Jest via `jest-expo` (per AGENTS.md)

Workspace structure (pnpm-workspace.yaml + root package.json):

- Workspaces include: `packages/jsonpath/*`, plus `packages/*`, `web/*`, `mobile/*`, etc.

Repo-level commands (run from repo root):

- `pnpm build` → `turbo build`
- `pnpm test` → `turbo test` (depends on `^build`)
- `pnpm type-check` → `turbo type-check`
- `pnpm lint` → `turbo lint`

Vitest root project aggregation (vitest.config.ts):

- Root vitest config points to per-package configs:
  - `packages/jsonpath/*/vitest.config.ts` (so each jsonpath package controls its own tests)

### Code Patterns: Facade, compileQuery, plugins, queryValues

Facade entry points are in: `packages/jsonpath/jsonpath/src/facade.ts`.

Current implementation (excerpt):

```ts
export function query(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): QueryResult {
	const compiled = compileQuery(path, options);
	return compiled(root, withDefaultPlugins(options));
}

export function queryValues(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): any[] {
	return query(root, path, options).values();
}
```

Default plugins are global and persistent:

```ts
export const DEFAULT_PLUGINS: JSONPathPlugin[] = [arithmetic(), extras()];
PluginManager.from({ plugins: DEFAULT_PLUGINS });
```

Pitfall: `parseQuery()` does NOT register per-call `options.plugins` before parsing; it only passes `arithmetic`/`strict` flags into parser. Passing plugin functions only via `options.plugins` is therefore not sufficient for parsing function calls that the parser validates (unless the plugin was already registered globally via `registerPlugin()` or the plugin registers functions eagerly outside `onRegister`).

### Compiler Reality Check (critical to Step 1)

The plan assumes the compiler’s fast-path codegen is used. Current compiler does not execute generated code.

In `packages/jsonpath/compiler/src/compiler.ts`:

```ts
const source = generateCode(ast);
const fn = (root, options) => executeInterpreted(root, ast, options);
const compiled = Object.assign(fn, { source, ast, compilationTime });
```

So `compileQuery()` (via facade cache → `compileCachedQuery(ast)` → `compiler.compile(ast)`) currently returns a function that still calls the interpreter. The generated “fast path” in `codegen/generators.ts` is present but unused at runtime.

### Evaluator: structure, signatures, streaming behavior

Locations:

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/query-result.ts`
- `packages/jsonpath/evaluator/src/query-result-pool.ts`

Public signatures (excerpt):

```ts
export function evaluate(root: any, ast: QueryNode, options?: EvaluatorOptions): QueryResult
export function* stream(root: any, ast: QueryNode, options?: EvaluatorOptions): Generator<QueryResultNode>
```

Current eager evaluation is “materialize stream”:

```ts
public evaluate(ast: QueryNode): QueryResult {
  const results = Array.from(this.stream(ast));
  const ownedResults = results.map((node) => this.pool.ownFrom(node));
  return new QueryResult(ownedResults);
}
```

Current streaming behavior:

- `Evaluator.stream(ast)` is generator-based
- Descendant recursion (`..`) uses recursion and (when `detectCircular`) copies sets (`new Set(visited)`) per recursion level.

QueryResultNode shape (current, excerpt from query-result.ts):

```ts
export interface QueryResultNode<T = unknown> extends CoreQueryNode<T> {
	readonly path: Path;
	_pathParent?: QueryResultNode;
	_pathSegment?: PathSegment;
	_cachedPath?: PathSegment[];
	_cachedPointer?: string;
	_depth?: number;
}
```

QueryResultPool exists and is actively used (excerpt):

```ts
private readonly pool = new QueryResultPool();
...
this.pool.acquire({ value: this.root, root: this.root })
```

This conflicts with the plan’s Step 7 assumption (“QueryResultPool adds overhead; remove pool”): in current codebase, the pool is already part of the evaluator design and supports lazy path materialization.

### Parser + AST nodes: function calls, typing, mutability

Function calls are parsed into `FunctionCallNode` in `packages/jsonpath/parser/src/nodes.ts`:

```ts
export interface FunctionCallNode extends ASTNode {
	readonly type: NodeType.FunctionCall;
	readonly name: string;
	readonly args: ExpressionNode[];
}
```

Parser constructs plain objects and validates function calls using builtins + `functionRegistry` (excerpt from parser.ts):

```ts
const spec = builtins[node.name] || functionRegistry.get(node.name);
if (!spec) throw new JSONPathSyntaxError(`Unknown function: ${node.name}`);
```

AST nodes are declared with `readonly` fields, but at runtime they’re plain object literals. Attaching additional fields (like `_resolvedFn`) is feasible at runtime but will require type changes (or `as any`) to keep TS clean.

Important interaction: compiler codegen currently uses `JSON.stringify(expr)` for embedded query expressions (`NodeType.Query`). If you attach function objects to AST nodes, JSON serialization will omit those fields, which is probably OK but should be considered when designing “resolved fn reference” storage.

### Functions registry

Definitions live in `packages/jsonpath/core/src/registry.ts`:

```ts
export const functionRegistry = new Map<string, FunctionDefinition>();
export function registerFunction(definition: FunctionDefinition): void;
export function getFunction(name: string): FunctionDefinition | undefined;
```

`@jsonpath/functions` re-exports these core registry helpers (`packages/jsonpath/functions/src/index.ts`) and also registers builtins at module import time (`packages/jsonpath/functions/src/registry.ts` ends with `registerBuiltins();`).

### Patch: applyPatch signature, defaults, cloning, call sites that would break

Current `applyPatch` signature (packages/jsonpath/patch/src/patch.ts):

```ts
export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any;
```

Current defaults:

- `strictMode = true`
- `mutate = false`
- `validate = false`
- Always clones first: `const result = structuredClone(target); let working = result;`

So “immutability” is the default and is documented as such in `packages/jsonpath/docs/packages/patch.md`.

Call sites that implicitly rely on immutability (will break if `mutate` becomes default true):

- `packages/jsonpath/jsonpath/src/transform.ts`:
  - `return applyPatch(root, patch);` (expects `root` unchanged)
  - `return applyPatch(result, allOps);` in `omit()`
- `packages/jsonpath/jsonpath/src/facade.ts`:
  - `export function patch(target, operations, options?) { return applyPatch(target, operations, options); }`

Benchmarks already use `structuredClone()` for fairness in RFC6902 benches (example match):

- `packages/jsonpath/benchmarks/src/patch-rfc6902.bench.ts` uses `structuredClone(STORE_DATA)` before applying.

### Merge-patch: current apply, perf-sensitive parts

Current `applyMergePatch()` (packages/jsonpath/merge-patch/src/merge-patch.ts):

- Defaults `mutate = true`.
- Uses `Object.keys(patch)` for iteration.
- Recurses and uses `{ ...options, mutate: true }` for nested objects.

### Benchmarks package: vitest setup, tests, baseline, warn-only regression feasibility

Benchmarks are in `packages/jsonpath/benchmarks`.

- `package.json` defines `bench` scripts only; there is no `test` script.
- `vitest.config.ts` aliases `@jsonpath/*` packages to local sources so changes are benchmarked without building/publishing.

Existing “test-like” artifact:

- `packages/jsonpath/benchmarks/src/external-imports.smoke.spec.ts` exists, but without a `test` script it will not run via Turbo’s `test` task.

Implication for Step 9 (regression tests):

- If you add `src/__tests__/regression.spec.ts`, you must also ensure it runs in CI.
  - Options observed in repo conventions:
    1. Add a `test` script to `@jsonpath/benchmarks` and rely on `turbo test`.
    2. Wire regression detection into `bench:full` + a node script that compares outputs and prints warnings (exit 0).

### Documentation locations for query/patch options

- Facade API reference: /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/docs/api/jsonpath.md
- JSONPath package docs: /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/docs/
- Patch docs (explicitly states immutable): /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/docs/packages/patch.md

## Commands Cheatsheet (copy/paste)

Repo-level:

- `pnpm build`
- `pnpm test`
- `pnpm type-check`

Package-level unit tests (Vitest) — run from repo root:

- `pnpm --filter @jsonpath/jsonpath test`
- `pnpm --filter @jsonpath/compiler test`
- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/parser test`
- `pnpm --filter @jsonpath/functions test`
- `pnpm --filter @jsonpath/patch test`
- `pnpm --filter @jsonpath/merge-patch test`
- `pnpm --filter @jsonpath/compliance-suite test`

Benchmarks:

- `pnpm --filter @jsonpath/benchmarks bench`
- `pnpm --filter @jsonpath/benchmarks bench:query`
- `pnpm --filter @jsonpath/benchmarks bench:patch`
- `pnpm --filter @jsonpath/benchmarks bench:full`

## Per-Step Findings (Steps 1–10 from plan)

### Step 1: Enable Compiled Queries by Default in Facade

Plan intent: `query() -> compileQuery() -> compiled fn fast-path`.

Current state:

- Facade already routes `query()` through `compileQuery()` (packages/jsonpath/jsonpath/src/facade.ts).
- However, `compileQuery()` currently returns a function that calls `evaluate()` (interpreter) because the compiler does not execute generated code.

Current relevant excerpts:

```ts
// facade.ts
export function query(...) {
  const compiled = compileQuery(path, options);
  return compiled(root, withDefaultPlugins(options));
}

// compiler.ts
const source = generateCode(ast);
const fn = (root, options) => executeInterpreted(root, ast, options);
```

Files / symbols to change:

- packages/jsonpath/compiler/src/compiler.ts
  - `Compiler.compile()` must return a truly “fast” function for the simple-path cases (or otherwise execute codegen output).
- packages/jsonpath/compiler/src/codegen/generators.ts
  - Source of truth for the “simple path” detection logic.

Tests to update / run:

- packages/jsonpath/jsonpath/src/**tests**/facade.spec.ts
- packages/jsonpath/jsonpath/src/**tests**/compiled-cache.spec.ts
- packages/jsonpath/compiler/src/**tests**/compiler.spec.ts
- packages/jsonpath/compiler/src/**tests**/no-dynamic-eval.spec.ts (pitfall)

Pitfalls:

- `no-dynamic-eval.spec.ts` currently asserts the generated source doesn’t contain `new Function`. If you implement compilation via `new Function`, the test may need revisiting depending on policy intent.
- Facade `parseQuery()` caches AST by query string only; any per-options compilation differences must be managed carefully if introduced.

### Step 2: Add Fast-Path to Evaluator for Non-Compiled Usage

Current relevant code:

- `Evaluator.evaluate(ast)` always uses generator stream + `Array.from(...)`.
- Selector handling already has specialized branches for `NameSelector` and `IndexSelector` (see evaluator.ts `streamSelector`).

Files / symbols to change:

- packages/jsonpath/evaluator/src/evaluator.ts
  - `Evaluator.evaluate(ast)` / (potentially) introduce a non-generator “eager” path walker for simple child chains.
- packages/jsonpath/evaluator/src/**tests**/evaluator.spec.ts

Pitfalls:

- Current evaluator enforces security checks (noRecursive/noFilters/maxNodes/maxResults/etc). Any fast path must preserve these semantics.

### Step 3: Implement Compile-Time Function Resolution

Current relevant code:

- Parser validates against `functionRegistry` but does not store the resolved definition.
- Evaluator resolves functions at runtime per invocation:

```ts
// evaluator.ts
const fn = getFunction(expr.name);
...
const result = fn.evaluate(...processedArgs);
```

Files / symbols to change:

- packages/jsonpath/parser/src/nodes.ts
  - Extend `FunctionCallNode` type to optionally include a resolved function reference (or a stable lookup token).
- packages/jsonpath/parser/src/parser.ts
  - After `validateFunctionCall(node)`, attach the resolved ref.
- packages/jsonpath/evaluator/src/evaluator.ts
  - Use the resolved ref if present.
- packages/jsonpath/compiler/src/codegen/expressions.ts
  - Optionally use resolved ref (though codegen currently generates string source and isn’t executed).

Tests to update / run:

- `pnpm --filter @jsonpath/parser test`
- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/functions test`

Pitfalls:

- Storing function objects in AST can have knock-on effects if AST is serialized or logged.
- Parser caching in facade is query-string keyed; resolved refs must remain valid even if plugins are later added/removed.

### Step 4: Lazy Generator Conversion (avoid generator overhead unless streaming)

Current relevant code:

- `Evaluator.evaluate(ast)` uses generator path always.
- Exported `evaluate(root, ast, options?)` always goes through `Evaluator.evaluate()`.

Files / symbols to change:

- packages/jsonpath/evaluator/src/evaluator.ts
  - Introduce a direct-loop eager evaluator for the non-streaming case.
- packages/jsonpath/evaluator/src/options.ts
  - Currently no `stream` flag exists; adding one would be a public options change.

Tests to update / run:

- `pnpm --filter @jsonpath/evaluator test`

Pitfalls:

- `stream()` must preserve laziness and pooling behavior.
- `evaluate()` returns “owned” nodes to prevent pool mutation after return.

### Step 5: Optimize @jsonpath/patch Performance

Current relevant code:

```ts
// patch.ts
const result = structuredClone(target);
...
if (mutate) { /* copy back into target */ }
```

Files / symbols to change:

- packages/jsonpath/patch/src/patch.ts
  - `applyPatch()` default `mutate` and/or cloning strategy.
  - Potentially add a new option for atomicity (plan mentions `atomicApply`).
- packages/jsonpath/jsonpath/src/transform.ts
  - Must explicitly clone or set `mutate: false` if default changes.
- Internal call sites across the repo that rely on immutability.

Existing tests to update / run:

- `pnpm --filter @jsonpath/patch test`
- `packages/jsonpath/patch/src/__tests__/options.spec.ts`
- `packages/jsonpath/patch/src/__tests__/patch.spec.ts`
- `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts`

Pitfalls:

- Current behavior guarantees atomicity by always working on a clone (RFC-friendly). Skipping cloning by default is a semantic change.
- Documentation currently says patch operations are immutable (`packages/jsonpath/docs/packages/patch.md`).

### Step 6: Optimize @jsonpath/merge-patch Apply Performance

Current relevant code:

- `applyMergePatch()` defaults `mutate: true`, but still allocates via `Object.keys(patch)` and spreads `options` on recursion.

Files / symbols to change:

- packages/jsonpath/merge-patch/src/merge-patch.ts
- packages/jsonpath/merge-patch/src/**tests**/merge-patch.spec.ts

Pitfalls:

- `convert.ts` uses `applyMergePatchWithTrace(..., { mutate: false })` for patch conversion; must preserve that behavior.

### Step 7: Reduce Object Allocations in Hot Paths

Plan’s premise conflicts with current architecture:

- QueryResultPool already exists and is used to reduce allocations and to enable lazy path materialization.

Current relevant code:

- `packages/jsonpath/evaluator/src/query-result-pool.ts`
- `packages/jsonpath/evaluator/src/query-result.ts` (lazy path + pointer caching)

Files / symbols that would be impacted if following plan literally:

- packages/jsonpath/evaluator/src/evaluator.ts
- packages/jsonpath/evaluator/src/query-result-pool.ts
- packages/jsonpath/evaluator/src/query-result.ts
- packages/jsonpath/core/src/types.ts (if changing QueryNode/Path types)

Pitfalls:

- Removing pooling would likely increase allocations; changes here should be validated via benchmarks rather than assumed.

### Step 8: Optimize Recursive Descent (`..`)

Current relevant code:

- `Evaluator.streamDescendants(...)` is recursive and (when `detectCircular`) repeatedly clones `visited` sets.

Files / symbols to change:

- packages/jsonpath/evaluator/src/evaluator.ts
  - `streamDescendants()` and/or a new iterative DFS variant.

Tests to update / run:

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/compliance-suite test`

Pitfalls:

- Must preserve security option `secure.noRecursive` behavior (currently rejects descendant segments before evaluation).

### Step 9: Add Performance Regression Tests (warn-only)

Current state:

- Benchmarks package has `bench` scripts but no `test` script.
- There is at least one `*.spec.ts` file in benchmarks (`external-imports.smoke.spec.ts`).

Files / symbols to change:

- packages/jsonpath/benchmarks/package.json (if adding a `test` script)
- packages/jsonpath/benchmarks/src/**tests**/regression.spec.ts (new)
- packages/jsonpath/benchmarks/baseline.json (new)

Pitfalls:

- If CI only runs `turbo test`, this regression spec will not run unless `@jsonpath/benchmarks` defines `test`.
- “Warn-only” must ensure exit code remains 0; simplest approach is `console.warn` + an always-true expect.

### Step 10: Update Documentation and Benchmarks

Existing doc locations that will likely need updates if Step 5 changes defaults:

- docs/api/jsonpath.md (facade API reference)
- packages/jsonpath/docs/packages/patch.md (currently asserts immutability)
- packages/jsonpath/benchmarks/AUDIT_REPORT.md
- packages/jsonpath/benchmarks/README.md

Pitfalls:

- Documentation currently conflicts with the plan’s breaking-change acceptance for patch defaults.

## Recommended Approach (single, concrete)

Implement Step 1 as a “real fast path without dynamic eval” inside the compiler:

- In `packages/jsonpath/compiler/src/compiler.ts`, detect “simple child chain” ASTs (same conditions as `codegen/generators.ts`) and return a hand-written fast executor function.
- Keep the interpreter fallback for complex ASTs.
- Keep `compiled.source` as debug output, but do not rely on it for execution.

Then proceed to evaluator improvements:

- Introduce a non-generator eager evaluation path for non-streaming `evaluate()` (Step 4) while preserving `stream()` unchanged.

Finally, patch performance work should be gated behind explicit options:

- Add an explicit “non-atomic/mutate” mode (or a new API) rather than silently changing default semantics without updating internal callers and docs.

## Implementation Guidance

- **Objectives**: Align runtime behavior with the plan’s performance goals while staying consistent with current architecture (compiler “compiled” isn’t compiled yet; evaluator is stream-based).
- **Key Tasks**:
  - Make compiler return truly fast executors for common cases.
  - Add eager evaluator path to avoid generator overhead.
  - Add optional compile-time function resolution hooks in parser/evaluator.
  - If patch defaults change, update all facade/internal call sites and docs.
- **Dependencies**: compiler ↔ parser/evaluator; patch changes ripple into jsonpath facade + docs + benchmarks.
- **Success Criteria**:
  - `pnpm --filter @jsonpath/jsonpath test` passes.
  - `pnpm --filter @jsonpath/compliance-suite test` passes.
  - Benchmarks show measurable improvements in `query-fundamentals` and `filter-expressions`.
  - If regression tests are added, they actually run in CI (script wiring verified).

## Blocking Ambiguities

1. Dynamic compilation policy: is it acceptable to execute generated JS via `new Function` in Node builds? The current compiler explicitly does not do this, and there is a security-focused test (`no-dynamic-eval.spec.ts`).

2. Plugin registration semantics: facade parsing caches AST by query string and does not register per-call `options.plugins` prior to parsing. If “per-call plugins” are expected to work for function calls, this is a design gap that affects Step 3.
