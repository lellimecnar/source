import { extractIndex, hasMixin, type HexByte } from '..';

export class Indexable {
	protected static HexByte: HexByte;
	protected static instances = new Map<number, Indexable>();
	protected static get index() {
		return Math.max(0, ...this.instances.keys()) || 0;
	}

	public static getInstance(id: number | Indexable) {
		if (id && typeof id !== 'number' && isIndexable(id)) {
			id = id.index;
		}

		const index = extractIndex(id, this.HexByte);

		return this.instances.get(index);
	}

	public static getIndex(offset = 0) {
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

		// console.dir({ index, offset, inc, result, hexByte });
		return result;
	}

	// @ts-expect-error: index defined in init
	readonly index: number;

	init() {
		// @ts-expect-error: index is readonly
		this.index = (this.constructor as typeof Indexable).getIndex(1);

		(this.constructor as typeof Indexable).instances.set(
			this.index,
			this as InstanceType<typeof Indexable>,
		);
	}
}

export const isIndexable = (obj: unknown): obj is Indexable =>
	hasMixin(obj, Indexable);
