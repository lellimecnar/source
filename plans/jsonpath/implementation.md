# JSONPath Ecosystem (v2)

## Goal

Implement the `@jsonpath/*` plugin-first JSONPath ecosystem described in [specs/jsonpath.md](../../specs/jsonpath.md), using this monorepo’s publishable-package conventions (Vite `dist/` + per-package Vitest + `pnpm verify:exports`).

## Prerequisites

Make sure that the user is currently on the `feat/jsonpath/ecosystem-v2` branch before beginning implementation.
If the branch does not exist, create it from `master`.

### Step-by-Step Instructions

#### Step 1: Scaffold all `@jsonpath/*` workspaces (publishable + internal harness)

- [x] From repo root, scaffold all packages with the repo’s standard Vite/Vitest layout.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-01-scaffold.cjs
```

##### Step 1 Verification Checklist

- [x] `pnpm -w turbo build --filter="@jsonpath/*"` succeeds.
- [x] `pnpm -w turbo test --filter="@jsonpath/*" -- --passWithNoTests` succeeds.
- [x] `pnpm -w verify:exports` prints `Export verification passed.`

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
chore(jsonpath): scaffold @jsonpath/* workspaces

Scaffold publishable and internal JSONPath packages using monorepo Vite/Vitest conventions.

completes: step 1 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: Define shared error model + diagnostics contract (`@jsonpath/core`)

- [x] Create the shared error model + diagnostics contract files.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-02-core-errors.cjs
```

##### Step 2 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 2 STOP & COMMIT

```txt
feat(jsonpath-core): add error + diagnostics contracts

Adds JsonPathError (with machine-readable codes) and a basic diagnostics model used by core and plugins.

completes: step 2 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: Add plugin metadata/types + deterministic ordering + conflict detection (`@jsonpath/core`)

- [x] Add plugin metadata/types + deterministic ordering + conflict detection.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-03-core-plugin-resolver.cjs
```

##### Step 3 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 3 STOP & COMMIT

```txt
feat(jsonpath-core): add plugin registry + resolver primitives

Adds plugin metadata, deterministic ordering, dependency checks, and capability conflict detection.

completes: step 3 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 4: Implement `@jsonpath/ast` (feature-agnostic AST nodes + visitors)

- [x] Create AST node types and visitor helpers.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-04-ast.cjs
```

##### Step 4 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/ast` succeeds.

#### Step 4 STOP & COMMIT

```txt
feat(jsonpath-ast): add feature-agnostic AST node types

Adds minimal immutable AST node shapes and a visitor utility.

completes: step 4 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 5: Implement `@jsonpath/lexer` (feature-agnostic tokenization infrastructure)

- [x] Create basic token/scanner/stream primitives.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-05-lexer.cjs
```

##### Step 5 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/lexer` succeeds.

#### Step 5 STOP & COMMIT

```txt
feat(jsonpath-lexer): add scanner + token stream primitives

Adds a basic rule-driven scanner and token stream used by syntax plugins.

completes: step 5 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 6: Implement `@jsonpath/parser` (feature-agnostic + Pratt utilities)

- [x] Add minimal parser context and Pratt operator registration primitives.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-06-parser.cjs
```

##### Step 6 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/parser` succeeds.

#### Step 6 STOP & COMMIT

```txt
feat(jsonpath-parser): add parser context + pratt registry primitives

Adds framework-only parser context and Pratt operator registry.

completes: step 6 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 7: Implement `@jsonpath/printer` (AST-to-string infrastructure)

- [x] Add printer options + a minimal AST-to-string printer.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-07-printer.cjs
```

##### Step 7 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/printer` succeeds.

#### Step 7 STOP & COMMIT

```txt
feat(jsonpath-printer): add minimal AST printer infrastructure

Adds a framework-only printer API used by path result views and diagnostics.

completes: step 7 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 8: Implement `@jsonpath/core` engine wiring (framework-only pipeline)

- [x] Add `createEngine()` that resolves plugins and exposes compile/parse/evaluate stubs.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-08-core-engine.cjs
```

##### Step 8 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 8 STOP & COMMIT

```txt
feat(jsonpath-core): add framework-only engine wiring

Adds createEngine() with parse/compile/evaluate entry points; semantics are delegated to plugins.

completes: step 8 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 9: RFC 9535 syntax plugin shells (root/current/child-member/wildcard)

- [x] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-syntax-root add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-syntax-current add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-syntax-child-member add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-syntax-wildcard add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
```

- [x] In each package, replace `src/index.ts` with a wiring-only export of `plugin` (metadata only) and add `src/index.spec.ts` verifying `plugin.meta.id` and `plugin.meta.capabilities`.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-09-syntax-shells-1.cjs
```

##### Step 9 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/plugin-syntax-root --filter @jsonpath/plugin-syntax-current --filter @jsonpath/plugin-syntax-child-member --filter @jsonpath/plugin-syntax-wildcard` succeeds.

#### Step 9 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 syntax plugin shells (part 1)

Adds wiring-only plugin exports + tests for root/current/child-member/wildcard.

completes: step 9 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 10: RFC 9535 syntax plugin shells (child-index/slice + union)

- [x] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-syntax-child-index add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-syntax-union add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
```

- [x] Replace `src/index.ts` in each package with a wiring-only `plugin` export + add `src/index.spec.ts`.
- [x] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-10-syntax-shells-2.cjs
```

##### Step 10 Verification Checklist

- [x] `pnpm -w turbo test --filter @jsonpath/plugin-syntax-child-index --filter @jsonpath/plugin-syntax-union` succeeds.

#### Step 10 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 syntax plugin shells (part 2)

Adds wiring-only plugin exports + tests for child-index/slice and union.

completes: step 10 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 11: RFC 9535 syntax plugin shells (descendant + filter container)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-syntax-descendant add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-syntax-filter add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/lexer@workspace:*' '@jsonpath/parser@workspace:*'
```

- [ ] Replace `src/index.ts` in each package with a wiring-only `plugin` export + add `src/index.spec.ts`.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-11-syntax-shells-3.cjs
```

##### Step 11 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-syntax-descendant --filter @jsonpath/plugin-syntax-filter` succeeds.

#### Step 11 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 syntax plugin shells (part 3)

Adds wiring-only plugin exports + tests for descendant and filter container.

completes: step 11 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 12: Filter expression plugin shells (literals/boolean/comparison)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-filter-literals add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-filter-boolean add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-filter-comparison add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/parser@workspace:*'
```

- [ ] Replace `src/index.ts` in each package with wiring-only `plugin` exports + add tests.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-12-filter-shells-1.cjs
```

##### Step 12 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-filter-literals --filter @jsonpath/plugin-filter-boolean --filter @jsonpath/plugin-filter-comparison` succeeds.

#### Step 12 STOP & COMMIT

```txt
feat(jsonpath): add filter plugin shells (part 1)

Adds wiring-only plugin exports + tests for filter literals/boolean/comparison.

completes: step 12 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 13: Filter expression plugin shells (existence/functions/regex)

- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-filter-existence add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/parser@workspace:*'
pnpm --filter @jsonpath/plugin-functions-core add '@jsonpath/core@workspace:*'
pnpm --filter @jsonpath/plugin-filter-functions add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/parser@workspace:*' '@jsonpath/plugin-functions-core@workspace:*'
pnpm --filter @jsonpath/plugin-iregexp add '@jsonpath/core@workspace:*'
pnpm --filter @jsonpath/plugin-filter-regex add '@jsonpath/core@workspace:*' '@jsonpath/ast@workspace:*' '@jsonpath/parser@workspace:*' '@jsonpath/plugin-iregexp@workspace:*'
```

- [ ] Replace `src/index.ts` in each package with wiring-only `plugin` exports + add tests.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-13-filter-shells-2.cjs
```

##### Step 13 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-filter-existence --filter @jsonpath/plugin-functions-core --filter @jsonpath/plugin-filter-functions --filter @jsonpath/plugin-iregexp --filter @jsonpath/plugin-filter-regex` succeeds.

#### Step 13 STOP & COMMIT

```txt
feat(jsonpath): add filter plugin shells (part 2)

Adds wiring-only plugin exports + tests for filter existence/functions/regex and dependencies.

completes: step 13 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 14: Implement minimal FunctionRegistry contract (`@jsonpath/plugin-functions-core`)

- [ ] Create `src/registry.ts` containing a `FunctionRegistry` with `register(name, fn)` and `get(name)`.
- [ ] Ensure `src/index.ts` exports `FunctionRegistry` and a wiring-only `plugin` export.
- [ ] Add `src/index.spec.ts` validating the registry and plugin metadata.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-14-functions-registry.cjs
```

##### Step 14 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-functions-core` succeeds.

#### Step 14 STOP & COMMIT

```txt
feat(jsonpath): add RFC function registry contract

Adds @jsonpath/plugin-functions-core with FunctionRegistry API surface and unit tests.

completes: step 14 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 15: Result view plugin shells + aggregator (`@jsonpath/plugin-result-*`)

- [ ] Add required deps:

```bash
pnpm --filter @jsonpath/plugin-result-value add '@jsonpath/core@workspace:*'
pnpm --filter @jsonpath/plugin-result-node add '@jsonpath/core@workspace:*'
pnpm --filter @jsonpath/plugin-result-path add '@jsonpath/core@workspace:*' '@jsonpath/printer@workspace:*'
pnpm --filter @jsonpath/plugin-result-pointer add '@jsonpath/core@workspace:*' '@jsonpath/pointer@workspace:*'
pnpm --filter @jsonpath/plugin-result-parent add '@jsonpath/core@workspace:*'
pnpm --filter @jsonpath/plugin-result-types add '@jsonpath/core@workspace:*' '@jsonpath/plugin-result-value@workspace:*' '@jsonpath/plugin-result-node@workspace:*' '@jsonpath/plugin-result-path@workspace:*' '@jsonpath/plugin-result-pointer@workspace:*' '@jsonpath/plugin-result-parent@workspace:*'
```

- [ ] For each `@jsonpath/plugin-result-*` package: export wiring-only `plugin` + unit test.
- [ ] In `@jsonpath/plugin-result-types`, export a stable `plugins` array re-exporting the 5 result plugins.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-15-result-shells.cjs
```

##### Step 15 Verification Checklist

- [ ] `pnpm -w turbo test --filter="@jsonpath/plugin-result-*" -- --passWithNoTests` succeeds.

#### Step 15 STOP & COMMIT

```txt
feat(jsonpath): add result view plugin shells

Adds wiring-only result view plugins and an aggregator list.

completes: step 15 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 16: Implement baseline I-Regexp helper (`@jsonpath/plugin-iregexp`)

- [ ] Add `src/iregexp.ts` exporting `matches(pattern: string, value: string): boolean` using `RegExp`.
- [ ] Export `matches` and wiring-only `plugin` from `src/index.ts`.
- [ ] Add unit tests.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-16-iregexp-baseline.cjs
```

##### Step 16 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-iregexp` succeeds.

#### Step 16 STOP & COMMIT

```txt
feat(jsonpath): add i-regexp plugin baseline

Adds @jsonpath/plugin-iregexp baseline matcher helper + plugin metadata.

completes: step 16 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 17: RFC 9535 preset bundle (`@jsonpath/plugin-rfc-9535`)

- [ ] Add deps on all RFC syntax/filter/function/result plugins:

```bash
pnpm --filter @jsonpath/plugin-rfc-9535 add \
	'@jsonpath/core@workspace:*' \
	'@jsonpath/plugin-syntax-root@workspace:*' \
	'@jsonpath/plugin-syntax-current@workspace:*' \
	'@jsonpath/plugin-syntax-child-member@workspace:*' \
	'@jsonpath/plugin-syntax-child-index@workspace:*' \
	'@jsonpath/plugin-syntax-wildcard@workspace:*' \
	'@jsonpath/plugin-syntax-union@workspace:*' \
	'@jsonpath/plugin-syntax-descendant@workspace:*' \
	'@jsonpath/plugin-syntax-filter@workspace:*' \
	'@jsonpath/plugin-filter-literals@workspace:*' \
	'@jsonpath/plugin-filter-boolean@workspace:*' \
	'@jsonpath/plugin-filter-comparison@workspace:*' \
	'@jsonpath/plugin-filter-existence@workspace:*' \
	'@jsonpath/plugin-functions-core@workspace:*' \
	'@jsonpath/plugin-filter-functions@workspace:*' \
	'@jsonpath/plugin-iregexp@workspace:*' \
	'@jsonpath/plugin-filter-regex@workspace:*' \
	'@jsonpath/plugin-result-value@workspace:*' \
	'@jsonpath/plugin-result-node@workspace:*' \
	'@jsonpath/plugin-result-path@workspace:*' \
	'@jsonpath/plugin-result-pointer@workspace:*' \
	'@jsonpath/plugin-result-parent@workspace:*' \
	'@jsonpath/plugin-result-types@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-17-rfc-preset.cjs
```

##### Step 17 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-rfc-9535` succeeds.

#### Step 17 STOP & COMMIT

```txt
feat(jsonpath): add RFC 9535 preset plugin

Adds @jsonpath/plugin-rfc-9535 wiring-only preset and createRfc9535Engine().

completes: step 17 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 18: SES script expressions plugin (`@jsonpath/plugin-script-expressions`) (opt-in)

- [ ] Add dependency on `ses`.
- [ ] Export `createCompartment({ endowments? })` and wiring-only `plugin`.
- [ ] Add unit test validating a compartment can be created.
- [ ] Add required deps:

```bash
pnpm --filter @jsonpath/plugin-script-expressions add '@jsonpath/core@workspace:*' ses
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-18-ses-plugin.cjs
```

##### Step 18 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-script-expressions` succeeds.

#### Step 18 STOP & COMMIT

```txt
feat(jsonpath): add opt-in SES script expressions plugin

Adds @jsonpath/plugin-script-expressions with SES Compartment wiring.

completes: step 18 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 19: JSON Pointer package (`@jsonpath/pointer`) with hardening

- [ ] Implement pointer parse/get/set/remove with forbidden segments `__proto__`, `prototype`, `constructor`.
- [ ] Add unit tests covering forbidden segment rejection.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-19-pointer.cjs
```

##### Step 19 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/core` succeeds.

#### Step 19 STOP & COMMIT

```txt
feat(jsonpath): add JSON Pointer utilities (hardened)

Adds @jsonpath/pointer with get/set/remove and prototype-pollution protections.

completes: step 19 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 20: JSON Patch package (`@jsonpath/patch`)

- [ ] Implement `applyPatch(doc, ops)` supporting `add`, `replace`, and `remove`, delegating to `@jsonpath/pointer`.
- [ ] Add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/patch add '@jsonpath/pointer@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-20-patch.cjs
```

##### Step 20 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/patch` succeeds.

#### Step 20 STOP & COMMIT

```txt
feat(jsonpath): add JSON Patch apply helper

Adds @jsonpath/patch with applyPatch for add/replace/remove operations.

completes: step 20 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 21: Mutation helpers (`@jsonpath/mutate`)

- [ ] Implement pointer-based helpers like `setAll(doc, pointers, value)` and `removeAll(doc, pointers)`.
- [ ] Add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/mutate add '@jsonpath/pointer@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-21-mutate.cjs
```

##### Step 21 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/mutate` succeeds.

#### Step 21 STOP & COMMIT

```txt
feat(jsonpath): add pointer-based mutation helpers

Adds @jsonpath/mutate utilities for applying set/remove operations across multiple pointers.

completes: step 21 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 22: Validation orchestration plugin (`@jsonpath/plugin-validate`)

- [ ] Implement a common `Issue` model and a `ValidatorAdapter` interface.
- [ ] Implement `validateAll(values, adapter)` and add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-validate add '@jsonpath/core@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-22-plugin-validate.cjs
```

##### Step 22 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-validate` succeeds.

#### Step 22 STOP & COMMIT

```txt
feat(jsonpath): add validation orchestration plugin

Adds @jsonpath/plugin-validate with a common Issue model and adapter interface.

completes: step 22 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 23: Validator adapters (`@jsonpath/validator-*`)

- [ ] Implement adapters:
  - `@jsonpath/validator-json-schema` (Ajv)
  - `@jsonpath/validator-zod`
  - `@jsonpath/validator-yup`
- [ ] Each exports `create*Adapter(schema)` returning `{ id, validate(value): Issue[] }`.
- [ ] Add unit tests.
- [ ] Add required deps:

```bash
pnpm --filter @jsonpath/validator-json-schema add '@jsonpath/plugin-validate@workspace:*' ajv
pnpm --filter @jsonpath/validator-zod add '@jsonpath/plugin-validate@workspace:*' zod
pnpm --filter @jsonpath/validator-yup add '@jsonpath/plugin-validate@workspace:*' yup
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-23-validator-adapters.cjs
```

##### Step 23 Verification Checklist

- [ ] `pnpm -w turbo test --filter="@jsonpath/validator-*" -- --passWithNoTests` succeeds.

#### Step 23 STOP & COMMIT

```txt
feat(jsonpath): add validator adapters (ajv/zod/yup)

Adds validator adapter packages mapping schema errors into the @jsonpath/plugin-validate Issue model.

completes: step 23 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 24: Optional non-RFC extension plugin shells

- [ ] Add wiring-only plugin shells + tests:
  - `@jsonpath/plugin-parent-selector`
  - `@jsonpath/plugin-property-name-selector`
  - `@jsonpath/plugin-type-selectors`
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/plugin-parent-selector add '@jsonpath/core@workspace:*'
pnpm --filter @jsonpath/plugin-property-name-selector add '@jsonpath/core@workspace:*'
pnpm --filter @jsonpath/plugin-type-selectors add '@jsonpath/core@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-24-extension-plugin-shells.cjs
```

##### Step 24 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/plugin-parent-selector --filter @jsonpath/plugin-property-name-selector --filter @jsonpath/plugin-type-selectors` succeeds.

#### Step 24 STOP & COMMIT

```txt
feat(jsonpath): add optional extension plugin shells

Adds wiring-only plugin exports for non-RFC extensions used by compat scenarios.

completes: step 24 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 25: Compatibility packages (initial delegation shims)

- [ ] Implement `@jsonpath/compat-jsonpath` delegating to `jsonpath`.
- [ ] Implement `@jsonpath/compat-jsonpath-plus` delegating to `jsonpath-plus`.
- [ ] Add unit tests for both.
- [ ] Add required third-party deps:

```bash
pnpm --filter @jsonpath/compat-jsonpath add jsonpath
pnpm --filter @jsonpath/compat-jsonpath-plus add jsonpath-plus
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-25-compat-shims.cjs
```

##### Step 25 Verification Checklist

- [ ] `pnpm -w turbo test --filter="@jsonpath/compat-*" -- --passWithNoTests` succeeds.

#### Step 25 STOP & COMMIT

```txt
feat(jsonpath): add initial compat shims

Adds @jsonpath/compat-jsonpath and @jsonpath/compat-jsonpath-plus as initial delegation shims.

completes: step 25 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 26: Conformance corpus + compat harness

- [ ] In `@lellimecnar/jsonpath-conformance`, add a minimal corpus export (documents + query list).
- [ ] In `@lellimecnar/jsonpath-compat-harness`, add tests comparing upstream outputs vs compat shims.
- [ ] Add required deps:

```bash
pnpm --filter @lellimecnar/jsonpath-compat-harness add \
	@lellimecnar/jsonpath-conformance@workspace:* \
	'@jsonpath/compat-jsonpath-plus@workspace:*' \
	jsonpath-plus
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-26-conformance-compat-harness.cjs
```

##### Step 26 Verification Checklist

- [ ] `pnpm -w turbo test --filter @lellimecnar/jsonpath-compat-harness` succeeds.

#### Step 26 STOP & COMMIT

```txt
test(jsonpath): add conformance corpus + compat harness

Adds internal conformance corpus and a harness comparing upstream libraries vs compat shims.

completes: step 26 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 27: CLI package (`@jsonpath/cli`) (JSON-only config)

- [ ] Implement JSON-only config schema and loader (no YAML).
- [ ] Wire a runner to `createRfc9535Engine()`.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/cli add '@jsonpath/plugin-rfc-9535@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-27-cli.cjs
```

##### Step 27 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/cli` succeeds.
- [ ] `pnpm -w verify:exports` remains green.

#### Step 27 STOP & COMMIT

```txt
feat(jsonpath): add JSON-only CLI package skeleton

Adds @jsonpath/cli with JSON-only config schema + loader and runner wiring.

completes: step 27 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 28: Convenience bundle (`@jsonpath/complete`)

- [ ] Add `@jsonpath/complete` that re-exports `createRfc9535Engine()` and the preset plugin list.
- [ ] Add unit tests.
- [ ] Add required workspace deps:

```bash
pnpm --filter @jsonpath/complete add '@jsonpath/plugin-rfc-9535@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-28-complete.cjs
```

##### Step 28 Verification Checklist

- [ ] `pnpm -w turbo test --filter @jsonpath/complete` succeeds.

#### Step 28 STOP & COMMIT

```txt
feat(jsonpath): add @jsonpath/complete convenience bundle

Adds @jsonpath/complete to re-export the RFC 9535 preset engine + plugin list.

completes: step 28 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 29: Security regression coverage (internal)

- [ ] Add a minimal regression test ensuring forbidden pointer segments throw.
- [ ] Add required workspace deps:

```bash
pnpm --filter @lellimecnar/jsonpath-conformance add '@jsonpath/pointer@workspace:*'
```

- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-29-security-regression.cjs
```

##### Step 29 Verification Checklist

- [ ] `pnpm -w turbo test --filter @lellimecnar/jsonpath-conformance` succeeds.

#### Step 29 STOP & COMMIT

```txt
test(jsonpath): add security regression tests

Adds internal regression coverage for hardening against prototype pollution.

completes: step 29 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 30: Documentation updates

- [ ] Create `docs/api/jsonpath.md` documenting the new package surfaces and a minimal usage example.
- [ ] Copy and paste code below into `terminal`:

```bash
node scripts/jsonpath/step-30-docs.cjs
```

##### Step 30 Verification Checklist

- [ ] `pnpm -w turbo build --filter="@jsonpath/*"` is green.
- [ ] `pnpm -w turbo test --filter="@jsonpath/*" -- --passWithNoTests` is green.
- [ ] `pnpm -w verify:exports` is green.

#### Step 30 STOP & COMMIT

```txt
docs(jsonpath): add @jsonpath ecosystem API doc

Adds docs/api/jsonpath.md describing the JSONPath packages and how to use the RFC preset.

completes: step 30 of 30 for jsonpath
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
