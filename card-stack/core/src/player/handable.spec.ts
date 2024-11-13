import {
	Card,
	CardSet,
	Giveable,
	Handable,
	isCardSet,
	isHandable,
	Mix,
	Player,
} from '..';

describe('handable', () => {
	class TestCard extends Mix(Card) {}
	class TestHand extends Mix(CardSet<TestCard>, Giveable<TestCard>) {}
	class TestHandable extends Mix(Player, Handable<TestHand>) {
		hand = new TestHand(this);
	}

	it('is Handable', () => {
		const player = new TestHandable();
		expect(isHandable(player)).toBe(true);
	});

	it('has hand', () => {
		const player = new TestHandable();
		expect(isCardSet(player.hand)).toBe(true);
	});
});
