# @data-map/core Audit Completion Plan

**Branch:** `feat/data-map-audit-completion`
**Description:** Complete all missing, partial, and incorrect implementations identified in the AUDIT_REPORT.md to achieve 100% specification compliance.

## Goal

Address all 11 gaps identified in the `@data-map/core` audit report, bringing the package from ~85-90% compliance to 100% specification compliance. This includes implementing missing features, fixing incorrect implementations, adding comprehensive tests, and establishing performance benchmarks.

---

## Implementation Steps

### Step 1: Fluent Batch API

**Files:** `src/batch/fluent.ts` (new), `src/batch/types.ts`, `src/datamap.ts`, `src/index.ts`, `src/batch/batch.spec.ts`
**What:** Implement the spec-required fluent batch API (`batch.set().set().apply()`) alongside the existing callback-based `batch()` method. The fluent API provides a `Batch<T>` interface with chainable `set()`, `remove()`, `merge()`, `move()`, `copy()` methods, plus `apply()` to commit and `toPatch()` to retrieve operations without committing.

**Implementation:**

```typescript
// New fluent batch interface per spec §4.9
interface Batch<Target extends DataMap<any, any>> {
	set(
		pathOrPointer: string,
		value: unknown,
		options?: { strict?: boolean },
	): this;
	remove(pathOrPointer: string, options?: { strict?: boolean }): this;
	merge(
		pathOrPointer: string,
		value: object,
		options?: { strict?: boolean },
	): this;
	move(from: string, to: string, options?: { strict?: boolean }): this;
	copy(from: string, to: string, options?: { strict?: boolean }): this;
	apply(): void;
	toPatch(): Operation[];
}

// Access via property: myMap.batch.set(...).apply()
```

**Testing:**

- Unit tests for each chainable method
- Test `toPatch()` returns operations without applying
- Test `apply()` commits all accumulated operations atomically
- Test interoperability with existing callback `batch(fn)` API
- Verify notifications fire correctly after `apply()`

---

### Step 2: Move Operation Subscription Semantics

**Files:** `src/patch/apply.ts`, `src/subscription/manager.ts`, `src/__tests__/move-semantics.spec.ts` (new)
**What:** Verify and fix move operation subscription semantics per AC-036/037/038. When a value is moved from `/users/0` to `/archived/0`:

- Subscription on `/users/0` fires `remove` event (not `move`)
- Subscription does NOT follow the moved value
- Subscription on `/archived/0` fires `set` event

**Implementation:**

- Decompose `move` operation into atomic `remove` + `add` for subscription purposes
- Ensure subscription manager tracks pointers, not values
- Emit correct events for source and destination paths

**Testing:**

- Test AC-036: Source subscription fires `remove`
- Test AC-037: Source subscription doesn't follow value
- Test AC-038: Destination subscription fires `set`
- Test AC-035: Array reorder doesn't move subscriptions

---

### Step 3: Subscription Specificity Ordering

**Files:** `src/subscription/manager.ts`, `src/subscription/types.ts`, `src/subscription/manager.spec.ts`
**What:** Implement subscription specificity ordering per spec §5.2. When multiple subscriptions match a path, fire handlers in order of path specificity (most specific first). Equal specificity = registration order.

**Implementation:**

```typescript
// Specificity calculation
function calculateSpecificity(pattern: CompiledPathPattern): number {
	// More segments = more specific
	// Static segments > wildcards > filters > recursive descent
	let score = pattern.segments.length * 100;
	score += pattern.concretePrefix.length * 10;
	if (pattern.hasFilters) score += 5;
	if (!pattern.hasRecursiveDescent) score += 50;
	return score;
}

// Sort before invoking handlers
const sorted = [...handlers].sort(
	(a, b) => calculateSpecificity(b.pattern) - calculateSpecificity(a.pattern),
);
```

**Testing:**

- Test most specific subscription fires first
- Test equal specificity uses registration order
- Test wildcards are less specific than static paths
- Test recursive descent is least specific

---

### Step 4: ResolvedMatch Full Metadata

**Files:** `src/types.ts`, `src/datamap.ts`, `src/definitions/registry.ts`, `src/path/resolve.spec.ts` (new)
**What:** Extend `ResolvedMatch` interface to include full metadata per spec §3.4:

```typescript
interface ResolvedMatch {
	readonly pointer: string;
	readonly value: unknown;
	readonly readOnly?: boolean; // From definition registry
	readonly lastUpdated?: number; // Timestamp of last change
	readonly previousValue?: unknown; // Value before last change
	readonly type?: string; // Type annotation from definition
}
```

**Implementation:**

- Add metadata tracking to DataMap class
- Store `lastUpdated` timestamp on each write operation
- Track `previousValue` during set/patch operations
- Query definition registry for `readOnly` and `type` flags

**Testing:**

- Test `readOnly` flag reflects definition
- Test `lastUpdated` updates on write
- Test `previousValue` contains prior value
- Test `type` annotation from definition

---

### Step 5: Performance Benchmark Suite

**Files:** `src/__benchmarks__/` (new directory), `vitest.config.ts`, `package.json`
**What:** Create performance benchmark suite to verify REQ-027/028/029 compliance:

- REQ-027: O(m) path lookups where m = path segments
- REQ-028: O(1) subscription lookup for static paths
- REQ-029: O(m) pattern matching

**Implementation:**

- Use Vitest's `bench` feature for micro-benchmarks
- Create datasets of varying sizes (100, 1K, 10K, 100K items)
- Benchmark: resolve(), set(), get(), subscribe(), pattern.match()
- Establish baseline metrics and regression thresholds

**Testing:**

- Run benchmarks on each commit (CI integration)
- Verify no regressions beyond 10% threshold
- Document performance characteristics in README

---

### Step 6: Schema Validation Option (Type Definition)

**Files:** `src/types.ts`, `README.md`
**What:** Add `schema` option to `DataMapOptions` interface per spec §2.1. This is a type-only change for future implementation.

```typescript
interface DataMapOptions<T, Ctx = unknown> {
	context?: Ctx;
	definitions?: Record<string, Definition<T, Ctx>>;
	schema?: unknown; // JSON Schema for validation (future enhancement)
}
```

**Testing:**

- Verify TypeScript accepts schema option
- Document as "future enhancement" in README

---

### Step 7: SubscriptionManager Interface Export

**Files:** `src/subscription/types.ts`, `src/index.ts`
**What:** Export public `SubscriptionManager<T, Ctx>` interface for advanced use cases. Keep `SubscriptionManagerImpl` internal.

```typescript
// Export interface only
export interface SubscriptionManager<T, Ctx> {
  register(pattern: string, handler: SubscriptionHandler<T, Ctx>): Unsubscribe;
  notify(...): NotifyResult;
  // ... other public methods
}
```

**Testing:**

- Verify interface is importable from package
- Verify implementation details remain internal

---

### Step 8: Relative JSON Pointer Support

**Files:** `src/path/detect.ts`, `src/datamap.ts`, `src/path/relative.ts` (new), `src/path/relative.spec.ts` (new)
**What:** Implement relative JSON pointer resolution per RFC 6901 extension. Relative pointers use numeric prefix indicating levels to ascend.

```typescript
// Example: "1/sibling" from "/users/0/name" resolves to "/users/0/sibling"
resolve(relativePath: string, contextPointer: string): ResolvedMatch[]
```

**Implementation:**

- Parse relative pointer format: `<levels>/<path>` or `<levels>#`
- Calculate target pointer by ascending `levels` from context
- Append remaining path segments
- Throw in strict mode if no context provided

**Testing:**

- Test "0/foo" (current level) resolution
- Test "1/bar" (parent level) resolution
- Test "2#" (grandparent key) resolution
- Test error on missing context in strict mode

---

### Step 9: Predicate Caching by Hash

**Files:** `src/path/predicate.ts`, `src/path/predicate.spec.ts`
**What:** Change predicate cache key from expression string to content hash per REQ-019. This ensures identical predicates with different whitespace share cache entries.

```typescript
// Current: predicateCache.get(expression)
// New: predicateCache.get(hashExpression(expression))

function hashExpression(expr: string): string {
	// Normalize whitespace, then hash
	const normalized = expr.replace(/\s+/g, ' ').trim();
	return fnv1a(normalized); // Use simple hash function
}
```

**Testing:**

- Test identical predicates with different whitespace share cache
- Test cache hit rate improves for equivalent expressions
- Benchmark cache performance

---

### Step 10: Integration Test Suite

**Files:** `src/__tests__/integration.spec.ts` (expand), `src/__tests__/errors.spec.ts` (expand)
**What:** Expand integration and error handling test coverage to reach 90%+ statement coverage target.

**Test Categories:**

- End-to-end workflows (create → subscribe → modify → verify)
- Complex subscription patterns with nested data
- Batch operations with mixed success/failure
- Concurrent modification scenarios
- Error recovery and cleanup

**Testing:**

- Current: 79.55% statement, 65.83% branch coverage
- Target: 90%+ statement, 85%+ branch coverage

---

### Step 11: Spec Compliance Test Suite

**Files:** `src/__tests__/spec-compliance.spec.ts` (expand)
**What:** Create comprehensive spec compliance test suite covering all REQ-_ and AC-_ requirements from the specification.

**Test Organization:**

```typescript
describe('Spec Compliance', () => {
  describe('REQ-001: Immutable snapshots', () => { ... });
  describe('REQ-002: Observable mutations', () => { ... });
  // ... all 30+ requirements

  describe('AC-001: Setter override storage', () => { ... });
  describe('AC-002: Computed via getter', () => { ... });
  // ... all 40+ acceptance criteria
});
```

**Testing:**

- Map each test to specific spec requirement
- Document compliance matrix in SPEC_COMPLIANCE_REPORT.md

---

## Commit Strategy

Each step above corresponds to one or more commits:

| Step | Commit Message                                                 | Dependencies |
| ---- | -------------------------------------------------------------- | ------------ |
| 1    | `feat(data-map): implement fluent batch API`                   | None         |
| 2    | `fix(data-map): correct move operation subscription semantics` | None         |
| 3    | `feat(data-map): add subscription specificity ordering`        | None         |
| 4    | `feat(data-map): add ResolvedMatch full metadata`              | Step 3       |
| 5    | `feat(data-map): add performance benchmark suite`              | Steps 1-4    |
| 6    | `feat(data-map): add schema option type definition`            | None         |
| 7    | `feat(data-map): export SubscriptionManager interface`         | None         |
| 8    | `feat(data-map): add relative JSON pointer support`            | None         |
| 9    | `refactor(data-map): cache predicates by hash`                 | None         |
| 10   | `test(data-map): expand integration test coverage`             | Steps 1-9    |
| 11   | `test(data-map): add spec compliance test suite`               | Steps 1-10   |

---

## Success Criteria

### Functional Requirements

- [ ] All 11 audit gaps addressed
- [ ] All spec requirements (REQ-\*) implemented
- [ ] All acceptance criteria (AC-\*) passing

### Quality Requirements

- [ ] Statement coverage ≥ 90%
- [ ] Branch coverage ≥ 85%
- [ ] Function coverage ≥ 95%
- [ ] All existing tests passing
- [ ] No regressions in performance benchmarks

### Documentation Requirements

- [ ] AUDIT_REPORT.md updated to reflect completion
- [ ] SPEC_COMPLIANCE_REPORT.md shows 100% compliance
- [ ] README.md updated with new APIs
- [ ] CHANGELOG.md documents all changes

---

## Risk Mitigation

### High Risk: Fluent Batch API Breaking Change

**Mitigation:** Support both APIs. Deprecate callback-based `batch(fn)` in v1, remove in v2.

### Medium Risk: Subscription Ordering Changes Behavior

**Mitigation:** Add comprehensive tests before implementing. Document ordering rules clearly.

### Medium Risk: Performance Benchmark Failures

**Mitigation:** Establish realistic baselines. Allow 10% variance before flagging regression.

---

## Estimated Timeline

| Phase                 | Steps      | Effort   | Duration |
| --------------------- | ---------- | -------- | -------- |
| Phase 1: Core Fixes   | 1, 2, 3    | 4-6 days | Week 1   |
| Phase 2: Enhancements | 4, 5, 6, 7 | 4-5 days | Week 2   |
| Phase 3: Edge Cases   | 8, 9       | 2-3 days | Week 2-3 |
| Phase 4: Testing      | 10, 11     | 4-5 days | Week 3   |

**Total Estimated Effort:** 14-19 days

---

## Dependencies

### Internal Dependencies

- `@jsonpath/core`: Types and AST definitions
- `@jsonpath/jsonpath`: JSONPath evaluation
- `@jsonpath/patch`: JSON Patch operations
- `@jsonpath/pointer`: JSON Pointer utilities

### External Dependencies

- None required for core implementation
- Consider `fnv-plus` or similar for hash function in Step 9

---

## References

- [Audit Report](../packages/data-map/core/AUDIT_REPORT.md)
- [Data Map Specification](../spec/spec-data-datamap.md)
- [Data Map Enhanced Spec](../specs/data-map-enhanced.md)
- [Existing Compliance Plan](../plans/data-map-spec-compliance/plan.md)
