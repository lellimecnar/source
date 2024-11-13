import { Card, CardSet, isSortable, Mix, Sortable } from '..';

describe('sortable', () => {
	class TestCard extends Mix(Card) {
		A: string;
		B: string;
		C: string;

		constructor(A: string, B: string, C: string) {
			super();
			this.A = A;
			this.B = B;
			this.C = C;
		}
	}
	class TestSortable extends Mix(CardSet<TestCard>, Sortable<TestCard>) {}

	const createSortable = () => {
		const card1 = new TestCard('O', 'S', 'I');
		const card2 = new TestCard('Q', 'C', 'J');
		const card3 = new TestCard('A', 'P', 'K');
		const card4 = new TestCard('W', 'E', 'H');
		const card5 = new TestCard('T', 'U', 'V');
		const card6 = new TestCard('M', 'L', 'N');
		const card7 = new TestCard('G', 'X', 'D');
		const card8 = new TestCard('B', 'R', 'F');
		const cards = [card1, card2, card3, card4, card5, card6, card7, card8];
		const cardSet = new TestSortable(cards);

		return {
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
			card7,
			card8,
			cardSet,
			cards,
		};
	};

	it('is Sortable', () => {
		const cardSet = new TestSortable();
		expect(isSortable(cardSet)).toBe(true);
	});

	describe('sortBy', () => {
		it('accepts keys', () => {
			const {
				card1,
				card2,
				card3,
				card4,
				card5,
				card6,
				card7,
				card8,
				cardSet,
			} = createSortable();
			cardSet.sortBy('A');
			expect([...cardSet]).toStrictEqual([
				card3, // "A P K",
				card8, // "B R F",
				card7, // "G X D",
				card6, // "M L N",
				card1, // "O S I",
				card2, // "Q C J",
				card5, // "T U V",
				card4, // "W E H",
			]);

			cardSet.sortBy('B');
			expect([...cardSet]).toStrictEqual([
				card2, // "Q C J",
				card4, // "W E H",
				card6, // "M L N",
				card3, // "A P K",
				card8, // "B R F",
				card1, //  "O S I",
				card5, // "T U V",
				card7, // "G X D",
			]);

			cardSet.sortBy('C');
			expect([...cardSet]).toStrictEqual([
				card7, // "G X D",
				card8, // "B R F",
				card4, // "W E H",
				card1, // "O S I",
				card2, // "Q C J",
				card3, // "A P K",
				card6, // "M L N",
				card5, // "T U V",
			]);
		});
	});
});
