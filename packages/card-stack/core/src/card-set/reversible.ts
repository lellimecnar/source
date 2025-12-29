/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { type Card } from '../card/card';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Reversible<C extends Card> extends CardSet<C> {}
export class Reversible<C extends Card> {
	reverse(): this {
		this.cards.reverse();

		return this;
	}

	toReversed(): C[] {
		return this.cards.toReversed();
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Reversible must be mixed with CardSet');
		}
	}
}
