import { from, hasMixin, mix, mixWithBase, when } from '..';

describe('rEADME examples', () => {
	it('quick Start composition works', () => {
		class Identifiable {
			id = '123';
		}

		class Timestamped {
			createdAt = new Date();
		}

		class User extends mix(Identifiable, Timestamped) {
			constructor(readonly name: string) {
				super();
			}
		}

		const user = new User('Alice');
		expect(user.id).toBe('123');
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user instanceof Identifiable).toBe(true);
		expect(user instanceof Timestamped).toBe(true);
		expect(user instanceof User).toBe(true);
	});

	it('hasMixin narrows types', () => {
		class Timestamped {
			updatedAt = new Date();
			touch() {
				this.updatedAt = new Date();
			}
		}

		const Entity = mix(Timestamped);
		const entity = new Entity();

		if (!hasMixin(entity, Timestamped)) {
			throw new Error('expected entity to have Timestamped mixin');
		}

		entity.touch();
		expect(entity.updatedAt).toBeInstanceOf(Date);
	});

	it('from() targets a specific mixin implementation', () => {
		class Fish {
			move() {
				return 'swimming';
			}
		}
		class Bird {
			move() {
				return 'flying';
			}
		}

		class FlyingFish extends mix(Fish, Bird) {
			moveInWater() {
				return from(this, Fish).move();
			}
			moveInAir() {
				return from(this, Bird).move();
			}
		}

		const ff = new FlyingFish();
		expect(ff.moveInWater()).toBe('swimming');
		expect(ff.moveInAir()).toBe('flying');
	});

	it('when() conditionally includes a mixin', () => {
		class Debuggable {
			debug = true;
		}

		const DevDevice = mix(when(true, Debuggable));
		const ProdDevice = mix(when(false, Debuggable));

		expect(hasMixin(new DevDevice(), Debuggable)).toBe(true);
		expect(hasMixin(new ProdDevice(), Debuggable)).toBe(false);
	});

	it('mixWithBase is explicit and avoids heuristic warning', () => {
		class Base {
			constructor(readonly name: string) {}
		}
		class Extra {
			extra = true;
		}

		class Thing extends mixWithBase(Base, Extra) {
			constructor(name: string) {
				super(name);
			}
		}

		const t = new Thing('x');
		expect(t.name).toBe('x');
		expect(t.extra).toBe(true);
		expect(t instanceof Base).toBe(true);
	});

	it('mix() heuristic warns when last class has constructor params', () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		try {
			class MixinA {
				a = true;
			}
			class Base {
				constructor(readonly name: string) {}
			}

			class Thing extends mix(MixinA, Base) {
				constructor(name: string) {
					super(name);
				}
			}

			const t = new Thing('x');
			expect(t.a).toBe(true);
			expect(t.name).toBe('x');
			expect(warn).toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});
