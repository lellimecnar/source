import { describe, expect, it } from 'vitest';

import { UISpecError } from './errors';

describe('UISpecError', () => {
	it('serializes deterministically', () => {
		const err = new UISpecError('UI_SPEC_INVALID_SCHEMA', 'bad schema', {
			path: '$.root',
		});

		expect(JSON.parse(JSON.stringify(err))).toEqual({
			name: 'UISpecError',
			code: 'UI_SPEC_INVALID_SCHEMA',
			message: 'bad schema',
			details: { path: '$.root' },
		});
	});
});
