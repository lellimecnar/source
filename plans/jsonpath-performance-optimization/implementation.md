## JSONPath Performance Optimization (Implementation Guide)

## Goal

Implement the 14-step plan in `plans/jsonpath-performance-optimization/plan.md` to close the v4 benchmark gaps and achieve market-leading performance.

Primary priorities:

- Wildcards
- Recursive descent (`..`)
- Large arrays
- Patch / merge-patch throughput

## Constraints and Conventions

- Branch: `feat/jsonpath-performance-optimization`
- Run commands from repo root (do not `cd` into packages).
- Each step ends with **STOP & COMMIT** using a conventional commit message.

## Quick Commands

- Install: `pnpm install`
- Tests (all): `pnpm test`
- Type-check (all): `pnpm type-check`
- Benchmarks (all): `pnpm --filter @jsonpath/benchmarks bench`
- Benchmarks (JSONPath only): `pnpm --filter @jsonpath/benchmarks bench:query`

## Step-by-Step

### Step 1: Wildcard fast path for all patterns (highest priority)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`

**Objective:** Add (or ensure) an eager, non-generator fast path for wildcard chains where wildcards can appear anywhere in the chain, bypassing generator overhead, pooling, and per-element security checks.

**Checklist:**

- [x] Add a dedicated wildcard chain fast path (or expand existing one) that supports wildcards at any position in a child-segment chain.
- [x] Ensure it only accepts segments with a single selector where selector type is name or wildcard.
- [x] Ensure it bails out if security restrictions are configured (`secure.allowPaths` or `secure.blockPaths`).
- [x] Ensure it returns plain result nodes (no pool acquisition).
- [x] Add unit tests for:
  - [x] `$[*]`
  - [x] `$.prop[*]`
  - [x] `$[*].prop`
  - [x] `$.a[*].b[*].c`

**Verification:**

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/benchmarks bench src/query-fundamentals.bench.ts`
- Confirm wildcard scenarios trend toward **1.5M+ ops/s** (plan target)

**Step 1 STOP & COMMIT**

```txt
perf(evaluator): wildcard chain fast path

- Add/expand eager wildcard chain evaluation
- Add unit coverage for wildcard chain forms

completes: step 1 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 2: Inline limit checking in evaluator hot loops

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`

**Objective:** Replace hot-path `checkLimits(...)` calls with inline checks to reduce per-element function-call overhead.

**Checklist:**

- [ ] Identify hot loops (wildcard, slices, filters, large arrays) that call `checkLimits(...)`.
- [ ] Replace calls with inline checks that preserve semantics for:
  - [ ] `signal.aborted`
  - [ ] `maxNodes`
  - [ ] `maxDepth`
  - [ ] `timeout`
  - [ ] `maxResults` (for call sites that check `resultsFound`)

**Verification:**

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/benchmarks bench --testNamePattern='Fundamentals'`

**Step 2 STOP & COMMIT**

```txt
perf(evaluator): inline limit checks in hot loops

Replace per-element checkLimits() calls with inline checks to reduce overhead while preserving limit/timeout semantics.

completes: step 2 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 3: Skip security checks when unconfigured

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`

**Objective:** Avoid per-element security checks in the common case where allow/block paths are not configured.

**Checklist:**

- [ ] Add a boolean flag in evaluator initialization that indicates whether security is enabled.
- [ ] Guard security checks (`isNodeAllowed`) behind that flag.
- [ ] Ensure security behavior is unchanged when allow/block rules are configured.

**Verification:**

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/compliance-suite test`

**Step 3 STOP & COMMIT**

```txt
perf(evaluator): skip security checks when unconfigured

Avoid per-element security overhead when allow/block paths are not set.

completes: step 3 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 4: Enable compiled queries by default in facade

**Files:**

- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts`

**Objective:** Use `compileQuery()` by default for facade queries so compiler fast paths are used automatically.

**Checklist:**

- [ ] Change facade flow from interpreter-first to compiler-first.
- [ ] Ensure plugins and options are preserved.
- [ ] Ensure cache strategy (if any) remains correct.

**Verification:**

- `pnpm --filter @jsonpath/jsonpath test`
- `pnpm --filter @jsonpath/compliance-suite test`
- `pnpm --filter @jsonpath/benchmarks bench --testNamePattern='Fundamentals'`

**Step 4 STOP & COMMIT**

```txt
perf(jsonpath): compile queries by default in facade

Route facade query execution through compileQuery() to leverage compiler fast paths by default.

completes: step 4 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 5: Add/extend evaluator fast path for non-compiled usage

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`

**Objective:** Ensure evaluator fast paths cover more simple patterns and are used consistently in non-compiled scenarios.

**Checklist:**

- [ ] Extend the simple-chain fast path coverage (where appropriate).
- [ ] Add/extend tests that prove fast-path behavior.
- [ ] Confirm no behavior differences vs. interpreter path.

**Verification:**

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/benchmarks bench --testNamePattern='Fundamentals'`

**Step 5 STOP & COMMIT**

```txt
perf(evaluator): expand non-compiled fast paths

Extend evaluator eager fast path coverage for simple patterns to reduce interpreter overhead.

completes: step 5 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 6: Batch wildcard collection for large arrays

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/query-result-pool.ts`

**Objective:** Reduce generator overhead for large arrays by batching wildcard expansions.

**Checklist:**

- [ ] Implement batching for wildcard expansion when arrays exceed a threshold.
- [ ] Keep small arrays on the simpler per-element path.
- [ ] Ensure security checks still apply correctly (but only if security is enabled).

**Verification:**

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/benchmarks bench src/scale-testing.bench.ts`

**Step 6 STOP & COMMIT**

```txt
perf(evaluator): batch wildcard expansion for large arrays

Reduce generator suspension overhead by batching wildcard expansion for large arrays.

completes: step 6 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 7: Compile-time function resolution

**Files:**

- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/nodes.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/functions/src/registry.ts`

**Objective:** Resolve functions at parse/compile time where possible to reduce runtime lookup overhead in filters.

**Checklist:**

- [ ] Store resolved function references on AST nodes during parse/compile.
- [ ] Prefer resolved references during evaluation; fall back to registry lookup if missing.
- [ ] Ensure behavior is unchanged when a function is missing/unregistered.

**Verification:**

- `pnpm --filter @jsonpath/parser test`
- `pnpm --filter @jsonpath/functions test`
- `pnpm --filter @jsonpath/benchmarks bench --testNamePattern='Filter'`

**Step 7 STOP & COMMIT**

```txt
perf(parser,evaluator): resolve functions at parse time

Store resolved function references on AST nodes to reduce runtime lookup cost in filter-heavy queries.

completes: step 7 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 8: Lazy generator conversion (streaming opt-in)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/options.ts`
- `packages/jsonpath/core/src/types.ts`

**Objective:** Keep eager evaluation as the default; use generators only when streaming is requested (e.g., `{ stream: true }`) or a limit requires early termination.

**Checklist:**

- [ ] Add `stream?: boolean` to `EvaluatorOptions`.
- [ ] Ensure default is eager evaluation when `stream` is not set.
- [ ] Preserve streaming API behavior for callers that explicitly request it.

**Verification:**

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/compliance-suite test`
- `pnpm --filter @jsonpath/benchmarks bench --testNamePattern='Fundamentals'`

**Step 8 STOP & COMMIT**

```txt
perf(evaluator): make streaming opt-in

Use eager evaluation by default and only pay generator overhead when stream mode is explicitly requested.

completes: step 8 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 9: Optimize @jsonpath/patch performance

**Files:**

- `packages/jsonpath/patch/src/patch.ts`
- `packages/jsonpath/patch/src/operations.ts`
- `packages/jsonpath/patch/src/__tests__/patch.spec.ts`

**Objective:** Improve patch throughput by reducing cloning/rollback overhead and pre-parsing pointer tokens.

**Checklist:**

- [ ] Default to in-place mutation (`mutate: true`) if required by the plan, and update internal consumers accordingly.
- [ ] Pre-parse path tokens once per op.
- [ ] Apply ops using token navigation rather than full pointer resolution.
- [ ] Ensure validation behavior matches intended defaults.

**Verification:**

- `pnpm --filter @jsonpath/patch test`
- `pnpm --filter @jsonpath/benchmarks exec vitest bench src/patch-rfc6902.bench.ts`

**Step 9 STOP & COMMIT**

```txt
perf(patch): speed up applyPatch

Reduce per-op overhead by pre-parsing pointer tokens and minimizing cloning/rollback work.

completes: step 9 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 10: Optimize @jsonpath/merge-patch apply performance

**Files:**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`
- `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts`

**Objective:** Reduce overhead in merge-patch apply by using direct iteration and fewer intermediate allocations.

**Checklist:**

- [ ] Use direct property iteration (`for ... in`) with `hasOwnProperty` guard.
- [ ] Inline plain-object checks.
- [ ] Ensure semantics match RFC 7386 behavior.

**Verification:**

- `pnpm --filter @jsonpath/merge-patch test`
- `pnpm --filter @jsonpath/benchmarks exec vitest bench --testNamePattern='Merge'`

**Step 10 STOP & COMMIT**

```txt
perf(merge-patch): reduce overhead in apply

Use direct property iteration and inline object checks to speed up merge-patch application.

completes: step 10 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 11: Reduce object allocations in evaluator hot paths

**Files:**

- `packages/jsonpath/evaluator/src/query-result-pool.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/core/src/types.ts`

**Objective:** Reduce allocations and pooling overhead in hot paths while preserving correctness.

**Checklist:**

- [ ] Avoid pool acquisition for eager fast paths.
- [ ] Reduce intermediate object creation in hot loops.
- [ ] Avoid unnecessary path array copying.

**Verification:**

- `pnpm --filter @jsonpath/evaluator test`
- `pnpm --filter @jsonpath/benchmarks bench:query`

**Step 11 STOP & COMMIT**

```txt
perf(evaluator): reduce hot-path allocations

Reduce per-node allocations and pool churn in evaluator hot paths while preserving streaming correctness.

completes: step 11 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 12: Optimize recursive descent (`..`)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/compiler/src/compiler.ts`

**Objective:** Improve recursive descent performance by reducing generator/recursion overhead and using an iterative DFS approach where possible.

**Checklist:**

- [ ] Add or improve a dedicated DFS-based traversal for descendant queries.
- [ ] Ensure correctness under compliance suite.
- [ ] Avoid deep recursion and excessive intermediate allocations.

**Verification:**

- `pnpm --filter @jsonpath/compliance-suite test`
- `pnpm --filter @jsonpath/benchmarks bench --testNamePattern='Recursive'`

**Step 12 STOP & COMMIT**

```txt
perf(evaluator,compiler): speed up recursive descent

Use iterative traversal and reduce generator/recursion overhead for $.. queries.

completes: step 12 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 13: Add performance regression tests (warn-only)

**Files:**

- `packages/jsonpath/benchmarks/src/performance-regression.spec.ts`
- `packages/jsonpath/benchmarks/baseline.json`

**Objective:** Warn (non-blocking) if performance regresses more than 10% from baseline.

**Checklist:**

- [ ] Add or update warn-only regression tests that compare ops/sec against a baseline.
- [ ] Ensure regressions only emit warnings and do not fail CI.
- [ ] Document baseline update workflow.

**Verification:**

- `pnpm --filter @jsonpath/benchmarks exec vitest run src/performance-regression.spec.ts`

**Step 13 STOP & COMMIT**

```txt
test(benchmarks): warn-only perf regression checks

Compare ops/sec against baseline.json and warn on >10% regressions without failing CI.

completes: step 13 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 14: Update documentation and benchmark reports

**Files:**

- `packages/jsonpath/benchmarks/AUDIT_REPORT.md`
- `packages/jsonpath/benchmarks/README.md`
- `packages/jsonpath/jsonpath/README.md`
- `docs/api/jsonpath.md`

**Objective:** Document new defaults/options and record post-optimization benchmark numbers.

**Checklist:**

- [ ] Update benchmark docs with before/after results.
- [ ] Document new options and any breaking changes.
- [ ] Document tuning tips and how to run benchmarks.

**Verification:**

- `pnpm --filter @jsonpath/benchmarks bench:full`

**Step 14 STOP & COMMIT**

```txt
docs(benchmarks,jsonpath): update performance docs and results

Record post-optimization benchmark numbers and document new options and breaking changes.

completes: step 14 of 14 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
