import { mix } from '../core';

describe('tS-Mixer Compatibility', () => {
	// Pattern used in card-stack: class Card extends Mix(Flippable, Rankable) {}
	it('should support the Mix(A, B) pattern', () => {
		class Flippable {
			isFaceUp = false;
			flip() {
				this.isFaceUp = !this.isFaceUp;
			}
		}

		class Rankable {
			rank = 1;
			setRank(r: number) {
				this.rank = r;
			}
		}

		class Card extends mix(Flippable, Rankable) {}

		const card = new Card();
		expect(card.isFaceUp).toBe(false);
		expect(card.rank).toBe(1);

		card.flip();
		expect(card.isFaceUp).toBe(true);

		card.setRank(10);
		expect(card.rank).toBe(10);

		expect(card instanceof Flippable).toBe(true);
		expect(card instanceof Rankable).toBe(true);
	});

	// Pattern: class Card extends Mix(Base, Mixin) {}
	it('should support mixing a base class with mixins', () => {
		class Entity {
			id = '123';
		}

		class Nameable {
			name = 'Unknown';
		}

		// In polymix, the base class must be the LAST argument if it has constructor params,
		// or we use mixWithBase(Base, ...mixins).
		// However, ts-mixer allows Mix(Base, Mixin).
		// Polymix treats all arguments as mixins unless the last one is a base.
		// If Entity is treated as a mixin, it works fine as long as we don't need `super` calls to it
		// in a way that requires it to be the actual prototype chain root.

		class User extends mix(Entity, Nameable) {}

		const user = new User();
		expect(user.id).toBe('123');
		expect(user.name).toBe('Unknown');
		expect(user instanceof Entity).toBe(true);
		expect(user instanceof Nameable).toBe(true);
	});

	it('should support init methods in the Mix pattern', () => {
		const log: string[] = [];

		class A {
			init() {
				log.push('A');
			}
		}
		class B {
			init() {
				log.push('B');
			}
		}

		class C extends mix(A, B) {}
		new C();

		expect(log).toEqual(['A', 'B']);
	});
});
