# @data-map/core Specification Compliance

**Branch:** `feat/data-map-spec-compliance`
**Description:** Achieve full specification compliance for @data-map/core by implementing 8 critical missing features

## Goal

Bring @data-map/core from ~65% to ~95% spec compliance by implementing missing features identified in the SPEC_COMPLIANCE_REPORT.md. This includes microtask batching for subscriptions, before-hook value transformation, pattern serialization, definition dependency auto-subscription, computed value caching, defaultValue handling, and filter re-expansion on criteria change.

## Design Decisions

| Question            | Decision                                 | Rationale                                                                  |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Batch API           | Keep current callback-based `batch()`    | Current implementation is better than spec's fluent API; enhance if needed |
| Microtask Batching  | Always use microtask batching            | Spec-compliant; v0 so no backward compat needed                            |
| Definition Caching  | Per-definition (global)                  | Same computed value for all callers                                        |
| Filter Re-expansion | Re-evaluate all filters on prefix change | Simple approach; optimize later if needed                                  |
| Test Migration      | Global test setup with auto-flush        | Add `afterEach` hook that flushes microtasks                               |

## Implementation Steps

### Step 1: Before-Hook Value Transformation (AC-024)

**Files:** `packages/data-map/core/src/datamap.ts`, `packages/data-map/core/src/datamap.spec.ts`
**What:** Modify the `patch()` method to use `transformedValue` from before-hooks. Currently, before-hooks can return transformed values but they are ignored. The fix applies the transformation to the operation before patch application.
**Testing:**

- Add test: before-hook returning a value modifies stored result
- Add test: multiple before-hooks pipeline transformations correctly
- Verify existing tests still pass

---

### Step 2: Definition defaultValue Handling (AC-003)

**Files:** `packages/data-map/core/src/definitions/registry.ts`, `packages/data-map/core/src/definitions/registry.spec.ts`
**What:** Implement `defaultValue` support during definition registration. When a definition has `defaultValue`, it should be used as the initial value instead of executing the getter during construction.
**Testing:**

- Add test: defaultValue is used when provided
- Add test: getter is not called when defaultValue exists
- Add test: defaultValue is stored in data

---

### Step 3: CompiledPathPattern.toJSON() (REQ-026)

**Files:** `packages/data-map/core/src/path/compile.ts`, `packages/data-map/core/src/path/types.ts`, `packages/data-map/core/src/path/compile.spec.ts`
**What:** Add `toJSON()` method to `CompiledPathPattern` interface that returns a `SerializedPattern` object. This enables debugging, persistence, and pattern comparison.
**Testing:**

- Add test: all segment types serialize correctly (static, index, wildcard, slice, filter, recursive)
- Add test: serialized pattern contains source, segments, isSingular, concretePrefix
- Add test: round-trip serialization maintains pattern behavior

---

### Step 4: Computed Value Caching System

**Files:** `packages/data-map/core/src/definitions/registry.ts`, `packages/data-map/core/src/definitions/types.ts`
**What:** Implement a per-definition caching layer for getters. When a definition has `deps`, the getter result is cached globally and only re-computed when invalidated. This is a prerequisite for AC-031 (deps auto-subscription).
**Testing:**

- Add test: getter is cached on first call
- Add test: cached value returned on subsequent calls
- Add test: manual invalidation triggers re-computation

---

### Step 5: Definition deps Auto-Subscription (AC-031)

**Files:** `packages/data-map/core/src/definitions/registry.ts`, `packages/data-map/core/src/definitions/registry.spec.ts`
**What:** When registering a definition with `deps`, automatically create internal subscriptions for each dependency path. When a dependency changes, invalidate the cached computed value.
**Testing:**

- Add test: changing a dependency updates the computed value
- Add test: multiple dependencies all trigger invalidation
- Add test: computed value with deps auto-updates in subscription callbacks

---

### Step 6: Enhance Batch API (if needed)

**Files:** `packages/data-map/core/src/datamap.ts`, `packages/data-map/core/src/batch/manager.ts`
**What:** Review current callback-based `batch()` implementation. Enhance with any missing features like `toPatch()` support if not present. The current API is preferred over the spec's fluent approach.
**Testing:**

- Verify `batch()` callback receives correct DataMap instance
- Verify batch operations are atomic
- Add `toPatch()` variant if missing

---

### Step 7: queueMicrotask Notification Batching (REQ-016/REQ-017)

**Files:** `packages/data-map/core/src/subscription/scheduler.ts` (NEW), `packages/data-map/core/src/subscription/manager.ts`, `packages/data-map/core/src/datamap.ts`, `packages/data-map/core/vitest.setup.ts` (NEW)
**What:** Implement microtask-based notification batching. Create a `NotificationScheduler` that collects notifications during synchronous execution and delivers them via `queueMicrotask`. Add global test setup with `afterEach` that auto-flushes microtasks.
**Testing:**

- Add global `afterEach` hook in vitest.setup.ts to flush microtasks
- Add test: notifications don't fire synchronously
- Add test: multiple changes batch into single microtask
- Add test: notification order is maintained (before → on → after)

---

### Step 8: Filter Re-expansion on Criteria Change (AC-027)

**Files:** `packages/data-map/core/src/subscription/manager.ts`, `packages/data-map/core/src/subscription/manager.spec.ts`
**What:** Re-evaluate all filter predicates when any path within a filter's `concretePrefix` changes. Simple approach: on any change within prefix, trigger re-expansion for all filter subscriptions matching that prefix.
**Testing:**

- Add test: filter subscription removes pointer when `@.active` becomes false
- Add test: filter subscription adds pointer when `@.active` becomes true
- Add test: re-expansion doesn't fire spurious notifications

---

### Step 9: Missing .toPatch() Methods for Array Operations

**Files:** `packages/data-map/core/src/datamap.ts`, `packages/data-map/core/src/array.spec.ts`
**What:** Add `.toPatch()` variants to `pop()`, `shift()`, and `splice()` methods to match the API surface of `push()`, `unshift()`, `sort()`, and `shuffle()`.
**Testing:**

- Add test: `pop.toPatch()` returns remove operation
- Add test: `shift.toPatch()` returns remove operation with index adjustments
- Add test: `splice.toPatch()` returns combined remove/add operations

---

### Step 10: Subscription get/resolve Events

**Files:** `packages/data-map/core/src/datamap.ts`, `packages/data-map/core/src/subscription/manager.spec.ts`
**What:** Fire `get` and `resolve` subscription events when `dataMap.get()` and `dataMap.resolve()` are called. Currently only `patch` and `set` events trigger notifications.
**Testing:**

- Add test: `on: ['get']` subscription fires on `get()` call
- Add test: `on: ['resolve']` subscription fires on `resolve()` call
- Add test: read interception works via get subscription

---

### Step 11: Documentation and Cleanup

**Files:** `packages/data-map/core/README.md`, `packages/data-map/core/CHANGELOG.md`, `packages/data-map/core/SPEC_COMPLIANCE_REPORT.md`
**What:** Update documentation to reflect new features, update CHANGELOG with all changes, and regenerate the SPEC_COMPLIANCE_REPORT to show improved compliance score (~95%).
**Testing:** Manual review of documentation accuracy

---

## Risk Assessment

| Step | Risk      | Mitigation                                              |
| ---- | --------- | ------------------------------------------------------- |
| 1-3  | 🟢 Low    | Isolated, additive changes                              |
| 4-5  | 🟡 Medium | New caching behavior; test thoroughly for circular deps |
| 6    | 🟢 Low    | Enhancement only, not replacement                       |
| 7    | 🟡 Medium | Changes timing; global test setup handles migration     |
| 8    | 🟡 Medium | Simple approach may have performance implications       |
| 9-10 | 🟢 Low    | Additive API surface                                    |
| 11   | 🟢 Low    | Documentation only                                      |

## Dependencies

```
Step 1 ─┬─ Independent
Step 2 ─┤
Step 3 ─┘

Step 4 ──→ Step 5 (caching required for deps invalidation)

Step 6 ─── Independent

Step 7 ─── Should be done after most features to minimize test churn

Step 8 ─── Depends on understanding structural tracking

Step 9-11 ─ Final cleanup
```

## Acceptance Criteria

- [ ] All 8 critical gaps from SPEC_COMPLIANCE_REPORT addressed
- [ ] All existing tests pass (global test setup handles microtask flushing)
- [ ] New tests added for each feature with >80% coverage
- [ ] Documentation updated
- [ ] Spec compliance score reaches ~95%
