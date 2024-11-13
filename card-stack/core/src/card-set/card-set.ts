import { flatten } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCard } from '../utils';

export class CardSet<T extends Card = Card> {
	// @ts-expect-error: cards defined in init
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

	// eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function -- typing only
	constructor(...args: unknown[]) {}

	init(...args: unknown[]): void {
		const cards: T[] =
			args
				.find(
					(arg): arg is unknown[] =>
						Array.isArray(arg) &&
						(!arg.length || arg.some((item) => isCard(item))),
				)
				?.filter((item): item is T => isCard(item)) ?? [];

		// @ts-expect-error: cards is readonly
		this.cards ??= cards;
	}

	*[Symbol.iterator](): Generator<T, void> {
		for (const card of this.cards) {
			yield card;
		}
	}
}
