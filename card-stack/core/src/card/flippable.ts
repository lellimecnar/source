import { hasMixin } from '../utils';
import { isCard, type Card } from './card';

export interface Flippable extends Card {}
export class Flippable {
	readonly flipped = false;

	flip(flipped?: boolean): this {
		if (typeof flipped !== 'undefined') {
			flipped = Boolean(flipped);
		}

		// @ts-expect-error: flipped is readonly
		this.flipped = flipped ?? !this.flipped;

		return this;
	}

	init(): void {
		if (!isCard(this)) {
			throw new Error(`Flippable must be mixed with Card`);
		}
	}
}

export const isFlippable = (obj: unknown): obj is Flippable =>
	hasMixin(obj, Flippable);
