export type JsonPathFunction = (...args: unknown[]) => unknown;

export class FunctionRegistry {
	private readonly fns: Map<string, JsonPathFunction> = new Map();

	public register(name: string, fn: JsonPathFunction): void {
		this.fns.set(name, fn);
	}

	public get(name: string): JsonPathFunction | undefined {
		return this.fns.get(name);
	}
}
