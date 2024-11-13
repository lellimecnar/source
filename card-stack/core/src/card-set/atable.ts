import { nth } from '@lellimecnar/utils';

import { type Card, isCard } from '../card/card';
import { hasMixin } from '../utils';
import { type CardSet, isCardSet } from './card-set';

export interface Atable extends CardSet {}
export class Atable {
	at(index: number): Card | undefined;
	at(...indexes: [number, number, ...number[]]): Card[];
	at(...indexes: number[]): Card | undefined | Card[] {
		if (indexes.length === 1 && typeof indexes[0] === 'number') {
			return nth(this.cards, indexes[0]);
		}

		const result: Card[] = indexes.flatMap<Card>((index: number): Card[] => {
			const card: Card | undefined = nth(this.cards, index);

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

export const isAtable = (obj: unknown): obj is Atable => hasMixin(obj, Atable);
