# JSONPath Implementation Gaps - Complete Remediation Plan

**Branch:** `feat/jsonpath-implementation-gaps`
**Description:** Fill all unimplemented gaps identified in the [January 4, 2026 Comprehensive Audit Report](../jsonpath-comprehensive-audit-report-2025-01-04.md)

## Goal

Address all 56 implementation gaps across the `@jsonpath/*` package suite to achieve full compliance with [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535.html) (JSONPath), [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901.html) (JSON Pointer), [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902.html) (JSON Patch), [RFC 7386](https://www.rfc-editor.org/rfc/rfc7386.html) (Merge Patch), and the comprehensive [specification](../../specs/jsonpath.md). This plan moves the library from ~60% to 100% spec compliance.

---

## Gap Inventory Summary

| Priority         | Count  | Description                      |
| ---------------- | ------ | -------------------------------- |
| 🔴 P0 - Critical | 8      | RFC compliance blockers          |
| 🟠 P1 - High     | 13     | Important API features           |
| 🟡 P2 - Medium   | 32     | Extended features, optimizations |
| 🟢 P3 - Low      | 3      | Nice-to-have                     |
| **Total**        | **56** |                                  |

---

## Implementation Steps

> **Priority Order**: JIT Compiler implementation is the top priority. Steps 1-3 implement the compiler first, followed by RFC compliance fixes, then remaining features.
>
> **Breaking Changes**: This is a v0 implementation. Breaking changes are acceptable as long as internal usages are updated.

### Step 1: Implement Real JIT Compiler - Code Generation (P0) ⚠️ TOP PRIORITY

**Files:**

- `packages/jsonpath/compiler/src/codegen/index.ts` (new)
- `packages/jsonpath/compiler/src/codegen/generators.ts` (new)
- `packages/jsonpath/compiler/src/codegen/templates.ts` (new)
- `packages/jsonpath/compiler/src/codegen/optimizations.ts` (new)

**What:**

1. Design code generation architecture per [spec §4.6](../../specs/jsonpath.md#46-jsonpathcompiler)
2. Implement AST-to-JavaScript code generator
3. Generate inline code for simple selectors (name, index)
4. Generate optimized loops for wildcards and slices
5. Generate short-circuit evaluation for filter expressions
6. Include source maps for debugging

**References:**

- [Audit Report §9](../jsonpath-comprehensive-audit-report-2025-01-04.md#9-jsonpathcompiler--status--critical-15)
- [Spec §4.6](../../specs/jsonpath.md#46-jsonpathcompiler)

**Testing:**

- Unit test each generator
- Verify generated code produces same results as evaluator
- Benchmark: target >5M ops/sec for compiled queries

---

### Step 2: Implement Real JIT Compiler - CompiledQuery Class (P0) ⚠️ TOP PRIORITY

**Files:**

- `packages/jsonpath/compiler/src/compiled-query.ts` (new)
- `packages/jsonpath/compiler/src/compiler.ts`
- `packages/jsonpath/compiler/src/options.ts`
- `packages/jsonpath/compiler/src/index.ts`

**What:**

1. Implement `CompiledQuery` interface with all properties:
   - `source` - Generated JavaScript code - [spec L1172-1183](../../specs/jsonpath.md#L1172)
   - `ast` - Original AST - [spec L1172-1183](../../specs/jsonpath.md#L1172)
   - `compilationTime` - Performance tracking - [spec L1172-1183](../../specs/jsonpath.md#L1172)
2. Implement `Compiler` class with options - [spec L1196-1200](../../specs/jsonpath.md#L1196)
3. Add `CompilerOptions`:
   - `sourceMap` - Generate source maps - [spec L1185-1195](../../specs/jsonpath.md#L1185)
   - `optimizeForSmall` - Reduce bundle size - [spec L1185-1195](../../specs/jsonpath.md#L1185)
   - `unsafe` - Skip runtime checks - [spec L1185-1195](../../specs/jsonpath.md#L1185)
4. Replace current stub `compile()` with real implementation
5. Integrate with existing LRU cache

**References:**

- [Audit Report §9](../jsonpath-comprehensive-audit-report-2025-01-04.md#9-jsonpathcompiler--status--critical-15)

**Testing:**

- Verify `compile('$.store.book[*].price')` returns working CompiledQuery
- Verify `compiledQuery.source` contains valid JavaScript
- Verify `compiledQuery.ast` matches original parse tree
- Verify `compiledQuery.compilationTime` is populated
- Benchmark: >5M ops/sec for simple queries

---

### Step 3: Compiler Optimizations (P0)

**Files:**

- `packages/jsonpath/compiler/src/optimizations/inline.ts` (new)
- `packages/jsonpath/compiler/src/optimizations/short-circuit.ts` (new)
- `packages/jsonpath/compiler/src/optimizations/index.ts` (new)

**What:**

1. Implement inline simple selector optimization - [spec §4.6](../../specs/jsonpath.md#46-jsonpathcompiler)
2. Implement short-circuit filter evaluation - [spec §4.6](../../specs/jsonpath.md#46-jsonpathcompiler)
3. Implement constant folding for literals
4. Implement dead code elimination
5. Add optimization toggles to `CompilerOptions`

**References:**

- [Audit Report §9](../jsonpath-comprehensive-audit-report-2025-01-04.md#9-jsonpathcompiler--status--critical-15)

**Testing:**

- Verify `$.name` generates inline property access, not loop
- Verify `$[?(@.x && false)]` short-circuits without evaluating `@.x`
- Benchmark optimized vs unoptimized compilation

---

### Step 4: Fix RFC 9535 Critical Compliance Issues (P0)

**Files:**

- `packages/jsonpath/functions/src/match.ts`
- `packages/jsonpath/functions/src/search.ts`
- `packages/jsonpath/evaluator/src/selectors/slice.ts`
- `packages/jsonpath/evaluator/src/evaluator.spec.ts`

**What:**

1. Fix `match()`/`search()` return value on invalid regex patterns - must return `LogicalFalse` not `Nothing` per [RFC 9535 §3.4](https://www.rfc-editor.org/rfc/rfc9535.html#section-3.4)
2. Verify slice normalization handles `step=0` correctly (empty selection, not error) per [RFC 9535 §2.3.4.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.4.2)
3. Add test cases for edge conditions

**References:**

- [Audit Report §5](../jsonpath-comprehensive-audit-report-2025-01-04.md#5-jsonpathfunctions--status--good-80)
- [Audit Report §4](../jsonpath-comprehensive-audit-report-2025-01-04.md#4-jsonpathevaluator--status--partial-70)

**Testing:**

- Run `@jsonpath/functions` test suite
- Run `@jsonpath/evaluator` test suite
- Validate slice edge cases: `$[0:10:0]`, `$[::0]`, `$[10:0:-1]`
- Validate match/search with invalid pattern returns `false`

---

### Step 5: Run and Pass RFC 9535 Compliance Test Suite (P0)

**Files:**

- `packages/jsonpath/compliance-suite/src/runner.ts`
- `packages/jsonpath/compliance-suite/src/index.spec.ts`

**What:**

1. Execute the CTS (jsonpath-compliance-test-suite) against current implementation
2. Document all failing tests
3. Fix any remaining RFC 9535 compliance issues discovered
4. Ensure 100% CTS pass rate

**References:**

- [Audit Report §14](../jsonpath-comprehensive-audit-report-2025-01-04.md#14-compliance-test-suite-status)
- [Spec §10](../../specs/jsonpath.md#10-testing-requirements)

**Testing:**

- Run `pnpm --filter @jsonpath/compliance-suite test`
- All CTS tests pass

---

### Step 6: Add Missing Parser AST Node Types (P1)

**Files:**

- `packages/jsonpath/core/src/types.ts`
- `packages/jsonpath/parser/src/types.ts`
- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/index.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:**

1. Add `RootSelector` node type for `$` - [spec L565](../../specs/jsonpath.md#L565)
2. Add `CurrentSelector` node type for `@` - [spec L566](../../specs/jsonpath.md#L566)
3. Add `LogicalExpr` node type for `&&`/`||` - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
4. Add `ComparisonExpr` node type for `==`/`!=`/etc - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
5. Add `FilterQuery` node type - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
6. Add `QueryNode.raw` property with original query string - [spec L625](../../specs/jsonpath.md#L625)
7. Add `NameSelectorNode.quoted` property - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
8. Add `LiteralNode.raw` property for original string - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
9. Update evaluator to handle new node types
10. Export all new types from package

**References:**

- [Audit Report §3](../jsonpath-comprehensive-audit-report-2025-01-04.md#3-jsonpathparser--status--partial-70)

**Testing:**

- Verify `parse('$')` produces `RootSelector` node
- Verify `parse('$[?(@.x)]')` produces `CurrentSelector` within filter
- Verify all new properties are populated correctly
- Run full parser test suite

---

### Step 7: Add Parser Options and Utilities (P1)

**Files:**

- `packages/jsonpath/parser/src/options.ts` (new)
- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/expression-parser.ts` (new)
- `packages/jsonpath/parser/src/visitor.ts`
- `packages/jsonpath/parser/src/index.ts`

**What:**

1. Add `ParserOptions.strict` for RFC 9535 strict mode - [spec L701-710](../../specs/jsonpath.md#L701)
2. Implement `parseExpression(input)` standalone function - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
3. Update `ASTVisitor` with `enter`/`leave` hooks - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
4. Fix slice property naming: `start/end/step` vs `startValue/endValue/stepValue` - [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser)
5. Export all from package index

**References:**

- [Audit Report §3](../jsonpath-comprehensive-audit-report-2025-01-04.md#3-jsonpathparser--status--partial-70)

**Testing:**

- Verify strict mode rejects non-RFC extensions
- Verify `parseExpression('@.price > 10')` returns expression AST
- Verify visitor enter/leave called in correct order
- Run parser test suite

---

### Step 8: Complete Evaluator Features (P1)

**Files:**

- `packages/jsonpath/evaluator/src/stream.ts` (new)
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/options.ts`
- `packages/jsonpath/evaluator/src/index.ts`

**What:**

1. Implement `stream()` generator for lazy evaluation - [spec §4.5](../../specs/jsonpath.md#45-jsonpathevaluator)
2. Refactor `timeout` to use `AbortController` instead of `Date.now` check - [spec L936-956](../../specs/jsonpath.md#L936)
3. Ensure yields are interruptible for proper timeout handling

**References:**

- [Audit Report §4](../jsonpath-comprehensive-audit-report-2025-01-04.md#4-jsonpathevaluator--status--partial-70)

**Testing:**

- Verify `stream(root, ast)` yields results one at a time
- Verify early termination works correctly
- Verify AbortController timeout triggers correctly
- Benchmark lazy vs eager evaluation for large documents

---

### Step 9: Complete I-Regexp RFC 9485 Compliance (P1)

**Files:**

- `packages/jsonpath/functions/src/iregexp.ts` (new)
- `packages/jsonpath/functions/src/match.ts`
- `packages/jsonpath/functions/src/search.ts`
- `packages/jsonpath/functions/src/index.ts`

**What:**

1. Implement full [RFC 9485](https://www.rfc-editor.org/rfc/rfc9485.html) I-Regexp parser/converter
2. Handle I-Regexp to JavaScript regex conversion correctly
3. Handle unsupported features gracefully (return `LogicalFalse`)
4. Export individual registration functions (`registerLength`, `registerMatch`, etc.)
5. Export `registerBuiltinFunctions()` utility - [spec §4.4](../../specs/jsonpath.md#44-jsonpathfunctions)

**References:**

- [Audit Report §5](../jsonpath-comprehensive-audit-report-2025-01-04.md#5-jsonpathfunctions--status--good-80)

**Testing:**

- Test all RFC 9485 examples
- Test edge cases for Unicode properties
- Verify invalid I-Regexp returns `false`
- Run functions test suite

---

### Step 10: Add JSON Pointer URI Fragment Identifier Support (P1)

**Files:**

- `packages/jsonpath/pointer/src/fragment.ts` (new)
- `packages/jsonpath/pointer/src/pointer.ts`
- `packages/jsonpath/pointer/src/index.ts`

**What:**

1. Implement URI fragment identifier representation per [RFC 6901 §6](https://www.rfc-editor.org/rfc/rfc6901.html#section-6)
2. Add `toURIFragment(pointer)` function
3. Add `fromURIFragment(fragment)` function
4. Add `JSONPointer.toURIFragment()` instance method
5. Handle proper URL encoding/decoding

**References:**

- [Audit Report §6](../jsonpath-comprehensive-audit-report-2025-01-04.md#6-jsonpathpointer--status--good-85)

**Testing:**

- Test `#/foo/bar` format
- Test special character encoding (`%2F`, `~0`, `~1`)
- Test round-trip: pointer → fragment → pointer

---

### Step 11: Complete JSON Patch Features (P2)

**Files:**

- `packages/jsonpath/patch/src/hooks.ts` (new)
- `packages/jsonpath/patch/src/validate.ts`
- `packages/jsonpath/patch/src/diff.ts`
- `packages/jsonpath/patch/src/builder.ts`
- `packages/jsonpath/patch/src/jsonpath-ops.ts` (new)
- `packages/jsonpath/patch/src/index.ts`

**What:**

1. Add `ApplyOptions.before/after` lifecycle hooks - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
2. Implement `applyWithErrors()` returning errors array - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
3. Implement standalone `validate(ops)` function - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
4. Expand `DiffOptions`:
   - `detectMoves` - Detect move operations
   - `includeTests` - Include test operations in diff
5. Add conditional builder ops (`when`, `ifExists`) - [spec L1724](../../specs/jsonpath.md#L1724)
6. Implement JSONPath-based operations (`replaceAll`) - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
7. Export individual operations (`patchAdd`, `patchRemove`, etc.) - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
8. **BREAKING**: Change default `mutate` to `false` per spec and update internal usages

**References:**

- [Audit Report §7](../jsonpath-comprehensive-audit-report-2025-01-04.md#7-jsonpathpatch--status--partial-75)

**Testing:**

- Verify lifecycle hooks fire in correct order
- Verify `applyWithErrors()` collects all errors
- Verify `validate()` returns validation errors
- Verify move detection in diff
- Verify conditional ops skip when condition false

---

### Step 12: Complete Facade Utilities (P2)

**Files:**

- `packages/jsonpath/patch/src/hooks.ts` (new)
- `packages/jsonpath/patch/src/validate.ts`
- `packages/jsonpath/patch/src/diff.ts`
- `packages/jsonpath/patch/src/builder.ts`
- `packages/jsonpath/patch/src/jsonpath-ops.ts` (new)
- `packages/jsonpath/patch/src/index.ts`

**What:**

1. Add `ApplyOptions.before/after` lifecycle hooks - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
2. Implement `applyWithErrors()` returning errors array - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
3. Implement standalone `validate(ops)` function - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
4. Expand `DiffOptions`:
   - `detectMoves` - Detect move operations
   - `includeTests` - Include test operations in diff
5. Add conditional builder ops (`when`, `ifExists`) - [spec L1724](../../specs/jsonpath.md#L1724)
6. Implement JSONPath-based operations (`replaceAll`) - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)
7. Export individual operations (`patchAdd`, `patchRemove`, etc.) - [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch)

**References:**

- [Audit Report §7](../jsonpath-comprehensive-audit-report-2025-01-04.md#7-jsonpathpatch--status--partial-75)

**Testing:**

- Verify lifecycle hooks fire in correct order
- Verify `applyWithErrors()` collects all errors
- Verify `validate()` returns validation errors
- Verify move detection in diff
- Verify conditional ops skip when condition false

---

### Step 12: Complete Facade Utilities (P2)

**Files:**

- `packages/jsonpath/jsonpath/src/query-set.ts` (new)
- `packages/jsonpath/jsonpath/src/transform.ts`
- `packages/jsonpath/jsonpath/src/merge.ts` (new)
- `packages/jsonpath/jsonpath/src/secure.ts`
- `packages/jsonpath/jsonpath/src/index.ts`

**What:**

1. Implement `createQuerySet()` for reusable query sets - [spec L2029](../../specs/jsonpath.md#L2029)
2. Implement `transformAll()` for multiple transforms - [spec §4.10](../../specs/jsonpath.md#410-jsonpathjsonpath-facade)
3. Implement `projectWith()` for projections with transforms - [spec §4.10](../../specs/jsonpath.md#410-jsonpathjsonpath-facade)
4. Implement `merge()` / `mergeWith()` deep merge utilities - [spec §4.10](../../specs/jsonpath.md#410-jsonpathjsonpath-facade)
5. Complete `secureQuery()` implementation - [spec L2116-2120](../../specs/jsonpath.md#L2116)
6. Ensure full re-exports from all sub-packages - [spec L1895-1900](../../specs/jsonpath.md#L1895)

**References:**

- [Audit Report §10](../jsonpath-comprehensive-audit-report-2025-01-04.md#10-jsonpathjsonpath-facade--status--partial-70)

**Testing:**

- Verify `createQuerySet(['$.a', '$.b']).queryAll(data)` works
- Verify `transformAll()` applies multiple transforms in order
- Verify `merge()` deeply merges objects
- Run facade test suite

---

### Step 13: Implement plugin-extended Selectors (P2)

**Files:**

- `packages/jsonpath/plugin-extended/src/selectors/parent.ts` (new)
- `packages/jsonpath/plugin-extended/src/selectors/property-name.ts` (new)
- `packages/jsonpath/plugin-extended/src/index.ts`

**What:**

1. Implement parent selector (`^`) - [spec L2434-2495](../../specs/jsonpath.md#L2434)
   - Returns parent of current node
   - Works with descendant segment
2. Implement property name selector (`~`) - [spec L2434-2495](../../specs/jsonpath.md#L2434)
   - Returns key/index instead of value
   - Works in filters
3. Register selectors with core registry

**References:**

- [Audit Report §11](../jsonpath-comprehensive-audit-report-2025-01-04.md#11-plugins--status--started-40)

**Testing:**

- Verify `$..author^` returns parent objects
- Verify `$.*~` returns property names
- Verify plugin registration works correctly

---

### Step 14: Implement plugin-arithmetic Operators (P2)

**Files:**

- `packages/jsonpath/plugin-arithmetic/src/operators/add.ts` (new)
- `packages/jsonpath/plugin-arithmetic/src/operators/subtract.ts` (new)
- `packages/jsonpath/plugin-arithmetic/src/operators/multiply.ts` (new)
- `packages/jsonpath/plugin-arithmetic/src/operators/divide.ts` (new)
- `packages/jsonpath/plugin-arithmetic/src/operators/modulo.ts` (new)
- `packages/jsonpath/plugin-arithmetic/src/index.ts`

**What:**

1. Implement arithmetic operators - [spec L2611-2700](../../specs/jsonpath.md#L2611):
   - `+` addition
   - `-` subtraction
   - `*` multiplication
   - `/` division
   - `%` modulo
2. Handle type coercion rules
3. Handle edge cases (division by zero, NaN, etc.)
4. Register operators with core registry

**References:**

- [Audit Report §11](../jsonpath-comprehensive-audit-report-2025-01-04.md#11-plugins--status--started-40)

**Testing:**

- Verify `$[?(@.price * @.quantity > 100)]` evaluates correctly
- Verify type coercion (string + number)
- Verify division by zero handling

---

### Step 15: Complete plugin-extras Functions (P2)

**Files:**

- `packages/jsonpath/plugin-extras/src/functions/string.ts` (new)
- `packages/jsonpath/plugin-extras/src/functions/array.ts` (new)
- `packages/jsonpath/plugin-extras/src/functions/aggregation.ts` (new)
- `packages/jsonpath/plugin-extras/src/functions/utility.ts` (new)
- `packages/jsonpath/plugin-extras/src/index.ts`

**What:**

1. Implement string functions - [spec §5.5](../../specs/jsonpath.md#55-jsonpathplugin-extras):
   - `startsWith(str, prefix)`
   - `endsWith(str, suffix)`
   - `contains(str, substr)`
   - `lower(str)`
   - `upper(str)`
   - `trim(str)`
   - `substring(str, start, length?)`
   - `split(str, delimiter)`
2. Implement array functions - [spec §5.5](../../specs/jsonpath.md#55-jsonpathplugin-extras):
   - `keys(obj)`
   - `first(arr)`
   - `last(arr)`
   - `reverse(arr)`
   - `sort(arr)`
3. Implement aggregation functions - [spec §5.5](../../specs/jsonpath.md#55-jsonpathplugin-extras):
   - `min(arr)`
   - `max(arr)`
   - `sum(arr)`
   - `avg(arr)`
4. Implement utility functions - [spec §5.5](../../specs/jsonpath.md#55-jsonpathplugin-extras):
   - `floor(n)`
   - `ceil(n)`
   - `round(n)`
   - `abs(n)`
5. Register all functions with core registry

**References:**

- [Audit Report §11](../jsonpath-comprehensive-audit-report-2025-01-04.md#11-plugins--status--started-40)

**Testing:**

- Verify each function with various inputs
- Verify error handling for invalid types
- Run plugin-extras test suite

---

### Step 16: Implement FilterBuilder in path-builder (P2)

**Files:**

- `packages/jsonpath/path-builder/src/filter-builder.ts` (new)
- `packages/jsonpath/path-builder/src/index.ts`

**What:**

1. Implement `FilterBuilder` class - [spec §5.6](../../specs/jsonpath.md#56-jsonpathplugin-path-builder)
2. Support comparison operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
3. Support logical operators: `and`, `or`, `not`
4. Support function calls: `match`, `search`, `length`
5. Support nested expressions
6. Generate valid filter expressions

**References:**

- [Audit Report §11](../jsonpath-comprehensive-audit-report-2025-01-04.md#11-plugins--status--started-40)

**Testing:**

- Verify `FilterBuilder.path('@.price').gt(10).and().path('@.qty').lt(5).build()` generates `@.price > 10 && @.qty < 5`
- Verify complex nested expressions
- Run path-builder test suite

---

### Step 17: Core Infrastructure Improvements (P2/P3)

**Files:**

- `packages/jsonpath/core/src/plugins.ts`
- `packages/jsonpath/core/src/lexer-interface.ts` (new)
- `packages/jsonpath/lexer/src/constants.ts` (new)
- `packages/jsonpath/lexer/src/index.ts`

**What:**

1. Move `LexerInterface` type from lexer to core - [spec §4.2](../../specs/jsonpath.md#42-jsonpathlexer)
2. Export character code constants from lexer - [spec §4.2](../../specs/jsonpath.md#42-jsonpathlexer)
3. Implement plugin dependency resolution - [spec §5.1](../../specs/jsonpath.md#51-plugin-interface)
4. Implement plugin version management - [spec §5.1](../../specs/jsonpath.md#51-plugin-interface)

**References:**

- [Audit Report §1](../jsonpath-comprehensive-audit-report-2025-01-04.md#1-jsonpathcore--status--good-90)
- [Audit Report §2](../jsonpath-comprehensive-audit-report-2025-01-04.md#2-jsonpathlexer--status--good-85)

**Testing:**

- Verify plugins can declare dependencies
- Verify plugin loading respects version constraints
- Verify LexerInterface is available from core

---

### Step 18: Performance Benchmarks (P2)

**Files:**

- `packages/jsonpath/benchmarks/src/evaluator.bench.ts` (new)
- `packages/jsonpath/benchmarks/src/compiler.bench.ts` (new)
- `packages/jsonpath/benchmarks/src/pointer.bench.ts` (new)
- `packages/jsonpath/benchmarks/src/patch.bench.ts` (new)
- `packages/jsonpath/benchmarks/src/index.ts`

**What:**

1. Implement comprehensive benchmarks per [Audit Report §15](../jsonpath-comprehensive-audit-report-2025-01-04.md#15-performance-status):
   - Interpreted evaluation: target >1M ops/sec
   - Compiled evaluation: target >5M ops/sec
   - JSON Pointer resolve: target >10M ops/sec
   - JSON Patch apply: target >500K ops/sec
2. Add benchmark scripts to package.json
3. Create baseline results for regression tracking
4. **CI Integration**: Add as reporting only (non-blocking) for performance monitoring

**References:**

- [Audit Report §15](../jsonpath-comprehensive-audit-report-2025-01-04.md#15-performance-status)
- [Spec §6.4](../../specs/jsonpath.md#64-performance-targets)

**Testing:**

- Run benchmarks and record baseline
- Document performance results in PR
- Compare interpreted vs compiled performance

---

### Step 19: Documentation and API Cleanup (P3)

**Files:**

- `packages/jsonpath/docs/api.md`
- `packages/jsonpath/jsonpath/src/index.ts`
- Various package `README.md` files

**What:**

1. Complete full re-exports from facade package - [spec L1895-1900](../../specs/jsonpath.md#L1895)
2. Document all public APIs
3. Add inline JSDoc comments
4. Create usage examples for new features
5. Update package README files
6. Create migration guide from json-p3

**References:**

- [Audit Report §10](../jsonpath-comprehensive-audit-report-2025-01-04.md#10-jsonpathjsonpath-facade--status--partial-70)

**Testing:**

- Verify all public types are exported
- Verify documentation builds without errors
- Verify examples compile and run

---

### Step 20: Bundle Size Optimization (P3)

**Files:**

- `packages/jsonpath/*/vite.config.ts`
- `packages/jsonpath/*/package.json`

**What:**

1. Analyze bundle sizes for all packages - [Audit Report §11](../jsonpath-comprehensive-audit-report-2025-01-04.md#11-plugins--status--started-40)
2. Optimize tree-shaking configuration
3. Ensure granular exports for selective imports
4. Add bundle size limits to CI
5. Document bundle impact in package documentation

**References:**

- [Audit Report §11](../jsonpath-comprehensive-audit-report-2025-01-04.md#11-plugins--status--started-40)

**Testing:**

- Measure bundle sizes before and after
- Verify tree-shaking works correctly
- Verify minimal import pulls only required code

---

## Dependency Graph

```
Step 1 (Codegen) ──> Step 2 (CompiledQuery) ──> Step 3 (Optimizations)
      │                                               │
      └───────────────────────────────────────────────┼──> Step 18 (Benchmarks)
                                                      │
Step 4 (Functions Fix) ──> Step 5 (CTS) ──────────────┘

Step 6 (Parser Nodes) ───┐
                         │
Step 7 (Parser Options) ─┤
                         │
Step 8 (Evaluator) ──────┤
                         │
Step 9 (I-Regexp) ───────┤
                         │
Step 10 (Pointer) ───────┘

Step 11 (Patch) ─────────┐
                         │
Step 12 (Facade) ────────┤
                         │
Step 13 (plugin-ext) ────┼──> Step 17 (Core) ──> Step 19 (Docs) ──> Step 20 (Bundle)
                         │
Step 14 (plugin-arith) ──┤
                         │
Step 15 (plugin-extras) ─┤
                         │
Step 16 (FilterBuilder) ─┘
```

---

## Estimated Effort

| Step | Description    | Priority | Complexity | Estimated Days |
| ---- | -------------- | -------- | ---------- | -------------- |
| 1    | JIT Codegen    | P0       | XL         | 5              |
| 2    | CompiledQuery  | P0       | XL         | 3              |
| 3    | Compiler Opts  | P0       | L          | 2              |
| 4    | Functions Fix  | P0       | S          | 0.5            |
| 5    | CTS            | P0       | M          | 1              |
| 6    | Parser Nodes   | P1       | M          | 2              |
| 7    | Parser Options | P1       | M          | 1.5            |
| 8    | Evaluator      | P1       | M          | 1.5            |
| 9    | I-Regexp       | P1       | M          | 2              |
| 10   | Pointer        | P1       | S          | 0.5            |
| 11   | Patch          | P2       | M          | 2              |
| 12   | Facade         | P2       | M          | 2              |
| 13   | plugin-ext     | P2       | L          | 2              |
| 14   | plugin-arith   | P2       | L          | 2              |
| 15   | plugin-extras  | P2       | M          | 2              |
| 16   | FilterBuilder  | P2       | M          | 1              |
| 17   | Core Infra     | P2/P3    | M          | 1              |
| 18   | Benchmarks     | P2       | M          | 1              |
| 19   | Documentation  | P3       | S          | 1              |
| 20   | Bundle Opt     | P3       | L          | 1              |

**Total Estimated Effort:** ~33 developer days (~6-7 weeks)

---

## Success Criteria

- [ ] All 56 gaps addressed
- [ ] 100% RFC 9535 CTS pass rate
- [ ] Compiler generates actual JavaScript code
- [ ] Compiled query performance >5M ops/sec
- [ ] All plugins fully implemented
- [ ] Full RFC 9485 I-Regexp compliance
- [ ] All new features documented with examples
- [ ] All existing tests continue to pass
- [ ] All internal usages updated for breaking changes
- [ ] Benchmarks implemented for reporting (non-blocking)

---

## Breaking Changes

This v0 implementation includes the following breaking changes. Internal usages will be updated as part of the relevant steps:

1. **Step 11**: `ApplyOptions.mutate` default changes from `true` to `false`
2. **Step 6**: Slice selector property names change from `startValue/endValue/stepValue` to `start/end/step`
3. **Step 4**: `match()`/`search()` return `false` instead of `undefined` on invalid patterns

- [RFC 9485 - I-Regexp](https://www.rfc-editor.org/rfc/rfc9485.html)
- [RFC 6901 - JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901.html)
- [RFC 6902 - JSON Patch](https://www.rfc-editor.org/rfc/rfc6902.html)
- [RFC 7386 - JSON Merge Patch](https://www.rfc-editor.org/rfc/rfc7386.html)

### Internal Specification

- [specs/jsonpath.md](../../specs/jsonpath.md)

### Previous Plans

- [Gap Remediation Plan](../jsonpath-gap-remediation/plan.md)
- [Spec Compliance Audit](../jsonpath-spec-compliance-audit.md)
