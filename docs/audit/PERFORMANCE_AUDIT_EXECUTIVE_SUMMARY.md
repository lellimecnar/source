# @data-map Performance Audit - Executive Summary

> **Date**: January 9, 2026  
> **Version**: 2.0 (Comprehensive Re-audit)  
> **Previous Audits**: [data-map-performance-audit.md](./data-map-performance-audit.md), [data-map-implementation-audit.md](./data-map-implementation-audit.md)

---

## 📊 Quick Stats

| Metric                          | Status              | Details                           |
| ------------------------------- | ------------------- | --------------------------------- |
| **Overall Performance Gap**     | 🔴 4-14,000x slower | vs. best-in-class competitors     |
| **Critical Bottlenecks**        | 🔴 3 identified     | Require immediate action          |
| **High Priority Issues**        | 🟠 2 identified     | Major performance gains available |
| **Implementation Completeness** | ✅ 100%             | All features per spec implemented |
| **Architectural Soundness**     | ✅ Excellent        | Flat-storage model is sound       |

---

## 🚨 Critical Issues Requiring Immediate Action

### 1. Path Wide Access - CATASTROPHIC (14,157x slower)

**Symptom**: `wideGet` benchmark shows 332 ops/s vs 4.7M ops/s (dot-prop)

**Root Cause**:

```typescript
// In query.ts - calls getObject() for EACH pointer
values: pointers.map((p) => {
	return store.getObject(p); // Each call iterates ALL store entries!
});
```

**Impact**: Accessing 100 top-level keys from 10K store = 2 million unnecessary operations

**Fix**: Materialize once, extract many OR use PrefixIndex for O(1) subtree checks

**Estimated Gain**: 14,000x speedup

**Priority**: 🔴 P0 - Critical

---

### 2. Signal Performance Gap (4x slower)

**Symptom**: Signal read/write operations 4-5x slower than Preact/Solid.js

**Root Causes**:

- Function call overhead in `trackRead()`
- Missing inline peek optimization
- 5x memory overhead from 4 separate pending queues

**Impact**:

- Signal read: 5.4M ops/s vs 22M ops/s (Preact)
- Signal write: 7.1M ops/s vs 19M ops/s (Preact)

**Fix**: Inline dependency tracking, consolidate pending queues

**Estimated Gain**: 2-4x speedup, 4x memory reduction

**Priority**: 🔴 P0 - Critical

---

### 3. Materialization Overhead (No Caching)

**Symptom**: `toObject()` at 100K items takes 183ms (5.5 ops/s)

**Root Cause**:

```typescript
// materializeNested() has NO caching
// Repeated calls do ALL work from scratch
for (const [ptr, value] of data.entries()) {
	// Always O(n)
	const segs = ptr.split('/').slice(1).map(unescapeSegment);
	// String ops, type checks, object creation...
}
```

**Impact**: Repeated queries trigger full materialization each time

**Fix**: Add version-based memoization cache

**Estimated Gain**: 10-100x speedup for repeated access

**Priority**: 🔴 P0 - Critical

---

## 📈 Performance Comparison vs Competitors

### Signals

```
Operation    │ @data-map │ Preact    │ Solid.js  │ Gap
─────────────┼───────────┼───────────┼───────────┼────────
create1      │ 7.93M     │ 22.4M     │ 21.7M     │ 2.7-2.8x
read1        │ 5.36M     │ 19.5M     │ 19.2M     │ 3.6-3.6x
write1       │ 7.10M     │ 19.0M     │ 19.1M     │ 2.7-2.7x
computed     │ 5.25M     │ 14.2M     │ 14.6M     │ 2.7-2.8x
```

**Verdict**: 🔴 3-4x slower across all operations

---

### Path Access

```
Operation    │ @data-map │ lodash    │ dot-prop  │ Gap
─────────────┼───────────┼───────────┼───────────┼────────
shallowGet   │ 144K      │ 6.32M     │ 10.9M     │ 44-76x
deepGet5     │ 138K      │ 4.38M     │ 5.91M     │ 32-43x
wideGet      │ 332       │ 4.69M     │ 4.41M     │ 14,157x ⚠️
```

**Verdict**: 🔴 CATASTROPHIC - 14,000x slower for wide queries

---

### Subscriptions

```
Operation    │ @data-map │ mitt      │ EventEmitter3 │ Gap
─────────────┼───────────┼───────────┼───────────────┼────────
smoke        │ 2.16M     │ 6.02M     │ 12.7M         │ 2.8-5.9x
createBus    │ 2.84M     │ 14.6M     │ 19.4M         │ 5.1-6.8x
emitTo1      │ 1.55M     │ 3.03M     │ 3.42M         │ 2.0-2.2x
emitTo100    │ 92.4K     │ 104K      │ 48.1K         │ 0.9x ✅
```

**Verdict**: 🟠 2-7x slower for basic ops, competitive at scale

---

## 🎯 Optimization Roadmap

### Phase 1: Emergency Fixes (Week 1) - Target: 100x Overall Speedup

| Issue               | Fix                       | Effort   | Impact  |
| ------------------- | ------------------------- | -------- | ------- |
| wideGet catastrophe | Batch materialization     | 2-3 days | 14,000x |
| Signal tracking     | Inline dependency code    | 1 day    | 2-3x    |
| toObject caching    | Version-based memoization | 2 days   | 10-100x |

**Total**: 5-6 days  
**Expected Result**: Path operations 10,000x faster, signals 2x faster

---

### Phase 2: Major Optimizations (Week 2-3) - Target: Competitor Parity

| Issue             | Fix                    | Effort   | Impact    |
| ----------------- | ---------------------- | -------- | --------- |
| Event dispatch    | Direct invocation path | 3-4 days | 3-5x      |
| Signal memory     | Consolidate queues     | 2-3 days | 4x memory |
| Descendant checks | Use PrefixIndex        | 1-2 days | O(n)→O(1) |

**Total**: 6-9 days  
**Expected Result**: Subscriptions 4x faster, 40% less memory

---

### Phase 3: Advanced (Week 4+)

- JIT path compilation
- Structural sharing for nested objects
- SIMD optimizations
- Worker-based materialization

---

## 📋 Previous Audit Status Updates

### From [data-map-performance-audit.md](./data-map-performance-audit.md)

**Reported Status** (January 2025):

- ✅ Signal notification array copies - RESOLVED (Step 2)
- ✅ PatternIndex O(p) linear scan - RESOLVED (Step 6)
- ✅ IndirectionLayer O(n) - RESOLVED (Step 3)
- ✅ PersistentVector naive copy - RESOLVED (Step 8)
- ✅ FlatStore.keys() sort - RESOLVED (Steps 4, 7)

**Current Reality** (January 2026):

- 🔴 **Benchmarks show issues persist** - Performance gaps remain large
- 🔴 **New critical issues discovered** - wideGet catastrophe, materialization
- 🟡 **Partial effectiveness** - Some fixes may not be fully integrated

**Conclusion**: While some low-level optimizations were implemented, **higher-level bottlenecks remain unaddressed**, causing the overall performance gap to persist.

---

## 🔬 Root Cause Analysis: Why Previous Fixes Didn't Help

### Issue: Optimized Low-Level, Ignored High-Level

The previous audit focused on **micro-optimizations**:

- Signal notification array copies
- Pattern matching trie structures
- Array allocation strategies

But **missed macro-bottlenecks**:

- `getObject()` being called in loops
- No materialization caching
- Function call overhead in hot paths
- Event object creation overhead

### Analogy

Previous fixes were like:

> "We optimized the dishwasher's spin cycle to be 10% faster"

Current reality:

> "We're still washing dishes by hand before putting them in the dishwasher"

---

## 🏁 Success Criteria

### Performance Targets (Post-Optimization)

| Operation       | Current | Target | Best Competitor  |
| --------------- | ------- | ------ | ---------------- |
| Signal Read     | 5.4M    | 18M    | 22M (Preact)     |
| Signal Write    | 7.1M    | 16M    | 19M (Preact)     |
| Path Get        | 226K    | 5M     | 10.9M (dot-prop) |
| Path Wide Get   | 332     | 2M     | 4.7M (dot-prop)  |
| Subscriptions   | 2.2M    | 8M     | 12.7M (EE3)      |
| toObject (100K) | 5.5     | 1K     | N/A              |

**Goal**: Achieve **80%+ of best competitor** performance across all operations

---

## 📚 Related Documents

1. **[Comprehensive Audit Report](./COMPREHENSIVE_PERFORMANCE_AUDIT_2026.md)** - Full technical analysis (THIS IS THE PRIMARY DOCUMENT)
2. **[Previous Performance Audit](./data-map-performance-audit.md)** - January 2025 audit with partial fixes
3. **[Implementation Audit](./data-map-implementation-audit.md)** - Feature completeness verification
4. **[Benchmark Results](../../packages/data-map/benchmarks/PERFORMANCE.md)** - Raw benchmark data

---

## ⚡ Quick Action Guide

### If you're a developer fixing this:

1. **Read**: [COMPREHENSIVE_PERFORMANCE_AUDIT_2026.md](./COMPREHENSIVE_PERFORMANCE_AUDIT_2026.md) sections 3.1-3.4
2. **Start with**: Fix #3.1 (wideGet catastrophe) - biggest impact
3. **Test**: Run `pnpm bench:path` to validate
4. **Move to**: Fix #3.3 (inline signal tracking)
5. **Test**: Run `pnpm bench:signals` to validate

### If you're a project manager:

1. **Priority**: P0 issues MUST be fixed before any new features
2. **Timeline**: 5-6 days for Phase 1 (100x speedup)
3. **Risk**: Low - fixes are well-understood and testable
4. **Impact**: Makes @data-map viable for production use

---

## 🎯 Bottom Line

**Current State**: @data-map is **4-14,000x slower** than competitors due to **3 critical implementation bottlenecks**.

**Root Causes**:

1. Repeated full-store iterations in path access
2. Function call overhead in signal tracking
3. No caching for object materialization

**Solution**: Implement 3 focused fixes in Phase 1 (5-6 days)

**Expected Result**: **100x overall speedup**, competitive performance

**Next Step**: Begin implementation of fix #3.1 (wideGet) - highest impact

---

_Report compiled from benchmark data and source code analysis on January 9, 2026_
