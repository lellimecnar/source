import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Eachable extends CardSet {}
export class Eachable {
	each<T>(callback: (card: Card, index: number, cards: Card[]) => T): this {
		[...this.cards].forEach(callback);

		return this;
	}

	eachRight<T>(
		callback: (card: Card, index: number, cards: Card[]) => T,
	): this {
		this.cards.toReversed().forEach(callback);

		return this;
	}
}

export const isEachable = (obj: unknown): obj is Eachable =>
	hasMixin(obj, Eachable);
