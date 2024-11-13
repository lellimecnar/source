import { isIndexable, isPlayer, Mix, Player } from '..';

describe('player', () => {
	class TestPlayer extends Mix(Player) {}

	it('is Player', () => {
		const player = new TestPlayer();
		expect(isPlayer(player)).toBe(true);
	});

	it('is Indexable', () => {
		const player = new TestPlayer();
		expect(isIndexable(player)).toBe(true);
	});
});
