import { flatten } from '@lellimecnar/utils';

import { type Card, isCard } from '../card/card';
import { hasMixin } from '../utils';

export class CardSet<T extends Card = Card> {
	protected readonly cards = [] as T[];

	get size(): number {
		return this.cards.length;
	}

	protected push(...cards: (T | T[])[]): void {
		for (const card of flatten(cards)) {
			if (typeof card === 'object' && isCard(card)) {
				this.cards.push(card);
			}
		}
	}

	init(): void {
		// @ts-expect-error: cards is readonly
		this.cards ??= [];
	}

	*[Symbol.iterator](): Generator<T, void> {
		for (const card of this.cards) {
			yield card;
		}
	}
}

export const isCardSet = (obj: unknown): obj is CardSet =>
	Boolean(obj && hasMixin(obj, CardSet));
