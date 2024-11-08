import { type CardSet, CardSetUtils } from '.';
import { hasMixin } from '..';

export interface Takeable extends CardSet {}
export class Takeable {
	take(count = 1, fromIndex?: number) {
		return CardSetUtils.take(this.cards, count, fromIndex);
	}

	takeRight(count = 1, fromIndex?: number) {
		return CardSetUtils.takeRight(this.cards, count, fromIndex);
	}

	takeAt(...indexes: (number | number[])[]) {
		return CardSetUtils.takeAt(this.cards, ...indexes);
	}
	takeRandom(count = 1) {
		return CardSetUtils.takeRandom(this.cards, count);
	}
}

export const isTakeable = (obj: unknown): obj is Takeable =>
	hasMixin(obj, Takeable);
