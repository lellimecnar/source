import { type EnumType } from '../types';
import { hasMixin } from '../utils';
import { isCard, type Card } from './card';

export interface Suitable extends Card {}
export class Suitable {
	static SUIT: EnumType<any, any>;

	readonly suit!: number;

	get suitName() {
		return (this.constructor as typeof Suitable).SUIT[this.suit] as string;
	}

	init(...args: unknown[]) {
		if (!isCard(this)) {
			throw new Error(`Suitable must be mixed with Card`);
		}

		const ctor = this.constructor as typeof Suitable;

		if (!('SUIT' in ctor) || typeof ctor.SUIT !== 'object') {
			throw new Error(`SUIT is not defined in ${(ctor as any).name}`);
		}

		for (let arg of args) {
			if (
				typeof arg === 'string' &&
				arg in ctor.SUIT &&
				typeof ctor.SUIT[arg] === 'number'
			) {
				arg = ctor.SUIT[arg];
			}

			if (
				typeof arg === 'number' &&
				arg in ctor.SUIT &&
				typeof ctor.SUIT[arg] === 'string'
			) {
				// @ts-expect-error: suit is readonly
				this.suit = arg;

				break;
			}
		}
	}
}

export const isSuitable = (obj: unknown): obj is Suitable =>
	hasMixin(obj, Suitable);
