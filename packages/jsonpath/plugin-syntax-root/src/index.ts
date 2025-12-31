import type { JsonPathPlugin } from '@jsonpath/core';
import {
	registerRfc9535ScanRules,
	registerRfc9535LiteralScanRules,
} from '@jsonpath/lexer';

import { parseRfc9535Path } from './parser';

type Profile = 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full';

export function createSyntaxRootPlugin(): JsonPathPlugin<{
	profile?: Profile;
}> {
	// IMPORTANT: keep this as per-engine state (avoid module-level mutation).
	let profile: Profile = 'rfc9535-draft';

	return {
		meta: {
			id: '@jsonpath/plugin-syntax-root',
			capabilities: ['syntax:rfc9535:root'],
		},
		configure: (cfg) => {
			profile = cfg?.profile ?? 'rfc9535-draft';
		},
		hooks: {
			registerTokens: (scanner) => {
				registerRfc9535ScanRules(scanner);
				registerRfc9535LiteralScanRules(scanner);
			},
			registerParsers: (parser) => {
				parser.registerSegmentParser((ctx) => parseRfc9535Path(ctx, profile));
			},
		},
	};
}

// Back-compat singleton (prefer createSyntaxRootPlugin() in presets/tests).
export const plugin = createSyntaxRootPlugin();
