import { Card, Flippable, isFlippable, Mix } from '..';

describe('card', () => {
	describe('flippable', () => {
		class FlippableCard extends Mix(Card, Flippable) {}

		it('is Flippable', () => {
			const card = new FlippableCard();
			expect(isFlippable(card)).toBe(true);
		});

		it('toggles flipped property', () => {
			const card = new FlippableCard();
			expect(card.flipped).toBe(false);

			card.flip();
			expect(card.flipped).toBe(true);

			card.flip();
			expect(card.flipped).toBe(false);
		});
	});
});
