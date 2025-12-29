/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { type Card } from '../card/card';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Eachable<C extends Card> extends CardSet<C> {}
export class Eachable<C extends Card> {
	each<T>(callback: (card: C, index: number, cards: C[]) => T): this {
		[...this.cards].forEach(callback);

		return this;
	}

	eachRight<T>(callback: (card: C, index: number, cards: C[]) => T): this {
		this.cards.toReversed().forEach(callback);

		return this;
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Eachable must be mixed with CardSet');
		}
	}
}
