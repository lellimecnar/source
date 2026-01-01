<!-- markdownlint-disable-file -->

# Task Research Notes: PR-D (RFC9535 functions + typing, C19–C25) — @jsonpath packages

## Research Executed

### File Analysis

- [package.json](package.json)
  - Confirms monorepo uses pnpm (`packageManager: pnpm@9.12.2`) and Turborepo scripts (`build/test/type-check` via `turbo`).
  - Shows workspace layout includes `packages/jsonpath/*`.
  - Root scripts are the primary way to run workspace tasks (e.g., `test` → `turbo test -- --passWithNoTests`).

- [pnpm-workspace.yaml](pnpm-workspace.yaml)
  - Confirms `packages/jsonpath/*` is a first-class workspace.

- [turbo.json](turbo.json)
  - Defines task graph: `test:coverage` depends on `^build`; `test` does not.
  - Confirms artifacts: `build` outputs `dist/**`; `test` outputs `coverage/**`.

- [tsconfig.json](tsconfig.json)
  - Root TS config extends `@lellimecnar/typescript-config`.

- TypeScript config package
  - [packages/config-typescript/package.json](packages/config-typescript/package.json)
  - [packages/config-typescript/base.json](packages/config-typescript/base.json)
  - Shows TS baseline comes from `@vercel/style-guide/typescript/node20`, with `strict: true` and `noEmit: true` by default.

- Representative jsonpath package TS configs
  - [packages/jsonpath/core/tsconfig.json](packages/jsonpath/core/tsconfig.json)
  - [packages/jsonpath/plugin-rfc-9535/tsconfig.json](packages/jsonpath/plugin-rfc-9535/tsconfig.json)
  - Each extends `@lellimecnar/typescript-config` but overrides to emit declarations and JS into `dist/`.

- Testing framework (jsonpath packages)
  - [packages/jsonpath/core/package.json](packages/jsonpath/core/package.json)
  - [packages/jsonpath/plugin-rfc-9535/package.json](packages/jsonpath/plugin-rfc-9535/package.json)
  - [packages/jsonpath/conformance/package.json](packages/jsonpath/conformance/package.json)
  - Each uses `vitest` (`test: vitest run`, `test:watch: vitest`, `test:coverage: vitest run --coverage`).

### Code Search Results

- `createEngine` / compile / evaluate
  - Found in [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts)
  - `compile`/`parse` surface in [packages/jsonpath/core/src/engine.ts](packages/jsonpath/core/src/engine.ts)

- Plugin meta/capabilities/deps + deterministic ordering
  - Plugin types in [packages/jsonpath/core/src/plugins/types.ts](packages/jsonpath/core/src/plugins/types.ts)
  - Deterministic plugin ordering and conflict detection in [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts)
  - Ordering rule (sorted by `plugin.meta.id`) in [packages/jsonpath/core/src/plugins/order.ts](packages/jsonpath/core/src/plugins/order.ts)

- Lexer + RFC scan rules
  - Scanner infra in [packages/jsonpath/lexer/src/scanner.ts](packages/jsonpath/lexer/src/scanner.ts)
  - Token stream infra in [packages/jsonpath/lexer/src/stream.ts](packages/jsonpath/lexer/src/stream.ts)
  - RFC9535 punctuation/operator rules in [packages/jsonpath/lexer/src/rfc9535.ts](packages/jsonpath/lexer/src/rfc9535.ts)
  - RFC9535 literals rules (Identifier/Number/String) in [packages/jsonpath/lexer/src/rfc9535-literals.ts](packages/jsonpath/lexer/src/rfc9535-literals.ts)

- Parser composition
  - Parser registry in [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts)
  - Root RFC syntax parser in [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts)
  - Root syntax plugin installs scan+parse rules in [packages/jsonpath/plugin-syntax-root/src/index.ts](packages/jsonpath/plugin-syntax-root/src/index.ts)

- Evaluator hook threading
  - Runtime registries in [packages/jsonpath/core/src/runtime/hooks.ts](packages/jsonpath/core/src/runtime/hooks.ts)
  - Segment + selector eval flow in [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts)
  - Example segment evaluator implementation in [packages/jsonpath/plugin-syntax-descendant/src/index.ts](packages/jsonpath/plugin-syntax-descendant/src/index.ts)
  - Filter selector evaluator implementation in [packages/jsonpath/plugin-syntax-filter/src/index.ts](packages/jsonpath/plugin-syntax-filter/src/index.ts)

- RFC9535 profile wiring
  - Preset plugin list + `createRfc9535Engine({profile})` in [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)
  - Profile enforcement (filter rejection in core profile) in [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts)
  - Conformance test asserting core-profile filter rejection in [packages/jsonpath/conformance/src/index.spec.ts](packages/jsonpath/conformance/src/index.spec.ts)

- Function and typing plan references
  - PR-D milestone definition (C19–C25) and profile contract in [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md)
  - Function grammar sketch in [specs/jsonpath.md](specs/jsonpath.md)

- I-Regexp plugin implementation
  - Plugin meta exports in [packages/jsonpath/plugin-iregexp/src/index.ts](packages/jsonpath/plugin-iregexp/src/index.ts)
  - Implementation in [packages/jsonpath/plugin-iregexp/src/iregexp.ts](packages/jsonpath/plugin-iregexp/src/iregexp.ts)
  - Included in RFC preset in [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)
  - Filter-regex described as delegating to iregexp, but is metadata-only in [packages/jsonpath/plugin-filter-regex/README.md](packages/jsonpath/plugin-filter-regex/README.md) and [packages/jsonpath/plugin-filter-regex/src/index.ts](packages/jsonpath/plugin-filter-regex/src/index.ts)

### External Research

- #githubRepo:""
  - None executed (repo-local research only).
- #fetch:
  - None executed (repo-local research only).

### Project Conventions

- Standards referenced: pnpm workspaces, Turborepo task graph, per-package Vite library builds emitting `dist/`, per-package Vitest.
- Instructions followed: repo workspace rules in [AGENTS.md](AGENTS.md) and `.github/copilot-instructions.md` (workspace protocol deps); Task Researcher constraints (research-only; edits only in `.copilot-tracking/research/`).

## Key Discoveries

### Project Structure

- The jsonpath implementation is a **many-package “plugin-first” suite** under `packages/jsonpath/*`.
  - Evidence: folder inventory under `packages/jsonpath/*` (workspace layout) and root workspaces in [package.json](package.json) and [pnpm-workspace.yaml](pnpm-workspace.yaml).

- Jsonpath packages use **Vitest** for unit tests and **Vite** for library builds.
  - Evidence: `scripts.test/test:coverage/test:watch` in [packages/jsonpath/core/package.json](packages/jsonpath/core/package.json), [packages/jsonpath/plugin-rfc-9535/package.json](packages/jsonpath/plugin-rfc-9535/package.json), and [packages/jsonpath/conformance/package.json](packages/jsonpath/conformance/package.json).

### Implementation Patterns

#### Error types and codes

- Errors are thrown as `JsonPathError` with a stable `code` (Syntax/Evaluation/Plugin/Config) and optional metadata (`expression`, `location`, `pluginIds`).
  - Evidence: [packages/jsonpath/core/src/errors/JsonPathError.ts](packages/jsonpath/core/src/errors/JsonPathError.ts), [packages/jsonpath/core/src/errors/codes.ts](packages/jsonpath/core/src/errors/codes.ts), and error usage patterns in [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts) and [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts).

#### Plugin meta + capabilities + deterministic composition

- Plugins declare:
  - `meta.id`
  - `meta.capabilities[]` (string identifiers)
  - optional `meta.dependsOn[]` and `meta.optionalDependsOn[]`
  - and `hooks` for registering tokens/parsers/evaluators/results.
  - Evidence: [packages/jsonpath/core/src/plugins/types.ts](packages/jsonpath/core/src/plugins/types.ts).

- Capability conflicts are detected by **exact string match** (“one plugin owns a capability”).
  - Evidence: conflict detection loop in [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts).

- Plugin execution order is deterministic and currently **sorted by plugin id**.
  - Evidence: [packages/jsonpath/core/src/plugins/order.ts](packages/jsonpath/core/src/plugins/order.ts).
  - Implication for PR-D: any parsing “precedence” based on registration order must account for this sorting rule.

#### Lexer and parser structure (RFC9535)

- Tokenization is a `Scanner` with registered rules (first match wins; whitespace skipped). Unknown characters emit `TokenKinds.Unknown` one-char tokens.
  - Evidence: [packages/jsonpath/lexer/src/scanner.ts](packages/jsonpath/lexer/src/scanner.ts).

- RFC9535 token rules already include parentheses and commas (needed for function syntax) but the RFC root parser currently only uses parentheses for grouping.
  - Evidence: token registrations for `(` `)` `,` in [packages/jsonpath/lexer/src/rfc9535.ts](packages/jsonpath/lexer/src/rfc9535.ts), and filter primary parsing in [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts).

- Parsing is a plugin-installed `SegmentParser` registry; the first registered parser returning a result “wins”.
  - Evidence: [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts).
  - Evidence (root parser installed): [packages/jsonpath/plugin-syntax-root/src/index.ts](packages/jsonpath/plugin-syntax-root/src/index.ts).

#### Evaluator hook threading

- Runtime evaluation is registry-based:
  - selectors evaluated by `selector.kind`
  - segments evaluated by `segment.kind`
  - Evidence: [packages/jsonpath/core/src/runtime/hooks.ts](packages/jsonpath/core/src/runtime/hooks.ts) and segment loop in [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts).

- Filter selector evaluation today only supports built-in filter expr kinds (Literal/Not/And/Or/Compare/EmbeddedQuery) and otherwise yields a sentinel “Nothing”.
  - Evidence: `switch (expr.kind)` default branch in [packages/jsonpath/plugin-syntax-filter/src/index.ts](packages/jsonpath/plugin-syntax-filter/src/index.ts).

### Architecture & Data Flow

#### Core create/compile/evaluate pipeline

- `createEngine` flow is:
  1. `resolvePlugins` (deterministic order, deps, capability conflicts)
  2. Create `Scanner` + `JsonPathParser`
  3. Plugins run `setup(ctx)` to register tokens/parsers/evaluators/results
  4. `parse` = `scanner.scanAll` → `parser.parse`
  5. `compile` wraps `expression` + `ast`
  6. `evaluateSync` walks AST segments and uses either a segment evaluator (if registered) or falls back to per-selector evaluation.
  - Evidence: [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts) and engine interface in [packages/jsonpath/core/src/engine.ts](packages/jsonpath/core/src/engine.ts).

#### How plugins contribute to lexer/parser/evaluator

- Contribution points are exactly:
  - `plugin.setup(ctx)`
    - `ctx.engine.scanner` (token rules)
    - `ctx.engine.parser` (segment parsers)
    - `ctx.engine.evaluators` (selector/segment evaluators)
    - `ctx.engine.results` (result mappers)
  - Evidence: [packages/jsonpath/core/src/plugins/types.ts](packages/jsonpath/core/src/plugins/types.ts) and invocation loop in [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts).

#### Profiles (rfc9535-core/full/draft)

- Profile values used by the RFC preset are `rfc9535-draft | rfc9535-core | rfc9535-full`.
  - Evidence: [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts).

- Profile gating is currently enforced in the root syntax parser for filters (rejects `?` in `rfc9535-core`).
  - Evidence: `parseBracketSelectors` logic in [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts).
  - Evidence of expectation in tests: [packages/jsonpath/conformance/src/index.spec.ts](packages/jsonpath/conformance/src/index.spec.ts).

## PR-D (C19–C25) Specific Context

### Current state: function parsing

- The RFC9535 parser currently does not parse function expressions.
  - Filter primary parsing treats identifiers as only `true`/`false`/`null` and throws on any other identifier.
  - Evidence: `parseFilterPrimary` identifier branch in [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts).

- There is currently no function-call AST node in the shared AST package.
  - The `FilterExprKinds` union does not include any function kind.
  - The selector union is open-ended, implying plugins may add new node kinds as `AstNodeBase<string> & Record<string, unknown>`.
  - Evidence: [packages/jsonpath/ast/src/nodes.ts](packages/jsonpath/ast/src/nodes.ts).

### Current state: function typing validation

- There is no function typing system implemented in core or plugins.
  - `@jsonpath/plugin-functions-core` provides only an untyped runtime `FunctionRegistry` mapping `name -> (...args: unknown[]) => unknown`.
  - Evidence: [packages/jsonpath/plugin-functions-core/src/registry.ts](packages/jsonpath/plugin-functions-core/src/registry.ts).

- `@jsonpath/plugin-filter-functions` exists but is metadata-only and does not currently register parser/evaluator hooks.
  - Evidence: [packages/jsonpath/plugin-filter-functions/src/index.ts](packages/jsonpath/plugin-filter-functions/src/index.ts).

### Current state: RFC function implementations

- No RFC9535 functions (`length`, `count`, `match`, `search`, `value`) are implemented in the function registry yet.
  - Evidence: `FunctionRegistry` is empty-by-default and there are no registrations or function definitions in [packages/jsonpath/plugin-functions-core/src/index.ts](packages/jsonpath/plugin-functions-core/src/index.ts) or [packages/jsonpath/plugin-functions-core/src/registry.ts](packages/jsonpath/plugin-functions-core/src/registry.ts).

### Conformance harness status for PR-D

- The conformance corpus is currently a small “early wiring” suite and contains **no function cases**.
  - Evidence: list of cases in [packages/jsonpath/conformance/src/corpus.ts](packages/jsonpath/conformance/src/corpus.ts).

- Conformance harness structure that PR-D would extend:
  - `documents` and `cases` live in [packages/jsonpath/conformance/src/corpus.ts](packages/jsonpath/conformance/src/corpus.ts)
  - `runConformanceCase` compiles and runs engine evaluation in [packages/jsonpath/conformance/src/harness.ts](packages/jsonpath/conformance/src/harness.ts)
  - Tests are in [packages/jsonpath/conformance/src/index.spec.ts](packages/jsonpath/conformance/src/index.spec.ts)

### Plan/spec intent for PR-D

- PR-D is defined as “Functions + typing: C19–C25”.
  - Evidence: PR milestones and profile matrix in [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md).
  - Evidence: function grammar snippet (ABNF-style) in [specs/jsonpath.md](specs/jsonpath.md) (function-expr, function-arg).

## I-Regexp (RFC 9485) — Current Implementation & Usage

- Current `@jsonpath/plugin-iregexp` implementation is a **best-effort JS RegExp wrapper**:
  - `matches(pattern, value)` returns `new RegExp(pattern).test(value)` and catches errors (returns `false`).
  - Evidence: [packages/jsonpath/plugin-iregexp/src/iregexp.ts](packages/jsonpath/plugin-iregexp/src/iregexp.ts).

- I-Regexp plugin is included in the RFC9535 preset plugin list.
  - Evidence: imports and `rfc9535Plugins` array in [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts).

- I-Regexp is not currently exercised by RFC filter regex support because `@jsonpath/plugin-filter-regex` is metadata-only.
  - Evidence: [packages/jsonpath/plugin-filter-regex/src/index.ts](packages/jsonpath/plugin-filter-regex/src/index.ts) and README in [packages/jsonpath/plugin-filter-regex/README.md](packages/jsonpath/plugin-filter-regex/README.md).

## Recommended Approach

Focus PR-D on enabling function expressions and RFC-required typing in a way that fits the current architecture:

- Use plugin-specific filter-expr node kinds (since `@jsonpath/ast` filter expr union is currently closed), or extend the shared AST in a backwards-compatible way.
  - Evidence of open-ended selector node design: [packages/jsonpath/ast/src/nodes.ts](packages/jsonpath/ast/src/nodes.ts).

- Introduce a parsing extension strategy:
  - Current root parser is monolithic for filter expressions and does not delegate function parsing to plugins.
  - Options implied by the current parser framework:
    1. Add function parsing directly into the root RFC9535 parser.
    2. Add a second segment parser via `setup(ctx)` (i.e. `ctx.engine.parser.registerSegmentParser(...)`) that fully parses RFC9535 paths (including functions) and returns `PathNode` before the root parser runs (registration order is sorted by plugin id).
  - Evidence: parser registry behavior in [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts) and plugin ordering in [packages/jsonpath/core/src/plugins/order.ts](packages/jsonpath/core/src/plugins/order.ts).

- Implement typing validation as a “validity” phase (parse-time) rather than runtime evaluation, matching the RFC plan’s intent.
  - Evidence: PR-D contract description in [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md).

## Implementation Guidance

- **Objectives**: Enable C19–C25 under `rfc9535-full` and reject function syntax under `rfc9535-core` with stable `JsonPathError` (code + offset).
- **Key Tasks**:
  - Parse: introduce function-expr parsing in filters (C19).
  - Typing: define signature model + well-typedness checks (C20).
  - Implement core functions: `length`/`count` (C21–C22), `match`/`search` (C24), `value` (C25).
  - Regex: decide whether PR-D includes RFC9485 correctness or keeps existing JS RegExp wrapper (plan allows PR-F split).
- **Dependencies**:
  - Engine + parser hook surfaces: [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts), [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts).
  - Filter evaluation host: [packages/jsonpath/plugin-syntax-filter/src/index.ts](packages/jsonpath/plugin-syntax-filter/src/index.ts).
  - Existing function registry placeholder: [packages/jsonpath/plugin-functions-core/src/registry.ts](packages/jsonpath/plugin-functions-core/src/registry.ts).
- **Success Criteria**:
  - New conformance corpus cases for function usage pass under `rfc9535-full` and fail fast under `rfc9535-core`.
  - Unit tests cover parsing, typing errors, and evaluation results.

## Files to edit for PR-D (Likely)

- [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts)
- [packages/jsonpath/plugin-syntax-filter/src/index.ts](packages/jsonpath/plugin-syntax-filter/src/index.ts)
- [packages/jsonpath/plugin-filter-functions/src/index.ts](packages/jsonpath/plugin-filter-functions/src/index.ts)
- [packages/jsonpath/plugin-functions-core/src/registry.ts](packages/jsonpath/plugin-functions-core/src/registry.ts)
- [packages/jsonpath/plugin-functions-core/src/index.ts](packages/jsonpath/plugin-functions-core/src/index.ts)
- (If adding AST kinds) [packages/jsonpath/ast/src/nodes.ts](packages/jsonpath/ast/src/nodes.ts)
- (If adding token kinds/scan rules beyond current set) [packages/jsonpath/lexer/src/token.ts](packages/jsonpath/lexer/src/token.ts) and/or [packages/jsonpath/lexer/src/rfc9535.ts](packages/jsonpath/lexer/src/rfc9535.ts)

## Tests to add/update for PR-D (Likely)

- Conformance corpus and tests:
  - [packages/jsonpath/conformance/src/corpus.ts](packages/jsonpath/conformance/src/corpus.ts)
  - [packages/jsonpath/conformance/src/index.spec.ts](packages/jsonpath/conformance/src/index.spec.ts)

- Parsing + engine integration tests:
  - [packages/jsonpath/plugin-syntax-root/src/parser.ts](packages/jsonpath/plugin-syntax-root/src/parser.ts) (existing file; add/update tests near it if present)
  - [packages/jsonpath/core/src/engine.plugins.spec.ts](packages/jsonpath/core/src/engine.plugins.spec.ts)
  - [packages/jsonpath/core/src/engine.spec.ts](packages/jsonpath/core/src/engine.spec.ts)

- Function registry tests:
  - [packages/jsonpath/plugin-functions-core/src/index.spec.ts](packages/jsonpath/plugin-functions-core/src/index.spec.ts)

- Regex / iregexp tests (if PR-D touches them):
  - [packages/jsonpath/plugin-iregexp/src/index.spec.ts](packages/jsonpath/plugin-iregexp/src/index.spec.ts)
