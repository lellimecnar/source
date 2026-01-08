export class BloomFilter {
	private readonly bits: Uint8Array;
	private readonly size: number;
	private readonly hashCount: number;

	constructor(size: number, hashCount: number) {
		this.size = Math.max(8, size);
		this.hashCount = Math.max(1, hashCount);
		this.bits = new Uint8Array(Math.ceil(this.size / 8));
	}

	add(value: string): void {
		for (let i = 0; i < this.hashCount; i++) {
			const idx = this.hash(value, i) % this.size;
			const byteIdx = idx >> 3;
			const current = this.bits[byteIdx];
			if (current !== undefined) {
				this.bits[byteIdx] = current | (1 << (idx & 7));
			}
		}
	}

	mightContain(value: string): boolean {
		for (let i = 0; i < this.hashCount; i++) {
			const idx = this.hash(value, i) % this.size;
			const byteIdx = idx >> 3;
			const current = this.bits[byteIdx];
			if (current === undefined || (current & (1 << (idx & 7))) === 0)
				return false;
		}
		return true;
	}

	private hash(value: string, seed: number): number {
		let h = 2166136261 ^ seed;
		for (let i = 0; i < value.length; i++) {
			h ^= value.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
}
