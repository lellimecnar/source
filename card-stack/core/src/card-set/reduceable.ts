import { reduceRight } from '@lellimecnar/utils';

import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Reduceable extends CardSet {}
export class Reduceable {
	reduce<T>(callback: (accumulator: T, card: Card) => T, initialValue: T): T {
		return [...this.cards].reduce<T>(callback, initialValue);
	}

	reduceRight<T>(
		callback: (accumulator: T, card: Card) => T,
		initialValue: T,
	): T {
		return reduceRight([...this.cards], callback, initialValue);
	}
}

export const isReduceable = (obj: unknown): obj is Reduceable =>
	hasMixin(obj, Reduceable);
