<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Implementation Gaps Deep Analysis

This note is superseded.

- Consolidated remediation-plan research (includes RFC-backed semantics, CTS integration evidence, and confirmed current implementation gaps):
  - `.copilot-tracking/research/20260105-jsonpath-gap-remediation-plan-research.md`

Reason for supersession:

- This file contained a mix of accurate and out-of-date claims as the JSONPath suite evolved; the consolidated note removes duplication and ties each claim to concrete file evidence and RFC excerpts.

- `packages/jsonpath/compiler/src/*.ts`
  - [compiler.ts](packages/jsonpath/compiler/src/compiler.ts) - **STUB ONLY** - wraps evaluator
  - [codegen.ts](packages/jsonpath/compiler/src/codegen.ts) - **STUB ONLY** - returns template string
  - **Gaps**: No actual JIT code generation, no cache, no `CompiledQuery.source/ast/compilationTime`

- `packages/jsonpath/pointer/src/*.ts`
  - [pointer.ts](packages/jsonpath/pointer/src/pointer.ts) - `JSONPointer` class complete
  - **Gaps**: Missing instance method aliases (`pointer.resolve(data)`), incomplete relative pointer

- `packages/jsonpath/patch/src/*.ts`
  - [patch.ts](packages/jsonpath/patch/src/patch.ts) - Core operations complete, has `applyWithInverse`
  - [builder.ts](packages/jsonpath/patch/src/builder.ts) - Basic fluent API
  - [diff.ts](packages/jsonpath/patch/src/diff.ts) - Basic diff generation
  - **Gaps**: Missing `applyWithErrors`, conditional builder ops, individual exports

- `packages/jsonpath/merge-patch/src/*.ts`
  - [merge-patch.ts](packages/jsonpath/merge-patch/src/merge-patch.ts) - Core implementation complete
  - **Gaps**: Missing `isValidMergePatch`, `mergePatchWithTrace`, `toJSONPatch`, `fromJSONPatch`

- `packages/jsonpath/jsonpath/src/*.ts`
  - [facade.ts](packages/jsonpath/jsonpath/src/facade.ts) - Main API surface complete
  - [cache.ts](packages/jsonpath/jsonpath/src/cache.ts) - Query caching exists
  - **Gaps**: Missing `configure()`, `getConfig()`, `reset()`, `multiQuery()`, `createQuerySet()`, cache stats

### Project Conventions

- Standards: pnpm workspaces, Turborepo, per-package Vitest configs
- Build: Vite for library builds, ESM output
- Testing: Vitest with coverage, RFC compliance test suite integration

## Key Discoveries

### Project Structure

```
packages/jsonpath/
├── c         # Foundation types, registries, errors, utilities
├─xer/          # Token stream generation (~80% complete)
├─rser/         # AST generation (~70% complete)
├?nctions/      # Built-in filter functions (~75% complete)
├─aluator/      # AST interpreter (~65% complete)
├?ompiler/       # JIT compilation (~15% - STUB ONLY)
├──er/        # RFC 6901 JSON Pointer (~80% complete)
?? patch/          # RFC 6902 JSON Patch (~70% complete)
??merge-patch/    # RFC 7386 Merge Patch (~65% complete)
├─?path/       # Facade package (~50% complete)
├─?t-json-p3/ # Compatibility layer (NEW)
??? benchrks/     # Performance benchmarks
```

### Implementation Patterns

#### Registry Pattern (already implemented correctly)

```typescript
// packages/jsonpath/core/src/registry.ts
export const functionRegistry = new Map<string, FunctionDefinition>();
export function registerFunction(definition: FunctionDefinition): void {
	functionRegistry.set(definition.name, definition);
}
export function getFunction(name: string): FunctionDefinition | undefined {
	return functionRegistry.get(name);
}
```

#### QueryResult Pattern (complete implementation)

```typescript
// packages/jsonpath/evaluator/src/query-result.ts
export class QueryResult<T = unknown> implements CoreQueryResult<T> {
	constructor(private readonly results: QueryResultNode<T>[]) {}
	values(): T[] {
		return this.results.map((r) => r.value);
	}
	paths(): PathSegment[][] {
		return this.results.map((r) => [...r.path]);
	}
	// ... all methods implemented
}
```

#### Plugin Pattern (basic - needs PluginContext)

```typescript
// packages/jsonpath/core/src/plugins.ts
export interface JSONPathPlugin {
	readonly name: string;
	beforeEvaluate?(ctx: BeforeEvaluateContext): void;
	afterEvaluate?(ctx: AfterEvaluateContext): void;
	onError?(ctx: EvaluateErrorContext): void;
}
```

### API Reference from Spec

#### Core Types (spec L45-165)

- `JSONValue`, `JSONPrimitive`, `JSONObject`, `JSONArray` ?omplete
- `PathSegment`, `Path` ✅ Compte
- `QueryNode` ✅ Cplete
- `QueryResult` ✅ Complete `Nothing` symbol ?issing (RFC 9535 §2.1)

#### Parser AST Nodes (spec L565-700)

Missing dedicated node types:

- `RootSelector` - for `$` ❌
  -CurrentSelector`- for`@` ❌
-LogicalExpr` - for `&&`, `||` ❌ `ComparisonExpr` - for `==`, `!=`, etc. ❌
- `Filteuery` - for filter expressions ❌#### Evaluator Options (spec L936-970)
- `maxDepth` ✅ Implented
- `maxResults` ✅ Implemted
- `maxNodes` ✅ plemented
- `maxFilterDepth` ?ot enforced
- `timeout` ⚠️ Pal (Date.now check)
- `detectCircular` ❌ Not fly implemented

#### Compiler (spec §46, L1150-1250)

All critical items missing:

- Actual JIT code generation ❌
- ompiledQuery.source` property ❌
- `CompedQuery.ast` property ❌
- `CpiledQuery.compilationTime` ❌
  `Compiler` class ❌ LRU cache ❌
- Codeptimization strategies ?#### Patch (spec §48, L1550-1730)
  Missing:
- `ApplyOptions.mutate` (uses `atomic` instead) ⚠️
  -plyOptions.validate`?`ApplyOptions.continueOnError` ❌
- `apyWithErrors()` ❌
- Cditional builder ops (`when`, `ifExists`) ❌ Individual operation exports ❌#### Merge Patch (spec §4.9, L250-2370)
  Missing:
- `isValidMergePatch()` ? `mergePatchWithTrace()` ❌
- `MgePatchResult` type ❌ `toJSONPatch()` ❌
  `fromJSONPatch()` ❌

## Facade (spec §.10, L1880-2120)

Missing:

- `configure()` ? `getConfig()` ❌
  -reset()`?-`multiQuery()`?`createQuerySet()`?-`clearCache()` ❌
- etCacheStats()` ?#### Plugins (spec §.1-5.6, L2400-3000)
  Infrastructure partially complete:
- `JSONPathPlugin` interface ✅ Basic `PluginManager` class ✅ Bac
- `PluginContext` ❌issing
- Plugin dependency resolution ❌ Missin- `@jsonpath/plugin-extended` ❌ N created
- `@jsonpath/plugin-types` ❌ Nocreated
- `@jsonpath/plugin-arithmetic` ❌ t created
- `@jsonpath/plugin-extras` ❌ N created
- `@jsonpath/plugin-path-builder` ❌ Not eated

## Dependency Graph

Implementation order based on dependencies:

```
Level 0 (No deps):
???─ /Nothing symbol
├─?deepClone, freeze (already exist)
??? pars/RootSelector, CurrentSelector nodes

Level 1 (Depends on L0):
├ parser/LogicalExpr, ComparisonExpr nodes
???─ er/QueryNode.raw property
└─?uator/maxFilterDepth enforcement

Level 2 (Depends on L1):
├ evaluator/detectCircular implementation
├──ator/Evaluator class export
└── r/instance method aliases

Level 3 (Depends on L2):
├?mpiler/JIT code generation (CRITICAL PATH)
├?mpiler/CompiledQuery properties
├── er/LRU cache
???─ patcplyOptions extensions

Level 4 (Depends on L3):
├── mergh/utilities
├──e/configure, getConfig, reset
├─cade/multiQuery, createQuerySet
└──e/cache management

Level 5 (Depends on L4):
??? plin-extended package
????gin-types package
????gin-arithmetic package
├──n-extras package
└─?n-path-builder package
```

## Complexity Estimates

### P0 - Critical (Must do first)

| Gap                        | Size | Risk   | Notes                                                        |
| -------------------------- | ---- | ------ | ------------------------------------------------------------ |
| JIT Compiler codegen       | XL   | High   | Core value proposition, requires code generation expertise   |
| CompiledQuery properties   | M    | Low    | Add source/ast/compilationTime to compile() output           |
| Nothing symbol             | S    | Low    | Add `const Nothing = Symbol('Nothing')` and use in functions |
| Slice normalization verify | S    | Medium | Verify RFC 9535 edge cases                                   |

### P1 - High Priority

| Gap                      | Size | Risk   | Notes                                              |
| ------------------------ | ---- | ------ | -------------------------------------------------- |
| Parser AST nodes         | M    | Low    | Add RootSelector, CurrentSelector to NodeType enum |
| Evaluator class export   | S    | Low    | Export existing internal Evaluator class           |
| detectCircular           | M    | Medium | WeakSet-based cycle detection                      |
| maxFilterDepth           | S    | Low    | Add depth counter to filter evaluation             |
| Pointer instance methods | S    | Low    | Add resolve(), exists() to JSONPointer class       |
| PluginContext            | M    | Medium | Add registerFunction/Selector/Operator methods     |

### P2 - Medium Priority

| Gap                     | Size | Risk   | Notes                                  |
| ----------------------- | ---- | ------ | -------------------------------------- |
| QueryNode.raw property  | S    | Low    | Store original query string in parse() |
| NameSelectorNode.quoted | S    | Low    | Track quote style in lexer/parser      |
| ApplyOptions extensions | M    | Low    | Add validate, continueOnError to patch |
| applyWithErrors         | M    | Low    | Return error array instead of throwing |
| Merge patch utilities   | M    | Low    | isValidMergePatch, trace, conversion   |
| Facade config API       | M    | Low    | configure(), getConfig(), reset()      |
| Cache stats             | S    | Low    | Track hits/misses in existing cache    |
| multiQuery              | M    | Medium | Single-pass multi-query optimization   |

### P3 - Low Priority (Plugins)

| Gap                 | Size | Risk | Notes                     |
| ------------------- | ---- | ---- | ------------------------- |
| plugin-extended     | M    | Low  | Parent/property selectors |
| plugin-types        | S    | Low  | Type checking functions   |
| plugin-arithmetic   | S    | Low  | Arithmetic operators      |
| plugin-extras       | M    | Low  | Utility functions         |
| plugin-path-builder | M    | Low  | Fluent query builder      |

## Implementation Patterns

### Pattern 1: Adding AST Node Types

```typescript
// In nodes.ts
export enum NodeType {
	// ... existing
	RootSelector = 'RootSelector',
	CurrentSelector = 'CurrentSelector',
}

export interface RootSelectorNode extends ASTNode {
	readonly type: NodeType.RootSelector;
}

export interface CurrentSelectorNode extends ASTNode {
	readonly type: NodeType.CurrentSelector;
}
```

### Pattern 2: JIT Code Generation (from spec L1172-1250)

```typescript
// In codegen.ts
export function generateCode(ast: QueryNode): string {
	const lines: string[] = [];
	lines.push('const results = [];');
	lines.push('let nodes = [{ value: data, path: [], root: data }];');

	for (const segment of ast.segments) {
		lines.push(generateSegmentCode(segment));
	}

	lines.push('return new QueryResult(results);');
	return lines.join('\n');
}

function generateSegmentCode(segment: SegmentNode): string {
	// Generate optimized loops for each selector
	// Inline property access for name selectors
	// Short-circuit for filters
}
```

### Pattern 3: Adding Options Enforcement

```typescript
// In evaluator.ts
private currentFilterDepth = 0;

private evaluateFilter(expr: ExpressionNode, ctx: EvaluationContext): boolean {
  this.currentFilterDepth++;
  if (this.currentFilterDepth > this.options.maxFilterDepth) {
    throw new JSONPathLimitError('Maximum filter depth exceeded');
  }
  try {
    return this.evaluateExpr(expr, ctx);
  } finally {
    this.currentFilterDepth--;
  }
}
```

### Pattern 4: PluginContext Implementation

```typescript
// In plugins.ts
export interface PluginContext {
	registerFunction(def: FunctionDefinition): void;
	registerSelector(def: SelectorDefinition): void;
	registerOperator(def: OperatorDefinition): void;
	readonly config: Readonly<JSONPathConfig>;
}

export function createPluginContext(config: JSONPathConfig): PluginContext {
	return {
		registerFunction: (def) => functionRegistry.set(def.name, def),
		registerSelector: (def) => selectorRegistry.set(def.name, def),
		registerOperator: (def) => operatorRegistry.set(def.symbol, def),
		get config() {
			return Object.freeze({ ...config });
		},
	};
}
```

## Test Coverage Requirements

### Unit Tests Needed

| Package     | Tests to Add                                    |
| ----------- | ----------------------------------------------- |
| core        | Nothing symbol usage, freeze deep recursion     |
| parser      | New AST node types, QueryNode.raw               |
| evaluator   | maxFilterDepth, detectCircular, Evaluator class |
| compiler    | Code generation correctness, cache behavior     |
| pointer     | Instance methods, relative pointers             |
| patch       | applyWithErrors, conditional builder            |
| merge-patch | isValid, trace, conversion functions            |
| facade      | Config API, multiQuery, cache stats             |

### Integration Tests

- Compiler output vs evaluator output equivalence
- Plugin registration and isolation
- RFC compliance test suite pass rate

### Performance Benchmarks

- Interpreted vs compiled query speed
- Cache hit/miss rates
- Memory usage under load

## Risks and Unknowns

### High Risk

1. **JIT Compiler Correctness** - Generated code must produce identical results to interpreter
2. **Security** - Generated code via `new Function()` needs sanitization

### Medium Risk

1. **Breaking Changes** - Some API adjustments may break existing consumers
2. **Bundle Size** - Full compiler may exceed 15KB gzipped budget

### Unknowns

1. Should `pointers()` return strings or `JSONPointer` objects?
   - Current: Returns `JSONPointer[]`
   - Spec: Shows `pointers(): string[]`
   - Recommendation: Keep objects, add `pointerStrings()` alias

2. Default mutation behavior in patch?
   - Current: `atomic: false` means mutate
   - Spec: `mutate: false` (immutable) by default
   - Recommendation: Add `mutate` option, deprecate `atomic`

3. Function return `null` vs `undefined`?
   - RFC 9535: "Nothing" represented as `null`
   - Current: Mixed usage
   - Recommendation: Standardize on `null` for Nothing

## Spec References by Gap

| Gap                      | Spec Reference            |
| ------------------------ | ------------------------- | --- | ------------------- | -------------------- |
| Nothing symbol           | RFC 9535 §2.1, spc L45-50 |
| RootSelector node        | spec L565                 |
| CurrentSelector node     | spec L566                 |
| QueryNode.raw            | spec L625                 |
| maxFilterDepth           | spec L950                 |
| detectCircular           | spec L953                 |
| Evaluator class          | spec L975                 |
| JIT codegen              | spec §.6, L1150-1250      |
| CompiledQuery.source     | spec L1172-1183           |
| Compiler class           | spec L1196-1200           |
| Pointer instance methods | spec §4.7                 |
| applyWithErrors          | spec §4.8                 |     | applyWithInverse    | spec L1615, L4862    |
| isValidMergePatch        | spec L2326                |
| mergePatchWithTrace      | spec L2332                |
| toJSONPatch              | spec L2354                |
| fromJSONPatch            | spec L2364                |
| configure()              | spec L1960                |
| getConfig()              | spec L1963                |
| reset()                  | spec L1966                |
| multiQuery()             | spec L2022, L4848         |
| createQuerySet()         | spec L2029, L4628         |
| clearCache()             | spec §4.10                |     | getCacheStats()     | spec §4.10           |
| PluginContext            | spec §5.1                 |     | plugin-extended     | spec ?.2, L2434-2495 |
| plugin-types             | spec §5.3, L298-2608      |
| plugin-arithmetic        | spec §5.4, L261-2700      |
| plugin-extras            | spec §5.5                 |     | plugin-path-builder | spec §5.6            |

## Recommended Approach

### Phase 1: Foundation (P0) - ~2 weeks

1. Add Nothing symbol to core
2. Verify slice normalization compliance
3. Add missing parser AST nodes
4. Export Evaluator class

### Phase 2: Compiler (P0) - ~3 weeks

1. Implement JIT code generator
2. Add CompiledQuery properties
3. Implement LRU cache
4. Add Compiler class with options

### Phase 3: Options & Security (P1) - ~1 week

1. Implement maxFilterDepth
2. Implement detectCircular
3. Add pointer instance methods
4. Add PluginContext

### Phase 4: API Completion (P1/P2) - ~2 weeks

1. Complete patch options (mutate, validate, continueOnError)
2. Add applyWithErrors
3. Complete merge-patch utilities
4. Add facade config API
5. Add cache management

### Phase 5: Plugins (P3) - ~2 weeks

1. Create plugin-extended package
2. Create plugin-types package
3. Create plugin-arithmetic package
4. Create plugin-extras package
5. Create plugin-path-builder package

## Implementation Guidance

- **Objectives**: Reach 100% spec compliance, establish production readiness
- **Key Tasks**: JIT compiler implementation is critical path
- **Dependencies**: Compiler depends on correct AST nodes, plugins depend on PluginContext
- **Success Criteria**: All RFC compliance tests pass, 5M+ ops/sec compiled, <15KB gzipped
