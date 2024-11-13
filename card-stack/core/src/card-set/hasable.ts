import { Card, isCard } from '../card/card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Hasable<C extends Card = Card> extends CardSet<C> {}
export class Hasable<C extends Card = Card> {
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
		return items.some((item) => has(this.cards, item));
	}
	hasAll(...items: (number | C)[]): boolean {
		return items.every((item) => has(this.cards, item));
	}
}

export const isHasable = (obj: unknown): obj is Hasable =>
	hasMixin(obj, Hasable);

const has = (cards: Card[] | CardSet, item: number | Card): boolean => {
	const card = typeof item === 'number' ? Card.getCard(item) : item;

	if (isCard(card)) {
		return Array.prototype.includes.call(cards, card);
	}

	return false;
};
