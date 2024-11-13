import { shuffle } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Shuffleable<C extends Card = Card> extends CardSet<C> {}
export class Shuffleable<C extends Card = Card> {
	shuffle(): this {
		const result = this.toShuffled();

		this.cards.splice(0, this.size, ...result);

		return this;
	}

	toShuffled(): C[] {
		return shuffle(this.cards);
	}
}

export const isShuffleable = (obj: unknown): obj is Shuffleable =>
	hasMixin(obj, Shuffleable);
