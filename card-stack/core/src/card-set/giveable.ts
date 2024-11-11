import { flatten } from '@lellimecnar/utils';

import { type CardSet } from '.';
import { type Card } from '../card';
import { hasMixin } from '../utils';

export interface Giveable extends CardSet {}
export class Giveable {
	give(cards: Card | Card[], atIndex = 0): this {
		this.cards.splice(atIndex, 0, ...flatten([cards]));

		return this;
	}

	giveRight(cards: Card | Card[], atIndex = 0): this {
		this.cards.splice(this.cards.length - atIndex, 0, ...flatten([cards]));

		return this;
	}
}

export const isGiveable = (obj: unknown): obj is Giveable =>
	hasMixin(obj, Giveable);
