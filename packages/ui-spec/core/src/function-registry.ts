import { UISpecError } from './errors';
import type { Jsonp3FunctionRegister } from './jsonp3';

export type UISpecCallable = (ctx: unknown, ...args: unknown[]) => unknown;

export class FunctionRegistry {
	private readonly register: Jsonp3FunctionRegister;

	public constructor(register: Jsonp3FunctionRegister) {
		this.register = register;
	}

	public registerFunction(id: string, fn: UISpecCallable): void {
		this.register.set(id, fn);
	}

	public get(id: string): UISpecCallable | undefined {
		const value = this.register.get(id);
		return typeof value === 'function' ? (value as UISpecCallable) : undefined;
	}

	public call(id: string, ctx: unknown, ...args: unknown[]): unknown {
		const fn = this.get(id);
		if (!fn) {
			throw new UISpecError(
				'UI_SPEC_FUNCTION_NOT_FOUND',
				`UI-Spec function not found: ${id}`,
				{ id },
			);
		}
		return fn(ctx, ...args);
	}
}
