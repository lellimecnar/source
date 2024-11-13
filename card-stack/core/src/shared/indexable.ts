import { type HexByte } from '../types';
import { extractIndex } from '../utils';

const indexes = new Set<typeof Indexable>();
export class Indexable {
	protected static HexByte: HexByte;
	protected static instances = new Map<number, Indexable>();
	protected static get index(): number {
		return Math.max(0, ...this.instances.keys()) || 0;
	}

	public static findIndexable<T extends Indexable>(
		predicate: Parameters<(typeof Indexable)[]['find']>[0],
	): T | undefined {
		return Array.from(indexes).find(predicate) as T | undefined;
	}

	public static getInstance(id: number): InstanceType<typeof this> | undefined {
		id = extractIndex(id, this.HexByte);

		return this.instances.get(id);
	}

	public static getIndex(offset = 0): number {
		// eslint-disable-next-line @typescript-eslint/no-this-alias, @typescript-eslint/ban-types -- ignore
		let ctor: Function = this;
		let hexByte: HexByte | undefined = this.HexByte;

		while (typeof hexByte !== 'number' && ctor !== Function) {
			ctor = ctor.constructor;
			hexByte ??= (ctor as any).HexByte;
		}

		if (typeof hexByte !== 'number') {
			throw new Error(`HexByte not defined on ${this.name}`);
		}

		const index = this.index;
		offset = Math.max(0, offset);
		const inc = this.HexByte * offset;
		const result = index + inc;

		return result;
	}

	public static getNextIndex(): number {
		return this.getIndex(1);
	}

	// @ts-expect-error: index defined in init
	readonly index: number;

	init(..._args: unknown[]): void {
		// @ts-expect-error: index is readonly
		this.index = (this.constructor as typeof Indexable).getNextIndex();

		(this.constructor as typeof Indexable).instances.set(
			this.index,
			this as InstanceType<typeof Indexable>,
		);
		indexes.add(this.constructor as typeof Indexable);
	}
}
