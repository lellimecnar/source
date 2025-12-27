---
goal: Card Stack Architecture Implementation Plan (polymix-first core + package scaffolds)
version: 1
date_created: 2025-12-26
last_updated: 2025-12-26
owner: lellimecnar
status: Planned
tags:
  - architecture
  - migration
  - polymix
  - card-stack
  - card-game
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan implements the requirements and contracts in spec/spec-architecture-card-stack.md by (1) migrating @card-stack/core from ts-mixer to polymix, (2) aligning exported entities and mixins to the spec’s public contracts (Card/CardSet/CardDeck/Player + capabilities), (3) adding deterministic serialization + deterministic shuffle support, and (4) scaffolding the required @card-stack/* and @card-game/* packages.

## 1. Requirements & Constraints

- **REQ-001**: Provide `@card-stack/core` as the canonical engine package.
- **REQ-002**: Provide one or more `@card-stack/deck-*` packages (at minimum `deck-standard`).
- **REQ-005**: Provide the package deliverables listed in spec Section 3.1.
- **REQ-010**: All mixins SHALL be implemented using `polymix` (packages/polymix).
- **REQ-011**: Each mixin SHALL have a singular purpose and a minimal surface area.
- **REQ-013**: Core primitives SHALL be constructed by composing mixins rather than deep inheritance chains.
- **REQ-015**: Capability composition MUST use `polymix` composition mechanisms (`mix`, `mixWithBase`, `@mixin`/`@Use`, `@delegate`, strategies).
- **CON-014**: Capability mixins and joined mixins MUST NOT extend other mixin classes via direct inheritance.
- **GUD-012**: Prefer `@mixin(M1, M2, ...) class X extends Base {}` as the default consumer-facing composition style.
- **GUD-013**: Use `mixWithBase(Base, ...)` when decorators are unavailable/undesirable or base constructor params must remain explicit.
- **REQ-020**: Public APIs SHALL be ergonomic and difficult to misuse.
- **REQ-021**: Public API errors SHALL include actionable messages.
- **REQ-030**: Serializable entities SHALL define stable serialization contracts.
- **REQ-031**: Serialization output SHALL be deterministic given the same input state.
- **CON-030**: Serialization formats MUST be backwards compatible within a major version.
- **REQ-040**: Documentation MUST enable new developers to build a custom deck and a simple game.
- **CON-040**: `@card-stack/docs` MUST be deployable as a static GitHub Pages site.
- **REQ-050**: `@card-stack/ui` SHALL provide framework-agnostic card rendering primitives.
- **CON-050**: `@card-stack/ui` MUST prefer Web Components + Tailwind CSS.
- **REQ-060**: `@card-stack/core` SHALL include comprehensive unit tests for all public mixins and primitives.
- **REQ-061**: Tests SHALL validate behavior, type-level constraints where possible, and serialization stability.
- **CON-070**: Workspace dependencies MUST use `workspace:*` protocol.
- **CON-071**: Packages MUST use shared configs (TypeScript/ESLint/Jest) per monorepo conventions.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Replace `ts-mixer` usage in `@card-stack/core` with `polymix` while keeping the package build/test green after each atomic migration step.

| Task     | Description                                                                                                                                                                                                                                                                                                          | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Update dependency graph: in card-stack/core/package.json remove `ts-mixer` from `dependencies` and add `polymix: "workspace:*"` (no other dependency version changes).                                                                                                                                               |           |      |
| TASK-002 | Refactor card-stack/core/src/utils.ts to stop importing `ts-mixer` and instead export polymix APIs used by this package: `mix`, `mixWithBase`, `hasMixin`, and (if used) `from` and `strategies`. Remove the `settings` mutation block entirely.                                                                     |           |      |
| TASK-003 | Refactor all `isX(...)` type guards in card-stack/core/src/utils.ts to use `polymix`’s `hasMixin(instance, Mixin)` without `require()`-based circular imports. Implement the type guards by importing concrete classes from their modules (explicit import list) and ensure there is no runtime require indirection. |           |      |
| TASK-004 | Update all internal imports currently using `Mix`/`mix` from ts-mixer to polymix composition. Apply the preferred pattern: decorate consumer-facing classes with `@mixin(...)` (from `polymix`) and keep `extends Base` explicit when a base class exists.                                                           |           |      |
| TASK-005 | Run validation for this phase: `pnpm --filter @card-stack/core test` and `pnpm --filter @card-stack/core lint`. The phase is complete only when both commands succeed without changes in test snapshots.                                                                                                             |           |      |

### Implementation Phase 2

- GOAL-002: Align `@card-stack/core` exported entity contracts (Card/CardSet/CardDeck/Player) to spec Section 4 (kinds, stable ids, deterministic iteration/array outputs).

| Task     | Description                                                                                                                                                                                                                                                                                                                     | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-006 | Introduce explicit core contract types in card-stack/core/src/types.ts: `export type CardId = string; export type PlayerId = string;` and any other spec-level ids that must be stable across serialization.                                                                                                                    |           |      |
| TASK-007 | Update card-stack/core/src/card/card.ts: add `readonly kind = 'card' as const;` and change `id` to match spec’s `CardId` (string). Implement `id` as a stable string derived from the current numeric id logic (use `toHex(...)` to produce a canonical string) and preserve `Symbol.toPrimitive` behavior accordingly.         |           |      |
| TASK-008 | Update card-stack/core/src/card-set/card-set.ts: add `readonly kind = 'card-set' as const;` and implement a stable `id: string` contract by composing the Indexable capability (migrated to polymix in Phase 3) or a dedicated Identifiable mixin. Add `toArray(): readonly T[]` returning a shallow copy of internal ordering. |           |      |
| TASK-009 | Update card-stack/core/src/card-deck/card-deck.ts: add `readonly kind = 'card-deck' as const;` and ensure it conforms to `CardSet` ordering + id contracts. Keep `CardDeck<TCard>` specialization minimal (no behavioral methods beyond kind/id unless explicitly specified by a mixin).                                        |           |      |
| TASK-010 | Update card-stack/core/src/player/player.ts: add `readonly kind = 'player' as const;` and add/align `playerId: PlayerId` with deterministic generation (either derived from Indexable hex id or explicit constructor arg).                                                                                                      |           |      |
| TASK-011 | Update all tests under card-stack/core/src/**.spec.ts to use the new string `id` shape and validate: (a) deterministic `toArray()` ordering, (b) correct `kind` strings.                                                                                                                                                        |           |      |
| TASK-012 | Run validation for this phase: `pnpm --filter @card-stack/core test`. Phase is complete only when tests pass.                                                                                                                                                                                                                   |           |      |

### Implementation Phase 3

- GOAL-003: Migrate all existing mixins in `@card-stack/core` to polymix (no direct inheritance between mixin classes) and keep mixins singular-purpose.

| Task     | Description                                                                                                                                                                                                                                                                                                                              | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-013 | Migrate shared identity/relationship mixins in card-stack/core/src/shared/*.ts to polymix-compatible classes (no ts-mixer interface/class declaration merging). At minimum: indexable.ts, parentable.ts, deckable.ts, ownable.ts, nameable.ts. Ensure any `init(...args)` logic is deterministic and side-effect scoped to the instance. |           |      |
| TASK-014 | Migrate card capability mixins in card-stack/core/src/card/{flippable,rankable,suitable}.ts to match spec semantics: `Flippable` MUST expose `isFaceUp`, `isFaceDown`, `flip()`, `flipUp()`, `flipDown()` and MUST NOT expose `flipped`. `Rankable`/`Suitable` MUST expose `isRank(...)` / `isSuit(...)`.                                |           |      |
| TASK-015 | Migrate CardSet mixins in card-stack/core/src/card-set/*.ts to polymix. Each mixin MUST validate it is composed with `CardSet` by using `instanceof CardSet` or `hasMixin(this, CardSet)` as appropriate. Keep thrown errors actionable (include mixin name and required base).                                                          |           |      |
| TASK-016 | Replace the ts-mixer-specific `init()` chaining assumptions with polymix’s per-mixin init behavior. For any mixin that needs base initialization ordering, make initialization explicit within the owning concrete class’s constructor/init or refactor init to be idempotent.                                                           |           |      |
| TASK-017 | Update all mixin unit tests under card-stack/core/src/**/**.spec.ts to validate: (a) capability methods, (b) `instanceof` or `hasMixin` checks for each capability, (c) no reliance on ts-mixer settings behavior.                                                                                                                       |           |      |
| TASK-018 | Run validation for this phase: `pnpm --filter @card-stack/core test` and `pnpm --filter @card-stack/core lint`. Phase is complete only when both commands succeed.                                                                                                                                                                       |           |      |

### Implementation Phase 4

- GOAL-004: Add deck-oriented mixins (Drawable/Dealable/Cuttable) and ensure deterministic shuffle support per acceptance criteria.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                         | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-019 | Create deck-oriented mixins in card-stack/core/src/card-deck/: add files drawable.ts, dealable.ts, cuttable.ts exporting classes `Drawable<TCard>`, `Dealable<TCard>`, `Cuttable<TCard>` and associated interfaces/types. Each MUST be singular-purpose and MUST be built on existing primitives (`Takeable`, `Giveable`, ordering mixins).                                                         |           |      |
| TASK-020 | Implement deterministic shuffle support by introducing a seedable PRNG utility in `@card-stack/utils` (created in Phase 7) and exposing an optional `{ seed: string }` parameter for shuffle operations (e.g., `shuffle({ seed })` and `toShuffled({ seed })`). If `seed` is omitted, behavior MAY remain non-deterministic, but deterministic behavior MUST be guaranteed when `seed` is provided. |           |      |
| TASK-021 | Add integration tests in card-stack/core/src/card-deck/**.spec.ts that validate AC-003 determinism: given the same seed and same initial ordering, shuffle results are identical.                                                                                                                                                                                                                   |           |      |
| TASK-022 | Run validation for this phase: `pnpm --filter @card-stack/core test`.                                                                                                                                                                                                                                                                                                                               |           |      |

### Implementation Phase 5

- GOAL-005: Implement deterministic, stable serialization contracts for cards/sets/decks and update existing serializer code to include capability-relevant fields.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                               | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-023 | Introduce a public serializer interface in card-stack/core/src/types.ts or a new module card-stack/core/src/serialization/types.ts: `export interface Serializer<TValue, TSerialized> { serialize(value: TValue): TSerialized; deserialize(serialized: TSerialized): TValue }`. Export it from card-stack/core/src/index.ts.                                                                                              |           |      |
| TASK-024 | Replace card-stack/core/src/card/card.serializer.ts to implement `Serializer<Card, SerializedCard>` where `SerializedCard` is a deterministic object including at minimum: `{ id: CardId; kind: 'card'; isFaceUp?: boolean; suit?: Suit; rank?: Rank }` (fields present only when capability exists). Ensure stable key order by constructing plain objects in a consistent property insertion order.                     |           |      |
| TASK-025 | Add set/deck serializers: create card-stack/core/src/card-set/card-set.serializer.ts and card-stack/core/src/card-deck/card-deck.serializer.ts implementing `Serializer<CardSet, SerializedCardSet>` / `Serializer<CardDeck, SerializedCardDeck>` using DAT-002: include `id`, `kind`, and an ordered array of contained serialized cards (or `{ ids, lookup }`), choosing exactly one format and documenting it in docs. |           |      |
| TASK-026 | Add round-trip tests for AC-004: serialize then deserialize preserves identity and capability fields for a representative StandardCard (from deck-standard) and a set/deck containing multiple cards.                                                                                                                                                                                                                     |           |      |
| TASK-027 | Run validation for this phase: `pnpm --filter @card-stack/core test` and `pnpm --filter @card-stack/deck-standard test` (after package naming is corrected in Phase 6).                                                                                                                                                                                                                                                   |           |      |

### Implementation Phase 6

- GOAL-006: Align `@card-stack/deck-standard` package naming, exports, and asset manifest contract (DAT-300 / REQ-300).

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                               | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-028 | Rename the package identifier in card-stack/deck-standard/package.json from `@card-stack/standard-deck` to `@card-stack/deck-standard`. Keep the folder name card-stack/deck-standard unchanged. Update any repo references to the old name via workspace search and replace.                                                                                                                             |           |      |
| TASK-029 | Update card-stack/deck-standard/src/standard-deck.ts to use polymix composition exported by `@card-stack/core` (prefer `@mixin(...)` on `StandardCard`/`StandardDeck` and keep base classes explicit). Ensure it compiles against the new core contracts (`id: string`, `kind`).                                                                                                                          |           |      |
| TASK-030 | Add a machine-readable deck asset manifest file in card-stack/deck-standard/src/assets/manifest.ts (or manifest.json) implementing the `DeckAssetManifest` contract from spec Section 4.7 with `deckId`, `version`, `backs`, and `faces`. If SVG assets do not yet exist, include placeholder URIs pointing to expected local paths and add a failing test marked `it.todo` to enforce future completion. |           |      |
| TASK-031 | Add tests for AC-005 in card-stack/deck-standard/src/standard-deck.spec.ts: loading the manifest yields resolvable asset references (for now: validate the URI format and that declared keys match expected suit/rank enumeration sizes).                                                                                                                                                                 |           |      |
| TASK-032 | Run validation for this phase: `pnpm --filter @card-stack/deck-standard test` and `pnpm --filter @card-stack/core test`.                                                                                                                                                                                                                                                                                  |           |      |

### Implementation Phase 7

- GOAL-007: Scaffold missing packages required by spec Section 3.1 using monorepo conventions and workspace dependencies.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                          | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-033 | Create `card-stack/utils/` as package `@card-stack/utils` with files: package.json (workspace deps), tsconfig.json (extends shared), jest.config.js (shared preset), src/index.ts. Implement deterministic utilities required by earlier phases: `createPrng(seed: string) => () => number` and `shuffleWithPrng<T>(items: readonly T[], prng) => T[]`.                                                                              |           |      |
| TASK-034 | Create `card-stack/ui/` as package `@card-stack/ui` (scaffold only) with src/index.ts exporting contract types for rendering (no framework binding) and a minimal Web Component skeleton file `src/card-element.ts` that can be built into a static bundle later. Do not add a design system beyond contract boundaries.                                                                                                             |           |      |
| TASK-035 | Create `card-stack/docs/` as package `@card-stack/docs` that produces a static site in `dist/` via a deterministic build script. Required files: package.json, tsconfig.json, README.md, and a build script `scripts/build.mjs` that converts Markdown in `content/` into static HTML in `dist/` using a pinned dependency (e.g., `marked`) declared in package.json. Add `dist` output path explicitly for GitHub Pages publishing. |           |      |
| TASK-036 | Scaffold remaining deck packages as empty, compilable packages with README and index exports (no assets yet): `card-stack/deck-uno`, `card-stack/deck-rook`, `card-stack/deck-trading`. Each MUST include an (empty) DeckAssetManifest export with versioned `deckId`.                                                                                                                                                               |           |      |
| TASK-037 | Scaffold `card-game/*` packages listed in spec Section 3.1 under a new top-level folder `card-game/` with minimal `src/index.ts` exports, package.json with `workspace:*` deps, and shared tsconfig/jest configs. No game implementations are required beyond contract scaffolds.                                                                                                                                                    |           |      |
| TASK-038 | Run validation for this phase: `pnpm -r --filter @card-stack/utils --filter @card-stack/ui --filter @card-stack/docs --filter @card-game/* test` (or `pnpm test` if turborepo pipeline is already configured for these packages). Phase is complete only when all scaffold packages type-check and tests (if present) pass.                                                                                                          |           |      |

## 3. Alternatives

- **ALT-001**: Keep `ts-mixer` and add a thin compatibility wrapper. Rejected because spec REQ-010 mandates polymix as the implementation mechanism.
- **ALT-002**: Use `extends mixWithBase(...)` everywhere instead of `@mixin(...)`. Rejected because spec GUD-012 prefers `@mixin(...)` to preserve explicit base classes and simplify capability changes.
- **ALT-003**: Implement docs as a Next.js app and `next export`. Rejected due to higher tooling complexity for a scaffold deliverable; a minimal static build pipeline is more deterministic for initial GitHub Pages deployment.

## 4. Dependencies

- **DEP-001**: `polymix` workspace package (packages/polymix) MUST be added as a dependency where mixins are implemented.
- **DEP-002**: Node.js `^20` and pnpm `^9` per monorepo tooling.
- **DEP-003**: Jest per-package testing (existing pattern in card-stack/core and card-stack/deck-standard).
- **DEP-004**: Optional `reflect-metadata` ONLY if runtime metadata reflection is required by docs/UI tooling; do not add unless a concrete requirement emerges.

## 5. Files

- **FILE-001**: card-stack/core/package.json (dependency switch to polymix).
- **FILE-002**: card-stack/core/src/utils.ts (remove ts-mixer settings; export polymix APIs; refactor type guards).
- **FILE-003**: card-stack/core/src/card/card.ts (entity contract alignment; polymix composition).
- **FILE-004**: card-stack/core/src/card/* (flippable/rankable/suitable migrations).
- **FILE-005**: card-stack/core/src/card-set/* (mixins migration; determinism).
- **FILE-006**: card-stack/core/src/card-deck/* (new deck mixins + serializer).
- **FILE-007**: card-stack/core/src/shared/* (indexable/parentable/etc migration).
- **FILE-008**: card-stack/deck-standard/package.json (rename to `@card-stack/deck-standard`).
- **FILE-009**: card-stack/deck-standard/src/standard-deck.ts (polymix composition + contract alignment).
- **FILE-010**: card-stack/deck-standard/src/assets/manifest.* (DeckAssetManifest).
- **FILE-011**: card-stack/utils/** (new package, deterministic PRNG + shuffle helpers).
- **FILE-012**: card-stack/docs/** (new package, static build output for GitHub Pages).
- **FILE-013**: card-stack/ui/** (new package scaffold).
- **FILE-014**: card-game/** (new package scaffolds for contracts).

## 6. Testing

- **TEST-001**: `@card-stack/core` unit tests for each migrated mixin and each public entity contract: run `pnpm --filter @card-stack/core test`.
- **TEST-002**: Deterministic shuffle integration test validating same-seed equality (AC-003) in `@card-stack/core`.
- **TEST-003**: Serialization round-trip tests for cards and sets/decks validating identity + capability fields (AC-004) in `@card-stack/core`.
- **TEST-004**: `@card-stack/deck-standard` tests validating manifest shape and coverage (AC-005): run `pnpm --filter @card-stack/deck-standard test`.
- **TEST-005**: Monorepo lint/type-check where applicable: `pnpm lint` and `pnpm type-check`.

## 7. Risks & Assumptions

- **RISK-001**: Changing `id` from number to string may break downstream consumers and existing tests; mitigate by updating all internal tests and deck-standard in the same phase and keep version at 0.0.0 until stable.
- **RISK-002**: Polymix `init()` ordering differs from ts-mixer; mitigate by making initialization idempotent and avoiding reliance on `super.init()` chains.
- **RISK-003**: Circular imports may surface when replacing `require()`-based type guards; mitigate by consolidating runtime type guards into modules that avoid importing from index barrels.
- **ASSUMPTION-001**: TypeScript legacy decorators (`experimentalDecorators`) remain enabled for `@card-stack/core` (confirmed in card-stack/core/tsconfig.json).
- **ASSUMPTION-002**: Deterministic shuffle acceptance is satisfied by a seedable PRNG + Fisher-Yates implementation.

## 8. Related Specifications / Further Reading

- spec/spec-architecture-card-stack.md
- packages/polymix/README.md
