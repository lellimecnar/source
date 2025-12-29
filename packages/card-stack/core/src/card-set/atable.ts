/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { nth } from '@lellimecnar/utils';

import { type Card } from '..';
import { isCard, isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Atable<C extends Card> extends CardSet<C> {}
export class Atable<C extends Card> {
	at(index: number): C | undefined;
	at(...indexes: [number, number, ...number[]]): C[];
	at(...indexes: number[]): C | undefined | C[] {
		if (indexes.length === 1 && typeof indexes[0] === 'number') {
			return nth(this.cards, indexes[0]);
		}

		const result: C[] = indexes.flatMap<C>((index: number): C[] => {
			const card: C | undefined = nth(this.cards, index);

			if (card && isCard(card)) {
				return [card];
			}

			return [];
		});

		return Array.from(new Set(result));
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Atable must be mixed with CardSet');
		}
	}
}
