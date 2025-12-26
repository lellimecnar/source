# Polymix Test Quality & Branch Coverage Gate

**Branch:** `feat/polymix-test-quality`  
**Description:** Strengthen `packages/polymix` tests with higher-signal behavioral assertions and enforce an **80% branch coverage** threshold in Jest.

## Goal
Improve confidence in `packages/polymix` by adding high-value behavioral tests that pin down semantic contracts (short-circuiting, precedence, error propagation) rather than just return values. Enforce a minimum **80% branch coverage** gate and eliminate timing-based test flakiness.

## Context
- **Current state:** 100% line/branch coverage (247/247 statements, 100/100 branches, 48/48 functions)
- **Gap:** Tests validate outcomes but don't assert *how* those outcomes are achieved (call counts, short-circuit behavior, error paths)
- **Risk:** Refactors can break behavioral guarantees without failing tests
- **Opportunity:** Add focused behavioral tests to lock in semantic contracts
- **Timing issues:** Found 9 instances of `setTimeout` in tests that create flake risk

## Dependencies Between Steps
- Steps 1-3 can be implemented in parallel (independent test files)
- Step 4 should come after Steps 1-3 to ensure new tests don't inadvertently lower coverage
- Step 5 is independent but recommended last to avoid churn

## Implementation Steps

### Step 1: Strategy short-circuit & error propagation tests
**Commit Message:** `test(strategies): add short-circuit and error propagation tests`

**Files:** `packages/polymix/src/strategies.spec.ts`

**What:** Add 2 new describe blocks with 16 test cases total:

**Block 1: "Short-circuit behavior" (10 tests)**
- `first`: Returns first defined value including falsy (`0`, `''`, `false`); later functions not called
- `first`: Handles all undefined (returns undefined)
- `any` (alias for `first`): Same short-circuit behavior
- `override`: All functions called despite result (no short-circuit)
- `parallel`: All functions called concurrently (no short-circuit)
- `race`: First to resolve/reject wins
- `pipe`: Sequential execution with chaining
- `compose`: Reverse order of pipe
- `merge`: All functions called, results deep-merged
- `all`: All functions called, returns array

**Block 2: "Error propagation" (6 tests)**
- `first`: Sync throw propagates immediately
- `first`: Async rejection propagates
- `parallel`: One rejection propagates (Promise.all behavior)
- `race`: First rejection wins
- `pipe`: Early function throw stops pipeline
- `merge`: Error in any function propagates

Use `jest.fn()` to track call counts and prove ordering.

**Testing:**
```bash
pnpm --filter polymix test strategies.spec
pnpm --filter polymix test -- --coverage --collectCoverageFrom="src/strategies.ts"
```

### Step 2: Core mixin composition & static descriptor tests
**Commit Message:** `test(core): add strategy precedence and descriptor fidelity tests`

**Files:** `packages/polymix/src/core.spec.ts`

**What:** Add 3 new describe blocks with 12 test cases total:

**Block 1: "Strategy precedence" (3 tests)**
- Multiple mixins with different strategies for same method → last mixin wins
- Strategy metadata lookup order verification
- Symbol strategy vs string strategy priority

**Block 2: "Method composition ordering" (4 tests)**
- `override`/`last` with 3 mixins → rightmost wins
- `first` with 3 mixins → leftmost wins
- `pipe` with 3 mixins → left-to-right
- `compose` with 3 mixins → right-to-left

**Block 3: "Static descriptor fidelity" (5 tests)**
- Static getter/setter preserves accessor descriptor
- Non-writable (`writable: false`) preserved
- Non-enumerable (`enumerable: false`) preserved
- Non-configurable (`configurable: false`) preserved
- Symbol-keyed statics copied correctly

**Testing:**
```bash
pnpm --filter polymix test core.spec
pnpm --filter polymix test -- --coverage --collectCoverageFrom="src/core.ts"
```

### Step 3: Decorator metadata & utils edge cases
**Commit Message:** `test(decorators,utils): add edge case coverage`

**Files:**
- `packages/polymix/src/decorators.spec.ts` (2 new tests)
- `packages/polymix/src/__tests__/robustness.spec.ts` (3 new tests)

**What:**

**In decorators.spec.ts:**
1. Decorator metadata with constructor requiring arguments (verify try/catch fallback works)
2. `Symbol.hasInstance` override protection (verify not overwritten)

**In robustness.spec.ts:**
3. `delegate()` with symbol property keys
4. Strategy metadata lookup with symbol keys
5. Delegation to undefined/missing property

**Testing:**
```bash
pnpm --filter polymix test decorators.spec robustness.spec
pnpm --filter polymix test -- --coverage
```

### Step 4: Enforce 80% branch coverage threshold
**Commit Message:** `chore(jest): enforce 80% branch coverage threshold`

**Files:** `packages/polymix/jest.config.js`

**What:** Add `coverageThreshold` configuration:

```javascript
/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	watchman: false,
	roots: ['<rootDir>/src'],
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/*.spec.ts',
		'!src/__tests__/**',
	],
};
```

**Testing:**
```bash
pnpm --filter polymix test -- --coverage  # Should pass
# Negative test: temporarily comment out a test, verify threshold failure
# Restore and verify pass
```

### Step 5: Eliminate timing-based test flakiness
**Commit Message:** `test: replace setTimeout with deterministic timing control`

**Files:**
- `packages/polymix/src/strategies.spec.ts` (7 instances, lines 34, 38, 56, 60, 135, 148, 152)
- `packages/polymix/src/decorators.spec.ts` (2 instances, lines 247, 254)

**What:** Remove all 9 `setTimeout` calls:

**Strategy 1:** For tests that don't need timing (just async resolution), remove delays entirely:
```typescript
// BEFORE
const fn1 = async (a: number) => {
  await new Promise((r) => setTimeout(r, 10));
  return a + 1;
};

// AFTER
const fn1 = async (a: number) => a + 1;
```

**Strategy 2:** For tests that verify timing/ordering, use fake timers:
```typescript
// BEFORE
it('race with delays', async () => {
  const result = await Promise.race([fn1(), fn2()]);
  expect(result).toBe('first');
});

// AFTER
it('race with delays', async () => {
  jest.useFakeTimers();
  const promise = Promise.race([fn1(), fn2()]);
  jest.runAllTimers();
  const result = await promise;
  expect(result).toBe('first');
  jest.useRealTimers();
});
```

**Testing:**
```bash
# Run 10 consecutive times to verify stability
for i in {1..10}; do pnpm --filter polymix test -- --runInBand || break; done

# Test with different concurrency
pnpm --filter polymix test -- --maxWorkers=2
pnpm --filter polymix test -- --maxWorkers=4
```

---

## Success Criteria

### Must Have (Blocking)
- [ ] All new tests pass in `pnpm --filter polymix test`
- [ ] Branch coverage ≥ 100% (actual) with enforced floor at 80%
- [ ] Jest config includes `coverageThreshold`
- [ ] All 9 `setTimeout` instances replaced with deterministic alternatives
- [ ] Test suite passes 10 consecutive runs with `--runInBand` (0% flake)

### Behavioral Coverage (Verified)
- [ ] Short-circuit tested for: `first`, `override`, `parallel`, `pipe`, `compose`, `race`, `merge`, `all`
- [ ] Error propagation tested for: `first`, `parallel`, `race`, `pipe`, `merge`
- [ ] Strategy precedence tested with multi-mixin scenarios
- [ ] Static descriptors tested: getter/setter, writable, enumerable, configurable
- [ ] Edge cases: constructor-with-args, Symbol.hasInstance, symbol property keys

### Quality Metrics
- [ ] Test suite runs in ≤120% of original time (no artificial delays = faster despite more tests)
- [ ] No single test takes >1000ms
- [ ] All test names clearly describe behavior being validated
- [ ] Code comments explain "why" for non-obvious test setups

---

## Implementation Guidelines

### Test Organization
- Keep new tests in existing files (don't create new files)
- Use descriptive `describe()` blocks for behavioral categories
- Use consistent naming: "should [behavior]" or "[strategy]: [behavior]"

### Mocking Best Practices
- Use `jest.fn()` to assert call count/order
- Use `jest.spyOn()` for real implementations
- Call `.mockRestore()` in `afterEach()` for spies

### Coverage Tools
- Focus reports: `--collectCoverageFrom="src/strategies.ts"`
- HTML report: `packages/polymix/coverage/lcov-report/index.html`

### Flakiness Prevention
- Never use `setTimeout` without fake timers
- Never rely on "fast enough" assumptions
- Use deterministic promise control for races
- Clean up timers/mocks in `afterEach()`

### CI/CD Integration
- Coverage threshold enforced by Jest (fails build if <80%)
- Consider CI job that runs tests 10x to catch flaky tests
- Archive coverage reports as artifacts
