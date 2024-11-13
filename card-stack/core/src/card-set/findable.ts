/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import {
	find,
	findIndex,
	findLast,
	findLastIndex,
	type ListIterator,
} from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCard, isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Findable<C extends Card> extends CardSet<C> {}
export class Findable<C extends Card> {
	find(
		predicate: number | ListIterator<C, boolean>,
		fromIndex?: number,
	): C | undefined {
		return find(this.cards, findCard(predicate), fromIndex);
	}

	findIndex(
		predicate: number | ListIterator<C, boolean>,
		fromIndex?: number,
	): number {
		return findIndex(this.cards, findCard(predicate), fromIndex);
	}

	findRight(
		predicate: number | ListIterator<C, boolean>,
		fromIndex?: number,
	): C | undefined {
		return findLast(this.cards, findCard(predicate), fromIndex);
	}

	findIndexRight(
		predicate: number | ListIterator<C, boolean>,
		fromIndex?: number,
	): number {
		return findLastIndex(this.cards, findCard(predicate), fromIndex);
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Findable must be mixed with CardSet');
		}
	}
}

const findCard = <C extends Card>(
	predicate: number | C | ListIterator<C, boolean>,
): ListIterator<C, boolean> => {
	if (isCard(predicate)) {
		return (card: C) => card === predicate;
	}

	if (typeof predicate === 'number') {
		return (card: C): boolean =>
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
