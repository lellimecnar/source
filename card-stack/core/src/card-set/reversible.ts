import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Reversible extends CardSet {}
export class Reversible {
	reverse(): this {
		this.cards.reverse();

		return this;
	}

	toReverse(): Card[] {
		return this.cards.toReversed();
	}
}

export const isReversible = (obj: unknown): obj is Reversible =>
	hasMixin(obj, Reversible);
