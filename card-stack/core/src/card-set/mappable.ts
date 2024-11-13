/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { type Card } from '../card/card';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Mappable<C extends Card> extends CardSet<C> {}
export class Mappable<C extends Card> {
	map<T>(callback: (card: C, index: number, cards: C[]) => T): T[] {
		return [...this.cards].map<T>(callback);
	}

	mapRight<T>(callback: (card: C, index: number, cards: C[]) => T): T[] {
		return this.cards.toReversed().map<T>(callback);
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Mappable must be mixed with CardSet');
		}
	}
}
