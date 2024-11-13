import { reduceRight } from '@lellimecnar/utils';

import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Reduceable<C extends Card = Card> extends CardSet<C> {}
export class Reduceable<C extends Card = Card> {
	reduce<T>(
		callback: (accumulator: T, card: C, index: number, cards: C[]) => T,
		initialValue: T,
	): T {
		return [...this.cards].reduce<T>(callback, initialValue);
	}

	reduceRight<T>(
		callback: (accumulator: T, card: C, index: number, cards: C[]) => T,
		initialValue: T,
	): T {
		return reduceRight([...this.cards], callback, initialValue);
	}
}

export const isReduceable = (obj: unknown): obj is Reduceable =>
	hasMixin(obj, Reduceable);
