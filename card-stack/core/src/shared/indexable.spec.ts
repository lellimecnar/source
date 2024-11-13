import { Indexable, isIndexable, Mix } from '..';

describe('indexable', () => {
	const hexByte = 0x1000;
	class TestIndexable extends Mix(Indexable) {
		static __reset() {
			this.instances.clear();
		}

		static HexByte = hexByte;
	}

	beforeEach(() => {
		TestIndexable.__reset();
	});

	it('is Indexable', () => {
		const indexable = new TestIndexable();
		expect(isIndexable(indexable)).toBe(true);
	});

	it('has incremented index', () => {
		let index = TestIndexable.getIndex();

		Array.from({ length: 6 }).forEach(() => {
			index += TestIndexable.HexByte;
			expect(new TestIndexable().index).toBe(index);
		});
	});

	describe('getInstance', () => {
		it('by id', () => {
			const indexable = new TestIndexable();
			const id = indexable.index + 0x10;
			expect(TestIndexable.getInstance(id)).toBe(indexable);
		});
	});

	describe('getIndex', () => {
		it('returns latest index', () => {
			const indexable = new TestIndexable();
			expect(TestIndexable.getIndex(0)).toBe(indexable.index);
		});

		it('accepts offset', () => {
			const index = TestIndexable.getIndex(0);
			expect(TestIndexable.getIndex(1)).toBe(index + hexByte);
			expect(TestIndexable.getIndex(2)).toBe(index + hexByte * 2);
			expect(TestIndexable.getIndex(3)).toBe(index + hexByte * 3);
		});
	});

	describe('getNextIndex', () => {
		it('returns next index', () => {
			const index = TestIndexable.getIndex(0);
			const next = TestIndexable.getNextIndex();

			expect(next).toBeGreaterThan(index);
			expect(next).toBe(index + hexByte);
		});
	});
});
