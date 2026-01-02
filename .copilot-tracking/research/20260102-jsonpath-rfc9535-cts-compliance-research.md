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

- packages/jsonpath/jsonpath/package.json
  - `test` runs `vitest run`.
  - Includes CTS JSON fixture via `napa` postinstall: `jsonpath-standard/jsonpath-compliance-test-suite#main`.
  - Direct workspace deps: `@jsonpath/core`, `@jsonpath/plugin-rfc-9535`.

- packages/config-vitest/base.ts
  - Shared `vitestBaseConfig()` enables `globals: true`, `passWithNoTests: true`, coverage config, `setupFiles`.

- packages/jsonpath/jsonpath/src/index.ts
  - Default export is a lazy singleton `engine` (Proxy) built from `createRfc9535Engine()`.
  - `createEngine(opts?)` always includes `rfc9535Plugins` plus optional extra plugins.

- packages/jsonpath/plugin-rfc-9535/src/index.ts
  - `createRfc9535Engine(options?: Rfc9535EngineOptions)` forwards options into `createEngine({ ...rest, plugins: [...] })`.
  - `Rfc9535EngineOptions` is `Omit<CreateEngineOptions, 'plugins'>` + `additionalPlugins`.
  - No per-plugin config is wired here; notably, there is no mapping from `{ profile, strict }` into `createEngine({ options: { plugins: { ... }}})`.
  - This means `createRfc9535Engine({ profile: 'rfc9535-full' })` (as used by the CTS harness and ecosystem smoke test) does not actually configure the syntax parser profile.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/root.ts
  - Reads `profile` and `strict` from its plugin config (defaults: `profile='rfc9535-draft'`, `strict=false`).
  - Registers the scanner rules and installs `parseRfc9535Path(ctx, profile, strict)`.
  - Without explicit plugin config wiring, the parser stays in draft mode.

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
  - Contains substantial runtime logic for evaluating filter expressions (existence tests, comparisons, and functions `length`, `count`, `match`, `search`, `value`).
  - BUT the plugin `setup()` currently registers a segment evaluator for a non-existent segment kind (`'FilterSegment'`) and calls `evaluators.getExpression(...)`.
  - The core `EvaluatorRegistry` has no expression evaluator API, and the RFC parser builds `Selector:Filter` (not a `FilterSegment`).
  - This indicates the filter runtime wiring is currently incompatible with the AST shape + core evaluator registry.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/child-member.ts
  - Registers selector evaluator for `SelectorKinds.Name`.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/child-index.ts
  - Registers selector evaluators for `SelectorKinds.Index` and `SelectorKinds.Slice`.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/wildcard.ts
  - Registers selector evaluator for `SelectorKinds.Wildcard`.
  - Object wildcard enumerates keys via `Object.keys(v).sort()`.

- packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/descendant.ts
  - Registers segment evaluator for `'DescendantSegment'`.
  - Traversal is breadth-first over “descendants-or-self”; object keys are sorted.

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
  - This prevents the parser from distinguishing “invalid because of whitespace” from valid selectors.

### Code Search Results

- "createRfc9535Engine"
  - packages/jsonpath/plugin-rfc-9535/src/index.ts
  - packages/jsonpath/jsonpath/src/**tests**/compliance/cts.spec.ts
  - packages/jsonpath/jsonpath/src/**tests**/compliance/ecosystem.spec.ts

- "strict" (RFC 9535 engine behavior toggle)
  - packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/root.ts
  - packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/parser.ts

- "Skip whitespace by default"
  - packages/jsonpath/lexer/src/scanner.ts

- "getExpression(" / "registerExpression("
  - Only occurrences are inside `@jsonpath/plugin-rfc-9535` filter segment evaluator; no matching API exists in core.

- "registerFilterScriptEvaluator("
  - packages/jsonpath/plugin-script-expressions/src/index.ts
  - Core provides `EvaluatorRegistry.registerFilterScriptEvaluator`.

### Project Conventions

- Standards referenced: plugin-first engine architecture via `@jsonpath/core` + preset plugins; Vitest tests; CTS uses `jsonpath-compliance-test-suite/cts.json`.
- Instructions followed: repository workspace rules in AGENTS.md and .github/copilot-instructions.md; Task Researcher constraint (write only under `.copilot-tracking/research/`).

## Dependency Map (Workspace)

- `@jsonpath/jsonpath` (packages/jsonpath/jsonpath)
  - Direct deps: `@jsonpath/core`, `@jsonpath/plugin-rfc-9535`
  - Test-only fixture dep via `napa`: `jsonpath-compliance-test-suite/cts.json`
- `@jsonpath/plugin-rfc-9535` (packages/jsonpath/plugin-rfc-9535)
  - Direct deps: `@jsonpath/ast`, `@jsonpath/core`, `@jsonpath/lexer`, `@jsonpath/parser`, `@jsonpath/pointer`
- `@jsonpath/core` (packages/jsonpath/core)
  - Direct deps: `@jsonpath/ast`, `@jsonpath/lexer`, `@jsonpath/parser`
- `@jsonpath/parser` (packages/jsonpath/parser)
  - Direct deps: `@jsonpath/ast`, `@jsonpath/lexer`
- `@jsonpath/lexer` (packages/jsonpath/lexer)
  - No direct deps
- `@jsonpath/ast` (packages/jsonpath/ast)
  - No direct deps

## Key Discoveries

### Project Structure

- CTS harness expects strict compile-time rejection for `invalid_selector` cases and exact output matching for `result` / `results`.
- The current CTS harness passes `{ profile: 'rfc9535-full' }` to `createRfc9535Engine`, but `createRfc9535Engine` does not wire that into the plugin config consumed by the RFC parser. This is a primary likely cause of widespread CTS failures (especially function expressions).

### CTS Harness Behavior (Verified)

- CTS currently only checks “values” mode and uses `engine.evaluateSync(compiled, document)` output directly.
- For `results` (plural), the test expects `out` to be equal to one of the alternative expected results, not that it contains all expected values.

### Implementation Patterns

- Parsing is plugin-based: RFC parser is installed by `@jsonpath/plugin-rfc-9535/syntax-root` and depends on a `profile`/`strict` config.
- Runtime evaluation is registry-based:
  - Segment evaluators are optional.
  - Selector evaluators are the default mechanism (segment -> selectors -> selector evaluators).
- Filter expressions are represented as a selector (`Selector:Filter`) in the AST and must therefore be evaluated via a selector evaluator (not a segment evaluator).

### Whitespace / Tokenization Entry Points

- Tokenization entry point: `Scanner.scanAll(expression)` in packages/jsonpath/lexer/src/scanner.ts.
- RFC scan rule registration: `registerRfc9535ScanRules(scanner)` and `registerRfc9535LiteralScanRules(scanner)` called by the RFC syntax-root plugin.
- Parser entry point: `JsonPathParser.parse({ input, tokens: new TokenStream(tokens) })` in packages/jsonpath/parser/src/parser.ts.
- RFC parser: `parseRfc9535Path(ctx, profile, strict)` in packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/parser.ts.

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

```ts
// Filter runtime wiring currently calls non-existent evaluator APIs
// (packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/filter.ts)
engine.evaluators.registerSegment('FilterSegment', (...) => {
  const evalExpression = evaluators.getExpression(segment.expression.kind);
  ...
});
```

### API and Schema Documentation

- RFC 9535 requires:
  - Errors for queries that are not well-formed or not valid.
  - No runtime errors for syntactically valid segments during evaluation (mismatches yield empty results).
  - Filter selector semantics, including existence tests and well-typedness of function expressions.

### Technical Requirements

To make the CTS pass, the implementation likely must:

1. Ensure the CTS harness actually runs the RFC parser in a deterministic selected profile (the suite uses `{ profile: 'rfc9535-full' }`).
2. Implement correct runtime behavior for `Selector:Filter` (filters) using the selector-evaluator model.
3. Match CTS invalid-selector cases, likely including whitespace-sensitive inputs (scanner currently erases whitespace).

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
  - Step 2 (wire spec mode):
    - packages/jsonpath/plugin-rfc-9535/src/index.ts
      - Symbol: `createRfc9535Engine()` and type `Rfc9535EngineOptions`.
    - packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/root.ts
      - Symbol: `createSyntaxRootPlugin` (consumes `{ profile, strict }`).
    - packages/jsonpath/jsonpath/src/index.ts
      - Symbol: `createEngine()` wrapper and the default-engine singleton.
    - packages/jsonpath/jsonpath/src/**tests**/compliance/cts.spec.ts
      - Symbol usage: `createRfc9535Engine({ profile: 'rfc9535-full' })`.

  - Step 3 (filters as selector evaluators):
    - packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/filter.ts
      - Symbols: `evalFilterExpr`, `evalEmbeddedQuery`, `compareValues`, `evalFunctionCall`.
      - Plugin `setup()` currently registers `FilterSegment` and calls `evaluators.getExpression` (non-existent). This is the primary fix target.
    - packages/jsonpath/ast/src/nodes.ts
      - Symbols: `SelectorKinds.Filter`, `FilterExprKinds.*`.

  - Step 4 (whitespace / invalid selector validation):
    - packages/jsonpath/lexer/src/scanner.ts
      - Symbol: `Scanner.scanAll()` currently strips whitespace unconditionally.
    - packages/jsonpath/core/src/createEngine.ts
      - Location: inner `parse(expression)` function is where the scanner is invoked.
    - packages/jsonpath/core/src/runtime/lifecycle.ts
      - Likely integration point: token transforms / error enrichers (if strict checks are implemented as lifecycle hooks).

  - Step 5 (remaining selector behaviors likely implicated by CTS):
    - Wildcards: packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/wildcard.ts (`createSyntaxWildcardPlugin`)
      - Note: object wildcard sorts keys, which affects ordering.
    - Descendant: packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/descendant.ts (`createSyntaxDescendantPlugin`)
      - Note: descendant traversal is breadth-first and sorts object keys.
    - Slices / indices: packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/child-index.ts
      - Symbols: `computeSliceIndices`, `normalizeIndex`.
    - String decoding: packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/parser.ts
      - Symbol: `decodeQuotedString` is a minimal decoder (only `\\` and escaped quotes).

  - Step 6 (exports / boundaries):
    - packages/jsonpath/jsonpath/package.json (exports/surface)
    - packages/jsonpath/plugin-rfc-9535/package.json (exports map for granular plugin entrypoints)

- **Dependencies**:
  - `@jsonpath/core` lifecycle hooks and evaluator registry.
  - `@jsonpath/plugin-rfc-9535` parser + runtime plugins.
  - RFC 9535 semantics (filter + comparison + function extension rules).

- **Success Criteria**:
  - When `describe.skip` is removed in the CTS harness, all test cases pass.
  - `engine.compile()` throws for all `invalid_selector` CTS cases.
  - `engine.evaluateSync()` matches `result` exactly and matches at least one of `results` for non-deterministic CTS cases.
