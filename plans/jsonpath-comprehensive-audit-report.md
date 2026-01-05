# @jsonpath/\* Library Comprehensive Audit Report

**Audit Date:** January 4, 2026  
**Branch:** `feat/ui-spec-core-react-adapters-jsonp3`  
**Specification:** [specs/jsonpath.md](../specs/jsonpath.md)  
**Related Plans:** `plans/jsonpath-*`, `.copilot-tracking/research/*-jsonpath-*.md`

---

## Executive Summary

This audit compares the current `@jsonpath/*` package implementations against the specification, implementation plans, and research documents. The implementation has **improved significantly** since the previous audit (18% → ~55%), but substantial gaps remain.

### Updated Compliance Score: **~55%** (Improved from 18%)

| Package                  | Spec Coverage | Previous | Status      | Notes                                 |
| ------------------------ | ------------- | -------- | ----------- | ------------------------------------- |
| @jsonpath/core           | ~85%          | 60%      | ✅ Good     | Registry complete, types mostly done  |
| @jsonpath/lexer          | ~80%          | 80%      | ✅ Good     | Stable, well-tested                   |
| @jsonpath/parser         | ~70%          | 65%      | ⚠️ Partial  | Missing some AST properties           |
| @jsonpath/evaluator      | ~65%          | 30%      | ⚠️ Partial  | QueryResult improved, options partial |
| @jsonpath/functions      | ~75%          | 40%      | ⚠️ Partial  | Built-ins present, registry unified   |
| @jsonpath/pointer        | ~80%          | 20%      | ✅ Good     | Most functions implemented            |
| @jsonpath/patch          | ~70%          | 30%      | ⚠️ Partial  | Core ops done, builder basic          |
| @jsonpath/merge-patch    | ~65%          | 25%      | ⚠️ Partial  | Core done, utilities missing          |
| @jsonpath/compiler       | ~15%          | 10%      | 🔴 Critical | No actual JIT compilation             |
| @jsonpath/jsonpath       | ~50%          | 15%      | ⚠️ Partial  | Facade exists, missing features       |
| @jsonpath/compat-json-p3 | N/A           | N/A      | 🆕 New      | json-p3 compatibility layer           |
| Plugins                  | ~25%          | 0%       | ⚠️ Started  | Basic infrastructure only             |

---

## Priority Legend

- 🔴 **P0 - Critical**: Required for RFC compliance, core functionality
- 🟠 **P1 - High**: Important API features specified in the spec
- 🟡 **P2 - Medium**: Extended features, optimizations
- 🟢 **P3 - Low**: Nice-to-have, plugin features

---

## 1. @jsonpath/core — Status: ✅ Good (85%)

### ✅ Implemented

| Feature                                                                | Status      | Notes                                   |
| ---------------------------------------------------------------------- | ----------- | --------------------------------------- |
| JSON Types (`JSONValue`, `JSONPrimitive`, etc.)                        | ✅ Complete | All types defined                       |
| `PathSegment`, `Path` types                                            | ✅ Complete | Proper typing                           |
| `QueryNode` interface                                                  | ✅ Complete | Includes `root`, `parent`, `parentKey`  |
| `QueryResult` interface                                                | ✅ Complete | All methods defined                     |
| `FunctionDefinition` interface                                         | ✅ Complete | With `signature`, `returns`, `evaluate` |
| `SelectorDefinition` interface                                         | ✅ Complete | Basic definition                        |
| `OperatorDefinition` interface                                         | ✅ Complete | Basic definition                        |
| Function registry (`functionRegistry`)                                 | ✅ Complete | Map-based                               |
| `registerFunction`, `getFunction`, `hasFunction`, `unregisterFunction` | ✅ Complete | All CRUD operations                     |
| Selector/Operator registries                                           | ✅ Complete | Maps created                            |
| Error classes                                                          | ✅ Complete | Full hierarchy                          |
| Error codes                                                            | ✅ Complete | Extended list including new codes       |
| `EvaluatorOptions` interface                                           | ✅ Complete | With all limit options                  |
| `SecureQueryOptions` interface                                         | ✅ Complete | Path restrictions, limits               |
| Plugin types (`JSONPathPlugin`, `PluginManager`)                       | ✅ Complete | Basic lifecycle hooks                   |

### ❌ Unimplemented or Partially Implemented

| Feature                                     | Priority | Status     | Notes                                                 | Spec Reference                                                           |
| ------------------------------------------- | -------- | ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `Nothing` symbol type                       | 🟠 P1    | ❌ Missing | RFC 9535 requires distinction from `null`             | [RFC 9535 §2.1](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.1) |
| `deepEqual` utility                         | 🟠 P1    | ✅ Exists  | In utils.ts                                           | [spec L382](../specs/jsonpath.md#L382)                                   |
| `deepClone` utility                         | 🟡 P2    | ❌ Missing | Spec requires it; using `structuredClone` in practice | [spec L382-390](../specs/jsonpath.md#L382)                               |
| `freeze` utility                            | 🟡 P2    | ❌ Missing | Recursive Object.freeze                               | [spec L382-400](../specs/jsonpath.md#L382)                               |
| `isObject`, `isArray`, `isPrimitive` guards | 🟡 P2    | ⚠️ Partial | Some exist in utils                                   | [spec L400-420](../specs/jsonpath.md#L400)                               |

---

## 2. @jsonpath/lexer — Status: ✅ Good (80%)

### ✅ Implemented

| Feature                 | Status      | Notes                        |
| ----------------------- | ----------- | ---------------------------- |
| `TokenType` enum        | ✅ Complete | All token types              |
| `Token` interface       | ✅ Complete | With position info           |
| `Lexer` class           | ✅ Complete | Full implementation          |
| `createLexer()` factory | ✅ Complete | Exported                     |
| `tokenize()` utility    | ✅ Complete | Exported                     |
| ASCII lookup table      | ✅ Complete | `CHAR_FLAGS` exported        |
| String escape sequences | ✅ Complete | All RFC escapes              |
| Number formats          | ✅ Complete | Integer, decimal, scientific |
| Error recovery          | ⚠️ Partial  | Basic error tokens           |

### ❌ Unimplemented

| Feature                         | Priority | Status     | Notes                          | Spec Reference                                     |
| ------------------------------- | -------- | ---------- | ------------------------------ | -------------------------------------------------- |
| `LexerInterface` type in core   | 🟡 P2    | ❌ Missing | Spec says it should be in core | [spec §4.2](../specs/jsonpath.md#42-jsonpathlexer) |
| Character code constants export | 🟡 P2    | ⚠️ Partial | Internal only                  | [spec §4.2](../specs/jsonpath.md#42-jsonpathlexer) |

---

## 3. @jsonpath/parser — Status: ⚠️ Partial (70%)

### ✅ Implemented

| Feature                                              | Status      | Notes              |
| ---------------------------------------------------- | ----------- | ------------------ |
| `NodeType` enum                                      | ✅ Complete | All node types     |
| `Query`, `Segment`, `Selector` nodes                 | ✅ Complete | Core AST structure |
| `BinaryExpr`, `UnaryExpr`, `FunctionCall`, `Literal` | ✅ Complete | Expression nodes   |
| `parse(input)` function                              | ✅ Complete | Main entry point   |
| Pratt parser algorithm                               | ✅ Complete | Correct precedence |
| `walk(node, visitor)` utility                        | ✅ Complete | AST traversal      |
| `transform(node, transformer)`                       | ✅ Complete | AST transformation |
| `isSingularQuery()` helper                           | ✅ Complete | RFC 9535 detection |

### ❌ Unimplemented or Issues

| Feature                           | Priority | Status      | Notes                                                           | Spec Reference                                      |
| --------------------------------- | -------- | ----------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `RootSelector` node type          | 🟠 P1    | ❌ Missing  | Spec requires dedicated node                                    | [spec L565](../specs/jsonpath.md#L565)              |
| `CurrentSelector` node type       | 🟠 P1    | ❌ Missing  | Spec requires dedicated node                                    | [spec L566](../specs/jsonpath.md#L566)              |
| `LogicalExpr` node type           | 🟡 P2    | ❌ Missing  | Uses `BinaryExpr` instead                                       | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| `ComparisonExpr` node type        | 🟡 P2    | ❌ Missing  | Uses `BinaryExpr` instead                                       | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| `FilterQuery` node type           | 🟡 P2    | ❌ Missing  | Not in AST                                                      | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| `QueryNode.raw` property          | 🟠 P1    | ❌ Missing  | Original query string                                           | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| `NameSelectorNode.quoted`         | 🟡 P2    | ❌ Missing  | Whether name was quoted                                         | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| `LiteralNode.raw`                 | 🟡 P2    | ❌ Missing  | Original string representation                                  | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| Slice properties naming           | 🟡 P2    | ⚠️ Mismatch | Uses `startValue/endValue/stepValue` vs spec's `start/end/step` | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| `ParserOptions.strict`            | 🟠 P1    | ❌ Missing  | RFC 9535 strict mode                                            | [spec L701-710](../specs/jsonpath.md#L701)          |
| `parseExpression(input)`          | 🟡 P2    | ❌ Missing  | Standalone expression parser                                    | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |
| `ASTVisitor` with `enter`/`leave` | 🟡 P2    | ⚠️ Partial  | Different interface                                             | [spec §4.3](../specs/jsonpath.md#43-jsonpathparser) |

---

## 4. @jsonpath/evaluator — Status: ⚠️ Partial (65%)

### ✅ Implemented

| Feature                                        | Status      | Notes                     |
| ---------------------------------------------- | ----------- | ------------------------- |
| `evaluate(root, ast, options)`                 | ✅ Complete | Main evaluation function  |
| `QueryResult` class                            | ✅ Complete | Full implementation now   |
| `QueryResult.values()`                         | ✅ Complete | Method, not getter        |
| `QueryResult.paths()`                          | ✅ Complete | Returns `PathSegment[][]` |
| `QueryResult.pointers()`                       | ✅ Complete | Returns `JSONPointer[]`   |
| `QueryResult.normalizedPaths()`                | ✅ Complete | RFC 9535 format           |
| `QueryResult.nodes()`                          | ✅ Complete | Full nodes                |
| `QueryResult.first()`, `.last()`               | ✅ Complete | Node access               |
| `QueryResult.isEmpty()`                        | ✅ Complete | Empty check               |
| `QueryResult.length`                           | ✅ Complete | Count property            |
| `QueryResult.map()`, `.filter()`, `.forEach()` | ✅ Complete | Iteration helpers         |
| `QueryResult.parents()`                        | ✅ Complete | Parent traversal          |
| `[Symbol.iterator]()`                          | ✅ Complete | Iterable                  |
| `QueryNode` with `root`, `parent`, `parentKey` | ✅ Complete | Full metadata             |
| `options.ts` file                              | ✅ Exists   | Options handling          |

### ❌ Unimplemented or Issues

| Feature                                 | Priority | Status                | Notes                                | Spec Reference                                                                   |
| --------------------------------------- | -------- | --------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `maxDepth` enforcement                  | 🔴 P0    | ⚠️ Partial            | May not be fully tested              | [spec L938](../specs/jsonpath.md#L938)                                           |
| `maxResults` enforcement                | 🔴 P0    | ⚠️ Partial            | Early termination                    | [spec L941](../specs/jsonpath.md#L941)                                           |
| `timeout` with AbortController          | 🟠 P1    | ⚠️ Partial            | Signal support exists                | [spec L936-956](../specs/jsonpath.md#L936)                                       |
| `maxNodes` enforcement                  | 🟠 P1    | ⚠️ Partial            | Node counting                        | [spec L4870](../specs/jsonpath.md#L4870)                                         |
| `maxFilterDepth` enforcement            | 🟠 P1    | ❌ Missing            | Not implemented                      | [spec L950](../specs/jsonpath.md#L950)                                           |
| `detectCircular` option                 | 🟠 P1    | ❌ Missing            | Circular reference detection         | [spec L953](../specs/jsonpath.md#L953)                                           |
| `Evaluator` class                       | 🟠 P1    | ❌ Missing            | Spec requires class with constructor | [spec L975](../specs/jsonpath.md#L975)                                           |
| `stream()` generator function           | 🟡 P2    | ❌ Missing            | Lazy evaluation                      | [spec §4.5](../specs/jsonpath.md#45-jsonpathevaluator)                           |
| Slice normalization (RFC 9535 §2.3.4.2) | 🔴 P0    | ⚠️ Needs verification | May have edge cases                  | [RFC 9535 §2.3.4.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.4.2) |
| Secure query path restrictions          | 🟠 P1    | ⚠️ Partial            | Basic support in facade              | [spec L957-970](../specs/jsonpath.md#L957)                                       |

---

## 5. @jsonpath/functions — Status: ⚠️ Partial (75%)

### ✅ Implemented

| Feature                                          | Status      | Notes                          |
| ------------------------------------------------ | ----------- | ------------------------------ |
| `length()` function                              | ✅ Complete | Correct Unicode handling       |
| `count()` function                               | ✅ Complete | Node counting                  |
| `match()` function                               | ✅ Complete | With I-Regexp handling         |
| `search()` function                              | ✅ Complete | Partial match                  |
| `value()` function                               | ✅ Complete | Single value extraction        |
| Registration into core registry                  | ✅ Complete | Uses `@jsonpath/core` registry |
| `FunctionDefinition` with `signature`, `returns` | ✅ Complete | Proper typing                  |

### ❌ Unimplemented or Issues

| Feature                                     | Priority | Status          | Notes                        | Spec Reference                                                                                      |
| ------------------------------------------- | -------- | --------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `registerBuiltinFunctions()` export         | 🟡 P2    | ❌ Missing      | Auto-registers on import     | [spec §4.4](../specs/jsonpath.md#44-jsonpathfunctions)                                              |
| Individual `registerLength()`, etc. exports | 🟡 P2    | ❌ Missing      | For selective registration   | [spec §4.4](../specs/jsonpath.md#44-jsonpathfunctions)                                              |
| I-Regexp (RFC 9485) full compliance         | 🟠 P1    | ⚠️ Partial      | Uses regex approximation     | [spec L866-920](../specs/jsonpath.md#L866), [RFC 9485](https://www.rfc-editor.org/rfc/rfc9485.html) |
| Return `null` vs `undefined`                | 🟡 P2    | ⚠️ Inconsistent | Spec says `null` for Nothing | [spec §4.4](../specs/jsonpath.md#44-jsonpathfunctions)                                              |

---

## 6. @jsonpath/pointer — Status: ✅ Good (80%)

### ✅ Implemented

| Feature                                   | Status      | Notes                      |
| ----------------------------------------- | ----------- | -------------------------- |
| `JSONPointer` class                       | ✅ Complete | Parse, format, evaluate    |
| `parse(pointer)`                          | ✅ Complete | Returns string[] tokens    |
| `format(tokens)` / `stringify()`          | ✅ Complete | Via class method           |
| `resolve(data, pointer)`                  | ✅ Complete | Standalone function        |
| `resolveOrThrow(data, pointer)`           | ✅ Complete | Throws on missing          |
| `exists(data, pointer)`                   | ✅ Complete | Boolean check              |
| `resolveWithParent(data, pointer)`        | ✅ Complete | Returns value, parent, key |
| `set(data, pointer, value)`               | ✅ Complete | Immutable mutation         |
| `remove(data, pointer)`                   | ✅ Complete | Immutable removal          |
| `append(data, pointer, value)`            | ✅ Complete | Array append               |
| `isValid(pointer)`                        | ✅ Complete | Validation                 |
| `validate(pointer)`                       | ✅ Complete | Returns errors             |
| `parent(pointer)`                         | ✅ Complete | Parent pointer             |
| `join(...pointers)`                       | ✅ Complete | Path joining               |
| `split(pointer)`                          | ✅ Complete | Token splitting            |
| `escape(token)`                           | ✅ Complete | Tilde/slash escaping       |
| `unescape(token)`                         | ✅ Complete | Unescaping                 |
| `toNormalizedPath(pointer)`               | ✅ Complete | Pointer to JSONPath        |
| `fromNormalizedPath(path)`                | ✅ Complete | JSONPath to pointer        |
| Array index validation (no leading zeros) | ✅ Complete | RFC compliant              |

### ❌ Unimplemented

| Feature                                           | Priority | Status     | Notes                                    | Spec Reference                                       |
| ------------------------------------------------- | -------- | ---------- | ---------------------------------------- | ---------------------------------------------------- |
| Relative JSON Pointer (RFC extension)             | 🟡 P2    | ⚠️ Partial | `relative-pointer.ts` exists but limited | [spec L1373-1410](../specs/jsonpath.md#L1373)        |
| `RelativePointer` class                           | 🟡 P2    | ❌ Missing | Full spec requires this                  | [spec L1391-1405](../specs/jsonpath.md#L1391)        |
| Instance method aliases (`pointer.resolve(data)`) | 🟠 P1    | ❌ Missing | For json-p3 compatibility                | [spec §4.7](../specs/jsonpath.md#47-jsonpathpointer) |

---

## 7. @jsonpath/patch — Status: ⚠️ Partial (70%)

### ✅ Implemented

| Feature                                          | Status      | Notes                  |
| ------------------------------------------------ | ----------- | ---------------------- |
| `PatchOperation` type                            | ✅ Complete | All 6 operations       |
| `applyPatch(target, patch, options)`             | ✅ Complete | Core application       |
| `applyPatchImmutable()`                          | ✅ Complete | Always clones          |
| `add` operation                                  | ✅ Complete | RFC 6902 compliant     |
| `remove` operation                               | ✅ Complete | RFC 6902 compliant     |
| `replace` operation                              | ✅ Complete | RFC 6902 compliant     |
| `move` operation                                 | ✅ Complete | RFC 6902 compliant     |
| `copy` operation                                 | ✅ Complete | RFC 6902 compliant     |
| `test` operation                                 | ✅ Complete | RFC 6902 compliant     |
| Operation validation                             | ✅ Complete | Checks required params |
| `diff(source, target)`                           | ✅ Complete | Basic diff generation  |
| `PatchBuilder` class                             | ✅ Complete | Fluent API             |
| `PatchBuilder.add/remove/replace/move/copy/test` | ✅ Complete | All methods            |
| `PatchBuilder.toOperations()` / `.build()`       | ✅ Complete | Output methods         |
| `PatchBuilder.apply()`                           | ✅ Complete | Direct application     |

### ❌ Unimplemented or Issues

| Feature                                         | Priority | Status       | Notes                 | Spec Reference                                                                     |
| ----------------------------------------------- | -------- | ------------ | --------------------- | ---------------------------------------------------------------------------------- |
| `ApplyOptions.mutate`                           | 🟠 P1    | ⚠️ Different | Has `atomic` instead  | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| `ApplyOptions.validate`                         | 🟡 P2    | ❌ Missing   | Pre-validation        | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| `ApplyOptions.continueOnError`                  | 🟡 P2    | ❌ Missing   | Error continuation    | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| `ApplyOptions.inverse`                          | 🟡 P2    | ❌ Missing   | Generate inverse      | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| `ApplyOptions.before/after` hooks               | 🟡 P2    | ❌ Missing   | Lifecycle hooks       | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| `applyWithErrors()`                             | 🟡 P2    | ❌ Missing   | Returns errors array  | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| `applyWithInverse()`                            | 🟡 P2    | ❌ Missing   | Returns inverse patch | [spec L1615](../specs/jsonpath.md#L1615), [spec L4862](../specs/jsonpath.md#L4862) |
| `validate(ops): ValidationError[]`              | 🟡 P2    | ❌ Missing   | Standalone validation | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| `DiffOptions` (detectMoves, includeTests, etc.) | 🟡 P2    | ⚠️ Partial   | Only `invertible`     | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| Conditional builder ops (`when`, `ifExists`)    | 🟡 P2    | ❌ Missing   | Fluent conditionals   | [spec L1724](../specs/jsonpath.md#L1724)                                           |
| JSONPath-based operations (`replaceAll`, etc.)  | 🟡 P2    | ❌ Missing   | Bulk operations       | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |
| Individual operation exports (`patchAdd`, etc.) | 🟡 P2    | ❌ Missing   | Standalone functions  | [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)                                 |

---

## 8. @jsonpath/merge-patch — Status: ⚠️ Partial (65%)

### ✅ Implemented

| Feature                                   | Status      | Notes              |
| ----------------------------------------- | ----------- | ------------------ |
| `applyMergePatch(target, patch, options)` | ✅ Complete | RFC 7386 compliant |
| Object merge                              | ✅ Complete | Recursive merge    |
| Null deletion                             | ✅ Complete | `null` removes key |
| Array replacement                         | ✅ Complete | Full replacement   |
| Non-object patches                        | ✅ Complete | Replace target     |
| `createMergePatch(source, target)`        | ✅ Complete | Diff generation    |
| `MergePatchOptions.mutate`                | ✅ Complete | Mutability control |
| `MergePatchOptions.nullBehavior`          | ✅ Complete | delete vs set-null |

### ❌ Unimplemented

| Feature                      | Priority | Status     | Notes                       | Spec Reference                                           |
| ---------------------------- | -------- | ---------- | --------------------------- | -------------------------------------------------------- |
| `isValidMergePatch(patch)`   | 🟡 P2    | ❌ Missing | Validation                  | [spec L2326](../specs/jsonpath.md#L2326)                 |
| `mergePatchWithTrace()`      | 🟡 P2    | ❌ Missing | Returns trace of operations | [spec L2332](../specs/jsonpath.md#L2332)                 |
| `MergePatchResult` type      | 🟡 P2    | ❌ Missing | Result with trace           | [spec §4.9](../specs/jsonpath.md#49-jsonpathmerge-patch) |
| `MergePatchOperation` type   | 🟡 P2    | ❌ Missing | Trace entry type            | [spec §4.9](../specs/jsonpath.md#49-jsonpathmerge-patch) |
| `toJSONPatch(target, patch)` | 🟡 P2    | ❌ Missing | Convert to RFC 6902         | [spec L2354](../specs/jsonpath.md#L2354)                 |
| `fromJSONPatch(ops)`         | 🟡 P2    | ❌ Missing | Convert from RFC 6902       | [spec L2364](../specs/jsonpath.md#L2364)                 |

---

## 9. @jsonpath/compiler — Status: 🔴 Critical (15%)

### ⚠️ Current State

The compiler is **not a true JIT compiler**. It simply wraps the evaluator:

```typescript
export function compile(ast: QueryNode): CompiledQuery {
	return (root: any, options?: EvaluatorOptions) =>
		evaluate(root, ast, options);
}
```

### ❌ Unimplemented (All Critical)

| Feature                               | Priority | Status     | Notes                 | Spec Reference                                        |
| ------------------------------------- | -------- | ---------- | --------------------- | ----------------------------------------------------- |
| Actual JIT code generation            | 🔴 P0    | ❌ Missing | Core spec requirement | [spec §4.6](../specs/jsonpath.md#46-jsonpathcompiler) |
| `CompiledQuery.source` property       | 🔴 P0    | ❌ Missing | Generated JS code     | [spec L1172-1183](../specs/jsonpath.md#L1172)         |
| `CompiledQuery.ast` property          | 🔴 P0    | ❌ Missing | Original AST          | [spec L1172-1183](../specs/jsonpath.md#L1172)         |
| `CompiledQuery.compilationTime`       | 🔴 P0    | ❌ Missing | Performance tracking  | [spec L1172-1183](../specs/jsonpath.md#L1172)         |
| `Compiler` class                      | 🟠 P1    | ❌ Missing | Class with options    | [spec L1196-1200](../specs/jsonpath.md#L1196)         |
| `CompilerOptions.sourceMap`           | 🟡 P2    | ❌ Missing | Source maps           | [spec L1185-1195](../specs/jsonpath.md#L1185)         |
| `CompilerOptions.optimizeForSmall`    | 🟡 P2    | ❌ Missing | Bundle optimization   | [spec L1185-1195](../specs/jsonpath.md#L1185)         |
| `CompilerOptions.unsafe`              | 🟡 P2    | ❌ Missing | Skip runtime checks   | [spec L1185-1195](../specs/jsonpath.md#L1185)         |
| Code generation module (`codegen.ts`) | 🔴 P0    | ❌ Missing | Not implemented       | [spec §4.6](../specs/jsonpath.md#46-jsonpathcompiler) |
| LRU cache for compiled queries        | 🟠 P1    | ❌ Missing | Performance           | [spec §4.6](../specs/jsonpath.md#46-jsonpathcompiler) |
| Inline simple selectors optimization  | 🟠 P1    | ❌ Missing | Performance           | [spec §4.6](../specs/jsonpath.md#46-jsonpathcompiler) |
| Short-circuit filter evaluation       | 🟠 P1    | ❌ Missing | Performance           | [spec §4.6](../specs/jsonpath.md#46-jsonpathcompiler) |

**Impact:** Without real compilation, performance target of >5M ops/sec cannot be achieved.

---

## 10. @jsonpath/jsonpath (Facade) — Status: ⚠️ Partial (50%)

### ✅ Implemented

| Feature                      | Status      | Notes                  |
| ---------------------------- | ----------- | ---------------------- |
| `parseQuery(query)`          | ✅ Complete | With caching           |
| `query(root, path, options)` | ✅ Complete | Main query function    |
| `queryValues(root, path)`    | ✅ Complete | Values only            |
| `queryPaths(root, path)`     | ✅ Complete | Normalized paths       |
| `compileQuery(path)`         | ✅ Complete | Returns compiled query |
| `value(root, path)`          | ✅ Complete | First value            |
| `exists(root, path)`         | ✅ Complete | Existence check        |
| `count(root, path)`          | ✅ Complete | Match count            |
| `stream(root, path)`         | ✅ Complete | Iterator               |
| `match(root, path)`          | ✅ Complete | Alias for query        |
| `validateQuery(path)`        | ✅ Complete | Syntax validation      |
| `pointer(root, ptr)`         | ✅ Complete | Pointer resolution     |
| `patch(target, ops)`         | ✅ Complete | Patch application      |
| `mergePatch(target, patch)`  | ✅ Complete | Merge patch            |
| `transform(root, path, fn)`  | ✅ Complete | Value transformation   |
| `project(root, mapping)`     | ✅ Complete | Projection             |
| `pick(root, paths)`          | ✅ Complete | Path picking           |
| `omit(root, paths)`          | ✅ Complete | Path omission          |
| Cache (`cache.ts`)           | ✅ Complete | Query caching          |
| Config (`config.ts`)         | ✅ Exists   | Configuration          |

### ❌ Unimplemented

| Feature                            | Priority | Status     | Notes                             | Spec Reference                                                                          |
| ---------------------------------- | -------- | ---------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `configure(options)` global config | 🟠 P1    | ⚠️ Partial | Basic config exists               | [spec L1960](../specs/jsonpath.md#L1960)                                                |
| `getConfig()`                      | 🟡 P2    | ❌ Missing | Get current config                | [spec L1963](../specs/jsonpath.md#L1963)                                                |
| `reset()`                          | 🟡 P2    | ❌ Missing | Reset to defaults                 | [spec L1966](../specs/jsonpath.md#L1966)                                                |
| `multiQuery()`                     | 🟡 P2    | ❌ Missing | Multiple queries in one traversal | [spec L2022](../specs/jsonpath.md#L2022), [spec L4848](../specs/jsonpath.md#L4848)      |
| `createQuerySet()`                 | 🟡 P2    | ❌ Missing | Reusable query set                | [spec L2029](../specs/jsonpath.md#L2029), [spec L4628](../specs/jsonpath.md#L4628)      |
| `transformAll()`                   | 🟡 P2    | ❌ Missing | Multiple transforms               | [spec §4.10](../specs/jsonpath.md#410-jsonpathjsonpath-facade)                          |
| `projectWith()`                    | 🟡 P2    | ❌ Missing | Project with transforms           | [spec §4.10](../specs/jsonpath.md#410-jsonpathjsonpath-facade)                          |
| `merge()` / `mergeWith()`          | 🟡 P2    | ❌ Missing | Deep merge utilities              | [spec §4.10](../specs/jsonpath.md#410-jsonpathjsonpath-facade)                          |
| `secureQuery()`                    | 🟠 P1    | ⚠️ Partial | Basic in parseQuery               | [spec L2116-2120](../specs/jsonpath.md#L2116), [spec L4871](../specs/jsonpath.md#L4871) |
| `clearCache()`                     | 🟡 P2    | ❌ Missing | Cache management                  | [spec §4.10](../specs/jsonpath.md#410-jsonpathjsonpath-facade)                          |
| `getCacheStats()`                  | 🟡 P2    | ❌ Missing | Cache statistics                  | [spec §4.10](../specs/jsonpath.md#410-jsonpathjsonpath-facade)                          |
| Full re-exports from all packages  | 🟠 P1    | ⚠️ Partial | Missing some                      | [spec L1895-1900](../specs/jsonpath.md#L1895)                                           |

---

## 11. @jsonpath/compat-json-p3 — Status: 🆕 New Package

This is a **new compatibility layer** for json-p3, enabling migration from `json-p3` to `@jsonpath/*`.

### ✅ Implemented

| Feature                 | Status      | Notes                  |
| ----------------------- | ----------- | ---------------------- |
| `JSONPointer` re-export | ✅ Complete | From @jsonpath/pointer |
| `jsonpath` namespace    | ✅ Complete | Query wrapper          |
| `jsonpatch` namespace   | ✅ Complete | Patch wrapper          |

### Purpose

Enables `@data-map/core` and other consumers to swap from `json-p3` with minimal code changes.

---

## 12. Plugins — Status: ⚠️ Started (25%)

### ✅ Implemented

| Feature                    | Status      | Notes                         |
| -------------------------- | ----------- | ----------------------------- |
| `JSONPathPlugin` interface | ✅ Complete | In core                       |
| `PluginManager` class      | ✅ Complete | Lifecycle management          |
| `beforeEvaluate` hook      | ✅ Complete | Pre-evaluation                |
| `afterEvaluate` hook       | ✅ Complete | Post-evaluation               |
| `onError` hook             | ✅ Complete | Error handling                |
| Plugin isolation           | ✅ Complete | Errors don't break evaluation |

### ❌ Unimplemented

| Feature                                            | Priority | Status         | Notes                                   | Spec Reference                                                                                                                                          |
| -------------------------------------------------- | -------- | -------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@jsonpath/plugin-extended`                        | 🟡 P2    | ❌ Not created | Parent (^), property name (~) selectors | [spec §5.2](../specs/jsonpath.md#52-jsonpathplugin-extended), [spec L2434-2495](../specs/jsonpath.md#L2434), [spec L4877](../specs/jsonpath.md#L4877)   |
| `@jsonpath/plugin-types`                           | 🟡 P2    | ❌ Not created | Type checking functions                 | [spec §5.3](../specs/jsonpath.md#53-jsonpathplugin-types), [spec L2498-2608](../specs/jsonpath.md#L2498), [spec L4878](../specs/jsonpath.md#L4878)      |
| `@jsonpath/plugin-arithmetic`                      | 🟡 P2    | ❌ Not created | + - \* / % operators                    | [spec §5.4](../specs/jsonpath.md#54-jsonpathplugin-arithmetic), [spec L2611-2700](../specs/jsonpath.md#L2611), [spec L4879](../specs/jsonpath.md#L4879) |
| `@jsonpath/plugin-extras`                          | 🟡 P2    | ❌ Not created | Utility functions                       | [spec §5.5](../specs/jsonpath.md#55-jsonpathplugin-extras)                                                                                              |
| `@jsonpath/plugin-path-builder`                    | 🟡 P2    | ❌ Not created | Fluent path builder                     | [spec §5.6](../specs/jsonpath.md#56-jsonpathplugin-path-builder)                                                                                        |
| `PluginContext` for function/selector registration | 🟠 P1    | ❌ Missing     | Spec requires this                      | [spec §5.1](../specs/jsonpath.md#51-plugin-architecture)                                                                                                |
| Plugin dependency resolution                       | 🟡 P2    | ❌ Missing     | Load order                              | [spec §5.1](../specs/jsonpath.md#51-plugin-architecture)                                                                                                |
| Plugin version management                          | 🟡 P2    | ❌ Missing     | Compatibility                           | [spec §5.1](../specs/jsonpath.md#51-plugin-architecture)                                                                                                |

---

## 13. RFC Compliance Status

### [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535.html) (JSONPath)

| Section                                                            | Feature                 | Status                | Notes                 |
| ------------------------------------------------------------------ | ----------------------- | --------------------- | --------------------- |
| [2.1](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.1)     | Root identifier `$`     | ✅ Complete           |                       |
| [2.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.2)     | Current node `@`        | ✅ Complete           | In filter expressions |
| [2.3.1](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.1) | Name selector           | ✅ Complete           |                       |
| [2.3.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.2) | Index selector          | ✅ Complete           | Including negative    |
| [2.3.3](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.3) | Wildcard selector       | ✅ Complete           |                       |
| [2.3.4](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.4) | Slice selector          | ⚠️ Needs verification | Edge cases            |
| [2.3.5](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.5) | Filter selector         | ✅ Complete           |                       |
| [2.4](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.4)     | Descendant segment `..` | ✅ Complete           |                       |
| [2.5](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.5)     | Normalized paths        | ✅ Complete           |                       |
| [3.1](https://www.rfc-editor.org/rfc/rfc9535.html#section-3.1)     | Comparison operators    | ✅ Complete           | == != < <= > >=       |
| [3.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-3.2)     | Logical operators       | ✅ Complete           | && \|\| !             |
| [3.3](https://www.rfc-editor.org/rfc/rfc9535.html#section-3.3)     | Parentheses             | ✅ Complete           |                       |
| [3.4](https://www.rfc-editor.org/rfc/rfc9535.html#section-3.4)     | Function extensions     | ✅ Complete           | 5 built-in functions  |
| [3.5](https://www.rfc-editor.org/rfc/rfc9535.html#section-3.5)     | Type system             | ⚠️ Partial            | Missing `Nothing`     |

### [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901.html) (JSON Pointer)

| Feature                   | Status      | RFC Section                                                 |
| ------------------------- | ----------- | ----------------------------------------------------------- |
| Syntax                    | ✅ Complete | [§3](https://www.rfc-editor.org/rfc/rfc6901.html#section-3) |
| Evaluation                | ✅ Complete | [§4](https://www.rfc-editor.org/rfc/rfc6901.html#section-4) |
| Escape sequences (~0, ~1) | ✅ Complete | [§3](https://www.rfc-editor.org/rfc/rfc6901.html#section-3) |
| Array index validation    | ✅ Complete | [§4](https://www.rfc-editor.org/rfc/rfc6901.html#section-4) |
| URI fragment identifier   | ❌ Missing  | [§6](https://www.rfc-editor.org/rfc/rfc6901.html#section-6) |

### [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902.html) (JSON Patch)

| Operation               | Status      | RFC Section                                                     |
| ----------------------- | ----------- | --------------------------------------------------------------- |
| add                     | ✅ Complete | [§4.1](https://www.rfc-editor.org/rfc/rfc6902.html#section-4.1) |
| remove                  | ✅ Complete | [§4.2](https://www.rfc-editor.org/rfc/rfc6902.html#section-4.2) |
| replace                 | ✅ Complete | [§4.3](https://www.rfc-editor.org/rfc/rfc6902.html#section-4.3) |
| move                    | ✅ Complete | [§4.4](https://www.rfc-editor.org/rfc/rfc6902.html#section-4.4) |
| copy                    | ✅ Complete | [§4.5](https://www.rfc-editor.org/rfc/rfc6902.html#section-4.5) |
| test                    | ✅ Complete | [§4.6](https://www.rfc-editor.org/rfc/rfc6902.html#section-4.6) |
| Error handling (atomic) | ⚠️ Partial  | [§5](https://www.rfc-editor.org/rfc/rfc6902.html#section-5)     |

### [RFC 7386](https://www.rfc-editor.org/rfc/rfc7386.html) (JSON Merge Patch)

| Feature                | Status      | RFC Section                                                 |
| ---------------------- | ----------- | ----------------------------------------------------------- |
| Object merge           | ✅ Complete | [§2](https://www.rfc-editor.org/rfc/rfc7386.html#section-2) |
| Null deletion          | ✅ Complete | [§2](https://www.rfc-editor.org/rfc/rfc7386.html#section-2) |
| Array replacement      | ✅ Complete | [§2](https://www.rfc-editor.org/rfc/rfc7386.html#section-2) |
| Merge patch generation | ✅ Complete | [§3](https://www.rfc-editor.org/rfc/rfc7386.html#section-3) |

---

## 14. Compliance Test Suites

| Suite                                         | Status             | Notes                        |
| --------------------------------------------- | ------------------ | ---------------------------- |
| RFC 9535 CTS (jsonpath-compliance-test-suite) | ⚠️ Integrated      | Downloaded via postinstall   |
| RFC 6902 Suite (json-patch-test-suite)        | ⚠️ Integrated      | Tests exist in patch package |
| RFC 6901 Tests                                | ❌ No formal suite | Manual tests only            |
| RFC 7386 Tests                                | ❌ No formal suite | Manual tests only            |

---

## 15. Performance Status

### Current State

| Metric                 | Target        | Actual  | Status             |
| ---------------------- | ------------- | ------- | ------------------ |
| Interpreted evaluation | >1M ops/sec   | Unknown | ⚠️ Not benchmarked |
| Compiled evaluation    | >5M ops/sec   | N/A     | 🔴 Not implemented |
| JSON Pointer resolve   | >10M ops/sec  | Unknown | ⚠️ Not benchmarked |
| JSON Patch apply       | >500K ops/sec | Unknown | ⚠️ Not benchmarked |

### Missing

- Benchmark suite (`packages/jsonpath/benchmarks/` exists but minimal)
- Performance regression tests
- Bundle size analysis

---

## 16. Priority Action Items

### 🔴 P0 - Critical (Must Fix)

1. **Implement real JIT compiler** - Core value proposition for performance → [spec §4.6](../specs/jsonpath.md#46-jsonpathcompiler)
2. **Verify slice normalization** - RFC 9535 compliance → [RFC 9535 §2.3.4.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.4.2)
3. **Add `Nothing` type** - RFC 9535 type system compliance → [RFC 9535 §2.1](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.1)
4. **Run and pass all CTS tests** - Validate RFC compliance → [spec §6](../specs/jsonpath.md#6-testing-strategy)

### 🟠 P1 - High Priority

5. **Add missing parser AST nodes** - `RootSelector`, `CurrentSelector` → [spec L565-566](../specs/jsonpath.md#L565)
6. **Implement `Evaluator` class** - Spec requires class pattern → [spec L975](../specs/jsonpath.md#L975)
7. **Add circular reference detection** - Security feature → [spec L953](../specs/jsonpath.md#L953)
8. **Implement pointer instance methods** - json-p3 compatibility → [spec §4.7](../specs/jsonpath.md#47-jsonpathpointer)
9. **Add `PluginContext`** - Enable proper plugin registration → [spec §5.1](../specs/jsonpath.md#51-plugin-architecture)
10. **Complete ApplyOptions** - Full patch options → [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)

### 🟡 P2 - Medium Priority

11. Add `deepClone`, `freeze` utilities to core → [spec L382-400](../specs/jsonpath.md#L382)
12. Complete merge-patch utilities (`toJSONPatch`, etc.) → [spec L2354-2370](../specs/jsonpath.md#L2354)
13. Add compiler options and source access → [spec L1185-1195](../specs/jsonpath.md#L1185)
14. Implement multi-query and query sets → [spec L2022-2030](../specs/jsonpath.md#L2022)
15. Add cache management API → [spec §4.10](../specs/jsonpath.md#410-jsonpathjsonpath-facade)
16. Create plugin packages → [spec §5.2-5.6](../specs/jsonpath.md#52-jsonpathplugin-extended)

### 🟢 P3 - Low Priority

17. URI fragment identifier support for pointers → [RFC 6901 §6](https://www.rfc-editor.org/rfc/rfc6901.html#section-6)
18. Full relative JSON Pointer support → [spec L1391-1405](../specs/jsonpath.md#L1391)
19. Bundle size analysis and optimization → [spec L220-235](../specs/jsonpath.md#L220)
20. Performance benchmarking → [spec §7](../specs/jsonpath.md#7-performance-requirements)

---

## 17. Unresolved Questions

1. **Should `pointers()` return strings or `JSONPointer` objects?** → [spec §4.5](../specs/jsonpath.md#45-jsonpathevaluator)
   - Current: Returns `JSONPointer[]` in QueryResult
   - Spec: Shows `pointers(): string[]`
   - json-p3 compat: Expects objects with `.toString()`

2. **Default mutation behavior in patch?** → [spec §4.8](../specs/jsonpath.md#48-jsonpathpatch)
   - Current: `atomic: false` means mutate in place
   - Spec: `mutate: false` (immutable) by default
   - json-p3: Mutates by default

3. **Function return on invalid input: `null` or `undefined`?** → [RFC 9535 §3.5](https://www.rfc-editor.org/rfc/rfc9535.html#section-3.5)
   - Spec: Says "Nothing" (represented as `null`)
   - Implementation: Uses `undefined` in some places

4. **Should plugins be separate npm packages or built-in?** → [spec §5.1](../specs/jsonpath.md#51-plugin-architecture)
   - Spec: Separate packages (`@jsonpath/plugin-*`)
   - Current: Only infrastructure, no actual plugins

---

## 18. Recommendations

### Immediate Actions

1. Create a JIT compiler prototype to validate performance gains
2. Run full compliance test suite and document failures
3. Unify return types (`null` vs `undefined`)
4. Add missing AST node types to parser

### Short-term (Next Sprint)

1. Complete evaluator options enforcement
2. Add json-p3 compatibility methods to pointer
3. Implement comprehensive benchmarks
4. Add bundle size tracking to CI

### Long-term

1. Create all plugin packages
2. Add streaming evaluation for large documents
3. Implement query optimization passes
4. Add query plan visualization

---

## Appendix: File Inventory

### Core Package Files

| File                   | Purpose                      | Status      |
| ---------------------- | ---------------------------- | ----------- |
| `core/src/types.ts`    | Type definitions             | ✅ Complete |
| `core/src/errors.ts`   | Error classes                | ✅ Complete |
| `core/src/registry.ts` | Function/selector registries | ✅ Complete |
| `core/src/plugins.ts`  | Plugin infrastructure        | ✅ Basic    |
| `core/src/utils.ts`    | Utility functions            | ⚠️ Partial  |

### Pointer Package Files

| File                              | Purpose              | Status      |
| --------------------------------- | -------------------- | ----------- |
| `pointer/src/pointer.ts`          | Core pointer class   | ✅ Complete |
| `pointer/src/resolve.ts`          | Resolution functions | ✅ Complete |
| `pointer/src/mutations.ts`        | Immutable mutations  | ✅ Complete |
| `pointer/src/utils.ts`            | Utility functions    | ✅ Complete |
| `pointer/src/validation.ts`       | Validation           | ✅ Complete |
| `pointer/src/normalize.ts`        | Path normalization   | ✅ Exists   |
| `pointer/src/relative-pointer.ts` | Relative pointers    | ⚠️ Partial  |

### Patch Package Files

| File                   | Purpose                | Status      |
| ---------------------- | ---------------------- | ----------- |
| `patch/src/patch.ts`   | Core patch application | ✅ Complete |
| `patch/src/diff.ts`    | Diff generation        | ✅ Basic    |
| `patch/src/builder.ts` | Fluent builder         | ✅ Basic    |

### Compiler Package Files

| File                       | Purpose              | Status       |
| -------------------------- | -------------------- | ------------ |
| `compiler/src/compiler.ts` | Compiler wrapper     | 🔴 Stub only |
| `compiler/src/codegen.ts`  | Code generation      | ❌ Missing   |
| `compiler/src/cache.ts`    | Compiled query cache | ❌ Missing   |

---

_End of Audit Report_
