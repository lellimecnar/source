export class GapBuffer<T> {
	private buf: (T | undefined)[];
	private gapStart: number;
	private gapEnd: number;

	constructor(initialCapacity = 16) {
		this.buf = new Array(initialCapacity);
		this.gapStart = 0;
		this.gapEnd = initialCapacity;
	}

	get length(): number {
		return this.buf.length - (this.gapEnd - this.gapStart);
	}

	insert(position: number, value: T): void {
		this.moveGap(position);
		if (this.gapStart === this.gapEnd) this.grow();
		this.buf[this.gapStart] = value;
		this.gapStart++;
	}

	delete(position: number): void {
		this.moveGap(position);
		if (this.gapEnd < this.buf.length) {
			this.buf[this.gapEnd] = undefined;
			this.gapEnd++;
		}
	}

	toArray(): T[] {
		const out: T[] = [];
		for (let i = 0; i < this.buf.length; i++) {
			if (i >= this.gapStart && i < this.gapEnd) continue;
			const v = this.buf[i];
			if (typeof v !== 'undefined') out.push(v);
		}
		return out;
	}

	private moveGap(position: number): void {
		position = Math.max(0, Math.min(position, this.length));
		while (this.gapStart > position) {
			this.gapStart--;
			this.gapEnd--;
			this.buf[this.gapEnd] = this.buf[this.gapStart];
			this.buf[this.gapStart] = undefined;
		}
		while (this.gapStart < position) {
			this.buf[this.gapStart] = this.buf[this.gapEnd];
			this.buf[this.gapEnd] = undefined;
			this.gapStart++;
			this.gapEnd++;
		}
	}

	private grow(): void {
		const old = this.buf;
		const newCap = old.length * 2;
		const next = new Array<T | undefined>(newCap);

		const left = this.gapStart;
		for (let i = 0; i < left; i++) next[i] = old[i];

		const rightLen = old.length - this.gapEnd;
		const newGapEnd = newCap - rightLen;
		for (let i = 0; i < rightLen; i++)
			next[newGapEnd + i] = old[this.gapEnd + i];

		this.buf = next;
		this.gapEnd = newGapEnd;
	}
}
