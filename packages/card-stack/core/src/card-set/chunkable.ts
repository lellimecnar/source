/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- ignore */
import { chunk } from '@lellimecnar/utils';

import { type Card } from '../card/card';
import { isCardSet } from '../utils';
import { type CardSet } from './card-set';

// eslint-disable-next-line -- use interface, not type
export interface Chunkable<C extends Card> extends CardSet<C> {}
export class Chunkable<C extends Card> {
	chunk(size: number): C[][] {
		return chunk(this.cards, size);
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Chunkable must be mixed with CardSet');
		}
	}
}
