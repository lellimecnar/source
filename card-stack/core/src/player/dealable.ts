import { type Card } from '../card';
import { type CardSet, isCardSet } from '../card-set/card-set';
import { isGiveable } from '../card-set/giveable';
import { isTakeable } from '../card-set/takeable';
import { hasMixin } from '../utils';
import { type Player } from './player';

export interface Dealable extends Player {}
export class Dealable {
	static Hand: typeof CardSet;

	protected hand?: CardSet;

	draw(source: Card[] | CardSet, count?: number, fromIndex = 0): this {
		if (!isCardSet(this.hand) || !isGiveable(this.hand)) {
			throw new TypeError('Cannot draw to non-giveable hand');
		}

		if (isCardSet(source) && isTakeable(source)) {
			count ??= source.size;
			source = source.take(count, fromIndex);
		} else if (Array.isArray(source)) {
			count ??= source.length;
			source = source.slice(fromIndex, fromIndex + count);
		}

		if (Array.isArray(source) && source.length) {
			this.hand.give(source);
		}

		return this;
	}
}

export const isDealable = (obj: unknown): obj is Dealable =>
	hasMixin(obj, Dealable);
