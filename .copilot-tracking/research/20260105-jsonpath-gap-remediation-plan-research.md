<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Gap Remediation Plan (plans/jsonpath-gap-remediation/plan.md)

## Research Executed

### File Analysis

- package.json
  - `postinstall` downloads the JSONPath compliance test suite into `node_modules/jsonpath-compliance-test-suite`.
- scripts/node/download-compliance-tests.mjs
  - Clones `jsonpath-standard/jsonpath-compliance-test-suite` into `node_modules/` (not a devDependency).
- vitest.config.ts
  - Root Vitest includes `packages/jsonpath/*/vitest.config.ts` in `test.projects`.
- pnpm-workspace.yaml
  - Workspaces include `packages/jsonpath/*`.
- plans/jsonpath-gap-remediation/plan.md
  - Remediation plan includes several assumptions that conflict with RFC 9535 and/or current implementation.
- packages/jsonpath/evaluator/src/**tests**/compliance.spec.ts
  - Evaluator runs CTS tests if `node_modules/jsonpath-compliance-test-suite/cts.json` exists; otherwise it skips.
- packages/jsonpath/evaluator/src/evaluator.ts
  - Current implementation uses `undefined` as the internal “Nothing” value in filter expression evaluation.
- packages/jsonpath/functions/src/registry.ts
  - `match()`/`search()` implement a partial I-Regexp→ECMAScript mapping (`.` → `[^\n\r]`, `u` flag; `match` anchors); currently returns `undefined` on invalid patterns.
- packages/jsonpath/evaluator/vite.config.ts
  - Library build uses Vite with ESM output, `preserveModules`, and d.ts generation.

### Code Search Results

- `jsonpath-compliance-test-suite|cts.json`
  - packages/jsonpath/evaluator/src/**tests**/compliance.spec.ts
- `RFC 9535: Unknown function|argument is "Nothing"|special result "Nothing"`
  - packages/jsonpath/evaluator/src/evaluator.ts
  - packages/jsonpath/functions/src/registry.ts

### External Research

- #fetch:https://www.rfc-editor.org/rfc/rfc9535.html
  - “Nothing” is distinct from any JSON value (including `null`) and is part of `ValueType`.
  - Comparison semantics: `==` is true iff both sides are empty/Nothing; `<` is false when either side is empty/Nothing.
  - Slice semantics: `step = 0` selects no elements (empty result) and is explicitly not an error.
- #fetch:https://www.rfc-editor.org/rfc/rfc9485.html
  - I-Regexp provides Boolean matching only; Section 5.3 defines a mapping to ECMAScript regexps.
- #fetch:https://www.rfc-editor.org/rfc/rfc6901.html
  - JSON Pointer decoding must apply `~1` → `/` before `~0` → `~`.
- #fetch:https://www.rfc-editor.org/rfc/rfc6902.html
  - JSON Patch operation objects must ignore undefined members; `test` defines JSON-type-specific equality.
- #fetch:https://www.rfc-editor.org/rfc/rfc7386.html
  - RFC 7386 is obsoleted by RFC 7396; Merge Patch pseudocode: object patches merge recursively, `null` deletes, non-object replaces.

### Project Conventions

- Standards referenced: Turborepo monorepo scripts, per-package Vite library builds (ESM + `preserveModules`), Vitest multi-project config.
- Instructions followed: workspace constraints in AGENTS.md (pnpm+turborepo; workspace boundaries); research-only mode constraints.

## Key Discoveries

### Project Structure

- The JSONPath suite is in `packages/jsonpath/*` and is included as a first-class workspace (`pnpm-workspace.yaml`) and test project (`vitest.config.ts`).
- The compliance test suite is not vendored; it is downloaded at install time via `package.json#postinstall` and placed into `node_modules/jsonpath-compliance-test-suite`.
- The evaluator’s CTS runner is implemented as a Vitest spec that conditionally executes based on file existence.

### Implementation Patterns

- **CTS execution model**: `packages/jsonpath/evaluator/src/__tests__/compliance.spec.ts` reads `cts.json` and executes each test by parsing with `@jsonpath/parser` then evaluating with `@jsonpath/evaluator`.
- **“Nothing” representation (current)**: `packages/jsonpath/evaluator/src/evaluator.ts` uses `undefined` as the internal value for RFC 9535 “Nothing” in filter expression evaluation and comparisons.
- **Regex functions** (`match`/`search`): `packages/jsonpath/functions/src/registry.ts` implements the RFC 9485 ECMAScript mapping for dots and anchoring, but currently treats invalid patterns as `undefined` (propagating to “Nothing”), whereas RFC 9535 specifies `LogicalFalse` for non-string or nonconforming patterns.

### Complete Examples

```javascript
// scripts/node/download-compliance-tests.mjs
// Evidence: CTS is cloned into node_modules at postinstall.
const targetDir = join(
	process.cwd(),
	'node_modules',
	'jsonpath-compliance-test-suite',
);
const repoUrl =
	'https://github.com/jsonpath-standard/jsonpath-compliance-test-suite.git';

execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`, { stdio: 'inherit' });
rmSync(join(targetDir, '.git'), { recursive: true, force: true });
```

### API and Schema Documentation

- **RFC 9535 slice**: `step = 0` MUST yield an empty selection (not an error). The remediation plan currently says “throw error” for step=0; that is a plan-vs-RFC mismatch.
- **RFC 9535 “Nothing”**: ValueType includes JSON values or Nothing, and Nothing is distinct from JSON `null`.
- **RFC 9535 match/search**: invalid pattern (not a string conforming to RFC 9485) yields `LogicalFalse`.

### Configuration Examples

```ts
// packages/jsonpath/evaluator/vite.config.ts
build: {
  lib: { entry: 'src/index.ts', formats: ['es'] },
  rollupOptions: { output: { preserveModules: true, preserveModulesRoot: 'src' } },
}
```

### Technical Requirements

- The plan targets RFC 9535/6901/6902/7386 compliance plus CTS alignment. Any remediation tasks that contradict RFC 9535 (notably slice step=0) should be corrected before implementation.
- CTS integration depends on `git` availability at install time (since postinstall performs `git clone`).

## Recommended Approach

Adopt an explicit `Nothing` sentinel exported from `@jsonpath/core`, and migrate all “Nothing” propagation points to use it consistently (instead of `undefined`), **but** update the remediation plan’s slice semantics to match RFC 9535 (step=0 selects nothing).

Rationale:

- RFC 9535 requires “Nothing” to be distinct from JSON values; a dedicated sentinel makes this unambiguous in TypeScript APIs and avoids collisions if consumers pass JS objects that contain `undefined` values.
- A uniform sentinel simplifies cross-package typing (`ValueType`) and reduces accidental `undefined` propagation from other causes.
- The plan currently contains at least one spec mismatch (step=0 error); correcting these early prevents shipping “compliant” behavior that is actually nonconformant.

## Implementation Guidance

- **Objectives**: Align `plans/jsonpath-gap-remediation/plan.md` tasks to RFC 9535 semantics; reconcile plan-vs-code deltas; ensure CTS runner remains deterministic and skip-safe.
- **Key Tasks**:
  - Update remediation plan assumptions:
    - Slice `step = 0` → empty selection, not error (RFC 9535).
  - Standardize “Nothing”:
    - Introduce `Nothing` sentinel export in `@jsonpath/core` and update evaluator/functions/facade to use it.
  - Fix true RFC gaps discovered in current code:
    - `match()`/`search()` should return `LogicalFalse` for invalid/nonconforming patterns instead of propagating “Nothing”.
- **Dependencies**:
  - CTS availability requires `postinstall` to run successfully (`git clone`).
  - Vitest root config already includes `packages/jsonpath/*` projects; keep per-package configs consistent.
- **Success Criteria**:
  - CTS runner passes on a clean install with `cts.json` present.
  - Plan steps do not contradict RFC 9535 normative semantics.
  - “Nothing” behavior is consistent across filter comparisons, function argument conversion, and function evaluation.
