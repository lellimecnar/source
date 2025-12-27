---
title: Card Stack Architecture Specification
version: 1.0
date_created: 2025-12-26
last_updated: 2025-12-26
owner: lellimecnar
tags:
  - architecture
  - card-stack
  - typescript
  - mixins
  - polymix
  - monorepo
---

## Introduction

This specification defines the architecture, requirements, constraints, and public interfaces for the `@card-stack/*` and `@card-game/*` family of packages, with emphasis on completing the `@card-stack/*` engine and deck packages.

This document is intended to be a self-contained, AI-ready specification. Existing repository code may be used as a reference model for style and feasibility, but this spec is the source of truth.

## 1. Purpose & Scope

### Purpose

- Provide a clear, testable set of requirements for:
  - A composable card engine built on TypeScript mixins and decorators.
  - Standard, reusable primitives for cards, collections of cards, decks, players, and shared behaviors.
  - A framework for deck packages (`@card-stack/deck-*`) that includes card designs as SVG.
  - A forward-compatible foundation for game packages (`@card-game/*`) and UI packages.

### Scope

This spec covers:

- `@card-stack/core` (primary focus): core primitives, mixins, decorators, serialization contracts, and testing.
- `@card-stack/docs` (primary focus): documentation deliverable requirements and content structure.
- `@card-stack/deck-*` packages (in-scope at contract level): standard deck(s) and a repeatable pattern for adding new decks.
- `@card-stack/ui` (in-scope at contract level): UI component principles and public API boundaries.
- `@card-game/*` packages (in-scope at contract level): standard interfaces for game logic and UI rendering.

Out of scope for this spec:

- Implementation of specific games beyond defining standard contracts.
- Full UI implementation details beyond API boundaries.
- Deployment mechanics beyond describing required deployability constraints.

### Audience

- Package maintainers and contributors.
- Developers building decks and games.
- Generative AI agents implementing features in this monorepo.

### Assumptions

- This is a pnpm + Turborepo monorepo.
- TypeScript is the primary language.
- Jest is the unit testing framework.
- Mixins and decorators MUST be created using `polymix` (`packages/polymix`).

## 2. Definitions

- **Card**: A single game object representing a playing card (e.g., “Ace of Spades”) with optional capabilities.
- **Deck**: An ordered collection of cards intended for drawing, shuffling, dealing, etc.
- **Card Set**: A collection abstraction used for hands, piles, discard piles, tableaux, etc.
- **Mixin**: A composable unit of behavior intended to be applied to classes to add capability.
- **Decorator**: A mechanism to annotate classes/mixins/fields to enable metadata-driven behavior (e.g., AI decision tree extraction).
- **Capability**: A semantic behavior added by a mixin (e.g., “flippable”, “rankable”, “suitable”).
- **Singular Purpose Mixin**: A mixin that adds exactly one conceptual capability.
- **Polymix**: The monorepo’s mixin/decorator toolkit located at `packages/polymix`.
- **Direct Inheritance (Anti-Pattern)**: Defining a capability mixin or joined mixin via `class X extends Y {}` where `Y` is another mixin class, creating inheritance chains between mixins.
- **Polymix Composition (Required Pattern)**: Composing capabilities by applying multiple mixin classes using `polymix` APIs (`mix`, `mixWithBase`, `@mixin`/`@Use`, `@delegate`, and strategy decorators such as `@pipe`/`@merge`), rather than building deep inheritance hierarchies.
- **SVG Asset**: Scalable Vector Graphics used to render card faces/backs.
- **Stable API**: A public export whose signature must not change without a documented breaking change.

## 3. Requirements, Constraints & Guidelines

### Package Structure

- **REQ-001**: The system SHALL provide `@card-stack/core` as the canonical engine package.
- **REQ-002**: The system SHALL provide one or more `@card-stack/deck-*` packages that can be used as-is or as bases for custom decks.
- **REQ-003**: The system SHALL define a standard interface contract for `@card-game/*` packages so `@card-game/ui-*` can render games consistently.
- **REQ-004**: The system SHALL define a standard interface contract for `@card-stack/ui` to render cards and collections.
- **REQ-005**: The system SHALL provide (at minimum) the package deliverables listed in **Section 3.1**.

### 3.1 Package Deliverables (Scaffolding Inventory)

This section is a canonical list of packages that are expected to exist in this monorepo for the `@card-stack/*` + `@card-game/*` architecture.

Status meanings:

- **Exists**: Package already exists in this repository.
- **Scaffold**: Package does not exist yet and MUST be created with an initial scaffold (package.json, tsconfig/jest config as applicable, public exports, and minimal README).

| Package name                     | Category    | Purpose                                                                                              | Status   |
| -------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- | -------- |
| `@card-stack/core`               | engine      | Core primitives, mixins, decorators, serialization, collections                                      | Exists   |
| `@card-stack/utils`              | shared      | Shared utilities for card-stack packages                                                             | Scaffold |
| `@card-stack/ui`                 | UI          | Framework-agnostic card/collection rendering primitives                                              | Scaffold |
| `@card-stack/docs`               | docs        | Engine + deck + game developer documentation; deployable to GitHub Pages                             | Scaffold |
| `@card-stack/deck-standard`      | deck        | Standard 52-card deck and SVG assets                                                                 | Exists   |
| `@card-stack/deck-uno`           | deck        | Uno deck and SVG assets                                                                              | Scaffold |
| `@card-stack/deck-rook`          | deck        | Rook deck and SVG assets                                                                             | Scaffold |
| `@card-stack/deck-trading`       | deck        | Trading card deck baseline and SVG assets                                                            | Scaffold |
| `@card-game/core`                | game-engine | Game runtime contracts + orchestration over `@card-stack/*`                                          | Scaffold |
| `@card-game/utils`               | shared      | Shared utilities for card-game packages                                                              | Scaffold |
| `@card-game/ai`                  | AI          | AI building blocks; decision-tree extraction pipeline contracts                                      | Scaffold |
| `@card-game/multiplayer`         | networking  | Multiplayer game engine contracts and runtime                                                        | Scaffold |
| `@card-game/online-multiplayer`  | networking  | Online multiplayer game engine contracts and runtime                                                 | Scaffold |
| `@card-game/ui-web`              | UI          | Web UI renderer implementation for `@card-game/core`                                                 | Scaffold |
| `@card-game/ui-react`            | UI          | React UI renderer implementation for `@card-game/core`                                               | Scaffold |
| `@card-game/ui-react-native`     | UI          | React Native UI renderer implementation for `@card-game/core`                                        | Scaffold |
| `@card-game/ui-expo`             | UI          | Expo UI renderer implementation for `@card-game/core`                                                | Scaffold |
| `@card-game/ui-svelte`           | UI          | Svelte UI renderer implementation for `@card-game/core`                                              | Scaffold |
| `@card-game/ui-vue`              | UI          | Vue UI renderer implementation for `@card-game/core`                                                 | Scaffold |
| `@card-game/ui-angular`          | UI          | Angular UI renderer implementation for `@card-game/core`                                             | Scaffold |
| `@card-game/solitaire`           | game        | Solitaire implementation using `@card-stack/*` and `@card-game/core` contracts                       | Scaffold |
| `@card-game/blackjack`           | game        | Blackjack implementation using `@card-stack/*` and `@card-game/core` contracts                       | Scaffold |
| `@card-game/poker`               | game        | Poker implementation using `@card-stack/*` and `@card-game/core` contracts                           | Scaffold |
| `@card-game/uno`                 | game        | Uno implementation using `@card-stack/deck-uno` and `@card-game/core` contracts                      | Scaffold |
| `@card-game/monopoly-deal`       | game        | Monopoly Deal implementation using `@card-stack/*` and `@card-game/core` contracts                   | Scaffold |
| `@card-game/magic-the-gathering` | game        | MTG implementation using `@card-stack/deck-trading` baseline and `@card-game/core` contracts         | Scaffold |
| `@card-game/pokemon`             | game        | Pokémon TCG implementation using `@card-stack/deck-trading` baseline and `@card-game/core` contracts | Scaffold |
| `@card-game/nertz`               | game        | Nertz implementation using `@card-stack/*` and `@card-game/core` contracts                           | Scaffold |
| `@card-game/idiot`               | game        | Idiot implementation using `@card-stack/*` and `@card-game/core` contracts                           | Scaffold |
| `@card-game/spit`                | game        | Spit implementation using `@card-stack/*` and `@card-game/core` contracts                            | Scaffold |
| `@card-game/go-fish`             | game        | Go Fish implementation using `@card-stack/*` and `@card-game/core` contracts                         | Scaffold |
| `@card-game/phase-10`            | game        | Phase 10 implementation using `@card-stack/*` and `@card-game/core` contracts                        | Scaffold |

### 3.2 Mixin Inventory (Create / Modify / Rewrite)

This section lists the mixins that the `@card-stack/core` engine is expected to provide.

Repository reality check (current state): `@card-stack/core` currently implements these mixins using `ts-mixer` (via `Mix` and `@mix`). To satisfy **REQ-010** and the polymix-first constraints in this specification, these mixins SHALL be **rewritten/migrated** to `polymix`.

Status meanings:

- **Rewrite**: Exists today, but MUST be migrated to `polymix` APIs and aligned with the `@mixin(...)` preference rules.
- **Create**: Does not exist yet and MUST be implemented.

#### 3.2.1 Card-Scoped Mixins (Capabilities)

| Mixin       | Scope  | Primary responsibility                   | Status  |
| ----------- | ------ | ---------------------------------------- | ------- |
| `Flippable` | `Card` | Face up/down state + `flip()` operations | Rewrite |
| `Rankable`  | `Card` | Rank state + rank helpers/comparators    | Rewrite |
| `Suitable`  | `Card` | Suit state + suit helpers/comparators    | Rewrite |

#### 3.2.2 Collection-Scoped Mixins (CardSet / Deck Operations)

These are intended to compose onto `CardSet<TCard>` and `CardDeck<TCard>`.

| Mixin         | Scope            | Primary responsibility                                                | Status  |
| ------------- | ---------------- | --------------------------------------------------------------------- | ------- |
| `Atable`      | `CardSet<TCard>` | Array-like accessors/operations (non-mutating views)                  | Rewrite |
| `Chunkable`   | `CardSet<TCard>` | Partition into chunks                                                 | Rewrite |
| `Eachable`    | `CardSet<TCard>` | Iteration helpers                                                     | Rewrite |
| `Findable`    | `CardSet<TCard>` | Query/search helpers                                                  | Rewrite |
| `Giveable`    | `CardSet<TCard>` | Give/transfer cards to another set                                    | Rewrite |
| `Groupable`   | `CardSet<TCard>` | Grouping (e.g., by suit/rank/predicate)                               | Rewrite |
| `Hasable`     | `CardSet<TCard>` | Membership checks                                                     | Rewrite |
| `Mappable`    | `CardSet<TCard>` | Map/transform helpers                                                 | Rewrite |
| `Reduceable`  | `CardSet<TCard>` | Reduce/fold helpers                                                   | Rewrite |
| `Reversible`  | `CardSet<TCard>` | Reverse ordering                                                      | Rewrite |
| `Shuffleable` | `CardSet<TCard>` | Shuffle ordering deterministically (policy defined by implementation) | Rewrite |
| `Sortable`    | `CardSet<TCard>` | Sort ordering deterministically                                       | Rewrite |
| `Takeable`    | `CardSet<TCard>` | Take/remove cards from a set (by count/predicate)                     | Rewrite |

#### 3.2.3 Shared / Cross-Cutting Mixins (Identity, Relationships)

These are intended to apply across `Card`, `CardSet`, `CardDeck`, and/or `Player`.

| Mixin              | Scope    | Primary responsibility                                      | Status  |
| ------------------ | -------- | ----------------------------------------------------------- | ------- |
| `Indexable`        | many     | Stable per-class indexing / instance lookup support         | Rewrite |
| `Parentable<T>`    | many     | Parent relationship + ancestry queries                      | Rewrite |
| `Deckable<D>`      | many     | Owns/points to a deck; propagates ownership when applicable | Rewrite |
| `Ownable<TPlayer>` | deck/set | Owner link (typically a `Player`)                           | Rewrite |
| `Nameable`         | many     | Display name                                                | Rewrite |

#### 3.2.4 Player Mixins

| Mixin         | Scope    | Primary responsibility                          | Status  |
| ------------- | -------- | ----------------------------------------------- | ------- |
| `Handable<H>` | `Player` | Hand ownership/management (hand is a `CardSet`) | Rewrite |
| `Scoreable`   | `Player` | Score tracking                                  | Rewrite |

#### 3.2.5 Missing Deck-Oriented Mixins (Planned)

These are implied by the monorepo’s card-stack goals (deck ergonomics) and are expected additions beyond the current `CardSet` primitives.

| Mixin             | Scope             | Primary responsibility                                        | Status |
| ----------------- | ----------------- | ------------------------------------------------------------- | ------ |
| `Drawable<TCard>` | `CardDeck<TCard>` | Draw/peek from top/bottom; convenience over `Takeable`        | Create |
| `Dealable<TCard>` | `CardDeck<TCard>` | Deal to hands/sets/players (built on `Drawable` + `Giveable`) | Create |
| `Cuttable<TCard>` | `CardDeck<TCard>` | Cut/split and rejoin deterministically                        | Create |

Note: The implementation of `Drawable`/`Dealable` MUST remain deterministic and MUST reuse existing primitives (`Takeable`, `Giveable`, ordering mixins) rather than introducing deep inheritance.

### Mixins & Composition

- **REQ-010**: Mixins SHALL be implemented using `polymix`.
- **REQ-011**: Each mixin SHALL have a singular purpose and a minimal surface area.
- **REQ-012**: Mixins MAY be composed into “joined mixins” when a combination is commonly used, but joined mixins SHALL remain small and reusable.
- **REQ-013**: Core primitives (e.g., `Card`, `Deck`, `CardSet`) SHALL be constructed by composing mixins rather than deep inheritance chains.
- **CON-014**: Capability mixins and joined mixins MUST NOT extend other mixin classes via direct inheritance (e.g., `class A extends B {}` where `B` is a mixin).
- **REQ-015**: Capability composition MUST use `polymix` composition mechanisms.
- **GUD-012**: `@mixin(M1, M2, ...)` (or `@Use(...)`) SHOULD be the default/preferred composition style for consumer-facing classes because it preserves an explicit base class and keeps mixin composition visually separated from inheritance.
- **GUD-013**: The criteria for choosing `@mixin(...)` vs `extends mix(...)` / `mixWithBase(...)` SHALL be:
  - Choose `@mixin(...)` when:
    - You want to keep `extends Base` explicit (or keep an existing `extends` unchanged).
    - You want to add or remove capabilities without changing the inheritance clause.
    - The project is configured to support legacy TypeScript decorators (`experimentalDecorators`) or an equivalent compatible decorator pipeline.
  - Choose `extends mixWithBase(Base, ...)` when:
    - The base class constructor requires parameters and you want the most explicit constructor/base story without relying on decorator transforms.
    - Decorators are unavailable or undesirable in the target package/tooling.
  - Choose `extends mix(M1, M2, ...)` only when:
    - There is no meaningful base class beyond the mixins themselves, and
    - Decorators are unavailable or undesirable.
- **PAT-015**: Composition patterns (normative):
  - Preferred: `@mixin(M1, M2, ...) class X extends Base {}`
  - Explicit base: `class X extends mixWithBase(Base, M1, M2, ...) {}`
  - No base: `class X extends mix(M1, M2, ...) {}`
- **GUD-011**: Prefer `mixWithBase(Base, ...)` over `mix(...)` when the base class has constructor parameters.
- **GUD-010**: Public mixin methods SHOULD be deterministic and side-effect scoped to the instance.

### Developer Ergonomics

- **REQ-020**: Public APIs SHALL be ergonomic to consume and difficult to misuse.
- **REQ-021**: Errors thrown by public APIs SHALL include actionable messages.
- **GUD-020**: Prefer simple, explicit method names (e.g., `shuffle()`, `take(n)`, `find(...)`).

### Serialization & Determinism

- **REQ-030**: Serializable entities (cards, sets, decks, game state) SHALL define stable serialization contracts.
- **REQ-031**: Serialization output SHALL be deterministic given the same input state.
- **CON-030**: Serialization formats MUST be backwards compatible within a major version.

### Documentation

- **REQ-040**: The system SHALL provide documentation and examples sufficient for a new developer to:
  - Build a custom deck package.
  - Build a simple game package.
  - Compose mixins to define new card types.
- **CON-040**: `@card-stack/docs` MUST be deployable as a static GitHub Pages site.

### UI

- **REQ-050**: `@card-stack/ui` SHALL provide framework-agnostic UI components for rendering cards.
- **CON-050**: `@card-stack/ui` MUST prefer Web Components + Tailwind CSS for greatest framework compatibility.

### Testing

- **REQ-060**: `@card-stack/core` SHALL include comprehensive unit tests for all public mixins and primitives.
- **REQ-061**: The test suite SHALL validate behavior, type-level constraints (where possible), and serialization stability.

### Monorepo Constraints

- **CON-070**: Workspace dependencies MUST use `workspace:*` protocol.
- **CON-071**: Packages MUST follow monorepo conventions for TypeScript config and linting (shared configs).

## 4. Interfaces & Data Contracts

This section defines public contracts. Implementations may vary, but exported types and behaviors must conform.

### 4.1 Core Entity Contracts

#### Card Identity

- **PAT-100**: A card SHOULD have a stable identifier used for serialization and UI reconciliation.

Type shape (conceptual):

```ts
type CardId = string

interface Identifiable {
  readonly id: CardId
}
```

#### Base Card

```ts
interface CardBase extends Identifiable {
  readonly kind: 'card'
}
```

### 4.2 Capability Mixins (Examples)

The system MUST provide (at minimum) the following capability mixins, with these semantics.

Implementation note: these examples describe **public semantics**. Implementations SHOULD be class-based mixins composed via `polymix` (Section 3), not via direct inheritance between mixins.

#### Suitable

```ts
type Suit = string

interface Suitable {
  readonly suit: Suit
  isSuit(suit: Suit): boolean
}
```

#### Rankable

```ts
type Rank = string

interface Rankable {
  readonly rank: Rank
  isRank(rank: Rank): boolean
}
```

#### Flippable

```ts
interface Flippable {
  readonly isFaceUp: boolean
  readonly isFaceDown: boolean
  flip(): void
  flipUp(): void
  flipDown(): void
}

```

#### Polymix Composition Example (Non-Normative)

This example illustrates how to compose capabilities without deep inheritance.

```ts
import { abstract, delegate, mix, mixWithBase, mixin, pipe } from 'polymix'

type CardId = string
type Suit = string
type Rank = string

class CardBase {
  readonly kind = 'card' as const
}

@abstract
class Identifiable {
  readonly id: CardId = 'n/a'
}

class Suitable {
  readonly suit: Suit = 'n/a'
  isSuit(suit: Suit) {
    return this.suit === suit
  }
}

class Rankable {
  readonly rank: Rank = 'n/a'
  isRank(rank: Rank) {
    return this.rank === rank
  }
}

class Flippable {
  private _isFaceUp = false
  get isFaceUp() {
    return this._isFaceUp
  }
  get isFaceDown() {
    return !this._isFaceUp
  }
  flip() {
    this._isFaceUp = !this._isFaceUp
  }
  flipUp() {
    this._isFaceUp = true
  }
  flipDown() {
    this._isFaceUp = false
  }
}

// Preferred: keep an explicit base class and layer capabilities via a class decorator.
@mixin(Identifiable, Suitable, Rankable, Flippable)
class StandardCardDecorated extends CardBase {}

// Alternative: use an explicit base + joined mixin composition.
// (Preferred over deep inheritance, but less preferred than `@mixin(...)` when decorators are available.)
class StandardCardCaps extends mix(Identifiable, Suitable, Rankable, Flippable) {}
class StandardCard extends mixWithBase(CardBase, StandardCardCaps) {}

// Optional: demonstrate decorator utilities for layering behavior.
class Normalizer {
  normalizeSuit(suit: Suit) {
    return suit.trim().toLowerCase()
  }
}

class SuitRules {
  @pipe
  normalizeSuit(_suit: Suit) {
    return ''
  }
}

class SuitSystem extends mix(Normalizer, SuitRules) {
  @delegate(Normalizer)
  helper = new Normalizer()
}
```

### 4.3 Collection Contracts

#### CardSet

`CardSet` represents a collection abstraction with common behaviors.

```ts
interface CardSet<TCard extends CardBase = CardBase> extends Identifiable {
  readonly kind: 'card-set'
  readonly size: number
  toArray(): readonly TCard[]
}
```

#### CardDeck

`CardDeck` is a specialized set intended for standard deck operations.

```ts
interface CardDeck<TCard extends CardBase = CardBase> extends CardSet<TCard> {
  readonly kind: 'card-deck'
}
```

### 4.4 Behavior Mixins for Collections

The system SHOULD provide mixins that can be applied to `CardSet`/`CardDeck` implementations.

Minimum expected behavior categories:

- **PAT-200**: Traversal (`each`, `map`, `reduce`).
- **PAT-201**: Query (`find`, `has`, `groupBy`).
- **PAT-202**: Mutation (`take`, `give`, `shuffle`, `sort`, `reverse`).
- **PAT-203**: Partitioning (`chunk`).

### 4.5 Player Contracts

```ts
type PlayerId = string

interface PlayerBase extends Identifiable {
  readonly kind: 'player'
  readonly playerId: PlayerId
}
```

Player mixins MAY include:

- `Handable`: owns/has a hand (a `CardSet`).
- `Scoreable`: tracks score.
- `Nameable`: has a display name.

### 4.6 Serialization Contracts

#### Core Serializer Interface

```ts
interface Serializer<TValue, TSerialized> {
  serialize(value: TValue): TSerialized
  deserialize(serialized: TSerialized): TValue
}
```

#### Minimum Serialization Requirements

- **DAT-001**: Serialized card data SHALL include `id` and capability-relevant fields (e.g., `suit`, `rank`, `isFaceUp`).
- **DAT-002**: Serialized set/deck data SHALL include `id` and an ordered list of contained serialized cards (or card ids with a lookup table).

### 4.7 Deck Package Asset Contract

- **REQ-300**: Each `@card-stack/deck-*` package SHALL include SVG assets for each card face and at least one back design.
- **DAT-300**: Deck asset manifests SHALL be machine-readable and map card identity → SVG asset reference.

Example manifest shape:

```ts
type AssetUri = string

interface DeckAssetManifest {
  readonly deckId: string
  readonly version: string
  readonly backs: Record<string, AssetUri>
  readonly faces: Record<string, AssetUri>
}
```

## 5. Acceptance Criteria

- **AC-001**: Given a `Card` with the `Flippable` capability, When `flipUp()` is called, Then `isFaceUp` is `true` and `isFaceDown` is `false`.
- **AC-002**: Given a `CardSet`, When `toArray()` is called multiple times without mutation, Then it returns equal ordered contents each time.
- **AC-003**: Given a `CardDeck` with a deterministic shuffle seed strategy (if supported), When shuffling with the same seed, Then the resulting order is identical.
- **AC-004**: Given a serializable `Card`, When serialized and then deserialized, Then the resulting card preserves identity and capability fields.
- **AC-005**: Given a `@card-stack/deck-*` package, When its asset manifest is loaded, Then every declared card face maps to a resolvable SVG asset reference.
- **AC-006**: Given a consumer package, When importing public APIs, Then imports are stable and documented (no reliance on private paths).

## 6. Test Automation Strategy

- **Test Levels**:
  - Unit: All mixins and core primitives in `@card-stack/core`.
  - Integration: Deck + core integration (e.g., `@card-stack/deck-standard` cards used in `@card-stack/core` collections).
- **Frameworks**:
  - Jest for unit/integration.
- **Test Data Management**:
  - Tests SHOULD generate cards/decks deterministically.
  - No reliance on wall-clock time.
- **CI/CD Integration**:
  - Tests MUST be runnable from repo root via pnpm filtering.
- **Coverage Requirements**:
  - All public mixin methods MUST have coverage.
- **Performance Testing**:
  - Optional: microbenchmarks for shuffle/sort operations if performance regressions are observed.

## 7. Rationale & Context

- Mixins enable reusable, composable card behaviors across many games and decks.
- `polymix` is mandated to ensure consistent composition patterns, metadata extraction, and developer ergonomics.
- Standardized serialization is required for multiplayer, persistence, replay, and tooling.
- Deck packages providing SVG assets make UI rendering deterministic and portable.

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: GitHub Pages - static hosting target for `@card-stack/docs`.

### Third-Party Services

- **SVC-001**: None required by default. (Optional future: analytics for docs site.)

### Infrastructure Dependencies

- **INF-001**: pnpm workspaces + Turborepo task pipeline.

### Data Dependencies

- **DAT-801**: SVG assets for card faces/backs stored within deck packages.

### Technology Platform Dependencies

- **PLT-001**: Node.js ^20.
- **PLT-002**: TypeScript (workspace standard; version defined by monorepo tooling).
- **PLT-003**: Jest for tests.

### Compliance Dependencies

- **COM-001**: None specified.

## 9. Examples & Edge Cases

```ts
// Example edge cases to test (conceptual):
// 1) Flipping an already face-up card should be idempotent.
// 2) Taking more cards than exist should throw a clear error or clamp deterministically (choose one policy per API).
// 3) Serializing a deck with duplicate card IDs should be rejected.
// 4) Sorting with unknown ranks should have a deterministic fallback.
```

## 10. Validation Criteria

- **VAL-001**: `@card-stack/core` exports conform to the contracts in Section 4.
- **VAL-002**: All acceptance criteria in Section 5 are covered by automated tests.
- **VAL-003**: Deck packages include a machine-readable asset manifest and resolvable SVG assets.
- **VAL-004**: Public APIs are documented and do not require consumers to import private/internal modules.
- **VAL-005**: Documentation for creating a new deck and composing a new card type exists and is accurate.

## 11. Related Specifications / Further Reading

- ../card-stack/SPEC.md
- ../packages/polymix/README.md
- ../AGENTS.md
