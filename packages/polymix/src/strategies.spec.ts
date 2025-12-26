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
});
