---
title: Card Stack Architecture (Phase 1) — Core migration planning (ts-mixer → polymix)
version: 1
date_created: 2025-12-26
last_updated: 2025-12-26
owner: lellimecnar
status: Planned
scope: Single PR
---

# Card Stack Architecture (Phase 1)

## Goal

Deliver a single PR (on a dedicated branch) that migrates `@card-stack/core` from `ts-mixer` to `polymix`, refactors initialization away from `init()` and into constructors, and keeps the standard deck package green.

Constraints and decisions for this PR:
- Breaking changes are acceptable.
- Refactor `@card-stack/core` (do not add compatibility features to `packages/polymix`).
- Prefer decorator-based composition (`@mixin(...) class X extends Base {}`) over `extends Mix(...)`.
- Rename the deck package to match the spec: `@card-stack/standard-deck` → `@card-stack/deck-standard`.

This plan is based on:
- Spec: `spec/spec-architecture-card-stack.md`
- Existing plan draft: `plan/architecture-card-stack-1.md`
- Local polymix docs: `packages/polymix/README.md`, `packages/polymix/MIGRATION.md`, `packages/polymix/GAPS.md`
- Current implementation patterns in `card-stack/core` and `card-stack/deck-standard`

---

## A) Findings (concrete facts)

### Repo conventions / commands
- Root guidance: `AGENTS.md` (pnpm + Turborepo monorepo; per-workspace testing via `pnpm --filter <pkg> test`).
- Card-stack core guidance: `card-stack/core/AGENTS.md` (explicitly states: ts-mixer ^6.0.4, Jest; tests are colocated `*.spec.ts`).
- Jest preset for both packages: `card-stack/core/jest.config.js` and `card-stack/deck-standard/jest.config.js` both use preset `@lellimecnar/jest-config`.

### Spec constraints that conflict with current implementation
- The spec explicitly requires polymix: `spec/spec-architecture-card-stack.md` says mixins/decorators **MUST** be created using `polymix` and notes the current state is `ts-mixer` and should be rewritten/migrated.

### Current `ts-mixer` usage and patterns in `@card-stack/core`
- `ts-mixer` is a runtime dependency today: `card-stack/core/package.json` includes `"ts-mixer": "^6.0.4"`.
- `ts-mixer` settings are configured globally in `card-stack/core/src/utils.ts`:
  - Imports `settings` from `ts-mixer` and mutates it via `Object.assign(settings, { initFunction: 'init', prototypeStrategy: 'copy', staticsStrategy: 'copy', decoratorInheritance: 'deep' })`.
  - Re-exports `Mixin as Mix` and `mix` from `ts-mixer`.
- The engine relies heavily on an `init(...args)` lifecycle rather than constructors:
  - Example: `card-stack/core/src/card-set/card-set.ts` has an empty constructor and sets up `cards` in `init()`.
  - Example: `card-stack/core/src/shared/indexable.ts` assigns `index` + registers instances in `init()`.
  - Example: `card-stack/core/src/card/card.ts` defines `init()` that calls `super.init(...args)` and then sets `parent` based on args.
- Runtime type guards are currently `ts-mixer`-based and rely on `require(...)` indirection (to reduce circular import problems):
  - `card-stack/core/src/utils.ts` defines `isCard`, `isCardSet`, `isRankable`, etc. using `hasMixin(obj, require('./...').X)`.

### Examples of mixin composition styles used today
- `extends Mix(...)` (ts-mixer `Mixin`):
  - `card-stack/core/src/card/card.ts`: `export class Card extends Mix(Indexable, Parentable<CardSet>) { ... }`
  - Tests repeatedly use `class TestX extends Mix(Base, MixinA, MixinB) {}` (e.g. `card-stack/core/src/card-set/*.*spec.ts`).
- Decorator-based mixin application (`@mix(...)` from ts-mixer):
  - `card-stack/core/src/card-deck/card-deck.ts`: `@mix(CardSet, Indexable)`.
- NOTE: `card-stack/core/src/card-deck/card-deck.ts` uses both an `interface` and `@mix(...) class` pattern to merge types:
  - `export interface CardDeck<C extends Card> extends CardSet<C>, Indexable {}`
  - `@mix(CardSet, Indexable) export class CardDeck<C extends Card> { ... }`

### Current `@card-stack/standard-deck` state
- The package name is currently `@card-stack/standard-deck` (not `@card-stack/deck-standard`): `card-stack/deck-standard/package.json`.
- `card-stack/deck-standard/src/standard-deck.ts` depends on `@card-stack/core` exports `Mix`, `hasMixin`, and mixins (`Suitable`, `Rankable`).
- The deck builds its full 52-card contents in `StandardDeck.init()` and tests assume `new StandardDeck()` is already initialized.
- Snapshot testing exists for the full deck list:
  - `card-stack/deck-standard/src/standard-deck.spec.ts` snapshotting `rankName`/`suitName` strings.

### Local polymix capabilities and migration guidance
- polymix provides: `mix`, `mixWithBase`, `hasMixin`, `from`, `when`, and conflict-resolution strategies; plus class decorators `@mixin` / `@Use` (legacy TS decorators).
- `packages/polymix/MIGRATION.md` states polymix calls each mixin’s `init(...args)` automatically.
- `packages/polymix/GAPS.md` highlights a key incompatibility for card-stack’s current pattern:
  - polymix calls mixin `init()`, but does **not** automatically invoke the *concrete class’* `init()`.
  - card-stack currently expects derived classes’ `init()` (and `super.init` chaining) to run.

---

## B) Risks / unknowns (likely pitfalls)

- **Init lifecycle migration risk (highest risk):** `@card-stack/core` puts most initialization in `init()` and relies on ts-mixer’s global `initFunction: 'init'` plus `super.init(...)` chaining. This PR will eliminate that reliance by moving initialization into constructors, but it will touch many files and can introduce subtle ordering regressions.
- **Base-vs-mixin semantics:** card-stack sometimes treats “base classes” as mixins (e.g., `Mix(CardDeck<StandardCard>)`), and sometimes uses decorator `@mix(CardSet, Indexable)`. polymix has both `mix()` (heuristic base) and `mixWithBase()` (explicit). Choosing the wrong one can silently change prototype chains and `super` behavior.
- **Method conflict strategy defaults:** polymix’s default strategy `override` runs all implementations in order and returns the last. If card-stack has any accidental method name collisions (especially `init`), side effects could execute multiple times.
- **Type guard / circular import churn:** `card-stack/core/src/utils.ts` uses `require()` for type guards; migrating to ESM imports (or changing guard impls) can introduce circular dependencies or change module evaluation timing.
- **Package rename surface area:** Renaming `@card-stack/standard-deck` → `@card-stack/deck-standard` requires updating filters/import paths and may affect any downstream references.
- **Decorator config drift:** This plan assumes TS legacy decorators are available (spec-aligned). If `experimentalDecorators` is not enabled for `card-stack/core`, it must be enabled as part of the migration.

---

## C) Commit-by-commit plan (single PR)

### PR boundaries

- **Branch:** `refactor/card-stack-polymix` (dedicated branch)
- **Single PR:** yes
- **Out of scope:** scaffolding new packages, adding new deck asset manifests, implementing new mixins beyond what’s required to preserve current behavior.

### Output template (per-commit)

For each commit:
- **Commit message:** Conventional Commits (`refactor:`, `chore:`, `test:` etc.)
- **Intent:** what this commit accomplishes
- **Changes:** specific files/areas touched
- **Tests:** exact commands to run
- **Notes / Rollback:** gotchas, what to look for in review

This plan uses Conventional Commits + explicit test commands.

---

### Commit 1 — Add polymix dependency (no behavior changes)
- **Commit message:** `chore(card-stack-core): add polymix workspace dependency`
- **Intent:** Introduce polymix as a dependency so later commits can migrate incrementally.
- **Changes:**
  - `card-stack/core/package.json`: add `polymix: "workspace:*"` to `dependencies` (keep `ts-mixer` for now).
- **Tests:**
  - `pnpm --filter @card-stack/core test`
- **Notes / Rollback:**
  - Should be a no-op at runtime.

### Commit 2 — Refactor initialization: `init()` → constructors (still on ts-mixer)
- **Commit message:** `refactor(card-stack-core): move initialization from init() into constructors`
- **Intent:** Remove the `init()` lifecycle dependency so the polymix migration does not require changes to `packages/polymix`.
- **Changes:**
  - Update core primitives and capabilities that currently rely on `init()`:
    - `card-stack/core/src/card-set/card-set.ts`
    - `card-stack/core/src/shared/indexable.ts`
    - `card-stack/core/src/card/card.ts`
    - `card-stack/core/src/player/player.ts`
  - Ensure constructor ordering is deterministic (no implicit `super.init(...)` chains).
- **Tests:**
  - `pnpm --filter @card-stack/core test`
- **Notes / Rollback:**
  - This commit is expected to be the largest behavior-sensitive change; snapshot expectations should remain stable.

### Commit 3 — Migrate composition to polymix + switch to decorator style (breaking changes allowed)
- **Commit message:** `refactor(card-stack-core): migrate from ts-mixer composition to polymix decorators`
- **Intent:** Replace `extends Mix(...)` and `@mix(...)` usage with polymix `@mixin(...)` composition.
- **Changes:**
  - Replace class composition patterns across core (prefer `@mixin(...) class X extends Base {}`):
    - `card-stack/core/src/card/card.ts`
    - `card-stack/core/src/card-deck/card-deck.ts`
    - `card-stack/core/src/card-set/*`
    - `card-stack/core/src/player/*`
    - `card-stack/core/src/shared/*`
  - Update `card-stack/core/src/utils.ts`:
    - Remove `ts-mixer` `settings` mutation.
    - Export polymix APIs used by core.
    - Since breaking changes are acceptable, remove/stop exporting legacy `Mix` if it conflicts with the new API surface.
  - If needed, enable legacy decorators for this package via `card-stack/core/tsconfig.json`.
- **Tests:**
  - `pnpm --filter @card-stack/core test`
- **Notes / Rollback:**
  - Prefer `mixWithBase(Base, ...)` only when a decorator is impractical.

### Commit 4 — Update runtime type guards to polymix `hasMixin`
- **Commit message:** `refactor(card-stack-core): update runtime type guards to polymix hasMixin`
- **Intent:** Replace `ts-mixer` `hasMixin` usage with polymix `hasMixin` while preserving runtime circular-dependency behavior.
- **Changes:**
  - `card-stack/core/src/utils.ts` type guards (`isCard`, `isCardSet`, `isRankable`, etc.).
- **Tests:**
  - `pnpm --filter @card-stack/core test`
- **Notes / Rollback:**
  - Keep the existing `require()` indirection if it prevents circular import breakage; only swap the underlying mixin detection.

### Commit 5 — Rename deck package + update imports (spec alignment)
- **Commit message:** `refactor(card-stack-deck-standard): rename standard-deck package to deck-standard`
- **Intent:** Align the package inventory with the spec naming (`@card-stack/deck-standard`).
- **Changes:**
  - `card-stack/deck-standard/package.json`: rename package from `@card-stack/standard-deck` → `@card-stack/deck-standard`.
  - Update any `pnpm --filter` references in documentation/plans as needed.
  - Update `card-stack/deck-standard/src/standard-deck.ts` imports from `@card-stack/core` to the new, breaking polymix-based API surface.
  - Update `card-stack/deck-standard/src/standard-deck.spec.ts` only if needed (snapshots should remain stable).
- **Tests:**
  - `pnpm --filter @card-stack/deck-standard test`
  - `pnpm --filter @card-stack/core test`
- **Notes / Rollback:**
  - Prefer doing the rename as a dedicated commit to keep diffs reviewable.

### Commit 6 — Remove ts-mixer dependency + cleanup
- **Commit message:** `chore(card-stack-core): remove ts-mixer dependency after migration`
- **Intent:** Complete the migration and reduce maintenance burden.
- **Changes:**
  - `card-stack/core/package.json`: remove `ts-mixer` from dependencies.
  - Remove any dead settings/config logic.
- **Tests:**
  - `pnpm --filter @card-stack/core test`
  - `pnpm --filter @card-stack/deck-standard test`
- **Notes / Rollback:**
  - Ensure there is no remaining import of `ts-mixer` across the workspace.

---

## Decisions (confirmed)

1. Rename `@card-stack/standard-deck` → `@card-stack/deck-standard` in this PR.
2. Refactor `@card-stack/core` to constructor-based initialization (do not modify `packages/polymix`).
3. Breaking changes are acceptable; legacy `Mix` exports are not required.
4. Prefer polymix decorators (`@mixin(...)`) over `extends Mix(...)`.

---

## Validation checklist (for the PR)

- `pnpm --filter @card-stack/core test`
- `pnpm --filter @card-stack/deck-standard test`
- No behavior regressions in:
  - auto-initialization on `new StandardDeck()`
  - mixin presence checks (`hasMixin` / `isX` guards)
  - snapshot output for the standard deck
