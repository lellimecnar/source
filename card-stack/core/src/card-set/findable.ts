import {
	find,
	findIndex,
	findLast,
	findLastIndex,
	type ListIterator,
} from '@lellimecnar/utils';

import { type Card, isCard } from '../card/card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Findable extends CardSet {}
export class Findable {
	find(
		predicate: number | ListIterator<Card, boolean>,
		fromIndex?: number,
	): Card | undefined {
		return find(this.cards, findCard(predicate), fromIndex);
	}

	findIndex(
		predicate: number | ListIterator<Card, boolean>,
		fromIndex?: number,
	): number {
		return findIndex(this.cards, findCard(predicate), fromIndex);
	}

	findRight(
		predicate: number | ListIterator<Card, boolean>,
		fromIndex?: number,
	): Card | undefined {
		return findLast(this.cards, findCard(predicate), fromIndex);
	}

	findIndexRight(
		predicate: number | ListIterator<Card, boolean>,
		fromIndex?: number,
	): number {
		return findLastIndex(this.cards, findCard(predicate), fromIndex);
	}
}

export const isFindable = (obj: unknown): obj is Findable =>
	hasMixin(obj, Findable);

const findCard = (
	predicate: number | Card | ListIterator<Card, boolean>,
): ListIterator<Card, boolean> => {
	if (isCard(predicate)) {
		return (card: Card) => card === predicate;
	}

	if (typeof predicate === 'number') {
		return (card: Card): boolean =>
			Boolean(
				card.id === predicate ||
					card.index === predicate ||
					Boolean(
						'parent' in card &&
							card.parent &&
							typeof card.parent === 'object' &&
							'index' in card.parent &&
							typeof card.parent.index === 'number' &&
							card.parent.index === predicate,
					) ||
					Boolean(
						'deck' in card &&
							card.deck &&
							typeof card.deck === 'object' &&
							'index' in card.deck &&
							typeof card.deck.index === 'number' &&
							card.deck.index === predicate,
					) ||
					Boolean(
						'suit' in card &&
							typeof card.suit === 'number' &&
							card.suit === predicate,
					) ||
					Boolean(
						'rank' in card &&
							typeof card.rank === 'number' &&
							card.rank === predicate,
					),
			);
	}

	return predicate;
};
