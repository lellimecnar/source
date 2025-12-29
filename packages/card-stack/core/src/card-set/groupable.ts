/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- needed */
import {
	groupBy,
	type Dictionary,
	type ValueIteratee,
} from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Groupable<C extends Card> extends CardSet<C> {}
export class Groupable<C extends Card> {
	groupBy(iteratee: ValueIteratee<C>): Dictionary<C[]> {
		return groupBy<C>([...this.cards], iteratee);
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Groupable must be mixed with CardSet');
		}
	}
}
