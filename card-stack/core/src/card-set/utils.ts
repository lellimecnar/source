import {
	chunk as _chunk,
	find as _find,
	findIndex as _findIndex,
	findLast as _findLast,
	findLastIndex as _findLastIndex,
	forEachRight as _forEachRight,
	groupBy as _groupBy,
	nth as _nth,
	orderBy as _orderBy,
	pull as _pull,
	pullAt as _pullAt,
	reduceRight as _reduceRight,
	remove as _remove,
	sampleSize as _sampleSize,
	shuffle as _shuffle,
	take as _take,
	takeRight as _takeRight,
} from '@lellimecnar/utils';

import {
	type CardSet,
	type CardSetFilterPredicate,
	isAtable,
	isCardSet,
	isChunkable,
	isEachable,
	isFindable,
	isGiveable,
	isGroupable,
	isHasable,
	isMappable,
	isReduceable,
	isReversible,
	isShuffleable,
	isSortable,
	isTakeable,
} from '.';
import {
	Card,
	type CardDeck,
	CardSortKey,
	CardSortOrder,
	CardUtils,
	isCard,
} from '..';

export {
	isAtable,
	isCardSet,
	isChunkable,
	isEachable,
	isFindable,
	isGiveable,
	isGroupable,
	isHasable,
	isMappable,
	isReduceable,
	isReversible,
	isShuffleable,
	isSortable,
	isTakeable,
};

export const hasCards = (cardSet: CardSet): boolean => cardSet.size > 0;

export const reduce = <T>(
	cards: Card[] | CardSet,
	callbackFn: (acc: T, card: Card, index: number, cards: Card[]) => T,
	initialValue: T,
) => [...cards].reduce<T>(callbackFn, initialValue);

export const reduceRight = <T>(
	cards: Card[] | CardSet,
	callbackFn: (acc: T, card: Card, index: number, cards: Card[]) => T,
	initialValue: T,
) => _reduceRight<Card, T>([...cards], callbackFn, initialValue);

export const map = <T>(
	cards: Card[] | CardSet,
	callbackFn: (card: Card, index: number, cards: Card[]) => T,
) => [...cards].map(callbackFn);

export const mapRight = <T>(
	cards: Card[] | CardSet,
	callbackFn: (card: Card, index: number, cards: Card[]) => T,
) => {
	const _cards = [...cards];

	return [...cards]
		.reverse()
		.map<T>((card, index) =>
			callbackFn(card, _cards.length - 1 - index, _cards),
		);
};

export const each = <T>(
	cards: Card[] | CardSet,
	callbackFn: (card: Card, index: number, cards: Card[]) => T,
) => {
	[...cards].forEach(callbackFn);
};

export const eachRight = <T>(
	cards: Card[] | CardSet,
	callbackFn: (card: Card, index: number, cards: Card[]) => T,
) => _forEachRight([...cards], callbackFn);

export const some = (
	cards: Card[] | CardSet,
	callbackFn: (card: Card) => boolean,
) => Array.prototype.some.call(cards, callbackFn);

export const every = (
	cards: Card[] | CardSet,
	callbackFn: (card: Card) => boolean,
) => Array.prototype.every.call(cards, callbackFn);

export const has = (cards: Card[] | CardSet, item: number | Card) => {
	const card = typeof item === 'number' ? Card.getCard(item) : item;

	if (isCard(card)) {
		return Array.prototype.includes.call(cards, card);
	}

	return false;
};

export const hasAny = (cards: Card[] | CardSet, ...items: (number | Card)[]) =>
	items.some((item) => has(cards, item));

export const hasAll = (cards: Card[] | CardSet, ...items: (number | Card)[]) =>
	items.every((item) => has(cards, item));

const findCard = (
	predicate:
		| number
		| Card
		| ((card: Card, index: number, cards: Card[]) => boolean),
) => {
	if (CardUtils.isCard(predicate)) {
		return (card: Card) => card === predicate;
	}

	if (typeof predicate === 'number') {
		return (card: Card) =>
			card.id === predicate ||
			card.index === predicate ||
			(CardUtils.hasParent(card) && card.parent.index === predicate) ||
			(CardUtils.hasDeck(card) && card.deck.index === predicate) ||
			(CardUtils.hasSuit(card) && card.suit === predicate) ||
			(CardUtils.hasRank(card) && card.rank === predicate);
	}

	return predicate;
};

export const find = (
	cards: Card[] | CardSet,
	predicate: number | ((card: Card, index: number, cards: Card[]) => boolean),
	fromIndex?: number,
) => _find<Card[]>([...cards], findCard(predicate), fromIndex);

export const findIndex = (
	cards: Card[] | CardSet,
	predicate: number | ((card: Card, index: number, cards: Card[]) => boolean),
	fromIndex?: number,
) => _findIndex<Card>([...cards], findCard(predicate) as any, fromIndex);

export const findRight = (
	cards: Card[] | CardSet,
	predicate: number | ((card: Card, index: number, cards: Card[]) => boolean),
	fromIndex?: number,
) => _findLast<Card[]>([...cards], findCard(predicate), fromIndex);

export const findIndexRight = (
	cards: Card[] | CardSet,
	predicate: number | ((card: Card, index: number, cards: Card[]) => boolean),
	fromIndex?: number,
) => _findLastIndex<Card>([...cards], findCard(predicate) as any, fromIndex);

export const groupBy = <T extends string | number>(
	cards: Card[] | CardSet,
	iteratee: CardSortKey | ((card: Card) => T),
) => {
	if (
		typeof iteratee === 'string' &&
		Object.values(CardSortKey).includes(iteratee)
	) {
		iteratee = (card: Card) => {
			switch (iteratee) {
				case CardSortKey.PARENT:
					return (
						CardUtils.hasParent(card) ? card.parent.index : 'undefined'
					) as T;
				case CardSortKey.DECK:
					return (CardUtils.hasDeck(card) ? card.deck.index : 'undefined') as T;
				case CardSortKey.INDEX:
					return card.index as T;
				case CardSortKey.SUIT:
					return (CardUtils.hasSuit(card) ? card.suit : 'undefined') as T;
				case CardSortKey.RANK:
					return (CardUtils.hasRank(card) ? card.rank : 'undefined') as T;
				default:
					return 'undefined' as T;
			}
		};
	}

	return _groupBy<Card>([...cards], iteratee) as Record<T, Card[]>;
};

export const randomIndex = (cards: Card[] | CardSet) =>
	Math.floor(Math.random() * [...cards].length);

export const randomIndexes = (cards: Card[] | CardSet, count = 1) =>
	_sampleSize(Array.from([...cards].keys()), count);

export const chunk = (cards: Card[] | CardSet, size: number) =>
	_chunk([...cards], size);

export const concat = <T extends Card>(
	cards: T[],
	...values: (T | T[] | CardSet<T> | CardSet<T>[] | CardDeck | CardDeck[])[]
) => Array.prototype.concat.call(cards, ...flatten(values)) as T[];

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

export const at = (
	cards: Card[] | CardSet,
	...indexes: (number | number[])[]
) => {
	const arr = [...cards];
	return flatten(indexes).reduce<Card[]>((result, index) => {
		const card = _nth(arr, index);

		if (isCard(card)) {
			result.push(card);
		}

		return result;
	}, []);
};

export const removeAt = (cards: Card[], ...indexes: (number | number[])[]) =>
	_pullAt(cards, ...indexes);

export const remove = (cards: Card[], predicate: CardSetFilterPredicate) =>
	_remove(cards, predicate);

export const reverse = (cards: Card[]) => cards.reverse();
export const toReverse = (cards: Card[] | CardSet) => [...cards].reverse();

export const take = (
	cards: Card[] | CardSet,
	count = 1,
	fromIndex?: number,
): Card[] => {
	if (isCardSet(cards)) {
		if (!isTakeable(cards)) {
			throw new TypeError('Cannot take from non-takeable CardSet');
		}

		return cards.take(count, fromIndex);
	}

	const result = _take([...cards].slice(fromIndex), count);

	_pull(cards, ...result);

	return result;
};

export const takeRight = (
	cards: Card[] | CardSet,
	count = 1,
	fromIndex?: number,
): Card[] => {
	if (isCardSet(cards)) {
		if (!isTakeable(cards)) {
			throw new TypeError('Cannot take from non-takeable CardSet');
		}

		return cards.takeRight(count, fromIndex);
	}

	const result = _takeRight([...cards].slice(0, fromIndex), count);

	_pull(cards, ...result);

	return result;
};

export const takeAt = (
	cards: Card[] | CardSet,
	...indexes: (number | number[])[]
) =>
	flatten(indexes).reduce<Card[]>((result, index) => {
		result.push(...take(cards, 1, index));
		return result;
	}, []);

export const takeRandom = (cards: Card[] | CardSet, count = 1) =>
	takeAt(cards, randomIndexes(cards, count));

export const give = (
	cards: Card[] | CardSet,
	source: Card | Card[],
	atIndex = 0,
): Card[] => {
	if (isCardSet(cards)) {
		if (!isGiveable(cards)) {
			throw new TypeError('Cannot give to non-giveable CardSet');
		}

		return cards.give(source, atIndex);
	}

	cards.splice(atIndex, 0, ...flatten([source]));

	return cards;
};

export const giveRight = (
	cards: Card[] | CardSet,
	source: Card | Card[],
	atIndex?: number,
): Card[] => {
	if (isCardSet(cards)) {
		if (!isGiveable(cards)) {
			throw new TypeError('Cannot give to non-giveable CardSet');
		}

		return cards.giveRight(source, atIndex);
	}

	cards.splice(cards.length - (atIndex ?? 0), 0, ...flatten([source]));

	return cards;
};

export const shuffle: {
	(cards: Card[] | CardSet): Card[];
	(cards: Card[], mutate?: boolean): Card[];
} = (cards: Card[] | CardSet, mutate?: boolean) => {
	const shuffled = _shuffle([...cards]);

	if (mutate) {
		if (!Array.isArray(cards)) {
			throw new Error('Cannot shuffle a CardSet');
		}

		cards.splice(0, cards.length, ...shuffled);

		return cards;
	}

	return shuffled;
};

export const sortBy: {
	(
		cards: Card[] | CardSet,
		k: CardSortKey | CardSortKey[],
		o?: CardSortOrder | CardSortOrder[],
	): Card[];
	(
		cards: Card[],
		k: CardSortKey | CardSortKey[],
		o?: CardSortOrder | CardSortOrder[],
		mutate?: boolean,
	): Card[];
	(cards: Card[], k: CardSortKey | CardSortKey[], mutate?: boolean): Card[];
} = (
	cards: Card[] | CardSet,
	k: CardSortKey | CardSortKey[],
	...args: unknown[]
) => {
	const keys = Array.isArray(k) ? k : [k];
	const o = (Array.isArray(args[0]) ? args.shift() : []) as CardSortOrder[];
	const mutate = typeof args[0] === 'boolean' ? args.shift() : false;
	const orders = keys.map(
		(_key, i): CardSortOrder =>
			_findLast(
				o,
				(order: unknown) =>
					Boolean(order) &&
					(order === CardSortOrder.ASC || order === CardSortOrder.DESC),
				i,
			) ?? CardSortOrder.ASC,
	);

	const sorted = _orderBy(
		[...cards],
		keys.map((key) => (card: Card) => {
			switch (key) {
				case CardSortKey.PARENT:
					return CardUtils.hasParent(card) ? card.parent.index : undefined;
				case CardSortKey.DECK:
					return CardUtils.hasDeck(card) ? card.deck.index : undefined;
				case CardSortKey.INDEX:
					return card.index;
				case CardSortKey.SUIT:
					return CardUtils.hasSuit(card) ? card.suit : undefined;
				case CardSortKey.RANK:
					return CardUtils.hasRank(card) ? card.rank : undefined;
				case CardSortKey.ID: {
					return card.id;
				}
			}
		}),
		orders,
	);

	if (mutate) {
		if (!Array.isArray(cards)) {
			throw new Error('Cannot sort a CardSet');
		}

		cards.splice(0, cards.length, ...sorted);

		return cards;
	}

	return sorted;
};

export const sort = (cards: Card[] | CardSet, mutate?: boolean) =>
	sortBy(cards as Card[], [CardSortKey.INDEX], [CardSortOrder.ASC], mutate);

export type FuncArgs<T extends (...args: any) => any> = T extends (
	arg0: any,
	...args: infer P
) => any
	? P
	: never;
