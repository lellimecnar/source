# @card-stack/deck-standard

Implementation of a standard 52-card deck using `@card-stack/core`.

## Installation

```bash
pnpm add @card-stack/deck-standard
```

## Usage

```typescript
import { StandardDeck } from '@card-stack/deck-standard';

const deck = new StandardDeck();
deck.shuffle();

const hand = deck.deal(5);
console.log(hand);
```
