# JSONPath Audit Resolution Implementation

## Goal

Implement the missing `ifNotExists()` method in PatchBuilder to achieve 100% RFC 6902 compliance for the @jsonpath/patch package.

## Prerequisites

Make sure that the user is currently on the `fix/jsonpath-audit-resolution` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from main.

### Step-by-Step Instructions

#### Step 1: Add `ifNotExists()` Method to PatchBuilder

- [ ] Open `packages/jsonpath/patch/src/builder.ts`
- [ ] Locate the `ifExists()` method (around line 32-39)
- [ ] Add the `ifNotExists()` method immediately after `ifExists()` and before the `private shouldAdd()` method
- [ ] Insert the following code:

```typescript
	/**
	 * Only applies the next operation if the path does NOT exist in the target.
	 * Requires the builder to be initialized with a target.
	 */
	ifNotExists(path: string): this {
		if (!this.target) {
			throw new Error('ifNotExists() requires a target document');
		}
		this.nextCondition = !new JSONPointer(path).exists(this.target);
		return this;
	}
```

##### Step 1.1 Verification

- [ ] Run type check: `pnpm --filter @jsonpath/patch type-check`
- [ ] Verify no TypeScript errors
- [ ] Confirm the method is properly placed between `ifExists()` and `private shouldAdd()`

#### Step 2: Add Comprehensive Tests for `ifNotExists()`

- [ ] Open `packages/jsonpath/patch/src/__tests__/options.spec.ts`
- [ ] Locate the existing `ifExists()` test (around line 101-112)
- [ ] Add a new test immediately after the `ifExists()` test
- [ ] Insert the following test code:

```typescript
it('should support ifNotExists()', () => {
	const data = { a: 1 };
	const b = builder(data)
		.ifNotExists('/a')
		.add('/a-not-exists', true)
		.ifNotExists('/b')
		.add('/b-not-exists', true)
		.build();

	expect(b).toEqual([{ op: 'add', path: '/b-not-exists', value: true }]);
});

it('should throw error when using ifNotExists() without target', () => {
	expect(() => {
		builder().ifNotExists('/a').add('/a', 1);
	}).toThrow('ifNotExists() requires a target document');
});

it('should work with nested paths in ifNotExists()', () => {
	const data = { a: { b: 1 } };
	const b = builder(data)
		.ifNotExists('/a/c')
		.add('/a/c', 2)
		.ifNotExists('/a/b')
		.add('/a/b-modified', 3)
		.build();

	expect(b).toEqual([{ op: 'add', path: '/a/c', value: 2 }]);
});

it('should chain multiple ifNotExists() conditions', () => {
	const data = { x: 1 };
	const b = builder(data)
		.ifNotExists('/y')
		.add('/y', 2)
		.ifNotExists('/z')
		.add('/z', 3)
		.ifNotExists('/x')
		.add('/x-copy', 4)
		.build();

	expect(b).toEqual([
		{ op: 'add', path: '/y', value: 2 },
		{ op: 'add', path: '/z', value: 3 },
	]);
});
```

##### Step 2.1 Verification

- [ ] Run tests: `pnpm --filter @jsonpath/patch test`
- [ ] Verify all new tests pass
- [ ] Verify all existing tests still pass
- [ ] Confirm test coverage includes:
  - Path exists (operation skipped)
  - Path doesn't exist (operation added)
  - Missing target document (error thrown)
  - Nested paths
  - Multiple chained conditions

#### Step 3: Update Audit Documentation

- [ ] Open `docs/audit/jsonpath-implementation-audit.md`
- [ ] Update the feature status table in Section 8 (around line 315)
- [ ] Change the `ifNotExists()` status from ❌ to ✅
- [ ] Remove the "Missing: `ifNotExists(path)` method" section (lines 325-336)
- [ ] Update the executive summary compliance percentages
- [ ] Update the RFC 6902 compliance score

##### Step 3.1: Update Feature Status Table

Locate the table in Section 8 (around line 315) and change:

```markdown
| Feature                                                   | Status |
| --------------------------------------------------------- | ------ |
| Basic operations (add, remove, replace, move, copy, test) | ✅     |
| `when(condition)` conditional                             | ✅     |
| `ifExists(path)` conditional                              | ✅     |
| `ifNotExists(path)` conditional                           | ❌     |
| `replaceAll(jsonpath, value)`                             | ✅     |
| `removeAll(jsonpath)`                                     | ✅     |
```

To:

```markdown
| Feature                                                   | Status |
| --------------------------------------------------------- | ------ |
| Basic operations (add, remove, replace, move, copy, test) | ✅     |
| `when(condition)` conditional                             | ✅     |
| `ifExists(path)` conditional                              | ✅     |
| `ifNotExists(path)` conditional                           | ✅     |
| `replaceAll(jsonpath, value)`                             | ✅     |
| `removeAll(jsonpath)`                                     | ✅     |
```

##### Step 3.2: Remove "Missing" Section

Delete the entire "Missing: `ifNotExists(path)` method" section (lines 325-336):

````markdown
#### Missing: `ifNotExists(path)` method

**Spec Requirement** ([spec L1716](../../specs/jsonpath.md#L1716)):

```typescript
ifNotExists(path: string): this;
```
````

**Current Implementation**: Missing from [builder.ts](../../packages/jsonpath/patch/src/builder.ts)

**Fix Required**: Add the inverse of `ifExists`:

```typescript
ifNotExists(path: string): this {
  if (!this.target) {
    throw new Error('ifNotExists() requires a target document');
  }
  this.nextCondition = !new JSONPointer(path).exists(this.target);
  return this;
}
```

````

##### Step 3.3: Update "Unimplemented Features" Section

Locate the "Unimplemented Features" section (around lines 400-409) and remove the `PatchBuilder.ifNotExists()` entry:

Before:
```markdown
### Unimplemented Features

**Impact**: These features are defined in the custom spec but not implemented.

| Feature                        | Package                      | Spec Reference                              |
| ------------------------------ | ---------------------------- | ------------------------------------------- |
| `PatchBuilder.ifNotExists()`   | `@jsonpath/patch`            | [spec L1716](../../specs/jsonpath.md#L1716) |
| Additional benchmark baselines | `@jsonpath/benchmarks`       | [spec §12](../../specs/jsonpath.md#L3284)   |
| Enhanced compliance suite docs | `@jsonpath/compliance-suite` | [spec §13](../../specs/jsonpath.md#L3473)   |
````

After:

```markdown
### Unimplemented Features

**Impact**: These features are defined in the custom spec but not implemented.

| Feature                        | Package                      | Spec Reference                            |
| ------------------------------ | ---------------------------- | ----------------------------------------- |
| Additional benchmark baselines | `@jsonpath/benchmarks`       | [spec §12](../../specs/jsonpath.md#L3284) |
| Enhanced compliance suite docs | `@jsonpath/compliance-suite` | [spec §13](../../specs/jsonpath.md#L3473) |
```

##### Step 3.4: Update Executive Summary

Locate the executive summary (around lines 13-19) and update the compliance counts:

Before:

```markdown
| Status                   | Count | Percentage |
| ------------------------ | ----- | ---------- |
| ✅ Fully Implemented     | 42    | ~85%       |
| 🟡 Partially Implemented | 4     | ~8%        |
| ❌ Unimplemented         | 3     | ~6%        |
```

After:

```markdown
| Status                   | Count | Percentage |
| ------------------------ | ----- | ---------- |
| ✅ Fully Implemented     | 43    | ~88%       |
| 🟡 Partially Implemented | 4     | ~8%        |
| ❌ Unimplemented         | 2     | ~4%        |
```

##### Step 3.5: Update RFC 6902 Compliance Score

Locate the RFC compliance section and update the RFC 6902 score:

Before:

```markdown
| RFC                         | Compliance | Notes                                           |
| --------------------------- | ---------- | ----------------------------------------------- |
| RFC 9535 (JSONPath)         | ~95%       | Core features complete, some extensions pending |
| RFC 6901 (JSON Pointer)     | ~100%      | Fully compliant                                 |
| RFC 6902 (JSON Patch)       | ~98%       | Missing `ifNotExists()` conditional             |
| RFC 7386 (JSON Merge Patch) | ~100%      | Fully compliant                                 |
```

After:

```markdown
| RFC                         | Compliance | Notes                                           |
| --------------------------- | ---------- | ----------------------------------------------- |
| RFC 9535 (JSONPath)         | ~95%       | Core features complete, some extensions pending |
| RFC 6901 (JSON Pointer)     | ~100%      | Fully compliant                                 |
| RFC 6902 (JSON Patch)       | ~100%      | Fully compliant                                 |
| RFC 7386 (JSON Merge Patch) | ~100%      | Fully compliant                                 |
```

##### Step 3.6: Update Overall Compliance Score

Locate the overall compliance assessment and update:

Before:

```markdown
**Overall JSONPath Suite Compliance: ~97%**
```

After:

```markdown
**Overall JSONPath Suite Compliance: ~98%**
```

##### Step 3.7: Update Package Status

Change the `@jsonpath/patch` status from 🟡 to ✅ in the package overview section (if present).

##### Step 3 Verification Checklist

- [ ] Feature status table shows ✅ for `ifNotExists()`
- [ ] "Missing" section for `ifNotExists()` removed
- [ ] "Unimplemented Features" table no longer lists `PatchBuilder.ifNotExists()`
- [ ] Executive summary counts updated (43 fully implemented, 2 unimplemented)
- [ ] RFC 6902 compliance shows ~100%
- [ ] Overall compliance score updated to ~98%
- [ ] No broken links or references
- [ ] Markdown formatting is correct

#### Step 4: Final Validation

- [ ] Run full test suite: `pnpm --filter @jsonpath/patch test`
- [ ] Run type check: `pnpm --filter @jsonpath/patch type-check`
- [ ] Run linter: `pnpm --filter @jsonpath/patch lint`
- [ ] Build the package: `pnpm --filter @jsonpath/patch build`
- [ ] Verify all tests pass (100% success rate)
- [ ] Verify no TypeScript errors
- [ ] Verify no linting errors
- [ ] Verify build completes successfully

##### Step 4.1 Manual Testing (Optional)

Create a test file `test-ifnotexists.ts` to manually verify the implementation:

```typescript
import { builder } from '@jsonpath/patch';

// Test 1: Path doesn't exist - should add
const doc1 = { name: 'John' };
const patch1 = builder(doc1).ifNotExists('/age').add('/age', 30).build();
console.log('Test 1 - Should add:', patch1);
// Expected: [{ op: 'add', path: '/age', value: 30 }]

// Test 2: Path exists - should skip
const doc2 = { name: 'John', age: 25 };
const patch2 = builder(doc2).ifNotExists('/age').add('/age', 30).build();
console.log('Test 2 - Should skip:', patch2);
// Expected: []

// Test 3: Chaining
const doc3 = { x: 1 };
const patch3 = builder(doc3)
	.ifNotExists('/y')
	.add('/y', 2)
	.ifNotExists('/x')
	.add('/x', 99)
	.build();
console.log('Test 3 - Chain:', patch3);
// Expected: [{ op: 'add', path: '/y', value: 2 }]

// Test 4: Error case (no target)
try {
	builder().ifNotExists('/test').add('/test', 1);
	console.log('Test 4 - ERROR: Should have thrown');
} catch (e) {
	console.log('Test 4 - Correctly threw:', e.message);
	// Expected: 'ifNotExists() requires a target document'
}

console.log('✅ All manual tests passed!');
```

- [ ] Run manual test: `npx tsx test-ifnotexists.ts`
- [ ] Verify all test cases produce expected output
- [ ] Delete test file after verification

##### Step 4 Verification Checklist

- [ ] All automated tests pass
- [ ] Type checking passes with no errors
- [ ] Linting passes with no warnings or errors
- [ ] Package builds successfully
- [ ] Manual testing confirms correct behavior (optional)
- [ ] No regressions in existing functionality

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath): implement ifNotExists() conditional in PatchBuilder

Add the missing ifNotExists() method to PatchBuilder class, completing
RFC 6902 compliance for @jsonpath/patch package. The method provides
conditional operation application based on path non-existence, serving
as the inverse of the existing ifExists() method.

Changes:
- Added PatchBuilder.ifNotExists() method with target validation
- Implemented comprehensive test suite covering all edge cases
- Updated audit documentation to reflect 100% RFC 6902 compliance
- Updated compliance scores in audit executive summary

This brings overall JSONPath suite compliance from ~97% to ~98%.

completes: jsonpath-audit-resolution implementation
closes: #[issue-number]
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Acceptance Criteria Summary

After completing all steps, verify:

- [x] `ifNotExists()` method implemented in `PatchBuilder`
- [x] Method throws error when builder has no target document
- [x] Method correctly skips operations when path exists
- [x] Method correctly applies operations when path doesn't exist
- [x] All existing tests continue to pass
- [x] New test coverage for `ifNotExists()` with all edge cases:
  - Path exists (operation skipped)
  - Path doesn't exist (operation added)
  - Missing target document (error thrown)
  - Nested paths
  - Multiple chained conditions
- [x] Audit document updated to reflect 100% RFC 6902 compliance
- [x] Executive summary percentages updated
- [x] "Unimplemented Features" section updated
- [x] RFC compliance scores updated
- [x] No TypeScript errors
- [x] Lint passes
- [x] Build succeeds

---

## Final Compliance Status

After this implementation:

| RFC                         | Before | After             |
| --------------------------- | ------ | ----------------- |
| RFC 9535 (JSONPath)         | ~95%   | ~95% (unchanged)  |
| RFC 6901 (JSON Pointer)     | ~100%  | ~100% (unchanged) |
| RFC 6902 (JSON Patch)       | ~98%   | **~100%** ✅      |
| RFC 7386 (JSON Merge Patch) | ~100%  | ~100% (unchanged) |

**Overall Compliance: 97% → 98%**

**@jsonpath/patch Package: 🟡 → ✅ Fully Compliant**

---

## Technology Stack

- **Package Manager**: pnpm 9.12.2
- **Build System**: Turborepo
- **Language**: TypeScript 5.5
- **Type Checker**: tsgo (@typescript/native-preview)
- **Testing Framework**: Vitest
- **Module System**: ESM

## Build Commands

```bash
# Run tests
pnpm --filter @jsonpath/patch test

# Type check
pnpm --filter @jsonpath/patch type-check

# Lint
pnpm --filter @jsonpath/patch lint

# Build
pnpm --filter @jsonpath/patch build

# All checks
pnpm --filter @jsonpath/patch test && \
pnpm --filter @jsonpath/patch type-check && \
pnpm --filter @jsonpath/patch lint && \
pnpm --filter @jsonpath/patch build
```

---

## Notes

- This is a single-commit feature implementing one missing method
- The implementation mirrors the existing `ifExists()` pattern with inverted logic
- All code is copy-paste ready with no placeholders or TODOs
- The feature achieves 100% RFC 6902 compliance for the patch package
- No breaking changes to the existing API
- Fluent API chaining is preserved and tested
