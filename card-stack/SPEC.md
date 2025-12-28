# `@card-stack/*` and `@card-game/*` Packages

Finish building the `@card-stack/*` and `@card-game/*` packages, according to the following guidelines:

- The current code is only a draft/proof of concept, and should be viewed as inspiration only, not final code, or even as a reference implementation.
- Refactor/rewrite current code when it contradicts this file, or is incompatible or irrelevant.
- Discard any/all reference or influence from `ts-mixer` and only use `polymix` for mixins.
- Use `instanceof` checks for mixins rather than `hasMixin`.

## Repo layout

- `@card-stack/*` packages live under `card-stack/*`.
- `@card-game/*` packages live under `card-stack/game/*`.

## MVP

The MVP for `@card-game/*` is a completely functional Solitaire game with a React UI.

- Game package: `@card-game/solitaire`
- UI package: `@card-game/ui-react`
- Input support: mouse on desktop and touch on mobile

The Solitaire MVP MUST include an in-game settings screen, rendered by the UI package from a standard settings schema provided by the game.

- Options MUST include (at minimum):
  - Klondike draw mode: draw 1 vs draw 3
  - Vegas scoring mode (on/off)
  - Standard scoring rules (selectable)
  - Auto-move to foundation (on/off)
  - Undo (on/off)

Required interactions (mouse + touch):

- Drag & drop
- Tap to flip
- Double tap to move
- Long-press for hint

Double tap behavior (Solitaire MVP):

- Double tap MUST attempt to move the tapped card (or the maximal legal run for that stack) to the best legal destination.
- If multiple legal destinations exist, ties do not matter.

Hint behavior (Solitaire MVP):

- Long-press hint MUST use the AI decision tree/graph and the same move-selection logic as an AI player.
- Hint output MUST be the recommended move(s), sorted by score (best first).
- Each recommended move MUST be returned as a serializable “move descriptor” that can be applied as though a human initiated it.
  - For a move that transfers cards, the descriptor MUST include enough information to execute the move deterministically, including (at minimum):
    - the card (or cards) being moved
    - the `CardSet` it is coming from
    - the `CardSet` it is going to
    - the destination index/position when applicable
  - Move descriptors MUST reference entities by `id` only (see `Idable`).

## Packages

### `@card-stack/*`

Core card game engine packages

- `@card-stack/core`
  - Core card game engine using TypeScript mixins
  - Each mixin must have a singular purpose
  - Mixins can be made joining other mixins which are commonly used together
  - Mixins should be as small as possible, and should not be too complex
  - Mixins should be as reusable as possible, and should not be too specific
  - Mixins are reusable building blocks like:
    - `Suitable`: Adds `suit` (e.g., 'Hearts', 'Spades'), comparison operators, etc.
    - `Rankable`: Adds `rank` (e.g., 'Ace', 'King'), comparison operators, etc.
    - `Flippable`: Adds `flipped`, `isFaceUp`, `isFaceDown`, `flip()`, `flipUp()`, `flipDown()`, etc.
  - Classes like `Card`, `CardStack`, `Deck`, etc. use mixins to compose behaviors
    - `Deck` extends `CardStack`, and adds mixins like `Shuffleable`, `Ownable`, `Drawable`, etc.
- `@card-stack/docs`
  - Documentation for the card game engine, all of its packages, the games, decks, AI agents, how to create new decks, games, AI agents, etc.
  - It should be deployable as a static GitHub Pages site.
- `@card-stack/ui`
  - UI components for rendering cards, using Web Components and Tailwind CSS, intended for greatest compatibility with other frameworks, (e.g. React, Vue, Svelte, etc.)
- `@card-stack/utils`:
  - Shared utilities
- `@card-stack/deck-*`
  - Deck packages for popular types of decks, such as:
    - `@card-stack/deck-standard`: Standard 52-card deck
    - `@card-stack/deck-uno`: Uno deck
    - `@card-stack/deck-rook`: Rook deck
    - `@card-stack/deck-trading`: Trading card deck
  - Each deck package should provide the design of each card as SVGs
  - Deck packages can be used as-is, or as a base for creating custom decks
    - `@card-game/pokemon` would use `@card-stack/deck/trading` as a base
    - `@card-game/poker` would use `@card-stack/deck/standard` as a base

### `@card-game/*`

Game-specific card game packages, including gameplay logic, UI components, table layouts, game-specific decks, AI agents, game-specific configurations, etc.

All `@card-game/*` packages in this repo live under `card-stack/game/*`.

For MVP, implement `@card-game/solitaire` rendered by `@card-game/ui-react`.

- `@card-game/core`
  - Core game engine using `@card-stack/*` packages
- `@card-game/ui`
  - Shared UI-layer building blocks used by framework-specific UI packages (`@card-game/ui-react`, `@card-game/ui-vue`, etc.)
  - Provides mixins and presets for rendering and layout concepts and interaction primitives (e.g. draggable/droppable)
  - Layout mixins MUST include configurable presets such as:
    - `VerticalLayout`
    - `HorizontalLayout`
    - `GridLayout`
    - `FanLayout`
  - Layout mixins SHOULD be configurable via `configMixin(...)`.
    - Example: `FanLayout.configMixin({ cardClassName })`
    - Any `className`-like property (including `cardClassName`) MUST accept:
      - `string`
      - `string[]`
      - `(...args: any[]) => string | string[]`
    - When a `className` is a function, its arguments are context-dependent based on what the `className` is applied to.
      - For example, `cardClassName` MUST receive (at minimum) the card, its index in the rendered set, and enough context to compute per-card styling (e.g. rotation based on index).
    - Tailwind class strings MUST allow Tailwind “subpart targeting” patterns (e.g. arbitrary variants / selector variants) so a single `className` can style sub-elements.
- `@card-game/ui-*`
  - UI components for rendering games
    - `@card-game/ui-web`: Web UI components
    - `@card-game/ui-react`: React UI components
    - `@card-game/ui-react-native`: React Native UI components
    - `@card-game/ui-expo`: Expo UI components
    - `@card-game/ui-svelte`: Svelte UI components
    - `@card-game/ui-vue`: Vue UI components
    - `@card-game/ui-angular`: Angular UI components
  - Each UI package is framework-specific, but MUST accept the root `Game` class (or instance) for a game as the source of truth for rendering.
  - Runtime game state management is UI-framework-specific (e.g. React context/reducers/hooks) but MUST be derived from the `Game` class, which contains all information required to render and interact.
  - Each game MUST expose standard, UI-parsable schemas for things like settings screens and table layouts.
    - The UI package MUST be able to render a game’s settings screen purely from the game-provided schema (plus current values) and apply changes back to the game.
    - The UI package MUST be able to lay out the table purely from the game-provided schema (plus current game state) and bind interactions.
    - Each game MUST expose a single schema object for UI rendering and interaction binding (rather than splitting data schema vs UI schema objects).
      - The schema MUST be generic/agnostic and describe the exact UI to render without baking in assumptions about layout systems.
      - The schema SHOULD be a tree of nodes describing UI + bindings (similar in spirit to JSON Forms / ui-schema / rjsf), but not coupled to any one of them.
      - Node `type` values MUST be derived from the mixins used (and therefore be highly customizable and composable).
        - Example: a node representing a drop zone might derive its type from mixing in `Droppable`.
        - Node `type` MUST be expressed as a single string.
        - Nodes MAY include explicit mixin metadata (e.g. a list of mixin identifiers) to support type derivation and renderer selection.
        - Node `type` naming convention:
          - `type` MUST be composed of class names (not mixin names).
          - Class names MUST be delimited by `:`.
          - Class names MUST be ordered from least specific to most specific (most specific at the end).
          - Examples: `CardSet:FanLayout`, `Deck:PileLayout`, `River:StackLayout`.
        - Note: schema node `type` is for UI rendering only.
      - Nodes MUST be able to reference game entities using stable IDs.
        - Entities MUST be referenced by `Idable.id`.
        - Nodes MUST include an `entityId` field when the node binds to a specific game entity, so a UI package can look up the entity directly from the `Game` instance.
        - Nodes MAY alternatively bind to multiple entities via a query binding, so UI packages can render collections.
          - Query bindings MUST use a standardized, generic query language.
          - Query bindings MUST be serializable.
          - Query `type` MUST refer to the runtime entity class name (e.g. `"Card"`, `"CardSet"`), not the schema node `type` string.
          - Minimum required query shapes:
            - `{"kind":"all","type":"Card"}` (all entities of a class)
            - `{"kind":"byId","type":"Card","ids":["..."]}` (explicit ID list)
            - `{"kind":"childrenOf","type":"Card","parentType":"CardSet","parentId":"..."}` (children / contained entities)
              - `childrenOf` MUST be defined in terms of `Childrenable` storage (via configuration) for types like `Deck`, `CardSet`, etc.
            - `{"kind":"filter","source":{...query...},"where":{...jsonfn...}}` (filtered sub-selection)
              - The `where` function MUST receive a standardized argument shape.
                - Minimum required args: `{ entity, game }`.
      - The schema and all entity references used by the schema MUST be serializable so it can be persisted and rehydrated.
      - Persistence/rehydration MUST use a normalized format with a canonical top-level shape.
        - The canonical shape MUST avoid circular references and MUST allow reconstructing object graphs by `id`.
        - Serialized entities MUST store relationships by `id` only (no nested entity objects).
        - Canonical shape (names may vary, structure must match):
          - `game: { id: string; type: string; createdAt?: string }`
          - `schema: unknown` (the single UI schema object)
          - `entities: Record<string /* type */, Record<string /* id */, unknown /* serialized entity */>>`
          - `roots?: Record<string /* label */, string /* id */ | string[] /* ids */>`
    - UI schemas MUST follow established “render UI from JSON” patterns as inspiration, including:
      - JSON Forms UI Schema: https://jsonforms.io/docs/uischema/
      - ui-schema: https://github.com/ui-schema/ui-schema
      - react-jsonschema-form (rjsf): https://rjsf-team.github.io/react-jsonschema-form/docs/
    - Table/layout schemas MUST use Tailwind class strings as the primary styling mechanism.
      - `className`-like properties in schemas MUST accept `string | string[] | ((...args: any[]) => string | string[])`.
      - Tailwind class strings MUST allow Tailwind “subpart targeting” patterns (e.g. arbitrary variants / selector variants).
    - A `CardSet` is rendered into a table/layout via renderer mixins/presets (e.g. stack, fan, spread) provided by `@card-game/ui`. There is no standalone “CardSet layout”.
  - UI schemas MUST support computed/conditional fields and dynamic values.
    - Use a `jsonfn`-style approach to embed simple, sandbox-scoped functions inside schema JSON.
    - Functions MAY access basic JavaScript global APIs, but MUST NOT have access to the DOM.
    - Functions MUST only receive the minimal game state needed for evaluation.
    - Functions SHOULD be treated as read-only and intended for dynamic rendering needs (labels, derived values, conditional visibility).
    - Future enhancement may allow broader use, but current MVP should avoid side-effectful schema functions.

  - Accessibility metadata:
    - UI schemas SHOULD be able to provide accessibility metadata for rendered elements (labels, descriptions, roles, announcements, etc.).
    - Defaults for accessibility metadata SHOULD be derived from the mixins used (e.g. a `Flippable` card can derive “face down / face up” state).
    - The schema MUST allow manually overriding any derived accessibility values when needed.
    - Override precedence MUST be “by specificity” (most specific wins).
      - Example precedence (most specific -> least specific): node-level override -> component/preset-level override -> mixin-derived default.
    - Accessibility overrides MAY use `jsonfn` functions for dynamic/conditional values.

  - Settings are expected to persist.
    - Includes global settings (e.g. player name, card style, UI theme)
    - Includes game-specific settings (e.g. Solitaire draw 1 vs 3)
    - Persistence and storage mechanisms are owned by each UI package.

### Drag & drop (UI contract)

- Layout schemas MUST be able to declare `Droppable` areas.
- Layout schemas MUST be able to declare `Draggable` sources and `Droppable` areas.
- A `Draggable` MAY be configured to allow multi-card drags (game-defined).
- A `Droppable` MAY be configured to accept multiple cards at once.
- `Draggable` MUST provide an `onDragStart` hook/event that includes:
  - the target card (when `canDrag` returned `true`)
  - any additional “stacked” cards included in the drag (when multi-card drag is enabled)
- While dragging, when a card is dragged into a `Droppable` area, the UI MUST call `canDrop(draggedCard, draggedCards)`.
  - If `canDrop(...)` returns `true`, the UI should treat the drop target as valid.
  - If `canDrop(...)` returns anything other than `true`, the UI MUST reflect the rejection before the drag is released (e.g. card turns red).
  - If `canDrop(...)` returns a string, that string MUST be used by the UI as the rejection message.
  - `canDrop(...)` MAY also return a structured result for richer UX.
    - If a structured result is returned, it MUST include enough information for the UI package to determine the appropriate UX response (e.g. toast vs modal vs inline alert vs sound).
    - At minimum, the structured result MUST contain:
      - `ok: boolean`
      - `message?: string`
      - `severity?: "info" | "warning" | "error"`
      - `ui?: { kind: "toast" | "modal" | "alert" | "sound" | "none"; layout?: Record<string, unknown>; [key: string]: unknown }`
        - `ui.kind` MUST be standardized across `@card-game/ui-*` packages.
        - The standardized set MUST be sufficient for the games listed in this document (and similar game types).
        - There MUST be a base set of `ui.kind` values shared across all UI packages, but game/UI packages MAY extend it as needed.
        - `ui.layout` MAY be used to specify an exact UI layout/placement/config for the response.
        - The shape beyond `kind` (and the internal schema of `layout`) is UI-implementation-defined.

Tailwind state styling hooks:

- During interactions (hover, drag enter/leave, active drop target, etc.), UI renderers MUST set `data-*` attributes on relevant elements so Tailwind attribute selectors can be used for conditional styling.
  - This should follow the same general approach commonly used with Tailwind in component libraries (e.g. selectors like `data-[state=open]:...`).
  - Where possible, the attribute vocabulary SHOULD be standardized across `@card-game/ui-*` packages.
  - However, each UI package MAY adapt the exact attributes and conventions to match framework-specific standards and best practices.
  - The attribute set MUST include enough information to style at least: hover, dragging, valid drop target, invalid drop target.

`canDrop` ownership:

- `canDrop` is an abstract method of the `Droppable` mixin.
- In game packages, drop zones SHOULD be modeled as `CardSet` classes that mix in `Droppable` and implement `canDrop(...)` with zone-specific rules.
  - Each UI package has a standard conceptual API which is used by `@card-game/core` for actually rendering the game, laying out the cards, handling user interactions, showing game messages, etc.
  - UI should be smooth, responsive, visually appealing, accessible, intuitive, extendable, customizable, have satisfying animations, etc.
  - The `@card-game/<game-name>` package is passed to the `@card-game/ui-*` package for rendering the game
- `@card-game/utils`
  - Shared utilities for working with games
- `@card-game/multiplayer`
  - Multiplayer game engine
- `@card-game/online-multiplayer`
  - Online multiplayer game engine
- `@card-game/ai`
  - Building blocks for building AI/computer players in multiplayer games
  - Configurable difficulty
  - AI decision trees created by parsing game classes/decorators/mixins
  - AI can also be configured further with mixins, decorators, AI versions of core mixins, etc.
  - AI can be configured to play against human players, and/or against other AI players
  - Decision trees are generated as JSON at initial runtime and cached, with a standard schema read by packages like `@card-game/core`, `@card-game/ui-*`, etc.
- `@card-game/*`
  - Game-specific packages, such as:
    - `@card-game/solitaire`: Solitaire game
    - `@card-game/blackjack`: Blackjack game
    - `@card-game/poker`: Poker game
    - `@card-game/uno`: Uno game
    - `@card-game/monopoly-deal`: Monopoly Deal game
    - `@card-game/magic-the-gathering`: Magic: the Gathering game
    - `@card-game/pokemon`: Pokemon Trading Card Game
    - `@card-game/nertz`: Nertz game
    - `@card-game/idiot`: Idiot game
    - `@card-game/spit`: Spit game
    - `@card-game/go-fish`: Go Fish game
    - `@card-game/phase-10`: Phase 10 game
  - Contains the gameplay logic, game-specific decks, AI agents, game-specific configurations, etc.
  - Has a standard API which is used by `@card-game/ui-*` for rendering the game, laying out the cards, handling user interactions, showing game messages, configuring AI, etc.

## Mixins

This project uses `polymix` (`packages/polymix`) for composition.

- Prefer `mixWithBase(Base, ...mixins)` when there is a real base class (especially one with constructor parameters).
- Prefer `mix(...classes)` only when the implicit base-class heuristic is unambiguous.
- Use the class decorator `@mixin(...mixins)` / `@Use(...mixins)` when you need to keep an existing `extends Base` clause intact.

### `instanceof` expectations (polymix)

`polymix` makes `instanceof` work by registering the exact mixin constructors you pass to `mix(...)`, `mixWithBase(...)`, `@mixin(...)`, or `@Use(...)`.

- When you use a configurable mixin (via `configMixin(...)`), the value returned by `configMixin(...)` is the mixin constructor that should be used for `instanceof` checks.
- Do not rely on `instanceof BaseMixin` automatically passing when you used a configured mixin returned by `BaseMixin.configMixin(...)`.

### Lifecycle + conflicts (polymix)

- `polymix` calls each mixin’s `init(...args)` automatically during construction of the composed class.
- Do not rely on a ts-mixer-style `super.init(...)` chain across mixins; if two mixins provide the same method name, polymix composes them using a strategy (default `override` runs all implementations and returns the last result).
- When you need to call a specific mixin’s implementation, use polymix’s `from(instance, Mixin)` helper.

Whenever possible, mixins should be configurable with a static `configMixin` property which returns a pre-configured **mixin class** (constructor) with the given configuration. Sane default values should be provided for all configurable properties that are used if no configuration is provided.

Configured mixins SHOULD be stable, reusable exports (so downstream code can share the same constructor identity for `instanceof` and typing).

```typescript
@mixin(
	Suitable.configMixin(myArrayOfSuits),
	Rankable.configMixin(myArrayOfRanks),
	Parentable.configMixin<CardDeck>('deck'),
	Flippable.configMixin(true),
)
class SomeChild {
	// has `SUIT` and `RANK` pre-populated with `myArrayOfSuits` and `myArrayOfRanks` as enum
	// has `deck?: CardDeck` property instead of `parent?: CardDeck`
	// has `flipped = true` at initialization
}
```

### Enum conventions (Rank/Suit)

`Rankable` and `Suitable` should model “iterable enums” after `createEnum` in [card-stack/core/src/utils.ts](card-stack/core/src/utils.ts).

- The enum object MUST provide:
  - forward mapping: `Enum.Key -> number`
  - reverse mapping: `Enum[number] -> Key`
  - iteration over numeric values via `*[Symbol.iterator]()`
- “Name” and “value” properties are derived from the enum object:
  - `rankValue` / `suitValue` are the numeric enum values
  - `rankName` / `suitName` are derived from reverse mapping: `RANK[this.rank]` / `SUIT[this.suit]`

### Shared

- `Idable`: Creates a stable, unique `id` getter/property for an instance.
  - `id` MUST be a UUIDv7 string.
  - `Idable` MUST maintain a shared, global registry/index of assigned IDs to ensure uniqueness.
    - ID generation MUST check for collisions against this registry.
    - The registry MUST NOT prevent garbage-collection of a closed `Game`.
      - The registry SHOULD be GC-safe (e.g. WeakRef/FinalizationRegistry-based) so entities from closed games cannot be retrieved once no longer referenced by an active `Game`.
  - `id` MUST be assigned once when a `Game` is instantiated (or when an entity is created under that `Game`) and MUST NEVER change for the lifetime of that `Game`.
  - Rehydrating a persisted `Game` MUST preserve the same `id` values.
  - `id` MUST be the canonical identity used for:
    - UI schemas (entity references)
    - Hint move descriptors (entity references)
    - Persistence/rehydration of game state (where applicable)
  - Every class instance stored in the `Game` class MUST have an `id`.
    - Some classes MAY omit `Idable` if they are not stored on/under `Game` and are never referenced by schemas, moves, AI, or persistence.
  - `id` MUST identify one and only one instance.
  - Undo/redo MUST NOT change the `id` of any instance.

Type-safe lookup:

- Each class that mixes in `Idable` MUST provide:
  - `static getById(id: string): T | undefined`
  - `static hasId(id: string): boolean`
  - Lookups MUST be type-specific (e.g. you must not be able to fetch a `Card` by calling `CardSet.getById(cardId)`).
  - `getById`/`hasId` MUST be constrained to entities within the current `Game`.

Card identity:

- Cards MUST keep the same `id` no matter where they move (between `CardSet`s, decks, hands, discard piles, etc.).
- `Nameable`: `.name: string` property
- `Ownable`: `.owner: Player` property
- `Parentable`: Configurable `Parent` type, `.parent: Parent` property, `.hasAncestor(ancestor: Parent): boolean` method
- `Childrenable`: Configurable `Child` type and children storage property name.
  - Children storage MUST be private/internal (not publicly exposed as a mutable array).
  - If mutation is needed, it MUST be exposed intentionally via mixins (e.g. `Takeable`, `Giveable`, `Shuffleable`, `Sortable`).
- `Deckable`: Convenience for relating an object to a deck, e.g. `.deck?: CardDeck` (commonly a configured `Parentable`).

### `Card`

- `Flippable`: `.flipped: boolean`, `.flipUp(): void`, `.flipDown(): void`, `.flip(): void` methods
- `Rankable`: Configurable `Rank` iterable enum type `.rank: Rank`, `.rankName: string`, `.rankValue: number` properties
- `Suitable`: Configurable `Suit` iterable enum type `.suit: Suit`, `.suitName: string`, `.suitValue: number` properties

### `CardDeck`

- Uses `CardSet`, `Childrenable`, etc.
- Uses other mixins common to all types of decks

### `CardSet`

`CardSet` is the core collection abstraction.

- `CardSet` uses `Childrenable` as its underlying storage mechanism (commonly an internal `cards` array).
- The underlying `cards` storage MUST be private/internal and MUST NOT be publicly accessible as a mutable array.
- `CardSet` MUST be iterable via `*[Symbol.iterator]()`.
- `CardSet` MUST NOT expose public mutation methods by default (e.g. `push`, `splice`, `sort`).
  - Mutation MUST be introduced via mixins such as `Takeable`, `Giveable`, `Sortable`, `Shuffleable`, etc.
  - (Implementation note: copying methods from mixins cannot access `#private` fields declared in a different class. If hard privacy is required, use module-private storage via a `WeakMap` and internal helpers.)

- `Atable`: `.at(index: number): Card` method
- `Chunkable`: `.chunk(size: number): CardSet[]` method
- `Eachable`: `.each(callback: (card: Card) => void): void` method
- `Findable`: `.find(callback: (card: Card) => boolean): Card | undefined` method
- `Filterable`: `.filter(callback: (card: Card) => boolean): CardSet` method
- `Mapable`: `.map(callback: (card: Card) => Card): CardSet` method
- `Reduceable`: `.reduce(callback: (card: Card, accumulator: Card) => Card, initialValue: Card): Card` method
- `Reversible`: `.reverse(): CardSet` method
- `Shuffleable`: `.shuffle(): CardSet` method
- `Takeable`: `.take(size: number): CardSet` method
- `Giveable`: Transfers cards between sets
- `Sortable`: Sorts cards

### `@card-game/ai`

`@card-game/ai` provides the building blocks to implement robust AI/computer players in game packages.

- Schema MUST be game-agnostic but configurable/extendable by each `@card-game/<game>` package.
- The package MUST provide tooling for:
  - Declaring game state, moves/actions, legal-move constraints, and scoring/heuristics in a way that can be generated/derived at runtime
  - Generating decision trees (or decision graphs) as JSON at initial runtime and caching the result
  - Validating generated JSON against the standard schema at runtime (at least in development)
  - Consuming the schema at runtime for move selection at configurable difficulty levels
- Developer ergonomics is a first-class goal:
  - Reasonable defaults
  - Good type inference in TypeScript
  - Minimal boilerplate to expose a game to AI tooling

Generated AI artifacts do not require explicit versioning.

Caching/persistence:

- The generated AI tree/graph MUST be stored with the rest of the game state during runtime.
- If the game state is persisted in a browser, it SHOULD use `localStorage`; developers can clear `localStorage` to force regeneration.

### `Player`

- `Handable`: Configurable `CardSet` type, property name, `.hand: CardSet` property
- `Scoreable`: Configurable starting score, score increment, min/max score, property name, `get score(): number` property, `.addScore(amount: number): this`, `.subScore(amount: number): this` methods

## Guidelines

- Use `polymix` (`packages/polymix`) to create the mixins and decorators.
- Focus on developer ergonomics and ease of implementation, with composable and configurable functionality.
- Include extensive documentation and examples to guide developers in using the mixins and decorators.
- Don't overcomplicate or over-engineer the APIs, but don't sacrifice functionality/composability/configurability either.
