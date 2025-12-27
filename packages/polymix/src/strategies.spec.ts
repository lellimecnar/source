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

			const p = applyStrategy('parallel', [fn1, fn2], null) as Promise<
				number[]
			>;

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

			const p = applyStrategy(
				'race',
				[slowFn, fastFn],
				null,
			) as Promise<string>;
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
			const cases: { label: string; value: any }[] = [
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

			const promise = applyStrategy(
				'race',
				[fn1, fn2],
				null,
			) as Promise<string>;
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

			expect(() => applyStrategy('pipe', [fn1, fn2, fn3], null, 10)).toThrow(
				'stop',
			);
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
