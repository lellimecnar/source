/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import { type Card } from '../card';
import { CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';
import { mix } from '../utils';

export interface CardDeck<C extends Card> extends CardSet<C>, Indexable {}

@mix(CardSet, Indexable)
export class CardDeck<C extends Card> {
	static HexByte = HexByte.DeckIndex;

	init(..._args: unknown[]): void {
		//
	}
}
