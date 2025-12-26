import { mix } from './core';
import {
	delegate,
	mixin,
	Use,
	pipe,
	compose,
	parallel,
	race,
	merge,
	first,
	all,
	any,
	override,
} from './decorators';
import { MIXIN_METADATA } from './utils';

describe('decorators', () => {
	describe('@mixin / @Use', () => {
		it('should apply mixin decorator', () => {
			class A {
				a = 1;
			}
			@mixin(A)
			class B {}
			const b = new B() as any;
			expect(b.a).toBe(1);
			expect(b).toBeInstanceOf(A);
		});

		it('should preserve the target class behavior when using @mixin', () => {
			class A {
				getA() {
					return 'a';
				}
			}

			class Base {
				getBase() {
					return 'base';
				}
			}

			@mixin(A)
			class B extends Base {
				getB() {
					return 'b';
				}
			}

			const b = new B() as any;
			expect(b.getBase()).toBe('base');
			expect(b.getA()).toBe('a');
			expect(b.getB()).toBe('b');
			expect(b).toBeInstanceOf(Base);
			expect(b).toBeInstanceOf(A);
		});

		it('@Use should be an alias for @mixin', () => {
			class Movable {
				move() {
					return 'moving';
				}
			}
			class Nameable {
				name = 'test';
			}

			@Use(Movable, Nameable)
			class Entity {}
			const e = new Entity() as any;
			expect(e).toBeInstanceOf(Movable);
			expect(e).toBeInstanceOf(Nameable);
			expect(e.move()).toBe('moving');
			expect(e.name).toBe('test');
		});
	});

	describe('strategy decorators', () => {
		it('@pipe should set strategy metadata', () => {
			class A {
				@pipe
				method(x: number) {
					return x + 1;
				}
			}

			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('pipe');
			const metadata = MIXIN_METADATA.get(A);
			expect(metadata?.strategies.get('method')).toBe('pipe');
		});

		it('@override should set strategy metadata', () => {
			class A {
				@override
				method() {
					return 'a';
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('override');
		});

		it('@compose should set strategy metadata', () => {
			class A {
				@compose
				method(x: number) {
					return x + 1;
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('compose');
		});

		it('@parallel should set strategy metadata', () => {
			class A {
				@parallel
				method() {
					return Promise.resolve(1);
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('parallel');
		});

		it('@race should set strategy metadata', () => {
			class A {
				@race
				method() {
					return Promise.resolve(1);
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('race');
		});

		it('@merge should set strategy metadata', () => {
			class A {
				@merge
				method() {
					return { a: 1 };
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('merge');
		});

		it('@first should set strategy metadata', () => {
			class A {
				@first
				method() {
					return 'first';
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('first');
		});

		it('@all should set strategy metadata', () => {
			class A {
				@all
				method() {
					return true;
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('all');
		});

		it('@any should set strategy metadata', () => {
			class A {
				@any
				method() {
					return true;
				}
			}
			const strategySymbol = Symbol.for('polymix:strategy:method');
			expect((A as any)[strategySymbol]).toBe('any');
		});

		it('@compose should process methods in reverse order with mix()', () => {
			class StepA {
				@compose
				process(x: number) {
					return x + 1;
				}
			}
			class StepB {
				@compose
				process(x: number) {
					return x * 2;
				}
			}
			// compose order: StepB first then StepA: (10 * 2) + 1 = 21
			const Mixed = mix(StepA, StepB);
			const result = new Mixed().process(10);
			expect(result).toBe(21);
		});

		it('@merge should deep-merge object results with mix()', () => {
			class PartA {
				@merge
				getData() {
					return { a: 1, nested: { x: 1 } };
				}
			}
			class PartB {
				@merge
				getData() {
					return { b: 2, nested: { y: 2 } };
				}
			}
			const Mixed = mix(PartA, PartB);
			const result = new Mixed().getData();
			expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 2 } });
		});

		it('@first should return first non-undefined result with mix()', () => {
			class CheckA {
				@first
				find() {
					return undefined;
				}
			}
			class CheckB {
				@first
				find() {
					return 'found';
				}
			}
			class CheckC {
				@first
				find() {
					return 'too late';
				}
			}
			const Mixed = mix(CheckA, CheckB, CheckC);
			const result = new Mixed().find();
			expect(result).toBe('found');
		});

		it('@race should return first resolved promise with mix()', async () => {
			class SlowTask {
				@race
				async run() {
					await new Promise((r) => setTimeout(r, 50));
					return 'slow';
				}
			}
			class FastTask {
				@race
				async run() {
					await new Promise((r) => setTimeout(r, 5));
					return 'fast';
				}
			}
			const Mixed = mix(SlowTask, FastTask);
			const result = await new Mixed().run();
			expect(result).toBe('fast');
		});

		it('@all should return true only if all are truthy with mix()', async () => {
			class TrueCheck {
				@all
				check() {
					return true;
				}
			}
			class FalseCheck {
				@all
				check() {
					return false;
				}
			}
			const AllTrue = mix(TrueCheck, TrueCheck);
			const HasFalse = mix(TrueCheck, FalseCheck);

			expect(await new AllTrue().check()).toBe(true);
			expect(await new HasFalse().check()).toBe(false);
		});

		it('@any should return true if any is truthy with mix()', async () => {
			class TrueCheck {
				@any
				check() {
					return true;
				}
			}
			class FalseCheck {
				@any
				check() {
					return false;
				}
			}
			const AllFalse = mix(FalseCheck, FalseCheck);
			const HasTrue = mix(FalseCheck, TrueCheck);

			expect(await new AllFalse().check()).toBe(false);
			expect(await new HasTrue().check()).toBe(true);
		});
	});

	describe('@delegate', () => {
		it('should delegate methods from a property', () => {
			class MediaControls {
				play() {
					return 'play';
				}
				pause() {
					return 'pause';
				}
			}

			class AudioPlayer {
				@delegate(MediaControls)
				controls = new MediaControls();
			}

			const player = new AudioPlayer() as any;
			expect(typeof player.play).toBe('function');
			expect(typeof player.pause).toBe('function');
			expect(player.play()).toBe('play');
			expect(player.pause()).toBe('pause');
		});

		it('should not overwrite existing methods', () => {
			class Logger {
				log() {
					return 'delegated';
				}
			}

			class App {
				@delegate(Logger)
				logger = new Logger();

				log() {
					return 'own';
				}
			}

			const app = new App();
			expect(app.log()).toBe('own');
		});
	});
});
