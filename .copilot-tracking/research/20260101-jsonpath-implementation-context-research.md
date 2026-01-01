<!-- markdownlint-disable-file -->

# Task Research Notes: @jsonpath/\* implementation context (inventory, conventions, gaps)

## Research Executed

### File Analysis

- packages/jsonpath/\*
  - Workspace subtree contains framework, plugins, compat, pointer/patch/mutate, validators, CLI, bundles, and internal harness packages.
- package.json
  - Root workspaces include `packages/jsonpath/*`; root scripts use Turborepo for build/test/type-check.
- turbo.json
  - Task graph: `build` depends on `^build` and outputs `dist/**`; `test:coverage` depends on `^build`; `test` does not.
- vitest.config.ts
  - Root Vitest uses `test.projects` globs including `packages/jsonpath/*/vitest.config.ts`.
- specs/jsonpath.md
  - Spec constraints: plugin-first architecture; core framework-only; RFC9535 bundled plugin; SES sandbox for script expressions; CLI JSON-only; pointer-backed mutation; validation via validate plugin + adapters.
- pnpm-lock.yaml
  - Confirms presence of relevant third-party deps (e.g., `ses`, `ajv`, `zod`, `yup`, `jsonpath-plus`, `jsonpath`).

### Code Search Results

- "name": "@jsonpath/"
  - Found many packages under `packages/jsonpath/*/package.json`.
- hooks\s*:\s*\{
  - Identifies which plugins currently register lexer/parser/evaluator hooks (primarily syntax plugins).
- Framework-only stable placeholder|placeholder|not implemented
  - Confirms placeholder implementations in `@jsonpath/printer`, parts of parser infra, and I-Regexp implementation note.

### External Research

- #githubRepo:""
  - None executed for this note.
- #fetch:
  - None executed for this note.

### Project Conventions

- Standards referenced: pnpm workspaces; Turborepo pipelines; Vite library-mode builds to `dist/` with `preserveModules`; Vitest multi-project via `test.projects`; ESM packages with `exports` pointing at `./dist/*`.
- Instructions followed: Task Researcher constraints (research-only; edits only under `.copilot-tracking/research/`).

## Key Discoveries

### Project Structure

- Jsonpath workspace lives under `packages/jsonpath/*` and already includes most of the spec’s package set.
- There are also internal harness packages under `@lellimecnar/*` in the same subtree (conformance + compat harness).

### Implementation Patterns

- Publishable TS libraries are ESM (`type: "module"`), build with Vite to `dist/`, ship types in `dist/index.d.ts`, and use `exports` to point at `./dist/*`.
- Jsonpath packages use Vitest (`test: vitest run`) and integrate into root via `vitest.config.ts` `test.projects`.

### Technical Requirements

- Spec requires RFC9535 behavior to be delivered via `@jsonpath/plugin-rfc-9535` (bundled features), not via core.
- Spec requires script expressions to use SES (`ses` dependency is present).
- Spec requires CLI config to be JSON-only (CLI in repo prints `Usage: jsonpath <config.json>` when missing a config path).

## Recommended Approach

Not provided (research-only note).

## Implementation Guidance

- **Objectives**: Provide planning context (inventory + conventions + gaps + dependency/critical path).
- **Key Tasks**: Not provided (no plan).
- **Dependencies**: Not provided (no plan).
- **Success Criteria**: Not provided (no plan).
