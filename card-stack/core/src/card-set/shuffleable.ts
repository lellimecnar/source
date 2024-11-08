import { CardSetUtils, type CardSet } from '.';
import { hasMixin } from '..';

export interface Shuffleable extends CardSet {}
export class Shuffleable {
	shuffle() {
		CardSetUtils.shuffle(this.cards, true);

		return this;
	}
}

export const isShuffleable = (obj: unknown): obj is Shuffleable =>
	hasMixin(obj, Shuffleable);
