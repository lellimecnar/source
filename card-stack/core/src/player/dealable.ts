import { type Player } from '.';
import { CardSetUtils, hasMixin, type Card, type CardSet } from '..';

export interface Dealable extends Player {}
export class Dealable {
	static Hand: typeof CardSet;

	protected hand?: InstanceType<typeof Dealable.Hand>;

	init(...args: any[]) {
		const ctor = this.constructor as typeof Dealable;

		if (CardSetUtils.isCardSet(ctor.Hand)) {
			this.hand = new ctor.Hand(...args);
		}
	}

	draw(source: Card[] | CardSet, count?: number, fromIndex?: number) {
		if (
			!CardSetUtils.isCardSet(this.hand) ||
			!CardSetUtils.isGiveable(this.hand)
		) {
			throw new TypeError('Cannot draw to non-giveable hand');
		}

		this.hand.give(CardSetUtils.take(source, count, fromIndex));
	}
}

export const isDealable = (obj: unknown): obj is Dealable =>
	hasMixin(obj, Dealable);
