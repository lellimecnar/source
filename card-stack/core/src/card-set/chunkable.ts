import { type CardSet, CardSetUtils } from '.';
import { hasMixin } from '..';

export interface Chunkable extends CardSet {}
export class Chunkable {
	chunk(size: number) {
		return CardSetUtils.chunk(this.cards, size);
	}
}

export const isChunkable = (obj: unknown): obj is Chunkable =>
	hasMixin(obj, Chunkable);
