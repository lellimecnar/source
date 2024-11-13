/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import {
	orderBy,
	type ListIteratee,
	type ListIterator,
	type Many,
	type NotVoid,
} from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { CardSortKey, CardSortOrder } from '../card/types';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

type Iteratees<C extends Card> = Many<
	ListIterator<C, NotVoid> | ListIteratee<C>
>;
type Orders = Many<boolean | 'asc' | 'desc'>;

// eslint-disable-next-line -- use interface, not type
export interface Sortable<C extends Card> extends CardSet<C> {}
export class Sortable<C extends Card> {
	sortBy(
		iteratees: Iteratees<C> = CardSortKey.INDEX,
		orders: Orders = CardSortOrder.ASC,
	): this {
		const result = this.toSorted(iteratees, orders);

		this.cards.length = 0;
		this.cards.push(...result);

		return this;
	}

	sort(): this {
		this.sortBy(CardSortKey.INDEX, CardSortOrder.ASC);

		return this;
	}

	toSorted(
		iteratees: Iteratees<C> = CardSortKey.INDEX,
		orders: Orders = CardSortOrder.ASC,
	): C[] {
		return orderBy(this.cards, iteratees, orders);
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Sortable must be mixed with CardSet');
		}
	}
}
