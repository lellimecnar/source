# RFC 9535 Default JSONPath Package

**Branch:** `jsonpath/rfc9535-default-package`
**Description:** Introduces `@jsonpath/jsonpath` as the zero-config RFC 9535 engine entrypoint, consolidates RFC 9535 spec plugins into `@jsonpath/plugin-rfc-9535`, moves the internal compliance harness into `@jsonpath/jsonpath` (deleting the old `@lellimecnar/jsonpath-conformance` workspace), and refactors `@jsonpath/core` to expose default components + overrides.

## Goal

Provide a single, ergonomic import (`@jsonpath/jsonpath`) that yields a ready-to-use RFC 9535 JSONPath engine with `compile`, `parse`, `evaluateSync`, and `evaluateAsync` available with zero configuration, while keeping the ecosystem composable (default plugins/components remain individually exportable and fully overridable).

`@jsonpath/jsonpath` is the **main entrypoint** for typical consumers: aside from optional additional plugins, consumers should not need to install any other dependencies unless they have an advanced use case requiring custom configuration of parser/AST/lexer/etc. or are creating their own plugins.

## Implementation Steps

### Step 1: Audit current engine + plugin wiring

**Files:**

- `packages/jsonpath/core/src/createEngine.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/plugin-rfc-9535/src/index.ts`
- `packages/jsonpath/conformance/src/{corpus.ts,harness.ts,index.ts}`
- `packages/jsonpath/complete/src/index.ts`
- `packages/jsonpath/cli/src/run.ts`
- Workspace-wide grep: `@jsonpath/plugin-syntax-*`, `@jsonpath/plugin-filter-*`, `@jsonpath/plugin-result-*`, `createRfc9535Engine`, `rfc9535Plugins`

**What:**

- Document the exact “default” engine surface today (core provides an engine factory; RFC preset is currently implemented as a bundle over many plugin packages; the internal compliance harness currently lives under the `@lellimecnar/jsonpath-conformance` workspace).
- Identify all import sites that will be affected when RFC plugins are consolidated and when a new top-level `@jsonpath/jsonpath` entrypoint is introduced.

**Open questions to resolve during this audit (decision drivers):**

- Determine the concrete plugin object shape and hook surface based on the needs of the existing `@jsonpath/*` plugin packages in this monorepo.
- Confirm which hooks must be supported per phase and whether plugins commonly register hooks in multiple phases (this plan assumes they can).

**Testing:**

- No behavioral changes. Verify only that analysis is complete (a short checklist in the PR description or an internal note).

### Step 2: Refactor `@jsonpath/core` to expose default components + accept overrides

**Files:**

- `packages/jsonpath/core/src/createEngine.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/core/package.json`
- (If needed) `packages/jsonpath/core/src/engine.ts` and any types referenced

**What:**

- Introduce a `CreateEngineOptions` shape that supports:
  - `plugins`: required (core remains plugin-first)
  - `components` (new): optional overrides for component-level dependencies such as `ast`, `lexer`, `parser`, plus any other engine primitives/registries to maximize composability.
- Make `@jsonpath/core` continue to _use_ the default component packages (`@jsonpath/ast`, `@jsonpath/lexer`, `@jsonpath/parser`) when overrides are not provided.
- Keep `@jsonpath/core` as the single owner of plugin lifecycle management (decision):
  - Core is responsible for resolving plugins (including order-independence + constraints), deduping, and registering hooks into the engine.
  - Preset/plugin packages (like `@jsonpath/plugin-rfc-9535`) only _provide_ plugin factories and convenience lists; they do not implement resolution logic.
- Plugin authoring API (decision):
  - `createPlugin` is provided by `@jsonpath/core` and returns a **plugin factory function**.
  - The returned factory accepts per-plugin options and produces the final plugin object consumed by `createEngine`.
  - Example:
    - `const myPlugin = createPlugin((opts) => { /* ... */ })`
    - `createEngine({ plugins: [myPlugin({ /* opts */ })] })`
- Export component modules from core **via subpath exports** (decision: do not pollute namespaces):
  - Add `exports` entries in `packages/jsonpath/core/package.json` for:
    - `@jsonpath/core/ast`
    - `@jsonpath/core/lexer`
    - `@jsonpath/core/parser`
  - Implement each subpath as a tiny re-export module in core (e.g. `src/ast.ts` re-exporting `@jsonpath/ast`).
- Ensure `createEngine` remains deterministic with respect to plugin resolution ordering and continues to support `compile`, `parse`, `evaluateSync`, `evaluateAsync`.

**Warnings and logging (decision):**

- Plugins should be able to hook into warning/error events.
- Core should log by default.
- Provide a `verbosity` option to control which log levels are emitted (e.g. show/silence warnings/errors) and to redirect logging.

**Testing:**

- Run the existing `@jsonpath/core` unit tests (`pnpm --filter @jsonpath/core test`).
- Add/adjust a minimal test ensuring `createEngine({ plugins, components: { … } })` routes through overrides (does not need full compliance).

### Step 3: Consolidate RFC 9535 “official spec plugins” into `@jsonpath/plugin-rfc-9535`

**Files:**

- `packages/jsonpath/plugin-rfc-9535/package.json`
- `packages/jsonpath/plugin-rfc-9535/src/index.ts`
- New internal modules under `packages/jsonpath/plugin-rfc-9535/src/plugins/**`
- Delete/migrate source from (current packages):
  - Syntax: `packages/jsonpath/plugin-syntax-root`, `plugin-syntax-current`, `plugin-syntax-child-member`, `plugin-syntax-child-index`, `plugin-syntax-wildcard`, `plugin-syntax-union`, `plugin-syntax-descendant`, `plugin-syntax-filter`
  - Filters / expressions: `plugin-filter-literals`, `plugin-filter-boolean`, `plugin-filter-comparison`, `plugin-filter-existence`, `plugin-filter-functions`, `plugin-filter-regex`, `plugin-iregexp`, `plugin-functions-core`
  - Results: `plugin-result-value`, `plugin-result-node`, `plugin-result-path`, `plugin-result-pointer`, `plugin-result-parent`, `plugin-result-types`

**What:**

- Move the implementation of all RFC 9535 “official” plugins into `@jsonpath/plugin-rfc-9535` as internal modules.
- Preserve _individual composability_ by exporting each plugin factory from `@jsonpath/plugin-rfc-9535` (decision: these are plugin-specific factories produced using `@jsonpath/core`'s `createPlugin`, e.g. `createSyntaxRootPlugin(options)` → plugin).
- Keep the “bundle convenience” behavior while enforcing order-independence (decision):
  - `rfc9535Plugins`: exported array of all official plugins. The array order must not encode semantics.
  - Evolve the plugin contract so that **plugins declare which phase(s) they hook into**, plus **optional ordering constraints** (decision: plugins are produced by the factories returned from `@jsonpath/core`'s `createPlugin`):
    - Plugin identity (decision):
      - Each plugin must declare a globally-unique, stable `id` string.
      - Each plugin must declare whether it can be used more than once in a single engine (e.g. `allowMultiple: boolean`).
      - If `allowMultiple` is `false` and duplicates are provided:
        - Emit a warning.
        - The last instance wins (takes precedence) within that engine (deterministic rule: “last” means last in the caller-provided plugin array for that engine).
    - Phases (required): each plugin declares one or more phases it participates in.
    - Proposed phase enum (decision):
      - `syntax`: parse-time syntax/grammar registration and AST construction.
      - `filter`: filter-expression operators, literals, functions, and evaluation semantics.
      - `runtime`: core evaluation semantics for selectors/segments (walking documents, node selection).
      - `result`: result shaping/mapping (values vs nodes vs paths vs pointers vs types/parent).
    - Deterministic phase ordering (decision): `syntax` → `filter` → `runtime` → `result`.
    - Ordering (optional): a plugin may declare constraints such as:
      - `first` / `last` within its phase
      - `before: [...]` / `after: [...]` relative to other plugin IDs within its phase
  - Resolver behavior (decision):
    - The resolver lives in `@jsonpath/core` and produces a deterministic **execution order**.
    - Consumer-provided plugin array order must not encode semantics; the resolver produces the configured execution order (via phases + constraints).
    - Hooks are executed in the resolver-configured execution order.
    - A plugin may register hooks in multiple phases; each phase’s hooks are executed in the configured order for that phase.
    - Constraints are validated and satisfied where they exist.
    - If a plugin references a constraint target that is not present:
      - Emit a warning.
      - Ignore the constraint otherwise (no auto-inclusion).
    - If constraints are unsatisfiable (cycle, conflicting `first`/`last`, etc.):
      - Emit a warning.
      - Fall back deterministically (decision): drop only the constraints that cannot be satisfied and order the remaining plugins in that phase by stable key (e.g. `id`), then proceed.
    - Warnings/verbosity (decision):
      - Provide a warning handler option (or verbosity option) so warnings can be silenced or redirected.
  - `plugin` (the preset plugin): remains a convenience meta-plugin that depends on all official plugins.
- Ensure any per-engine mutable state stays per-engine (follow the existing pattern of `createSyntaxRootPlugin()` where applicable).

**Testing:**

- Run `pnpm --filter @jsonpath/plugin-rfc-9535 test`.
- Add a smoke test verifying that importing the individual plugins from `@jsonpath/plugin-rfc-9535` yields stable plugin metas and that `rfc9535Plugins` is non-empty.

### Step 4: Delete the old RFC plugin packages (workspace cleanup)

**Files:**

- Delete directories listed in Step 3 (the old `packages/jsonpath/plugin-*` workspaces that were consolidated)
- Root/workspace config files as needed:
  - `pnpm-workspace.yaml` (if it enumerates plugin folders explicitly)
  - Root `package.json` (if scripts/reference lists exist)
  - Any Turbo filters/docs referencing removed package names

**What:**

- Remove obsolete workspaces now that RFC plugins live in `@jsonpath/plugin-rfc-9535`.
- Ensure remaining packages do not depend on removed workspace names.
- Scope decision: delete RFC “official spec” plugin packages outright. Only non-spec/extension plugin packages remain as separate workspaces.

**Testing:**

- `pnpm -w -r build --filter @jsonpath/*` (or equivalent) to ensure the workspace graph resolves.

### Step 5: Introduce `@jsonpath/jsonpath` (zero-config engine entrypoint)

**Files:**

- New package: `packages/jsonpath/jsonpath/package.json`
- New entrypoint: `packages/jsonpath/jsonpath/src/index.ts`
- New tests: `packages/jsonpath/jsonpath/src/index.spec.ts` (or equivalent)
- Build config: `packages/jsonpath/jsonpath/vite.config.ts`, `tsconfig.json`, `vitest.config.ts` (match existing jsonpath package conventions)

**What:**

- Create a new public package `@jsonpath/jsonpath` that exports:
  - A pre-configured engine instance that can be used immediately with `compile`, `parse`, `evaluateSync`, `evaluateAsync`.
  - `createEngine` (from `@jsonpath/jsonpath`) that creates _new_ engines when configuration beyond defaults is needed:
    - Applies RFC 9535 defaults automatically.
    - If the caller passes additional plugins, they are _appended_ to the default RFC plugin list (they do not replace defaults).
    - Accepts **fully overridable** components (delegating to the new `@jsonpath/core` overrides).
    - Accepts an options object where all keys are optional.
- Export shape (decision):
  - Provide **both** a named export and a default export for the preconfigured engine:
    - `export const engine = …`
    - `export default engine`
- Default engine configuration strategy (decision):
  - The default exported engine does **not** accept configuration.
  - Per-call options are accepted only on the engine methods themselves (and can all share the same singleton default engine).
  - If a caller needs configuration beyond the defaults (plugins/components/engine wiring), they must create a new engine via `createEngine(...)`.
- Default engine creation strategy (decision):
  - The default engine is created **lazily** (module-scope memoization) the first time any method is called.
- Add **justified convenience helpers** (decision):
  - Provide helpers that remove multi-step/boilerplate usage for common cases, while keeping the engine surface the primary API.
  - Candidate helpers:
    - `evaluateSync(expression, json, options?)` (internally compiles then evaluates)
    - `evaluateAsync(expression, json, options?)`
  - Defaults (decision):
    - The default behaviors of `@jsonpath/jsonpath` must be 100% RFC 9535 compliant.
    - Where an API choice requires a default (e.g. result shaping), use the RFC 9535-defined default semantics for the chosen public surface.
  - Document each helper’s purpose (why it exists) and keep argument shapes minimal.
- Ensure no configuration is required for the default engine (all required plugins/components are wired by default).
- Re-export surface (decision):
  - Re-export only the commonly needed public API/types so consumers who want “the defaults” only need `@jsonpath/jsonpath`.
  - Include RFC defaults (`rfc9535Plugins`, preset `plugin`, and individual RFC plugin exports).
  - Include a curated subset of `@jsonpath/core` types/errors (and any other commonly used exports), rather than a blanket re-export of everything.

**Primary entrypoint + dependency posture (decision):**

- Treat `@jsonpath/jsonpath` as the main library entrypoint.
- A typical consumer should only need to install `@jsonpath/jsonpath` (plus any optional extra plugins they choose to add).
- Installing lower-level packages (e.g. `@jsonpath/core`, `@jsonpath/ast`, `@jsonpath/lexer`, `@jsonpath/parser`) should be reserved for advanced/custom component override scenarios.

**Testing:**

- Add a smoke test that:
  - Imports the engine from `@jsonpath/jsonpath` and runs `compile`, `parse`, `evaluateSync`, `evaluateAsync` on a trivial document.
  - Verifies `createEngine({ plugins: [extra] })` results in RFC plugins + extra plugin being present (can be asserted via behavior or plugin registry metadata if exposed).

### Step 6: Move internal compliance apparatus into `@jsonpath/jsonpath` and delete old conformance workspace

**Files:**

- New location under `packages/jsonpath/jsonpath/src/compliance/**` (or `packages/jsonpath/jsonpath/src/testing/**`)
  - Migrate: `packages/jsonpath/conformance/src/{corpus.ts,harness.ts,index.ts,cts.ts}`
- Delete: `packages/jsonpath/conformance/**`
- Update any references:
  - `packages/jsonpath/compat-harness/**` (imports `@lellimecnar/jsonpath-conformance` today)
  - Any scripts/docs referencing the conformance package name

**What:**

- Move the corpus + harness APIs into `@jsonpath/jsonpath` for internal RFC 9535 compliance testing.
- Export strategy (decision):
  - The compliance helpers are **TEST ONLY**.
  - They must not be bundled, exported, or exposed in any way outside of running tests.
  - They should live under a test-only path within the package (e.g. `src/__tests__/...`) and be referenced only by tests.
- External compliance suite fetch (decision):
  - Keep using `napa` to fetch `jsonpath-standard/jsonpath-compliance-test-suite`.
  - Configure `napa` in `packages/jsonpath/jsonpath/package.json`.
  - Fetch as part of repo testing/dev only (decision): do **not** fetch via an `install` script for end-users; wire this to a test-only workflow (e.g. a dedicated script invoked by CI / local test runs).
  - Import compliance fixtures like a normal dependency (decision: follow existing `@lellimecnar/jsonpath-conformance` pattern):
    - Example: `import cts from 'jsonpath-compliance-test-suite/cts.json' assert { type: 'json' }` in a `cts.ts` helper.
- Remove the original conformance workspace package entirely.

**Testing:**

- Add a placeholder test that verifies the compliance harness can be imported from its internal module path within the package (without exporting it as public API) and runs a minimal in-repo corpus case.
- Do not attempt to run full compliance suite yet; only verify that wiring is in place.

### Step 7: Update ecosystem packages to use the new entrypoint and new RFC plugin exports

**Files:**

- `packages/jsonpath/cli/src/run.ts`
- `packages/jsonpath/compat-jsonpath/src/index.ts`
- `packages/jsonpath/compat-jsonpath-plus/src/index.ts`
- `packages/jsonpath/compat-harness/**`
- Any other packages importing deleted `@jsonpath/plugin-*` workspaces

**What:**

- Remove `@jsonpath/complete` (decision: replaced by `@jsonpath/jsonpath`).
- Migrate consumers away from:
  - `@jsonpath/complete`.
  - Any imports from deleted RFC plugin package names.
- Prefer:
  - `@jsonpath/jsonpath` for the “default engine” use case.
  - `@jsonpath/plugin-rfc-9535` for composing plugin sets.
- Keep changes minimal: only update imports, dependency lists, and any obviously broken glue.
- Versioning/compatibility (decision): this is a v0 implementation, so backward compatibility and deprecation shims are out of scope.

**Testing:**

- Build + unit test the directly touched packages (do not chase unrelated failures):
  - `pnpm --filter @jsonpath/cli test`
  - `pnpm --filter @jsonpath/compat-jsonpath test`
  - `pnpm --filter @jsonpath/compat-jsonpath-plus test`

### Step 8: Final workspace integrity pass (package graph, exports, docs touch-ups)

**Files:**

- Root `package.json` / turbo config if filters need updates
- Any jsonpath docs referencing old package names

**What:**

- Ensure workspace build/test tasks can resolve all packages after deletions.
- Update any documentation or READMEs that mention the removed RFC plugin package names or the old conformance package.

**Testing:**

- `pnpm -w -r build --filter @jsonpath/*`.
- Optional: `pnpm -w -r test --filter @jsonpath/*` (do not fix failures unless they are caused by these changes or are environment-only).
