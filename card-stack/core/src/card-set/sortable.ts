import { CardSetUtils, type CardSet } from '.';
import { CardSortKey, CardSortOrder, hasMixin } from '..';

export interface Sortable extends CardSet {}
export class Sortable {
	sortBy(
		keys: CardSortKey | CardSortKey[],
		orders?: CardSortOrder | CardSortOrder[],
	) {
		CardSetUtils.sortBy(this.cards, keys, orders, true);

		return this;
	}

	sort() {
		CardSetUtils.sortBy(this.cards, CardSortKey.INDEX, CardSortOrder.ASC, true);

		return this;
	}
}

export const isSortable = (obj: unknown): obj is Sortable =>
	hasMixin(obj, Sortable);
