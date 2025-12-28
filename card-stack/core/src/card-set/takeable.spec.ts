import { faker } from '@faker-js/faker';
import { vi } from 'vitest';

import { Card, CardSet, isTakeable, Mix, Takeable } from '..';

describe('takeable', () => {
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
	class TestTakeable extends Mix(CardSet<TestCard>, Takeable<TestCard>) {}

	const createTakeable = () => {
		const card1 = new TestCard('O', 'S', 'I');
		const card2 = new TestCard('Q', 'C', 'J');
		const card3 = new TestCard('A', 'P', 'K');
		const card4 = new TestCard('W', 'E', 'H');
		const card5 = new TestCard('T', 'U', 'V');
		const card6 = new TestCard('M', 'L', 'N');
		const card7 = new TestCard('G', 'X', 'D');
		const card8 = new TestCard('B', 'R', 'F');
		const cards = [card1, card2, card3, card4, card5, card6, card7, card8];
		const cardSet = new TestTakeable(cards);

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

	it('is Takeable', () => {
		const cardSet = new TestTakeable();
		expect(isTakeable(cardSet)).toBe(true);
	});

	describe('takeRight', () => {
		it('accepts a count', () => {
			const { card6, card7, card8, cardSet } = createTakeable();
			expect(cardSet.takeRight(3)).toStrictEqual([card6, card7, card8]);

			const cards = [...cardSet];
			expect(cards).not.toContain(card6);
			expect(cards).not.toContain(card7);
			expect(cards).not.toContain(card8);
		});

		it('defaults to 1 card', () => {
			const { card8, cardSet } = createTakeable();
			expect(cardSet.takeRight()).toStrictEqual([card8]);
			expect([...cardSet]).not.toContain(card8);
		});

		it('accepts an index', () => {
			const { card5, card6, cardSet } = createTakeable();
			expect(cardSet.takeRight(2, 2)).toStrictEqual([card5, card6]);

			const cards = [...cardSet];
			expect(cards).not.toContain(card5);
			expect(cards).not.toContain(card6);
		});
	});

	describe('takeAt', () => {
		it('accepts indexes', () => {
			const { card3, card4, card7, card8, cardSet } = createTakeable();
			expect(cardSet.takeAt(3, 6, 2, 9, 8, 7)).toStrictEqual([
				card4,
				card7,
				card3,
				undefined,
				undefined,
				card8,
			]);

			const cards = [...cardSet];
			expect(cards).not.toContain(card3);
			expect(cards).not.toContain(card4);
			expect(cards).not.toContain(card7);
			expect(cards).not.toContain(card8);
		});
	});

	describe('takeRandom', () => {
		beforeEach(() => {
			faker.seed(1234567890);

			vi.spyOn(Math, 'random').mockImplementation(() => {
				return faker.number.float();
			});
		});

		afterEach(() => {
			vi.spyOn(Math, 'random').mockRestore();
		});

		it('accepts a count', () => {
			const { card4, card5, card8, cardSet } = createTakeable();

			expect(cardSet.takeRandom(3)).toStrictEqual([
				card5, // "T U V",
				card8, // "B R F",
				card4, // "W E H",
			]);

			const cards = [...cardSet];
			expect(cards).not.toContain(card4);
			expect(cards).not.toContain(card5);
			expect(cards).not.toContain(card8);
		});
	});
});
