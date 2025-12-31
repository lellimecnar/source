# JSONPath RFC 9535 Compliance Plan

**Branch:** `jsonpath/rfc9535-compliance`
**Scope:** Planning + test-first implementation plan for full RFC 9535 query compliance via `@jsonpath/plugin-rfc-9535`.

## Goal

Bring the `@jsonpath` plugin ecosystem to **official RFC 9535 compliance** for:

- Parsing (well-formedness + validity checks required by RFC)
- Evaluation semantics (nodelists, segments/selectors, filters)
- Function extensions (`length()`, `count()`, `match()`, `search()`, `value()`)
- Normalized Paths (stable canonical path output)

This plan is intentionally **RFC-only** (no compat behaviors, no CLI, no mutation/patch/pointer semantics unless directly needed for RFC 9535 compliance).

## Delivery Model (Multiple PRs + Configurable Compliance)

Full RFC 9535 compliance is large enough to deliver across **multiple PRs**, while keeping `master` green.
To support that, RFC 9535 behavior must be **configurable** so partial implementations can be shipped without implying full compliance.

### Compliance Profiles (Configurable Option)

RFC 9535 support is exposed via `@jsonpath/plugin-rfc-9535` configuration at engine creation time.

**Proposed config shape (conceptual):**

- `createRfc9535Engine({ profile })`
- `createEngine({ plugins, options: { plugins: { 'plugin-rfc-9535': { profile }}}})`

Where `profile` selects a **capability set** and enforcement behavior:

- `profile: 'rfc9535-full'`
  - Enables all RFC 9535 grammar + semantics + function typing + normalized paths.
  - Requires RFC 9485 I-Regexp conformance for `match()` / `search()`.
- `profile: 'rfc9535-core'`
  - Enables core selectors/segments (root/current, child, wildcard, union, descendant, index/slice) but may omit filters/functions/normalized paths.
  - Unsupported syntax must fail fast with a stable `JsonPathError` code (no silent fallbacks).
- `profile: 'rfc9535-draft'`
  - Internal/dev profile used while implementing; may gate individual features behind flags.

**Rules:**

- The conformance suite must only claim “RFC 9535 compliant” when running `profile: 'rfc9535-full'`.
- Any other profile must be explicitly described as partial, and should provide clear “feature not supported” errors.

### PR Milestones (Suggested)

These milestones define how to split the work across PRs:

- **PR A — Framework hooks + conformance harness:** C01–C05
- **PR B — Parse + eval core selectors (no filters/functions):** C06–C14
- **PR C — Filters:** C15–C18
- **PR D — Functions + typing:** C19–C25
- **PR E — Normalized paths:** C26–C28
- **PR F — RFC 9485 I-Regexp + match/search finalization:** C23–C24 (or merged into PR D if preferred)

Exact PR boundaries can shift, but each PR must end with a meaningful, testable profile state.

## Non-Goals

- Any script expression evaluation (explicitly excluded by RFC goals; exists as `@jsonpath/plugin-script-expressions`)
- Compatibility layers (`@jsonpath/compat-*`) behavior parity
- Mutation (`@jsonpath/mutate`), patch/pointer utilities, validators
- Additional non-RFC JSONPath features (e.g., parent selectors) beyond what RFC 9535 defines

## Current Inventory (What Exists Today)

Status key:

- **Implemented**: usable behavior exists and is tested.
- **Partial**: scaffolding exists; missing core logic.
- **Missing**: feature absent.

### Framework Packages

| Package             | Purpose                                                       |          Status | Notes                                                                   |
| ------------------- | ------------------------------------------------------------- | --------------: | ----------------------------------------------------------------------- |
| `@jsonpath/core`    | Engine composition, plugin resolution, compile/parse/eval API |         Partial | `evaluateSync()` currently returns `[]`; plugin resolver + errors exist |
| `@jsonpath/ast`     | AST types                                                     |         Partial | Only `Path`/`Segment` scaffolding; no RFC-specific nodes                |
| `@jsonpath/lexer`   | Tokenization infra                                            |         Partial | Scanner exists but no RFC token rules wired                             |
| `@jsonpath/parser`  | Parser infra                                                  |         Partial | Segment parser registry exists; returns empty `path([])` placeholder    |
| `@jsonpath/printer` | AST-to-string infra                                           | Missing/Partial | `printAst()` is a stub returning `"$"`                                  |

### RFC Bundle + Direct Dependencies

| Package                           | Purpose                     |  Status | Notes                                                                              |
| --------------------------------- | --------------------------- | ------: | ---------------------------------------------------------------------------------- |
| `@jsonpath/plugin-rfc-9535`       | Bundles RFC 9535 plugin set | Partial | Wiring only                                                                        |
| `@jsonpath/plugin-iregexp`        | RFC 9485 I-Regexp support   | Partial | Currently delegates to JS `RegExp` (not a full RFC 9485 implementation/validation) |
| `@jsonpath/plugin-functions-core` | Function registry           | Partial | Registry exists; RFC functions not implemented                                     |

### Syntax Plugins (RFC 9535)

All of these are currently **metadata-only** (capabilities + deps) and do not yet contribute lexer/parser/evaluator behavior:

- `@jsonpath/plugin-syntax-root`
- `@jsonpath/plugin-syntax-current`
- `@jsonpath/plugin-syntax-child-member`
- `@jsonpath/plugin-syntax-child-index`
- `@jsonpath/plugin-syntax-wildcard`
- `@jsonpath/plugin-syntax-union`
- `@jsonpath/plugin-syntax-descendant`
- `@jsonpath/plugin-syntax-filter`

### Filter Plugins (RFC 9535)

All of these are currently **metadata-only**:

- `@jsonpath/plugin-filter-literals`
- `@jsonpath/plugin-filter-existence`
- `@jsonpath/plugin-filter-comparison`
- `@jsonpath/plugin-filter-boolean`
- `@jsonpath/plugin-filter-regex`
- `@jsonpath/plugin-filter-functions`

### Result Plugins

All of these are currently **metadata-only**:

- `@jsonpath/plugin-result-value`
- `@jsonpath/plugin-result-path`
- `@jsonpath/plugin-result-pointer`
- `@jsonpath/plugin-result-node`
- `@jsonpath/plugin-result-parent`
- `@jsonpath/plugin-result-types`

### Other Packages (Out of RFC Scope)

Present but not required for RFC 9535 compliance:

- `@jsonpath/cli`, `@jsonpath/complete`
- `@jsonpath/compat-harness`, `@jsonpath/compat-jsonpath`, `@jsonpath/compat-jsonpath-plus`
- `@jsonpath/mutate`, `@jsonpath/pointer`, `@jsonpath/patch`
- `@jsonpath/plugin-script-expressions`, `@jsonpath/plugin-validate`
- `@jsonpath/validator-*`
- Additional non-RFC plugins: `@jsonpath/plugin-parent-selector`, `@jsonpath/plugin-property-name-selector`, `@jsonpath/plugin-type-selectors`

## RFC 9535 Gap Map (What’s Missing)

This maps required RFC 9535 behaviors to the current codebase.

### 1) Well-Formedness + Validity Errors (RFC 9535 Section 2.1)

Missing:

- Reject non-well-formed queries at parse time (ABNF)
- Validate integer ranges for index/slice/step are within I-JSON exact integer range
- Enforce function-expression **well-typedness** independent of data

### 2) Root Identifier `$` (RFC 9535 Section 2.2)

Missing:

- Parser + AST representation for root identifier
- Evaluation: root nodelist containing the query argument node

### 3) Segments + Selectors (RFC 9535 Sections 2.3 + 2.5)

Missing:

- Lexer tokenization of: `$`, `@`, `.`, `..`, `[`, `]`, `,`, `*`, `:`, string literals (single/double), integers
- Parser support for:
  - child segments: bracket selection (`[<selectors>]`) and shorthand (`.name`, `.*`)
  - descendant segments: `..[<selectors>]`, shorthand `..name`, `..*`
  - selector list concatenation and ordering rules
- AST nodes for:
  - child segment vs descendant segment
  - selectors: name, wildcard, index, slice, filter

Missing evaluation semantics:

- Apply segments to input nodelist, concatenate results in input order
- Child segment concatenation across selectors in selector-list order
- Descendant traversal order constraints:
  - arrays in array order
  - visit node before descendants
  - object member visitation order unspecified (implementation may choose deterministic order)
- No deduplication of nodes

### 4) Filters (RFC 9535 Section 2.3.5)

Missing:

- Parsing filter expressions:
  - `||`, `&&`, `!`, parentheses
  - existence tests (`filter-query`)
  - comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`) with comparables
  - embedded queries: rel/abs queries, and singular-query restrictions
  - function expressions in filters
- Evaluation semantics:
  - iterate over children of structured values only
  - semantics of existence tests vs comparisons
  - RFC comparison rules, including `Nothing` and empty nodelist behaviors
  - type constraints: `LogicalType` vs JSON boolean literals

### 5) Function Extensions (RFC 9535 Section 2.4)

Missing:

- Parsing function expressions and arguments
- Type system + well-typedness checks
- Implementations of:
  - `length(ValueType) -> ValueType (uint or Nothing)`
  - `count(NodesType) -> ValueType (uint)`
  - `match(ValueType string, ValueType string RFC9485) -> LogicalType`
  - `search(ValueType string, ValueType string RFC9485) -> LogicalType`
  - `value(NodesType) -> ValueType`

### 6) Normalized Paths (RFC 9535 Section 2.7)

Missing:

- Location tracking in evaluation (node location as sequence of member names / array indexes)
- Normalized path serialization (canonical bracket form, single-quoted, stable escaping rules)
- Normalization of negative indexes into non-negative indexes for output

### 7) RFC 9485 I-Regexp (Used by match/search)

Missing:

- RFC 9485 conformance: validate patterns are RFC9485-conforming
- Matching semantics should be RFC9485-compatible (not “whatever JS RegExp does”)

## Minimal Package Set for RFC 9535 Compliance Claim

### Runtime (consumer-facing)

- Framework:
  - `@jsonpath/core`
  - `@jsonpath/ast`
  - `@jsonpath/lexer`
  - `@jsonpath/parser`
  - `@jsonpath/printer` (only if used for normalized-path serialization; otherwise can stay minimal)

- RFC bundle + required plugins:
  - `@jsonpath/plugin-rfc-9535`
  - `@jsonpath/plugin-functions-core`
  - `@jsonpath/plugin-iregexp`

- Syntax plugins:
  - `@jsonpath/plugin-syntax-root`
  - `@jsonpath/plugin-syntax-current`
  - `@jsonpath/plugin-syntax-child-member`
  - `@jsonpath/plugin-syntax-child-index`
  - `@jsonpath/plugin-syntax-wildcard`
  - `@jsonpath/plugin-syntax-union`
  - `@jsonpath/plugin-syntax-descendant`
  - `@jsonpath/plugin-syntax-filter`

- Filter plugins:
  - `@jsonpath/plugin-filter-literals`
  - `@jsonpath/plugin-filter-existence`
  - `@jsonpath/plugin-filter-comparison`
  - `@jsonpath/plugin-filter-boolean`
  - `@jsonpath/plugin-filter-regex`
  - `@jsonpath/plugin-filter-functions`

- Result plugins (minimum needed to demonstrate RFC outputs):
  - `@jsonpath/plugin-result-value` (values)
  - `@jsonpath/plugin-result-path` (Normalized Paths)
  - `@jsonpath/plugin-result-types` (wiring)

### Runtime (partial compliance profiles)

When using a partial compliance profile (e.g., `rfc9535-core`), the minimal runtime set may omit packages that are only required for full compliance:

- `@jsonpath/plugin-result-path` (only required when `Normalized Paths` are enabled)
- `@jsonpath/plugin-functions-core` (only required when RFC functions are enabled)
- `@jsonpath/plugin-iregexp` (only required when `match/search` are enabled)

The conformance harness must run with the correct profile and only assert outputs for enabled capabilities.

### Dev/Test (not required at runtime)

- `@jsonpath/conformance` (expanded corpus + vitest)

## Implementation Strategy (High Level)

1. Make conformance tests authoritative: encode RFC examples + edge cases, with allowances for RFC-permitted ordering differences.
2. Add **core extension points** (lexer/parser/evaluator/result-shaping) without baking in RFC semantics.
3. Implement RFC AST nodes + lexer rules + parser productions via plugins.
4. Implement RFC evaluation semantics via plugins, including location tracking.
5. Implement Normalized Path serialization and verify against RFC examples.
6. Implement function typing + required functions.
7. Implement RFC 9485 validation/matching used by match/search.

## Commit-by-Commit Red/Green/Refactor TDD Plan

Commit numbering is intentional; each commit should be small, testable, and keep the repo green.

### C01 — Conformance harness: stable assertions + RFC examples scaffold

**Red**

- Add richer corpus schema in `packages/jsonpath/conformance`:
  - docs: include RFC examples (bookstore, arrays, nested)
  - cases: each case includes query, input doc ref, expected values, expected normalized paths
  - add support for `expectedPathsOrdered` vs `expectedPathsAnyOrder` (object-order can be unspecified)
- Add failing tests asserting:
  - `$` returns root
  - `$.o['j j']` returns expected path/value

**Config note**

- Introduce `profile` selection in the harness so tests can run against:
  - `rfc9535-draft` for incremental enablement
  - `rfc9535-full` for the eventual compliance claim

**Green**

- Minimal harness implementation (no engine changes yet): tests should currently fail due to evaluator returning `[]`.

**Refactor**

- None.

### C02 — Core: define internal Node + Location model (framework-only)

**Red**

- Add unit tests in `@jsonpath/core` for:
  - `Location` representation (names + indexes)
  - constructing root node from query argument

**Green**

- Implement core-internal `Node` and `Location` types.

**Refactor**

- Ensure no RFC semantics exist here; only data model.

### C03 — Core: evaluation pipeline skeleton (segments over nodelists)

**Red**

- Add core tests that:
  - compiled query evaluation calls into a “selector/segment evaluator” extension point
  - segment outputs are concatenated in input nodelist order

**Green**

- Replace `evaluateSync()` stub with:
  - root nodelist initialization
  - apply segment evaluators sequentially
  - return nodelist to result-shaping layer

**Refactor**

- Keep the evaluator extension point generic (no selector logic).

### C04 — Core: plugin extension points for lexer/parser/evaluator/results

**Red**

- Tests verifying that installing plugins can:
  - register scanner rules
  - register segment parsers
  - register evaluator handlers for segment/selector node kinds
  - register result mappers for `resultType`

**Green**

- Add typed extension interfaces in `@jsonpath/core`:
  - `registerTokens(scanner)`
  - `registerParsers(parser)`
  - `registerEvaluators(evaluatorRegistry)`
  - `registerResults(resultRegistry)`

**Refactor**

- Ensure deterministic ordering uses existing plugin resolver.

**Config note**

- Ensure `@jsonpath/plugin-rfc-9535` can read its config (`profile` and/or feature flags) via the existing per-plugin configuration mechanism.

### C05 — Lexer: RFC token kinds + minimal scanner rules

**Red**

- Unit tests in `@jsonpath/lexer` for tokenization of:
  - punctuation: `$ @ . .. [ ] , * : ( ) ? ! == != <= >= < >`
  - whitespace skipping

**Green**

- Implement default RFC token kinds and scanner rules.

**Refactor**

- Keep lexer infra reusable; don’t hardcode RFC-specific parsing logic.

### C06 — AST: RFC node types (Path, Segment, Selectors, Filter Expr)

**Red**

- `@jsonpath/ast` tests for construction/typing of:
  - `ChildSegment`, `DescendantSegment`
  - `NameSelector`, `IndexSelector`, `SliceSelector`, `WildcardSelector`, `FilterSelector`
  - filter expression nodes: literals, queries, comparisons, logical ops, function expr

**Green**

- Add RFC-specific node shapes in `@jsonpath/ast`.

**Refactor**

- Keep constructors small and immutable.

### C07 — Parser: root identifier + segment list parsing

**Red**

- Parser tests:
  - `$` parses to Path(root, segments=[])
  - `$[]` is rejected as invalid segment (empty selection is invalid; bracketed selection requires selectors)

**Green**

- Implement parsing for root identifier and `segments` loop.

**Refactor**

- Ensure errors are `JsonPathError` with offsets.

### C08 — Parser: child segment bracket notation (`[<selectors>]`)

**Red**

- Parse tests for:
  - `$['a']`
  - `$[0]`
  - `$[*]`
  - `$[0,1]`

**Green**

- Parse bracketed child segment into `ChildSegment(selectors[])`.

**Refactor**

- Consolidate selector parsing entrypoint.

### C09 — Parser: shorthand dot notation (`.name`, `.*`)

**Red**

- Parse tests:
  - `$.store.book` equals `$['store']['book']` in AST
  - `$.*` equals `$[*]`

**Green**

- Implement shorthand translation during parse.

**Refactor**

- Centralize member-name shorthand validation.

### C10 — Parser: descendant segment (`..[<selectors>]`, `..name`, `..*`)

**Red**

- Parse tests:
  - `$..author`
  - `$..[*]`

**Green**

- Implement descendant segment AST.

**Refactor**

- Ensure `..` alone errors.

### C11 — Evaluator: child segment + name selector semantics

**Red**

- Conformance tests:
  - `$.o['j j']` selects member value
  - selecting missing member yields empty

**Green**

- Implement in `plugin-syntax-child-member` evaluator handler:
  - apply name selector to object nodes only
  - no normalization of strings

**Refactor**

- Add small shared helper for object member access.

### C12 — Evaluator: wildcard selector semantics

**Red**

- Conformance tests:
  - `$.a[*]` returns array elements in order
  - `$.o[*]` returns all member values (order not asserted)

**Green**

- Implement wildcard selector.

**Refactor**

- Ensure object member iteration strategy is consistent.

### C13 — Evaluator: index selector semantics (positive + negative)

**Red**

- Conformance tests:
  - `$[1]` on `["a","b"]` -> "b"
  - `$[-2]` -> "a"

**Green**

- Implement index selector; out-of-range selects nothing.

**Refactor**

- Centralize `normalizeIndex(i,len)` helper.

### C14 — Evaluator: slice selector semantics

**Red**

- Conformance tests for RFC slice examples:
  - `$[1:3]`, `$[5:]`, `$[1:5:2]`, `$[5:1:-2]`, `$[::-1]`

**Green**

- Implement slice semantics per RFC 9535.

**Refactor**

- Reuse helper functions; add targeted unit tests.

### C15 — Parser: filter selector skeleton + logical operators

**Red**

- Parse tests:
  - `$[?@.b]` parses filter selector
  - `$[?@>3.5]` parses comparison
  - `$[?(@.b == 'kilo')]` parses parens

**Green**

- Implement filter selector parse + expression precedence (`!` > comparisons > `&&` > `||`).

**Refactor**

- Keep expression parsing encapsulated.

### C16 — Parser: embedded queries in filters + singular-query restrictions

**Red**

- Parse tests:
  - `@.foo` allowed in filter queries
  - singular query disallows wildcards/slices/unions

**Green**

- Implement parsing of `filter-query`, `rel-query`, and `singular-query`.

**Refactor**

- Extract shared parsing for `segments` vs `singular-query-segments`.

### C17 — Evaluator: filter selector iteration semantics (existence tests)

**Red**

- Conformance tests:
  - `$.a[?@.b]` selects elements with existing `.b`
  - `!@.foo` differs from `@.foo == null` per RFC examples

**Green**

- Implement filter iteration:
  - apply only to arrays/objects
  - for each child node, evaluate logical-expr where `@` is current node
  - existence test truthiness: non-empty nodelist => true

**Refactor**

- Ensure current-node scoping is correct for nested filters.

### C18 — Evaluator: comparisons + `Nothing` / empty nodelist rules

**Red**

- Add conformance tests mirroring RFC comparison table:
  - `$.absent1 == $.absent2` true
  - `$.absent == 'g'` false
  - numeric/string comparisons

**Green**

- Implement comparison semantics:
  - empty nodelist / `Nothing` handling
  - only numbers/strings support `<`
  - deep equality rules for arrays/objects without duplicate names

**Refactor**

- Split comparison logic into pure functions with unit tests.

### C19 — Functions: parser support for function expressions

**Red**

- Parse tests for nested function calls and arguments:
  - `length(@.authors)`
  - `count(@.*.author)`
  - `match(@.date, "1974-05-..")`

**Green**

- Implement function-expr parsing per RFC ABNF.

**Refactor**

- Tighten identifier rule: lowercase alpha start, then `[a-z0-9_]*`.

### C20 — Functions: type system + well-typedness validation

**Red**

- Compile/parse-time tests for RFC examples:
  - `length(@)` well-typed
  - `length(@.*)` not well-typed
  - `match(...) == true` not well-typed

**Green**

- Implement declared types and validation rules per RFC 9535.

**Refactor**

- Produce precise error codes/messages for type errors.

### C21 — Functions: implement `length()`

**Red**

- Conformance tests:
  - `length('abc') == 3`
  - `length(@.authors) >= 5` example

**Green**

- Implement `length()` semantics:
  - string length in Unicode scalar values
  - array length, object member count
  - otherwise `Nothing`

**Refactor**

- Add helper for scalar value counting.

### C22 — Functions: implement `count()`

**Red**

- Conformance tests:
  - `count(@)` on a node returns 1
  - `count(@.*.author)` matches expected

**Green**

- Implement `count()` (no dedupe).

**Refactor**

- None.

### C23 — I-Regexp: RFC 9485 validation + matcher API

**Red**

- Unit tests in `plugin-iregexp`:
  - invalid patterns return non-match and/or validation failure as required by callers
  - sample RFC 9535 patterns from examples work

**Green**

- Implement RFC 9485 conformance strategy:
  - parse/validate RFC 9485 grammar
  - execute match/search against input strings

**Refactor**

- Keep API minimal: `compile(pattern)`, `matchesEntire(string)`, `searches(string)`.

### C24 — Functions: implement `match()` and `search()` using I-Regexp

**Red**

- Conformance tests:
  - `match(@.b, "[jk]")` selects only full matches
  - `search(@.b, "[jk]")` selects substring matches

**Green**

- Implement match/search with RFC behavior:
  - non-string arg => LogicalFalse
  - invalid RFC 9485 pattern => LogicalFalse

**Refactor**

- Cache compiled patterns (memoization allowed).

### C25 — Functions: implement `value()`

**Red**

- Conformance tests:
  - `value(@..color) == "red"` behaves per RFC
  - empty/multi-node => `Nothing`

**Green**

- Implement `value()`.

**Refactor**

- None.

### C26 — Location tracking: propagate member names and indexes

**Red**

- Conformance tests for normalized paths:
  - `$.a.b[1:2]` emits `$['a']['b'][1]`
  - `$[-3]` normalizes to non-negative index path

**Green**

- Ensure selectors append location components correctly.

**Refactor**

- Centralize location manipulation.

### C27 — Result types: implement `resultType: 'value'`

**Red**

- Engine tests that `resultType: 'value'` returns JSON values in nodelist order

**Green**

- Implement `plugin-result-value` result mapper.

**Refactor**

- Ensure defaults are documented.

### C28 — Normalized path serialization: implement `resultType: 'path'`

**Red**

- Conformance tests from RFC normalized path examples:
  - `$.a` => `$['a']`
  - `$[1]` => `$[1]`
  - `$["\u0061"]` => `$['a']`

**Green**

- Implement normalized path serialization per RFC 9535.

**Refactor**

- Separate escaping rules into pure utilities.

### C29 — Parser: string literal escape handling + Unicode scalar values

**Red**

- Parser tests for single/double quoted strings:
  - `"\uD83C\uDC41"` surrogate pair handling
  - escaping of quotes and backslashes

**Green**

- Implement string literal unescaping for both quote styles.

**Refactor**

- Shared unescape utility.

### C30 — Validity: integer range checks (I-JSON exact integers)

**Red**

- Compile/parse tests rejecting indexes/steps outside `[ -(2^53)+1, (2^53)-1 ]`

**Green**

- Implement validation in parser for ints.

**Refactor**

- Normalize all int parsing in one place.

### C31 — Descendant traversal: ensure RFC ordering constraints

**Red**

- Conformance tests verifying:
  - arrays visited in array order
  - nodes visited before descendants
  - child segment applied to each visited node

**Green**

- Implement traversal algorithm in descendant evaluator.

**Refactor**

- Add iterative traversal to avoid deep recursion.

### C32 — Union selectors + duplicates retention

**Red**

- Conformance tests:
  - `$[0,0]` duplicates retained
  - `$.o[?@<3, ?@<3]` duplicates and potential object ordering non-assumption

**Green**

- Ensure selector list concatenation retains duplicates.

**Refactor**

- None.

### C33 — Null semantics in queries + filters

**Red**

- Conformance tests based on RFC null examples:
  - `$.a` where a is null returns null
  - `$.a[0]` returns empty
  - `$.b[?@==null]` selects null element

**Green**

- Ensure evaluation treats JSON null as a value, not missing.

**Refactor**

- None.

### C34 — Error reporting: parse offsets + error codes

**Red**

- Tests asserting invalid queries throw `JsonPathError` with:
  - stable code
  - offset (and line/column if implemented)

**Green**

- Standardize error creation across lexer/parser/type-check.

**Refactor**

- Consolidate error utilities.

### C35 — RFC bundle plugin: make `createRfc9535Engine()` truly RFC-complete

**Red**

- Conformance tests run exclusively using `createRfc9535Engine()` across full corpus

**Green**

- Ensure `plugin-rfc-9535` exports the correct plugin set and that plugin deps wire all extension points.

**Refactor**

- Remove any unused plugin deps.

### C36 — Printer: ensure `printAst()` round-trips (optional but valuable)

**Red**

- Tests that parsing + printing yields a stable representation for normalized-path compatible queries

**Green**

- Implement printing for RFC AST nodes (or delegate to normalized path serializer for `path` output).

**Refactor**

- Keep printer separate from result path output.

### C37 — Performance + safety: large inputs and deep descendant traversal

**Red**

- Add stress tests (bounded) for:
  - deeply nested arrays/objects with descendant operator
  - ensure no stack overflow in typical depths

**Green**

- Introduce iterative traversal + guardrails.

**Refactor**

- Profile hot paths; avoid allocations where easy.

### C38 — Documentation: RFC compliance statement + how to validate

**Red**

- None.

**Green**

- Update JSONPath docs to state:
  - compliance scope
  - how to run conformance suite

**Refactor**

- Keep docs minimal.

## Validation

During implementation, keep validation tight and incremental:

- Package tests (targeted): `pnpm --filter @jsonpath/conformance test`
- Core tests: `pnpm --filter @jsonpath/core test`
- Full suite when stable: `pnpm test`

## Notes / Risks

- RFC permits unspecified ordering for object children; conformance tests must avoid asserting object member order unless the input is an array.
- RFC 9485 I-Regexp correctness is the biggest technical risk. If a fully compliant implementation is too costly, a fallback strategy is:
  1. strict RFC9485 validation,
  2. translate the validated subset to ECMAScript `RegExp` with `u` where possible,
  3. maintain a targeted set of RFC-derived tests to detect mismatches.
