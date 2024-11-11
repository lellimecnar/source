import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Mappable extends CardSet {}
export class Mappable {
	map<T>(callback: (card: Card, index: number, cards: Card[]) => T): T[] {
		return [...this.cards].map<T>(callback);
	}

	mapRight<T>(callback: (card: Card, index: number, cards: Card[]) => T): T[] {
		return this.cards.toReversed().map<T>(callback);
	}
}

export const isMappable = (obj: unknown): obj is Mappable =>
	hasMixin(obj, Mappable);
