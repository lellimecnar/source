# JSONPath jsep Migration: Replace `new Function` with Secure Expression Evaluation

**Branch:** `feat/jsonpath-jsep-filter-eval`
**Description:** Eliminate dynamic code execution (`new Function`) from `@jsonpath/compiler` by introducing a new `@jsonpath/filter-eval` package that uses jsep for secure, RFC 9535-compliant filter expression parsing and evaluation.

## Goal

Replace the security-vulnerable `new Function` pattern in `@jsonpath/compiler` with a secure, parse-then-interpret architecture using [jsep](https://github.com/EricSmekens/jsep). This eliminates prototype pollution risks and enables CSP-compliant deployments while maintaining full RFC 9535 compliance and performance targets.

## Background & Specification Reference

This plan implements the specification defined in [`specs/jsonpath-jsep.md`](../../specs/jsonpath-jsep.md), which provides:

- Detailed jsep configuration for RFC 9535 compliance
- Security-hardened evaluator architecture
- Type system based on RFC 9535 §2.4.1
- Built-in function implementations
- Performance optimization strategies
- Comprehensive test requirements

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        @jsonpath/jsonpath (facade)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐     ┌─────────────────┐
│ @jsonpath/parser│      │ @jsonpath/evaluator │     │@jsonpath/compiler│
│  (unchanged)    │      │   (unchanged)       │     │   (MODIFIED)    │
└─────────────────┘      └─────────────────────┘     └─────────────────┘
         │                          │                          │
         │                          ▼                          ▼
         │               ┌─────────────────────────────────────────────┐
         │               │          @jsonpath/filter-eval (NEW)        │
         │               │   ┌───────────────────────────────────────┐ │
         │               │   │  jsep + custom plugin                 │ │
         │               │   │  ┌─────────────────────────────────┐  │ │
         │               │   │  │ FilterEvaluator                 │  │ │
         │               │   │  │  - evaluateNode()               │  │ │
         │               │   │  │  - safePropertyAccess()         │  │ │
         │               │   │  │  - FORBIDDEN_PROPERTIES         │  │ │
         │               │   │  └─────────────────────────────────┘  │ │
         │               │   └───────────────────────────────────────┘ │
         │               └─────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         @jsonpath/functions                              │
│                   (existing function registry)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Current State Analysis

### Files Containing `new Function` (Migration Targets)

| File                                         | Line | Usage                               | Risk                             |
| -------------------------------------------- | ---- | ----------------------------------- | -------------------------------- |
| `packages/jsonpath/compiler/src/compiler.ts` | 30   | Creates JIT-compiled query function | **HIGH** - Main security concern |

### Dependencies to Add

| Package              | Version  | Purpose                                        |
| -------------------- | -------- | ---------------------------------------------- |
| `jsep`               | `^1.4.0` | Expression parsing                             |
| `@jsep-plugin/regex` | `^1.0.3` | Regex literal support for `match()`/`search()` |

### Existing Safe Patterns (No Changes Required)

- `@jsonpath/evaluator`: Already uses AST interpretation via `evaluateExpression()` method
- `@jsonpath/parser`: Produces AST nodes, no code execution
- `@jsonpath/functions`: Function registry is already injectable

---

## Implementation Steps

### Step 1: Create `@jsonpath/filter-eval` Package Structure

**Files:**

```
packages/jsonpath/filter-eval/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── vite.config.ts
├── README.md
└── src/
    ├── index.ts
    ├── types.ts
    ├── guards.ts
    ├── parser.ts
    ├── evaluator.ts
    ├── cache.ts
    ├── security.ts
    ├── plugins/
    │   └── jsonpath-plugin.ts
    └── __tests__/
        └── (test files)
```

**What:**

- Initialize new workspace package with standard monorepo configuration
- Configure jsep with RFC 9535-compliant operators (remove bitwise, add `@`/`$` identifiers)
- Create custom jsep plugin to handle JSONPath-specific `@.path` and `$.path` syntax
- Define TypeScript interfaces for filter AST nodes

**Dependencies:**

```json
{
	"dependencies": {
		"@jsonpath/core": "workspace:*",
		"@jsonpath/functions": "workspace:*",
		"jsep": "^1.4.0",
		"@jsep-plugin/regex": "^1.0.3"
	}
}
```

**Key Implementation Details:**

1. **jsep Configuration** (per spec §4.1-4.3):

   ```typescript
   // Remove JS-specific operators not in RFC 9535
   jsep.removeUnaryOp('~');
   jsep.removeUnaryOp('typeof');
   jsep.removeBinaryOp('|');
   jsep.removeBinaryOp('^');
   jsep.removeBinaryOp('&');
   jsep.removeBinaryOp('>>>');
   jsep.removeBinaryOp('>>');
   jsep.removeBinaryOp('<<');
   jsep.removeBinaryOp('**');
   jsep.removeBinaryOp('%');
   jsep.removeBinaryOp('in');
   jsep.removeBinaryOp('instanceof');

   // Add JSONPath identifiers
   jsep.addIdentifierChar('@');
   jsep.addIdentifierChar('$');
   ```

2. **Custom JSONPath Plugin** for `@.property` and `$.property` syntax

**Testing:**

- Verify jsep parses RFC 9535 filter expressions correctly
- Verify invalid JS-specific syntax is rejected
- Verify plugin correctly handles `@` and `$` prefixes

---

### Step 2: Implement Security-Hardened Evaluator

**Files:**

```
packages/jsonpath/filter-eval/src/
├── evaluator.ts      (main evaluator class)
├── security.ts       (forbidden properties, safe access)
├── types.ts          (EvaluationContext, EvaluatorOptions)
```

**What:**

- Implement `FilterEvaluator` class with recursive AST node evaluation
- Add security layer with `FORBIDDEN_PROPERTIES` blocklist (per spec §6.1)
- Implement safe property access using `Object.hasOwn()` checks
- Integrate with existing `@jsonpath/functions` registry

**Key Security Features:**

1. **Forbidden Properties** (per spec):

   ```typescript
   const FORBIDDEN_PROPERTIES = new Set([
   	'constructor',
   	'__proto__',
   	'prototype',
   	'__defineGetter__',
   	'__defineSetter__',
   	'__lookupGetter__',
   	'__lookupSetter__',
   	'eval',
   	'Function',
   	'toString',
   	'valueOf',
   ]);
   ```

2. **Safe Property Access:**

   ```typescript
   private safePropertyAccess(obj: unknown, prop: string): unknown {
     if (typeof prop !== 'string') return Nothing;
     if (FORBIDDEN_PROPERTIES.has(prop)) {
       throw new JSONPathSecurityError(`Access to '${prop}' is forbidden`);
     }
     if (obj === null || obj === undefined) return Nothing;
     if (!Object.hasOwn(obj as object, prop)) return Nothing;
     return (obj as Record<string, unknown>)[prop];
   }
   ```

3. **No Dynamic Code Execution:**
   - Pure AST interpretation only
   - Switch statement on node types
   - No `eval()`, `new Function()`, or `Function.prototype` calls

**Testing:**

- Security test suite for prototype pollution attempts
- Verify forbidden property access throws `JSONPathSecurityError`
- Verify proper handling of edge cases (null, undefined, Nothing)

---

### Step 3: Implement Type System and Built-in Functions

**Files:**

```
packages/jsonpath/filter-eval/src/
├── types.ts          (ValueType, NodesType, LogicalType)
├── functions.ts      (built-in function wrappers)
├── i-regexp.ts       (RFC 9485 I-Regexp conversion)
```

**What:**

- Implement RFC 9535 §2.4.1 type system (ValueType, LogicalType, NodesType)
- Create wrappers that bridge jsep evaluation to existing `@jsonpath/functions`
- Implement I-Regexp (RFC 9485) to JavaScript RegExp conversion for `match()`/`search()`
- Add type conversion rules per RFC 9535 §2.4.2

**Built-in Functions (RFC 9535 §2.4.4):**

| Function | Signature                              | Description                        |
| -------- | -------------------------------------- | ---------------------------------- |
| `length` | `(ValueType) → ValueType`              | String length or array/object size |
| `count`  | `(NodesType) → ValueType`              | Number of nodes in nodelist        |
| `match`  | `(ValueType, ValueType) → LogicalType` | Full string regex match            |
| `search` | `(ValueType, ValueType) → LogicalType` | Substring regex search             |
| `value`  | `(NodesType) → ValueType`              | Extract single value from nodelist |

**I-Regexp Implementation:**

- Validate pattern is valid I-Regexp subset
- Convert to JavaScript RegExp with 'u' flag
- Reject unsupported features (backreferences, lookahead, etc.)

**Testing:**

- Test each built-in function with various inputs
- Test type conversion rules
- Test I-Regexp validation and conversion
- Test error cases (wrong types, invalid regex)

---

### Step 4: Implement Filter Compilation and Caching

**Files:**

```
packages/jsonpath/filter-eval/src/
├── compiler.ts       (compileFilter, parseFilter)
├── cache.ts          (FilterCache with LRU)
├── jit.ts           (optional: fast-path optimizations)
```

**What:**

- Create `compileFilter()` function that parses once and returns reusable evaluator
- Implement `FilterCache` with configurable LRU cache
- Optionally implement JIT fast-paths for simple patterns (per spec §10.2)

**API:**

```typescript
// Parse and compile for repeated evaluation
const filter = compileFilter('@.price < 100', options);
const result = filter({ root, current, parent, key });

// Cache for frequently-used expressions
const cache = new FilterCache(100);
const cached = cache.get('@.price < 100') ?? cache.set('@.price < 100', compileFilter(...));
```

**Performance Targets (per spec §10.3):**

| Scenario                    | Target |
| --------------------------- | ------ |
| Parse simple expression     | < 10μs |
| Parse complex expression    | < 50μs |
| Evaluate simple filter      | < 1μs  |
| Evaluate complex filter     | < 10μs |
| Filter 1000 items (simple)  | < 1ms  |
| Filter 1000 items (complex) | < 5ms  |

**Testing:**

- Benchmark parsing and evaluation times
- Test cache hit/miss behavior
- Test cache eviction (LRU)

---

### Step 5: Migrate `@jsonpath/compiler` to Use `filter-eval`

**Files:**

```
packages/jsonpath/compiler/src/
├── compiler.ts           (MODIFY: remove new Function)
├── codegen/
│   ├── generators.ts     (MODIFY: use filter-eval for filters)
│   └── expressions.ts    (MODIFY: delegate to filter-eval)
```

**What:**

- Remove `new Function()` call from `compiler.ts`
- Replace JIT code generation with calls to `@jsonpath/filter-eval`
- Update `generateFilterPredicate()` to compile filters using filter-eval
- Maintain backwards compatibility for non-filter queries

**Migration Strategy:**

1. **Hybrid Approach (Recommended):**
   - Keep optimized code generation for simple, non-filter queries (fast path)
   - Use `@jsonpath/filter-eval` for filter selector evaluation
   - Fallback to `@jsonpath/evaluator` for unsupported patterns

2. **Code Changes in `compiler.ts`:**

   ```typescript
   // BEFORE (INSECURE):
   const factory = new Function(
   	'QueryResult',
   	'evaluate',
   	'getFunction',
   	'Nothing',
   	'ast',
   	body,
   );

   // AFTER (SECURE):
   import { compileFilter } from '@jsonpath/filter-eval';
   // ... use AST interpretation or pre-compiled filters
   ```

3. **Code Changes in `expressions.ts`:**

   ```typescript
   // BEFORE: Generate JS source string
   export function generateFilterPredicate(expr: ExpressionNode): string {
   	const body = generateExpression(expr);
   	return `const ok = _isTruthy(${body});`;
   }

   // AFTER: Return compiled filter function
   export function generateFilterPredicate(
   	expr: ExpressionNode,
   ): CompiledFilter {
   	return compileFilter(exprToString(expr));
   }
   ```

**Testing:**

- All existing compiler tests must pass
- Verify no `new Function` in compiled output
- Benchmark to ensure performance is within targets

---

### Step 6: Update Package Exports and Dependencies

**Files:**

```
packages/jsonpath/jsonpath/package.json    (add filter-eval dependency)
packages/jsonpath/compiler/package.json    (add filter-eval dependency)
pnpm-workspace.yaml                        (verify filter-eval included)
```

**What:**

- Add `@jsonpath/filter-eval` to umbrella package `@jsonpath/jsonpath`
- Update compiler package dependencies
- Verify workspace configuration includes new package
- Export public API from filter-eval

**Public API Exports:**

```typescript
// @jsonpath/filter-eval
export {
	// Core
	FilterEvaluator,
	compileFilter,
	parseFilter,

	// Types
	type FilterNode,
	type EvaluationContext,
	type EvaluatorOptions,
	type CompiledFilter,

	// Cache
	FilterCache,

	// Errors
	FilterEvaluationError,
} from '@jsonpath/filter-eval';
```

**Testing:**

- Verify imports work from umbrella package
- Verify tree-shaking works correctly
- Verify bundle size is within target (< 10KB for filter-eval including jsep)

---

### Step 7: Comprehensive Testing and Compliance

**Files:**

```
packages/jsonpath/filter-eval/src/__tests__/
├── parser.spec.ts        (jsep parsing tests)
├── evaluator.spec.ts     (evaluation tests)
├── security.spec.ts      (security tests)
├── functions.spec.ts     (built-in function tests)
├── integration.spec.ts   (end-to-end tests)
├── compliance.spec.ts    (RFC 9535 filter tests)
└── benchmarks.spec.ts    (performance tests)

packages/jsonpath/compliance-suite/src/
└── compliance.spec.ts    (verify all filter tests pass)
```

**What:**

- Create comprehensive unit tests for all filter-eval components
- Add security test suite with prototype pollution attempts
- Run RFC 9535 Compliance Test Suite to verify filter compliance
- Add performance benchmarks

**Security Test Cases:**

```typescript
describe('Security', () => {
	it('rejects __proto__ access', () => {
		expect(() => evaluate('@.__proto__', ctx)).toThrow(JSONPathSecurityError);
	});

	it('rejects constructor access', () => {
		expect(() => evaluate('@.constructor', ctx)).toThrow(JSONPathSecurityError);
	});

	it('prevents prototype pollution', () => {
		const malicious = { __proto__: { polluted: true } };
		evaluate('@.prop', { current: malicious });
		expect(({} as any).polluted).toBeUndefined();
	});
});
```

**Compliance Test Cases:**

- All filter expressions from JSONPath Compliance Test Suite
- Edge cases for type coercion
- Unicode handling
- Nested filter expressions

**Testing:**

- Run `pnpm test` across all jsonpath packages
- Run compliance suite: `pnpm --filter @jsonpath/compliance-suite test`
- Run benchmarks: `pnpm --filter @jsonpath/benchmarks test`

---

### Step 8: Documentation and Examples

**Files:**

```
packages/jsonpath/filter-eval/README.md
docs/api/filter-eval.md
specs/jsonpath-jsep.md                    (mark as implemented)
```

**What:**

- Create README with usage examples
- Document public API
- Add migration guide for users of compiler package
- Update main JSONPath documentation

**README Contents:**

- Installation
- Basic usage
- Security features
- Custom function extensions
- Performance tuning
- API reference

**Testing:**

- Verify code examples in docs compile and run
- Lint documentation for formatting

---

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                                          |
| -------------------------------- | ---------- | ------ | --------------------------------------------------- |
| Performance regression           | Medium     | High   | Benchmark against current impl, optimize hot paths  |
| Incomplete RFC 9535 coverage     | Low        | High   | Run compliance test suite, fix gaps iteratively     |
| jsep bugs or limitations         | Low        | Medium | Fallback to evaluator for unsupported syntax        |
| Breaking changes to compiler API | Medium     | Medium | Maintain same public interface, deprecate if needed |

## Success Criteria

- [ ] Zero instances of `new Function` or `eval` in codebase
- [ ] 100% of RFC 9535 Compliance Test Suite filter tests pass
- [ ] Security test suite passes (prototype pollution, forbidden properties)
- [ ] Performance within 2x of current implementation for simple queries
- [ ] Bundle size < 10KB for filter-eval package
- [ ] All existing tests pass without modification

## Dependencies

This plan has no external dependencies blocking implementation. All required libraries (jsep, @jsep-plugin/regex) are stable and available on npm.

## Estimated Effort

| Step                            | Effort    | Notes                             |
| ------------------------------- | --------- | --------------------------------- |
| Step 1: Package structure       | 2-3 hours | Boilerplate + jsep config         |
| Step 2: Secure evaluator        | 4-6 hours | Core logic + security             |
| Step 3: Type system + functions | 3-4 hours | Integration with existing         |
| Step 4: Compilation + caching   | 2-3 hours | Reuse patterns from compiler      |
| Step 5: Migrate compiler        | 4-6 hours | Most complex, careful refactoring |
| Step 6: Package exports         | 1 hour    | Configuration only                |
| Step 7: Testing                 | 4-6 hours | Comprehensive coverage            |
| Step 8: Documentation           | 2-3 hours | README + API docs                 |

**Total: 22-32 hours**

---

## Questions for Clarification

1. **Performance Priority:** Should we prioritize matching current JIT performance (may require fast-path optimizations) or accept some regression for security? The spec suggests < 2x regression is acceptable.

2. **Backwards Compatibility:** Should `@jsonpath/compiler` continue to export the same public API, or can we introduce breaking changes in the next major version?

3. **Optional JIT Optimizations:** Should we implement the optional JIT fast-paths (spec §10.2) for simple patterns like `@.price < 100` in this initial implementation, or defer to a follow-up?

4. **I-Regexp Strictness:** How strictly should we validate I-Regexp patterns? The spec suggests rejecting unsupported features, but some may want lenient mode for JavaScript regex compatibility.

5. **Test Coverage Target:** What's the minimum test coverage percentage required before merging? (Suggest: 90% for filter-eval, maintain existing coverage for compiler)

---

## Appendix: File Change Summary

### New Files

- `packages/jsonpath/filter-eval/` - Entire new package (~15 files)

### Modified Files

- `packages/jsonpath/compiler/src/compiler.ts` - Remove `new Function`
- `packages/jsonpath/compiler/src/codegen/generators.ts` - Use filter-eval
- `packages/jsonpath/compiler/src/codegen/expressions.ts` - Delegate to filter-eval
- `packages/jsonpath/compiler/package.json` - Add filter-eval dependency
- `packages/jsonpath/jsonpath/package.json` - Add filter-eval dependency
- `pnpm-workspace.yaml` - Include filter-eval (if not auto-detected)

### Unchanged Files

- `packages/jsonpath/evaluator/*` - Already secure, no changes needed
- `packages/jsonpath/parser/*` - Produces AST, no code execution
- `packages/jsonpath/functions/*` - Existing registry, reused as-is
- `packages/jsonpath/core/*` - Shared types, may add error type
