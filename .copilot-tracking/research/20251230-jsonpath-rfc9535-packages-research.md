<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath RFC 9535 compliance (packages/jsonpath/\*)

## Research Executed

### File Analysis

- [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md)
  - Canonical implementation plan (C05–C37) and profile gating contracts (`rfc9535-draft|core|full`).
- [plans/jsonpath-rfc9535/implementation.md](plans/jsonpath-rfc9535/implementation.md)
  - PR A (C01–C05) detailed steps; matches the current repo state for hooks + conformance harness.

- [packages/jsonpath/core/package.json](packages/jsonpath/core/package.json)
  - Package name `@jsonpath/core`; test script is `vitest run`.
- [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts)
  - Engine pipeline (scan → parse → eval) + plugin hook invocation + per-plugin config passing.
- [packages/jsonpath/core/src/plugins/types.ts](packages/jsonpath/core/src/plugins/types.ts)
  - Core plugin surface: `setup(ctx)` with `ctx.engine.{scanner,parser,evaluators,results,lifecycle}` and `ctx.config`.
- [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts)
  - Deterministic ordering + required dependency validation + capability conflict checks.
- [packages/jsonpath/core/src/runtime/hooks.ts](packages/jsonpath/core/src/runtime/hooks.ts)
  - Runtime registries: selector evaluators keyed by `selector.kind` and result mappers keyed by result type.
- [packages/jsonpath/core/src/errors/codes.ts](packages/jsonpath/core/src/errors/codes.ts)
  - Error code constants: Syntax/Evaluation/Plugin/Config.
- [packages/jsonpath/core/src/errors/types.ts](packages/jsonpath/core/src/errors/types.ts)
  - Error meta and location shape (`offset` + optional `line`/`column`).

- [packages/jsonpath/ast/package.json](packages/jsonpath/ast/package.json)
  - Package name `@jsonpath/ast`.
- [packages/jsonpath/ast/src/index.ts](packages/jsonpath/ast/src/index.ts)
  - Exports `nodes`, `visitor`, `printable`.
- [packages/jsonpath/ast/src/nodes.ts](packages/jsonpath/ast/src/nodes.ts)
  - Minimal AST: `Path` → `Segment[]` → `Selector[]` where selector is open-ended `kind: string & Record<string, unknown>`.

- [packages/jsonpath/lexer/package.json](packages/jsonpath/lexer/package.json)
  - Package name `@jsonpath/lexer`.
- [packages/jsonpath/lexer/src/token.ts](packages/jsonpath/lexer/src/token.ts)
  - `TokenKinds` includes RFC punctuation/operators plus placeholders for Identifier/Number/String.
- [packages/jsonpath/lexer/src/scanner.ts](packages/jsonpath/lexer/src/scanner.ts)
  - `Scanner.register(kind, rule)` + `scanAll()`; skips whitespace; unmatched emits `Unknown` 1-char tokens.
- [packages/jsonpath/lexer/src/rfc9535.ts](packages/jsonpath/lexer/src/rfc9535.ts)
  - `registerRfc9535ScanRules(scanner)` registers RFC punctuation/operator tokens; order matters for multi-char tokens.

- [packages/jsonpath/parser/package.json](packages/jsonpath/parser/package.json)
  - Package name `@jsonpath/parser`.
- [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts)
  - Parser is currently a registry of `SegmentParser` callbacks returning a full `PathNode`; falls back to `path([])`.

- [packages/jsonpath/printer/package.json](packages/jsonpath/printer/package.json)
  - Package name `@jsonpath/printer`.
- [packages/jsonpath/printer/src/printer.ts](packages/jsonpath/printer/src/printer.ts)
  - `printAst` is a stable placeholder returning `'$'`.

- [packages/jsonpath/plugin-rfc-9535/package.json](packages/jsonpath/plugin-rfc-9535/package.json)
  - Package name `@jsonpath/plugin-rfc-9535`.
- [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)
  - Preset wiring: `rfc9535Plugins` array + `createRfc9535Engine({profile})` + preset plugin meta.

- [packages/jsonpath/conformance/package.json](packages/jsonpath/conformance/package.json)
  - Package name `@lellimecnar/jsonpath-conformance` (private) used for harness/corpus tests.
- [packages/jsonpath/conformance/src/corpus.ts](packages/jsonpath/conformance/src/corpus.ts)
  - Corpus schema + small RFC-flavored documents/cases.
- [packages/jsonpath/conformance/src/harness.ts](packages/jsonpath/conformance/src/harness.ts)
  - `runConformanceCase(engine, testCase, {resultType})` bridges harness expectations to engine `resultType`.
- [packages/jsonpath/conformance/src/index.spec.ts](packages/jsonpath/conformance/src/index.spec.ts)
  - Uses `it.fails(...)` for currently-noncompliant RFC cases while keeping CI green.

### Code Search Results

- `registerSelector\(|registerSegmentParser\(|registerRfc9535ScanRules\(|JsonPathErrorCodes`
  - Matches found in:
    - [packages/jsonpath/core/src/runtime/hooks.ts](packages/jsonpath/core/src/runtime/hooks.ts)
    - [packages/jsonpath/core/src/engine.plugins.spec.ts](packages/jsonpath/core/src/engine.plugins.spec.ts)
    - [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts)
    - [packages/jsonpath/lexer/src/rfc9535.ts](packages/jsonpath/lexer/src/rfc9535.ts)
    - [packages/jsonpath/lexer/src/scanner.spec.ts](packages/jsonpath/lexer/src/scanner.spec.ts)
    - [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts)
    - [packages/jsonpath/core/src/errors/codes.ts](packages/jsonpath/core/src/errors/codes.ts)
    - [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts)

### External Research

- #githubRepo:""
  - None executed for this note (repo-local research only).
- #fetch:
  - None executed for this note (repo-local research only).

### Project Conventions

- Standards referenced: pnpm workspace filtering, per-package `vite` builds, per-package `vitest run`, ESM (`type: "module"`) and `exports` pointing at `dist/index.*`.
- Instructions followed: Task Researcher constraints (research-only; edits only in `.copilot-tracking/research/`).

## Key Discoveries

### Project Structure

- Framework packages:
  - `@jsonpath/core`: engine + plugin system + runtime registries + error/diagnostics.
  - `@jsonpath/ast`: minimal AST model.
  - `@jsonpath/lexer`: scanner/token infrastructure + RFC punctuation/operator scan rule helper.
  - `@jsonpath/parser`: parser infrastructure (currently a minimal segment-parser registry).
  - `@jsonpath/printer`: printer infrastructure (currently placeholder).

- RFC preset:
  - `@jsonpath/plugin-rfc-9535`: bundles many `@jsonpath/plugin-*` packages and exposes `createRfc9535Engine({profile})`.

- Harness:
  - `@lellimecnar/jsonpath-conformance`: internal corpus + harness with `it.fails` for currently missing RFC behaviors.

### Implementation Patterns

#### Plugin setup is the intended extension mechanism

Core plugin surface is in [packages/jsonpath/core/src/plugins/types.ts](packages/jsonpath/core/src/plugins/types.ts):

- `plugin.setup(ctx)`
  - `ctx.engine.scanner` (token rules)
  - `ctx.engine.parser` (segment parsers)
  - `ctx.engine.evaluators` (selector/segment evaluators)
  - `ctx.engine.results` (result mappers)

Engine setup invocation and per-plugin config passing are in [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts):

- Plugin config is read via `options?.plugins?.[plugin.meta.id]`.
- Setup runs in deterministic plugin order (via `resolvePlugins`).

#### Deterministic plugin ordering affects parsing/precedence design

Plugin order is not based on the input array order. It is deterministic and enforced by [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts) (ordering is produced by `orderPluginsDeterministically(...)`, then validated for deps and capability conflicts).

Implication for RFC work: parsing/tokenization rules should not depend on “which plugin registered first” unless that ordering is defined by the deterministic sorter or by explicit precedence inside your registries.

#### Selector evaluation is keyed by selector kind (string)

`EvaluatorRegistry` registers evaluators by `kind: string` and retrieves by `selector.kind` in [packages/jsonpath/core/src/runtime/hooks.ts](packages/jsonpath/core/src/runtime/hooks.ts). The engine throws `JSONPATH_EVALUATION_ERROR` if no evaluator is registered for a selector kind.

This matches the `@jsonpath/ast` current design where `SelectorNode` is an open record keyed by `kind` ([packages/jsonpath/ast/src/nodes.ts](packages/jsonpath/ast/src/nodes.ts)).

### Complete Examples

```ts
// Engine hook invocation + per-plugin config passing (source: packages/jsonpath/core/src/createEngine.ts)
for (const plugin of resolved.ordered) {
	const pluginConfig = options?.plugins?.[plugin.meta.id];
	plugin.setup({
		pluginId: plugin.meta.id,
		config: pluginConfig as any,
		engine: { scanner, parser, evaluators, results, lifecycle },
	});
}
```

```ts
// RFC 9535 punctuation/operator scan rules (source: packages/jsonpath/lexer/src/rfc9535.ts)
// IMPORTANT: order matters for multi-character operators.
scanner.register(TokenKinds.DotDot, (input, offset) =>
	input.startsWith('..', offset)
		? { lexeme: '..', offset, kind: TokenKinds.DotDot }
		: null,
);
```

### API and Schema Documentation

#### Errors

- Error codes: [packages/jsonpath/core/src/errors/codes.ts](packages/jsonpath/core/src/errors/codes.ts)
  - `JSONPATH_SYNTAX_ERROR`, `JSONPATH_EVALUATION_ERROR`, `JSONPATH_PLUGIN_ERROR`, `JSONPATH_CONFIG_ERROR`.
- Error meta and location: [packages/jsonpath/core/src/errors/types.ts](packages/jsonpath/core/src/errors/types.ts)
  - Location is point-based: `{ offset, line?, column? }` (no range/span yet).

#### Lexer tokens

- Token kinds are centralized in [packages/jsonpath/lexer/src/token.ts](packages/jsonpath/lexer/src/token.ts).
- `TokenKinds` currently includes:
  - RFC punctuation/operators: `$ @ . .. [ ] , * : ( ) ? ! == != <= >= < >`
  - placeholders for literals: `Identifier`, `Number`, `String` (explicitly “wired later”).

#### Parser surface

- Parser interface is intentionally small today: [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts)
  - `registerSegmentParser(p: (ctx) => PathNode | null)`
  - `parse(ctx)` tries registered parsers and otherwise returns `path([])`.

#### Preset configuration

- `createRfc9535Engine({ profile })` (source: [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)) passes config into `createEngine` via `options.plugins['@jsonpath/plugin-rfc-9535']`.
- The preset plugin config is provided to `setup(ctx)` as `ctx.config` (profile-gating is implemented by plugins that read it).

### Configuration Examples

```ts
// RFC preset config passing (source: packages/jsonpath/plugin-rfc-9535/src/index.ts)
createEngine({
	plugins: rfc9535Plugins,
	options: {
		plugins: {
			'@jsonpath/plugin-rfc-9535': {
				profile: options?.profile ?? 'rfc9535-draft',
			},
		},
	},
});
```

### Technical Requirements

The plan in [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md) defines the RFC compliance work in commits C06–C34. Highlights:

- C06–C14: core selectors/segments parsing + evaluation (PR B)
- C15–C18: filters parsing + evaluation (PR C)
- C19–C25: functions parsing + typing + implementations (PR D)
- C26–C28: location tracking + normalized path results (PR E)
- C29–C34: escapes/unicode, integer validity, traversal ordering, duplicate retention, null semantics, error offsets

## Recommended Approach

Implement RFC 9535 features by leaning into the existing framework contracts:

- Keep `@jsonpath/core` as the stable integration layer:
  - Use its existing hook points and registries.
  - Use `JsonPathError`/`JsonPathErrorCodes` and `JsonPathLocation.offset` as the canonical error surface.

- Keep `@jsonpath/lexer` and `@jsonpath/parser` as feature-agnostic infrastructure:
  - Tokenization: re-use `registerRfc9535ScanRules(scanner)` but wire it via `plugin.setup(ctx)` so profiles can gate features.
  - Parsing: evolve parser infrastructure (as required by C07+) so syntax plugins can register small, testable parsing units rather than implementing a monolithic parser.

- Implement semantics in RFC plugins, keyed by selector kind:
  - Each syntax/filter plugin should register:
    - selector evaluators (via `ctx.engine.evaluators`) keyed by the selector node `kind` it introduces.
    - parser entries (via `ctx.engine.parser.registerSegmentParser(...)`) for the grammar surface it owns.
  - Result plugins should register result mappers via `ctx.engine.results`.

This aligns with how evaluation currently dispatches (`selector.kind` → registry lookup) and avoids coupling RFC semantics into the core engine.

## Implementation Guidance

- **Objectives**:
  - Make `createRfc9535Engine({ profile: 'rfc9535-core' })` a meaningful subset per the profile matrix in [plans/jsonpath-rfc9535/plan.md](plans/jsonpath-rfc9535/plan.md).
  - Ensure unsupported syntax fails fast under `rfc9535-core` (stable `JsonPathError` codes + offsets).
  - Keep PR boundaries aligned to C06–C34 milestones.

- **Key Tasks**:
  - C06 (AST): extend [packages/jsonpath/ast/src/nodes.ts](packages/jsonpath/ast/src/nodes.ts) with RFC-specific segment/selector/filter-expression node shapes while preserving the “selector kind dispatch” model.
  - C07–C10 (Parser): implement root + segment loop + child/shorthand/descendant parsing using the parser’s registry pattern. If parse precedence or modularity becomes difficult with the current single `SegmentParser` list, extend `@jsonpath/parser` with additional registries rather than encoding precedence in plugin order.
  - C11–C14 (Evaluators): implement selector semantics via `EvaluatorRegistry.registerSelector(kind, evaluator)` in the corresponding syntax plugins.
  - C15–C18 (Filters): parse filter expressions with explicit precedence and implement iteration + comparison semantics. Keep empty-nodelist/`Nothing` handling as pure functions with unit tests.
  - C19–C25 (Functions): use `@jsonpath/plugin-functions-core` as the function registry anchor; add parsing + typing validation in the RFC layer.
  - C26–C28 (Paths): use/extend location propagation (core location is point-based today; normalized path needs structured location components). Implement result mappers for `value` and `path` in the result plugins.
  - C29–C34: implement string escape/unicode scalar rules, integer range checks, descendant traversal order constraints, duplicate retention for unions, null semantics, and standardized parse offsets/errors.

- **Dependencies**:
  - Unit tests are Vitest across packages (`test` is `vitest run` in each package.json).
  - Conformance harness already exists in [packages/jsonpath/conformance](packages/jsonpath/conformance) and is designed to keep CI green via `it.fails` until features land.

- **Success Criteria**:
  - `pnpm --filter @lellimecnar/jsonpath-conformance test` stays green while converting targeted `it.fails` cases to passing as C11+ land.
  - `rfc9535-core` profile rejects filters/functions/normalized paths with stable errors until those milestones are implemented.
  - `rfc9535-full` profile becomes the only mode that claims RFC compliance, matching the plan’s profile contracts.

# Task Research Notes: RFC 9535 plan — `packages/jsonpath/*` monorepo research

## Research Executed

### File Analysis

- [package.json](package.json)
  - Root scripts and workspace layout: `workspaces` includes `packages/jsonpath/*`; root scripts use Turborepo (`turbo build`, `turbo test`, `turbo type-check`).

- [turbo.json](turbo.json)
  - `test` is a first-class Turbo task (no build dependency) with `coverage/**` outputs; `test:coverage`/`test:ci` depend on `^build`.

- [vitest.config.ts](vitest.config.ts)
  - Root Vitest uses `test.projects` and includes `packages/jsonpath/*/vitest.config.ts`.

- `packages/jsonpath/*/package.json`
  - Pattern (representative):
    - [packages/jsonpath/core/package.json](packages/jsonpath/core/package.json)
    - [packages/jsonpath/lexer/package.json](packages/jsonpath/lexer/package.json)
    - [packages/jsonpath/parser/package.json](packages/jsonpath/parser/package.json)
    - [packages/jsonpath/plugin-rfc-9535/package.json](packages/jsonpath/plugin-rfc-9535/package.json)
  - All use per-package scripts with `vite build`, `vitest run`, and `tsgo --noEmit`.
  - No Jest configs were found under `packages/jsonpath/*` (search for `jest.config.*` returned none); packages commonly include `@types/jest` in `devDependencies` but tests are Vitest.

- Shared Vitest config
  - [packages/config-vitest/base.ts](packages/config-vitest/base.ts)
    - `globals: true`, `passWithNoTests: true`, v8 coverage output to `coverage/`, and `setupFiles` includes `setup/reflect-metadata.ts`.

### Code Search Results

- `resolvePlugins(|PluginRegistry|JsonPathError|setup\(|scanner.register`
  - Observed in:
    - [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts)
    - [packages/jsonpath/core/src/plugins/registry.ts](packages/jsonpath/core/src/plugins/registry.ts)
    - [packages/jsonpath/core/src/errors/JsonPathError.ts](packages/jsonpath/core/src/errors/JsonPathError.ts)
    - [packages/jsonpath/lexer/src/scanner.ts](packages/jsonpath/lexer/src/scanner.ts)

### External Research

- #githubRepo:""
  - None executed for this note (repo-local research only).
- #fetch:
  - None executed for this note (repo-local research only).

### Project Conventions

- Standards referenced: per-package Vite library builds to `dist/`, per-package Vitest configs aggregated by root `test.projects`, ESM packaging via `type: "module"` and `exports` pointing at `dist/index.*`.
- Instructions followed: Task Researcher constraints (research-only; writes only in `.copilot-tracking/research/`).

## Key Discoveries

### Commands (build/test/type-check) for `packages/jsonpath/*`

- **Run all tests across the monorepo**
  - `pnpm test` (root) → runs `turbo test -- --passWithNoTests`.

- **Run tests for a single jsonpath package (by package name)**
  - Example packages and script evidence:
    - `pnpm --filter @jsonpath/core test` (script is `vitest run` in [packages/jsonpath/core/package.json](packages/jsonpath/core/package.json))
    - `pnpm --filter @jsonpath/plugin-rfc-9535 test` (script is `vitest run` in [packages/jsonpath/plugin-rfc-9535/package.json](packages/jsonpath/plugin-rfc-9535/package.json))

- **Run tests for all jsonpath packages (by workspace path filter)**
  - Supported by pnpm workspace filtering (repo uses `packages/jsonpath/*` in workspaces):
    - `pnpm --filter "./packages/jsonpath/*" test`

- **Coverage**
  - Per package: `pnpm --filter @jsonpath/core test:coverage` (runs `vitest run --coverage`).
  - Turbo pipeline: `pnpm test:coverage` (root) → `turbo test:coverage`.

- **Type-check**
  - Per package: `pnpm --filter @jsonpath/core type-check` (runs `tsgo --noEmit`).
  - Monorepo: `pnpm type-check` (root) → `turbo type-check`.

- **Test conventions (current)**
  - Test runner: Vitest (`vitest run` / `vitest`) via per-package `test` scripts.
  - Test location: co-located `src/**/*.spec.ts` (e.g. [packages/jsonpath/core/src/engine.spec.ts](packages/jsonpath/core/src/engine.spec.ts), [packages/jsonpath/lexer/src/scanner.spec.ts](packages/jsonpath/lexer/src/scanner.spec.ts)).

### Current Architecture (as implemented today)

#### `@jsonpath/ast`

- Key files:
  - [packages/jsonpath/ast/src/nodes.ts](packages/jsonpath/ast/src/nodes.ts)
    - Defines extremely minimal AST: `PathNode { segments }`, `SegmentNode { selectors }`, and `SelectorNode` as an open-ended record.
    - Constructors: `path(segments)` and `segment(selectors)`.
  - [packages/jsonpath/ast/src/visitor.ts](packages/jsonpath/ast/src/visitor.ts)
    - `visitPath` walks segments/selectors; visitor is string-kind keyed (`Path`, `Segment`, `Selector`).

#### `@jsonpath/lexer`

- Key files:
  - [packages/jsonpath/lexer/src/scanner.ts](packages/jsonpath/lexer/src/scanner.ts)
    - `Scanner` has `register(kind, rule)` and `scanAll(input)`.
    - Skips whitespace by default.
    - If no rule matches, emits `{ kind: 'Unknown', lexeme: <1 char>, offset }`.
  - [packages/jsonpath/lexer/src/stream.ts](packages/jsonpath/lexer/src/stream.ts)
    - `TokenStream` supports `peek()` and `next()`.
  - [packages/jsonpath/lexer/src/token.ts](packages/jsonpath/lexer/src/token.ts)
    - `TokenKind` is just `string` (no enum / union of known kinds).

#### `@jsonpath/parser`

- Key files:
  - [packages/jsonpath/parser/src/parser.ts](packages/jsonpath/parser/src/parser.ts)
    - `JsonPathParser` contains a list of `SegmentParser` callbacks.
    - Default behavior is placeholder: tries each `segmentParser`; if none returns a node, returns `path([])`.
  - [packages/jsonpath/parser/src/pratt/types.ts](packages/jsonpath/parser/src/pratt/types.ts)
    - `PrattRegistry` stores `PrattOperator[]` but is not wired to parsing in current placeholder implementation.
  - [packages/jsonpath/parser/src/context.ts](packages/jsonpath/parser/src/context.ts)
    - Parser context is `{ input, tokens: TokenStream }`.

#### `@jsonpath/printer`

- Key files:
  - [packages/jsonpath/printer/src/printer.ts](packages/jsonpath/printer/src/printer.ts)
    - `printAst(ast, options)` is currently a stable placeholder returning `'$'` regardless of AST content.
  - [packages/jsonpath/printer/src/options.ts](packages/jsonpath/printer/src/options.ts)
    - `PrintOptions` is reserved (`mode?: 'compact'|'pretty'`).

#### Conformance fixtures

- Package:
  - [packages/jsonpath/conformance/package.json](packages/jsonpath/conformance/package.json) (`name`: `@lellimecnar/jsonpath-conformance`, private)
  - [packages/jsonpath/conformance/src/corpus.ts](packages/jsonpath/conformance/src/corpus.ts)
    - Currently tiny placeholder corpus: one document and two paths (e.g. `$.a.b`, `$.xs[*]`).

### RFC 9535 “preset” wiring (`@jsonpath/plugin-rfc-9535`)

- Key files:
  - [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)
    - Exports `rfc9535Plugins` array (imports `plugin` objects from many `@jsonpath/plugin-*` packages).
    - Exposes `createRfc9535Engine()` which calls `createEngine({ plugins: rfc9535Plugins })`.
    - Exposes `plugin` metadata for the preset itself (`capabilities: ['preset:rfc9535']`, `dependsOn` all plugin ids).

### Result/Functions/Regex plugins (stubs)

- `@jsonpath/plugin-result-value`, `@jsonpath/plugin-result-path`
  - Export only `plugin: JsonPathPlugin` metadata with `capabilities` like `result:value` and `result:path`.
  - Evidence:
    - [packages/jsonpath/plugin-result-value/src/index.ts](packages/jsonpath/plugin-result-value/src/index.ts)
    - [packages/jsonpath/plugin-result-path/src/index.ts](packages/jsonpath/plugin-result-path/src/index.ts)

- `@jsonpath/plugin-result-types`
  - Bundles result plugins by declaring `dependsOn` and a `result:types` capability.
  - Evidence:
    - [packages/jsonpath/plugin-result-types/src/index.ts](packages/jsonpath/plugin-result-types/src/index.ts)

- `@jsonpath/plugin-functions-core`
  - Exports `FunctionRegistry` + `JsonPathFunction` types, plus a `plugin` metadata object.
  - Evidence:
    - [packages/jsonpath/plugin-functions-core/src/index.ts](packages/jsonpath/plugin-functions-core/src/index.ts)
    - [packages/jsonpath/plugin-functions-core/src/registry.ts](packages/jsonpath/plugin-functions-core/src/registry.ts)

- `@jsonpath/plugin-iregexp`
  - Exports `matches(pattern, value)` helper and `plugin` metadata.
  - `matches` catches invalid regex patterns and returns `false`.
  - Evidence:
    - [packages/jsonpath/plugin-iregexp/src/index.ts](packages/jsonpath/plugin-iregexp/src/index.ts)
    - [packages/jsonpath/plugin-iregexp/src/iregexp.ts](packages/jsonpath/plugin-iregexp/src/iregexp.ts)

### Plugin registration/resolution patterns (today)

- Core plugin types:
  - [packages/jsonpath/core/src/plugins/types.ts](packages/jsonpath/core/src/plugins/types.ts)
    - `JsonPathPluginMeta`: `{ id, capabilities?, dependsOn?, optionalDependsOn?, peerDependencies? }`.
    - `JsonPathPlugin<Config = unknown>` supports `meta` and required `setup(ctx)`.

- Plugin ordering + dedupe:
  - [packages/jsonpath/core/src/plugins/order.ts](packages/jsonpath/core/src/plugins/order.ts)
    - Dedupes by `meta.id`, then sorts by `meta.id` (`localeCompare`).
    - Input order is not preserved in the final order (beyond duplicate elimination).

- Resolution checks:
  - [packages/jsonpath/core/src/plugins/resolve.ts](packages/jsonpath/core/src/plugins/resolve.ts)
    - Ensures every `dependsOn` is present, otherwise throws `JsonPathError` with code `JSONPATH_PLUGIN_ERROR`.
    - Detects capability conflicts: if two plugins claim the same exact capability string, throws `JsonPathError`.
    - Returns `{ ordered, byId }`.

- Plugin registry:
  - [packages/jsonpath/core/src/plugins/registry.ts](packages/jsonpath/core/src/plugins/registry.ts)
    - Simple map storage: `register(plugin)` overwrites by id; `all()` returns values.
    - Does not enforce conflicts/deps (that is `resolvePlugins`).

### Error handling + diagnostics patterns (today)

- Error shape:
  - [packages/jsonpath/core/src/errors/JsonPathError.ts](packages/jsonpath/core/src/errors/JsonPathError.ts)
    - `JsonPathError` extends `Error` with `code`, `expression?`, `location?`, `pluginIds?`, `options?`.
    - Supports a `cause`.
  - [packages/jsonpath/core/src/errors/codes.ts](packages/jsonpath/core/src/errors/codes.ts)
    - Codes: `JSONPATH_SYNTAX_ERROR`, `JSONPATH_EVALUATION_ERROR`, `JSONPATH_PLUGIN_ERROR`, `JSONPATH_CONFIG_ERROR`.
  - [packages/jsonpath/core/src/errors/types.ts](packages/jsonpath/core/src/errors/types.ts)
    - `JsonPathLocation` uses `offset` and optional `line`/`column`.

- Diagnostics collector:
  - [packages/jsonpath/core/src/diagnostics/collect.ts](packages/jsonpath/core/src/diagnostics/collect.ts)
  - [packages/jsonpath/core/src/diagnostics/types.ts](packages/jsonpath/core/src/diagnostics/types.ts)
    - `JsonPathDiagnostic` is parallel to `JsonPathErrorMeta` but includes `level` and singular `pluginId`.

### Engine creation APIs (today)

- `@jsonpath/core`
  - [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts)
    - Public API: `createEngine({ plugins, options? })`.
    - Internals:
      - Calls `resolvePlugins(plugins)`.
      - Creates `new Scanner()` and `new JsonPathParser()`.
      - `parse(expression)` scans tokens (`scanner.scanAll`) and parses (`parser.parse(ctx) ?? path([])`).
      - `evaluateSync` returns `[]` (explicitly framework-only placeholder).
  - [packages/jsonpath/core/src/engine.ts](packages/jsonpath/core/src/engine.ts)
    - `EvaluateOptions.resultType?: 'value'|'node'|'path'|'pointer'|'parent'`.

- RFC preset:
  - [packages/jsonpath/plugin-rfc-9535/src/index.ts](packages/jsonpath/plugin-rfc-9535/src/index.ts)
    - `createRfc9535Engine()` returns `createEngine({ plugins: rfc9535Plugins })`.

- Convenience bundle:
  - [packages/jsonpath/complete/src/index.ts](packages/jsonpath/complete/src/index.ts)
    - Re-exports `createRfc9535Engine` and `rfc9535Plugins` from `@jsonpath/plugin-rfc-9535`.

### TypeScript config + exports patterns

- TypeScript config is consistent across jsonpath packages:
  - Examples:
    - [packages/jsonpath/core/tsconfig.json](packages/jsonpath/core/tsconfig.json)
    - [packages/jsonpath/ast/tsconfig.json](packages/jsonpath/ast/tsconfig.json)
    - [packages/jsonpath/plugin-rfc-9535/tsconfig.json](packages/jsonpath/plugin-rfc-9535/tsconfig.json)
  - Pattern: `extends: "@lellimecnar/typescript-config"`, emits declarations + sourcemaps, `moduleResolution: "Bundler"`, `module: "ESNext"`, `outDir: dist`, `rootDir: src`.

- Packaging/export pattern is consistent:
  - Example: [packages/jsonpath/core/package.json](packages/jsonpath/core/package.json)
    - `type: "module"`, `sideEffects: false`, `exports["."]` points to `./dist/index.js` + `./dist/index.d.ts`.

## Recommended Approach

Current implementation status suggests `@jsonpath/*` is intentionally scaffolded as a plugin-first architecture but is still mostly metadata + placeholders.

For an RFC 9535 plan, treat these as **contract points** to design against:

- `@jsonpath/core` owns:
  - plugin metadata resolution (`resolvePlugins`),
  - common error/diagnostics types,
  - public engine surface (`compile/parse/evaluateSync/evaluateAsync`).

- Plugins currently provide only:
  - `meta.id`, `meta.capabilities`, and sometimes `dependsOn` wiring.

So the plan likely needs to define new plugin hook interfaces (lexer/parser/evaluator hooks) and a config propagation story.

## Implementation Guidance

- **Objectives**: Use the current `@jsonpath/core` surface (engine + error types + plugin metadata resolver) as the compatibility anchor for an RFC 9535-compliant engine.
- **Key Tasks**:
  - Define how plugins actually _extend_ the system (scanner rules, parser segment parsers, evaluator semantics, result types).
  - Decide whether plugin ordering should be deterministic **and** precedence-aware (current `resolvePlugins` sorts by id, ignoring array order).
  - Define config propagation: how `CreateEngineOptions.options` and per-plugin config gets applied.
- **Dependencies**: This repo already standardizes on `vite` + `vitest` + `tsgo` per package; new work should follow those patterns.
- **Success Criteria**:
  - `createRfc9535Engine().compile('$.a')` returns a non-empty AST, and `evaluateSync` returns meaningful results.
  - Scanner no longer produces mostly `Unknown` tokens for RFC 9535 syntax; parser consumes tokens with real segment parsers.
  - Plugin resolution remains deterministic and surfaces meaningful `JsonPathError` codes on conflicts/missing deps.

## Pitfalls / Gaps (important for RFC 9535 planning)

- **Scanner has no default rules**
  - `createEngine` instantiates `Scanner` without registering any scan rules.
  - Effect: almost everything becomes `Unknown` tokens.

- **Scanner rule priority is insertion-order dependent**
  - `Scanner.scanAll` iterates `Map` entries in insertion order; rule registration order will affect which rule wins.

- **Parser is a placeholder**
  - `JsonPathParser.parse` returns `path([])` unless segment parsers are registered.
  - No built-in Pratt parsing integration is wired.

- **Engine evaluation is a placeholder**
  - `evaluateSync` always returns `[]` (explicit in [packages/jsonpath/core/src/createEngine.ts](packages/jsonpath/core/src/createEngine.ts)).

- **Plugin ordering ignores the plugin list order**
  - `orderPluginsDeterministically` always sorts by id.
  - Consequence: the explicit order of `rfc9535Plugins` does not currently influence execution precedence.

- **Config plumbing is not implemented**
  - `JsonPathPlugin.setup` is invoked by `createEngine`.
  - `CreateEngineOptions.options` exists but is unused.
