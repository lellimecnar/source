import { CardSetUtils, type CardSet } from '.';
import { hasMixin, type Card } from '..';

export interface Reduceable extends CardSet {}
export class Reduceable {
	reduce<T>(callback: (accumulator: T, card: Card) => T, initialValue: T) {
		return CardSetUtils.reduce<T>(this.cards, callback, initialValue);
	}

	reduceRight<T>(callback: (accumulator: T, card: Card) => T, initialValue: T) {
		return CardSetUtils.reduceRight(this.cards, callback, initialValue);
	}
}

export const isReduceable = (obj: unknown): obj is Reduceable =>
	hasMixin(obj, Reduceable);
