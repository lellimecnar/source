import { CardSetUtils, type CardSet } from '.';
import { hasMixin } from '..';

export interface Reversible extends CardSet {}
export class Reversible {
	reverse() {
		CardSetUtils.reverse(this.cards);

		return this;
	}

	toReverse() {
		return CardSetUtils.toReverse(this.cards);
	}
}

export const isReversible = (obj: unknown): obj is Reversible =>
	hasMixin(obj, Reversible);
