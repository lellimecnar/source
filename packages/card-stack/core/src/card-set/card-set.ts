import { flatten } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCard } from '../utils';

export class CardSet<T extends Card = Card> {
	protected readonly cards: T[];

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

	constructor(...args: unknown[]) {
		const cards: T[] =
			args
				.find(
					(arg): arg is unknown[] =>
						Array.isArray(arg) &&
						(!arg.length || arg.some((item) => isCard(item))),
				)
				?.filter((item): item is T => isCard(item)) ?? [];

		this.cards = cards;
	}

	init(...args: unknown[]): void {
		if (Array.isArray(this.cards) && this.cards.length >= 0) {
			return;
		}

		const cards: T[] =
			args
				.find(
					(arg): arg is unknown[] =>
						Array.isArray(arg) &&
						(!arg.length || arg.some((item) => isCard(item))),
				)
				?.filter((item): item is T => isCard(item)) ?? [];

		// @ts-expect-error: cards is readonly
		this.cards = cards;
	}

	*[Symbol.iterator](): Generator<T, void> {
		for (const card of this.cards) {
			yield card;
		}
	}
}
