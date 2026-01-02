# JSONPath CTS Compliance (RFC 9535)

Branch: jsonpath/cts-compliance
Description: Complete the JSONPath package implementations so the RFC 9535 Compliance Test Suite (CTS) in packages/jsonpath/jsonpath/src/**tests**/compliance/cts.spec.ts passes.

## Goal

Bring the `@jsonpath/jsonpath` engine (and only its immediate internal/workspace dependencies) to full RFC 9535 compliance (as measured by CTS), by fixing RFC-mode wiring, filter semantics, strict validation, and any remaining missing selector/function behaviors revealed by CTS failures.

## Implementation Steps

### Step 1: Inventory + baseline CTS failure map

Files: packages/jsonpath/jsonpath/**, packages/jsonpath/** (only direct deps of `@jsonpath/jsonpath`), packages/jsonpath/jsonpath/src/**tests**/compliance/cts.spec.ts
What:

- Enumerate `@jsonpath/jsonpath` and its direct internal/workspace dependencies (parser, AST, evaluator, utilities, fixtures).
- Run CTS once and capture failure categories (parse errors vs evaluation mismatch vs result-shape mismatch).
  Testing:
- Run the CTS test file and confirm baseline failures are reproducible.
- Produce a short failure taxonomy (counts by category) to drive subsequent commits.

### Step 2: Wire spec mode (RFC 9535) end-to-end

Files: packages/jsonpath/jsonpath/src/\*\* (engine factory + plugin wiring), any RFC parser plugin config module
What:

- Ensure createEngine(...) always runs in RFC 9535 mode and correctly propagates RFC/strict configuration into the RFC parser plugin.
- Remove/avoid any draft-mode defaults affecting CTS.
  Testing:
- CTS run: confirm a significant class of parse-related expectations flips from “wrong mode” to correct behavior.
- Add a small unit test verifying spec config propagation into the parser (where unit tests exist).

### Step 3: Fix filter semantics (Option A: selector-evaluator model)

Files: packages/jsonpath/jsonpath/src/\*\* (filter evaluation + selector evaluation), AST types for selectors/filters
What:

- Implement filters using the existing selector-evaluation pipeline (no new “filter segment” kind, no expression registry).
- Replace the broken FilterSegment + registerExpression approach with: evaluate ?[<selector>] against the candidate node, then coerce to boolean per RFC rules.
- Ensure filter scope variables (e.g., current node) match CTS expectations (root/current handling).
  Testing:
- CTS run: focus on filter-related failures decreasing.
- Add a focused unit test suite for boolean coercion + filter truthiness.

### Step 4: Strict whitespace + invalid-selector validation (CTS-aligned)

Files: packages/jsonpath/jsonpath/src/\*\* (scanner, tokenizer, or parse entrypoint)
What:

- Stop relying on “scanner strips whitespace” for correctness.
- In strict/RFC mode, reject leading/trailing whitespace and other invalid forms exactly as CTS expects.
  Testing:
- CTS run: confirm invalid-selector cases match expected error behavior.
- Add unit tests for whitespace invalidation in RFC mode.

### Step 5: Fill remaining RFC selector behaviors revealed by CTS

Files: packages/jsonpath/jsonpath/src/** (core evaluator), packages/jsonpath/** (shared utilities used by `@jsonpath/jsonpath`)
What:
Iterate over remaining CTS failures and implement missing RFC 9535 behaviors, likely including:

- Array/object selection semantics (wildcards, unions, slices, descendant selectors)
- Comparable semantics (equality/ordering rules, type coercion rules)
- Function support and arity/type validation (if RFC functions are in scope)
- Result normalization rules (ordering, duplicates, stability expectations)
  Testing:
- CTS run after each sub-fix; keep commits small and testable.
- Add targeted unit tests for each fixed semantic rule to prevent regression.

### Step 6: Package boundaries + exports polish (scope-limited)

Files: packages/jsonpath/jsonpath/package.json, packages/jsonpath/\*\* (only direct deps of `@jsonpath/jsonpath`)
What:

- Ensure `@jsonpath/jsonpath` and its direct internal dependencies have correct exports, types, and workspace:\* dependencies.
- Remove stubs / dead code paths that CTS never uses but break builds or types (only within the scope packages).
  Testing:
- Typecheck the jsonpath packages.
- Run CTS to confirm no regressions.

### Step 7: Final CTS clean run + regression notes

Files: plans/jsonpath-cts-compliance/plan.md (update), optional docs/spec notes
What:

- Run CTS and confirm 100% pass.
- Document any intentional divergences (if any) and why they’re RFC-acceptable.
  Testing:
- CTS run must be green.
- Optional: run the jsonpath package test suite (all tests) for safety.
