This file provides guidance when working with code in the `@card-stack/core` package.

## Package Overview

`@card-stack/core` is a card game engine core library that provides abstractions and utilities for building card games. It uses TypeScript mixins (via `ts-mixer`) to create flexible, composable card game components.

## Tech Stack

- **Language**: TypeScript ~5.5
- **Mixins**: ts-mixer ^6.0.4
- **Testing**: Jest ^29
- **Utilities**: @lellimecnar/utils (lodash, date-fns)

## Package Structure

```
src/
├── card/                 # Card abstractions
│   ├── card.ts          # Base Card class
│   ├── flippable.ts     # Flippable mixin (face up/down)
│   ├── rankable.ts      # Rankable mixin (card ranks)
│   ├── suitable.ts      # Suitable mixin (card suits)
│   ├── card.serializer.ts # Card serialization
│   └── types.ts         # Card types
├── card-set/            # Card set abstractions
│   ├── card-set.ts      # Base CardSet class
│   ├── atable.ts        # Array-like operations
│   ├── chunkable.ts     # Chunking operations
│   ├── eachable.ts      # Iteration operations
│   ├── findable.ts      # Finding operations
│   ├── giveable.ts      # Giving cards operations
│   ├── groupable.ts     # Grouping operations
│   ├── hasable.ts       # Membership checking
│   ├── mappable.ts      # Mapping operations
│   ├── reduceable.ts    # Reduction operations
│   ├── reversible.ts    # Reversal operations
│   ├── shuffleable.ts   # Shuffling operations
│   ├── sortable.ts      # Sorting operations
│   ├── takeable.ts      # Taking cards operations
│   └── types.ts         # CardSet types
├── card-deck/           # Deck abstractions
│   ├── card-deck.ts     # Base CardDeck class
│   └── index.ts         # Deck exports
├── player/              # Player abstractions
│   ├── player.ts        # Base Player class
│   ├── handable.ts      # Hand management mixin
│   └── scoreable.ts     # Scoring mixin
├── shared/              # Shared mixins and utilities
│   ├── indexable.ts     # Index management
│   ├── nameable.ts      # Naming support
│   ├── ownable.ts       # Ownership tracking
│   ├── parentable.ts    # Parent-child relationships
│   ├── deckable.ts      # Deck association
│   └── indexable.ts     # Index management
├── checks.ts            # Type checking utilities
├── types.ts             # Core types
├── utils.ts             # Utility functions
└── index.ts             # Main package exports
```

## Development Commands

```bash
# Run tests
pnpm --filter @card-stack/core test

# Run tests in watch mode
pnpm --filter @card-stack/core test:watch

# Lint code
pnpm --filter @card-stack/core lint
```

## Package Exports

The package exports core abstractions:

```typescript
// Core classes
import { Card, CardSet, CardDeck, Player } from '@card-stack/core'

// Mixins
import { 
  Flippable, 
  Rankable, 
  Suitable,
  Shuffleable,
  Sortable,
  // ... other mixins
} from '@card-stack/core'

// Utilities
import { 
  Mix, 
  hasMixin, 
  createRankEnum, 
  createSuitEnum 
} from '@card-stack/core'
```

## Dependencies

### Runtime Dependencies
- `@lellimecnar/utils` - Shared utilities (lodash, date-fns)
- `ts-mixer` ^6.0.4 - TypeScript mixin library

### Development Dependencies
- `@faker-js/faker` ^9.2.0 - Test data generation
- `@lellimecnar/eslint-config` - Shared ESLint configuration
- `@lellimecnar/jest-config` - Shared Jest configuration
- `@lellimecnar/typescript-config` - Shared TypeScript configuration
- `jest` ^29 - Testing framework
- `@types/jest` - Jest TypeScript types

### Peer Dependencies
- `typescript` ~5.5

## Architecture Notes

### Mixin Pattern
- Uses `ts-mixer` for TypeScript mixins
- Components are composed via `Mix()` function
- Example: `class MyCard extends Mix(Card, Suitable, Rankable)`
- Mixins provide specific capabilities (flippable, rankable, etc.)

### Card System
- Base `Card` class with index management
- Mixins add capabilities: `Flippable`, `Rankable`, `Suitable`
- Cards can have parents (CardSet) and decks
- Cards have unique IDs computed from various properties

### CardSet System
- Base `CardSet` class manages collections of cards
- Mixins add operations: shuffle, sort, find, group, etc.
- Iterable via `Symbol.iterator`
- Supports various array-like operations

### CardDeck System
- Extends CardSet for deck-specific behavior
- Manages deck of cards
- Can be shuffled, dealt, etc.

### Player System
- Base `Player` class
- `Handable` mixin for hand management
- `Scoreable` mixin for scoring

### Shared Mixins
- `Indexable` - Index management
- `Nameable` - Naming support
- `Ownable` - Ownership tracking
- `Parentable` - Parent-child relationships
- `Deckable` - Deck association

## Usage Examples

### Creating a Custom Card
```typescript
import { Card, Mix, Suitable, Rankable, createSuitEnum, createRankEnum } from '@card-stack/core'

const SUIT = createSuitEnum(['Hearts', 'Diamonds', 'Spades', 'Clubs'])
const RANK = createRankEnum(['Ace', 'Two', 'Three', /* ... */])

class MyCard extends Mix(Card, Suitable, Rankable) {
  static readonly SUIT = SUIT
  static readonly RANK = RANK

  constructor(suit: number, rank: number) {
    super()
    this.suit = suit
    this.rank = rank
  }
}
```

### Creating a CardSet with Operations
```typescript
import { CardSet, Mix, Shuffleable, Sortable } from '@card-stack/core'

class MyCardSet extends Mix(CardSet, Shuffleable, Sortable) {
  // Automatically has shuffle() and sort() methods
}

const set = new MyCardSet()
set.init([card1, card2, card3])
set.shuffle()
set.sort()
```

### Checking for Mixins
```typescript
import { hasMixin } from '@card-stack/core'

if (hasMixin(card, Suitable)) {
  // card has suit property
  console.log(card.suit)
}
```

## Testing

- Uses Jest for testing
- Tests are co-located with source files (`.spec.ts`)
- Uses `@faker-js/faker` for test data generation
- Test files follow naming pattern: `*.spec.ts`

## Adding New Features

### Adding a New Mixin
1. Create mixin file in appropriate directory
2. Export mixin class
3. Export from parent directory's `index.ts`
4. Add tests in `*.spec.ts` file

### Adding a New CardSet Operation
1. Create mixin file in `card-set/` directory
2. Implement operation methods
3. Export from `card-set/index.ts`
4. Add tests

## Notes

- Package uses TypeScript mixins extensively
- All classes use mixin composition pattern
- Tests are comprehensive and co-located
- Uses `@lellimecnar/utils` for array/utility operations
- Designed to be extended for specific card games
- Independent package (not tied to web/mobile apps)
