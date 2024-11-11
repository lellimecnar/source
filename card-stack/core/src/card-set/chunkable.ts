import { chunk } from '@lellimecnar/utils';

import { type Card } from '../card';
import { hasMixin } from '../utils';
import { type CardSet } from './card-set';

export interface Chunkable extends CardSet {}
export class Chunkable {
	chunk(size: number): Card[][] {
		return chunk(this.cards, size);
	}
}

export const isChunkable = (obj: unknown): obj is Chunkable =>
	hasMixin(obj, Chunkable);
