# @data-map/core Test Suite Audit & Expansion

**Branch:** `feat/data-map-test-audit`
**Description:** Comprehensive review, audit, and expansion of all test suites in @data-map/core to achieve 90%+ coverage

## Goal

Systematically audit, revise, and expand the test suites for `@data-map/core` to increase test coverage from 79.55% statements / 65.83% branches to 90%+ across all metrics, ensuring comprehensive validation of all public APIs, edge cases, error paths, and spec compliance.

---

## Current State Analysis

### Coverage Metrics (Baseline)

| Metric             | Current | Target |
| ------------------ | ------- | ------ |
| Statement Coverage | 79.55%  | 90%+   |
| Branch Coverage    | 65.83%  | 85%+   |
| Function Coverage  | 87.02%  | 95%+   |
| Line Coverage      | 83.35%  | 90%+   |
| Test Files         | 15      | 20+    |
| Test Cases         | 62      | 150+   |

### Modules Requiring Attention (Priority Order)

1. **definitions/registry.ts** - 54.54% function coverage
2. **subscription/manager.ts** - 63.15% function coverage
3. **path/compile.ts** - 74.04% statement coverage
4. **datamap.ts** - 62.03% branch coverage
5. **utils/equal.ts** - 64% statement coverage

---

## Implementation Steps

### Step 1: Test Infrastructure & Fixtures

**Files:**

- `src/__fixtures__/data.ts` (new)
- `src/__fixtures__/helpers.ts` (new)
- `vitest.config.ts` (modify)

**What:** Create reusable test fixtures and helper utilities to ensure consistency across all test files. Add coverage thresholds to prevent regression.

**Details:**

- Create `complexData` fixture with nested objects, arrays, users, and settings
- Create `createEventSpy()` helper for tracking subscription events
- Create `createDataMap()` factory with sensible defaults
- Add 85%+ coverage thresholds to vitest config
- Document test patterns in fixtures file

**Testing:** Run `pnpm test` to verify fixtures load correctly and coverage thresholds are enforced.

---

### Step 2: DataMap Core API Tests (datamap.spec.ts)

**Files:** `src/datamap.spec.ts`

**What:** Expand DataMap tests to cover all untested branches (62.03% → 85%+).

**Tests to Add:**

1. **clone() method** (currently 0% coverage)
   - `should clone the DataMap with same initial data`
   - `should clone with isolated subscriptions`
   - `should preserve definitions in clone`

2. **Strict mode testing**
   - `should throw for relative pointers in strict mode`
   - `should throw for invalid JSONPath in strict mode`
   - `should throw when set() finds no matches in strict mode`
   - `should return undefined in non-strict mode for missing paths`

3. **Error paths**
   - `should handle get() with invalid JSONPath syntax`
   - `should handle set() with invalid pointer`
   - `should handle remove() on non-existent path`

4. **Transaction edge cases**
   - `should not trigger notifications on transaction rollback`
   - `should allow nested transactions`
   - `should commit all changes on successful transaction`

5. **Batch context**
   - `should defer notifications within batch`
   - `should flush notifications after batch completes`
   - `should handle nested batch contexts`

**Testing:** Run tests with coverage, verify branch coverage increases to 85%+.

---

### Step 3: Definitions Module Tests (definitions.spec.ts)

**Files:** `src/definitions/definitions.spec.ts`

**What:** Expand definition tests to cover all methods and configurations (54.54% → 95%+).

**Tests to Add:**

1. **Registration patterns**
   - `should register definitions with JSONPath patterns`
   - `should register definitions with JSON Pointers`
   - `should handle multiple definitions for same path`

2. **Getter functionality**
   - `should compute getter values from dependencies`
   - `should cache getter values by dependency hash`
   - `should recompute on dependency change`
   - `should use defaultValue during initialization`

3. **Setter functionality**
   - `should call setter when value assigned`
   - `should call setter when dependency changes`
   - `should pass transform info to setter`

4. **Configuration options**
   - `should enforce readOnly for getters without setters`
   - `should ignore writes to readOnly definitions`
   - `should handle enumerable: false definitions`

5. **Edge cases**
   - `should handle definitions with no dependencies`
   - `should handle circular dependency detection`

**Testing:** Run tests with coverage, verify function coverage increases to 95%+.

---

### Step 4: Subscription Module Tests (subscription/)

**Files:**

- `src/subscription/static.spec.ts`
- `src/subscription/dynamic.spec.ts`
- `src/subscription/events.spec.ts` (new)
- `src/subscription/manager.spec.ts` (new)

**What:** Comprehensive testing of all 5 subscription events and subscription manager methods (63.15% → 95%+).

**Tests to Add:**

1. **All subscription events (new events.spec.ts)**
   - `should emit 'get' event on value access`
   - `should emit 'set' event on value change`
   - `should emit 'remove' event on deletion`
   - `should emit 'resolve' event on path resolution`
   - `should emit 'patch' event for all operations`

2. **Stage hooks**
   - `should call 'before' stage before mutation`
   - `should call 'on' stage during mutation`
   - `should call 'after' stage after mutation`
   - `should allow value transformation in 'before' stage`
   - `should allow cancellation in 'before' stage`

3. **Subscription manager methods**
   - `should return matching subscriptions for pointer`
   - `should handle concurrent subscribe/unsubscribe`
   - `should clean up structural watchers on unsubscribe`
   - `should sort subscriptions by specificity`

4. **Dynamic subscriptions**
   - `should match JSONPath patterns against pointers`
   - `should notify dynamic subscriptions without static matches`
   - `should expand wildcards before notification`

5. **Bloom filter integration**
   - `should use bloom filter for fast rejection`
   - `should handle false positives gracefully`

**Testing:** Run tests with coverage, verify function coverage increases to 95%+.

---

### Step 5: Patch Module Tests (patch/)

**Files:**

- `src/patch/apply.spec.ts`
- `src/patch/builder.spec.ts`
- `src/patch/array.spec.ts` (new)

**What:** Expand patch tests to cover all RFC 6902 operations and array mutations (48.14% branch → 85%+).

**Tests to Add:**

1. **apply.ts - operation tracking**
   - `should track affected pointers for 'add' operations`
   - `should track affected pointers for 'remove' operations`
   - `should track affected pointers for 'replace' operations`
   - `should track affected pointers for 'move' operations`
   - `should track affected pointers for 'copy' operations`
   - `should track affected pointers for 'test' operations`

2. **builder.ts - patch generation**
   - `should generate minimal patches for nested changes`
   - `should create intermediate containers when needed`
   - `should handle array index operations`

3. **array.ts - array mutations (new file)**
   - `should create array when pushing to non-existent path`
   - `should create array when unshifting to non-existent path`
   - `should handle splice with negative start index`
   - `should handle splice with deleteCount exceeding length`
   - `should handle pop on empty array`
   - `should handle shift on empty array`
   - `should use custom RNG for shuffle`
   - `should handle sort with custom comparator`

**Testing:** Run tests with coverage, verify branch coverage increases to 85%+.

---

### Step 6: Path Module Tests (path/)

**Files:**

- `src/path/compile.spec.ts`
- `src/path/expand.spec.ts`
- `src/path/match.spec.ts`
- `src/path/predicate.spec.ts`
- `src/path/recursive.spec.ts`
- `src/path/filter.spec.ts` (new)

**What:** Expand path tests to cover filter expressions, edge cases, and error handling (74.04% → 90%+).

**Tests to Add:**

1. **Filter expressions (new filter.spec.ts)**
   - `should expand filter expressions correctly`
   - `should handle comparison operators in filters`
   - `should handle logical operators in filters`
   - `should handle nested property access in filters`
   - `should handle match() function in filters`

2. **compile.ts edge cases**
   - `should throw for invalid JSONPath syntax`
   - `should cache compiled patterns`
   - `should handle escaped characters in paths`
   - `should handle negative indices`

3. **Recursive descent**
   - `should handle recursive descent with filters`
   - `should handle recursive descent with slices`
   - `should handle deeply nested recursive descent`

4. **Pattern matching**
   - `should match patterns with wildcards`
   - `should match patterns with slices`
   - `should reject non-matching patterns quickly`

**Testing:** Run tests with coverage, verify statement coverage increases to 90%+.

---

### Step 7: Utils Module Tests (utils/)

**Files:**

- `src/utils/util.spec.ts`
- `src/utils/pointer.spec.ts`

**What:** Expand utility tests to cover all edge cases (64% → 95%+).

**Tests to Add:**

1. **deepEqual edge cases**
   - `should compare null vs undefined`
   - `should compare empty objects`
   - `should compare empty arrays`
   - `should skip already-checked references when encountering circular references`
   - `should compare Date objects`
   - `should compare RegExp objects`

2. **deepExtends edge cases**
   - `should return false when partial array is longer`
   - `should handle sparse arrays`
   - `should handle prototype properties`

3. **Pointer utilities**
   - `should escape special characters correctly`
   - `should unescape special characters correctly`
   - `should throw for invalid pointers`
   - `should handle root pointer`
   - `should handle deeply nested pointers`

**Testing:** Run tests with coverage, verify statement coverage increases to 95%+.

---

### Step 8: Integration Tests

**Files:** `src/__tests__/integration.spec.ts` (new)

**What:** Create end-to-end integration tests that validate complete workflows across modules.

**Tests to Add:**

1. **Complete workflow tests**
   - `should support read-modify-write cycle with subscriptions`
   - `should support undo/redo via patch operations`
   - `should support selective subscription by path pattern`

2. **Spec compliance tests**
   - `should notify most-specific subscriptions first`
   - `should batch notifications during transaction`
   - `should preserve immutability of snapshots`

3. **Performance baseline tests**
   - `should handle 1000 subscriptions efficiently`
   - `should handle deeply nested objects (10+ levels)`
   - `should handle large arrays (10000+ elements)`

**Testing:** Run full test suite, verify all integration tests pass.

---

### Step 9: Error & Negative Tests

**Files:** `src/__tests__/errors.spec.ts` (new)

**What:** Create comprehensive negative tests for invalid inputs and error recovery.

**Tests to Add:**

1. **Invalid inputs**
   - `should reject null/undefined as initial data`
   - `should reject non-object initial data`
   - `should handle get() with empty path`
   - `should handle set() with empty path`

2. **Error recovery**
   - `should recover from subscription handler errors`
   - `should recover from getter errors`
   - `should recover from patch application errors`

3. **Boundary conditions**
   - `should handle Number.MAX_SAFE_INTEGER indices`
   - `should handle very long path strings`
   - `should handle deeply nested structures`

**Testing:** Run tests, verify all error paths are covered.

---

### Step 10: Spec Requirements Compliance Tests

**Files:** `src/__tests__/spec-compliance.spec.ts` (new)

**What:** Create dedicated tests that validate each requirement from [spec-data-datamap.md](../../spec/spec-data-datamap.md).

**Tests to Add:**

1. **Core Requirements**
   - `REQ-001: should use json-p3 for all JSONPath/Pointer operations`
   - `REQ-002: should express all mutations as RFC 6902 JSON Patch`
   - `REQ-004: should accept JSON Pointer and JSONPath interchangeably`
   - `REQ-005: should detect path types correctly (pointer, relative-pointer, jsonpath)`

2. **Mutation Requirements**
   - `REQ-010: should generate minimal patches for mutations`
   - `REQ-011: should produce deterministic patch output`
   - `REQ-012: should create intermediate containers for non-existent paths`
   - `REQ-013: should infer container type from path syntax`

3. **Subscription Requirements**
   - `REQ-014: should support both static pointers and dynamic JSONPath`
   - `REQ-015: should compile JSONPath to PathPatterns at registration`
   - `REQ-016: should batch notifications within synchronous block`
   - `REQ-017: should use queueMicrotask for notification delivery`
   - `REQ-018: should track structural dependencies for dynamic subscriptions`
   - `REQ-019: should cache and reuse compiled predicates`

4. **Compiled Pattern Requirements**
   - `REQ-021: should store static segments as literal values`
   - `REQ-022: should compile filter expressions to native JS predicates`
   - `REQ-023: should represent wildcards as typed segment objects`
   - `REQ-025: should pass (value, key, parent) to predicates`
   - `REQ-026: should serialize compiled patterns for debugging`

5. **Constraint Validation**
   - `CON-002: should not expose mutable internal metadata`
   - `CON-003: should not move subscriptions with values during move operation`
   - `CON-005: should isolate predicate functions from DataMap instance`

**Testing:** Run tests and verify all spec requirements have passing test coverage.

---

### Step 11: Documentation & Final Validation

**Files:**

- `AGENTS.md` (update)
- `README.md` (update if exists)
- `vitest.config.ts` (finalize thresholds)

**What:** Document test patterns, finalize coverage thresholds, and validate all targets met.

**Tasks:**

- Update AGENTS.md with test patterns and conventions
- Add test writing guidelines for contributors
- Set final coverage thresholds (90% statements, 85% branches, 95% functions)
- Run full test suite and generate final coverage report
- Document any remaining gaps with justification

**Testing:** Run `pnpm test --coverage` and verify all thresholds pass.

---

## Clarifications (Resolved)

1. **Circular references in `deepEqual`**: When a circular reference is encountered, it should detect that the reference has already been checked and skip it (not throw).

2. **Performance test thresholds**: No hard thresholds - tests should verify operations complete successfully without enforcing timing constraints.

3. **Error message verification**: Tests should verify exact error message strings or use `.toContain()` for partial matching.

4. **Subscription event ordering**: Specificity rules are documented in [spec-data-datamap.md](../../spec/spec-data-datamap.md) Section 4.11 - most-specific subscriptions are notified first.

5. **Coverage exclusions**: Type-only files (`.d.ts`, `types.ts`) should be excluded. Prioritize testing conditional logic and all requirements from the spec.

---

## Spec Requirements Validation Checklist

The following requirements from [spec-data-datamap.md](../../spec/spec-data-datamap.md) MUST have corresponding tests:

### Core Requirements (REQ-001 to REQ-005)

- [ ] REQ-001: All JSONPath/Pointer operations use `json-p3`
- [ ] REQ-002: All mutations expressed as RFC 6902 JSON Patch
- [ ] REQ-003: DataMap maintains plain JavaScript object as canonical store
- [ ] REQ-004: APIs accept both JSON Pointer and JSONPath interchangeably
- [ ] REQ-005: Path type detection uses specified algorithm

### Storage Requirements (REQ-006 to REQ-009)

- [ ] REQ-006: Primary data store is plain JavaScript object/array
- [ ] REQ-007: Metadata stored in sparse Map keyed by JSON Pointer
- [ ] REQ-009: `.resolve()` returns immutable snapshots

### Mutation Requirements (REQ-010 to REQ-013)

- [ ] REQ-010: Mutation methods generate minimal RFC 6902 patches
- [ ] REQ-011: Patch output is deterministic
- [ ] REQ-012: Non-existent paths created with intermediate containers
- [ ] REQ-013: Container type inferred from path syntax

### Subscription Requirements (REQ-014 to REQ-019)

- [ ] REQ-014: Subscriptions support static pointers and dynamic JSONPath
- [ ] REQ-015: JSONPath compiled to PathPatterns at registration
- [ ] REQ-016: Notifications batched within synchronous execution
- [ ] REQ-017: Delivery uses `queueMicrotask`
- [ ] REQ-018: Dynamic subscriptions track structural dependencies
- [ ] REQ-019: Compiled predicates cached and reused

### Compiled Pattern Requirements (REQ-020 to REQ-026)

- [ ] REQ-020: JSONPath compiled to CompiledPathPattern at registration
- [ ] REQ-021: Static segments stored as literal values
- [ ] REQ-022: Filter expressions compiled to native JS predicates
- [ ] REQ-023: Wildcard selectors represented as typed segment objects
- [ ] REQ-024: Pattern matching completes in O(m) time
- [ ] REQ-025: Predicates receive (value, key, parent)
- [ ] REQ-026: Compiled patterns are serializable

### Performance Requirements (REQ-027 to REQ-031)

- [ ] REQ-027: Path lookups complete in O(m) time
- [ ] REQ-028: Subscription lookup is O(1) amortized
- [ ] REQ-029: Pattern matching is O(m) without materialization
- [ ] REQ-030: Batch operations use structural sharing
- [ ] REQ-031: Predicate compilation occurs once per unique expression

### Constraints (CON-001 to CON-005)

- [ ] CON-002: External APIs don't expose mutable internal metadata
- [ ] CON-003: Subscriptions don't move with values during `move`
- [ ] CON-005: Predicate functions isolated from DataMap instance

---

## Summary

This plan will increase test coverage from the current baseline to 90%+ across all metrics through:

- **120+ new test cases** across 11 implementation steps
- **7 new test files** for comprehensive coverage
- **Reusable fixtures and helpers** for consistency
- **Integration and error tests** for production readiness
- **Spec requirement validation** (30+ requirements verified)
- **Coverage thresholds** to prevent regression

Total estimated effort: 3-4 days of focused development.
