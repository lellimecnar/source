<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Implementation Audit Gap Resolution

## Research Executed

### File Analysis

- [docs/audit/jsonpath-implementation-audit.md](../../docs/audit/jsonpath-implementation-audit.md)
  - Comprehensive audit identifying 42 fully implemented (~85%), 4 partially implemented (~8%), and 3 unimplemented (~6%) features
  - Primary gap: `PatchBuilder.ifNotExists()` method missing
  - Secondary gaps: benchmarks and compliance-suite need documentation/integration work
- [specs/jsonpath.md](../../specs/jsonpath.md)
  - Complete specification defining `ifNotExists(path: string): this` at L1716
  - Method should add operation only if path doesn't exist (inverse of `ifExists`)
- [packages/jsonpath/patch/src/builder.ts](../../packages/jsonpath/patch/src/builder.ts)
  - Current implementation has `ifExists()` at L33-39 using `JSONPointer.exists()`
  - Uses `nextCondition` field to gate next operation
  - Missing `ifNotExists()` method entirely

### Code Search Results

- `ifExists|ifNotExists` in `packages/jsonpath/**`
  - `ifExists()` implemented in builder.ts (L33-39)
  - Test coverage in options.spec.ts (L101-117)
  - No `ifNotExists()` implementation or tests exist

### External Research

- #fetch:RFC 6902 (JSON Patch)
  - Standard operations: add, remove, replace, move, copy, test
  - Conditional methods are library extensions, not RFC-mandated
- #fetch:spec L1700-1750
  - `ifNotExists(path: string): this` - Add operation only if path doesn't exist
  - Used for "create if not exists" patterns in patch building

### Project Conventions

- Standards referenced: Vitest for testing, fluent builder pattern
- Instructions followed: pnpm workspace commands, TypeScript strict mode

## Key Discoveries

### 1. Primary Gap: `ifNotExists()` Method

**Specification Requirement** (spec L1716):

```typescript
/** Add operation only if path doesn't exist */
ifNotExists(path: string): this;
```

**Current Implementation** - Only `ifExists()` exists:

```typescript
// packages/jsonpath/patch/src/builder.ts L33-39
ifExists(path: string): this {
  if (!this.target) {
    throw new Error('ifExists() requires a target document');
  }
  this.nextCondition = new JSONPointer(path).exists(this.target);
  return this;
}
```

**Required Implementation** - Inverse logic:

```typescript
ifNotExists(path: string): this {
  if (!this.target) {
    throw new Error('ifNotExists() requires a target document');
  }
  this.nextCondition = !new JSONPointer(path).exists(this.target);
  return this;
}
```

**Files to Modify**:

- [packages/jsonpath/patch/src/builder.ts](../../packages/jsonpath/patch/src/builder.ts) - Add method
- [packages/jsonpath/patch/src/**tests**/options.spec.ts](../../packages/jsonpath/patch/src/__tests__/options.spec.ts) - Add tests

### 2. Secondary Gap: Benchmarks Package

**Status**: Package exists but not fully integrated with CI/CD

**Location**: [packages/jsonpath/benchmarks](../../packages/jsonpath/benchmarks/)

**Current State**:

- Has benchmark files for all operations (basic, compiler, expressions, patch, pointer, query)
- Dependencies on external libraries for comparison (jsonpath, jsonpath-plus)
- Can run via `pnpm bench` but not in CI/CD pipeline

**Remaining Work**:

- Establish performance baselines
- Document expected performance targets from spec (>5M ops/sec compiled)
- Integrate with CI/CD for regression detection

### 3. Tertiary Gap: Compliance Suite Documentation

**Status**: Package exists and passes but documentation is minimal

**Location**: [packages/jsonpath/compliance-suite](../../packages/jsonpath/compliance-suite/)

**Current State**:

- README claims 100% RFC 9535 compliance (703/703 tests passing)
- Uses official jsonpath-compliance-test-suite from GitHub
- Tests run via Vitest

**Remaining Work**:

- Verify test counts match official suite
- Add detailed documentation on test categories
- Ensure CI/CD integration is robust

### Resolved Issues (No Action Required)

The audit confirms these previously flagged issues are now resolved:

| Issue                           | Resolution                             | Evidence                           |
| ------------------------------- | -------------------------------------- | ---------------------------------- |
| `Nothing` uses undefined        | Uses `Symbol.for('@jsonpath/nothing')` | core/src/nothing.ts                |
| Slice step=0 throws error       | Returns empty selection per RFC        | evaluator.spec.ts L114-117         |
| match/search invalid pattern    | Returns `false` (LogicalFalse)         | functions.spec.ts L28-38           |
| Compiler is stub only           | Full JIT codegen implemented           | compiler/src/codegen/generators.ts |
| Missing secureQuery             | Implemented with configurable limits   | jsonpath/src/secure.ts             |
| Missing QuerySet                | Fully implemented                      | jsonpath/src/query-set.ts          |
| Missing ParentSelector in AST   | Implemented                            | parser/src/nodes.ts L23            |
| Missing PropertySelector in AST | Implemented                            | parser/src/nodes.ts L24            |

## Recommended Approach

### Single Solution: Sequential Implementation

Implement the gaps in priority order with minimal changes:

1. **High Priority (15 min)**: Add `ifNotExists()` to PatchBuilder
2. **Medium Priority (1 hour)**: Complete benchmark documentation and establish baselines
3. **Low Priority (30 min)**: Enhance compliance suite documentation

### Implementation Steps

#### Step 1: Add `ifNotExists()` Method

**File**: `packages/jsonpath/patch/src/builder.ts`

Add after `ifExists()` (around L40):

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

#### Step 2: Add Tests for `ifNotExists()`

**File**: `packages/jsonpath/patch/src/__tests__/options.spec.ts`

Add test case after `ifExists()` test (around L117):

```typescript
it('should support ifNotExists()', () => {
	const data = { a: 1 };
	const b = builder(data)
		.ifNotExists('/a')
		.add('/a-new', 'should not add')
		.ifNotExists('/b')
		.add('/b-new', 'should add')
		.build();

	expect(b).toEqual([{ op: 'add', path: '/b-new', value: 'should add' }]);
});

it('should chain ifExists() and ifNotExists()', () => {
	const data = { existing: 1 };
	const b = builder(data)
		.ifExists('/existing')
		.replace('/existing', 2)
		.ifNotExists('/missing')
		.add('/missing', 'created')
		.build();

	expect(b).toEqual([
		{ op: 'replace', path: '/existing', value: 2 },
		{ op: 'add', path: '/missing', value: 'created' },
	]);
});

it('should throw if ifNotExists() called without target', () => {
	expect(() => builder().ifNotExists('/a')).toThrow(
		'requires a target document',
	);
});
```

## Implementation Guidance

### Objectives

1. Achieve 100% spec compliance for PatchBuilder API
2. Establish documented performance baselines
3. Ensure comprehensive test coverage for all gaps

### Key Tasks

| Task                         | Priority | Effort        | Files                      |
| ---------------------------- | -------- | ------------- | -------------------------- |
| Add `ifNotExists()` method   | High     | 5 lines       | builder.ts                 |
| Add `ifNotExists()` tests    | High     | 20 lines      | options.spec.ts            |
| Document benchmark baselines | Medium   | Documentation | benchmarks/README.md       |
| Update compliance suite docs | Low      | Documentation | compliance-suite/README.md |

### Dependencies

- `ifNotExists()` depends on `JSONPointer` from `@jsonpath/pointer` (already imported)
- No external dependencies needed

### Success Criteria

1. All tests pass including new `ifNotExists()` tests
2. Audit report shows 100% implementation (49/49 features)
3. RFC compliance remains at 97%+ overall

### Validation Commands

```bash
# Run patch tests
pnpm --filter @jsonpath/patch test

# Run all JSONPath tests
pnpm --filter "@jsonpath/*" test

# Run compliance suite
pnpm --filter @jsonpath/compliance-suite test
```

## Appendix: Complete Gap Summary

| Gap                     | Package                    | Spec Reference | Effort        | Priority |
| ----------------------- | -------------------------- | -------------- | ------------- | -------- |
| `ifNotExists()` missing | @jsonpath/patch            | spec L1716     | ~5 LOC        | High     |
| Benchmark baselines     | @jsonpath/benchmarks       | spec §9.4      | Documentation | Medium   |
| Compliance docs         | @jsonpath/compliance-suite | spec §10       | Documentation | Low      |
