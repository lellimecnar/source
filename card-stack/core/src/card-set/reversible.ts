import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Reversible<C extends Card = Card> extends CardSet<C> {}
export class Reversible<C extends Card = Card> {
	reverse(): this {
		this.cards.reverse();

		return this;
	}

	toReversed(): C[] {
		return this.cards.toReversed();
	}
}

export const isReversible = (obj: unknown): obj is Reversible =>
	hasMixin(obj, Reversible);
