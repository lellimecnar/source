<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Performance Optimization (Superseded)

This file is intentionally kept as a stub to avoid carrying outdated conclusions.

Use the current, plan-mapped dossier instead:

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/.copilot-tracking/research/20260106-jsonpath-performance-optimization-plan-research.md

<!--

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/lexer/src/lexer.ts
  - Verified eager tokenization and token buffering.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/lexer/src/**tests**/lexer.spec.ts
  - Verified existing lexer tests and timing-based “benchmark” assertion.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/**tests**/evaluator.spec.ts
  - Verified evaluator functional tests.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/**tests**/security.spec.ts
  - Verified security-related tests.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/parser/src/parser.ts
  - Verified parser exports and existing parse-time function signature validation.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/core/src/types.ts
  - Verified core types for `Path`, `QueryNode`, `QueryResult`, and `EvaluatorOptions`.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/package.json
  - Verified benchmark script (`vitest bench`).

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/\*
  - Verified existing benchmark files.

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/PERFORMANCE_ANALYSIS.md
  - Verified current bottleneck descriptions (path allocation, eager lexing, etc.).

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/README.md
  - Verified user-facing description and example usage.

### Code Search Results

- Search: `"name": "@jsonpath/` in `packages/jsonpath/**/package.json`
  - Found package names (19 matches):
    - @jsonpath/benchmarks
    - @jsonpath/compat-json-p3
    - @jsonpath/compiler
    - @jsonpath/compliance-suite
    - @jsonpath/core
    - @jsonpath/evaluator
    - @jsonpath/functions
    - @jsonpath/jsonpath
    - @jsonpath/lexer
    - @jsonpath/merge-patch
    - @jsonpath/parser
    - @jsonpath/patch
    - @jsonpath/path-builder
    - @jsonpath/plugin-arithmetic
    - @jsonpath/plugin-extras
    - @jsonpath/plugin-extended
    - @jsonpath/plugin-types
    - @jsonpath/pointer
    - @jsonpath/schema

- Search: `"test": "vitest run"` in `packages/jsonpath/**/package.json`
  - Found 18 packages with a `test` script using Vitest.
  - @jsonpath/benchmarks is the notable exception (it has `bench`, not `test`).

## Key Discoveries

### A) Workspace commands relevant to jsonpath packages

Repo-wide:

- `pnpm test` runs `turbo test` (see /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/package.json).
- In `turbo.json`, task `test` depends on `^build`, so tests will build upstream deps first.

Per-package unit tests (all execute from repo root):

- `pnpm --filter @jsonpath/compiler test`
- `pnpm --filter @jsonpath/functions test`
- `pnpm --filter @jsonpath/parser test`
- `pnpm --filter @jsonpath/plugin-extended test`
- `pnpm --filter @jsonpath/path-builder test`
- `pnpm --filter @jsonpath/pointer test`
- `pnpm --filter @jsonpath/plugin-arithmetic test`
- `pnpm --filter @jsonpath/plugin-extras test`
- `pnpm --filter @jsonpath/patch test`
- `pnpm --filter @jsonpath/lexer test`
- `pnpm --filter @jsonpath/jsonpath test`
- `pnpm --filter @jsonpath/plugin-types test`
- `pnpm --filter @jsonpath/schema test`
- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/merge-patch test`
- `pnpm --filter @jsonpath/compat-json-p3 test`
- `pnpm --filter @jsonpath/core test`
- `pnpm --filter @jsonpath/compliance-suite test`

Benchmarks:

- `pnpm --filter @jsonpath/benchmarks bench`
  - This runs `vitest bench` (see /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/package.json).

### B) Per-file inventory (module type, exports, and caching/pooling/path behavior)

Note on “module type”:

- The relevant packages declare `"type": "module"` in their package.json files (examples verified: @jsonpath/jsonpath, @jsonpath/evaluator, @jsonpath/lexer, @jsonpath/parser, @jsonpath/compiler, @jsonpath/benchmarks).
- Therefore, these TS modules compile/ship as ESM.

1. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/facade.ts

- Module type: ESM (package @jsonpath/jsonpath has `"type": "module"`).
- Key exports (exact identifiers):
  - `DEFAULT_PLUGINS`
  - `registerPlugin(plugin)`
  - `parseQuery(query, options?)`
  - `query(root, path, options?)`
  - `queryValues(root, path, options?)`
  - `queryPaths(root, path, options?)`
  - `compileQuery(path, options?)`
  - `value(root, path, options?)`
  - `first` (alias of `value`)
  - `exists(root, path, options?)`
  - `count(root, path, options?)`
  - `toPointer(root, path, options?)`
  - `toPointers(root, path, options?)`
  - `stream(root, path, options?)` (generator)
  - `match` (alias of `query`)
  - `validateQuery(path)`
  - `pointer(root, ptr)`
  - `patch(target, operations, options?)`
  - `mergePatch(target, patchDoc)`
  - Re-exports from local file: `transform`, `transformAll`, `project`, `projectWith`, `pick` (from ./transform.js)
  - Re-exports from packages:
    - `parse` from @jsonpath/parser
    - `evaluate` from @jsonpath/evaluator
    - `compile` from @jsonpath/compiler
    - `JSONPointer`, `RelativeJSONPointer`, `evaluatePointer` from @jsonpath/pointer
    - `applyPatch`, `applyPatchImmutable` from @jsonpath/patch
    - `applyMergePatch`, `createMergePatch` from @jsonpath/merge-patch
    - `JSONPathError`, `JSONPathSyntaxError`, `JSONPathTypeError` from @jsonpath/core
- Caching/pooling/path behavior:
  - Parsed-query (AST) caching via local `getCachedQuery()`/`setCachedQuery()` from ./cache.js.
  - No compiled-query caching is used by `query()` / `queryValues()` / `queryPaths()`; they always interpret the AST via `evaluate(...)`.
  - Side effect at module load: `PluginManager.from({ plugins: DEFAULT_PLUGINS })` registers default plugins globally.

2. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/cache.ts

- Module type: ESM (package @jsonpath/jsonpath has `"type": "module"`).
- Key exports:
  - `getCachedQuery(query)`
  - `setCachedQuery(query, ast)`
  - `clearCache()`
  - `getCacheStats()`
- Caching/pooling/path behavior:
  - Stores parsed AST in `const queryCache = new Map<string, QueryNode>()`.
  - Tracks `hits` and `misses` module-locally.
  - Eviction behavior when at capacity: deletes the first key from `queryCache.keys().next().value`.
    - Note: this is insertion-order eviction (“oldest inserted”), not a true LRU updated on `get`.
  - Caching can be disabled via `getConfig().cache.enabled` (from ./config.js).

3. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/config.ts

- Module type: ESM (package @jsonpath/jsonpath has `"type": "module"`).
- Key exports:
  - `JSONPathConfig` (interface)
  - `configure(options)`
  - `getConfig()`
  - `reset()`
- Caching/pooling/path behavior:
  - Default config is stored as `DEFAULT_CONFIG`.
  - Cache controls in this config only cover the parsed AST cache: `cache.enabled` and `cache.maxSize`.
  - The facade’s `parseQuery()` reads `options?.secure?.maxQueryLength` directly; it does not consult `getConfig().evaluator` for security limits.

4. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/compiler/src/options.ts

- Module type: ESM (package @jsonpath/compiler has `"type": "module"`).
- Key exports:
  - `CompilerOptions` (interface)
  - `defaultCompilerOptions` (const)
- Caching/pooling/path behavior:
  - `defaultCompilerOptions.useCache` is `true`.
  - `defaultCompilerOptions.cacheSize` is `100`.
  - This file defines options only; it does not implement caching itself.

5. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/evaluator.ts

- Module type: ESM (package @jsonpath/evaluator has `"type": "module"`).
- Key exports:
  - `NodeList` (interface)
  - `Evaluator` (class)
  - `evaluate(root, ast, options?)` (function)
  - `stream(root, ast, options?)` (generator function)
- Caching/pooling/path behavior (verified from code):
  - Path allocation is eager and frequent: child nodes are created with `path: [...node.path, seg]` in multiple selector cases and descendant traversal.
  - Circular detection (`detectCircular`) uses a `Set` and passes `new Set(visited)` to recursive calls in `streamDescendants`, creating many Set copies.
  - Security checks are executed per node: `isPathAllowed(node.path)` and `checkLimits(node.path.length, ...)`.
  - No object pooling exists for `QueryResultNode` construction; nodes are plain object literals.

6. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/query-result.ts

- Module type: ESM (package @jsonpath/evaluator has `"type": "module"`).
- Key exports:
  - `QueryResultNode<T>` (type alias): `export type QueryResultNode<T = unknown> = CoreQueryNode<T>;`
  - `QueryResult<T>` (class)
- Caching/pooling/path behavior:
  - `QueryResult.paths()` returns clones: `this.results.map((r) => [...r.path])`.
  - `QueryResult.pointers()` creates new `JSONPointer` objects for each call.
  - `QueryResult.pointerStrings()` constructs pointer strings each call.
  - `QueryResult.normalizedPaths()` constructs normalized strings each call.
  - `QueryResult.parents()` deduplicates by pointer string computed from `n.path.slice(0, -1)`.
  - No memoization of pointer/normalized path results at QueryResult level.

7. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/lexer/src/lexer.ts

- Module type: ESM (package @jsonpath/lexer has `"type": "module"`).
- Key exports:
  - `LexerInterface` (re-exported type)
  - `Lexer` (class)
- Caching/pooling/path behavior:
  - Eager tokenization: `constructor(public readonly input: string) { this.tokenizeAll(); }`.
  - Tokens are stored in a private `tokens: Token[]` array.
  - Cursoring uses `tokenIndex` over the token array.
  - Unicode escape handling in `readString()` uses a regex check (`/^[0-9a-fA-F]{4}$/`) and `parseInt(hex, 16)`.

8. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/lexer/src/**tests**/lexer.spec.ts

- Module type: ESM (package @jsonpath/lexer has `"type": "module"`).
- Key tested imports/identifiers:
  - `tokenize`, `TokenType` (imported from `../index.js`)
- Observed behaviors validated by tests:
  - Structural tokens, recursive descent, string escapes, numbers, literals, operator tokens.
  - Contains a timing-based performance assertion: 10,000 tokenizations in < 1000ms.

9. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/**tests**/evaluator.spec.ts

- Module type: ESM (package @jsonpath/evaluator has `"type": "module"`).
- Key tested imports/identifiers:
  - `parse` from @jsonpath/parser
  - `evaluate` from `../evaluator.js`
- Path behaviors exercised:
  - `result.nodes()[0].path` is asserted in the “parent selector (^)” test.

10. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/**tests**/security.spec.ts

- Module type: ESM (package @jsonpath/evaluator has `"type": "module"`).
- Key tested imports/identifiers:
  - `evaluate` from `../evaluator.js`
  - `parse` from @jsonpath/parser
- Path/security behaviors exercised:
  - `secure.blockPaths` and `secure.allowPaths` are validated via `pointerStrings()` results.

11. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/parser/src/parser.ts

- Module type: ESM (package @jsonpath/parser has `"type": "module"`).
- Key exports:
  - `Parser` (class)
  - `parse(input, options?)` (function)
  - `parseExpression(input, options?)` (function)
- Caching/pooling/path behavior:
  - Instantiates `Lexer` when given a string: `this.lexer = typeof input === 'string' ? new Lexer(input) : input;`.
  - Performs parse-time validation of function calls (signature checks) using `functionRegistry`.
  - Does not persist “arg types” onto the AST nodes in this file.

12. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/core/src/types.ts

- Module type: ESM (package @jsonpath/core has `"type": "module"`).
- Key exports (selected, relevant):
  - `PathSegment`, `Path`
  - `QueryNode<T>` (interface) with `readonly path: Path`
  - `QueryResult<T>` (interface)
  - `EvaluatorOptions`, `ParserOptions`, `SecureQueryOptions`
- Path behavior:
  - `QueryNode.path` is declared as `readonly Path` (i.e., `readonly PathSegment[]`).

13. packages/jsonpath/benchmarks/src (files present)

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/basic.bench.ts
- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/compiler.bench.ts
- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/expressions.bench.ts
- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/patch.bench.ts
- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/pointer.bench.ts
- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/query.bench.ts

14. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/PERFORMANCE_ANALYSIS.md

- Present.
- Highlights (verbatim topics): path array allocation in evaluator, eager lexer tokenization, security-path overhead, and runtime type checking in filters.

15. /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/README.md

- Present.
- Mentions facade usage (`query`), plugin registration (`registerPlugin`), path builder, JSON Patch, Relative JSON Pointer.

### C) Plan mismatches (plans/jsonpath-performance/plan.md vs actual code)

Step 1 mismatches:

- Plan Step 1 expects “compiled query caching by default” in the facade.
  - Actual facade functions `query`, `queryValues`, `queryPaths`, `value`, `exists`, `count` do not call `compileQuery()` and do not use `CompiledQuery` at all; they interpret via `evaluate()`.
- Plan Step 1 expects a `CompiledQueryCache` (LRU) plus `clearCompiledCache()` and `setCompiledCacheSize(size)`.
  - Actual `packages/jsonpath/jsonpath/src/cache.ts` only caches parsed AST (`QueryNode`) and exports `clearCache()` / `getCacheStats()`; no compiled cache exists.
- Plan Step 1 suggests “Simple LRU” behavior.
  - Actual AST cache eviction is deletion of the first inserted key; `getCachedQuery()` does not update recency, so it is not an LRU.

Step 2 mismatches:

- Plan Step 2 assumes `QueryResultNode` can be changed from a type alias into a richer interface with internal `_pathParent`, `_pathSegment`, `_cachedPath`, `_cachedPointer`, `_depth`.
  - Actual `packages/jsonpath/evaluator/src/query-result.ts` exports `QueryResultNode` as a type alias to `@jsonpath/core`’s `QueryNode<T>`.
  - Actual `packages/jsonpath/evaluator/src/evaluator.ts` creates nodes as plain object literals with concrete `path: PathSegment[]` arrays.

Step 3 mismatches:

- Plan Step 3 requires a new file `packages/jsonpath/evaluator/src/query-result-pool.ts`.
  - No such file exists in the workspace.

Step 4 mismatches:

- Plan Step 4 expects a compiled node predicate (`isNodeAllowed(node)`), and avoiding `node.path` materialization.
  - Actual evaluator method is `isPathAllowed(path: Path): boolean` and callers pass `node.path` (already materialized arrays).

Step 5 mismatches:

- Plan Step 5 expects lexer “lazy tokenization” (no constructor tokenization).
  - Actual `Lexer` constructor calls `tokenizeAll()`.

Step 6 mismatches:

- Plan Step 6 expects a singleton NOOP AbortSignal.
  - Actual `packages/jsonpath/evaluator/src/options.ts` uses `signal: options?.signal ?? new AbortController().signal` (allocates per call).

Step 7 mismatches:

- Plan Step 7 expects directory `packages/jsonpath/evaluator/src/selectors/` with per-selector handlers.
  - No such directory exists; `streamSelector()` in `evaluator.ts` is currently a large `switch`.

Step 8 mismatches:

- Plan Step 8 expects removal of regex-based unicode quad validation and `parseInt` from lexer hot path.
  - Actual lexer uses `/^[0-9a-fA-F]{4}$/` and `parseInt(hex, 16)` in `readString()`.

Step 9 mismatches:

- Plan Step 9 file list includes `packages/jsonpath/core/src/types.ts` for AST augmentation (`FunctionCallNode.argTypes`).
  - In the actual repo, AST node types (including `FunctionCallNode`) are defined in `packages/jsonpath/parser/src/nodes.ts` (verified by file existence).
  - `packages/jsonpath/parser/src/parser.ts` already performs parse-time function argument validation, but does not store `argTypes` on nodes.

Step 10 mismatches:

- Plan Step 10 expects new benchmark files:
  - `packages/jsonpath/benchmarks/src/detailed.bench.ts`
  - `packages/jsonpath/benchmarks/src/regression.bench.ts`
  - These files do not exist; current benchmark files are limited to the six listed above.

Step 11 mismatches:

- Plan Step 11 expects a new docs file `packages/jsonpath/docs/PERFORMANCE.md`.
  - `packages/jsonpath/docs/` exists, but no `PERFORMANCE.md` was found (directory listing shows README.md plus api/examples/guides/packages).

### D) Step-by-step mapping (Steps 1–11)

This maps the plan’s steps to concrete file changes in this repo (where tests should go is based on existing test layout under each package’s `src/__tests__`).

Step 1: Enable compiled query caching by default

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/facade.ts
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/cache.ts
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/src/config.ts
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/compiler/src/options.ts (only if option surface must change)
- Create (per plan): a compiled-query cache implementation somewhere under `packages/jsonpath/jsonpath/src/` (plan calls it “CompiledQueryCache”).
- Tests:
  - Add under `packages/jsonpath/jsonpath/src/__tests__/` (new file(s) like `cache.spec.ts`), focusing on cache hit/miss/eviction and any `clearCompiledCache` / `setCompiledCacheSize` APIs.
  - Bench validation uses existing benchmark file: `packages/jsonpath/benchmarks/src/query.bench.ts` (currently benchmarks `queryValues`).

Step 2: Lazy path computation in evaluator

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/evaluator.ts
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/query-result.ts
- Tests:
  - Update/add under `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts` (path/normalized-path assertions, plus caching/stability assertions if path becomes a getter).

Step 3: Object pooling for QueryResultNode

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/evaluator.ts
- Create (per plan):
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/query-result-pool.ts
- Tests:
  - Add under `packages/jsonpath/evaluator/src/__tests__/` (new spec file) to ensure reused Evaluator instances don’t mutate previously returned result nodes.

Step 4: Compile-time security check optimization

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/evaluator.ts
- Tests:
  - Ensure existing tests still pass: `packages/jsonpath/evaluator/src/__tests__/security.spec.ts`.

Step 5: Lazy tokenization in lexer

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/lexer/src/lexer.ts
- Tests:
  - Update `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts` to cover `Lexer.peek()`, `Lexer.peekAhead(n)`, EOF behavior, and not depending on eager constructor tokenization.

Step 6: Singleton AbortController signal

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/options.ts
  - (Plan mentions) /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/core/src/index.ts (only if a shared util location is required)
- Tests:
  - Existing timeout/abort tests are in `packages/jsonpath/evaluator/src/__tests__/security.spec.ts` (timeout test uses `Date.now` mocking).

Step 7: Monomorphic selector handlers

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/evaluator.ts
- Create (per plan):
  - Directory: /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/selectors/
  - Files (per plan):
    - name-selector.ts
    - index-selector.ts
    - wildcard-selector.ts
    - slice-selector.ts
    - filter-selector.ts
- Tests:
  - Existing evaluator correctness tests remain in `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`.

Step 8: Optimize string operations in lexer

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/lexer/src/lexer.ts
- Tests:
  - Existing unicode escape test is in `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts`.

Step 9: Filter expression type pre-computation

- Change (correcting the plan’s file list to match repo structure):
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/parser/src/parser.ts
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/parser/src/nodes.ts
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/evaluator/src/evaluator.ts
  - (Only if the type hints are meant to be part of core public types) /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/core/src/types.ts
- Tests:
  - Add parser tests under `packages/jsonpath/parser/src/__tests__/` (if present in package) and evaluator tests under `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`.

Step 10: Add comprehensive performance benchmarks

- Create (per plan):
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/detailed.bench.ts
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/benchmarks/src/regression.bench.ts
- Bench runner:
  - `pnpm --filter @jsonpath/benchmarks bench`

Step 11: Documentation and migration guide

- Change:
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/PERFORMANCE_ANALYSIS.md
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/jsonpath/README.md
- Create (per plan):
  - /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/packages/jsonpath/docs/PERFORMANCE.md
    - `packages/jsonpath/benchmarks/src/compiler.bench.ts`
    - `packages/jsonpath/benchmarks/src/query.bench.ts`

## Step 2: Lazy Path Computation in Evaluator (P1)

- **Exact files to edit/create**
  - Edit: `packages/jsonpath/evaluator/src/evaluator.ts`
  - Edit: `packages/jsonpath/evaluator/src/query-result.ts`
  - (Optional) Create helper module for path materialization if you don’t want it exported from `query-result.ts`.

- **Existing relevant symbols / current behavior**
  - `export type QueryResultNode<T> = CoreQueryNode<T>` in `query-result.ts`.
  - Evaluator emits object literals with `path: PathSegment[]` and frequently creates new arrays via `[...node.path, seg]`.
  - `QueryResult.paths()` clones paths: `return this.results.map((r) => [...r.path]);`.
  - Security and limit checks call `node.path` and `node.path.length` in `streamDescendants` and `streamSelector`.

- **Minimal change strategy**
  - Preserve the `path` property contract from `@jsonpath/core` (it expects a property, not a function).
  - Replace `QueryResultNode` alias with an interface extending core `QueryNode` that adds internal fields (parent pointer/segment + cached materializations).
  - Update evaluator to store parent pointers instead of allocating arrays, but keep `.path` available via cached getter.

- **Test file locations and patterns**
  - Existing correctness tests that assert paths:
    - `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts` (checks `result.nodes()[0].path` and normalized paths)
  - Add new tests in evaluator package asserting path caching stability if implemented (pattern: vitest `describe/it/expect`).

## Step 3: Object Pooling for QueryResultNode (P1)

- **Exact files to edit/create**
  - Edit: `packages/jsonpath/evaluator/src/evaluator.ts`
  - Create: `packages/jsonpath/evaluator/src/query-result-pool.ts` (matches plan)
  - Edit: `packages/jsonpath/evaluator/src/query-result.ts` if the pool needs helpers/getters.

- **Existing relevant symbols / current behavior**
  - Evaluator constructs result nodes as plain object literals in multiple switch branches.
  - `Evaluator.evaluate(ast)` returns `new QueryResult(Array.from(this.stream(ast)))`.
  - Reuse risk exists if users reuse a single `Evaluator` instance directly (class is exported).

- **Minimal change strategy**
  - Keep `QueryResult` holding “owned” nodes (never mutated later).
  - Use pooling only for intermediate traversal nodes if needed; allocate owned nodes for final yielded results, or ensure pool reset per `stream()` and never reuse objects that escape.

- **Test file locations and patterns**
  - Add a regression test under `packages/jsonpath/evaluator/src/__tests__/` that reuses a single `Evaluator` instance and ensures first result nodes remain unchanged after a second evaluation.

## Step 4: Compile-Time Security Check Optimization (P1)

- **Exact files to edit/create**
  - Edit: `packages/jsonpath/evaluator/src/evaluator.ts`

- **Existing relevant symbols / current behavior**
  - `private isPathAllowed(path: Path): boolean` in evaluator computes pointer strings from `path`.
  - It is called in `streamDescendants` and in selector branches.

- **Minimal change strategy**
  - Replace `isPathAllowed(path)` with a precompiled predicate stored on the Evaluator instance.
  - If Step 2 introduces pointer-chain nodes, you can compute pointer strings without materializing `PathSegment[]`.
  - Preserve semantics validated by security tests (allow/block behavior including root handling).

- **Test file locations and patterns**
  - Existing: `packages/jsonpath/evaluator/src/__tests__/security.spec.ts` has allow/block path tests using `.pointerStrings()`.

## Step 5: Lazy Tokenization in Lexer (P1)

- **Exact files to edit/create**
  - Edit: `packages/jsonpath/lexer/src/lexer.ts`
  - Edit: `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts`
  - (Indirect consumer) `packages/jsonpath/parser/src/parser.ts` constructs `new Lexer(input)`.

- **Existing relevant symbols / current behavior**
  - `Lexer` constructor calls `this.tokenizeAll()`.
  - `next()/peek()/peekAhead()` currently assume tokens already exist and return last token as EOF.
  - Lexer public export surface comes from `packages/jsonpath/lexer/src/index.ts` (`export * from './lexer.js'` etc.).

- **Minimal change strategy**
  - Do not change public API signatures (`Lexer`, `TokenType`, `Token`, `LexerInterface`).
  - Implement internal `ensureTokenized(index)` and `tokenizeNext()` while keeping token creation logic shared.
  - Update `isAtEnd()` to be driven by `peek().type === TokenType.EOF`.

- **Test file locations and patterns**
  - Existing lexer tests: `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts`.
  - Add tests for `Lexer.peekAhead` and repeated EOF semantics if lazy tokenization is implemented.

## Step 6: Singleton AbortController Signal (P2)

- **Exact files to edit/create**
  - Edit: `packages/jsonpath/evaluator/src/options.ts`

- **Existing relevant symbols / current behavior**
  - `withDefaults(options?)` sets `signal: options?.signal ?? new AbortController().signal` (allocates each call).

- **Minimal change strategy**
  - Replace per-call `new AbortController().signal` with a module-level singleton.
  - Keep behavior: default signal is never aborted.

- **Test file locations and patterns**
  - Existing abort/timeout tests in `packages/jsonpath/evaluator/src/__tests__/options.spec.ts` and `security.spec.ts`.

## Step 7: Monomorphic Selector Handlers (P2)

- **Exact files to edit/create**
  - Edit: `packages/jsonpath/evaluator/src/evaluator.ts`
  - Create directory: `packages/jsonpath/evaluator/src/selectors/`
  - Create handler modules per selector type (as plan suggests).

- **Existing relevant symbols / current behavior**
  - `Evaluator.streamSelector(selector, node)` is a large switch on `selector.type`.

- **Minimal change strategy**
  - Extract each selector type into its own function that returns a generator.
  - Keep Evaluator state access explicit (pass context object rather than relying on closures).

- **Test file locations and patterns**
  - Existing evaluator tests cover all selector types, so this is mostly a refactor with regression protection via:
    - `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`

## Step 8: Optimize String Operations in Lexer (P2)

- **Exact files to edit/create**
  - Edit: `packages/jsonpath/lexer/src/lexer.ts`

- **Existing relevant symbols / current behavior**
  - `readString()` currently validates unicode escapes using regex and parses via `parseInt(hex, 16)`.

- **Minimal change strategy**
  - Replace regex/parseInt with `charCodeAt` nibble decoding helpers.
  - Preserve surrogate-pair behavior and thrown error messages.

- **Test file locations and patterns**
  - Existing unicode test: `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts` includes `"\\u0041"`.

## Step 9: Filter Expression Type Pre-computation (P2)

- **Exact files to edit/create (repo reality)**
  - Edit: `packages/jsonpath/parser/src/nodes.ts` (this is where `FunctionCallNode` is defined)
  - Edit: `packages/jsonpath/parser/src/parser.ts` (where function calls are constructed)
  - Edit: `packages/jsonpath/evaluator/src/evaluator.ts` (FunctionCall evaluation)
  - (Plan mentions `packages/jsonpath/core/src/types.ts`, but AST nodes are not defined there.)

- **Existing relevant symbols / current behavior**
  - Parser creates `FunctionCallNode` with `name` and `args` and validates it (`validateFunctionCall`).
  - Parser already has `getExpressionType(...)` and knows the expected signature from builtins/`functionRegistry`.
  - Evaluator’s `NodeType.FunctionCall` branch performs runtime type discrimination for each arg.

- **Minimal change strategy**
  - Add optional field to `FunctionCallNode` in `parser/src/nodes.ts` (e.g., `argTypes?: ParameterType[]`).
  - Populate it in `parser.ts` when constructing the node (reusing `getExpressionType`).
  - Teach evaluator to use precomputed types to skip some runtime checks.

- **Test file locations and patterns**
  - Existing: `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts` includes function calls like `length(@.title)`.
  - Benchmark validation:
    - `packages/jsonpath/benchmarks/src/expressions.bench.ts`

## Step 10: Add Comprehensive Performance Benchmarks (P2)

- **Exact files to edit/create**
  - Create: `packages/jsonpath/benchmarks/src/detailed.bench.ts`
  - Create: `packages/jsonpath/benchmarks/src/regression.bench.ts`

- **Existing relevant symbols / current behavior**
  - Current benchmarks already exist:
    - `basic.bench.ts` (compares @jsonpath/jsonpath vs jsonpath vs jsonpath-plus)
    - `query.bench.ts` (`queryValues()` with titles + filter)
    - `compiler.bench.ts` (uses long-lived `new Compiler()` and includes cache-hit benchmark)
    - `expressions.bench.ts` (filter + functions)

- **Minimal change strategy**
  - Follow existing patterns: `import { bench, describe } from 'vitest'`.
  - Keep benchmark data in-module constants; avoid cross-file framework.

- **Test file locations and patterns**
  - Benchmarks are not unit tests; run via `pnpm --filter @jsonpath/benchmarks bench`.

## Step 11: Documentation and Migration Guide

- **Exact files to edit/create (repo reality)**
  - Edit: `packages/jsonpath/PERFORMANCE_ANALYSIS.md`
  - Edit: `packages/jsonpath/jsonpath/README.md`
  - Consider editing existing guide: `packages/jsonpath/docs/guides/performance.md` rather than creating a new top-level docs file.

- **Existing relevant symbols / current behavior**
  - `packages/jsonpath/docs/guides/performance.md` contains examples that currently do not match the facade/compiler API (see mismatches).

- **Minimal change strategy**
  - Update docs to reflect actual exported functions (`compileQuery` vs `compile`, `configure({ evaluator: ... })` vs top-level keys).

- **Test file locations and patterns**
  - Documentation validation is manual; ensure examples align with real exports.

---

# Plan Mismatches With Repo Reality

1. “Compiled query caching already exists and is opt-in” (plan Step 1) is only partially true

- `@jsonpath/compiler` has an LRU cache, but it is scoped to a `Compiler` instance.
- Facade’s `compileQuery()` calls top-level `compile(ast)` which creates a **new** `Compiler` per call, so caching is not shared.

2. `packages/jsonpath/jsonpath/src/cache.ts` is not an LRU cache

- Eviction deletes the first inserted entry; `getCachedQuery()` does not refresh recency.

3. Plan Step 9 references `packages/jsonpath/core/src/types.ts` for AST node changes

- AST node types live in `packages/jsonpath/parser/src/nodes.ts`.

4. Docs vs API mismatches already present in repo docs

- `packages/jsonpath/docs/guides/performance.md` shows `import { compile } from '@jsonpath/jsonpath'` and then `compile('$.user.name')`, but `@jsonpath/compiler`’s `compile` requires a `QueryNode` (AST), not a string.
- `packages/jsonpath/docs/guides/performance.md` references `clearCache` from `@jsonpath/compiler`, but no `clearCache` exists in compiler sources.
- `packages/jsonpath/docs/guides/security.md` shows `configure({ maxResults, maxDepth, timeout, maxInputSize })` at top-level; actual global config shape is `{ evaluator: ..., cache: ... }` and does not include `maxInputSize`.

5. Plan Step 11 proposes a new `packages/jsonpath/docs/PERFORMANCE.md`

- The repo’s jsonpath docs are already organized under `packages/jsonpath/docs/guides/*`; adding a top-level `PERFORMANCE.md` would introduce a parallel doc structure unless that’s explicitly desired.

- **Risk:** Lazy path computation may break existing code expecting eager paths
  - **Mitigation:** Internal change only; QueryResult API remains unchanged
- **Risk:** Object pooling may cause reference bugs
  - **Mitigation:** Reset pool at start of each query; thorough testing
- **Risk:** Compiled queries may have correctness issues
  - **Mitigation:** Compiler already exists with test coverage; gradual rollout

-->
