<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Performance Optimization Plan (plans/jsonpath-performance-optimization/plan.md)

This note is constrained to facts verified by direct file reads, workspace searches, and tool-based external doc retrieval in this workspace on 2026-01-06.

## Research Executed

### File Analysis

- plans/jsonpath-performance-optimization/plan.md
  - Plan steps 1–14, intended performance targets, and per-step “Files” lists.

- package.json
  - Monorepo tooling (pnpm + Turborepo) and root scripts.

- turbo.json
  - Task dependency graph (notably `test` depends on `^build`).

- vitest.config.ts
  - Root Vitest multi-project setup (per-package `vitest.config.ts`).

- packages/jsonpath/evaluator/package.json
  - Per-package scripts (`test`, `type-check`, etc).

- packages/jsonpath/jsonpath/package.json
  - Per-package scripts (`test`, `type-check`, etc).

- packages/jsonpath/parser/package.json
  - Per-package scripts (`test`, `type-check`, etc).

- packages/jsonpath/functions/package.json
  - Per-package scripts (`test`, `type-check`, etc).

- packages/jsonpath/patch/package.json
  - Per-package scripts (`test`, `type-check`, etc).

- packages/jsonpath/merge-patch/package.json
  - Per-package scripts (`test`, `type-check`, etc).

- packages/jsonpath/compliance-suite/package.json
  - Compliance suite scripts (`test`) and napa-based dependency sync.

- packages/jsonpath/evaluator/src/evaluator.ts
  - Eager evaluation uses two fast paths (`evaluateSimpleChain`, `evaluateWildcardChain`) before materializing `Array.from(this.stream(ast))`.
  - `isNodeAllowed` is compiled to a no-op function when allow/block paths are empty.
  - Filter function calls prefer `expr.resolvedFn ?? getFunction(expr.name)`.

- packages/jsonpath/compiler/src/compiler.ts
  - Compiler attempts specialized fast paths (`compileSimpleQuery`, `compileWildcardChainQuery`, `compileSimpleRecursiveQuery`).
  - If no specialized fast path, it attempts to build an executable function from generated code via `new Function(...)`.
  - `requiresInterpreter(options)` gates to interpreter when limits/hooks/security restrictions are configured.

- packages/jsonpath/parser/src/nodes.ts
  - `FunctionCallNode` includes `resolvedFn?: FunctionDefinition`.

- packages/jsonpath/parser/src/parser.ts
  - Parser stores `resolvedFn` from `functionRegistry.get(name)` directly on `FunctionCallNode`.

- packages/jsonpath/patch/src/patch.ts
  - `applyPatch` defaults: `strictMode = true`, `mutate = false`, `atomicApply = true`, `validate = false`.
  - When `atomicApply` is enabled, it applies against a clone and only copies back on success.
  - JSON Pointer token parsing handles `~1` and `~0` unescaping; supports `""` root pointer (empty string).

- packages/jsonpath/benchmarks/package.json
  - Bench scripts are `vitest bench` and includes `type-check`.

### Code Search Results

- evaluate wildcard and simple fast paths
  - `evaluateSimpleChain` / `evaluateWildcardChain` located in packages/jsonpath/evaluator/src/evaluator.ts

- compiler fast-path selection / recursive fast path
  - `isWildcardChainAst`, `compileSimpleRecursiveQuery`, `requiresInterpreter` located in packages/jsonpath/compiler/src/compiler.ts

- parser function resolution
  - `resolvedFn` field defined in packages/jsonpath/parser/src/nodes.ts
  - `resolvedFn` assignment located in packages/jsonpath/parser/src/parser.ts

- patch defaults and options
  - `applyPatch` defaults and `atomicApply` behavior located in packages/jsonpath/patch/src/patch.ts

- benchmark scripting and perf regression spec mention
  - `bench` scripts in packages/jsonpath/benchmarks/package.json
  - `performance-regression` references in packages/jsonpath/benchmarks/README.md and artifacts under packages/jsonpath/benchmarks/

### External Research

- #fetch:https://www.rfc-editor.org/rfc/rfc6901
  - Defines JSON Pointer syntax as `""` (whole document) or `/(token)*` with escape decoding `~1` → `/` then `~0` → `~`.
  - Array token `"-"` refers to the (nonexistent) element after the last item (application must define behavior).

- #fetch:https://www.rfc-editor.org/rfc/rfc6902
  - Defines JSON Patch as an array of operations applied sequentially; operations include `add/remove/replace/move/copy/test`.
  - `add` supports `"-"` to append to arrays; `remove`/`replace` require target to exist.
  - Error handling: when a patch operation fails, evaluation should terminate and “entire patch document shall not be deemed successful”; HTTP PATCH is specified as atomic.

- #fetch:https://www.rfc-editor.org/rfc/rfc7386
  - Defines JSON Merge Patch algorithm via `MergePatch(Target, Patch)` pseudocode:
    - If Patch is an object, recursively apply name/value pairs; `null` removes a member.
    - If Patch is not an object, result is Patch (full replacement).
  - Notes the spec is “Obsoleted by RFC 7396” on the RFC Editor page.

- Vitest (Context7: /vitest-dev/vitest/v4.0.7)
  - `vitest bench --outputJson <file>` and `vitest bench --compare <baseline.json>` support storing and comparing benchmark results.
  - Performance tuning options include `--pool=threads|forks` and `--no-isolate`.

- TypeScript docs (Context7: /microsoft/typescript-website)
  - `--noEmit` is a standard mode for “type-check only”.
  - Incremental builds can be combined with `--noEmit` (producing `.tsbuildinfo`).

### Project Conventions

- Standards referenced: AGENTS.md (pnpm + Turborepo conventions, “do not cd into subdirectory”, use `pnpm --filter`).
- Instructions followed: Task Researcher mode (research-only), jsonpath packages are ESM + Vitest.

## Key Discoveries

### Project Structure

- Monorepo uses pnpm workspaces and Turborepo.
- Relevant workspaces in this plan are under `packages/jsonpath/*`.
- Testing is per-package via Vitest (`vitest run`).
- Benchmarks are authored with Vitest benches (`vitest bench`).

### Implementation Patterns

- Evaluator design is “streaming first” internally, but eager `evaluate()` short-circuits to fast paths before materializing the generator.
- “Skip security checks” behavior already exists:
  - When no allow/block path restrictions are configured, `isNodeAllowed` becomes `() => true`.
- Function call resolution is already performed at parse time:
  - Parser stores `resolvedFn` on `FunctionCallNode`.
  - Evaluator uses `expr.resolvedFn ?? getFunction(expr.name)`.
- Compiler currently uses multiple layers:
  - Specialized fast paths for simple chains, wildcard chains, and a simple recursive descent pattern.
  - Executable codegen is attempted via `new Function(...)` when no specialized fast path matches.
  - Interpreter fallback is used when options require limits, circular detection, evaluation hooks, or path restrictions.

### Complete Examples

```ts
// Evaluator eager evaluation: fast paths before stream materialization
// Source: packages/jsonpath/evaluator/src/evaluator.ts
public evaluate(ast: QueryNode): QueryResult {
	const fast = this.evaluateSimpleChain(ast);
	if (fast) return fast;

	const wildcard = this.evaluateWildcardChain(ast);
	if (wildcard) return wildcard;

	const results = Array.from(this.stream(ast));
	const ownedResults = results.map((node) => this.pool.ownFrom(node));
	return new QueryResult(ownedResults);
}
```

```ts
// Parser stores resolved function definition
// Source: packages/jsonpath/parser/src/parser.ts
const resolvedFn = functionRegistry.get(name);
const node: FunctionCallNode = {
	type: NodeType.FunctionCall,
	name,
	args,
	resolvedFn,
};
```

### API and Schema Documentation

- RFC 6901 (JSON Pointer): escaping rules (`~1`, `~0`) and pointer token evaluation.
- RFC 6902 (JSON Patch): operation semantics, array index `"-"` handling for `add`, and atomic-error expectation.
- RFC 7386 (JSON Merge Patch): object-recursive semantics and “non-object patch replaces target”.

### Configuration Examples

```json
// packages/jsonpath/benchmarks/package.json (scripts excerpt)
{
	"scripts": {
		"bench": "vitest bench",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
		"bench:query": "vitest bench --testNamePattern='JSONPath'"
	}
}
```

### Technical Requirements

From plans/jsonpath-performance-optimization/plan.md:

- Close benchmark gaps for wildcard, recursive descent, and large-array scenarios.
- Keep streaming support, but eager evaluation should be default behavior.
- Breaking changes are allowed per the plan’s “Design Decisions”.

## Recommended Approach

Treat the plan’s Steps 1–14 as “verify what already exists, then target remaining hotspots”:

- Step 1 (Wildcard fast path): there is already an eager wildcard-chain fast path (`evaluateWildcardChain`), but the plan’s target is “any position” and “bypass pooling / generator overhead / per-element checks” — verify current `evaluateWildcardChain` coverage and how it differs from the plan’s intended bypasses.
- Step 2 (Inline limit checks): evaluator still centralizes limit checks; the plan’s proposal is to reduce function-call overhead in hot loops.
- Step 3 (Skip security checks): already implemented via a no-op `isNodeAllowed` when restrictions are empty.
- Step 4 (Compile by default): should be treated as “confirm and ensure benchmarks exercise compiled path”, since compilation infrastructure is present.
- Step 7 (Compile-time function resolution): already implemented via `resolvedFn` stored by parser and used by evaluator.
- Step 12 (Recursive descent): compiler has a stack-based fast path for `$..name` / `$..[index]` (single descendant segment) — ensure facade/benchmarks take advantage of this path.

## Implementation Guidance

- **Objectives**: Improve wildcard/recursive/large-array throughput while preserving limit/security semantics when options demand it.
- **Key Tasks**:
  - Map each plan step to the exact repo files and confirm “already present” vs “missing”.
  - For steps proposing breaking behavior (notably patch defaults), reconcile with current defaults and existing tests.
  - Ensure benchmarks hit the intended execution path (compiled vs interpreted) when evaluating improvements.
- **Dependencies**: Changes in evaluator/compiler will impact facade behavior (`@jsonpath/jsonpath`) and benchmarks.
- **Success Criteria**:
  - Benchmarks show substantial wildcard/recursive/array performance improvements.
  - Package tests continue to pass for evaluator/parser/compiler/patch/merge-patch/jsonpath.
  - Performance regression checks (warn-only) continue to run and remain meaningful.

## Per-Step File Map (plan Steps 1–14 → repo files & key symbols)

1. Step 1: Wildcard Fast Path for All Patterns

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: `Evaluator.evaluate`, `evaluateWildcardChain`, `isNodeAllowed`
- packages/jsonpath/evaluator/src/**tests**/\*
  - Tests that should cover wildcard patterns (plan explicitly mentions evaluator.spec.ts)

2. Step 2: Inline Limit Checking in Hot Paths

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: `checkLimits(...)` and its call sites inside selector loops

3. Step 3: Skip Security Checks When Unconfigured

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: constructor assigns `this.isNodeAllowed = () => true`

4. Step 4: Enable Compiled Queries by Default in Facade

- packages/jsonpath/jsonpath/src/facade.ts
  - Symbols: `query`, `compileQuery`

5. Step 5: Add Fast-Path to Evaluator for Non-Compiled Usage

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: `evaluateSimpleChain`, `evaluateWildcardChain`

6. Step 6: Batch Wildcard Collection

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: wildcard selector handling (hot loops), intermediate collection strategy

7. Step 7: Implement Compile-Time Function Resolution

- packages/jsonpath/parser/src/nodes.ts
  - Symbols: `FunctionCallNode.resolvedFn`
- packages/jsonpath/parser/src/parser.ts
  - Symbols: `functionRegistry.get(name)` assignment into `resolvedFn`
- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: `expr.resolvedFn ?? getFunction(expr.name)`

8. Step 8: Lazy Generator Conversion

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: eager `evaluate(...)` materialization (`Array.from(this.stream(...))`) and generator pipeline

9. Step 9: Optimize @jsonpath/patch Performance

- packages/jsonpath/patch/src/patch.ts
  - Symbols: `applyPatch`, options (`mutate`, `atomicApply`, `strictMode`), pointer parsing (`parseTokens`)
- packages/jsonpath/patch/src/**tests**/\*
  - Tests asserting default immutability and behavior under `mutate: true`

10. Step 10: Optimize @jsonpath/merge-patch Apply Performance

- packages/jsonpath/merge-patch/src/merge-patch.ts
  - Symbols: merge patch apply algorithm and `mutate` default

11. Step 11: Reduce Object Allocations in Hot Paths

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: pooled node acquisition (`QueryResultPool`) and per-match allocations

12. Step 12: Optimize Recursive Descent

- packages/jsonpath/evaluator/src/evaluator.ts
  - Symbols: descendant traversal (generator recursion)
- packages/jsonpath/compiler/src/compiler.ts
  - Symbols: `compileSimpleRecursiveQuery`, `isSimpleRecursiveAst`

13. Step 13: Add Performance Regression Tests

- packages/jsonpath/benchmarks/README.md
- packages/jsonpath/benchmarks/src/performance-regression.spec.ts (referenced by README)

14. Step 14: Update Documentation and Benchmarks

- packages/jsonpath/benchmarks/package.json
- docs/api/jsonpath.md
- packages/jsonpath/docs/packages/patch.md

## Commands (copy/paste)

Repo-level (root):

- `pnpm test`
- `pnpm type-check`

Per-package tests:

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/parser test`
- `pnpm --filter @jsonpath/functions test`
- `pnpm --filter @jsonpath/jsonpath test`
- `pnpm --filter @jsonpath/patch test`
- `pnpm --filter @jsonpath/merge-patch test`
- `pnpm --filter @jsonpath/compliance-suite test`

Benchmarks:

- `pnpm --filter @jsonpath/benchmarks bench`
- `pnpm --filter @jsonpath/benchmarks bench:query`
- `pnpm --filter @jsonpath/benchmarks bench:patch`

Type-check specific workspace:

- `pnpm --filter @jsonpath/benchmarks type-check`

## Risks / Unknowns

- Patch behavior vs plan “breaking changes”: current implementation defaults to `mutate=false` and `atomicApply=true`; changing defaults will require updating tests and any downstream expectations.
- Merge patch spec note: the RFC Editor page marks RFC 7386 as obsoleted by RFC 7396; confirm which semantics the package intends to follow.
- Compiler execution path in benchmarks: if benchmarks use facade/compile, recursive fast path in compiler may already apply; if they call evaluator directly, results may reflect interpreter-only performance.
- `new Function(...)` codegen execution: compiling executable code at runtime can have security and environment constraints; changes here should be reviewed carefully.<!-- markdownlint-disable-file -->

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
