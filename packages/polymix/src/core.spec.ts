import { mix, mixWithBase } from './core';
import { pipe, parallel, abstract } from './decorators';
import { strategies } from './strategies';
import { from, hasMixin, when } from './utils';
import 'reflect-metadata';

describe('polymix Core: mix()', () => {
	// 1. Basic Mixin Composition
	describe('basic Composition', () => {
		class Movable {
			x = 0;
			y = 0;
			move(x: number, y: number) {
				this.x += x;
				this.y += y;
			}
		}

		class Nameable {
			name = 'Untitled';
			setName(name: string) {
				this.name = name;
			}
		}

		const Entity = mix(Movable, Nameable);
		const entity = new Entity();

		it('should have properties from all mixins', () => {
			expect(entity.x).toBe(0);
			expect(entity.name).toBe('Untitled');
		});

		it('should have methods from all mixins', () => {
			entity.move(10, 20);
			entity.setName('MyEntity');
			expect(entity.x).toBe(10);
			expect(entity.y).toBe(20);
			expect(entity.name).toBe('MyEntity');
		});

		it('should pass `instanceof` checks for all mixins', () => {
			expect(entity).toBeInstanceOf(Entity);
			expect(entity).toBeInstanceOf(Movable);
			expect(entity).toBeInstanceOf(Nameable);
		});

		it('should work with hasMixin type guard', () => {
			expect(hasMixin(entity, Movable)).toBe(true);
			expect(hasMixin(entity, Nameable)).toBe(true);
			// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- testing
			expect(hasMixin(entity, class {})).toBe(false);
		});
	});

	// 2. Method Overriding and Strategies
	describe('method Overriding & Strategies', () => {
		class Logger {
			log(message: string) {
				return `Log: ${message}`;
			}
		}

		class TimestampedLogger {
			log(message: string) {
				return `${new Date().toISOString()}: ${message}`;
			}
		}

		it('should override methods by default (last one wins)', () => {
			const Mixed = mix(Logger, TimestampedLogger);
			const logger = new Mixed();
			// This test is time-sensitive, so we just check the format
			expect(logger.log('test')).toMatch(
				/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z: test/,
			);
		});

		it('should compose methods with the `pipe` strategy', () => {
			class Stringifier {
				@pipe
				process(data: any) {
					return JSON.stringify(data);
				}
			}
			class Reverser {
				@pipe
				process(data: string) {
					return data.split('').reverse().join('');
				}
			}

			const Piped = mix(Stringifier, Reverser);
			const processor = new Piped();
			const result = processor.process({ a: 1 });
			expect(result).toBe('}1:"a"{'); // Reverse of '{"a":1}'
		});

		it('should compose methods with the `parallel` strategy', async () => {
			class Task1 {
				@parallel
				run() {
					return Promise.resolve('Task1 done');
				}
			}
			class Task2 {
				@parallel
				run() {
					return Promise.resolve('Task2 done');
				}
			}
			const Parallel = mix(Task1, Task2);
			const runner = new Parallel();
			const results = await runner.run();
			expect(results).toEqual(['Task1 done', 'Task2 done']);
		});
	});

	// 3. Base Class and Constructor Handling
	describe('base Class & Constructors', () => {
		class Base {
			isBase = true;
			constructor(public name: string) {}
		}

		class MixinA {
			isA = true;
		}

		it('should extend a base class correctly', () => {
			const Mixed = mix(MixinA, Base);
			const instance = new Mixed('MyBase');

			expect(instance.isBase).toBe(true);
			expect(instance.isA).toBe(true);
			expect(instance.name).toBe('MyBase');
			expect(instance).toBeInstanceOf(Base);
			expect(instance).toBeInstanceOf(MixinA);
		});

		it('should support explicit base classes via mixWithBase()', () => {
			class BaseNoArgs {
				isBase = true;
				getBaseName() {
					return 'BaseNoArgs';
				}
			}
			class MixinB {
				isB = true;
			}

			const Mixed = mixWithBase(BaseNoArgs, MixinB);
			const instance = new Mixed();

			expect(instance.isBase).toBe(true);
			expect(instance.isB).toBe(true);
			expect(instance.getBaseName()).toBe('BaseNoArgs');
			expect(instance).toBeInstanceOf(BaseNoArgs);
			expect(instance).toBeInstanceOf(MixinB);
		});
	});

	// 4. Static Properties and Methods
	describe('statics', () => {
		// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- testing
		class WithStatic {
			static staticProp = 'hello';
			static staticMethod() {
				return 'world';
			}
		}

		const Mixed = mix(WithStatic);

		it('should copy static properties', () => {
			expect(Mixed.staticProp).toBe('hello');
		});

		it('should copy static methods', () => {
			expect(Mixed.staticMethod()).toBe('world');
		});
	});

	// 5. Abstract Mixins
	describe('abstract Mixins', () => {
		@abstract
		class AbstractMixin {
			// This is a conceptual abstract method, not a real TS abstract method.
			// The implementation should be provided by the class that uses the mixin.
			performAction(): string {
				throw new Error('Method not implemented.');
			}
		}

		class Concrete extends mix(AbstractMixin) {
			performAction() {
				return 'Action performed';
			}
		}

		it('should allow overriding a method from an abstract mixin', () => {
			const instance = new Concrete();
			expect(instance.performAction()).toBe('Action performed');
			expect(instance).toBeInstanceOf(AbstractMixin);
		});

		it('should not instantiate abstract mixins directly', () => {
			const instance = new Concrete();
			// No properties from AbstractMixin should be on the instance
			// as it's not instantiated.
			expect(Object.keys(instance).includes('performAction')).toBe(false);
		});
	});

	// 6. Advanced Features
	describe('advanced Features', () => {
		it('should support `from()` for method disambiguation', () => {
			class A {
				method() {
					return 'A';
				}
			}
			class B {
				method() {
					return 'B';
				}
			}
			const Mixed = mix(A, B);
			const instance = new Mixed();

			expect(instance.method()).toBe('B'); // Default override
			expect(from(instance, A).method()).toBe('A');
			expect(from(instance, B).method()).toBe('B');
		});

		it('should support conditional mixins with `when()`', () => {
			class FeatureA {
				hasA = true;
			}
			const condition = true;
			const Mixed = mix(when(condition, FeatureA));
			const instance = new Mixed();

			expect(hasMixin(instance, FeatureA)).toBe(true);
			expect((instance as any).hasA).toBe(true);

			const condition2 = false;
			const Mixed2 = mix(when(condition2, FeatureA));
			const instance2 = new Mixed2();
			expect(hasMixin(instance2, FeatureA)).toBe(false);
		});

		it('should copy decorator metadata (`reflect-metadata`)', () => {
			// Define metadata on a mixin
			@Reflect.metadata('classKey', 'classValue')
			class MixinWithMeta {
				@Reflect.metadata('propKey', 'propValue')
				get myProp(): string {
					return 'value';
				}
			}

			const Mixed = mix(MixinWithMeta);

			const classMeta = Reflect.getMetadata('classKey', Mixed);
			const propMeta = Reflect.getMetadata(
				'propKey',
				Mixed.prototype,
				'myProp',
			);

			expect(classMeta).toBe('classValue');
			expect(propMeta).toBe('propValue');
		});

		it('should compose symbol-named methods', () => {
			const sym = Symbol('symMethod');
			class A {
				[sym]() {
					return 'A';
				}
			}
			class B {
				[sym]() {
					return 'B';
				}
			}

			const Mixed = mix(A, B);
			const instance = new Mixed() as any;
			expect(instance[sym]()).toBe('B');
		});

		it('should support symbol strategy keys via strategies.for()', () => {
			class StepA {
				static get [strategies.for('process')]() {
					return strategies.pipe;
				}
				process(x: number) {
					return x + 1;
				}
			}
			class StepB {
				process(x: number) {
					return x * 2;
				}
			}

			const Pipeline = mix(StepA, StepB);
			const instance = new Pipeline();
			expect(instance.process(10)).toBe(22);
		});
	});

	// 7. Edge Cases
	describe('edge Cases', () => {
		it('should handle empty mixins array', () => {
			const Empty = mix();
			expect(() => new Empty()).not.toThrow();
		});

		it('should filter out non-function values', () => {
			class ValidMixin {
				valid = true;
			}
			const Mixed = mix(ValidMixin, null as any, undefined as any);
			const instance = new Mixed();
			expect(instance.valid).toBe(true);
		});

		it('should handle mixins with getters and setters', () => {
			class WithAccessors {
				private _value = 42;
				get computed() {
					return this._value;
				}
				set computed(v: number) {
					this._value = v;
				}
			}
			const Mixed = mix(WithAccessors);
			const instance = new Mixed() as any;
			expect(instance.computed).toBe(42);
			instance.computed = 100;
			expect(instance.computed).toBe(100);
		});

		it('should continue composition when mixin constructor throws', () => {
			class Faulty {
				constructor() {
					throw new Error('constructor failed');
				}
				method() {
					return 'works';
				}
			}
			const Mixed = mix(Faulty);
			// Constructor throws, but prototype methods should still be available
			const instance = new Mixed();
			expect(instance.method()).toBe('works');
		});

		it('should handle many mixins (10+)', () => {
			class M0 {
				p0 = 0;
			}
			class M1 {
				p1 = 1;
			}
			class M2 {
				p2 = 2;
			}
			class M3 {
				p3 = 3;
			}
			class M4 {
				p4 = 4;
			}
			class M5 {
				p5 = 5;
			}
			class M6 {
				p6 = 6;
			}
			class M7 {
				p7 = 7;
			}
			class M8 {
				p8 = 8;
			}
			class M9 {
				p9 = 9;
			}

			const Mixed = mix(M0, M1, M2, M3, M4, M5, M6, M7, M8, M9);
			const instance = new Mixed() as any;
			expect(instance.p0).toBe(0);
			expect(instance.p9).toBe(9);
		});

		it('should copy static symbol properties', () => {
			const sym = Symbol('staticSym');
			// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- testing
			class WithSymbol {
				static [sym] = 'symbolValue';
			}
			const Mixed = mix(WithSymbol) as any;
			expect(Mixed[sym]).toBe('symbolValue');
		});

		it('when(false, ...) should not add mixin properties', () => {
			class Feature {
				featureProp = true;
			}
			const Mixed = mix(when(false, Feature));
			const instance = new Mixed() as any;
			expect('featureProp' in instance).toBe(false);
			expect(hasMixin(instance, Feature)).toBe(false);
		});

		it('when(true, ...) should add mixin properties', () => {
			class Feature {
				featureProp = true;
			}
			const Mixed = mix(when(true, Feature));
			const instance = new Mixed() as any;
			expect(instance.featureProp).toBe(true);
			expect(hasMixin(instance, Feature)).toBe(true);
		});
	});
});
