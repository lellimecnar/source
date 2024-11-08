import { CardSetUtils, type CardSet } from '.';
import { hasMixin, type Card, type CardSortKey } from '..';

export interface Groupable extends CardSet {}
export class Groupable {
	groupBy<T extends string | number>(
		iteratee: CardSortKey | ((card: Card) => T),
	) {
		return CardSetUtils.groupBy<T>(this.cards, iteratee);
	}
}

export const isGroupable = (obj: unknown): obj is Groupable =>
	hasMixin(obj, Groupable);
