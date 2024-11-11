import { orderBy } from '@lellimecnar/utils';

import { CardSortKey, CardSortOrder } from '../card/types';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Sortable extends CardSet {}
export class Sortable {
	sortBy(
		keys: CardSortKey | CardSortKey[],
		orders?: CardSortOrder | CardSortOrder[],
	): this {
		const result = orderBy(this.cards, keys, orders);

		this.cards.splice(0, this.size, ...result);

		return this;
	}

	sort(): this {
		const result = orderBy(this.cards, CardSortKey.INDEX, CardSortOrder.ASC);

		this.cards.splice(0, this.size, ...result);

		return this;
	}
}

export const isSortable = (obj: unknown): obj is Sortable =>
	hasMixin(obj, Sortable);
