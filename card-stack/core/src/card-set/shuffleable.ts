import { shuffle } from '@lellimecnar/utils';

import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Shuffleable extends CardSet {}
export class Shuffleable {
	shuffle() {
		const result = shuffle(this.cards);

		this.cards.splice(0, this.size, ...result);

		return this;
	}
}

export const isShuffleable = (obj: unknown): obj is Shuffleable =>
	hasMixin(obj, Shuffleable);
