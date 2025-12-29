# @card-stack/core

Core game engine for card games, utilizing a **Mixin pattern** for flexible card behavior composition.

## Installation

```bash
pnpm add @card-stack/core
```

## Architecture

This package uses [ts-mixer](https://github.com/tannerntannern/ts-mixer) to compose card behaviors rather than relying on deep inheritance chains.

### Key Concepts

- **Card:** The base entity.
- **Mixins:** Behaviors that can be added to a card (e.g., `Flippable`, `Rankable`, `Suitable`).

## Usage

```typescript
import { Mix } from 'ts-mixer';
import { Card, Flippable, Rankable, Suitable } from '@card-stack/core';

// Create a card type that has Rank, Suit, and can be Flipped
class StandardCard extends Mix(Card, Flippable, Rankable, Suitable) {}

const card = new StandardCard({
	rank: 'Ace',
	suit: 'Spades',
	isFaceUp: false,
});

card.flip(); // Now face up
console.log(card.rank); // 'Ace'
```
