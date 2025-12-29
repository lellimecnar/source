import {
	Card,
	createRankEnum,
	createSuitEnum,
	isRankable,
	isSuitable,
	Mix,
	Rankable,
	Suitable,
} from '..';

describe('card', () => {
	describe('suitable', () => {
		class SuitableCard extends Mix(Card, Suitable) {
			static SUIT = createSuitEnum(['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS']);
		}

		it('is Suitable', () => {
			const card = new SuitableCard();
			expect(isSuitable(card)).toBe(true);
		});

		it('has suit', () => {
			const hearts = new SuitableCard(SuitableCard.SUIT.HEARTS);
			expect(hearts.suit).toBe(SuitableCard.SUIT.HEARTS);

			const diamonds = new SuitableCard(SuitableCard.SUIT.DIAMONDS);
			expect(diamonds.suit).toBe(SuitableCard.SUIT.DIAMONDS);

			const spades = new SuitableCard(SuitableCard.SUIT.SPADES);
			expect(spades.suit).toBe(SuitableCard.SUIT.SPADES);

			const clubs = new SuitableCard(SuitableCard.SUIT.CLUBS);
			expect(clubs.suit).toBe(SuitableCard.SUIT.CLUBS);
		});

		describe('rankable', () => {
			class SuitableRankableCard extends Mix(Card, Suitable, Rankable) {
				static RANK = createRankEnum(['ACE', 'TWO', 'THREE']);
				static SUIT = createSuitEnum(['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS']);
			}

			it('is Suitable', () => {
				const card = new SuitableRankableCard();
				expect(isSuitable(card)).toBe(true);
			});

			it('has suit', () => {
				const hearts = new SuitableRankableCard(
					SuitableRankableCard.SUIT.HEARTS,
				);
				expect(hearts.suit).toBe(SuitableRankableCard.SUIT.HEARTS);

				const diamonds = new SuitableRankableCard(
					SuitableRankableCard.SUIT.DIAMONDS,
				);
				expect(diamonds.suit).toBe(SuitableRankableCard.SUIT.DIAMONDS);

				const spades = new SuitableRankableCard(
					SuitableRankableCard.SUIT.SPADES,
				);
				expect(spades.suit).toBe(SuitableRankableCard.SUIT.SPADES);

				const clubs = new SuitableRankableCard(SuitableRankableCard.SUIT.CLUBS);
				expect(clubs.suit).toBe(SuitableRankableCard.SUIT.CLUBS);
			});

			it('is Rankable', () => {
				const card = new SuitableRankableCard();
				expect(isRankable(card)).toBe(true);
			});

			it('has rank', () => {
				const ace = new SuitableRankableCard(SuitableRankableCard.RANK.ACE);
				expect(ace.rank).toBe(SuitableRankableCard.RANK.ACE);

				const two = new SuitableRankableCard(SuitableRankableCard.RANK.TWO);
				expect(two.rank).toBe(SuitableRankableCard.RANK.TWO);

				const three = new SuitableRankableCard(SuitableRankableCard.RANK.THREE);
				expect(three.rank).toBe(SuitableRankableCard.RANK.THREE);
			});
		});
	});
});
