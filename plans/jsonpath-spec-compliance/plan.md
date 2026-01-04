# JSONPath Specification Compliance Implementation

**Branch:** `feat/jsonpath-spec-compliance`
**Description:** Bring @jsonpath/\* packages to 100% specification compliance with RFC 9535, RFC 6901, RFC 6902, and RFC 7386.

## Goal

Elevate the @jsonpath/\* suite from 18% specification compliance to 100%, establishing production-ready JSONPath, JSON Pointer, JSON Patch, and JSON Merge Patch implementations that are RFC-compliant, tree-shakeable, type-safe, and performant.

---

## Phase 1: Core Foundation (P0 Critical)

### Step 1.1: Unify Function Registry Architecture

**Files:**

- `packages/jsonpath/core/src/registry.ts`
- `packages/jsonpath/core/src/types.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/functions/src/registry.ts`
- `packages/jsonpath/functions/src/index.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:** Remove the duplicate `FunctionRegistry` class from `@jsonpath/functions` and extend `@jsonpath/core` registry with full management API (`unregisterFunction`, `getFunction`, `hasFunction`). Update evaluator to use the unified core registry. Align `FunctionDefinition` interface with spec requirements (`signature`, `returns` properties).

**Testing:**

- Unit tests for registry management functions
- Verify evaluator correctly resolves functions from core registry
- Test function registration/unregistration lifecycle

---

### Step 1.2: Complete QueryResult Interface

**Files:**

- `packages/jsonpath/evaluator/src/query-result.ts`
- `packages/jsonpath/core/src/types.ts`

**What:** Rewrite `QueryResult` class to match specification:

- Convert getters to methods (`values()`, `paths()`, `nodes()`)
- Add missing methods: `pointers()`, `normalizedPaths()`, `last()`, `isEmpty()`, `map()`, `filter()`, `forEach()`, `parents()`
- Implement `[Symbol.iterator]()` for iteration
- Update `QueryResultNode` to include `root`, `parent`, `parentKey` properties
- Change path storage from `string[]` to `PathSegment[]`

**Testing:**

- Unit tests for all QueryResult methods
- Integration test with evaluator
- Verify iterator protocol works correctly
- Test parent chain traversal

---

### Step 1.3: Implement EvaluatorOptions & Security

**Files:**

- `packages/jsonpath/core/src/types.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/options.ts` (new)

**What:** Implement `EvaluatorOptions` interface with:

- Resource limits: `maxDepth`, `maxResults`, `maxNodes`, `maxFilterDepth`
- Timeout: `timeout` with AbortController pattern
- Circular reference detection: `detectCircular`

Implement `SecureQueryOptions`:

- Path allowlists/blocklists: `allowPaths`, `blockPaths`
- Feature toggles: `noRecursive`, `noFilters`
- Query length limit: `maxQueryLength`

**Testing:**

- Test maxDepth enforcement with deeply nested data
- Test timeout with long-running queries
- Test circular reference detection
- Test secure query path restrictions

---

### Step 1.4: Fix Slice Normalization (RFC 9535 §2.3.4.2)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/parser/src/ast.ts` (rename properties)

**What:** Implement RFC 9535 compliant slice normalization:

- Proper negative index handling
- Step=0 throws error
- Correct bounds calculation per specification
- Rename slice properties from `startValue/endValue/stepValue` to `start/end/step`

**Testing:**

- RFC 9535 slice test vectors
- Negative index edge cases
- Step=0 error case
- Empty result cases

---

### Step 1.5: Extend Error Infrastructure

**Files:**

- `packages/jsonpath/core/src/errors.ts`
- `packages/jsonpath/core/src/types.ts`

**What:** Add missing error codes:

- `UNEXPECTED_TOKEN`, `UNEXPECTED_END`, `INVALID_ESCAPE`, `INVALID_NUMBER`
- `UNKNOWN_FUNCTION`, `MAX_DEPTH_EXCEEDED`, `TIMEOUT`
- `INVALID_ARRAY_INDEX`, `TEST_FAILED`, `PATH_NOT_FOUND`

Extend error classes:

- `JSONPathSyntaxError`: add `expected`, `found`, `path`
- `JSONPathTypeError`: add `expectedType`, `actualType`
- `JSONPatchError`: add `operationIndex`, `operation`

**Testing:**

- Verify error codes are correctly thrown
- Test error message formatting with extended properties
- Test error serialization

---

## Phase 2: Pointer & Patch Completion (P0/P1)

### Step 2.1: Implement Pointer Mutation Functions

**Files:**

- `packages/jsonpath/pointer/src/pointer.ts`
- `packages/jsonpath/pointer/src/mutations.ts` (new)
- `packages/jsonpath/pointer/src/index.ts`

**What:** Add immutable mutation operations:

- `set<T>(pointer, data, value): T` - returns new structure with value set
- `remove<T>(pointer, data): T` - returns new structure with path removed
- `append<T>(pointer, data, value): T` - appends to array at path

All operations use structural sharing for efficiency.

**Testing:**

- Test immutability (original data unchanged)
- Test nested object/array mutations
- Test error cases (invalid paths, type mismatches)

---

### Step 2.2: Add Pointer Utilities & Validation

**Files:**

- `packages/jsonpath/pointer/src/utils.ts` (new)
- `packages/jsonpath/pointer/src/validation.ts` (new)
- `packages/jsonpath/pointer/src/index.ts`

**What:** Implement utility functions:

- `parent(pointer): string`
- `join(...pointers): string`
- `split(pointer): string[]`
- `escape(token): string`, `unescape(token): string` (export existing)
- `toNormalizedPath(pointer): string`, `fromNormalizedPath(path): string`

Implement validation:

- `isValid(pointer): boolean`
- `validate(pointer): ValidationResult`
- Fix array index validation (no leading zeros except "0")

**Testing:**

- Test join/split roundtrip
- Test escape/unescape with special characters
- Test validation with valid/invalid pointers
- Test array index edge cases

---

### Step 2.3: Add Pointer Resolution Variants

**Files:**

- `packages/jsonpath/pointer/src/resolve.ts` (new)
- `packages/jsonpath/pointer/src/index.ts`

**What:** Implement resolution functions:

- `resolve<T>(pointer, data): T | undefined` (standalone)
- `resolveOrThrow<T>(pointer, data): T`
- `exists(pointer, data): boolean`
- `resolveWithParent<T>(pointer, data): { value: T; parent: unknown; key: PathSegment }`

Export as standalone functions in addition to class methods.

**Testing:**

- Test resolution with various data structures
- Test error throwing behavior
- Test exists with present/absent paths
- Test parent resolution

---

### Step 2.4: Implement JSON Patch diff()

**Files:**

- `packages/jsonpath/patch/src/diff.ts` (new)
- `packages/jsonpath/patch/src/types.ts`
- `packages/jsonpath/patch/src/index.ts`

**What:** Implement `diff(source, target, options): PatchOperation[]`:

- Generate minimal patch operations to transform source to target
- Support `DiffOptions`: `invertible` (generates replace instead of remove+add)
- Handle arrays (positional diffing)

**Testing:**

- Test object diffing
- Test array diffing
- Test nested structure diffing
- Verify roundtrip: `apply(diff(a, b), a) === b`

---

### Step 2.5: Implement PatchBuilder Fluent API

**Files:**

- `packages/jsonpath/patch/src/builder.ts` (new)
- `packages/jsonpath/patch/src/index.ts`

**What:** Implement `PatchBuilder` class:

- Fluent methods: `add()`, `remove()`, `replace()`, `move()`, `copy()`, `test()`
- Conditional operations: `when()`, `ifExists()`, `ifNotExists()`
- Output methods: `toOperations()`, `toJSON()`, `apply()`

**Testing:**

- Test fluent API chaining
- Test conditional operations
- Test apply method
- Test JSON serialization

---

### Step 2.6: Add ApplyOptions & applyWithInverse

**Files:**

- `packages/jsonpath/patch/src/apply.ts`
- `packages/jsonpath/patch/src/types.ts`
- `packages/jsonpath/patch/src/index.ts`

**What:** Implement `ApplyOptions`:

- `mutate?: boolean` - whether to mutate or clone
- `validate?: boolean` - validate operations before applying
- `continueOnError?: boolean` - continue on failures
- `inverse?: boolean` - generate inverse patch
- `before/after` hooks

Implement `applyWithInverse()` returning `{ result, inverse }`.

**Testing:**

- Test mutate mode
- Test validation mode
- Test error continuation
- Test inverse patch generation and application

---

## Phase 3: Facade & Configuration (P1)

### Step 3.1: Implement Configuration System

**Files:**

- `packages/jsonpath/jsonpath/src/config.ts` (new)
- `packages/jsonpath/jsonpath/src/index.ts`

**What:** Implement configuration API:

- `configure(options: Partial<JSONPathConfig>): void`
- `getConfig(): Readonly<JSONPathConfig>`
- `reset(): void`

Configuration includes default options for parsing, evaluation, compilation.

**Testing:**

- Test configuration persistence
- Test reset behavior
- Test config merging

---

### Step 3.2: Add Query Convenience Functions

**Files:**

- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/jsonpath/src/index.ts`

**What:** Implement missing query functions:

- `match(path, data, options)` - returns first match or undefined
- `value(path, data, options)` - returns first value
- `exists(path, data, options)` - returns boolean
- `count(path, data, options)` - returns match count
- `stream(path, data, options)` - generator function
- `validateQuery(path)` - validates query syntax

**Testing:**

- Test each convenience function
- Test with various query patterns
- Test stream with large datasets
- Test validation with valid/invalid queries

---

### Step 3.3: Implement Cache Management

**Files:**

- `packages/jsonpath/jsonpath/src/cache.ts` (new)
- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/jsonpath/src/index.ts`

**What:** Implement cache management:

- `clearCache()` - clears compiled query cache
- `getCacheStats(): CacheStats` - returns hit/miss statistics

`CacheStats` interface with `size`, `hits`, `misses`, `hitRate`.

**Testing:**

- Test cache clearing
- Test statistics accuracy
- Test cache behavior with repeated queries

---

### Step 3.4: Implement Transformation API

**Files:**

- `packages/jsonpath/jsonpath/src/transform.ts` (new)
- `packages/jsonpath/jsonpath/src/index.ts`

**What:** Implement transformation functions:

- `transform(data, path, fn)` - transform values at path
- `transformAll(data, transforms)` - apply multiple transforms
- `project(data, projection)` - create projection from paths
- `pick(data, paths)` - pick specific paths
- `omit(data, paths)` - omit specific paths
- `merge(target, ...sources)` - deep merge
- `mergeWith(target, sources, options)` - merge with custom resolver

**Testing:**

- Test each transformation function
- Test with nested structures
- Test merge conflict resolution

---

## Phase 4: Compiler & Performance (P1)

### Step 4.1: Implement Full Cached JIT Compiler

**Files:**

- `packages/jsonpath/compiler/src/compiler.ts`
- `packages/jsonpath/compiler/src/codegen.ts` (new)
- `packages/jsonpath/compiler/src/cache.ts` (new)
- `packages/jsonpath/compiler/src/index.ts`

**What:** Implement full JIT compilation with caching:

- Generate optimized JavaScript functions from AST using `new Function()`
- Inline simple selectors (name, index, wildcard)
- Hoist invariant expressions outside loops
- Short-circuit evaluation for filters
- Cache compiled functions keyed by normalized query string
- Add `source` property exposing generated JS code
- Add `ast` property for debugging/introspection
- Track `compilationTime` in milliseconds
- LRU cache eviction for memory management

**Testing:**

- Test generated code correctness against interpreted results
- Verify cache hit/miss behavior
- Test performance improvement (target: 5x+ over interpreted)
- Test source access and readability
- Benchmark compiled vs interpreted evaluation

---

### Step 4.2: Add Compiler Options

**Files:**

- `packages/jsonpath/compiler/src/compiler.ts`
- `packages/jsonpath/compiler/src/types.ts`
- `packages/jsonpath/compiler/src/index.ts`

**What:** Implement `CompilerOptions`:

- `sourceMap?: boolean` - generate source maps
- `optimizeForSmall?: boolean` - optimize for bundle size
- `unsafe?: boolean` - skip runtime checks

Add `Compiler` class with constructor accepting options.
Add `compileQuery(query: string, options?)` convenience function.

**Testing:**

- Test each option's effect
- Test Compiler class instantiation
- Test compileQuery with string input

---

### Step 4.3: Integrate Official Compliance Test Suites

**Files:**

- `packages/jsonpath/package.json` (add napa config)
- `packages/jsonpath/evaluator/__tests__/compliance.spec.ts` (new)
- `packages/jsonpath/pointer/__tests__/compliance.spec.ts` (new)
- `packages/jsonpath/patch/__tests__/compliance.spec.ts` (new)
- `packages/jsonpath/napa-packages/` (gitignored, napa output)

**What:** Integrate official test suites via napa:

- Add `jsonpath-compliance-test-suite` from jsonpath-standard org as devDependency
- Add `napa` for installing non-npm packages
- Create test runners that load and execute all compliance tests
- Map test suite format to Vitest assertions
- Run all tests and ensure 100% pass rate
- Add npm script: `test:compliance`

**Testing:**

- All JSONPath Compliance Test Suite tests pass
- All JSON Pointer RFC 6901 tests pass
- All JSON Patch RFC 6902 tests pass
- CI runs compliance tests on every PR

---

## Phase 5: Extensions & Polish (P2)

### Step 5.1: Implement Plugin System Infrastructure

**Files:**

- `packages/jsonpath/core/src/plugin.ts` (new)
- `packages/jsonpath/core/src/types.ts`
- `packages/jsonpath/jsonpath/src/plugins.ts` (new)
- `packages/jsonpath/jsonpath/src/index.ts`

**What:** Implement plugin infrastructure:

- `Plugin` interface with `name`, `version`, `setup(ctx)`, `teardown(ctx)`
- `PluginContext` with access to registries, config, and hooks
- Plugin loading/unloading in facade
- Plugin dependency resolution
- Hook system for extending parsing, evaluation, and compilation

**Testing:**

- Test plugin lifecycle (setup/teardown)
- Test plugin isolation (one plugin can't break another)
- Test plugin conflicts (same function name)
- Test hook invocation order

---

### Step 5.2: Implement @jsonpath/plugin-extended

**Files:**

- `packages/jsonpath/plugin-extended/` (new package)

**What:** Implement extended selectors plugin:

- `parent` selector - select parent node
- `property` selector - select property name
- `root` function - return to root from any position
- `key` function - get current key/index

**Testing:**

- Test each extended selector
- Test integration with core evaluator
- Test tree-shaking (plugin code not included when unused)

---

### Step 5.3: Implement @jsonpath/plugin-types

**Files:**

- `packages/jsonpath/plugin-types/` (new package)

**What:** Implement type-checking functions plugin:

- `type(value)` - returns type string
- `isString(value)`, `isNumber(value)`, `isBoolean(value)`
- `isArray(value)`, `isObject(value)`, `isNull(value)`
- `isInteger(value)`, `isNumeric(value)`

**Testing:**

- Test each type function
- Test in filter expressions
- Test edge cases (NaN, Infinity, null vs undefined)

---

### Step 5.4: Implement @jsonpath/plugin-arithmetic

**Files:**

- `packages/jsonpath/plugin-arithmetic/` (new package)

**What:** Implement arithmetic functions plugin:

- `sum(nodes)` - sum of numeric values
- `avg(nodes)` - average of numeric values
- `min(nodes)`, `max(nodes)` - min/max values
- `floor(value)`, `ceil(value)`, `round(value)`
- `abs(value)`, `pow(value, exp)`

**Testing:**

- Test each arithmetic function
- Test with empty arrays
- Test with mixed types

---

### Step 5.5: Implement @jsonpath/plugin-extras

**Files:**

- `packages/jsonpath/plugin-extras/` (new package)

**What:** Implement utility functions plugin:

- `first(nodes)`, `last(nodes)` - first/last from nodelist
- `keys(object)`, `values(object)` - object keys/values
- `entries(object)` - key-value pairs
- `reverse(array)`, `sort(array)`, `unique(array)`
- `flatten(array, depth)` - flatten nested arrays
- `join(array, separator)` - join to string

**Testing:**

- Test each utility function
- Test with various data types
- Test error handling for invalid inputs

---

### Step 5.6: Implement @jsonpath/plugin-path-builder

**Files:**

- `packages/jsonpath/plugin-path-builder/` (new package)

**What:** Implement path builder plugin:

- Fluent API for building JSONPath queries programmatically
- `path().root().child('store').descendant('book').filter(...)`
- Type-safe query construction
- `toString()` to get query string
- `compile()` to get compiled query directly

**Testing:**

- Test fluent API chaining
- Test all selector types
- Test filter expression building
- Test compilation output

---

### Step 5.7: Complete Merge-Patch API

**Files:**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`
- `packages/jsonpath/merge-patch/src/index.ts`

**What:** Implement missing functions:

- `createMergePatch(source, target)` - generate merge patch
- `isValidMergePatch(patch): boolean` - validate merge patch
- `mergePatchWithTrace(target, patch)` - with operation tracking
- `toJSONPatch(target, patch)` - convert to JSON Patch
- `fromJSONPatch(ops)` - convert from JSON Patch
- Add `MergePatchOptions` support

**Testing:**

- Test each function
- Test conversion roundtrips
- Test trace accuracy

---

### Step 5.8: Add Build Configuration for Dual ESM/CJS

**Files:**

- `packages/jsonpath/*/vite.config.ts`
- `packages/jsonpath/*/package.json`

**What:** Configure dual ESM/CJS output:

- Add CJS build output
- Update package.json exports with `require` entries
- Ensure tree-shaking works in both formats

**Testing:**

- Test CJS import in Node.js
- Test ESM import in bundlers
- Verify bundle sizes

---

### Step 5.9: Complete Type Re-exports

**Files:**

- `packages/jsonpath/jsonpath/src/index.ts`

**What:** Ensure all public types are re-exported from facade:

- All AST node types
- All option interfaces
- All result types
- All error types

**Testing:**

- Verify all types are importable from `@jsonpath/jsonpath`
- Test TypeScript compilation with imports

---

## Summary

| Phase   | Steps | Priority    | Estimated Duration |
| ------- | ----- | ----------- | ------------------ |
| Phase 1 | 5     | P0 Critical | 2-3 weeks          |
| Phase 2 | 6     | P0/P1       | 1-2 weeks          |
| Phase 3 | 4     | P1          | 1 week             |
| Phase 4 | 3     | P1          | 2 weeks            |
| Phase 5 | 9     | P2          | 2-3 weeks          |

**Total Estimated Duration:** 8-11 weeks

---

## Design Decisions

1. **P0 First:** Core RFC compliance takes priority over convenience features
2. **Full Cached JIT:** Generate optimized JavaScript via `new Function()` with LRU caching
3. **All Plugins:** Implement all 5 specified plugins (extended, types, arithmetic, extras, path-builder)
4. **Official Test Suite:** Use jsonpath-compliance-test-suite via napa as devDependency
5. **Breaking Changes OK:** This is v0, backwards compatibility not required; fix all internal breakages

---

## Dependencies

Each step assumes completion of prior steps within the same phase. Cross-phase dependencies:

- Phase 2 depends on Phase 1.1 (registry unification)
- Phase 3 depends on Phase 1.2 (QueryResult) and Phase 2 (Pointer API)
- Phase 4 depends on Phase 1, 2, 3 completion
- Phase 5 can run in parallel with Phase 4

---

## Success Criteria

1. All RFC compliance tests pass (JSONPath, Pointer, Patch)
2. Bundle size < 15KB gzipped (full suite)
3. Performance > 5M ops/sec for compiled queries
4. 100% TypeScript strict mode compliance
5. All public APIs match specification
6. Tree-shaking verified with bundler analysis
