/**
 * Applies a composition strategy to a set of functions.
 *
 * @param strategy - The name of the strategy to apply.
 * @param fns - The array of functions to compose.
 * @param context - The `this` context for the functions.
 * @param args - The initial arguments.
 * @returns The result of the composition.
 */
export type CompositionStrategy =
	| 'override'
	| 'pipe'
	| 'compose'
	| 'parallel'
	| 'race'
	| 'merge'
	| 'first'
	| 'all'
	| 'any';

export const strategies = {
	override: 'override' as const,
	pipe: 'pipe' as const,
	compose: 'compose' as const,
	parallel: 'parallel' as const,
	race: 'race' as const,
	merge: 'merge' as const,
	first: 'first' as const,
	all: 'all' as const,
	any: 'any' as const,

	for(methodName: string): symbol {
		return Symbol.for(`polymix:strategy:${methodName}`);
	},
} as const;

function isPromiseLike(value: unknown): value is Promise<unknown> {
	return (
		Boolean(value) &&
		(typeof value === 'object' || typeof value === 'function') &&
		'then' in (value as any) &&
		typeof (value as any).then === 'function'
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		Boolean(value) &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.prototype.toString.call(value) === '[object Object]'
	);
}

function deepMerge(a: unknown, b: unknown): unknown {
	if (Array.isArray(a) && Array.isArray(b)) {
		return [...a, ...b];
	}

	if (isPlainObject(a) && isPlainObject(b)) {
		const out: Record<string, unknown> = { ...a };
		for (const key of Object.keys(b)) {
			out[key] = key in out ? deepMerge(out[key], b[key]) : b[key];
		}
		return out;
	}

	return b;
}

export function applyStrategy(
	strategy: string | symbol,
	fns: Function[],
	context: any,
	...args: any[]
): any {
	const strategyName: CompositionStrategy =
		strategy === 'pipe' ||
		strategy === 'compose' ||
		strategy === 'parallel' ||
		strategy === 'race' ||
		strategy === 'merge' ||
		strategy === 'first' ||
		strategy === 'all' ||
		strategy === 'any' ||
		strategy === 'override'
			? (strategy as CompositionStrategy)
			: 'override';

	switch (strategyName) {
		case 'pipe':
			// Pipe passes the result of each function to the next
			return fns.reduce((acc, fn) => {
				// If acc is a promise, wait for it first
				if (isPromiseLike(acc)) {
					return acc.then((result) => fn.apply(context, [result]));
				}
				// Otherwise, execute synchronously
				return fn.apply(context, [acc]);
			}, args[0]);

		case 'compose':
			return fns.reduceRight((acc, fn) => {
				if (isPromiseLike(acc)) {
					return acc.then((result) => fn.apply(context, [result]));
				}
				return fn.apply(context, [acc]);
			}, args[0]);

		case 'parallel':
			return Promise.all(fns.map((fn) => fn.apply(context, args)));

		case 'race':
			return Promise.race(
				fns.map((fn) => Promise.resolve(fn.apply(context, args))),
			);

		case 'merge':
			return fns.reduce<unknown>((acc, fn) => {
				const result = fn.apply(context, args);
				return deepMerge(acc, result);
			}, undefined);

		case 'first':
			for (const fn of fns) {
				const result = fn.apply(context, args);
				if (result !== undefined) {
					return result;
				}
			}
			return undefined;

		case 'all':
			return (async () => {
				for (const fn of fns) {
					const result = fn.apply(context, args);
					const value = isPromiseLike(result) ? await result : result;
					if (!value) return false;
				}
				return true;
			})();

		case 'any':
			return (async () => {
				for (const fn of fns) {
					const result = fn.apply(context, args);
					const value = isPromiseLike(result) ? await result : result;
					if (value) return true;
				}
				return false;
			})();

		case 'override':
		default: {
			// Execute all functions but only return the result of the last one.
			let lastResult: any;
			for (const fn of fns) {
				lastResult = fn.apply(context, args);
			}
			return lastResult;
		}
	}
}
