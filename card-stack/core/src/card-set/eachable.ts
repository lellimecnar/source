import { type CardSet, CardSetUtils } from '.';
import { type Card, hasMixin } from '..';

export interface Eachable extends CardSet {}
export class Eachable {
	each<T>(callback: (card: Card, index: number, cards: Card[]) => T) {
		CardSetUtils.each<T>(this.cards, callback);
	}

	eachRight<T>(callback: (card: Card, index: number, cards: Card[]) => T) {
		return CardSetUtils.eachRight<T>(this.cards, callback);
	}
}

export const isEachable = (obj: unknown): obj is Eachable =>
	hasMixin(obj, Eachable);
