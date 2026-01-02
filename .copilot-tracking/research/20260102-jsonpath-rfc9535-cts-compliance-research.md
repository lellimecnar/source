<!-- markdownlint-disable-file -->

# Task Research Notes: jsonpath RFC 9535 CTS compliance plan

## Research Executed

### File Analysis

- packages/jsonpath/jsonpath/src/**tests**/compliance/cts.spec.ts
  - CTS harness is currently disabled via `describe.skip(...)`.
  - For each CTS case:
    - If `invalid_selector === true`, it expects `engine.compile(selector)` to throw.
    - Else it expects `engine.evaluateSync(compiled, document)` to match either `result` (deterministic) or one of `results` (non-deterministic allowed outputs).
  - Engine is created via `createRfc9535Engine({ profile: 'rfc9535-full' })`.

- packages/jsonpath/plugin-rfc-9535/src/index.ts
  - `createRfc9535Engine(options?: Rfc9535EngineOptions)` forwards options into `createEngine({ ...rest, plugins: [...] })`.
  - `Rfc9535EngineOptions` is `Omit<CreateEngineOptions, 'plugins'>` + `additionalPlugins`.
  - No per-plugin config is wired here; notably, there is no mapping from `{ profile, strict }` into `createEngine({ options: { plugins: { ... }}})`.
  - This means `createRfc9535Engine({ profile: 'rfc9535-full' })` (as used by the CTS harness) does not actually configure the syntax parser profile.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/root.ts
  - Reads `profile` and `strict` from its plugin config (defaults: `profile='rfc9535-draft'`, `strict=false`).
  - Registers the scanner rules and installs `parseRfc9535Path(ctx, profile, strict)`.
  - Without explicit plugin config wiring, the parser stays in draft mode and (importantly) filter function expressions are rejected by the parser.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/parser.ts
  - Implements parsing for segments, selectors, and filter expressions.
  - Filter parsing:
    - Rejects filters under `profile === 'rfc9535-core'`.
    - When `strict=false`, falls back to a script expression AST node if RFC filter parsing fails.
    - Contains some (partial) well-typedness checks (e.g., `match()`/`search()` rejected in comparisons).
    - Parses filter selectors into `Selector:Filter` nodes (`filterSelector(expr)`), not into a dedicated segment kind.

- packages/jsonpath/ast/src/nodes.ts
  - Defines filter AST node kinds under `FilterExprKinds`.
  - Represents filters as a selector kind `Selector:Filter` containing `expr: FilterExprNode`.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/filter.ts
  - Contains substantial runtime logic for evaluating filter expressions (existence tests, comparisons, and the RFC-defined functions `length`, `count`, `match`, `search`, `value`).
  - However, its plugin `setup()` currently registers a segment evaluator for a segment kind (`'FilterSegment'`) and calls `evaluators.getExpression(...)`.
  - The core `EvaluatorRegistry` has no expression evaluator API, and the RFC parser builds `Selector:Filter` (not a `FilterSegment`).
  - This indicates the filter runtime wiring is currently incompatible with the actual AST + core evaluator registry.

- packages/jsonpath/core/src/createEngine.ts
  - Compile path: `scanner.scanAll(expression)` -> token transforms -> parser parse -> AST transforms.
  - Evaluation path:
    - Per segment: uses a registered segment evaluator if present.
    - Otherwise expects `seg.selectors` and evaluates each selector via a registered selector evaluator.
  - Missing selector evaluators throw evaluation errors.

- packages/jsonpath/core/src/runtime/hooks.ts
  - `EvaluatorRegistry` supports selector and segment evaluators (sync/async) and an optional `filterScriptEvaluator`.
  - There is no expression evaluator registry.

- packages/jsonpath/lexer/src/scanner.ts
  - Scanner skips all whitespace characters globally:
    - `if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { offset += 1; continue; }`
  - This likely conflicts with CTS test cases that treat leading/trailing whitespace as invalid selectors.

### Code Search Results

- "createRfc9535Engine"
  - packages/jsonpath/plugin-rfc-9535/src/index.ts
  - packages/jsonpath/jsonpath/src/**tests**/compliance/cts.spec.ts

- "strict" (RFC 9535 engine behavior toggle)
  - packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/root.ts
  - packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/parser.ts

- "Skip whitespace by default"
  - packages/jsonpath/lexer/src/scanner.ts

### External Research

- #fetch:https://www.rfc-editor.org/rfc/rfc9535
  - Grammar explicitly includes optional blank space `S` between segments and around many tokens (e.g., `segments = *(S segment)`), but the CTS requires certain strict invalid-selector behaviors.
  - RFC semantics explicitly allow non-deterministic ordering where JSON objects are involved.
  - RFC filter semantics include:
    - Existence tests: a query in logical context yields true iff it selects at least one node.
    - Comparisons: `==` has special handling for empty/nothing and requires deep equality for arrays/objects; `<` only applies to numbers/strings.
    - Function extensions and well-typedness requirements.

### Project Conventions

- Standards referenced: plugin-first engine architecture via `@jsonpath/core` + preset plugins; Vitest tests; CTS uses `jsonpath-compliance-test-suite/cts.json`.
- Instructions followed: repository workspace rules in AGENTS.md and .github/copilot-instructions.md; Task Researcher constraint (write only under `.copilot-tracking/research/`).

## Key Discoveries

### Project Structure

- CTS harness expects strict compile-time rejection for `invalid_selector` cases and exact output matching for `result` / `results`.
- The current CTS harness passes `{ profile: 'rfc9535-full' }` to `createRfc9535Engine`, but `createRfc9535Engine` does not wire that into the plugin config consumed by the RFC parser. This is a primary likely cause of widespread CTS failures (especially function expressions).

### Implementation Patterns

- Parsing is plugin-based: RFC parser is installed by `@jsonpath/plugin-rfc-9535/syntax-root` and depends on a `profile`/`strict` config.
- Runtime evaluation is registry-based:
  - Segment evaluators are optional.
  - Selector evaluators are the default mechanism (segment -> selectors -> selector evaluators).
- Filter expressions are represented as a selector (`Selector:Filter`) in the AST and must therefore be evaluated via a selector evaluator (not a segment evaluator).

### Complete Examples

```ts
// CTS harness behavior (packages/jsonpath/jsonpath/src/__tests__/compliance/cts.spec.ts)
if (tc.invalid_selector === true) {
	expect(() => engine.compile(tc.selector)).toThrow();
	return;
}

const compiled = engine.compile(tc.selector);
const out = engine.evaluateSync(compiled, tc.document);

if (Array.isArray(tc.results)) {
	expect(tc.results).toContainEqual(out);
	return;
}

expect(out).toEqual(tc.result);
```

```ts
// Engine factory does not currently wire per-plugin config
// (packages/jsonpath/plugin-rfc-9535/src/index.ts)
export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	const { additionalPlugins = [], ...rest } = options ?? {};
	return createEngine({
		...rest,
		plugins: [...rfc9535Plugins, ...additionalPlugins],
	});
}
```

```ts
// Scanner skips whitespace globally (packages/jsonpath/lexer/src/scanner.ts)
if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
	offset += 1;
	continue;
}
```

### API and Schema Documentation

- RFC 9535 requires:
  - Errors for queries that are not well-formed or not valid.
  - No runtime errors for syntactically valid segments during evaluation (mismatches yield empty results).
  - Filter selector semantics, including existence tests and well-typedness of function expressions.

### Technical Requirements

To make the CTS pass, the implementation likely must:

1. Ensure the CTS harness actually runs the RFC parser in `rfc9535-full` profile and strict mode.
2. Implement correct runtime behavior for filter selectors (including comparisons and built-in functions) consistent with RFC 9535.
3. Match CTS invalid-selector cases such as leading/trailing whitespace and not-well-typed filter expressions.

## Recommended Approach

### Chosen approach: Fix RFC9535 preset configuration + implement filter as a selector evaluator

Two viable architectural directions exist for filters:

1. Add an expression-evaluator registry to core and introduce a new `FilterSegment` AST kind.
   - Pros: clean separation of “expression evaluation” vs “selector evaluation”.
   - Cons: conflicts with the current AST shape (`Selector:Filter`) and the current RFC parser output; larger invasive change.

2. Keep the current AST (`Selector:Filter`) and implement filter semantics as a `SelectorKinds.Filter` evaluator.
   - Pros: aligns with existing `@jsonpath/ast` and `@jsonpath/core` evaluation model; minimal surface area; likely fastest route to CTS green.
   - Cons: requires careful implementation of RFC comparison semantics and well-typedness enforcement.

Based on observed code (AST + parser produce `Selector:Filter`, core expects selector evaluators), approach (2) is the best fit.

## Implementation Guidance

- **Objectives**:
  - Make `packages/jsonpath/jsonpath/src/__tests__/compliance/cts.spec.ts` pass when `describe.skip` is removed.
  - Keep changes consistent with plugin-first architecture.

- **Key Tasks**:
  - Wire `profile`/`strict` through `createRfc9535Engine` into `createEngine({ options: { plugins: { ... }}})` for the `@jsonpath/plugin-rfc-9535/syntax-root` plugin.
    - Ensure the CTS harness’s `{ profile: 'rfc9535-full' }` actually takes effect (or update the CTS harness to pass correct per-plugin config).
    - Consider defaulting `strict: true` for RFC compliance.
  - Add strict invalid-selector validation for leading/trailing whitespace.
    - Current scanner strips whitespace, so this must be done before scanning (e.g., a pre-parse check) or via a lifecycle hook.
  - Replace the current filter runtime wiring in `@jsonpath/plugin-rfc-9535/syntax-filter`:
    - Register `engine.evaluators.registerSelector(SelectorKinds.Filter, ...)`.
    - Implement the RFC filter selector semantics: iterate children of arrays/objects, evaluate logical expression with `@` bound to the child node, and select those children.
    - Ensure `Nothing` behaves as RFC specifies (particularly in comparisons).
  - Make filter expression parsing and validity checks match RFC:
    - Reject bare literals as `basic-expr` (RFC basic-expr does not include literals).
    - Enforce well-typedness for function expressions depending on context (test-expr vs comparable).
  - Implement RFC comparison semantics:
    - `==` deep equality for arrays/objects.
    - `<` only for numbers/strings; mismatched types yield false.
    - Derive `!=`, `<=`, `>`, `>=` correctly from `==` and `<`.

- **Dependencies**:
  - `@jsonpath/core` lifecycle hooks (for whitespace validation) and evaluator registry.
  - `@jsonpath/plugin-rfc-9535` parser + runtime plugins.
  - RFC 9535 semantics (filter + comparison + function extension rules).

- **Success Criteria**:
  - When `describe.skip` is removed in the CTS harness, all test cases pass.
  - `engine.compile()` throws for all `invalid_selector` CTS cases.
  - `engine.evaluateSync()` matches `result` exactly and matches at least one of `results` for non-deterministic CTS cases.
