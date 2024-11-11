import { nth } from '@lellimecnar/utils';

import { type Card, isCard } from '../card/card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Atable extends CardSet {}
export class Atable {
	at(index: number): Card | undefined;
	at(...indexes: [number, number, ...number[]]): Card[];
	at(...indexes: number[]): Card | undefined | Card[] {
		const result: Card[] = indexes.flatMap<Card>((index: number): Card[] => {
			const card: Card | undefined = nth(this.cards, index);

			if (card && isCard(card)) {
				return [card];
			}

			return [];
		});

		if (indexes.length === 1) {
			return result[0];
		}

		return result;
	}
}

export const isAtable = (obj: unknown): obj is Atable => hasMixin(obj, Atable);
