# @jsonpath/\* Library Specification Compliance Audit

**Audit Date:** January 3, 2026
**Specification Version:** specs/jsonpath.md
**Branch:** feat/ui-spec-core-react-adapters-jsonp3

---

## Executive Summary

This audit evaluates the current `@jsonpath/*` package implementations against the comprehensive specification defined in `specs/jsonpath.md`. The findings reveal **significant gaps** between the specification and the current implementation, with the implementation representing approximately **15-20% of the specified functionality**.

### Overall Compliance Score: **18%** (Critical Gaps)

| Package               | Spec Coverage | Status          |
| --------------------- | ------------- | --------------- |
| @jsonpath/core        | ~60%          | Partial         |
| @jsonpath/lexer       | ~80%          | Good            |
| @jsonpath/parser      | ~65%          | Partial         |
| @jsonpath/evaluator   | ~30%          | Major Gaps      |
| @jsonpath/functions   | ~40%          | Major Gaps      |
| @jsonpath/pointer     | ~20%          | Critical Gaps   |
| @jsonpath/patch       | ~30%          | Major Gaps      |
| @jsonpath/merge-patch | ~25%          | Major Gaps      |
| @jsonpath/compiler    | ~10%          | Critical Gaps   |
| @jsonpath/jsonpath    | ~15%          | Critical Gaps   |
| Plugins               | 0%            | Not Implemented |

---

## Priority Legend

- 🔴 **P0 - Critical**: Required for RFC compliance, core functionality
- 🟠 **P1 - High**: Important API features specified in the spec
- 🟡 **P2 - Medium**: Extended features, optimizations
- 🟢 **P3 - Low**: Nice-to-have, plugin features

---

## 1. @jsonpath/core - Discrepancies

### 1.1 Missing Type Definitions (🔴 P0)

| Specified                      | Status       | Notes                                           |
| ------------------------------ | ------------ | ----------------------------------------------- |
| `QueryResult.parents()` method | ❌ Missing   | Spec requires `parents(): QueryResult<unknown>` |
| `EvaluationContext` interface  | ❌ Missing   | Required for evaluator options passing          |
| `LexerInterface` type          | ⚠️ Misplaced | Defined in lexer, not core                      |
| `Nothing` symbol type          | ❌ Missing   | RFC 9535 requires distinction from `null`       |

### 1.2 Missing Error Codes (🟠 P1)

The spec defines additional error codes not present:

```typescript
// Missing error codes
| 'UNEXPECTED_TOKEN'
| 'UNEXPECTED_END'
| 'INVALID_ESCAPE'
| 'INVALID_NUMBER'
| 'UNKNOWN_FUNCTION'
| 'MAX_DEPTH_EXCEEDED'
| 'TIMEOUT'
| 'INVALID_ARRAY_INDEX'
| 'TEST_FAILED'
| 'PATH_NOT_FOUND'
```

### 1.3 Missing Error Class Properties (🟠 P1)

**`JSONPathSyntaxError`** - Missing:

- `expected?: string[]`
- `found?: string`
- `path?: string` (constructor doesn't accept)

**`JSONPathTypeError`** - Missing:

- `expectedType?: string`
- `actualType?: string`

**`JSONPatchError`** - Missing:

- `operationIndex?: number`
- `operation?: PatchOperation`

### 1.4 Registry Functions (🟠 P1)

| Specified                                   | Status     |
| ------------------------------------------- | ---------- |
| `unregisterFunction(name: string): boolean` | ❌ Missing |
| `getFunction(name: string)`                 | ❌ Missing |
| `hasFunction(name: string): boolean`        | ❌ Missing |

---

## 2. @jsonpath/lexer - Discrepancies

### 2.1 Missing Exports (🟠 P1)

| Specified                           | Status                                 |
| ----------------------------------- | -------------------------------------- |
| `createLexer(input: string): Lexer` | ✅ Exists                              |
| `tokenize(input: string): Token[]`  | ✅ Exists                              |
| Character flag constants export     | ⚠️ Partial - exports `CHAR_FLAGS` only |

### 2.2 Implementation Notes

✅ ASCII lookup table implementation is present
✅ Character code constants are implemented
✅ String escape sequences are handled
✅ Number formats (integer, decimal, scientific) are supported
⚠️ Error recovery on invalid characters implemented but could be improved

---

## 3. @jsonpath/parser - Discrepancies

### 3.1 Missing AST Node Types (🔴 P0)

| Specified         | Status                       |
| ----------------- | ---------------------------- |
| `RootSelector`    | ❌ Missing                   |
| `CurrentSelector` | ❌ Missing                   |
| `LogicalExpr`     | ❌ Missing (uses BinaryExpr) |
| `ComparisonExpr`  | ❌ Missing (uses BinaryExpr) |
| `FilterQuery`     | ❌ Missing                   |

### 3.2 Missing Properties on AST Nodes (🟠 P1)

**`QueryNode`**:

- `raw: string` - ❌ Missing (original query string)

**`NameSelectorNode`**:

- `quoted: boolean` - ❌ Missing (whether name was quoted)

**`LiteralNode`**:

- `raw: string` - ❌ Missing (original string representation)

**`SliceSelectorNode`** - Property naming mismatch:

- Spec: `start`, `end`, `step`
- Impl: `startValue`, `endValue`, `stepValue`

### 3.3 Missing Parser Options (🟠 P1)

```typescript
// Specified but not implemented
interface ParserOptions {
	allowExtensions?: boolean;
	strict?: boolean; // RFC 9535 strict mode
}
```

### 3.4 Missing Parser Functions (🟠 P1)

| Specified                                        | Status     |
| ------------------------------------------------ | ---------- |
| `parseExpression(input: string): ExpressionNode` | ❌ Missing |

### 3.5 AST Utilities (🟡 P2)

| Specified                                   | Status     |
| ------------------------------------------- | ---------- |
| `walk(node, visitor)`                       | ✅ Exists  |
| `transform(node, transformer)`              | ✅ Exists  |
| `ASTVisitor` interface with `enter`/`leave` | ❌ Missing |
| Per-node-type visitor methods               | ⚠️ Partial |

---

## 4. @jsonpath/evaluator - Discrepancies

### 4.1 Critical Missing Features (🔴 P0)

**`EvaluatorOptions`** - Completely missing:

```typescript
interface EvaluatorOptions {
	maxDepth?: number; // ❌ Not implemented
	maxResults?: number; // ❌ Not implemented
	timeout?: number; // ❌ Not implemented
	maxNodes?: number; // ❌ Not implemented
	maxFilterDepth?: number; // ❌ Not implemented
	detectCircular?: boolean; // ❌ Not implemented
}
```

**`SecureQueryOptions`** - Not implemented:

```typescript
interface SecureQueryOptions {
	allowPaths?: string[];
	blockPaths?: string[];
	noRecursive?: boolean;
	noFilters?: boolean;
	maxQueryLength?: number;
}
```

### 4.2 QueryResult Implementation Gaps (🔴 P0)

**Current implementation** in `query-result.ts` is **significantly incomplete**:

| Specified Method      | Status                                               |
| --------------------- | ---------------------------------------------------- |
| `values()`            | ⚠️ Getter, not method                                |
| `paths()`             | ⚠️ Returns `string[][]` not `PathSegment[][]`        |
| `pointers()`          | ❌ Missing                                           |
| `normalizedPaths()`   | ❌ Missing                                           |
| `nodes()`             | ⚠️ Getter, not method                                |
| `first()`             | ⚠️ Getter returning value, not method returning node |
| `last()`              | ❌ Missing                                           |
| `isEmpty()`           | ❌ Missing                                           |
| `length`              | ✅ Exists                                            |
| `map()`               | ❌ Missing                                           |
| `filter()`            | ❌ Missing                                           |
| `forEach()`           | ❌ Missing                                           |
| `parents()`           | ❌ Missing                                           |
| `[Symbol.iterator]()` | ❌ Missing                                           |

**QueryResultNode** - Missing properties:

- `root: unknown` - ❌ Missing
- `parent?: unknown` - ❌ Missing
- `parentKey?: PathSegment` - ❌ Missing
- Path stored as `string[]` instead of `PathSegment[]` (numbers as strings)

### 4.3 Missing Evaluator Methods (🟠 P1)

| Specified                                  | Status               |
| ------------------------------------------ | -------------------- |
| `stream()` generator function              | ❌ Missing           |
| `Evaluator` class constructor with options | ⚠️ Only accepts root |

### 4.4 Slice Normalization (🔴 P0)

Current slice implementation does not match RFC 9535 §2.3.4.2:

- Missing proper negative index normalization per spec
- Step=0 handling differs from spec (should throw)

---

## 5. @jsonpath/functions - Discrepancies

### 5.1 Function Registry Architecture (🔴 P0)

**Major architecture mismatch:**

- Spec uses `@jsonpath/core` registries
- Implementation has its own `FunctionRegistry` class in `@jsonpath/functions`
- Two separate function registry systems exist

### 5.2 Function Definition Mismatch (🔴 P0)

**Spec:**

```typescript
interface FunctionDefinition<TArgs, TReturn> {
	name: string;
	signature: readonly ParameterType[]; // ❌ Missing in impl
	returns: ReturnType; // ❌ Missing in impl
	evaluate: (...args: TArgs) => TReturn;
}
```

**Implementation:**

```typescript
interface FunctionDefinition {
	name: string;
	execute: (...args: any[]) => any; // Different method name
	validate?: (args: any[]) => void;
}
```

### 5.3 Missing Function Exports (🟠 P1)

| Specified                    | Status     |
| ---------------------------- | ---------- |
| `registerBuiltinFunctions()` | ❌ Missing |
| `registerLength()`           | ❌ Missing |
| `registerCount()`            | ❌ Missing |
| `registerMatch()`            | ❌ Missing |
| `registerSearch()`           | ❌ Missing |
| `registerValue()`            | ❌ Missing |
| `unregisterFunction(name)`   | ❌ Missing |
| `getFunction(name)`          | ❌ Missing |
| `hasFunction(name)`          | ❌ Missing |

### 5.4 Function Implementation Issues (🟠 P1)

**`length()`:**

- Spec: Returns `null` for non-applicable types
- Impl: Returns `0` for non-applicable types ❌

**`match()`:**

- Missing I-Regexp (RFC 9485) compliance
- Should wrap pattern with `^(?:...)$` for full match
- Missing Unicode mode requirement

**`value()`:**

- Receives raw values, not `QueryNode[]` as specified

---

## 6. @jsonpath/pointer - Discrepancies

### 6.1 Missing Core Functions (🔴 P0)

| Specified                                   | Status                                     |
| ------------------------------------------- | ------------------------------------------ |
| `parse(pointer): PathSegment[]`             | ⚠️ Returns `string[]`, not `PathSegment[]` |
| `stringify(path): string`                   | ❌ Missing (only `JSONPointer.format()`)   |
| `resolve<T>(pointer, data): T \| undefined` | ⚠️ Only class method                       |
| `resolveOrThrow<T>(pointer, data): T`       | ❌ Missing                                 |
| `exists(pointer, data): boolean`            | ❌ Missing                                 |
| `resolveWithParent<T>(pointer, data)`       | ❌ Missing                                 |
| `set<T>(pointer, data, value): T`           | ❌ Missing                                 |
| `remove<T>(pointer, data): T`               | ❌ Missing                                 |
| `append<T>(pointer, data, value): T`        | ❌ Missing                                 |
| `isValid(pointer): boolean`                 | ❌ Missing                                 |
| `validate(pointer): ValidationResult`       | ❌ Missing                                 |
| `parent(pointer): string`                   | ❌ Missing                                 |
| `join(...pointers): string`                 | ❌ Missing                                 |
| `split(pointer): string[]`                  | ❌ Missing                                 |
| `escape(token): string`                     | ❌ Missing as export                       |
| `unescape(token): string`                   | ❌ Missing as export                       |
| `toNormalizedPath(pointer): string`         | ❌ Missing                                 |
| `fromNormalizedPath(path): string`          | ❌ Missing                                 |

### 6.2 Relative JSON Pointer (🟡 P2)

Completely missing:

- `RelativePointer` class
- `relative()` function
- `resolveRelative()` function

### 6.3 Array Index Handling (🔴 P0)

Current implementation:

- Uses `parseInt()` which may accept leading zeros
- Spec requires strict: no leading zeros except "0"
- Missing validation for valid array index format

### 6.4 Immutability (🔴 P0)

Spec requires immutable operations (`set`, `remove`, `append` return new objects).
Current implementation only has `evaluate()` which is read-only.

---

## 7. @jsonpath/patch - Discrepancies

### 7.1 Missing Core Functions (🔴 P0)

| Specified                          | Status                                  |
| ---------------------------------- | --------------------------------------- |
| `apply(ops, data, options)`        | ⚠️ `applyPatch()` - different signature |
| `applyWithErrors(ops, data)`       | ❌ Missing                              |
| `applyWithInverse(ops, data)`      | ❌ Missing                              |
| `validate(ops): ValidationError[]` | ❌ Missing                              |
| `diff(source, target, options)`    | ❌ Missing                              |

### 7.2 Missing ApplyOptions (🟠 P1)

```typescript
interface ApplyOptions {
	mutate?: boolean; // ❌ Always clones currently
	validate?: boolean; // ❌ Missing
	continueOnError?: boolean; // ❌ Missing
	inverse?: boolean; // ❌ Missing
	before?: Function; // ❌ Missing
	after?: Function; // ❌ Missing
}
```

### 7.3 PatchBuilder Class (🟠 P1)

Completely missing:

- Fluent builder API
- `add()`, `remove()`, `replace()`, `move()`, `copy()`, `test()` methods
- Conditional operations (`when()`, `ifExists()`, `ifNotExists()`)
- `toOperations()`, `toJSON()`, `apply()` methods

### 7.4 JSONPath-based Operations (🟡 P2)

Completely missing:

- `applyWithJSONPath()`
- `toPatchOperations()`
- `JSONPathPatchOperation` type
- Bulk operations with JSONPath selectors

### 7.5 Individual Operation Exports (🟠 P1)

Missing standalone function exports:

- `add<T>(data, path, value): T`
- `remove<T>(data, path): T`
- `replace<T>(data, path, value): T`
- `move<T>(data, from, to): T`
- `copy<T>(data, from, to): T`
- `test(data, path, value): boolean`

### 7.6 Immutability Violation (🔴 P0)

Current implementation mutates internal clone then returns it.
Spec requires proper immutable patterns with structural sharing.

---

## 8. @jsonpath/merge-patch - Discrepancies

### 8.1 Missing Functions (🟠 P1)

| Specified                            | Status                              |
| ------------------------------------ | ----------------------------------- |
| `mergePatch(target, patch, options)` | ⚠️ `applyMergePatch()` - no options |
| `createMergePatch(source, target)`   | ❌ Missing                          |
| `isValidMergePatch(patch): boolean`  | ❌ Missing                          |
| `mergePatchWithTrace(target, patch)` | ❌ Missing                          |
| `toJSONPatch(target, patch)`         | ❌ Missing                          |
| `fromJSONPatch(ops)`                 | ❌ Missing                          |

### 8.2 Missing Options (🟡 P2)

```typescript
interface MergePatchOptions {
	immutable?: boolean; // ❌ Missing
}
```

### 8.3 Missing Result Types (🟡 P2)

```typescript
interface MergePatchResult<T> {
	result: T;
	trace: MergePatchOperation[];
}

interface MergePatchOperation {
	type: 'set' | 'delete' | 'replace';
	path: string;
	oldValue?: unknown;
	newValue?: unknown;
}
```

---

## 9. @jsonpath/compiler - Discrepancies

### 9.1 Critical Gaps (🔴 P0)

Current implementation is a **thin wrapper** around the evaluator:

```typescript
// Current (no actual compilation)
export function compile(ast: QueryNode): CompiledQuery {
	return (root: any) => evaluate(root, ast);
}
```

**Spec requires:**

- JIT compilation to optimized JavaScript
- Generated source code access
- Compilation time tracking
- Optimization strategies

### 9.2 Missing CompiledQuery Properties (🔴 P0)

| Specified                 | Status     |
| ------------------------- | ---------- |
| `source: string`          | ❌ Missing |
| `ast: QueryNode`          | ❌ Missing |
| `compilationTime: number` | ❌ Missing |

### 9.3 Missing Compiler Class (🟠 P1)

```typescript
class Compiler {
	constructor(options?: CompilerOptions);
	compile<T>(ast: QueryNode): CompiledQuery<T>;
}
```

### 9.4 CompilerOptions (🟠 P1)

```typescript
interface CompilerOptions {
	sourceMap?: boolean; // ❌ Missing
	optimizeForSmall?: boolean; // ❌ Missing
	unsafe?: boolean; // ❌ Missing
}
```

### 9.5 Missing Export (🟠 P1)

| Specified                               | Status     |
| --------------------------------------- | ---------- |
| `compileQuery(query: string, options?)` | ❌ Missing |

---

## 10. @jsonpath/jsonpath (Facade) - Discrepancies

### 10.1 Missing Configuration API (🔴 P0)

```typescript
// Completely missing
interface JSONPathConfig { ... }
interface Plugin { ... }
interface PluginContext { ... }

function configure(options: Partial<JSONPathConfig>): void;
function getConfig(): Readonly<JSONPathConfig>;
function reset(): void;
```

### 10.2 Missing Query Functions (🔴 P0)

| Specified                            | Status                            |
| ------------------------------------ | --------------------------------- |
| `query(path, data, options)`         | ⚠️ Exists but different signature |
| `match(path, data, options)`         | ❌ Missing                        |
| `value(path, data, options)`         | ❌ Missing                        |
| `exists(path, data, options)`        | ❌ Missing                        |
| `count(path, data, options)`         | ❌ Missing                        |
| `stream(path, data, options)`        | ❌ Missing                        |
| `multiQuery(data, queries, options)` | ❌ Missing                        |
| `createQuerySet(queries)`            | ❌ Missing                        |
| `secureQuery(path, data, options)`   | ❌ Missing                        |
| `validateQuery(path)`                | ❌ Missing                        |

### 10.3 Missing Data Transformation API (🟠 P1)

Completely missing:

- `transform(data, path, fn)`
- `transformAll(data, transforms)`
- `project(data, projection)`
- `projectWith(data, projection)`
- `pick(data, paths)`
- `omit(data, paths)`
- `merge(target, ...sources)`
- `mergeWith(target, sources, options)`

### 10.4 Missing Re-exports (🟠 P1)

Many core type re-exports missing:

- All AST types
- All option interfaces
- All result types

### 10.5 Missing Cache Management (🟡 P2)

| Specified              | Status     |
| ---------------------- | ---------- |
| `clearCache()`         | ❌ Missing |
| `getCacheStats()`      | ❌ Missing |
| `CacheStats` interface | ❌ Missing |

### 10.6 Missing Conversion Utilities (🟡 P2)

| Specified                           | Status     |
| ----------------------------------- | ---------- |
| `pathToPointer(path)`               | ❌ Missing |
| `pointerToPath(pointer)`            | ❌ Missing |
| `jsonPathToPointer(normalizedPath)` | ❌ Missing |

---

## 11. Plugin System - Not Implemented (🟡 P2)

### 11.1 Core Plugin Infrastructure

Completely missing:

- Plugin interface
- PluginContext
- Plugin lifecycle (setup/teardown)

### 11.2 Specified Plugins

| Plugin                        | Status             |
| ----------------------------- | ------------------ |
| @jsonpath/plugin-extended     | ❌ Not implemented |
| @jsonpath/plugin-types        | ❌ Not implemented |
| @jsonpath/plugin-arithmetic   | ❌ Not implemented |
| @jsonpath/plugin-extras       | ❌ Not implemented |
| @jsonpath/plugin-path-builder | ❌ Not implemented |

---

## 12. Testing & Performance Requirements

### 12.1 Compliance Test Suites (🔴 P0)

| Requirement                    | Status             |
| ------------------------------ | ------------------ |
| JSONPath Compliance Test Suite | ❌ Not integrated  |
| JSON Pointer Test Suite        | ❌ Not integrated  |
| JSON Patch Test Suite          | ❌ Not integrated  |
| Property-based tests           | ❌ Not implemented |

### 12.2 Performance Benchmarks (🟡 P2)

| Requirement                    | Status             |
| ------------------------------ | ------------------ |
| Benchmark suite                | ❌ Not implemented |
| Performance targets validation | ❌ Not measured    |

---

## 13. Build Configuration Issues

### 13.1 Package.json Discrepancies (🟡 P2)

| Specified               | Status      |
| ----------------------- | ----------- |
| Dual CJS/ESM exports    | ❌ Only ESM |
| `exports.require` entry | ❌ Missing  |

---

## Summary of Top Priority Items

### 🔴 P0 - Critical (Must Fix First)

1. **QueryResult interface** - Severely incomplete, blocking proper result handling
2. **Pointer API** - Missing all mutation functions (`set`, `remove`, `append`)
3. **EvaluatorOptions** - No security limits, no timeout, no depth control
4. **Function registry unification** - Two incompatible registries
5. **Slice normalization** - Non-compliant with RFC 9535
6. **Immutability guarantees** - Patch operations mutate data

### 🟠 P1 - High Priority

7. **Compiler JIT** - Currently just wraps evaluator
8. **Configuration API** - No `configure()`, `getConfig()`, `reset()`
9. **Facade query functions** - Missing `match`, `value`, `exists`, `count`
10. **Error class properties** - Missing detailed error context
11. **PatchBuilder** - Fluent API completely missing
12. **Transformation API** - `transform`, `project`, `pick`, `omit` missing

### 🟡 P2 - Medium Priority

13. **Plugin system** - Not implemented
14. **Relative JSON Pointers** - RFC extension not supported
15. **Compliance test integration** - No external test suites
16. **Cache management API** - No `clearCache()`, `getCacheStats()`
17. **Streaming/generator API** - No `stream()` function

---

## Recommended Implementation Order

### Phase 1: Core Foundation (2-3 weeks)

1. Unify function registry architecture
2. Complete QueryResult interface implementation
3. Implement proper EvaluatorOptions
4. Add missing error codes and properties
5. Fix slice normalization per RFC 9535

### Phase 2: Pointer & Patch (1-2 weeks)

1. Implement pointer mutation functions (`set`, `remove`, `append`)
2. Implement pointer validation and utilities
3. Add `diff()` function to patch
4. Implement PatchBuilder class
5. Add `applyWithInverse()` for undo support

### Phase 3: Facade & Configuration (1 week)

1. Implement configuration API
2. Add missing query convenience functions
3. Implement transformation API
4. Add cache management

### Phase 4: Performance & Compliance (2 weeks)

1. Implement actual JIT compiler
2. Integrate RFC compliance test suites
3. Implement security options (SecureQueryOptions)
4. Add performance benchmarks

### Phase 5: Extensions (1-2 weeks)

1. Implement plugin system
2. Create plugin-extended (parent, property selectors)
3. Create plugin-types (type checking functions)
4. Create plugin-extras (utility functions)

---

## Appendix: File-by-File Change Requirements

### packages/jsonpath/core/src/

| File        | Changes Required                                           |
| ----------- | ---------------------------------------------------------- |
| types.ts    | Add `EvaluationContext`, `Nothing` type, fix `QueryResult` |
| errors.ts   | Add missing error codes, extend error classes              |
| registry.ts | Add `unregister`, `get`, `has` functions                   |
| utils.ts    | ✅ Complete                                                |

### packages/jsonpath/evaluator/src/

| File            | Changes Required                              |
| --------------- | --------------------------------------------- |
| query-result.ts | Complete rewrite to match spec                |
| evaluator.ts    | Add options support, fix slice, add streaming |

### packages/jsonpath/pointer/src/

| File       | Changes Required                                      |
| ---------- | ----------------------------------------------------- |
| pointer.ts | Add all missing functions, fix array index validation |
| index.ts   | Export all new functions                              |

### packages/jsonpath/patch/src/

| File     | Changes Required                              |
| -------- | --------------------------------------------- |
| patch.ts | Add PatchBuilder, diff, options, immutability |
| index.ts | Export all new functions                      |

### packages/jsonpath/jsonpath/src/

| File         | Changes Required                                 |
| ------------ | ------------------------------------------------ |
| facade.ts    | Major expansion with config, all query functions |
| config.ts    | New file for configuration management            |
| transform.ts | New file for transformation API                  |

---

_End of Compliance Audit Report_
