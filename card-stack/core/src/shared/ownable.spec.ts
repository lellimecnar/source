import { Mix, Ownable, Player, isOwnable } from '..';

describe('ownable', () => {
	class TestPlayer extends Mix(Player) {}
	class TestOwnable extends Mix(Ownable<TestPlayer>) {
		constructor(owner?: TestPlayer) {
			super();
			this.owner = owner;
		}
	}

	it('is Ownable', () => {
		const ownable = new TestOwnable();
		expect(isOwnable(ownable)).toBe(true);
	});

	it('has owner', () => {
		const player = new TestPlayer();
		const ownable = new TestOwnable(player);
		expect(ownable.owner).toBe(player);
	});
});
