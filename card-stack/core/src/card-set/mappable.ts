import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Mappable<C extends Card = Card> extends CardSet<C> {}
export class Mappable<C extends Card = Card> {
	map<T>(callback: (card: C, index: number, cards: C[]) => T): T[] {
		return [...this.cards].map<T>(callback);
	}

	mapRight<T>(callback: (card: C, index: number, cards: C[]) => T): T[] {
		return this.cards.toReversed().map<T>(callback);
	}
}

export const isMappable = (obj: unknown): obj is Mappable =>
	hasMixin(obj, Mappable);
