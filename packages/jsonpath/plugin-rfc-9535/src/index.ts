import {
	createPlugin,
	createEngine,
	type CreateEngineOptions,
} from '@jsonpath/core';

// Import for internal use
import { createFilterBooleanPlugin } from './plugins/filter/boolean';
import { createFilterComparisonPlugin } from './plugins/filter/comparison';
import { createFilterExistencePlugin } from './plugins/filter/existence';
import { createFilterFunctionsPlugin } from './plugins/filter/functions';
import { createFilterLiteralsPlugin } from './plugins/filter/literals';
import { createFilterRegexPlugin } from './plugins/filter/regex';
import { createFunctionsCorePlugin } from './plugins/functions/core';
import { createResultNodePlugin } from './plugins/result/node';
import { createResultPathPlugin } from './plugins/result/path';
import { createResultPointerPlugin } from './plugins/result/pointer';
import { createResultValuePlugin } from './plugins/result/value';
import { createSyntaxChildIndexPlugin } from './plugins/syntax/child-index';
import { createSyntaxChildMemberPlugin } from './plugins/syntax/child-member';
import { createSyntaxCurrentPlugin } from './plugins/syntax/current';
import { createSyntaxDescendantPlugin } from './plugins/syntax/descendant';
import { createSyntaxFilterPlugin } from './plugins/syntax/filter';
import { createSyntaxRootPlugin } from './plugins/syntax/root';
import { createSyntaxUnionPlugin } from './plugins/syntax/union';
import { createSyntaxWildcardPlugin } from './plugins/syntax/wildcard';

// Syntax plugins
export { createSyntaxRootPlugin } from './plugins/syntax/root';
export { createSyntaxCurrentPlugin } from './plugins/syntax/current';
export { createSyntaxChildMemberPlugin } from './plugins/syntax/child-member';
export { createSyntaxChildIndexPlugin } from './plugins/syntax/child-index';
export { createSyntaxWildcardPlugin } from './plugins/syntax/wildcard';
export { createSyntaxUnionPlugin } from './plugins/syntax/union';
export { createSyntaxDescendantPlugin } from './plugins/syntax/descendant';
export { createSyntaxFilterPlugin } from './plugins/syntax/filter';

// Filter plugins
export { createFilterLiteralsPlugin } from './plugins/filter/literals';
export { createFilterBooleanPlugin } from './plugins/filter/boolean';
export { createFilterComparisonPlugin } from './plugins/filter/comparison';
export { createFilterExistencePlugin } from './plugins/filter/existence';
export { createFilterFunctionsPlugin } from './plugins/filter/functions';
export { createFilterRegexPlugin } from './plugins/filter/regex';

// Function plugins
export { createFunctionsCorePlugin } from './plugins/functions/core';

// Result plugins
export { createResultValuePlugin } from './plugins/result/value';
export { createResultNodePlugin } from './plugins/result/node';
export { createResultPathPlugin } from './plugins/result/path';
export { createResultPointerPlugin } from './plugins/result/pointer';

// IRegexp utility
export { compile as iregexp } from './iregexp';

/**
 * All RFC 9535 plugins in dependency order.
 * This array can be used directly with createEngine().
 */
export const rfc9535Plugins = [
	// Syntax plugins (order matters for parsing)
	createSyntaxRootPlugin(),
	createSyntaxCurrentPlugin(),
	createSyntaxChildMemberPlugin(),
	createSyntaxChildIndexPlugin(),
	createSyntaxWildcardPlugin(),
	createSyntaxUnionPlugin(),
	createSyntaxDescendantPlugin(),
	createSyntaxFilterPlugin(),
	// Filter plugins
	createFilterLiteralsPlugin(),
	createFilterBooleanPlugin(),
	createFilterComparisonPlugin(),
	createFilterExistencePlugin(),
	createFilterFunctionsPlugin(),
	createFilterRegexPlugin(),
	// Function plugins
	createFunctionsCorePlugin(),
	// Result plugins
	createResultValuePlugin(),
	createResultNodePlugin(),
	createResultPathPlugin(),
	createResultPointerPlugin(),
] as const;

export type Rfc9535EngineOptions = Omit<CreateEngineOptions, 'plugins'> & {
	/**
	 * Additional plugins to include after RFC 9535 plugins.
	 * Use this to add extensions.
	 */
	additionalPlugins?: CreateEngineOptions['plugins'];
};

/**
 * Create an engine pre-configured with all RFC 9535 plugins.
 */
export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	const { additionalPlugins = [], ...rest } = options ?? {};

	return createEngine({
		...rest,
		plugins: [...rfc9535Plugins, ...additionalPlugins],
	});
}

/**
 * Preset plugin that declares dependency on all RFC 9535 plugins.
 * Useful for plugin systems that need to declare RFC 9535 as a dependency.
 */
export const plugin = createPlugin({
	meta: {
		id: '@jsonpath/plugin-rfc-9535',
		phases: [],
		capabilities: ['preset:rfc9535'],
		dependsOn: rfc9535Plugins.map((p) => p.meta.id),
	},
	setup: () => undefined,
});
