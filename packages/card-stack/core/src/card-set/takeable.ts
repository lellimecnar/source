/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { pullAt } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCard } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Takeable<C extends Card> extends CardSet<C> {}
export class Takeable<C extends Card> {
	take(count = 1, fromIndex = 0): C[] {
		const start = Math.max(fromIndex, 0);
		const cards = this.cards.splice(start, count);

		return cards.map((card) => {
			if (isCard(card)) {
				card.parent = undefined;
			}

			return card;
		});
	}

	takeRight(count = 1, fromIndex = 0): C[] {
		const start = Math.max(0, this.size - count - fromIndex);
		const cards = this.cards.splice(start, count);

		return cards.map((card) => {
			if (isCard(card)) {
				card.parent = undefined;
			}

			return card;
		});
	}

	takeAt(...indexes: number[]): C[] {
		return pullAt(this.cards, indexes).map((card) => {
			if (isCard(card)) {
				card.parent = undefined;
			}
			return card;
		});
	}

	takeRandom(count = 1): C[] {
		const indexes = new Set<number>();

		while (indexes.size < Math.min(this.size, count)) {
			const index = Math.floor(Math.random() * this.size);
			indexes.add(index);
		}

		return this.takeAt(...indexes);
	}
}
