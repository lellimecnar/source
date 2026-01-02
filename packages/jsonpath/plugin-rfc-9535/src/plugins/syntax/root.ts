import type { Profile } from '@jsonpath/core';
import {
	createPlugin,
	PluginPhases,
	registerRfc9535LiteralScanRules,
	registerRfc9535ScanRules,
} from '@jsonpath/core';

import { parseRfc9535Path } from './parser';

export const createSyntaxRootPlugin = createPlugin<{
	profile?: Profile;
	strict?: boolean;
}>((config) => {
	// IMPORTANT: keep this as per-engine state (avoid module-level mutation).
	let profile: Profile = 'rfc9535-draft';
	let strict = false;

	return {
		meta: {
			id: '@jsonpath/plugin-syntax-root',
			phases: [PluginPhases.syntax],
			capabilities: ['syntax:rfc9535:root'],
		},
		setup: ({ engine }) => {
			profile = config?.profile ?? 'rfc9535-draft';
			strict = config?.strict ?? false;
			registerRfc9535ScanRules(engine.scanner);
			registerRfc9535LiteralScanRules(engine.scanner);
			engine.parser.registerSegmentParser((ctx) =>
				parseRfc9535Path(ctx, profile, strict),
			);
		},
	};
});
