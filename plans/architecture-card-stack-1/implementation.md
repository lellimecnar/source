# Card Stack Architecture (Phase 1)

## Goal
Migrate `@card-stack/core` from `ts-mixer` to `polymix`, refactor initialization away from reliance on concrete-class `init()`, and keep the standard deck package green while renaming it to `@card-stack/deck-standard`.

## Prerequisites
- Make sure that the user is currently on the `refactor/card-stack-polymix` branch before beginning implementation.
- If the branch does not exist, create it from `master`.
- All commands below are run from the repository root.

### Technology / tooling assumptions
- Node `^20`
- pnpm `9.12.2`
- TypeScript `~5.5`
- Jest `^29`
- Monorepo uses pnpm workspaces + Turborepo

---

## Step-by-Step Instructions

#### Step 1: Refactor `@card-stack/core` to use `polymix` (replace `ts-mixer`)
This step performs the polymix migration work in core (including dependency setup), so that later steps can focus on the deck package rename and then removing `ts-mixer` entirely.

##### Step 1A: Add `polymix` dependency to `@card-stack/core`
- [ ] Edit `card-stack/core/package.json` and add `polymix: "workspace:*"` to `dependencies` (keep `ts-mixer` for now).
- [ ] Copy and paste the code below into `card-stack/core/package.json`:

```json
{
    "name": "@card-stack/core",
    "version": "0.0.0",
    "license": "MIT",
    "scripts": {
        "lint": "eslint .",
        "test": "jest",
        "test:watch": "jest --watch"
    },
    "exports": {
        ".": "./src/index.ts"
    },
    "devDependencies": {
        "@faker-js/faker": "^9.2.0",
        "@lellimecnar/eslint-config": "workspace:*",
        "@lellimecnar/jest-config": "workspace:*",
        "@lellimecnar/typescript-config": "workspace:*",
        "@types/jest": "^29.5.14",
        "@types/node": "^20.11.24",
        "jest": "^29",
        "typescript": "~5.5"
    },
    "peerDependencies": {
        "typescript": "~5.5"
    },
    "dependencies": {
        "@lellimecnar/utils": "workspace:*",
        "polymix": "workspace:*",
        "ts-mixer": "^6.0.4"
    }
}
```

- [ ] Run: `pnpm --filter @card-stack/core test`

##### Step 1A Verification Checklist
- [ ] `pnpm --filter @card-stack/core test` passes

##### Step 1B: Refactor initialization to be constructor-safe (while still on `ts-mixer`)
This step removes reliance on concrete-class `init()` by ensuring base/core classes initialize required state in constructors, while keeping `init()` as a compatibility fallback for places where these classes are currently mixed-in (e.g. ts-mixer `@mix(...)`).

- [ ] Copy and paste the code below into `card-stack/core/src/card-set/card-set.ts`:

```ts
import { flatten } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCard } from '../utils';

export class CardSet<T extends Card = Card> {
	protected readonly cards: T[];

	get size(): number {
		return this.cards.length;
	}

	protected push(...cards: (T | T[])[]): void {
		for (const card of flatten(cards)) {
			if (typeof card === 'object' && isCard(card)) {
				this.cards.push(card);
			}
		}
	}

	constructor(...args: unknown[]) {
		const cards: T[] =
			args
				.find(
					(arg): arg is unknown[] =>
						Array.isArray(arg) &&
						(!arg.length || arg.some((item) => isCard(item))),
				)
				?.filter((item): item is T => isCard(item)) ?? [];

		this.cards = cards;
	}

	init(...args: unknown[]): void {
		if (Array.isArray(this.cards) && this.cards.length >= 0) {
			return;
		}

		const cards: T[] =
			args
				.find(
					(arg): arg is unknown[] =>
						Array.isArray(arg) &&
						(!arg.length || arg.some((item) => isCard(item))),
				)
				?.filter((item): item is T => isCard(item)) ?? [];

		// @ts-expect-error: cards is readonly
		this.cards = cards;
	}

	*[Symbol.iterator](): Generator<T, void> {
		for (const card of this.cards) {
			yield card;
		}
	}
}
```

- [ ] Copy and paste the code below into `card-stack/core/src/shared/indexable.ts`:

```ts
import { type HexByte } from '../types';
import { extractIndex } from '../utils';

const indexes = new Set<typeof Indexable>();
export class Indexable {
	protected static HexByte: HexByte;
	protected static instances = new Map<number, Indexable>();
	protected static get index(): number {
		return Math.max(0, ...this.instances.keys()) || 0;
	}

	public static findIndexable<T extends Indexable>(
		predicate: Parameters<(typeof Indexable)[]['find']>[0],
	): T | undefined {
		return Array.from(indexes).find(predicate) as T | undefined;
	}

	public static getInstance(id: number): InstanceType<typeof this> | undefined {
		id = extractIndex(id, this.HexByte);

		return this.instances.get(id);
	}

	public static getIndex(offset = 0): number {
		// eslint-disable-next-line @typescript-eslint/no-this-alias, @typescript-eslint/ban-types -- ignore
		let ctor: Function = this;
		let hexByte: HexByte | undefined = this.HexByte;

		while (typeof hexByte !== 'number' && ctor !== Function) {
			ctor = ctor.constructor;
			hexByte ??= (ctor as any).HexByte;
		}

		if (typeof hexByte !== 'number') {
			throw new Error(`HexByte not defined on ${this.name}`);
		}

		const index = this.index;
		offset = Math.max(0, offset);
		const inc = this.HexByte * offset;
		const result = index + inc;

		return result;
	}

	public static getNextIndex(): number {
		return this.getIndex(1);
	}

	readonly index!: number;

	constructor(..._args: unknown[]) {
		this.ensureIndex();
	}

	init(..._args: unknown[]): void {
		this.ensureIndex();
	}

	private ensureIndex(): void {
		if (typeof (this as any).index === 'number') {
			return;
		}

		// @ts-expect-error: index is readonly
		this.index = (this.constructor as typeof Indexable).getNextIndex();

		(this.constructor as typeof Indexable).instances.set(
			this.index,
			this as InstanceType<typeof Indexable>,
		);
		indexes.add(this.constructor as typeof Indexable);
	}
}
```

- [ ] Copy and paste the code below into `card-stack/core/src/card/card.ts`:

```ts
import { type CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';
import { Parentable } from '../shared/parentable';
import { HexByte } from '../types';
import { isCardSet, Mix, toHex } from '../utils';

export class Card extends Mix(Indexable, Parentable<CardSet>) {
	static getCard(id: number): Card | undefined {
		return this.getInstance(id) as Card | undefined;
	}

	static HexByte = HexByte.CardIndex;

	get id(): number {
		let id = this.index;

		if ('rank' in this && typeof this.rank === 'number') {
			id += this.rank;
		}

		if ('suit' in this && typeof this.suit === 'number') {
			id += this.suit;
		}

		if (
			'deck' in this &&
			this.deck &&
			typeof this.deck === 'object' &&
			'index' in this.deck &&
			typeof this.deck.index === 'number'
		) {
			id += this.deck.index;
		}

		if (
			'parent' in this &&
			this.parent &&
			typeof this.parent === 'object' &&
			'index' in this.parent &&
			typeof this.parent.index === 'number'
		) {
			id += this.parent.index;
		}

		return id;
	}

	[Symbol.for('nodejs.util.inspect.custom')](): string {
		return `${(this.constructor as typeof Card).name}<${toHex(this.id) ?? this.id}>`;
	}

	[Symbol.toPrimitive](hint: unknown): string | number | null | undefined {
		switch (hint) {
			case 'number':
				return this.id;
			case 'string':
				return toHex(this.id);
			default:
				return null;
		}
	}

	constructor(...args: unknown[]) {
		super(...(args as []));
		this.parent = args.find((arg) => isCardSet(arg));
	}

	init(...args: unknown[]): void {
		super.init(...args);
		this.parent ??= args.find((arg) => isCardSet(arg));
	}
}
```

- [ ] Copy and paste the code below into `card-stack/core/src/player/player.ts` (no functional change yet; kept in-sync for later migration):

```ts
import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';
import { Mix } from '../utils';

export class Player extends Mix(Indexable) {
	static override HexByte = HexByte.PlayerIndex;
}
```

- [ ] Run: `pnpm --filter @card-stack/core test`

##### Step 1B Verification Checklist
- [ ] `pnpm --filter @card-stack/core test` passes

##### Step 1C: Migrate core from `ts-mixer` to `polymix` (prefer `@mixin(...)`)
This step removes `ts-mixer` settings usage, switches exports to `polymix`, and migrates the core primitive classes to decorator-based composition.

- [ ] Copy and paste the code below into `card-stack/core/src/utils.ts`:

```ts
/* eslint-disable @typescript-eslint/no-var-requires -- ignore */
import {
	abstract,
	delegate,
	from,
	hasMixin as _hasMixin,
	mix,
	mixWithBase,
	mixin,
	strategies,
	Use,
	when,
} from 'polymix';

import { type EnumType, type HexByte } from './types';

export {
	abstract,
	delegate,
	from,
	mix,
	mixWithBase,
	mixin,
	strategies,
	Use,
	when,
};

// Transitional helper matching ts-mixer `Mixin(Base, ...mixins)` calling style.
// This keeps existing test code and some internal call sites working while production
// code prefers `@mixin(...)` decorators.
export const Mix = (...classes: any[]) => {
	if (classes.length === 0) {
		throw new Error('Mix() requires at least one class');
	}

	const [Base, ...mixins] = classes;
	return mixWithBase(Base, ...mixins);
};

export const createEnum = <K extends string, V extends number>(
	keys: readonly K[],
	increment = 1,
	offset = 0,
): EnumType<K, V> => {
	const makeVal = (index: number) => (index + 1 + offset) * increment;
	return keys.reduce<EnumType<K, V>>(
		(obj, key, index) => {
			const val = makeVal(index);

			return Object.defineProperties(obj, {
				[key]: {
					value: val,
					enumerable: true,
					writable: false,
					configurable: false,
				},
				[val]: {
					value: key,
					enumerable: false,
					writable: false,
					configurable: false,
				},
			});
		},
		{
			*[Symbol.iterator](): Generator<V> {
				for (const key of keys) {
					const index = keys.indexOf(key);
					const val = makeVal(index);
					yield val as V;
				}
			},
		} as EnumType<K, V> satisfies EnumType<K, V>,
	);
};

export const toHex = (val?: number): string | undefined =>
	typeof val === 'number'
		? `0x${Math.abs(val).toString(16).toWellFormed().padStart(10, '0').toUpperCase()}`
		: undefined;

export const extractIndex = <T extends number | object>(
	id: T,
	mask: HexByte | number,
): number => {
	// round down to mask
	let result = Math.floor(Number(id) / mask);

	// truncate to 1 byte
	result = result & 0xff;

	// multiply back up to mask
	result = result * mask;

	return result;
};

export const flatten = <T>(values: (T | T[])[]) =>
	values.flatMap((val) => {
		if (Array.isArray(val)) {
			return val;
		}

		if (Symbol.iterator in Object(val)) {
			return [...(val as Iterable<T>)];
		}

		return [val];
	}) as Exclude<T, Iterable<T>>[];

export const replace = <T>(target: T[], src: T[]) => {
	target.splice(0, target.length, ...src);

	return target;
};

export const getProps = (obj: unknown) => {
	const allProps: string[] = [];
	let curr = obj;

	while ((curr = Object.getPrototypeOf(curr))) {
		const props = Object.getOwnPropertyNames(curr);
		for (const prop of props) {
			if (!allProps.includes(prop)) {
				allProps.push(prop);
			}
		}
	}

	return allProps;
};

export const hasMixin = <T>(
	obj: unknown,
	mixin: new (...args: any[]) => T,
): obj is T => Boolean(obj && _hasMixin(obj as object, mixin));

export const isCard = (obj: unknown): obj is import('./card/card').Card =>
	hasMixin(obj, require('./card/card').Card);

export const isFlippable = (
	obj: unknown,
): obj is import('./card/flippable').Flippable =>
	hasMixin(obj, require('./card/flippable').Flippable);

export const isRankable = (
	obj: unknown,
): obj is import('./card/rankable').Rankable =>
	hasMixin(obj, require('./card/rankable').Rankable);

export const isSuitable = (
	obj: unknown,
): obj is import('./card/suitable').Suitable =>
	hasMixin(obj, require('./card/suitable').Suitable);

export const isCardDeck = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-deck/card-deck').CardDeck<C> =>
	hasMixin(obj, require('./card-deck/card-deck').CardDeck);

export const isAtable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/atable').Atable<C> =>
	hasMixin(obj, require('./card-set/atable').Atable);

export const isCardSet = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/card-set').CardSet<C> =>
	hasMixin(obj, require('./card-set/card-set').CardSet);

export const isChunkable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/chunkable').Chunkable<C> =>
	hasMixin(obj, require('./card-set/chunkable').Chunkable);

export const isEachable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/eachable').Eachable<C> =>
	hasMixin(obj, require('./card-set/eachable').Eachable);

export const isFindable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/findable').Findable<C> =>
	hasMixin(obj, require('./card-set/findable').Findable);

export const isGiveable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/giveable').Giveable<C> =>
	hasMixin(obj, require('./card-set/giveable').Giveable);

export const isGroupable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/groupable').Groupable<C> =>
	hasMixin(obj, require('./card-set/groupable').Groupable);

export const isHasable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/hasable').Hasable<C> =>
	hasMixin(obj, require('./card-set/hasable').Hasable);

export const isMappable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/mappable').Mappable<C> =>
	hasMixin(obj, require('./card-set/mappable').Mappable);

export const isReduceable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/reduceable').Reduceable<C> =>
	hasMixin(obj, require('./card-set/reduceable').Reduceable);

export const isReversible = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/reversible').Reversible<C> =>
	hasMixin(obj, require('./card-set/reversible').Reversible);

export const isShuffleable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/shuffleable').Shuffleable<C> =>
	hasMixin(obj, require('./card-set/shuffleable').Shuffleable);

export const isSortable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/sortable').Sortable<C> =>
	hasMixin(obj, require('./card-set/sortable').Sortable);

export const isTakeable = <C extends import('./card/card').Card>(
	obj: unknown,
): obj is import('./card-set/takeable').Takeable<C> =>
	hasMixin(obj, require('./card-set/takeable').Takeable);

export const isHandable = <H extends import('./card-set/card-set').CardSet>(
	obj: unknown,
): obj is import('./player/handable').Handable<H> =>
	hasMixin(obj, require('./player/handable').Handable);

export const isPlayer = (
	obj: unknown,
): obj is import('./player/player').Player =>
	hasMixin(obj, require('./player/player').Player);

export const isScoreable = (
	obj: unknown,
): obj is import('./player/scoreable').Scoreable =>
	hasMixin(obj, require('./player/scoreable').Scoreable);

export const isDeckable = <
	D extends import('./card-deck/card-deck').CardDeck<any>,
>(
	obj: unknown,
): obj is import('./shared/deckable').Deckable<D> =>
	hasMixin(obj, require('./shared/deckable').Deckable);

export const isIndexable = (
	obj: unknown,
): obj is import('./shared/indexable').Indexable =>
	hasMixin(obj, require('./shared/indexable').Indexable);

export const isNameable = (
	obj: unknown,
): obj is import('./shared/nameable').Nameable =>
	hasMixin(obj, require('./shared/nameable').Nameable);

export const isOwnable = (
	obj: unknown,
): obj is import('./shared/ownable').Ownable =>
	hasMixin(obj, require('./shared/ownable').Ownable);

export const isParentable = <T>(
	obj: unknown,
): obj is import('./shared/parentable').Parentable<T> =>
	hasMixin(obj, require('./shared/parentable').Parentable);
```

- [ ] Copy and paste the code below into `card-stack/core/src/card/card.ts`:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import { type CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';
import { Parentable } from '../shared/parentable';
import { HexByte } from '../types';
import { isCardSet, mixin, toHex } from '../utils';

// eslint-disable-next-line -- use interface, not type
export interface Card extends Indexable, Parentable<CardSet> {}

@mixin(Indexable, Parentable)
export class Card {
	static getCard(id: number): Card | undefined {
		return (this as unknown as typeof Indexable).getInstance(id) as Card | undefined;
	}

	static HexByte = HexByte.CardIndex;

	get id(): number {
		let id = this.index;

		if ('rank' in this && typeof (this as any).rank === 'number') {
			id += (this as any).rank;
		}

		if ('suit' in this && typeof (this as any).suit === 'number') {
			id += (this as any).suit;
		}

		if (
			'deck' in this &&
			(this as any).deck &&
			typeof (this as any).deck === 'object' &&
			typeof (this as any).deck.index === 'number'
		) {
			id += (this as any).deck.index;
		}

		if (
			'parent' in this &&
			this.parent &&
			typeof this.parent === 'object' &&
			'index' in this.parent &&
			typeof (this.parent as any).index === 'number'
		) {
			id += (this.parent as any).index;
		}

		return id;
	}

	[Symbol.for('nodejs.util.inspect.custom')](): string {
		return `${(this.constructor as typeof Card).name}<${toHex(this.id) ?? this.id}>`;
	}

	[Symbol.toPrimitive](hint: unknown): string | number | null | undefined {
		switch (hint) {
			case 'number':
				return this.id;
			case 'string':
				return toHex(this.id);
			default:
				return null;
		}
	}

	constructor(...args: unknown[]) {
		this.parent = args.find((arg) => isCardSet(arg));
	}
}
```

- [ ] Copy and paste the code below into `card-stack/core/src/card-deck/card-deck.ts`:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import { type Card } from '../card';
import { CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';
import { mixin } from '../utils';

// eslint-disable-next-line -- use interface, not type
export interface CardDeck<C extends Card> extends CardSet<C>, Indexable {}

@mixin(Indexable)
export class CardDeck<C extends Card> extends CardSet<C> {
	static HexByte = HexByte.DeckIndex;
}
```

- [ ] Copy and paste the code below into `card-stack/core/src/player/player.ts`:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';
import { mixin } from '../utils';

// eslint-disable-next-line -- use interface, not type
export interface Player extends Indexable {}

@mixin(Indexable)
export class Player {
	static HexByte = HexByte.PlayerIndex;
}
```

- [ ] Run: `pnpm --filter @card-stack/core test`

##### Step 1C Verification Checklist
- [ ] `pnpm --filter @card-stack/core test` passes

##### Step 1D: Verify/update runtime type guards (polymix `hasMixin`)
This step is a focused validation pass: type guards continue to use `require()` indirection to avoid circular dependencies, but the underlying `hasMixin()` now uses polymix.

- [ ] Confirm `card-stack/core/src/utils.ts` no longer imports from `ts-mixer`.
- [ ] Run: `pnpm --filter @card-stack/core test`

##### Step 1D Verification Checklist
- [ ] `pnpm --filter @card-stack/core test` passes

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Rename standard deck package + migrate it off `Mix(...)`

- [ ] Copy and paste the code below into `card-stack/deck-standard/package.json`:

```json
{
    "name": "@card-stack/deck-standard",
    "version": "0.0.0",
    "license": "MIT",
    "exports": {
        ".": "./src/index.ts"
    },
    "scripts": {
        "lint": "eslint .",
        "test": "jest",
        "test:watch": "jest --watch"
    },
    "dependencies": {
        "@card-stack/core": "workspace:*"
    },
    "devDependencies": {
        "@lellimecnar/eslint-config": "workspace:*",
        "@lellimecnar/jest-config": "workspace:*",
        "@lellimecnar/typescript-config": "workspace:*",
        "@types/jest": "^29",
        "@types/node": "^20",
        "jest": "^29"
    }
}
```

- [ ] Copy and paste the code below into `card-stack/deck-standard/src/standard-deck.ts`:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import {
	Card,
	CardDeck,
	Rankable,
	Suitable,
	createRankEnum,
	createSuitEnum,
	hasMixin,
	mixin,
} from '@card-stack/core';

const RANK = createRankEnum([
	'Ace',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
	'Jack',
	'Queen',
	'King',
]);
const SUIT = createSuitEnum(['Hearts', 'Diamonds', 'Spades', 'Clubs']);

// eslint-disable-next-line -- use interface, not type
export interface StandardCard extends Card, Suitable, Rankable {}

@mixin(Suitable, Rankable)
export class StandardCard extends Card {
	static readonly RANK = RANK;
	static readonly SUIT = SUIT;

	constructor(suit: number, rank: number) {
		super(suit, rank);
	}
}

export class StandardDeck extends CardDeck<StandardCard> {
	constructor() {
		super();

		for (const suit of StandardCard.SUIT) {
			for (const rank of StandardCard.RANK) {
				const card = new StandardCard(suit, rank);
				card.parent = this;
				this.cards.push(card);
			}
		}
	}
}

export const isStandardCard = (obj: unknown): obj is StandardCard =>
	hasMixin(obj, StandardCard);

export const isStandardDeck = (obj: unknown): obj is StandardDeck =>
	hasMixin(obj, StandardDeck);
```

- [ ] Copy and paste the code below into `card-stack/deck-standard/AGENTS.md`:

```markdown
This file provides guidance when working with code in the `@card-stack/deck-standard` package.

## Package Overview

`@card-stack/deck-standard` is an implementation of a standard 52-card deck using the `@card-stack/core` engine. It provides `StandardCard` and `StandardDeck` classes for traditional playing card games.

## Tech Stack

- **Language**: TypeScript ~5.5
- **Core Engine**: @card-stack/core (workspace package)
- **Mixins**: polymix (via @card-stack/core exports)
- **Testing**: Jest ^29

## Package Structure

```
src/
├── standard-deck.ts      # StandardCard and StandardDeck classes
├── standard-deck.spec.ts # Tests
├── __snapshots__/        # Jest snapshots
│   └── standard-deck.spec.ts.snap
└── index.ts              # Package exports
```

## Development Commands

```bash
# Run tests
pnpm --filter @card-stack/deck-standard test

# Run tests in watch mode
pnpm --filter @card-stack/deck-standard test:watch

# Lint code
pnpm --filter @card-stack/deck-standard lint
```

## Package Exports

The package exports standard deck implementation:

```typescript
import { StandardCard, StandardDeck } from '@card-stack/deck-standard'

// Create a standard deck (52 cards are created in the constructor)
const deck = new StandardDeck()

// Access card constants
const suit = StandardCard.SUIT.Hearts
const rank = StandardCard.RANK.Ace

// Create a specific card
const card = new StandardCard(StandardCard.SUIT.Hearts, StandardCard.RANK.Ace)
```

## Dependencies

### Runtime Dependencies
- `@card-stack/core` - Core card game engine (workspace package)

### Development Dependencies
- `@lellimecnar/eslint-config` - Shared ESLint configuration
- `@lellimecnar/jest-config` - Shared Jest configuration
- `@lellimecnar/typescript-config` - Shared TypeScript configuration
- `jest` ^29 - Testing framework
- `@types/jest` - Jest TypeScript types

## Architecture Notes

### StandardCard
- Uses polymix mixins via `@mixin(Suitable, Rankable)`
- Defines standard suits: Hearts, Diamonds, Spades, Clubs
- Defines standard ranks: Ace, Two through Ten, Jack, Queen, King
- Uses enum creation utilities from core

### StandardDeck
- Extends `CardDeck<StandardCard>` from core
- Initializes with 52 cards (13 ranks × 4 suits)
- Each card is assigned to the deck as its parent
- Can use all CardDeck and CardSet operations from core

### Card Constants
- `StandardCard.SUIT` - Suit enum (Hearts, Diamonds, Spades, Clubs)
- `StandardCard.RANK` - Rank enum (Ace through King)

## Usage Examples

### Creating and Using a Standard Deck
```typescript
import { StandardDeck } from '@card-stack/deck-standard'

// Create deck
const deck = new StandardDeck()

// Use deck operations (from core)
deck.shuffle()
const card = deck.take()
```

### Creating Specific Cards
```typescript
import { StandardCard } from '@card-stack/deck-standard'

// Create Ace of Spades
const aceOfSpades = new StandardCard(
  StandardCard.SUIT.Spades,
  StandardCard.RANK.Ace
)

// Access properties
console.log(aceOfSpades.suitName) // Spades
console.log(aceOfSpades.rankName) // Ace
```

### Working with Suits and Ranks
```typescript
import { StandardCard } from '@card-stack/deck-standard'

// Iterate over suits
for (const suit of StandardCard.SUIT) {
  console.log(suit) // Hearts, Diamonds, Spades, Clubs
}

// Iterate over ranks
for (const rank of StandardCard.RANK) {
  console.log(rank) // Ace, Two, Three, ..., King
}
```

## Testing

- Uses Jest for testing
- Tests in `standard-deck.spec.ts`
- Uses Jest snapshots for output verification
- Tests deck initialization, card creation, and operations

## Notes

- Package is a concrete implementation of core abstractions
- Demonstrates how to use @card-stack/core
- Provides standard 52-card deck out of the box
- Can be extended for specific game needs
- Independent package (not tied to web/mobile apps)
- Uses workspace dependency on @card-stack/core

- [ ] Run: `pnpm --filter @card-stack/deck-standard test`
- [ ] Run: `pnpm --filter @card-stack/core test`

##### Step 2 Verification Checklist
- [ ] `pnpm --filter @card-stack/deck-standard test` passes
- [ ] `pnpm --filter @card-stack/core test` passes
- [ ] Standard deck snapshot remains unchanged

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Remove `ts-mixer` from core + update documentation

- [ ] Copy and paste the code below into `card-stack/core/package.json`:

```json
{
    "name": "@card-stack/core",
    "version": "0.0.0",
    "license": "MIT",
    "scripts": {
        "lint": "eslint .",
        "test": "jest",
        "test:watch": "jest --watch"
    },
    "exports": {
        ".": "./src/index.ts"
    },
    "devDependencies": {
        "@faker-js/faker": "^9.2.0",
        "@lellimecnar/eslint-config": "workspace:*",
        "@lellimecnar/jest-config": "workspace:*",
        "@lellimecnar/typescript-config": "workspace:*",
        "@types/jest": "^29.5.14",
        "@types/node": "^20.11.24",
        "jest": "^29",
        "typescript": "~5.5"
    },
    "peerDependencies": {
        "typescript": "~5.5"
    },
    "dependencies": {
        "@lellimecnar/utils": "workspace:*",
        "polymix": "workspace:*"
    }
}
```

- [ ] Copy and paste the code below into `card-stack/core/AGENTS.md`:

```markdown
This file provides guidance when working with code in the `@card-stack/core` package.

## Package Overview

`@card-stack/core` is a card game engine core library that provides abstractions and utilities for building card games. It uses TypeScript mixins (via `polymix`) to create flexible, composable card game components.

## Tech Stack

- **Language**: TypeScript ~5.5
- **Mixins**: polymix (workspace package `polymix`)
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
  hasMixin,
  createRankEnum,
  createSuitEnum,
  mixin,
} from '@card-stack/core'
```

## Dependencies

### Runtime Dependencies
- `@lellimecnar/utils` - Shared utilities (lodash, date-fns)
- `polymix` - TypeScript mixin library

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

`@card-stack/core` uses polymix class decorators via the `mixin` export:

```ts
import { mixin } from '@card-stack/core'

@mixin(SomeMixin)
class Example {
  // ...
}
```

Most capability mixins in this package expose an `init(...args)` method (polymix calls each mixin’s `init()` automatically).

Concrete primitives (e.g., `CardSet`) should not rely on their own `init()` being called.

## Notes

- Prefer `@mixin(...)` for readability and spec-alignment.
- Keep runtime mixin checks via `hasMixin(instance, Mixin)`.
```

- [ ] Run: `pnpm --filter @card-stack/core test`
- [ ] Run: `pnpm --filter @card-stack/deck-standard test`

##### Step 3 Verification Checklist
- [ ] `pnpm --filter @card-stack/core test` passes
- [ ] `pnpm --filter @card-stack/deck-standard test` passes
- [ ] No remaining imports from `ts-mixer` in `card-stack/core/src/**`

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
