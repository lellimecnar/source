/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { flatten } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCard, isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Giveable<C extends Card> extends CardSet<C> {}
export class Giveable<C extends Card> {
	give(cards: C | C[], atIndex = 0): this {
		cards = flatten([cards]).filter((card) => isCard(card));
		this.cards.splice(atIndex, 0, ...cards);

		for (const card of cards) {
			card.parent = this;
		}

		return this;
	}

	giveRight(cards: C | C[], atIndex = 0): this {
		cards = flatten([cards]).filter((card) => isCard(card));
		this.cards.splice(this.cards.length - atIndex, 0, ...flatten([cards]));

		for (const card of cards) {
			card.parent = this;
		}

		return this;
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Giveable must be mixed with CardSet');
		}
	}
}
