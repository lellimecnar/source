import { Card, isCard } from '../card/card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Hasable extends CardSet {}
export class Hasable {
	has(item: number | Card): boolean {
		return has(this.cards, item);
	}

	hasAny(...items: (number | Card)[]): boolean {
		return items.some((item) => has(this.cards, item));
	}
	hasAll(...items: (number | Card)[]): boolean {
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
