import { isNameable, Mix, Nameable } from '..';

describe('nameable', () => {
	class TestNameable extends Mix(Nameable) {
		constructor(name?: string) {
			super();
			this.name = name;
		}
	}

	it('is Nameable', () => {
		const nameable = new TestNameable();
		expect(isNameable(nameable)).toBe(true);
	});

	it('has name', () => {
		const nameable = new TestNameable('Lance');
		expect(nameable.name).toBe('Lance');
	});
});
