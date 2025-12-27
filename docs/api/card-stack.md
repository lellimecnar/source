# Card Stack API

This document outlines the core classes and mixins for `@card-stack/core`.

## Core Classes

### `Card`

The base class for all cards.

- **`constructor(props)`**: Initializes a card with given properties.

### `Deck`

A collection of cards.

- **`shuffle()`**: Randomizes the order of cards.
- **`deal(count)`**: Deals a specified number of cards.
- **`add(card)`**: Adds a card to the deck.

## Mixins

### `Flippable`

Adds face-up/face-down behavior.

- **`isFaceUp`**: `boolean`
- **`flip()`**: Toggles `isFaceUp`.

### `Rankable`

Adds rank (e.g., 'Ace', 'King').

- **`rank`**: `string`

### `Suitable`

Adds suit (e.g., 'Hearts', 'Spades').

- **`suit`**: `string`

## Example

```typescript
import { Mix } from 'ts-mixer';
import { Card, Flippable, Rankable, Suitable } from '@card-stack/core';

class StandardCard extends Mix(Card, Flippable, Rankable, Suitable) {}
```
