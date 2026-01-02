import {
	createEngine as coreCreateEngine,
	type JsonPathEngine,
	type JsonPathPlugin,
	type CreateEngineOptions as CoreCreateEngineOptions,
} from '@jsonpath/core';
import { rfc9535Plugins, createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

// Re-export commonly needed types/errors
export { JsonPathError, JsonPathErrorCodes } from '@jsonpath/core';
export type {
	JsonPathEngine,
	CompileResult,
	EvaluateOptions,
	JsonPathPlugin,
} from '@jsonpath/core';
export { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

// Lazy singleton default engine
let defaultEngine: JsonPathEngine | null = null;

function getDefaultEngine(): JsonPathEngine {
	if (!defaultEngine) {
		defaultEngine = createRfc9535Engine();
	}
	return defaultEngine;
}

// Default engine export (lazy proxy)
export const engine: JsonPathEngine = new Proxy({} as JsonPathEngine, {
	get(_, prop) {
		return (getDefaultEngine() as any)[prop];
	},
});

export default engine;

// Factory for custom engines (RFC defaults + extra plugins)
export interface CreateEngineOptions {
	plugins?: readonly JsonPathPlugin<any>[];
	components?: CoreCreateEngineOptions['components'];
	options?: CoreCreateEngineOptions['options'];
}

export function createEngine(opts?: CreateEngineOptions): JsonPathEngine {
	const plugins = [...rfc9535Plugins, ...(opts?.plugins ?? [])];
	return coreCreateEngine({
		plugins,
		components: opts?.components,
		options: opts?.options,
	});
}
