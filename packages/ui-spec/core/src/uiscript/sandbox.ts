import type { UIScriptOptions } from './spec';
import { UISpecError } from '../errors';

export type CompiledFunction = (...args: unknown[]) => unknown;

export function compileRestrictedFunction(
	source: string,
	options: UIScriptOptions,
): CompiledFunction {
	if (!options.enabled) {
		throw new UISpecError('INVALID_BINDING', 'UIScript is disabled.', '$fn');
	}

	// NOTE: This is a restricted Function-based compiler. It is NOT a complete security sandbox.
	// It enforces an allowlisted global object and a soft timeout wrapper.
	const globals = options.allowlist?.globals ?? {};

	let fn: unknown;
	try {
		// eslint-disable-next-line no-new-func
		fn = Function(
			'globals',
			`"use strict"; const { ${Object.keys(globals).join(', ')} } = globals; return (${source});`,
		)(globals);
	} catch (err) {
		throw new UISpecError(
			'INVALID_BINDING',
			`Failed to compile UIScript: ${(err as Error).message}`,
			'$fn',
		);
	}

	if (typeof fn !== 'function') {
		throw new UISpecError(
			'INVALID_BINDING',
			'UIScript $fn must evaluate to a function.',
			'$fn',
		);
	}

	return fn as CompiledFunction;
}

export async function runWithSoftTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	if (timeoutMs <= 0) return promise;
	let timeout: any;
	const timer = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => {
			reject(
				new UISpecError(
					'SECURITY_LIMIT_EXCEEDED',
					'UIScript timeout exceeded.',
					'$fn',
				),
			);
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timer]);
	} finally {
		clearTimeout(timeout);
	}
}
