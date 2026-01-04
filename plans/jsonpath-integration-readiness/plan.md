# JSONPath Integration Readiness

**Branch:** `feat/jsonpath-integration-readiness`
**Description:** Prepare @jsonpath/\* libraries for production integration into @data-map/core, replacing json-p3

## Goal

Bring the @jsonpath/\* library suite to production readiness with 100% RFC compliance, comprehensive testing, feature parity with json-p3, complete documentation, and performance verification—enabling confident migration from json-p3 in @data-map/core.

---

## Current State Assessment

| Area                   | Current | Target        |
| ---------------------- | ------- | ------------- |
| RFC 9535 (JSONPath)    | ~30%    | 100%          |
| RFC 6901 (Pointer)     | ~20%    | 100%          |
| RFC 6902 (Patch)       | ~30%    | 100%          |
| RFC 7386 (Merge Patch) | ~25%    | 100%          |
| Test Coverage          | Basic   | Exhaustive    |
| Documentation          | Partial | Complete      |
| Benchmarks             | None    | Comprehensive |

---

## Implementation Steps

### Step 1: RFC 6901 - JSON Pointer Completion

**Files:**

- `packages/jsonpath/pointer/src/pointer.ts`
- `packages/jsonpath/pointer/src/normalize.ts` (new)
- `packages/jsonpath/pointer/src/index.ts`
- `packages/jsonpath/pointer/src/__tests__/pointer.spec.ts`
- `packages/jsonpath/pointer/src/__tests__/normalize.spec.ts` (new)

**What:** Complete the JSONPointer class to full RFC 6901 compliance:

- Add `exists(root: unknown): boolean` method (required by @data-map/core)
- Add `resolve()` alias for `get()` (json-p3 compatibility)
- Add `parent(): JSONPointer` method
- Add `concat(other: JSONPointer): JSONPointer` method
- Add static `fromTokens(tokens: string[]): JSONPointer` factory
- Add `isValid(pointer: string): boolean` standalone validation
- Add `normalize(pointer: string | JSONPointer): string` function:
  - Returns a stable, deterministic, canonical string representation
  - Properly escapes all special characters (`~0`, `~1`)
  - Removes redundant escaping
  - Ensures consistent leading `/` for non-empty pointers
- Implement proper error handling with `PointerSyntaxError`, `PointerResolutionError`

**Testing:**

- All RFC 6901 test cases pass
- Comparison tests with json-p3's JSONPointer
- Edge cases: empty pointer, root access, escaped characters (`~0`, `~1`)
- Normalize produces identical output for equivalent pointers

---

### Step 2: Relative JSON Pointers (Optional Extension)

**Files:**

- `packages/jsonpath/pointer/src/relative-pointer.ts` (new)
- `packages/jsonpath/pointer/src/index.ts` (add exports)
- `packages/jsonpath/pointer/src/__tests__/relative-pointer.spec.ts` (new)

**What:** Implement optional Relative JSON Pointer support (Internet-Draft draft-bhutton-relative-json-pointer):

- `RelativeJSONPointer` class:
  - Constructor: `new RelativeJSONPointer(relativePointer: string)`
  - `resolve(root: unknown, current: JSONPointer): unknown` - resolve relative to current location
  - `toAbsolute(current: JSONPointer): JSONPointer` - convert to absolute pointer
  - `toString(): string` - canonical string representation
- Syntax support:
  - Non-negative integer prefix (ancestor traversal): `0`, `1`, `2`, etc.
  - Optional `#` suffix (return key/index instead of value)
  - Optional JSON Pointer suffix for further navigation
  - Examples: `0`, `1/foo`, `2#`, `0/bar/baz`
- Standalone functions:
  - `parseRelativePointer(pointer: string): { ancestors: number, pointer: JSONPointer, indexReference: boolean }`
  - `resolveRelative(root: unknown, current: JSONPointer, relative: string): unknown`
  - `isRelativePointer(pointer: string): boolean` - validation
- Integration with JSONPointer class:
  - `pointer.relative(relativePointer: string): JSONPointer` - navigate relatively
  - `pointer.relativeTo(other: JSONPointer): RelativeJSONPointer` - compute relative path

**Note:** This is an optional extension. Core RFC 6901 functionality does not depend on it.

**Testing:**

- All draft specification examples pass
- Ancestor traversal works correctly (0 = current, 1 = parent, etc.)
- Index reference (`#`) returns correct key/index
- Combined relative + pointer suffix works
- Error handling for invalid syntax and out-of-bounds traversal
- Integration with absolute JSONPointer class

---

### Step 3: RFC 6902 - JSON Patch Completion

**Files:**

- `packages/jsonpath/patch/src/patch.ts`
- `packages/jsonpath/patch/src/builder.ts`
- `packages/jsonpath/patch/src/diff.ts`
- `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts`

**What:** Complete JSON Patch implementation:

- Implement `testPatch()` function for dry-run validation
- Complete `PatchBuilder` fluent API with all operations
- Add `createPatch(source, target)` diff functionality
- Ensure all operations handle edge cases (array bounds, missing parents)
- **Mutation semantics**: `applyPatch()` mutates in-place by default (matches json-p3)
- Add `applyPatchImmutable()` for immutable operations (returns cloned result)
- Add `ApplyOptions`: `strictMode: boolean`, `atomic: boolean`
- Integrate json-patch-test-suite for compliance verification

**Testing:**

- 100% json-patch-test-suite pass rate
- Comparison with json-p3's applyPatch behavior (identical mutation semantics)
- `applyPatchImmutable()` leaves original unchanged

---

### Step 4: RFC 7386 - Merge Patch Completion

**Files:**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`
- `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts`

**What:** Complete Merge Patch implementation:

- Add `createMergePatch(source, target)` function
- Add options support: `nullBehavior`, `arrayMergeStrategy`
- Proper handling of `null` semantics per RFC 7386
- Type-safe generic implementation

**Testing:**

- All RFC 7386 test vectors pass
- Edge cases: nested objects, array handling, null propagation

---

### Step 5: RFC 9535 - JSONPath Query Completion

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/query-result.ts` (new)
- `packages/jsonpath/evaluator/src/options.ts` (new)
- `packages/jsonpath/evaluator/src/normalize.ts` (new)
- `packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts`
- `packages/jsonpath/evaluator/src/__tests__/normalize.spec.ts` (new)

**What:** Complete JSONPath evaluator to RFC 9535:

- Implement full `QueryResult` interface:
  - `values(): T[]` ✓ exists
  - `pointers(): JSONPointer[]` (return objects, not strings)
  - `nodes(): Array<{value: T, pointer: JSONPointer}>`
  - `paths(): string[]` (normalized JSONPath strings)
  - `first(): T | undefined`
  - `isEmpty(): boolean`
  - `[Symbol.iterator]()` support
- Implement `EvaluatorOptions`:
  - `maxDepth: number`
  - `maxResults: number`
  - `timeout: number`
  - `detectCircular: boolean`
- Add `normalizePath(path: string): string` function:
  - Returns a stable, deterministic, canonical JSONPath string
  - Converts bracket notation to dot notation where possible
  - Normalizes quotes (single → double or vice versa, configurable)
  - Removes unnecessary whitespace
  - Ensures consistent `$` root prefix
  - Normalizes slice expressions per RFC 9535 §2.3.4.2
- Fix slice normalization per RFC 9535 §2.3.4.2
- Ensure all selector types work correctly

**Testing:**

- Integrate jsonpath-compliance-test-suite (RFC 9535 CTS)
- 100% CTS pass rate
- Performance regression tests
- Normalize produces identical output for semantically equivalent paths

---

### Step 6: Function Registry Unification

**Files:**

- `packages/jsonpath/core/src/registry.ts`
- `packages/jsonpath/functions/src/registry.ts`
- `packages/jsonpath/functions/src/index.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:** Unify the duplicate function registries:

- Single source of truth in `@jsonpath/functions`
- Remove duplicate from `@jsonpath/core`
- Implement proper function extension API
- Support custom function registration
- Built-in functions: `length`, `count`, `match`, `search`, `value`, `min`, `max`, `avg`, `sum`, `keys`, `type`

**Testing:**

- All built-in functions work correctly
- Custom function registration works
- Type-safe function definitions

---

### Step 7: Facade API Enhancement

**Files:**

- `packages/jsonpath/jsonpath/src/index.ts`
- `packages/jsonpath/jsonpath/src/config.ts` (new)
- `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts`

**What:** Enhance the unified facade API:

- Configuration system: `configure(options)`, `getConfig()`
- Cache management: `clearCache()`, `getCacheStats()`
- Convenience functions: `first()`, `count()`, `exists()`
- Transformation API: `transform(path, data, fn)`
- Type guards and runtime validation

**Testing:**

- All facade functions work correctly
- Configuration persists correctly
- Cache behaves as expected

---

### Step 8: Schema Validation System

**Files:**

- `packages/jsonpath/schema/package.json` (new package)
- `packages/jsonpath/schema/src/index.ts`
- `packages/jsonpath/schema/src/adapter.ts`
- `packages/jsonpath/schema/src/validator.ts`
- `packages/jsonpath/schema/src/type-inference.ts`
- `packages/jsonpath/schema/src/path-resolver.ts`
- `packages/jsonpath/schema/src/types.ts`
- `packages/jsonpath/schema/src/__tests__/validator.spec.ts`
- `packages/jsonpath/schema/src/__tests__/type-inference.spec.ts`

**What:** Build an adapter-based schema validation system for paths, pointers, and mutations:

**Core Adapter Interface:**

```typescript
interface SchemaAdapter<TSchema = unknown> {
	name: string;
	// Schema introspection
	getTypeAtPath(schema: TSchema, pointer: JSONPointer): SchemaType | undefined;
	getPropertyNames(schema: TSchema, pointer: JSONPointer): string[];
	isArrayAt(schema: TSchema, pointer: JSONPointer): boolean;
	isObjectAt(schema: TSchema, pointer: JSONPointer): boolean;
	isOptionalAt(schema: TSchema, pointer: JSONPointer): boolean;

	// Validation
	validateValue(
		schema: TSchema,
		pointer: JSONPointer,
		value: unknown,
	): ValidationResult;
	validatePatch(schema: TSchema, patch: PatchOperation[]): ValidationResult;

	// Type extraction
	inferTypeScript(schema: TSchema, pointer?: JSONPointer): string;
}
```

**Schema-Aware Path/Pointer Validation:**

- `validatePath(schema, path): ValidationResult` - verify path is valid for schema
- `validatePointer(schema, pointer): ValidationResult` - verify pointer is valid for schema
- `resolvePath(schema, path): ResolvedPath[]` - resolve wildcards/recursion against schema
- `getValidPaths(schema, options?): string[]` - enumerate all valid paths from schema
- `suggestCompletions(schema, partialPath): Completion[]` - autocomplete support

**Mutation Validation:**

- `validateSet(schema, pointer, value): ValidationResult` - validate before `set()`
- `validateRemove(schema, pointer): ValidationResult` - validate before `remove()`
- `validatePatch(schema, operations): ValidationResult` - validate entire patch

**Type Inference/Extraction:**

- `inferType<T>(schema, pointer): T` - TypeScript type from schema path
- `extractSchema(schema, pointer): TSchema` - get sub-schema at pointer
- `getRequiredFields(schema, pointer): string[]` - list required properties
- `getDefaultValue(schema, pointer): unknown` - get default if defined

**Validation Result:**

```typescript
interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}
interface ValidationError {
	pointer: JSONPointer;
	code: string;
	message: string;
	expected?: unknown;
	received?: unknown;
}
```

**Future adapter packages (not in this PR):**

- `@jsonpath/schema-adapter-zod`
- `@jsonpath/schema-adapter-yup`
- `@jsonpath/schema-adapter-ajv` (JSON Schema)
- `@jsonpath/schema-adapter-typebox`
- `@jsonpath/schema-adapter-valibot`

**Testing:**

- Adapter interface contract tests (mock adapter)
- Path validation against mock schema
- Pointer validation against mock schema
- Mutation validation (set, remove, patch)
- Type inference produces correct TypeScript
- Completion suggestions work correctly
- Error messages are helpful and specific

---

### Step 9: Compatibility Layer for json-p3

**Files:**

- `packages/jsonpath/compat-json-p3/package.json` (new package)
- `packages/jsonpath/compat-json-p3/src/index.ts`
- `packages/jsonpath/compat-json-p3/src/__tests__/compat.spec.ts`

**What:** Create json-p3 compatibility adapter:

- `@jsonpath/compat-json-p3` package providing drop-in replacement for json-p3
- Match json-p3 API exactly:
  - `query(path, data)` argument order
  - `JSONPointer.resolve()` method name
  - `applyPatch()` mutation behavior
- Export structure mirrors json-p3's exports
- Migration guide documentation

**Future packages (planned, not in this PR):**

- `@jsonpath/compat-jsonpath-plus`
- `@jsonpath/compat-jsonpath`

**Testing:**

- Adapter produces identical results to json-p3
- Performance overhead is minimal (<5%)
- Type definitions match json-p3

---

### Step 10: Performance Benchmarking Suite

**Files:**

- `packages/jsonpath/benchmarks/package.json` (new package)
- `packages/jsonpath/benchmarks/src/query.bench.ts`
- `packages/jsonpath/benchmarks/src/pointer.bench.ts`
- `packages/jsonpath/benchmarks/src/patch.bench.ts`
- `packages/jsonpath/benchmarks/README.md`

**What:** Set up benchmarking infrastructure:

- Benchmark suite using Vitest bench or tinybench
- Compare @jsonpath/\* against json-p3 for:
  - Query operations (simple, complex, recursive)
  - Pointer resolution
  - Patch application
- Test with various data sizes (small, medium, large)
- Scripts to run benchmarks: `pnpm benchmarks bench`
- Markdown report generation

**Note:** This step sets up the infrastructure. Performance optimization is out of scope for this PR.

**Testing:**

- Benchmarks run successfully
- Results are captured in markdown format

---

### Step 11: Plugin System Implementation

**Files:**

- `packages/jsonpath/core/src/plugin.ts` (new)
- `packages/jsonpath/core/src/plugin-manager.ts` (new)
- `packages/jsonpath/core/src/types/plugin.ts` (new)
- `packages/jsonpath/evaluator/src/evaluator.ts` (update for plugin support)
- `packages/jsonpath/jsonpath/src/index.ts` (expose plugin API)

**What:** Extensible plugin architecture (required for @data-map/\* integration):

- Plugin interface: `JsonPathPlugin { name, version, functions?, selectors?, hooks? }`
- `PluginManager` class for registration/lifecycle:
  - `register(plugin: JsonPathPlugin): void`
  - `unregister(pluginName: string): void`
  - `get(pluginName: string): JsonPathPlugin | undefined`
  - `list(): JsonPathPlugin[]`
  - `clear(): void`
- Built-in extension points:
  - **Custom functions**: Add new filter functions (e.g., `@data-map` specific)
  - **Custom selectors**: Extend selector syntax
  - **Pre/post evaluation hooks**: Transform input/output
  - **Custom normalizers**: Extend path/pointer normalization
- `registerPlugin()` and `unregisterPlugin()` on facade
- Isolated plugin contexts (no cross-contamination between plugins)
- Plugin dependency resolution (plugins can depend on other plugins)
- Error handling: graceful degradation if plugin fails

**Note:** Optional plugin packages (xpath, lodash) are deferred to future PRs.

**Testing:**

- Plugin registration and execution works
- Plugins can add custom functions
- Plugin isolation is maintained
- Unregistration cleans up properly
- Dependency resolution works correctly
- Error in one plugin doesn't crash others

---

### Step 12: Exhaustive Documentation

**Files:**

- `packages/jsonpath/docs/README.md` (new)
- `packages/jsonpath/docs/api/query.md`
- `packages/jsonpath/docs/api/pointer.md`
- `packages/jsonpath/docs/api/relative-pointer.md` (new)
- `packages/jsonpath/docs/api/patch.md`
- `packages/jsonpath/docs/api/merge-patch.md`
- `packages/jsonpath/docs/api/functions.md`
- `packages/jsonpath/docs/api/normalize.md` (new)
- `packages/jsonpath/docs/api/schema-validation.md` (new)
- `packages/jsonpath/docs/guides/getting-started.md`
- `packages/jsonpath/docs/guides/migration-from-json-p3.md`
- `packages/jsonpath/docs/guides/advanced-usage.md`
- `packages/jsonpath/docs/guides/custom-functions.md`
- `packages/jsonpath/docs/guides/plugins.md` (comprehensive plugin guide)
- `packages/jsonpath/docs/guides/plugin-development.md` (new - how to build plugins)
- `packages/jsonpath/docs/guides/schema-adapters.md` (new - how to build schema adapters)
- `packages/jsonpath/docs/rfc-compliance.md`

**What:** Complete markdown documentation in `packages/jsonpath/docs/`:

- API reference for every public function/class
- Code examples for all use cases
- Migration guide from json-p3
- Advanced usage: custom functions, caching, normalization
- **Comprehensive plugin documentation:**
  - Plugin architecture overview
  - `JsonPathPlugin` interface reference
  - Step-by-step plugin development tutorial
  - Extension point reference (functions, selectors, hooks)
  - Plugin lifecycle and error handling
  - Example plugins with full code
  - Best practices for plugin authors
- RFC links and compliance notes
- Package READMEs linking to docs

**Testing:**

- All code examples compile and run
- Documentation is well-organized and navigable
- No broken internal links
- Plugin examples are tested and working

---

### Step 13: Integration Testing with @data-map/core

**Files:**

- `packages/data-map/core/src/__tests__/jsonpath-integration.spec.ts` (new)
- `packages/data-map/core/package.json` (update devDeps)

**What:** Verify integration readiness (migration deferred to separate PR):

- Side-by-side comparison tests: json-p3 vs @jsonpath/\*
- Test all @data-map/core usage patterns:
  - `pathResolver.ts`: query + pointers
  - `patch/apply.ts`: applyPatch
  - `patch/builder.ts`: pointer resolution
- Performance comparison in real usage context
- Document any behavioral differences
- Verify plugin system works with @data-map/core patterns
- Test normalization functions produce stable output

**Testing:**

- All comparison tests pass (identical behavior)
- No performance regression >10%
- Edge cases documented
- Plugin integration verified

**Note:** Actual migration execution will be a separate PR after this integration readiness work is complete.

---

## Success Criteria

### RFC Compliance

- [ ] RFC 6901: 100% JSON Pointer test vectors pass
- [ ] RFC 6902: 100% json-patch-test-suite pass
- [ ] RFC 7386: 100% Merge Patch test vectors pass
- [ ] RFC 9535: 100% jsonpath-compliance-test-suite pass
- [ ] Relative JSON Pointer: All draft specification examples pass

### Feature Parity

- [ ] All json-p3 features used by @data-map/core are available
- [ ] `@jsonpath/compat-json-p3` provides drop-in replacement
- [ ] Future compat packages planned (`jsonpath-plus`, `jsonpath`)
- [ ] `normalize()` for pointers produces stable, canonical output
- [ ] `normalizePath()` for JSONPath produces stable, canonical output
- [ ] Optional Relative JSON Pointer support available
- [ ] Schema validation system with adapter interface available
- [ ] Future schema adapters planned (zod, yup, ajv, typebox, valibot)

### Testing

- [ ] > 95% code coverage across all packages
- [ ] Integration tests verify identical behavior to json-p3
- [ ] Benchmark infrastructure is in place

### Documentation

- [ ] Complete API reference in `packages/jsonpath/docs/`
- [ ] Migration guide from json-p3
- [ ] Comprehensive plugin development guide
- [ ] Schema adapter development guide
- [ ] Normalization API documentation
- [ ] All examples compile and run

### Developer Experience

- [ ] Consistent API patterns across packages
- [ ] Helpful error messages with suggestions
- [ ] TypeScript types are comprehensive
- [ ] IntelliSense/autocomplete works well
- [ ] Plugin system enables @data-map/\* extensions
- [ ] Normalization enables deterministic comparisons

---

## Dependencies

- `jsonpath-compliance-test-suite`: RFC 9535 CTS
- `json-patch-test-suite`: RFC 6902 tests (already in devDeps)
- Vitest: Test runner (already configured)
- Tinybench: Benchmarking (for benchmark package)

---

## Risks & Mitigations

| Risk                                | Impact | Mitigation                                  |
| ----------------------------------- | ------ | ------------------------------------------- |
| Behavioral differences from json-p3 | High   | Extensive comparison tests before migration |
| Plugin system complexity            | Medium | Keep interface minimal, expand later        |
| Breaking changes in @data-map/core  | High   | Feature flag or gradual rollout             |
| RFC interpretation differences      | Low    | Use official test suites, not custom tests  |

---

## Decisions Made

| Question             | Decision                                                                               |
| -------------------- | -------------------------------------------------------------------------------------- |
| Mutation semantics   | `applyPatch()` mutates in-place (matches json-p3); `applyPatchImmutable()` for cloning |
| Compatibility scope  | Start with `@jsonpath/compat-json-p3`; other compat packages planned for future        |
| Plugin system        | Required for initial integration (@data-map needs plugin support)                      |
| Performance targets  | Set up benchmarks only; optimization deferred                                          |
| Documentation format | Markdown-only in `packages/jsonpath/docs/`                                             |
| Schema validation    | Adapter-based system; concrete adapters (zod, etc.) are separate packages              |
