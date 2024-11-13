/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- needed */
import {
	groupBy,
	type Dictionary,
	type ValueIteratee,
} from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Groupable<C extends Card = Card> extends CardSet<C> {}
export class Groupable<C extends Card = Card> {
	groupBy(iteratee: ValueIteratee<C>): Dictionary<C[]> {
		return groupBy<C>([...this.cards], iteratee);
	}
}

export const isGroupable = (obj: unknown): obj is Groupable =>
	hasMixin(obj, Groupable);
