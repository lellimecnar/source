<!-- markdownlint-disable-file -->

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

- `resolvePlugins(|PluginRegistry|JsonPathError|configure?:|scanner.register`
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
    - `JsonPathPlugin<Config = unknown>` currently supports only `meta` and optional `configure(config)`.

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
  - `JsonPathPlugin.configure` exists but is not invoked by `createEngine`.
  - `CreateEngineOptions.options` exists but is unused.
