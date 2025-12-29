/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { type Card } from '../card/card';
import { isCard, isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Hasable<C extends Card> extends CardSet<C> {}
export class Hasable<C extends Card> {
	has(item: number | C): boolean {
		if (typeof item === 'number') {
			return this.cards.some((card) => card.id === item);
		}

		if (isCard(item)) {
			return Array.prototype.includes.call(this.cards, item);
		}

		return false;
	}

	hasAny(...items: (number | C)[]): boolean {
		return items.some((item) => this.has(item));
	}

	hasAll(...items: (number | C)[]): boolean {
		return items.every((item) => this.has(item));
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Hasable must be mixed with CardSet');
		}
	}
}
