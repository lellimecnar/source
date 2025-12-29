/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { reduceRight } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Reduceable<C extends Card> extends CardSet<C> {}
export class Reduceable<C extends Card> {
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

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Reduceable must be mixed with CardSet');
		}
	}
}
