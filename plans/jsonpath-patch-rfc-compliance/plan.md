# RFC 6902 Compliance Testing for @jsonpath/patch

**Branch:** `master`
**Description:** Add RFC 6902 spec compliance testing for `@jsonpath/patch` using the official json-patch-tests suite

## Goal

Ensure the `@jsonpath/patch` implementation is fully compliant with RFC 6902 (JSON Patch) by integrating the official [json-patch-tests](https://github.com/json-patch/json-patch-tests) test suite as a development dependency. This provides confidence in the implementation and documents any spec deviations.

## Implementation Steps

### Step 1: Add External Test Suite Dependency

**Files:**

- `packages/jsonpath/patch/package.json`

**What:** Add the `json-patch-tests` repository as a git-based devDependency using pnpm. This avoids modifying the root download script and keeps the dependency scoped to the `@jsonpath/patch` package.

**Command:**

```bash
pnpm add -D --filter @jsonpath/patch https://github.com/json-patch/json-patch-tests
```

**Testing:**

- Verify `pnpm install` succeeds
- Confirm `node_modules/json-patch-tests/tests.json` and `spec_tests.json` exist

---

### Step 2: Create Type Definitions for Test Cases

**Files:**

- `packages/jsonpath/patch/src/__tests__/__fixtures__/rfc6902-types.ts`

**What:** Define TypeScript interfaces matching the json-patch-tests JSON structure to enable type-safe test loading and execution.

```typescript
export interface RFC6902TestCase {
	comment?: string; // Description of the test
	doc: unknown; // The JSON document to test against
	patch: PatchOperation[]; // The patch(es) to apply
	expected?: unknown; // Expected resulting document (success case)
	error?: string; // Error description (failure case)
	disabled?: boolean; // Skip if true
}
```

**Testing:** TypeScript compilation passes

---

### Step 3: Create Test Loader Utility

**Files:**

- `packages/jsonpath/patch/src/__tests__/__fixtures__/load-rfc-tests.ts`

**What:** Create a utility function to load and parse the external JSON test files with proper error handling for missing files (graceful skip when test suite unavailable).

**Testing:**

- Import and call loader in a REPL or simple script
- Verify it returns parsed test cases or null

---

### Step 4: Implement Compliance Test Runner

**Files:**

- `packages/jsonpath/patch/src/__tests__/rfc6902-compliance.spec.ts`

**What:** Create the main compliance test file that:

1. Loads both `spec_tests.json` (RFC appendix examples) and `tests.json` (extended edge cases)
2. Dynamically generates test cases using Vitest's `describe`/`it`
3. Handles disabled tests with `it.skip`
4. Executes success cases and validates against `expected`
5. Executes error cases and verifies exceptions are thrown
6. Follows the existing pattern from `@jsonpath/evaluator` compliance tests

**Testing:**

```bash
pnpm --filter @jsonpath/patch test
```

- All RFC appendix tests (A.1-A.16) should run
- Extended tests should run
- Failures are expected initially (gap identification)

---

### Step 5: Document Compliance Status

**Files:**

- `packages/jsonpath/patch/RFC_COMPLIANCE.md`
- `packages/jsonpath/patch/README.md` (update)

**What:**

1. Create a compliance tracking document listing:
   - Total tests in each suite
   - Passing/failing counts
   - Known deviations with rationale
2. Update README to reference compliance testing and status

**Testing:** Documentation is accurate based on test run results

---

## Post-Implementation: Gap Analysis (Optional Follow-up PR)

Based on research, the following areas may require implementation fixes:

| Issue                                | RFC Section   | Expected Behavior                             |
| ------------------------------------ | ------------- | --------------------------------------------- |
| Leading zeros in array indices       | 4             | `/01` should throw, not be treated as index 1 |
| Missing `path` parameter             | 4             | Operation without `path` should throw         |
| Missing `value` for add/replace/test | 4.1, 4.3, 4.6 | Should throw if `value` missing               |
| Missing `from` for move/copy         | 4.4, 4.5      | Should throw if `from` missing                |
| Invalid JSON Pointer format          | 4             | Paths not starting with `/` should throw      |
| Unrecognized operation               | 4             | Unknown `op` values should throw              |

This plan focuses on **adding the test infrastructure**. Fixing any discovered compliance gaps should be a separate PR to maintain clean commit history.

---

## Dependencies

| Dependency         | Source                               | Purpose                      |
| ------------------ | ------------------------------------ | ---------------------------- |
| `json-patch-tests` | `github:json-patch/json-patch-tests` | Official RFC 6902 test suite |

## Risks & Mitigations

| Risk                         | Mitigation                                                |
| ---------------------------- | --------------------------------------------------------- |
| External repo unavailable    | Tests skip gracefully with warning when fixture not found |
| Test format changes upstream | Pin to specific commit SHA if stability needed            |
| Many failing tests initially | Expected; document as baseline for future fixes           |

## Success Criteria

- [ ] `json-patch-tests` installed as devDependency of `@jsonpath/patch`
- [ ] Compliance test file runs without crashing
- [ ] All test cases from `spec_tests.json` execute (pass or documented fail)
- [ ] All test cases from `tests.json` execute (pass or documented fail)
- [ ] Compliance status documented with pass/fail counts
- [ ] CI pipeline runs compliance tests
