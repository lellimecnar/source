import { CardSetUtils, type CardSet } from '.';
import { hasMixin, type Card } from '..';

export interface Hasable extends CardSet {}
export class Hasable {
	has(item: number | Card) {
		return CardSetUtils.has(this.cards, item);
	}

	hasAny(...items: (number | Card)[]) {
		return CardSetUtils.hasAny(this.cards, ...items);
	}
	hasAll(...items: (number | Card)[]) {
		return CardSetUtils.hasAll(this.cards, ...items);
	}
}

export const isHasable = (obj: unknown): obj is Hasable =>
	hasMixin(obj, Hasable);
