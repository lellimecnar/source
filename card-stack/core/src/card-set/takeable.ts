import { flatten, randomIndexes, take, takeRight } from '@lellimecnar/utils';

import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Takeable extends CardSet {}
export class Takeable {
	take(count = 1, fromIndex?: number): Card[] {
		return take(this.cards.slice(fromIndex), count);
	}

	takeRight(count = 1, fromIndex?: number): Card[] {
		return takeRight(this.cards.slice(0, fromIndex), count);
	}

	takeAt(...indexes: (number | number[])[]): Card[] {
		return flatten(indexes).flatMap((index: number) => {
			return this.take(1, index);
		});
	}

	takeRandom(count = 1): Card[] {
		return this.takeAt(randomIndexes(this.cards, count));
	}
}

export const isTakeable = (obj: unknown): obj is Takeable =>
	hasMixin(obj, Takeable);
