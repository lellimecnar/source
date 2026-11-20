This file provides guidance when working with code in the `@card-stack/deck-standard` package.

## Package Overview

`@card-stack/deck-standard` is an implementation of a standard 52-card deck using the `@card-stack/core` engine. It provides `StandardCard` and `StandardDeck` classes for traditional playing card games.

## Tech Stack

- **Language**: TypeScript
- **Core Engine**: @card-stack/core (workspace package)
- **Mixins**: polymix (via @card-stack/core exports)
- **Testing**: Vitest (via `@lellimecnar/vitest-config`)
- Runtime deps: `@card-stack/core`; versions and test-runner config: see package.json.

## Package Structure

```
src/
├── standard-deck.ts      # StandardCard and StandardDeck classes
├── standard-deck.spec.ts # Tests
├── __snapshots__/        # Vitest snapshots
│   └── standard-deck.spec.ts.snap
└── index.ts              # Package exports
```

## Development Commands

```bash
# Run unit tests
pnpm --filter @card-stack/deck-standard test

# Run a single test file
pnpm --filter @card-stack/deck-standard test -- src/<path>.spec.ts

# Lint code
pnpm --filter @card-stack/deck-standard lint
```

## Package Exports

The package exports standard deck implementation:

```typescript
import { StandardCard, StandardDeck } from '@card-stack/deck-standard';

// Create a standard deck (52 cards are created in the constructor)
const deck = new StandardDeck();

// Access card constants
const suit = StandardCard.SUIT.Hearts;
const rank = StandardCard.RANK.Ace;

// Create a specific card
const card = new StandardCard(StandardCard.SUIT.Hearts, StandardCard.RANK.Ace);
```

## Architecture Notes

### StandardCard

- Uses polymix mixins via `@mixin(Suitable, Rankable)`
- Defines standard suits: Hearts, Diamonds, Spades, Clubs
- Defines standard ranks: Ace, Two through Ten, Jack, Queen, King
- Uses enum creation utilities from core

### StandardDeck

- mixes `@mixin(CardDeck<StandardCard>)` from core
- Initializes with 52 cards (13 ranks × 4 suits)
- Each card is assigned to the deck as its parent
- Can use all CardDeck and CardSet operations from core

### Card Constants

- `StandardCard.SUIT` - Suit enum (Hearts, Diamonds, Spades, Clubs)
- `StandardCard.RANK` - Rank enum (Ace through King)

## Usage Examples

### Creating and Using a Standard Deck

```typescript
import { StandardDeck } from '@card-stack/deck-standard';

// Create deck
const deck = new StandardDeck();

// Use deck operations (from core)
deck.shuffle();
const card = deck.take();
```

### Creating Specific Cards

```typescript
import { StandardCard } from '@card-stack/deck-standard';

// Create Ace of Spades
const aceOfSpades = new StandardCard(
	StandardCard.SUIT.Spades,
	StandardCard.RANK.Ace,
);

// Access properties
console.log(aceOfSpades.suitName); // Spades
console.log(aceOfSpades.rankName); // Ace
```

### Working with Suits and Ranks

```typescript
import { StandardCard } from '@card-stack/deck-standard';

// Iterate over suits
for (const suit of StandardCard.SUIT) {
	console.log(suit); // Hearts, Diamonds, Spades, Clubs
}

// Iterate over ranks
for (const rank of StandardCard.RANK) {
	console.log(rank); // Ace, Two, Three, ..., King
}
```

## Testing

- Uses Vitest for testing
- Tests in `standard-deck.spec.ts`
- Uses Vitest snapshots for output verification
- Tests deck initialization, card creation, and operations

## Adding New Features

### Adding Card Variants

If you need variants (e.g., Jokers), you could:

1. Create new card class extending StandardCard
2. Create new deck class that includes variants
3. Export from package

### Extending Functionality

Since StandardDeck uses mixins from core, you can:

1. Create a new class extending StandardDeck
2. Add additional mixins from core
3. Add custom methods as needed

## Notes

- Package is a concrete implementation of core abstractions
- Demonstrates how to use @card-stack/core
- Provides standard 52-card deck out of the box
- Can be extended for specific game needs
- Independent package (not tied to web/mobile apps)
- Uses workspace dependency on @card-stack/core
