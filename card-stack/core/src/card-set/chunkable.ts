import { chunk } from '@lellimecnar/utils';

import { type Card } from '../card';
import { hasMixin } from '../utils';
import { isCardSet, type CardSet } from './card-set';

export interface Chunkable extends CardSet {}
export class Chunkable {
	chunk(size: number): Card[][] {
		return chunk(this.cards, size);
	}

	init(..._args: unknown[]): void {
		if (!isCardSet(this)) {
			throw new Error('Chunkable must be mixed with CardSet');
		}
	}
}

export const isChunkable = (obj: unknown): obj is Chunkable =>
	hasMixin(obj, Chunkable);
