import {
	Card,
	createEnum,
	isRankable,
	isSuitable,
	Mix,
	Rankable,
	Suitable,
} from '..';

describe('card', () => {
	describe('rankable', () => {
		class RankableCard extends Mix(Card, Rankable) {
			static RANK = createEnum(['ACE', 'TWO', 'THREE']);
		}

		it('is Rankable', () => {
			const card = new RankableCard();
			expect(isRankable(card)).toBe(true);
		});

		it('has rank', () => {
			const ace = new RankableCard(RankableCard.RANK.ACE);
			expect(ace.rank).toBe(RankableCard.RANK.ACE);

			const two = new RankableCard(RankableCard.RANK.TWO);
			expect(two.rank).toBe(RankableCard.RANK.TWO);

			const three = new RankableCard(RankableCard.RANK.THREE);
			expect(three.rank).toBe(RankableCard.RANK.THREE);
		});

		describe('suitable', () => {
			class RankableSuitableCard extends Mix(Card, Rankable, Suitable) {
				static RANK = createEnum(['ACE', 'TWO', 'THREE']);
				static SUIT = createEnum(['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS']);
			}

			it('is Suitable', () => {
				const card = new RankableSuitableCard();
				expect(isSuitable(card)).toBe(true);
			});

			it('has suit', () => {
				const hearts = new RankableSuitableCard(
					RankableSuitableCard.SUIT.HEARTS,
				);
				expect(hearts.suit).toBe(RankableSuitableCard.SUIT.HEARTS);

				const diamonds = new RankableSuitableCard(
					RankableSuitableCard.SUIT.DIAMONDS,
				);
				expect(diamonds.suit).toBe(RankableSuitableCard.SUIT.DIAMONDS);

				const spades = new RankableSuitableCard(
					RankableSuitableCard.SUIT.SPADES,
				);
				expect(spades.suit).toBe(RankableSuitableCard.SUIT.SPADES);

				const clubs = new RankableSuitableCard(RankableSuitableCard.SUIT.CLUBS);
				expect(clubs.suit).toBe(RankableSuitableCard.SUIT.CLUBS);
			});

			it('is Rankable', () => {
				const card = new RankableSuitableCard();
				expect(isRankable(card)).toBe(true);
			});

			it('has rank', () => {
				const ace = new RankableSuitableCard(RankableSuitableCard.RANK.ACE);
				expect(ace.rank).toBe(RankableSuitableCard.RANK.ACE);

				const two = new RankableSuitableCard(RankableSuitableCard.RANK.TWO);
				expect(two.rank).toBe(RankableSuitableCard.RANK.TWO);

				const three = new RankableSuitableCard(RankableSuitableCard.RANK.THREE);
				expect(three.rank).toBe(RankableSuitableCard.RANK.THREE);
			});
		});
	});
});
