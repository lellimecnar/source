# `@card-stack/*` and `@card-game/*` Packages

Finish building the `@card-stack/*` and `@card-game/*` packages, according to the following guidelines:

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
    - `Flippable`: Adds `isFaceUp`, `isFaceDown`, `flip()`, `flipUp()`, `flipDown()`, etc.
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

- `@card-game/core`
  - Core game engine using `@card-stack/*` packages
- `@card-game/ui-*`
  - UI components for rendering games
    - `@card-game/ui-web`: Web UI components
    - `@card-game/ui-react`: React UI components
    - `@card-game/ui-react-native`: React Native UI components
    - `@card-game/ui-expo`: Expo UI components
    - `@card-game/ui-svelte`: Svelte UI components
    - `@card-game/ui-vue`: Vue UI components
    - `@card-game/ui-angular`: Angular UI components
  - Each UI package has a standard API which is used by `@card-game/core` for actually rendering the game, laying out the cards, handling user interactions, showing game messages, etc.
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
  - Decision trees are generated as JSON during compile time, with a standard schema read by packages like `@card-game/core`, `@card-game/ui-*`, etc.
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

## Guidelines

- Use `ts-mixer` and `class-validator` to create the mixins and decorators.
- Add a static type-guard method to each mixin class, following the pattern of `Array.isArray()`, using the `hasMixin` function from `ts-mixer`
- Focus on developer ergonomics and ease of implementation, with composable and configurable functionality.
- Include extensive documentation and examples to guide developers in using the mixins and decorators.
- Don't overcomplicate or over-engineer the APIs, but don't sacrifice functionality/composability/configurability either.