# @jsonpath/\* Library Suite Implementation

**Branch:** `feat/jsonpath-library-suite`
**Description:** Implement a modular, high-performance JSONPath/Pointer/Patch library suite with zero dependencies and full RFC compliance.

## Goal

Build a comprehensive, tree-shakeable library suite implementing RFC 9535 (JSONPath), RFC 6901 (JSON Pointer), RFC 6902 (JSON Patch), and RFC 7386 (JSON Merge Patch). The library will be a zero-dependency, <15KB gzipped implementation achieving >5M ops/sec for compiled queries.

## Decisions

| Decision                 | Resolution                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------- |
| JIT Compiler             | `new Function()` acceptable; secure alternative can be added later                    |
| Plugin System            | Deferred to follow-up PR; initial PR is RFC 9535 core only                            |
| @data-map/core Migration | Deferred to follow-up PR after library is validated                                   |
| Compliance Tests         | Install via `napa` from GitHub, import `cts.json`, run with `describe.each`/`it.each` |
| Benchmarks               | Private `@jsonpath/benchmarks` package                                                |

---

## Implementation Steps

### Step 1: Initialize Package Structure & Shared Infrastructure

**Files:**

- `packages/jsonpath/core/package.json`
- `packages/jsonpath/core/tsconfig.json`
- `packages/jsonpath/core/vite.config.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/lexer/package.json` (and parallel structure)
- `packages/jsonpath/parser/package.json`
- `packages/jsonpath/functions/package.json`
- `packages/jsonpath/evaluator/package.json`
- `packages/jsonpath/compiler/package.json`
- `packages/jsonpath/pointer/package.json`
- `packages/jsonpath/patch/package.json`
- `packages/jsonpath/merge-patch/package.json`
- `packages/jsonpath/jsonpath/package.json`
- `packages/jsonpath/benchmarks/package.json`
- `pnpm-workspace.yaml`
- `turbo.json`

**What:** Scaffold all 10 core packages (9 publishable + 1 private benchmarks) with proper monorepo integration. Each package gets standard config extending shared `@lellimecnar/*-config` packages. Update workspace and Turborepo configuration to include new packages. Install `napa` as workspace dev dependency and configure `jsonpath-compliance-test-suite` installation.

**Testing:** Run `pnpm install` and verify all packages resolve. Run `pnpm build --filter @jsonpath/*` with empty exports to confirm build pipeline works.

---

### Step 2: Implement @jsonpath/core Foundation

**Files:**

- `packages/jsonpath/core/src/types.ts`
- `packages/jsonpath/core/src/errors.ts`
- `packages/jsonpath/core/src/registry.ts`
- `packages/jsonpath/core/src/utils.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/core/src/__tests__/types.spec.ts`
- `packages/jsonpath/core/src/__tests__/errors.spec.ts`
- `packages/jsonpath/core/src/__tests__/utils.spec.ts`

**What:** Implement foundation types (`JSONValue`, `JSONObject`, `JSONArray`, `Path`, `PathSegment`, `QueryNode`, `QueryResult`), error classes (`JSONPathError`, `JSONPathSyntaxError`, `JSONPathTypeError`, `JSONPathReferenceError`, `JSONPointerError`, `JSONPatchError`), registries (`functionRegistry`, `selectorRegistry`, `operatorRegistry`), and utilities (`isObject`, `isArray`, `isPrimitive`, `deepEqual`, `deepClone`, `freeze`).

**Testing:** Unit tests for all exports. Verify `deepEqual` handles circular references. Verify `deepClone` produces truly independent copies. Target: 100% coverage.

---

### Step 3: Implement @jsonpath/lexer Tokenization

**Files:**

- `packages/jsonpath/lexer/src/tokens.ts`
- `packages/jsonpath/lexer/src/char-tables.ts`
- `packages/jsonpath/lexer/src/lexer.ts`
- `packages/jsonpath/lexer/src/index.ts`
- `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts`
- `packages/jsonpath/lexer/src/__tests__/tokenize.spec.ts`

**What:** Implement high-performance tokenizer using ASCII lookup tables. Define all `TokenType` enum values. Handle string escape sequences (`\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\b`, `\f`, `\uXXXX`). Support integer, decimal, and scientific number formats. Implement error recovery (emit ERROR token and advance).

**Testing:** Test all token types. Test edge cases: empty input, malformed strings, invalid escape sequences, unterminated strings, unusual number formats. Performance benchmark: tokenize 10K queries in <100ms.

---

### Step 4: Implement @jsonpath/parser AST Generation

**Files:**

- `packages/jsonpath/parser/src/nodes.ts`
- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/pratt.ts`
- `packages/jsonpath/parser/src/walk.ts`
- `packages/jsonpath/parser/src/transform.ts`
- `packages/jsonpath/parser/src/index.ts`
- `packages/jsonpath/parser/src/__tests__/parser.spec.ts`
- `packages/jsonpath/parser/src/__tests__/expressions.spec.ts`
- `packages/jsonpath/parser/src/__tests__/walk.spec.ts`

**What:** Implement Pratt parser for expressions with correct precedence (`||`: 10, `&&`: 20, `==`/`!=`: 30, `<`/`>`/`<=`/`>=`: 40, `!`: 50 prefix). Implement segment/selector parsing per RFC 9535 grammar. Build complete AST node types. Implement `walk()` and `transform()` utilities.

**Testing:** Parse all valid JSONPath expressions from RFC 9535 examples. Test operator precedence. Test error recovery. Test AST traversal/transformation.

---

### Step 5: Implement @jsonpath/functions Built-in Functions

**Files:**

- `packages/jsonpath/functions/src/length.ts`
- `packages/jsonpath/functions/src/count.ts`
- `packages/jsonpath/functions/src/match.ts`
- `packages/jsonpath/functions/src/search.ts`
- `packages/jsonpath/functions/src/value.ts`
- `packages/jsonpath/functions/src/register.ts`
- `packages/jsonpath/functions/src/index.ts`
- `packages/jsonpath/functions/src/__tests__/functions.spec.ts`

**What:** Implement RFC 9535 built-in filter functions: `length()` (returns string/array/object length or null), `count()` (returns node count), `match()` (regex full match), `search()` (regex partial match), `value()` (extracts single value from nodes). Implement registration utilities.

**Testing:** Test each function with valid/invalid inputs. Test regex edge cases. Verify type coercion behavior matches RFC.

---

### Step 6: Implement @jsonpath/evaluator Interpreter

**Files:**

- `packages/jsonpath/evaluator/src/evaluate.ts`
- `packages/jsonpath/evaluator/src/selectors.ts`
- `packages/jsonpath/evaluator/src/filter.ts`
- `packages/jsonpath/evaluator/src/result.ts`
- `packages/jsonpath/evaluator/src/index.ts`
- `packages/jsonpath/evaluator/src/__tests__/evaluate.spec.ts`
- `packages/jsonpath/evaluator/src/__tests__/selectors.spec.ts`
- `packages/jsonpath/evaluator/src/__tests__/filter.spec.ts`
- `packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts`

**What:** Implement AST interpreter that walks the tree and produces `QueryResult`. Implement all selector behaviors: name, index, wildcard, slice (with negative indices and step), filter (with expression evaluation). Implement `QueryResult` with methods: `values()`, `paths()`, `nodes()`, `first()`, `isEmpty()`, `count()`, `map()`, `filter()`, `forEach()`, `parents()`.

**Testing:** Execute RFC 9535 compliance test suite via `jsonpath-compliance-test-suite/cts.json` using `describe.each`/`it.each`. Test all selector types. Test nested queries. Test filter expressions with all operators.

---

### Step 7: Implement @jsonpath/pointer RFC 6901

**Files:**

- `packages/jsonpath/pointer/src/parse.ts`
- `packages/jsonpath/pointer/src/resolve.ts`
- `packages/jsonpath/pointer/src/mutate.ts`
- `packages/jsonpath/pointer/src/convert.ts`
- `packages/jsonpath/pointer/src/index.ts`
- `packages/jsonpath/pointer/src/__tests__/pointer.spec.ts`

**What:** Implement JSON Pointer parsing with `~0` (tilde) and `~1` (slash) escape handling. Implement `resolve()` for value retrieval, `set()` for value mutation (returns new object), `remove()` for deletion. Implement conversion between pointer strings and path arrays.

**Testing:** RFC 6901 compliance tests. Test escape sequences. Test array indices. Test missing paths. Verify immutability.

---

### Step 8: Implement @jsonpath/patch RFC 6902

**Files:**

- `packages/jsonpath/patch/src/operations.ts`
- `packages/jsonpath/patch/src/apply.ts`
- `packages/jsonpath/patch/src/validate.ts`
- `packages/jsonpath/patch/src/diff.ts`
- `packages/jsonpath/patch/src/index.ts`
- `packages/jsonpath/patch/src/__tests__/apply.spec.ts`
- `packages/jsonpath/patch/src/__tests__/diff.spec.ts`
- `packages/jsonpath/patch/src/__tests__/validate.spec.ts`

**What:** Implement all 6 RFC 6902 operations: `add`, `remove`, `replace`, `move`, `copy`, `test`. Implement `apply()` (returns new document), `validate()` (checks patch validity), `diff()` (generates patch from two documents). Handle array index `-` for append.

**Testing:** Run [JSON Patch Test Suite](https://github.com/json-patch/json-patch-tests). Test operation ordering. Test atomic failure (rollback on error).

---

### Step 9: Implement @jsonpath/merge-patch RFC 7386

**Files:**

- `packages/jsonpath/merge-patch/src/merge.ts`
- `packages/jsonpath/merge-patch/src/diff.ts`
- `packages/jsonpath/merge-patch/src/index.ts`
- `packages/jsonpath/merge-patch/src/__tests__/merge.spec.ts`

**What:** Implement RFC 7386 merge algorithm: `null` deletes keys, arrays are replaced entirely (not merged), objects merge recursively. Implement `diff()` to generate merge patch from two documents.

**Testing:** RFC 7386 compliance tests. Test null handling. Test array replacement. Test deep object merging.

---

### Step 10: Implement @jsonpath/compiler JIT Compilation

**Files:**

- `packages/jsonpath/compiler/src/compile.ts`
- `packages/jsonpath/compiler/src/codegen.ts`
- `packages/jsonpath/compiler/src/cache.ts`
- `packages/jsonpath/compiler/src/index.ts`
- `packages/jsonpath/compiler/src/__tests__/compiler.spec.ts`

**What:** Implement JIT compiler that transforms AST into optimized JavaScript functions using `new Function()`. Implement LRU cache for compiled queries. Target: >5M ops/sec for compiled queries (vs ~500K for interpreted). A more secure alternative (avoiding `new Function()`) can be added in a future enhancement for CSP-restricted environments.

**Testing:** Verify compiled output matches interpreter output for all compliance test cases. Test cache eviction behavior.

---

### Step 11: Implement @jsonpath/benchmarks Performance Suite

**Files:**

- `packages/jsonpath/benchmarks/package.json`
- `packages/jsonpath/benchmarks/tsconfig.json`
- `packages/jsonpath/benchmarks/src/index.ts`
- `packages/jsonpath/benchmarks/src/suites/query.bench.ts`
- `packages/jsonpath/benchmarks/src/suites/pointer.bench.ts`
- `packages/jsonpath/benchmarks/src/suites/patch.bench.ts`
- `packages/jsonpath/benchmarks/src/suites/compiled-vs-interpreted.bench.ts`

**What:** Create private `@jsonpath/benchmarks` package using `mitata` or `tinybench`. Benchmark all critical paths: tokenization, parsing, evaluation (interpreted), evaluation (compiled), pointer resolution, patch application. Compare compiled vs interpreted performance. Generate markdown reports.

**Testing:** Run benchmarks and verify performance targets: >5M ops/sec for compiled queries, >1M ops/sec for pointer operations.

---

### Step 12: Implement @jsonpath/jsonpath Facade Package

**Files:**

- `packages/jsonpath/jsonpath/src/configure.ts`
- `packages/jsonpath/jsonpath/src/query.ts`
- `packages/jsonpath/jsonpath/src/index.ts`
- `packages/jsonpath/jsonpath/src/__tests__/integration.spec.ts`

**What:** Create unified API facade that re-exports commonly used functions. Implement `configure()` for future plugin registration (stub for now). Provide ergonomic API: `query()`, `first()`, `resolve()`, `apply()`, `merge()`.

**Testing:** Integration tests covering common use cases. Verify tree-shaking works (unused packages not bundled). Verify bundle size <17KB gzipped.

---

### Step 13: Documentation & Final Validation

**Files:**

- `packages/jsonpath/README.md`
- `packages/jsonpath/*/README.md` (per-package)
- `docs/api/jsonpath.md`
- `CHANGELOG.md`

**What:** Write comprehensive documentation including: getting started guide, API reference for each package, performance benchmarks, RFC compliance notes.

**Testing:** All tests pass. Bundle size within budget. Performance targets met. Documentation renders correctly.

---

## Package Dependency Graph

```
@jsonpath/jsonpath ────┬───► @jsonpath/evaluator ───┬───► @jsonpath/parser ──► @jsonpath/lexer
                       │                            │                                   │
                       │                            ▼                                   ▼
                       ├───► @jsonpath/compiler ────┴───► @jsonpath/functions ─────────┐
                       │                                                               │
                       ├───► @jsonpath/patch ──────────────────────────────────────────┤
                       │                          ▲                                    ▼
                       └───► @jsonpath/merge-patch┘                         @jsonpath/core
                                                  │
                       @jsonpath/pointer ─────────┘

                       @jsonpath/benchmarks (private, dev-only)
```

---

## Bundle Size Budget

| Package               | Budget (gzipped) |
| --------------------- | ---------------- |
| @jsonpath/core        | 1.5KB            |
| @jsonpath/lexer       | 2.0KB            |
| @jsonpath/parser      | 3.0KB            |
| @jsonpath/functions   | 1.0KB            |
| @jsonpath/evaluator   | 2.5KB            |
| @jsonpath/compiler    | 2.0KB            |
| @jsonpath/pointer     | 1.0KB            |
| @jsonpath/patch       | 2.5KB            |
| @jsonpath/merge-patch | 0.8KB            |
| @jsonpath/jsonpath    | 0.7KB            |
| **Total**             | **17KB**         |

---

## Testing Infrastructure

### Compliance Test Suite Setup

```jsonc
// Root package.json (scripts)
{
	"scripts": {
		"napa": "napa jsonpath-standard/jsonpath-compliance-test-suite:jsonpath-compliance-test-suite",
	},
	"devDependencies": {
		"napa": "^3.0.0",
	},
	"napa": {
		"jsonpath-compliance-test-suite": "jsonpath-standard/jsonpath-compliance-test-suite",
	},
}
```

### Compliance Test Pattern

```typescript
// packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts
import cts from 'jsonpath-compliance-test-suite/cts.json';
import { query } from '../index';

describe('RFC 9535 Compliance', () => {
	describe.each(cts.tests)(
		'$name',
		({ selector, document, result, invalid_selector }) => {
			if (invalid_selector) {
				it('should reject invalid selector', () => {
					expect(() => query(selector, document)).toThrow();
				});
			} else {
				it('should return correct result', () => {
					expect(query(selector, document).values()).toEqual(result);
				});
			}
		},
	);
});
```

---

## Future Work (Out of Scope for This PR)

- **Plugin System:** Extended selectors, type checking functions, arithmetic operators
- **@data-map/core Migration:** Replace `json-p3` dependency
- **Secure Compiler Mode:** Alternative to `new Function()` for CSP environments
- **Streaming API:** For large document processing
