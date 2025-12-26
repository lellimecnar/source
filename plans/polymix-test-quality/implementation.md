# Polymix Test Quality & Branch Coverage Gate

## Goal
Strengthen `packages/polymix` tests with higher-signal behavioral assertions (short-circuiting, precedence, error propagation) and enforce an **80% branch coverage** threshold in Jest, while removing timing-based flakiness.

## Prerequisites
Make sure that the use is currently on the `feat/polymix-test-quality` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from master.

### Step-by-Step Instructions

#### Step 1: Strategy short-circuit & error propagation tests
- [x] Update `packages/polymix/src/strategies.spec.ts` by replacing the entire file with the contents below.
- [x] Copy and paste code below into `packages/polymix/src/strategies.spec.ts`:

```typescript
import { applyStrategy } from './strategies';

describe('composition Strategies', () => {
	describe('override', () => {
		it('should return the result of the last function', () => {
			const fn1 = jest.fn().mockReturnValue(1);
			const fn2 = jest.fn().mockReturnValue(2);
			const result = applyStrategy('override', [fn1, fn2], null, 10);
			expect(result).toBe(2);
			expect(fn1).toHaveBeenCalledWith(10);
			expect(fn2).toHaveBeenCalledWith(10);
		});

		it('should default to override for unknown strategies (including symbols)', () => {
			const fn1 = jest.fn().mockReturnValue('first');
			const fn2 = jest.fn().mockReturnValue('last');
			const result = applyStrategy(Symbol('unknown'), [fn1, fn2], null, 1, 2);
			expect(result).toBe('last');
			expect(fn1).toHaveBeenCalledWith(1, 2);
			expect(fn2).toHaveBeenCalledWith(1, 2);
		});
	});

	describe('pipe', () => {
		it('should pipe results of synchronous functions', async () => {
			const fn1 = (a: number) => a + 1; // 11
			const fn2 = (a: number) => a * 2; // 22
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});

		it('should pipe results of asynchronous functions', async () => {
			const fn1 = async (a: number) => {
				await new Promise((r) => setTimeout(r, 10));
				return a + 1;
			};
			const fn2 = async (a: number) => {
				await new Promise((r) => setTimeout(r, 10));
				return a * 2;
			};
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});

		it('should pipe results of mixed sync/async functions', async () => {
			const fn1 = (a: number) => a + 1; // 11
			const fn2 = async (a: number) => a * 2; // 22
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});
	});

	describe('parallel', () => {
		it('should execute all functions in parallel and return results', async () => {
			const fn1 = async () => {
				await new Promise((r) => setTimeout(r, 20));
				return 1;
			};
			const fn2 = async () => {
				await new Promise((r) => setTimeout(r, 10));
				return 2;
			};
			const result = await applyStrategy('parallel', [fn1, fn2], null);
			expect(result).toEqual([1, 2]);
		});

		it('should pass arguments to all functions', async () => {
			const fn1 = jest.fn().mockResolvedValue(1);
			const fn2 = jest.fn().mockResolvedValue(2);
			await applyStrategy('parallel', [fn1, fn2], null, 'arg1', 'arg2');
			expect(fn1).toHaveBeenCalledWith('arg1', 'arg2');
			expect(fn2).toHaveBeenCalledWith('arg1', 'arg2');
		});
	});

	describe('merge', () => {
		it('should merge the results of all functions', () => {
			const fn1 = () => ({ a: 1 });
			const fn2 = () => ({ b: 2 });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: 1, b: 2 });
		});

		it('should deep-merge nested objects', () => {
			const fn1 = () => ({ a: { x: 1 }, b: 'old' });
			const fn2 = () => ({ a: { y: 2 }, b: 'new' });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: { x: 1, y: 2 }, b: 'new' });
		});

		it('should concatenate arrays when merging', () => {
			const fn1 = () => ({ items: [1, 2] });
			const fn2 = () => ({ items: [3] });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ items: [1, 2, 3] });
		});

		it('should handle overlapping properties by taking the last one', () => {
			const fn1 = () => ({ a: 1, b: 'old' });
			const fn2 = () => ({ b: 'new', c: 3 });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: 1, b: 'new', c: 3 });
		});
	});

	describe('first', () => {
		it('should return the first non-undefined result', () => {
			const fn1 = () => undefined;
			const fn2 = () => 'hello';
			const fn3 = () => 'world';
			const result = applyStrategy('first', [fn1, fn2, fn3], null);
			expect(result).toBe('hello');
		});

		it('should return undefined if all results are undefined', () => {
			const fn1 = () => undefined;
			const fn2 = () => undefined;
			const result = applyStrategy('first', [fn1, fn2], null);
			expect(result).toBeUndefined();
		});
	});

	describe('compose', () => {
		it('should compose in reverse order', async () => {
			const fn1 = (a: number) => a + 1;
			const fn2 = (a: number) => a * 2;
			// compose means: fn1(fn2(input)) when ordered [fn1, fn2]
			const result = await applyStrategy('compose', [fn1, fn2], null, 10);
			expect(result).toBe(21);
		});

		it('should compose when intermediate results are promise-like', async () => {
			const fn1 = (a: number) => a + 1;
			const fn2 = async (a: number) => {
				await new Promise((r) => setTimeout(r, 10));
				return a * 2;
			};

			// reduceRight applies fn2 first, producing a Promise, then fn1 receives the resolved value.
			const result = await applyStrategy('compose', [fn1, fn2], null, 10);
			expect(result).toBe(21);
		});
	});

	describe('race', () => {
		it('should return first resolved result', async () => {
			const slow = async () => {
				await new Promise((r) => setTimeout(r, 20));
				return 'slow';
			};
			const fast = async () => {
				await new Promise((r) => setTimeout(r, 5));
				return 'fast';
			};
			const result = await applyStrategy('race', [slow, fast], null);
			expect(result).toBe('fast');
		});
	});

	describe('all', () => {
		it('should return true if all are truthy', async () => {
			const fn1 = () => true;
			const fn2 = async () => true;
			const result = await applyStrategy('all', [fn1, fn2], null);
			expect(result).toBe(true);
		});

		it('should return false if any is falsy', async () => {
			const fn1 = () => true;
			const fn2 = () => false;
			const result = await applyStrategy('all', [fn1, fn2], null);
			expect(result).toBe(false);
		});
	});

	describe('any', () => {
		it('should return true if any is truthy', async () => {
			const fn1 = () => false;
			const fn2 = async () => true;
			const result = await applyStrategy('any', [fn1, fn2], null);
			expect(result).toBe(true);
		});

		it('should return false if all are falsy', async () => {
			const fn1 = () => false;
			const fn2 = () => 0;
			const result = await applyStrategy('any', [fn1, fn2], null);
			expect(result).toBe(false);
		});
	});

	describe('short-circuit behavior (behavioral)', () => {
		it('first: returns first defined value (including falsy) and does not call later functions', () => {
			const cases: Array<{ label: string; value: any }> = [
				{ label: '0', value: 0 },
				{ label: "''", value: '' },
				{ label: 'false', value: false },
			];

			for (const c of cases) {
				const fn1 = jest.fn(() => c.value);
				const fn2 = jest.fn(() => 'should-not-run');
				const fn3 = jest.fn(() => 'also-should-not-run');

				const result = applyStrategy('first', [fn1, fn2, fn3], null);
				expect(result).toBe(c.value);
				expect(fn1).toHaveBeenCalledTimes(1);
				expect(fn2).toHaveBeenCalledTimes(0);
				expect(fn3).toHaveBeenCalledTimes(0);
			}
		});

		it('first: returns undefined when all are undefined', () => {
			const fn1 = jest.fn(() => undefined);
			const fn2 = jest.fn(() => undefined);
			const fn3 = jest.fn(() => undefined);

			const result = applyStrategy('first', [fn1, fn2, fn3], null);
			expect(result).toBeUndefined();
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(1);
		});

		it('any: short-circuits when a truthy value is found', async () => {
			const fn1 = jest.fn(() => 0);
			const fn2 = jest.fn(() => 'truthy');
			const fn3 = jest.fn(() => true);

			const result = await applyStrategy('any', [fn1, fn2, fn3], null);
			expect(result).toBe(true);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});

		it('all: short-circuits when a falsy value is found', async () => {
			const fn1 = jest.fn(() => true);
			const fn2 = jest.fn(() => 0);
			const fn3 = jest.fn(() => true);

			const result = await applyStrategy('all', [fn1, fn2, fn3], null);
			expect(result).toBe(false);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});

		it('override: does not short-circuit (all functions are called)', () => {
			const fn1 = jest.fn(() => 'first');
			const fn2 = jest.fn(() => 'last');

			const result = applyStrategy('override', [fn1, fn2], null);
			expect(result).toBe('last');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('parallel: does not short-circuit (all functions are called)', async () => {
			const fn1 = jest.fn(async () => 1);
			const fn2 = jest.fn(async () => 2);

			const result = await applyStrategy('parallel', [fn1, fn2], null);
			expect(result).toEqual([1, 2]);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('race: first settled promise wins (both functions invoked)', async () => {
			function createDeferred<T>() {
				let resolve!: (value: T) => void;
				let reject!: (reason?: any) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}

			const slow = createDeferred<string>();
			const fast = createDeferred<string>();

			const fn1 = jest.fn(() => slow.promise);
			const fn2 = jest.fn(() => fast.promise);

			const promise = applyStrategy('race', [fn1, fn2], null) as Promise<string>;
			fast.resolve('fast');
			slow.resolve('slow');

			await expect(promise).resolves.toBe('fast');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('pipe: executes sequentially and passes the previous result', async () => {
			const seen: number[] = [];
			const fn1 = jest.fn((a: number) => {
				seen.push(a);
				return a + 1;
			});
			const fn2 = jest.fn((a: number) => {
				seen.push(a);
				return a * 2;
			});
			const fn3 = jest.fn((a: number) => {
				seen.push(a);
				return a - 3;
			});

			const result = await applyStrategy('pipe', [fn1, fn2, fn3], null, 10);
			expect(result).toBe(19);
			expect(seen).toEqual([10, 11, 22]);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(1);
		});

		it('compose: executes in reverse order (right-to-left)', async () => {
			const seen: number[] = [];
			const fn1 = jest.fn((a: number) => {
				seen.push(a);
				return a + 1;
			});
			const fn2 = jest.fn((a: number) => {
				seen.push(a);
				return a * 2;
			});
			const fn3 = jest.fn((a: number) => {
				seen.push(a);
				return a - 3;
			});

			const result = await applyStrategy('compose', [fn1, fn2, fn3], null, 10);
			expect(result).toBe(15);
			expect(seen).toEqual([10, 7, 14]);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(1);
		});

		it('merge: calls all functions and deep-merges results', () => {
			const fn1 = jest.fn(() => ({ a: { x: 1 }, items: [1] }));
			const fn2 = jest.fn(() => ({ a: { y: 2 }, items: [2], b: 'new' }));

			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: { x: 1, y: 2 }, items: [1, 2], b: 'new' });
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});
	});

	describe('error propagation (behavioral)', () => {
		it('first: sync throw propagates immediately', () => {
			const boom = new Error('boom');
			const fn1 = jest.fn(() => {
				throw boom;
			});
			const fn2 = jest.fn(() => 'should-not-run');

			expect(() => applyStrategy('first', [fn1, fn2], null)).toThrow(boom);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(0);
		});

		it('first: async rejection propagates', async () => {
			const fn1 = jest.fn(async () => {
				throw new Error('nope');
			});
			const fn2 = jest.fn(async () => 'should-not-run');

			await expect(
				applyStrategy('first', [fn1, fn2], null) as Promise<unknown>,
			).rejects.toThrow('nope');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(0);
		});

		it('parallel: one rejection propagates (Promise.all behavior)', async () => {
			const fn1 = jest.fn(async () => 1);
			const fn2 = jest.fn(async () => {
				throw new Error('fail');
			});

			await expect(
				applyStrategy('parallel', [fn1, fn2], null) as Promise<unknown>,
			).rejects.toThrow('fail');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('race: first rejection wins', async () => {
			function createDeferred<T>() {
				let resolve!: (value: T) => void;
				let reject!: (reason?: any) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}

			const a = createDeferred<string>();
			const b = createDeferred<string>();

			const fn1 = jest.fn(() => a.promise);
			const fn2 = jest.fn(() => b.promise);

			const p = applyStrategy('race', [fn1, fn2], null) as Promise<string>;
			a.reject(new Error('first-reject'));
			b.resolve('second-resolve');

			await expect(p).rejects.toThrow('first-reject');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('pipe: early throw stops the pipeline', async () => {
			const fn1 = jest.fn((x: number) => x + 1);
			const fn2 = jest.fn(() => {
				throw new Error('stop');
			});
			const fn3 = jest.fn(() => 'should-not-run');

			await expect(
				applyStrategy('pipe', [fn1, fn2, fn3], null, 10) as Promise<unknown>,
			).rejects.toThrow('stop');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});

		it('merge: error in any function propagates', () => {
			const fn1 = jest.fn(() => ({ a: 1 }));
			const fn2 = jest.fn(() => {
				throw new Error('merge-fail');
			});
			const fn3 = jest.fn(() => ({ b: 2 }));

			expect(() => applyStrategy('merge', [fn1, fn2, fn3], null)).toThrow(
				'merge-fail',
			);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});
	});
});
```

##### Step 1 Verification Checklist
- [x] `pnpm --filter polymix test -- strategies.spec`
- [x] `pnpm --filter polymix test -- --coverage --collectCoverageFrom="src/strategies.ts"`

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Core mixin composition & static descriptor tests
- [x] Update `packages/polymix/src/core.spec.ts` by replacing the entire file with the contents below.
- [x] Copy and paste code below into `packages/polymix/src/core.spec.ts`:

```typescript
import { mix, mixWithBase } from './core';
import {
	pipe,
	parallel,
	abstract,
	override,
	first,
	compose,
} from './decorators';
import { strategies } from './strategies';
import { from, hasMixin, when, MIXIN_METADATA } from './utils';
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

			// Defensive: instanceof should be false for non-objects.
			expect((123 as any) instanceof Movable).toBe(false);
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

		describe('strategy Precedence', () => {
			it('last mixin strategy wins when multiple mixins provide different strategies', () => {
				class A {
					@first
					method() {
						return 'A';
					}
				}
				class B {
					@override
					method() {
						return 'B';
					}
				}

				const Mixed = mix(A, B);
				const instance = new Mixed();
				expect(instance.method()).toBe('B');
			});

			it('strategy metadata lookup prefers MIXIN_METADATA over symbol strategy', () => {
				class A {
					@override
					method() {
						return 'A';
					}
				}
				class B {
					method() {
						return 'B';
					}
				}

				// Force a mismatch: symbol says "first", metadata says "override".
				const strategySymbol = Symbol.for('polymix:strategy:method');
				(A as any)[strategySymbol] = 'first';

				const Mixed = mix(A, B);
				const instance = new Mixed();

				// If symbol took precedence, we'd get 'A'. Metadata should win → override → 'B'.
				expect(instance.method()).toBe('B');
			});

			it('symbol strategy vs string strategy priority: MIXIN_METADATA wins even when symbol differs', () => {
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

				const metadata =
					MIXIN_METADATA.get(A as any) ??
					({ isAbstract: false, strategies: new Map(), decoratorMetadata: new Map() } as any);
				metadata.strategies.set('method', 'override');
				MIXIN_METADATA.set(A as any, metadata);

				const strategySymbol = Symbol.for('polymix:strategy:method');
				(A as any)[strategySymbol] = 'first';

				const Mixed = mix(A, B);
				const instance = new Mixed();
				expect(instance.method()).toBe('B');
			});
		});

		describe('method Composition Ordering', () => {
			it('override/last with 3 mixins → rightmost wins', () => {
				class A {
					@override
					value() {
						return 'A';
					}
				}
				class B {
					@override
					value() {
						return 'B';
					}
				}
				class C {
					@override
					value() {
						return 'C';
					}
				}

				const Mixed = mix(A, B, C);
				expect(new Mixed().value()).toBe('C');
			});

			it('first with 3 mixins → leftmost defined wins', () => {
				const calls: string[] = [];
				class A {
					@first
					value() {
						calls.push('A');
						return 'A';
					}
				}
				class B {
					@first
					value() {
						calls.push('B');
						return 'B';
					}
				}
				class C {
					@first
					value() {
						calls.push('C');
						return 'C';
					}
				}

				const Mixed = mix(A, B, C);
				expect(new Mixed().value()).toBe('A');
				expect(calls).toEqual(['A']);
			});

			it('pipe with 3 mixins → left-to-right', () => {
				class A {
					@pipe
					process(x: number) {
						return x + 1;
					}
				}
				class B {
					@pipe
					process(x: number) {
						return x * 2;
					}
				}
				class C {
					@pipe
					process(x: number) {
						return x - 3;
					}
				}

				const Mixed = mix(A, B, C);
				expect(new Mixed().process(10)).toBe(19);
			});

			it('compose with 3 mixins → right-to-left', () => {
				class A {
					@compose
					process(x: number) {
						return x + 1;
					}
				}
				class B {
					@compose
					process(x: number) {
						return x * 2;
					}
				}
				class C {
					@compose
					process(x: number) {
						return x - 3;
					}
				}

				const Mixed = mix(A, B, C);
				expect(new Mixed().process(10)).toBe(15);
			});
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

		describe('static Descriptor Fidelity', () => {
			it('preserves accessor descriptor for static getter/setter', () => {
				let value = 1;
				class WithAccessor {
					static get count() {
						return value;
					}
					static set count(v: number) {
						value = v;
					}
				}

				const M = mix(WithAccessor);
				const desc = Object.getOwnPropertyDescriptor(M, 'count');
				expect(desc?.get).toBeDefined();
				expect(desc?.set).toBeDefined();

				M.count = 123;
				expect(M.count).toBe(123);
			});

			it('preserves non-writable static property descriptor', () => {
				class WithNonWritable {}
				Object.defineProperty(WithNonWritable, 'fixed', {
					value: 42,
					writable: false,
					configurable: true,
					enumerable: true,
				});

				const M = mix(WithNonWritable);
				const desc = Object.getOwnPropertyDescriptor(M, 'fixed');
				expect(desc?.writable).toBe(false);
				expect((M as any).fixed).toBe(42);
			});

			it('preserves non-enumerable static property descriptor', () => {
				class WithNonEnumerable {}
				Object.defineProperty(WithNonEnumerable, 'hidden', {
					value: 'x',
					writable: true,
					configurable: true,
					enumerable: false,
				});

				const M = mix(WithNonEnumerable);
				const desc = Object.getOwnPropertyDescriptor(M, 'hidden');
				expect(desc?.enumerable).toBe(false);
				expect((M as any).hidden).toBe('x');
				expect(Object.keys(M)).not.toContain('hidden');
			});

			it('preserves non-configurable static property descriptor', () => {
				class WithNonConfigurable {}
				Object.defineProperty(WithNonConfigurable, 'sealed', {
					value: 'sealed',
					writable: true,
					configurable: false,
					enumerable: true,
				});

				const M = mix(WithNonConfigurable);
				const desc = Object.getOwnPropertyDescriptor(M, 'sealed');
				expect(desc?.configurable).toBe(false);
				expect((M as any).sealed).toBe('sealed');
			});

			it('copies symbol-keyed statics with descriptor intact', () => {
				const sym = Symbol('staticSymbol');
				class WithSymbol {}
				Object.defineProperty(WithSymbol, sym, {
					value: 'ok',
					writable: false,
					configurable: true,
					enumerable: false,
				});

				const M = mix(WithSymbol) as any;
				const desc = Object.getOwnPropertyDescriptor(M, sym);
				expect(M[sym]).toBe('ok');
				expect(desc?.writable).toBe(false);
				expect(desc?.enumerable).toBe(false);
			});
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

		it('from() should fall back to instance properties when not on the mixin prototype', () => {
			class A {
				method() {
					return 'A';
				}
			}
			class B {
				value = 123;
			}

			const Mixed = mix(A, B);
			const instance = new Mixed() as any;

			// `value` is an instance field from B, not on A.prototype.
			expect((from(instance, A) as any).value).toBe(123);
		});

		it('from() should support non-function prototype properties', () => {
			class A {
				method() {
					return 'A';
				}
			}
			Object.defineProperty(A.prototype, 'kind', {
				value: 'mixin-a',
				writable: false,
				configurable: true,
				enumerable: false,
			});

			class B {
				method() {
					return 'B';
				}
			}

			const Mixed = mix(A, B);
			const instance = new Mixed() as any;

			// Mixed does not copy non-method prototype properties, but `from()` can still expose them.
			expect(instance.kind).toBeUndefined();
			expect((from(instance, A) as any).kind).toBe('mixin-a');
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

		it('should copy decorator metadata (Symbol.metadata)', () => {
			const hadOwn = Object.prototype.hasOwnProperty.call(Symbol, 'metadata');
			const original = (Symbol as any).metadata;

			try {
				if (!(Symbol as any).metadata) {
					Object.defineProperty(Symbol, 'metadata', {
						value: Symbol('polymix:test:metadata'),
						configurable: true,
					});
				}

				class MetaA {}
				class MetaB {}

				(MetaA as any)[(Symbol as any).metadata] = { a: 1 };
				(MetaB as any)[(Symbol as any).metadata] = { b: 2 };

				const Mixed = mix(MetaA, MetaB) as any;
				expect(Mixed[(Symbol as any).metadata]).toEqual({ a: 1, b: 2 });
			} finally {
				if (hadOwn) {
					Object.defineProperty(Symbol, 'metadata', {
						value: original,
						configurable: true,
					});
				} else {
					// Best-effort cleanup if we introduced Symbol.metadata for the test.
					delete (Symbol as any).metadata;
				}
			}
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

		it('should ignore prototype keys with no descriptor (defensive)', () => {
			class WithMethod {
				foo() {
					return 'foo';
				}
			}
			class WithOtherMethod {
				bar() {
					return 'bar';
				}
			}

			const original = Object.getOwnPropertyDescriptor;
			const spy = jest
				.spyOn(Object, 'getOwnPropertyDescriptor')
				.mockImplementation((obj: any, prop: any) => {
					if (obj === WithMethod.prototype && prop === 'foo') {
						return undefined;
					}
					return original(obj, prop);
				});

			try {
				const Mixed = mix(WithMethod, WithOtherMethod);
				const instance = new Mixed() as any;
				expect(instance.bar()).toBe('bar');
				expect('foo' in instance).toBe(false);
			} finally {
				spy.mockRestore();
			}
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
```

##### Step 2 Verification Checklist
- [x] `pnpm --filter polymix test -- core.spec`
- [x] `pnpm --filter polymix test -- --coverage --collectCoverageFrom="src/core.ts"`

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Decorator metadata & utils edge cases
- [x] Update `packages/polymix/src/decorators.spec.ts` by replacing the entire file with the contents below.
- [x] Copy and paste code below into `packages/polymix/src/decorators.spec.ts`:

```typescript
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

		it('should keep prototype methods even when mixin construction fails (constructor requires args)', () => {
			class NeedsArgs {
				constructor(value: string) {
					if (value === undefined) throw new Error('missing value');
				}
				method() {
					return 'ok';
				}
			}

			@mixin(NeedsArgs)
			class Target {}

			const instance = new Target() as any;
			expect(instance.method()).toBe('ok');
			expect(instance).toBeInstanceOf(NeedsArgs);
		});

		it('should not overwrite an existing Symbol.hasInstance on a mixin', () => {
			const originalHasInstance = function (value: unknown): boolean {
				return !!value && typeof value === 'object' && (value as any).__marker === true;
			};

			class HasCustomInstanceCheck {}
			Object.defineProperty(HasCustomInstanceCheck, Symbol.hasInstance, {
				value: originalHasInstance,
				configurable: true,
			});

			@mixin(HasCustomInstanceCheck)
			class Target {}

			// installInstanceCheck() should not overwrite it.
			expect(HasCustomInstanceCheck[Symbol.hasInstance]).toBe(
				originalHasInstance,
			);

			const obj = { __marker: true };
			expect(obj instanceof HasCustomInstanceCheck).toBe(true);

			const inst = new Target();
			expect(inst instanceof HasCustomInstanceCheck).toBe(false);
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
```

- [x] Update `packages/polymix/src/__tests__/robustness.spec.ts` by replacing the entire file with the contents below.
- [x] Copy and paste code below into `packages/polymix/src/__tests__/robustness.spec.ts`:

```typescript
import { mix } from '../core';
import { delegate } from '../decorators';

describe('robustness', () => {
	it('should not crash composition when a mixin prototype has a throwing getter', () => {
		class ThrowingGetterMixin {
			get boom(): string {
				throw new Error('boom');
			}
		}

		class PlainMixin {
			value = 123;
		}

		expect(() => {
			class Mixed extends mix(ThrowingGetterMixin, PlainMixin) {}
			const instance = new Mixed() as any;
			expect(instance.value).toBe(123);
			expect(() => instance.boom).toThrow('boom');
		}).not.toThrow();
	});

	it('delegate() should support symbol property keys', () => {
		const controlsKey = Symbol('controls');

		class MediaControls {
			play() {
				return 'play';
			}
			pause() {
				return 'pause';
			}
		}

		class AudioPlayer {
			[controlsKey] = new MediaControls();
		}

		delegate(MediaControls)(AudioPlayer.prototype, controlsKey);

		const player = new AudioPlayer() as any;
		expect(player.play()).toBe('play');
		expect(player.pause()).toBe('pause');
	});

	it('should resolve strategy metadata for symbol-named methods via Symbol.for("polymix:strategy:...\")', () => {
		const sym = Symbol('doWork');
		const strategySymbol = Symbol.for(`polymix:strategy:${String(sym)}`);

		class A {
			static get [strategySymbol]() {
				return 'first';
			}
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
		expect(instance[sym]()).toBe('A');
	});

	it('delegate() should throw when the delegated property is missing/undefined', () => {
		class MediaControls {
			play() {
				return 'play';
			}
		}

		class AudioPlayer {
			controls?: MediaControls;
		}

		delegate(MediaControls)(AudioPlayer.prototype, 'controls');

		const player = new AudioPlayer() as any;
		expect(() => player.play()).toThrow();
	});
});
```

##### Step 3 Verification Checklist
- [x] `pnpm --filter polymix test -- decorators.spec robustness.spec`
- [x] `pnpm --filter polymix test -- --coverage`

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Enforce 80% branch coverage threshold
- [x] Update `packages/polymix/jest.config.js` by replacing the entire file with the contents below.
- [x] Copy and paste code below into `packages/polymix/jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	watchman: false,
	roots: ['<rootDir>/src'],
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/*.spec.ts',
		'!src/__tests__/**',
	],
};
```

##### Step 4 Verification Checklist
- [x] `pnpm --filter polymix test -- --coverage`
- [x] (Negative check) temporarily comment out a test assertion and confirm Jest fails with `coverageThreshold` errors; restore and re-run.

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Eliminate timing-based test flakiness
- [x] Remove all `setTimeout` usage from Polymix tests.
- [x] Update `packages/polymix/src/strategies.spec.ts` by replacing the entire file with the contents below.
- [x] Copy and paste code below into `packages/polymix/src/strategies.spec.ts`:

```typescript
import { applyStrategy } from './strategies';

describe('composition Strategies', () => {
	describe('override', () => {
		it('should return the result of the last function', () => {
			const fn1 = jest.fn().mockReturnValue(1);
			const fn2 = jest.fn().mockReturnValue(2);
			const result = applyStrategy('override', [fn1, fn2], null, 10);
			expect(result).toBe(2);
			expect(fn1).toHaveBeenCalledWith(10);
			expect(fn2).toHaveBeenCalledWith(10);
		});

		it('should default to override for unknown strategies (including symbols)', () => {
			const fn1 = jest.fn().mockReturnValue('first');
			const fn2 = jest.fn().mockReturnValue('last');
			const result = applyStrategy(Symbol('unknown'), [fn1, fn2], null, 1, 2);
			expect(result).toBe('last');
			expect(fn1).toHaveBeenCalledWith(1, 2);
			expect(fn2).toHaveBeenCalledWith(1, 2);
		});
	});

	describe('pipe', () => {
		it('should pipe results of synchronous functions', async () => {
			const fn1 = (a: number) => a + 1; // 11
			const fn2 = (a: number) => a * 2; // 22
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});

		it('should pipe results of asynchronous functions', async () => {
			const fn1 = async (a: number) => a + 1;
			const fn2 = async (a: number) => a * 2;
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});

		it('should pipe results of mixed sync/async functions', async () => {
			const fn1 = (a: number) => a + 1; // 11
			const fn2 = async (a: number) => a * 2; // 22
			const result = await applyStrategy('pipe', [fn1, fn2], null, 10);
			expect(result).toBe(22);
		});
	});

	describe('parallel', () => {
		it('should execute all functions in parallel and return results', async () => {
			function createDeferred<T>() {
				let resolve!: (value: T) => void;
				let reject!: (reason?: any) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}

			const a = createDeferred<number>();
			const b = createDeferred<number>();

			const fn1 = jest.fn(async () => a.promise);
			const fn2 = jest.fn(async () => b.promise);

			const p = applyStrategy('parallel', [fn1, fn2], null) as Promise<number[]>;

			// Resolve out of order to prove Promise.all preserves input ordering.
			b.resolve(2);
			a.resolve(1);

			await expect(p).resolves.toEqual([1, 2]);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('should pass arguments to all functions', async () => {
			const fn1 = jest.fn().mockResolvedValue(1);
			const fn2 = jest.fn().mockResolvedValue(2);
			await applyStrategy('parallel', [fn1, fn2], null, 'arg1', 'arg2');
			expect(fn1).toHaveBeenCalledWith('arg1', 'arg2');
			expect(fn2).toHaveBeenCalledWith('arg1', 'arg2');
		});
	});

	describe('merge', () => {
		it('should merge the results of all functions', () => {
			const fn1 = () => ({ a: 1 });
			const fn2 = () => ({ b: 2 });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: 1, b: 2 });
		});

		it('should deep-merge nested objects', () => {
			const fn1 = () => ({ a: { x: 1 }, b: 'old' });
			const fn2 = () => ({ a: { y: 2 }, b: 'new' });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: { x: 1, y: 2 }, b: 'new' });
		});

		it('should concatenate arrays when merging', () => {
			const fn1 = () => ({ items: [1, 2] });
			const fn2 = () => ({ items: [3] });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ items: [1, 2, 3] });
		});

		it('should handle overlapping properties by taking the last one', () => {
			const fn1 = () => ({ a: 1, b: 'old' });
			const fn2 = () => ({ b: 'new', c: 3 });
			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: 1, b: 'new', c: 3 });
		});
	});

	describe('first', () => {
		it('should return the first non-undefined result', () => {
			const fn1 = () => undefined;
			const fn2 = () => 'hello';
			const fn3 = () => 'world';
			const result = applyStrategy('first', [fn1, fn2, fn3], null);
			expect(result).toBe('hello');
		});

		it('should return undefined if all results are undefined', () => {
			const fn1 = () => undefined;
			const fn2 = () => undefined;
			const result = applyStrategy('first', [fn1, fn2], null);
			expect(result).toBeUndefined();
		});
	});

	describe('compose', () => {
		it('should compose in reverse order', async () => {
			const fn1 = (a: number) => a + 1;
			const fn2 = (a: number) => a * 2;
			// compose means: fn1(fn2(input)) when ordered [fn1, fn2]
			const result = await applyStrategy('compose', [fn1, fn2], null, 10);
			expect(result).toBe(21);
		});

		it('should compose when intermediate results are promise-like', async () => {
			const fn1 = (a: number) => a + 1;
			const fn2 = async (a: number) => a * 2;

			// reduceRight applies fn2 first, producing a Promise, then fn1 receives the resolved value.
			const result = await applyStrategy('compose', [fn1, fn2], null, 10);
			expect(result).toBe(21);
		});
	});

	describe('race', () => {
		it('should return first resolved result', async () => {
			function createDeferred<T>() {
				let resolve!: (value: T) => void;
				let reject!: (reason?: any) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}

			const slow = createDeferred<string>();
			const fast = createDeferred<string>();

			const slowFn = jest.fn(() => slow.promise);
			const fastFn = jest.fn(() => fast.promise);

			const p = applyStrategy('race', [slowFn, fastFn], null) as Promise<string>;
			fast.resolve('fast');
			slow.resolve('slow');

			await expect(p).resolves.toBe('fast');
			expect(slowFn).toHaveBeenCalledTimes(1);
			expect(fastFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('all', () => {
		it('should return true if all are truthy', async () => {
			const fn1 = () => true;
			const fn2 = async () => true;
			const result = await applyStrategy('all', [fn1, fn2], null);
			expect(result).toBe(true);
		});

		it('should return false if any is falsy', async () => {
			const fn1 = () => true;
			const fn2 = () => false;
			const result = await applyStrategy('all', [fn1, fn2], null);
			expect(result).toBe(false);
		});
	});

	describe('any', () => {
		it('should return true if any is truthy', async () => {
			const fn1 = () => false;
			const fn2 = async () => true;
			const result = await applyStrategy('any', [fn1, fn2], null);
			expect(result).toBe(true);
		});

		it('should return false if all are falsy', async () => {
			const fn1 = () => false;
			const fn2 = () => 0;
			const result = await applyStrategy('any', [fn1, fn2], null);
			expect(result).toBe(false);
		});
	});

	describe('short-circuit behavior (behavioral)', () => {
		it('first: returns first defined value (including falsy) and does not call later functions', () => {
			const cases: Array<{ label: string; value: any }> = [
				{ label: '0', value: 0 },
				{ label: "''", value: '' },
				{ label: 'false', value: false },
			];

			for (const c of cases) {
				const fn1 = jest.fn(() => c.value);
				const fn2 = jest.fn(() => 'should-not-run');
				const fn3 = jest.fn(() => 'also-should-not-run');

				const result = applyStrategy('first', [fn1, fn2, fn3], null);
				expect(result).toBe(c.value);
				expect(fn1).toHaveBeenCalledTimes(1);
				expect(fn2).toHaveBeenCalledTimes(0);
				expect(fn3).toHaveBeenCalledTimes(0);
			}
		});

		it('first: returns undefined when all are undefined', () => {
			const fn1 = jest.fn(() => undefined);
			const fn2 = jest.fn(() => undefined);
			const fn3 = jest.fn(() => undefined);

			const result = applyStrategy('first', [fn1, fn2, fn3], null);
			expect(result).toBeUndefined();
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(1);
		});

		it('any: short-circuits when a truthy value is found', async () => {
			const fn1 = jest.fn(() => 0);
			const fn2 = jest.fn(() => 'truthy');
			const fn3 = jest.fn(() => true);

			const result = await applyStrategy('any', [fn1, fn2, fn3], null);
			expect(result).toBe(true);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});

		it('all: short-circuits when a falsy value is found', async () => {
			const fn1 = jest.fn(() => true);
			const fn2 = jest.fn(() => 0);
			const fn3 = jest.fn(() => true);

			const result = await applyStrategy('all', [fn1, fn2, fn3], null);
			expect(result).toBe(false);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});

		it('override: does not short-circuit (all functions are called)', () => {
			const fn1 = jest.fn(() => 'first');
			const fn2 = jest.fn(() => 'last');

			const result = applyStrategy('override', [fn1, fn2], null);
			expect(result).toBe('last');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('parallel: does not short-circuit (all functions are called)', async () => {
			const fn1 = jest.fn(async () => 1);
			const fn2 = jest.fn(async () => 2);

			const result = await applyStrategy('parallel', [fn1, fn2], null);
			expect(result).toEqual([1, 2]);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('race: first settled promise wins (both functions invoked)', async () => {
			function createDeferred<T>() {
				let resolve!: (value: T) => void;
				let reject!: (reason?: any) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}

			const slow = createDeferred<string>();
			const fast = createDeferred<string>();

			const fn1 = jest.fn(() => slow.promise);
			const fn2 = jest.fn(() => fast.promise);

			const promise = applyStrategy('race', [fn1, fn2], null) as Promise<string>;
			fast.resolve('fast');
			slow.resolve('slow');

			await expect(promise).resolves.toBe('fast');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('pipe: executes sequentially and passes the previous result', async () => {
			const seen: number[] = [];
			const fn1 = jest.fn((a: number) => {
				seen.push(a);
				return a + 1;
			});
			const fn2 = jest.fn((a: number) => {
				seen.push(a);
				return a * 2;
			});
			const fn3 = jest.fn((a: number) => {
				seen.push(a);
				return a - 3;
			});

			const result = await applyStrategy('pipe', [fn1, fn2, fn3], null, 10);
			expect(result).toBe(19);
			expect(seen).toEqual([10, 11, 22]);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(1);
		});

		it('compose: executes in reverse order (right-to-left)', async () => {
			const seen: number[] = [];
			const fn1 = jest.fn((a: number) => {
				seen.push(a);
				return a + 1;
			});
			const fn2 = jest.fn((a: number) => {
				seen.push(a);
				return a * 2;
			});
			const fn3 = jest.fn((a: number) => {
				seen.push(a);
				return a - 3;
			});

			const result = await applyStrategy('compose', [fn1, fn2, fn3], null, 10);
			expect(result).toBe(15);
			expect(seen).toEqual([10, 7, 14]);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(1);
		});

		it('merge: calls all functions and deep-merges results', () => {
			const fn1 = jest.fn(() => ({ a: { x: 1 }, items: [1] }));
			const fn2 = jest.fn(() => ({ a: { y: 2 }, items: [2], b: 'new' }));

			const result = applyStrategy('merge', [fn1, fn2], null);
			expect(result).toEqual({ a: { x: 1, y: 2 }, items: [1, 2], b: 'new' });
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});
	});

	describe('error propagation (behavioral)', () => {
		it('first: sync throw propagates immediately', () => {
			const boom = new Error('boom');
			const fn1 = jest.fn(() => {
				throw boom;
			});
			const fn2 = jest.fn(() => 'should-not-run');

			expect(() => applyStrategy('first', [fn1, fn2], null)).toThrow(boom);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(0);
		});

		it('first: async rejection propagates', async () => {
			const fn1 = jest.fn(async () => {
				throw new Error('nope');
			});
			const fn2 = jest.fn(async () => 'should-not-run');

			await expect(
				applyStrategy('first', [fn1, fn2], null) as Promise<unknown>,
			).rejects.toThrow('nope');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(0);
		});

		it('parallel: one rejection propagates (Promise.all behavior)', async () => {
			const fn1 = jest.fn(async () => 1);
			const fn2 = jest.fn(async () => {
				throw new Error('fail');
			});

			await expect(
				applyStrategy('parallel', [fn1, fn2], null) as Promise<unknown>,
			).rejects.toThrow('fail');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('race: first rejection wins', async () => {
			function createDeferred<T>() {
				let resolve!: (value: T) => void;
				let reject!: (reason?: any) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}

			const a = createDeferred<string>();
			const b = createDeferred<string>();

			const fn1 = jest.fn(() => a.promise);
			const fn2 = jest.fn(() => b.promise);

			const p = applyStrategy('race', [fn1, fn2], null) as Promise<string>;
			a.reject(new Error('first-reject'));
			b.resolve('second-resolve');

			await expect(p).rejects.toThrow('first-reject');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
		});

		it('pipe: early throw stops the pipeline', async () => {
			const fn1 = jest.fn((x: number) => x + 1);
			const fn2 = jest.fn(() => {
				throw new Error('stop');
			});
			const fn3 = jest.fn(() => 'should-not-run');

			await expect(
				applyStrategy('pipe', [fn1, fn2, fn3], null, 10) as Promise<unknown>,
			).rejects.toThrow('stop');
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});

		it('merge: error in any function propagates', () => {
			const fn1 = jest.fn(() => ({ a: 1 }));
			const fn2 = jest.fn(() => {
				throw new Error('merge-fail');
			});
			const fn3 = jest.fn(() => ({ b: 2 }));

			expect(() => applyStrategy('merge', [fn1, fn2, fn3], null)).toThrow(
				'merge-fail',
			);
			expect(fn1).toHaveBeenCalledTimes(1);
			expect(fn2).toHaveBeenCalledTimes(1);
			expect(fn3).toHaveBeenCalledTimes(0);
		});
	});
});
```

- [x] Update `packages/polymix/src/decorators.spec.ts` by replacing the entire file with the contents below.
- [x] Copy and paste code below into `packages/polymix/src/decorators.spec.ts`:

```typescript
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

		it('should keep prototype methods even when mixin construction fails (constructor requires args)', () => {
			class NeedsArgs {
				constructor(value: string) {
					if (value === undefined) throw new Error('missing value');
				}
				method() {
					return 'ok';
				}
			}

			@mixin(NeedsArgs)
			class Target {}

			const instance = new Target() as any;
			expect(instance.method()).toBe('ok');
			expect(instance).toBeInstanceOf(NeedsArgs);
		});

		it('should not overwrite an existing Symbol.hasInstance on a mixin', () => {
			const originalHasInstance = function (value: unknown): boolean {
				return !!value && typeof value === 'object' && (value as any).__marker === true;
			};

			class HasCustomInstanceCheck {}
			Object.defineProperty(HasCustomInstanceCheck, Symbol.hasInstance, {
				value: originalHasInstance,
				configurable: true,
			});

			@mixin(HasCustomInstanceCheck)
			class Target {}

			// installInstanceCheck() should not overwrite it.
			expect(HasCustomInstanceCheck[Symbol.hasInstance]).toBe(
				originalHasInstance,
			);

			const obj = { __marker: true };
			expect(obj instanceof HasCustomInstanceCheck).toBe(true);

			const inst = new Target();
			expect(inst instanceof HasCustomInstanceCheck).toBe(false);
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
			function createDeferred<T>() {
				let resolve!: (value: T) => void;
				let reject!: (reason?: any) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			}

			const slow = createDeferred<string>();
			const fast = createDeferred<string>();

			class SlowTask {
				@race
				run() {
					return slow.promise;
				}
			}

			class FastTask {
				@race
				run() {
					return fast.promise;
				}
			}

			const Mixed = mix(SlowTask, FastTask);
			const p = new Mixed().run();

			fast.resolve('fast');
			slow.resolve('slow');

			await expect(p).resolves.toBe('fast');
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
```

##### Step 5 Verification Checklist
- [x] `pnpm --filter polymix test -- --runInBand`
- [x] Run 10 consecutive times to verify stability:

  `for i in {1..10}; do pnpm --filter polymix test -- --runInBand || break; done`

- [x] `pnpm --filter polymix test -- --maxWorkers=2`
- [x] `pnpm --filter polymix test -- --maxWorkers=4`

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
