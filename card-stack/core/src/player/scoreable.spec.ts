import { isScoreable, Mix, Player, Scoreable } from '..';

describe('scoreable', () => {
	class TestPlayer extends Mix(Player, Scoreable) {}

	it('is Scoreable', () => {
		const player = new TestPlayer();
		expect(isScoreable(player)).toBe(true);
	});

	it('has score', () => {
		const player = new TestPlayer();
		expect(player.score).toBe(0);
	});

	it('adds score', () => {
		const player = new TestPlayer();
		player.addScore(5);
		expect(player.score).toBe(5);
	});

	it('subtracts score', () => {
		const player = new TestPlayer();
		player.subScore(5);
		expect(player.score).toBe(-5);
	});

	it('accepts a max score', () => {
		class TestMaxScore extends Mix(Player, Scoreable) {
			static MAX_SCORE = 10;
		}
		const player = new TestMaxScore();
		player.addScore(20);
		expect(player.score).toBe(10);
	});

	it('accepts a min score', () => {
		class TestMinScore extends Mix(Player, Scoreable) {
			static MIN_SCORE = -10;
		}
		const player = new TestMinScore();
		player.subScore(20);
		expect(player.score).toBe(-10);
	});

	it('accepts a score increment', () => {
		class TestIncrement extends Mix(Player, Scoreable) {
			static SCORE_INCREMENT = 2;
		}
		const player = new TestIncrement();
		player.addScore();
		expect(player.score).toBe(2);
	});

	it('accepts a start score', () => {
		class TestStartScore extends Mix(Player, Scoreable) {
			static START_SCORE = 10;
		}
		const player = new TestStartScore();
		expect(player.score).toBe(10);
	});
});
