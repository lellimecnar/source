import { Indexable, isIndexable, Mix } from '..';

describe('indexable', () => {
	const hexByte = 1;
	class TestIndexable extends Mix(Indexable) {
		static HexByte = hexByte;
	}

	it('is Indexable', () => {
		const indexable = new TestIndexable();
		expect(isIndexable(indexable)).toBe(true);
	});

	it('has incremented index', () => {
		const indexable = new TestIndexable();
		let index = TestIndexable.getIndex();

		expect(indexable.index).toBe(index);
		expect(new TestIndexable().index).toBe(++index);
		expect(new TestIndexable().index).toBe(++index);
		expect(new TestIndexable().index).toBe(++index);
		expect(new TestIndexable().index).toBe(++index);
	});

	describe('getInstance', () => {
		it('by id', () => {
			const indexable = new TestIndexable();
			const index = indexable.index;
			expect(TestIndexable.getInstance(index)).toBe(indexable);
		});

		it('by instance', () => {
			const indexable = new TestIndexable();
			expect(TestIndexable.getInstance(indexable)).toBe(indexable);
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
});
