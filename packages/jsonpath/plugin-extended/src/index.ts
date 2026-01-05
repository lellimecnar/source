import { type JSONPathPlugin, type PluginContext } from '@jsonpath/core';

/**
 * Plugin that enables extended selectors (parent '^' and property name '~').
 *
 * Note: These are currently implemented in the core evaluator but this plugin
 * serves as a marker and configuration point for them.
 */
export class ExtendedSelectorsPlugin implements JSONPathPlugin {
	public readonly name = 'extended-selectors';
	public readonly version = '0.1.0';

	onRegister(ctx: PluginContext): void {
		ctx.register('extended-selectors:enabled', true);
	}
}

export function extendedSelectors(): JSONPathPlugin {
	return new ExtendedSelectorsPlugin();
}
