<!-- markdownlint-disable-file -->

# Task Research Notes: PR-C (RFC 9535 Filters) — implementation plan context

## Research Executed

### File Analysis

- [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md)
  - Defines PR breakdown and explicitly sets **PR C = C15–C18 (Filters)**.
  - Provides PR-C exit contract: filters must work under `rfc9535-full` and **must fail fast** under `rfc9535-core`.
  - Defines detailed per-commit acceptance criteria for C15–C18 (parse tests + conformance tests).

- [plans/jsonpath-rfc9535/implementation.md](plans/jsonpath-rfc9535/implementation.md)
  - Provides detailed steps for PR A and PR B; PR C is outline-only (“PR C (C15–C18): filter parsing + evaluation enabled only for `rfc9535-full`”).
  - Confirms additional non-assigned commits (C29–C34) exist but are not PR C.

- [specs/jsonpath.md](specs/jsonpath.md)
  - Section 3 (Plugin System): plugins may contribute lexer/parsers/evaluators and specifically “Filter expression evaluators”.
  - Section 4 (Official RFC 9535 Plugin): RFC 9535 plugin bundles “Filter selector as defined by RFC 9535 (non-script)”.
  - Appendix A.2 enumerates RFC filter plugins (literals/comparison/boolean/existence/functions/regex).
  - Appendix B contains an ABNF-style grammar for filter expressions (logical precedence, comparisons, test-expr, singular-query, etc).

- Existing jsonpath filter-related packages (metadata-only today)
  - [packages/jsonpath/plugin-syntax-filter/src/index.ts](packages/jsonpath/plugin-syntax-filter/src/index.ts)
    - Exports only plugin metadata (`syntax:rfc9535:filter`), no hooks.
  - [packages/jsonpath/plugin-filter-literals/src/index.ts](packages/jsonpath/plugin-filter-literals/src/index.ts)
  - [packages/jsonpath/plugin-filter-boolean/src/index.ts](packages/jsonpath/plugin-filter-boolean/src/index.ts)
  - [packages/jsonpath/plugin-filter-comparison/src/index.ts](packages/jsonpath/plugin-filter-comparison/src/index.ts)
  - [packages/jsonpath/plugin-filter-existence/src/index.ts](packages/jsonpath/plugin-filter-existence/src/index.ts)
  - [packages/jsonpath/plugin-filter-functions/src/index.ts](packages/jsonpath/plugin-filter-functions/src/index.ts)
  - [packages/jsonpath/plugin-filter-regex/src/index.ts](packages/jsonpath/plugin-filter-regex/src/index.ts)
    - Each currently exports only plugin metadata (capabilities), no lexer/parser/evaluator hooks.

- Filter gating already exists in the root syntax parser
  - [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts)
    - `parseBracketSelectors` looks for `?` and:
      - throws “Filter selectors are not supported in rfc9535-core” under core
      - otherwise throws “Filter selectors are not implemented yet”

- Lexer RFC scan rules
  - [packages/jsonpath/lexer/src/rfc9535.ts](packages/jsonpath/lexer/src/rfc9535.ts)
    - Registers tokens for `?`, `!`, comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`), parentheses.
    - Does NOT register `&&` or `||`.
  - [packages/jsonpath/lexer/src/token.ts](packages/jsonpath/lexer/src/token.ts)
    - `TokenKinds` includes `Bang`, `Question`, and comparison operators.
    - `TokenKinds` does NOT include logical-and/logical-or tokens.

- RFC preset wiring
  - [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)
    - `createRfc9535Engine({ profile })` passes per-plugin config:
      - `@jsonpath/plugin-rfc-9535: { profile }`
      - `@jsonpath/plugin-syntax-root: { profile }`
    - Includes the filter-related plugins in `rfc9535Plugins` (currently metadata-only), so PR C can “light them up” without adding packages.

- Conformance harness already asserts filter rejection under `rfc9535-core`
  - [packages/jsonpath/conformance/src/corpus.ts](packages/jsonpath/conformance/src/corpus.ts)
    - Includes `rfc: reject filter in core` case: `$.xs[?@ > 1]` with `profile: 'rfc9535-core'`.
  - [packages/jsonpath/conformance/src/index.spec.ts](packages/jsonpath/conformance/src/index.spec.ts)
    - Asserts the thrown error message and `code === 'JSONPATH_SYNTAX_ERROR'`.

- Prior research docs relevant to this task
  - [.copilot-tracking/research/20251229-jsonpath-implementation-research.md](.copilot-tracking/research/20251229-jsonpath-implementation-research.md)
    - Monorepo conventions: Vite library builds; Vitest `test.projects`; Turbo task dependencies.
  - [.copilot-tracking/research/20251230-jsonpath-rfc9535-packages-research.md](.copilot-tracking/research/20251230-jsonpath-rfc9535-packages-research.md)
    - Jsonpath package inventory; core hook surfaces; deterministic plugin ordering.

### Code Search Results

- `PR C|C15|C16|C17|C18`
  - Found in [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md) and [plans/jsonpath-rfc9535/implementation.md](plans/jsonpath-rfc9535/implementation.md)

- `Filter selectors are not supported in rfc9535-core`
  - Found in [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts) and asserted by [packages/jsonpath/conformance/src/index.spec.ts](packages/jsonpath/conformance/src/index.spec.ts)

- `filter:rfc9535:*` and `syntax:rfc9535:filter`
  - Found in each filter plugin package `src/index.ts` files and in [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)

### External Research

- #githubRepo:""
  - None executed for this note.
- #fetch:
  - None executed for this note.

### Project Conventions

- Standards referenced: pnpm + Turborepo monorepo; workspace dependencies using `workspace:*`/`workspace:^`; per-package Vite builds to `dist/`; per-package Vitest configs aggregated by root `vitest.config.ts` via `test.projects` (includes `packages/jsonpath/*/vitest.config.ts`).
- Instructions followed: repo rules in [AGENTS.md](AGENTS.md) and `.github/copilot-instructions.md` (workspace filtering; avoid `cd`-based flows; workspace protocol deps); Task Researcher constraints (research-only; edits only under `.copilot-tracking/research/`).

## Key Discoveries

### Project Structure

- `packages/jsonpath/*` already contains the filter packages needed for PR C:
  - `plugin-syntax-filter`
  - `plugin-filter-{literals,boolean,comparison,existence,functions,regex}`
  - `plugin-rfc-9535` preset already includes them.

- Conformance infrastructure is already in place and includes a **core-profile rejection** test for filter syntax.

### Implementation Patterns

- Profile-gating currently lives in `@jsonpath/plugin-syntax-root` parsing logic (rejects `?` in brackets for `rfc9535-core`, and throws “not implemented yet” otherwise).
- Filter plugins are currently “capabilities-only” metadata, so PR C work is expected to add:
  - lexer rules for missing tokens (`&&`, `||`) and/or a tokenization strategy
  - parser hooks for filter selectors and filter expressions
  - evaluator hooks implementing filter iteration, existence tests, and comparisons

### Complete Examples

```ts
// Filter gating currently implemented in root syntax parser
// Source: packages/jsonpath/plugin-syntax-root/src/parser.ts
const maybeFilter = maybe(ctx, TokenKinds.Question);
if (maybeFilter) {
	if (profile === 'rfc9535-core') {
		syntaxError(
			ctx,
			maybeFilter.offset,
			'Filter selectors are not supported in rfc9535-core',
		);
	}
	syntaxError(
		ctx,
		maybeFilter.offset,
		'Filter selectors are not implemented yet',
	);
}
```

```ts
// RFC scan rules currently include '?', '!' and comparisons, but no '&&' / '||'
// Source: packages/jsonpath/lexer/src/rfc9535.ts
const singles: [string, string][] = [
	['?', TokenKinds.Question],
	['!', TokenKinds.Bang],
	['<', TokenKinds.Lt],
	['>', TokenKinds.Gt],
	// ...
];
```

### API and Schema Documentation

- PR-C plan acceptance criteria is explicitly in [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md):
  - C15: parse filter selector skeleton + precedence (`!` > comparisons > `&&` > `||`)
  - C16: parse embedded queries + singular-query restrictions
  - C17: filter iteration + existence semantics
  - C18: comparisons + `Nothing` / empty nodelist rules

- Filter grammar reference exists in [specs/jsonpath.md](specs/jsonpath.md) Appendix B (ABNF-like snippet) and is consistent with PR C’s parsing requirements.

### Technical Requirements

- PR C must satisfy the plan’s profile contract:
  - Under `rfc9535-full`: filter parse + eval must pass.
  - Under `rfc9535-core`: filter syntax must fail fast with stable `JsonPathError` code and a deterministic offset.

- The lexer/token surface currently lacks `&&`/`||` token kinds in the shared `TokenKinds` set, which is a likely missing prerequisite for C15.

## Recommended Approach

Implement PR C as the planned C15–C18 commits, keeping the existing profile gating behavior:

- Extend tokenization to recognize `&&` and `||` (either by enhancing the shared RFC scan rules in `@jsonpath/lexer`, or by having filter-related plugins register additional scan rules).
- Introduce a filter-selector parse entry that is only reachable under `rfc9535-full`.
- Implement filter evaluation in small, test-first increments matching C17 and C18, and add/convert conformance cases for `rfc9535-full` while keeping `rfc9535-core` rejection cases intact.

## Implementation Guidance

- **Objectives**: Enable RFC 9535 filter selectors (parse + evaluation) under `rfc9535-full`, while ensuring `rfc9535-core` rejects filter syntax with stable errors.
- **Key Tasks**:
  - C15: parse filter selector + expression precedence.
  - C16: parse embedded queries in filters and enforce singular-query restrictions.
  - C17: implement filter iteration/existence tests (current-node scoping).
  - C18: implement comparison semantics including empty-nodelist / `Nothing` rules.
- **Dependencies**: Uses existing packages and conformance harness; no new packages required.
- **Success Criteria**: Conformance cases for `rfc9535-full` filter behavior pass; `rfc9535-core` filter rejection test remains green.
