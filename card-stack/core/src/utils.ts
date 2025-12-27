/* eslint-disable @typescript-eslint/no-var-requires -- ignore */
import type { AnyConstructor, MixedInstance, MixedStatic } from 'polymix';
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

type MixedCtor<T extends AnyConstructor[]> = (new (
	...args: any[]
) => MixedInstance<T>) &
	MixedStatic<T>;

export function Mix<C extends AnyConstructor>(Base: C): MixedCtor<[C]>;
export function Mix<
	Base extends AnyConstructor,
	Mixins extends AnyConstructor[],
>(Base: Base, ...mixins: Mixins): MixedCtor<[...Mixins, Base]>;
export function Mix(...classes: AnyConstructor[]): AnyConstructor {
	if (classes.length === 0) {
		throw new Error('Mix() requires at least one class');
	}

	const [Base, ...mixins] = classes;
	if (mixins.length === 0) {
		return Base!;
	}

	const Mixed = mixWithBase(Base!, ...mixins) as any;

	// Ensure static prototype chaining so static fields (e.g. HexByte) can be resolved
	// via the base class even if polymix didn't copy them as own properties.
	if (Base && Object.getPrototypeOf(Mixed) !== Base) {
		Object.setPrototypeOf(Mixed, Base);
	}

	// Ensure Indexable-style static state exists on the mixed ctor.
	// (Tests reset via `this.instances.clear()`; runtime relies on `.instances.set()`.)
	if (!Mixed.instances || !(Mixed.instances instanceof Map)) {
		Object.defineProperty(Mixed, 'instances', {
			value: new Map<number, unknown>(),
			writable: true,
			configurable: true,
		});
	}

	return Mixed;
}

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

export const hasMixin = <T extends object>(
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
