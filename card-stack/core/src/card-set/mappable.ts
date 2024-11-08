import { CardSetUtils, type CardSet } from '.';
import { hasMixin, type Card } from '..';

export interface Mappable extends CardSet {}
export class Mappable {
	map<T>(callback: (card: Card, index: number, cards: Card[]) => T) {
		return CardSetUtils.map<T>(this.cards, callback);
	}

	mapRight<T>(callback: (card: Card, index: number, cards: Card[]) => T) {
		return CardSetUtils.mapRight<T>(this.cards, callback);
	}
}

export const isMappable = (obj: unknown): obj is Mappable =>
	hasMixin(obj, Mappable);
