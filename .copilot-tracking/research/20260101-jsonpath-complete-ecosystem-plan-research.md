<!-- markdownlint-disable-file -->

# Task Research Notes: JSONPath Complete Ecosystem Plan (plans/jsonpath-complete-ecosystem/plan.md)

## Research Executed

### File Analysis

- plans/jsonpath-complete-ecosystem/plan.md
  - Plan scope and step breakdown for “complete ecosystem”: engine hardening, printer, result plugins, RFC 9535 syntax/filter/function coverage, SES script expressions, I-Regexp, pointer/patch/mutate.

- package.json
  - Monorepo toolchain and scripts (turbo build/test/type-check, verify-dist-exports), engines (Node ^24.12.0), package manager (pnpm 9.12.2).

- turbo.json
  - Pipeline dependencies and caching outputs; key constraint: `build` produces `dist/**` and is depended on by `test:coverage`.

- vitest.config.ts
  - Root Vitest aggregates per-package projects; jsonpath packages each provide their own `vitest.config.ts`.

- packages/jsonpath/core/src/createEngine.ts
  - Engine pipeline (scan → parse → eval), plugin hook orchestration, per-plugin configuration `options.plugins[plugin.meta.id]`, default result behavior (value/node) when no result plugin exists.

- packages/jsonpath/core/src/plugins/types.ts
  - Plugin contract: `setup(ctx)` receives `{ pluginId, config, engine: { scanner, parser, evaluators, results, lifecycle } }`.

- packages/jsonpath/core/src/plugins/resolve.ts
  - Deterministic plugin ordering and validation: dependency existence, capability conflicts, and error reporting via `JsonPathErrorCodes.Plugin`.

- packages/jsonpath/core/src/errors/JsonPathError.ts
  - Stable error surface: name `JsonPathError`, fields include `code`, `expression`, `location`.

- packages/jsonpath/core/src/errors/codes.ts
  - Stable machine-readable codes: `JSONPATH_SYNTAX_ERROR`, `JSONPATH_EVALUATION_ERROR`, `JSONPATH_PLUGIN_ERROR`, `JSONPATH_CONFIG_ERROR`.

- packages/jsonpath/plugin-rfc-9535/src/index.ts
  - Preset composition; creates a fresh syntax-root plugin instance per engine (avoids module-level shared mutable state).

- packages/jsonpath/plugin-syntax-root/src/index.ts
  - Canonical example of per-engine plugin state via `setup(ctx)` using `ctx.config`, and registering RFC9535 scan rules + parser integration.

- packages/jsonpath/plugin-syntax-root/src/parser.ts
  - Concrete RFC9535 parser implementation patterns: `syntaxError()` throws `JsonPathError` with offset; filter parsing supports `&&`, `||`, `!`, comparisons; includes well-typedness checks for functions used in comparisons.

- packages/jsonpath/cli/src/run.ts
  - CLI reads JSON config, creates RFC9535 engine, evaluates expression with requested `resultType`.

- packages/jsonpath/complete/src/index.ts
  - “Complete” convenience package re-exports `createRfc9535Engine` and `rfc9535Plugins`.

- packages/jsonpath/pointer/src/forbidden.ts
  - Security hardening: forbids pointer segments `__proto__`, `prototype`, `constructor`.

- packages/jsonpath/pointer/src/parse.ts
  - RFC 6901 decoding (~1, ~0); validates pointer leading `/` and forbids dangerous segments.

- packages/jsonpath/pointer/src/mutate.ts
  - Structural sharing approach: shallow-clones containers along the path when setting/removing; rejects root mutation.

- packages/jsonpath/patch/src/apply.ts
  - Minimal JSON Patch support: `add`, `replace`, `remove`; implemented by delegating to pointer set/remove.

- packages/jsonpath/mutate/src/mutate.ts
  - Batch mutation helpers: `setAll` and `removeAll` iterate pointer ops.

### Code Search Results

- createRfc9535Engine
  - Matches found in:
    - packages/jsonpath/plugin-rfc-9535/src/index.ts
    - packages/jsonpath/cli/src/run.ts
    - packages/jsonpath/complete/src/index.ts
    - packages/jsonpath/conformance/src/index.spec.ts

- preserveModulesRoot
  - Matches found in many jsonpath `vite.config.ts` files (pattern repeated across packages), e.g.:
    - packages/jsonpath/pointer/vite.config.ts
    - packages/jsonpath/patch/vite.config.ts
    - packages/jsonpath/mutate/vite.config.ts
    - packages/jsonpath/plugin-rfc-9535/vite.config.ts

- ForbiddenPointerSegments|assertNotForbiddenSegment
  - Matches found in:
    - packages/jsonpath/pointer/src/forbidden.ts
    - packages/jsonpath/pointer/src/parse.ts

- JsonPathErrorCodes
  - Matches found in:
    - packages/jsonpath/core/src/errors/codes.ts
    - packages/jsonpath/core/src/createEngine.ts
    - packages/jsonpath/core/src/plugins/resolve.ts
    - packages/jsonpath/plugin-syntax-root/src/parser.ts

### External Research

- #fetch:https://vitest.dev/config/projects.html#projects
  - Confirms `test.projects` is an array of project configurations used to run multiple Vitest projects from a root config.

- #fetch:https://vite.dev/guide/build.html#library-mode
  - Library mode expects dependencies to be externalized when appropriate; documents ESM + CJS/UMD outputs and `type: module` extension behavior.

- #fetch:https://rollupjs.org/configuration-options/#output-preservemodules
  - `output.preserveModules` emits one chunk per module and still applies tree-shaking; caution: exports can be tree-shaken away if not treated as entries.

- #fetch:https://rollupjs.org/configuration-options/#output-preservemodulesroot
  - `output.preserveModulesRoot` strips a directory prefix (e.g. `src/`) to keep a stable output directory structure.

### Project Conventions

- Standards referenced: pnpm workspaces + Turborepo task graph; per-package Vite library builds with Rollup `preserveModules`; Vitest “projects” pattern.
- Instructions followed: Task Researcher mode (research-only) + monorepo workspace boundaries documented in AGENTS.md.

## Key Discoveries

### Project Structure

- The JSONPath implementation is split into many sibling packages under `packages/jsonpath/*` (there is no `packages/jsonpath/package.json`).
- Most packages follow consistent build/test wiring:
  - Build: Vite library mode + `preserveModules` / `preserveModulesRoot: 'src'` (verified by search results).
  - Test: per-package `vitest.config.ts` aggregated by root `vitest.config.ts` “projects”.

### Implementation Patterns

- **Engine composition is plugin-first and deterministic**.
  - Plugins supply scanner rules, parser segment parsers, evaluators, and result mappings.
  - Plugins are resolved in deterministic order (via core resolver), and dependency/capability conflicts are validated at engine creation time.

- **Per-plugin runtime config**.
  - Engine passes per-plugin config into `setup(ctx)` as `ctx.config`.

- **Per-engine plugin state is preferred over module-level mutation**.
  - Stateful plugins should be instantiated per-engine; `setup(ctx)` can read `ctx.config` and capture config in a closure.

- **Error surface is stable and typed**.
  - Syntax errors are thrown as `JsonPathError` with `code: JsonPathErrorCodes.Syntax` and a specific `offset`.

- **Pointer/Patch/Mutate are structural-sharing utilities, not in-place mutators**.
  - Pointer set/remove clone along the path and forbid root mutation.
  - Patch is intentionally minimal: add/replace/remove only.
  - Pointer segments forbid prototype-pollution vectors: `__proto__`, `prototype`, `constructor`.

### Complete Examples

```typescript
// packages/jsonpath/pointer/src/parse.ts
import { assertNotForbiddenSegment } from './forbidden';

function decode(segment: string): string {
	// RFC 6901: ~1 => / and ~0 => ~
	return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function parsePointer(pointer: string): string[] {
	if (pointer === '') return [];
	if (!pointer.startsWith('/'))
		throw new Error('JSON Pointer must start with "/" or be empty.');
	const parts = pointer.split('/').slice(1).map(decode);
	for (const p of parts) assertNotForbiddenSegment(p);
	return parts;
}
```

```typescript
// packages/jsonpath/patch/src/apply.ts
import type { JsonPatchOp } from './types';
import { removeByPointer, setByPointer } from '@jsonpath/pointer';

export function applyPatch(doc: unknown, ops: readonly JsonPatchOp[]): unknown {
	let current: unknown = doc;
	for (const op of ops) {
		if (op.op === 'add' || op.op === 'replace') {
			current = setByPointer(current, op.path, op.value);
			continue;
		}
		if (op.op === 'remove') {
			current = removeByPointer(current, op.path);
			continue;
		}
		const _exhaustive: never = op;
		throw new Error('Unsupported JSON Patch operation');
	}
	return current;
}
```

```typescript
// packages/jsonpath/plugin-syntax-root/src/index.ts
export function createSyntaxRootPlugin(): JsonPathPlugin<{
	profile?: Profile;
}> {
	let profile: Profile = 'rfc9535-draft';
	return {
		meta: {
			id: '@jsonpath/plugin-syntax-root',
			capabilities: ['syntax:rfc9535:root'],
		},
		setup: ({ config, engine }) => {
			profile = config?.profile ?? 'rfc9535-draft';
			registerRfc9535ScanRules(engine.scanner);
			registerRfc9535LiteralScanRules(engine.scanner);
			engine.parser.registerSegmentParser((ctx) =>
				parseRfc9535Path(ctx, profile),
			);
		},
	};
}
```

### API and Schema Documentation

- Engine evaluation surface (from core) supports `evaluateSync` and `evaluateAsync` (async currently delegates to sync).
- Result typing expectation: without a registered result plugin for a given result type, engine defaults to `value`/`node` only.
- Pointer API intentionally blocks prototype pollution by forbidding segments.
- Patch API currently supports only a subset of RFC 6902 operations (add/replace/remove).

### Configuration Examples

```ts
// Representative Vite library-mode build output style used throughout packages/jsonpath/*
// (pattern verified by preserveModulesRoot search)
output: {
	preserveModules: true,
	preserveModulesRoot: 'src',
	entryFileNames: '[name].js',
}
```

### Technical Requirements

- **Determinism constraint**: plugin ordering must remain deterministic; any new plugin meta IDs or dependency graphs will affect ordering.
- **Security constraint**: pointer-based writes must continue to prevent prototype pollution; do not remove `ForbiddenPointerSegments` protections.
- **Compatibility constraint**: presets should avoid module-level shared mutable state; prefer `createXPlugin()` factories.
- **Patch/mutation correctness**: current patch/mutate behavior is “pure” (returns new root) and rejects root pointer mutation.

## Recommended Approach

Use the existing engine/plugin architecture as the spine of the ecosystem plan:

1. Treat `@jsonpath/core` as stable orchestration and expand functionality via plugins (syntax/filter/function/result).
2. Keep profile-gated behavior in per-engine plugin state derived from `setup(ctx).config`, and ensure presets instantiate per-engine plugin instances.
3. Extend pointer/patch/mutate carefully:
   - Keep structural sharing semantics.
   - Keep forbidden segments protections.
   - Add missing RFC 6902 ops only if/when the plan requires them; otherwise preserve the current minimal contract.
4. For build/test/package work, follow existing package conventions:
   - Vite library-mode builds with Rollup `preserveModules` / `preserveModulesRoot: 'src'`.
   - Vitest per-package configs aggregated via root “projects”.

## Implementation Guidance

- **Objectives**: Provide a complete RFC9535 engine + supporting tooling (CLI, compat, conformance), plus pointer/patch/mutation utilities and secure script expressions.
- **Key Tasks**:
  - Inventory which jsonpath packages are fully implemented vs “capability-only”.
  - Complete printer + result-view plugins to unlock `path/pointer/parent` results.
  - Fill RFC9535 gaps (lexer tokens, syntax parsers, filter evaluators, function typing/eval) via plugins.
  - Expand patch/mutation only as needed by the plan and conformance tests.
- **Dependencies**:
  - Plugin resolver/registry in core; lexer/parser/ast packages; pointer/patch/mutate for mutation steps.
- **Success Criteria**:
  - Conformance suite passes for declared profiles (`draft/core/full`).
  - CLI and compat packages produce expected results for representative queries.
  - Pointer/patch/mutate remain safe against prototype pollution and preserve immutability semantics.
