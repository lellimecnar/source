import type { ValidationPlugin, ValidationResult } from './types';
import { UISpecError } from '../errors';

export function createValidationRegistry(plugins: ValidationPlugin[]) {
	const byName = new Map<string, ValidationPlugin>();
	for (const plugin of plugins) byName.set(plugin.name, plugin);

	return {
		validate(
			value: unknown,
			schemaRef: string,
			pluginName?: string,
		): ValidationResult {
			if (pluginName) {
				const plugin = byName.get(pluginName);
				if (!plugin)
					throw new UISpecError(
						'INVALID_SCHEMA',
						`Unknown validation plugin: ${pluginName}`,
						'$.plugins',
					);
				return plugin.validate(value, schemaRef);
			}

			// Default: try all plugins until one returns ok, else return the first failure.
			let firstFailure: ValidationResult | undefined;
			for (const plugin of byName.values()) {
				const result = plugin.validate(value, schemaRef);
				if (result.ok) return result;
				firstFailure ??= result;
			}
			return (
				firstFailure ?? {
					ok: false,
					errors: [{ message: 'No validation plugins registered.' }],
				}
			);
		},
	};
}

export * from './types';
