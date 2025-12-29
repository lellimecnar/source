/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { shuffle } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Shuffleable<C extends Card> extends CardSet<C> {}
export class Shuffleable<C extends Card> {
	shuffle(): this {
		const result = this.toShuffled();

		this.cards.splice(0, this.size, ...result);

		return this;
	}

	toShuffled(): C[] {
		return shuffle(this.cards);
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Shuffleable must be mixed with CardSet');
		}
	}
}
