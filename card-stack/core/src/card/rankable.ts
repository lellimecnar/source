import { type EnumType } from '../types';
import { hasMixin } from '../utils';
import { type Card, isCard } from './card';

export interface Rankable extends Card {
	//
}
export class Rankable {
	static RANK: EnumType;

	readonly rank!: number;

	get rankName(): string {
		return (this.constructor as typeof Rankable).RANK[this.rank]!;
	}

	init(...args: unknown[]): void {
		if (!isCard(this)) {
			throw new Error(`Rankable must be mixed with Card`);
		}

		const ctor = this.constructor as typeof Rankable;

		if (!('RANK' in ctor)) {
			throw new Error(`RANK is not defined in ${(ctor as any).name}`);
		}

		for (let arg of args) {
			if (typeof arg === 'string' && typeof ctor.RANK[arg] === 'number') {
				arg = ctor.RANK[arg];
			}

			if (typeof arg === 'number' && typeof ctor.RANK[arg] === 'string') {
				// @ts-expect-error: rank is readonly
				this.rank = arg;

				break;
			}
		}
	}
}

export const isRankable = (obj: unknown): obj is Rankable =>
	hasMixin(obj, Rankable);
