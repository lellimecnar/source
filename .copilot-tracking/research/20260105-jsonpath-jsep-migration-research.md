# Task Research Notes: JSONPath jsep Migration

## Research Executed

### File Analysis

- `packages/jsonpath/` - 20 sub-packages identified
  - Complete package ecosystem for RFC 9535 JSONPath implementation
- `packages/jsonpath/compiler/src/compiler.ts#L30`
  - **PRIMARY TARGET**: `new Function()` usage for code generation
  - Creates runtime-compiled query functions from AST

- `packages/jsonpath/evaluator/src/evaluator.ts`
  - Filter expression evaluation via `evaluateExpression()` method
  - AST interpreter approach (no dynamic code execution here)

- `specs/jsonpath-jsep.md` (2539 lines)
  - Complete specification already exists for jsep integration
  - Defines `@jsonpath/filter-eval` package architecture

### Code Search Results

- **`new Function` occurrences**: 3 matches
  - [compiler/src/compiler.ts#L30](packages/jsonpath/compiler/src/compiler.ts#L30) - Main usage
  - [compiler/src/codegen/generators.ts#L87](packages/jsonpath/compiler/src/codegen/generators.ts#L87) - Comment/documentation
  - [compiler/src/codegen/templates.ts#L21](packages/jsonpath/compiler/src/codegen/templates.ts#L21) - Comment/documentation

- **`eval()` occurrences**: 0 matches
  - No direct `eval()` usage found

- **`jsep` occurrences**: 0 matches in source code
  - jsep is NOT currently installed
  - Only referenced in the spec document

### Project Conventions

- Build system: Vite for all packages
- Testing: Vitest
- Type checking: tsgo (`@typescript/native-preview`)
- All packages use `workspace:*` dependencies
- ESM-only (`"type": "module"`)

---

## Package Inventory

### Core Packages (20 total)

| Package                       | Description                                        | Relevance to Migration           |
| ----------------------------- | -------------------------------------------------- | -------------------------------- |
| `@jsonpath/core`              | Shared types, errors, registries, Nothing sentinel | **HIGH** - Types/errors needed   |
| `@jsonpath/lexer`             | Tokenizer for JSONPath expressions                 | LOW - Path syntax only           |
| `@jsonpath/parser`            | Pratt parser for JSONPath expressions              | **MEDIUM** - Expression parsing  |
| `@jsonpath/evaluator`         | RFC 9535 interpreter (AST-walking)                 | **CRITICAL** - Filter evaluation |
| `@jsonpath/compiler`          | JIT compiler using `new Function`                  | **CRITICAL** - Migration target  |
| `@jsonpath/functions`         | Built-in functions (length, count, match, etc.)    | **HIGH** - Function registry     |
| `@jsonpath/jsonpath`          | Unified facade/entry point                         | MEDIUM - Integration point       |
| `@jsonpath/pointer`           | RFC 6901 JSON Pointer                              | LOW - Separate feature           |
| `@jsonpath/patch`             | RFC 6902 JSON Patch                                | LOW - Separate feature           |
| `@jsonpath/merge-patch`       | RFC 7386 JSON Merge Patch                          | LOW - Separate feature           |
| `@jsonpath/path-builder`      | Fluent API for building paths                      | LOW - Separate feature           |
| `@jsonpath/compliance-suite`  | RFC 9535 CTS runner                                | **HIGH** - Validation            |
| `@jsonpath/plugin-arithmetic` | +, -, \*, /, % operators                           | MEDIUM - Plugin system           |
| `@jsonpath/plugin-extras`     | values, entries, flatten, unique                   | MEDIUM - Plugin system           |
| `@jsonpath/plugin-types`      | is_string, to_number, etc.                         | MEDIUM - Plugin system           |
| `@jsonpath/plugin-extended`   | Extended selectors                                 | MEDIUM - Plugin system           |
| `@jsonpath/schema`            | JSON Schema validation                             | LOW - Separate feature           |
| `@jsonpath/compat-json-p3`    | json-p3 compatibility layer                        | LOW - Compatibility              |
| `@jsonpath/benchmarks`        | Performance benchmarking                           | **HIGH** - Validation            |
| `docs/`                       | Documentation packages                             | LOW - Documentation              |

---

## Dynamic Code Execution Analysis

### Location: `@jsonpath/compiler`

**File**: [compiler/src/compiler.ts](packages/jsonpath/compiler/src/compiler.ts)

```typescript
const factory = new Function(
	'QueryResult',
	'evaluate',
	'getFunction',
	'Nothing',
	'ast',
	body, // Generated JavaScript source code
);
```

**Purpose**: Creates high-performance compiled query functions from AST.

**Code Generation Pipeline**:

1. `compile(ast)` receives parsed QueryNode
2. `generateCode(ast)` produces JavaScript source string
3. `new Function()` creates executable function
4. Dependencies injected: `QueryResult`, `evaluate`, `getFunction`, `Nothing`, `ast`

**Generated Code Example** (from generators.ts):

```javascript
// Runtime helpers for slice, descend, compare, isTruthy
// Query execution logic with optimized paths
return (root, options) => { ... }
```

### Security Implications

- **Current Risk**: `new Function()` can execute arbitrary code if AST is compromised
- **Attack Vector**: Malicious filter expressions could escape sandbox
- **RFC 9535 Requirement**: Safe expression evaluation without code execution

---

## Current Filter Evaluation Flow

### Interpreter Path (`@jsonpath/evaluator`)

```
parse(query) → QueryNode AST
     ↓
evaluate(root, ast) → Evaluator.evaluate()
     ↓
streamSelector(FilterSelector) → evaluateFilter(expression, current)
     ↓
evaluateExpression(expr, current) → recursive AST interpretation
     ↓
isTruthy(result) → boolean
```

**Key Method**: [evaluator.ts#L558](packages/jsonpath/evaluator/src/evaluator.ts#L558)

```typescript
private evaluateExpression(
  expr: ExpressionNode,
  current: QueryResultNode,
): any {
  switch (expr.type) {
    case NodeType.Literal: return expr.value;
    case NodeType.BinaryExpr: // Handle operators
    case NodeType.UnaryExpr:  // Handle !, -
    case NodeType.Query:      // Embedded sub-queries
    case NodeType.FunctionCall: // length(), count(), match(), etc.
  }
}
```

**This path is SAFE** - no dynamic code execution, pure AST interpretation.

### Compiler Path (`@jsonpath/compiler`)

```
parse(query) → QueryNode AST
     ↓
compile(ast) → generateCode(ast)
     ↓
new Function(..., body) → Compiled function
     ↓
fn(root, options) → QueryResult
```

**Key Code Generation**: [codegen/expressions.ts](packages/jsonpath/compiler/src/codegen/expressions.ts)

```typescript
export function generateExpression(expr: ExpressionNode): string {
	switch (expr.type) {
		case NodeType.Literal:
			return JSON.stringify(expr.value);
		case NodeType.BinaryExpr:
			return `_compare(${left}, ${right}, ${op})`;
		case NodeType.FunctionCall:
			return `getFunction(${name}).evaluate(${args})`;
		case NodeType.Query:
			return `evaluate(${root}, ${queryStr}, options)`;
	}
}
```

**This path uses `new Function()`** - migration target.

---

## Dependency Analysis

### Current Dependencies (no jsep)

| Package               | Dependencies                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| `@jsonpath/core`      | None (0 runtime deps)                                                            |
| `@jsonpath/lexer`     | `@jsonpath/core`                                                                 |
| `@jsonpath/parser`    | `@jsonpath/core`, `@jsonpath/lexer`                                              |
| `@jsonpath/evaluator` | `@jsonpath/core`, `@jsonpath/functions`, `@jsonpath/parser`, `@jsonpath/pointer` |
| `@jsonpath/compiler`  | `@jsonpath/core`, `@jsonpath/evaluator`, `@jsonpath/parser`                      |
| `@jsonpath/functions` | `@jsonpath/core`                                                                 |

### jsep Package Analysis

From spec:

- **Bundle size**: ~6KB minified
- **Dependencies**: Zero
- **API**: Pluggable parser with hooks
- **Required plugins**:
  - `@jsep-plugin/ternary` (optional, for extensions)
  - `@jsep-plugin/regex` (for match/search)

### Installation Required

```bash
pnpm add jsep @jsep-plugin/regex
# Optional: @jsep-plugin/ternary for extension support
```

---

## Test Coverage Assessment

### Filter Expression Tests Found

| Location                                     | Tests              | Focus               |
| -------------------------------------------- | ------------------ | ------------------- |
| `evaluator/src/__tests__/evaluator.spec.ts`  | 15+                | Filter evaluation   |
| `evaluator/src/__tests__/compliance.spec.ts` | CTS                | RFC 9535 compliance |
| `jsonpath/src/__tests__/expressions.spec.ts` | Expression parsing |                     |
| `compiler/src/__tests__/compiler.spec.ts`    | Code generation    |                     |
| `compliance-suite/`                          | Full CTS           | All RFC 9535 tests  |

### Key Test Cases

```typescript
// evaluator.spec.ts
'$.store.book[?(@.price < 10)].title'; // Simple comparison
'$.store.book[?(@.category == "fiction" && @.price < 10)].title'; // Complex
'$.store.book[?(length(@.title) > 10)].title'; // Function calls
```

### Test Validation Required

- All existing tests must pass after migration
- Compliance Test Suite (CTS) 100% pass rate
- Performance benchmarks within acceptable range

---

## Integration Points Requiring Updates

### 1. `@jsonpath/compiler` (MAJOR)

**Files to modify**:

- `compiler.ts` - Replace `new Function()` with jsep-based evaluation
- `codegen/expressions.ts` - Potentially remove or repurpose
- `codegen/generators.ts` - Update filter handling

**Strategy Options**:
A. Replace compiler entirely with pure interpreter
B. Keep compiler but use jsep for filter expression parsing
C. Create new `@jsonpath/filter-eval` package (spec recommendation)

### 2. `@jsonpath/evaluator` (MINOR)

**Current**: Already uses safe AST interpretation
**Change**: May integrate jsep for filter expression parsing
**Files**:

- `evaluator.ts` - `evaluateExpression()` method

### 3. `@jsonpath/parser` (MINOR)

**Current**: Parses full JSONPath including filter expressions
**Change**: May delegate filter expression parsing to jsep
**Consideration**: Parser already produces expression AST nodes

### 4. `@jsonpath/jsonpath` (INTERFACE)

**Current**: Facade that exposes `query()`, `compile()`, etc.
**Change**: May expose new filter compilation API
**Consideration**: Backward compatibility required

---

## Existing Specification Analysis

The file [specs/jsonpath-jsep.md](specs/jsonpath-jsep.md) (2539 lines) provides:

### Architecture Decisions

1. **New Package**: `@jsonpath/filter-eval`
2. **Parse-then-interpret**: No `eval()` or `new Function()`
3. **jsep Configuration**: Remove JS-specific operators, add JSONPath identifiers
4. **Custom Plugin**: Handle `@` and `$` path expressions
5. **Whitelist Property Access**: `hasOwn` + forbidden property set

### Key Design Points

- **Type System**: ValueType, LogicalType, NodesType per RFC 9535
- **Function Registry**: Extensible with custom functions
- **Security**: Max depth, max array size, forbidden properties
- **Caching**: LRU cache for compiled filters
- **Error Types**: FilterParseError, FilterEvaluationError, FilterSecurityError

### Migration Path (from spec)

```typescript
// Before (unsafe)
function evaluateFilter(expr: string, context: any): boolean {
	const fn = new Function('$', '@', `return ${expr}`);
	return fn(context.root, context.current);
}

// After (safe)
import { compileFilter } from '@jsonpath/filter-eval';

function evaluateFilter(expr: string, context: EvaluationContext): boolean {
	const filter = compileFilter(expr);
	return filter(context);
}
```

---

## Risks and Concerns

### Technical Risks

| Risk                   | Impact | Mitigation                                 |
| ---------------------- | ------ | ------------------------------------------ |
| Performance regression | HIGH   | Benchmark before/after, optimize hot paths |
| Breaking changes       | MEDIUM | Maintain API compatibility                 |
| Edge case failures     | HIGH   | CTS validation, comprehensive testing      |
| jsep limitations       | MEDIUM | Custom plugin for JSONPath syntax          |

### Performance Concerns

From [PERFORMANCE_ANALYSIS.md](packages/jsonpath/PERFORMANCE_ANALYSIS.md):

- Current filter performance: 10,182 ops/s (3.3x slower than jsonpath)
- jsep parsing: ~500k expr/sec (spec claim)
- Interpretation overhead vs compilation

**Mitigation**:

- Cache compiled filters (already in spec)
- Optimize interpreter hot paths
- Consider hybrid approach

### Compatibility Concerns

1. **RFC 9535 Compliance**: Must maintain 100% CTS pass rate
2. **Plugin System**: Existing plugins must continue to work
3. **API Stability**: `query()`, `compile()` signatures unchanged

---

## Recommended Approach

Based on research, the specification in [specs/jsonpath-jsep.md](specs/jsonpath-jsep.md) provides a complete blueprint. Key recommendations:

### Phase 1: Create `@jsonpath/filter-eval` Package

1. Implement jsep-based filter expression parser
2. Implement secure AST interpreter
3. Integrate with existing function registry
4. Add caching layer

### Phase 2: Integrate with `@jsonpath/evaluator`

1. Replace `evaluateExpression()` with filter-eval calls
2. Maintain backward compatibility
3. Validate with CTS

### Phase 3: Update `@jsonpath/compiler`

1. Remove `new Function()` code generation
2. Use filter-eval for filter expressions
3. Keep non-filter optimizations if beneficial

### Phase 4: Validation

1. Run full CTS
2. Run benchmarks
3. Verify bundle size < 10KB increase

---

## Implementation Guidance

### Objectives

- Remove all `new Function()` usage from filter expression evaluation
- Maintain RFC 9535 compliance (100% CTS pass rate)
- Bundle size increase < 10KB
- Performance within 2x of current implementation

### Key Tasks

1. Add jsep and @jsep-plugin/regex dependencies
2. Create @jsonpath/filter-eval package structure
3. Implement jsep configuration and custom plugin
4. Implement secure evaluator class
5. Integrate with evaluator package
6. Update compiler to not use new Function
7. Validate with compliance tests
8. Benchmark and optimize

### Dependencies

- jsep (runtime)
- @jsep-plugin/regex (runtime)
- Existing @jsonpath/core types and errors

### Success Criteria

- Zero `new Function()` or `eval()` in production code
- CTS pass rate: 100%
- Performance: >= 5,000 ops/s for filter queries
- Bundle size: < 10KB increase
