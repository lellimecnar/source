/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */

import { type Card } from '../card';
import { CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';
import { HexByte } from '../types';
import { mixin } from '../utils';

export interface CardDeck<C extends Card> extends CardSet<C>, Indexable {}

@mixin(Indexable)
export class CardDeck<C extends Card> extends CardSet<C> {
	static HexByte = HexByte.DeckIndex;
}

// Some mixin decorators return a replacement constructor; ensure the exported
// class has the expected static HexByte even in that case.
(CardDeck as any).HexByte ??= HexByte.DeckIndex;
