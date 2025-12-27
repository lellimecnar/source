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
	static instances = new Map<number, any>();
}

// `@mixin(...)` may replace the constructor; ensure required Indexable statics exist.
(CardDeck as any).HexByte ??= HexByte.DeckIndex;
(CardDeck as any).instances ??= new Map<number, any>();
