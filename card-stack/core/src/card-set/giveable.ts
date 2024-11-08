import { CardSetUtils, type CardSet } from '.';
import { hasMixin, type Card } from '..';

export interface Giveable extends CardSet {}
export class Giveable {
	give(cards: Card | Card[], atIndex?: number) {
		return CardSetUtils.give(this.cards, cards, atIndex);
	}

	giveRight(cards: Card | Card[], atIndex?: number) {
		return CardSetUtils.giveRight(this.cards, cards, atIndex);
	}
}

export const isGiveable = (obj: unknown): obj is Giveable =>
	hasMixin(obj, Giveable);
