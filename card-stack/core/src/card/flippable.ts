import { type Card, isCard } from '.';
import { hasMixin } from '..';

export interface Flippable extends Card {}
export class Flippable {
	readonly flipped = false;

	flip(flipped?: boolean) {
		if (typeof flipped !== 'undefined') {
			flipped = Boolean(flipped);
		}

		// @ts-expect-error: flipped is readonly
		this.flipped = flipped ?? !this.flipped;
	}

	init() {
		if (!isCard(this)) {
			throw new Error(`Flippable must be mixed with Card`);
		}
	}
}

export const isFlippable = (obj: unknown): obj is Flippable =>
	hasMixin(obj, Flippable);
