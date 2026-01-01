import type { JsonPathPlugin } from '@jsonpath/core';

import { createCompartment } from './compartment';

export { createCompartment } from './compartment';
export type { CreateCompartmentOptions } from './compartment';

export interface ScriptExpressionsConfig {
	enabled?: boolean;
}

export const plugin: JsonPathPlugin<ScriptExpressionsConfig> = {
	meta: {
		id: '@jsonpath/plugin-script-expressions',
		capabilities: ['filter:script:ses'],
	},
	setup: ({ config, engine }) => {
		if (!config?.enabled) return;

		engine.evaluators.registerFilterScriptEvaluator(
			(script, currentNode, ctx) => {
				// Transform @ to __curr since @ is not a valid JS identifier
				const transformedScript = script.replace(/@/g, '__curr');
				const compartment = createCompartment({
					endowments: {
						__curr: currentNode.value,
						$: ctx.root.value,
					},
				});
				try {
					return Boolean(compartment.evaluate(transformedScript));
				} catch {
					return false;
				}
			},
		);
	},
};
