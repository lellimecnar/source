import { type Card, isCard } from '.';
import { type EnumType, hasMixin } from '..';

export interface Rankable extends Card {}
export class Rankable {
	static RANK: EnumType<any, any>;

	readonly rank!: number;

	get rankName() {
		return (this.constructor as typeof Rankable).RANK[this.rank] as string;
	}

	init(...args: unknown[]) {
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
