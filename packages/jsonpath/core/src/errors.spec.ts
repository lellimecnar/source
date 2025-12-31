import { describe, expect, it } from 'vitest';

import { JsonPathError } from './errors/JsonPathError';
import { JsonPathErrorCodes } from './errors/codes';

describe('JsonPathError', () => {
	it('creates a structured error with code and optional cause', () => {
		const cause = new Error('root cause');
		const err = new JsonPathError(
			{
				code: JsonPathErrorCodes.Syntax,
				message: 'bad syntax',
				expression: '$..',
				location: { offset: 2, line: 1, column: 3 },
				pluginIds: ['@jsonpath/plugin-syntax-root'],
				options: { safe: true },
			},
			cause,
		);

		expect(err.name).toBe('JsonPathError');
		expect(err.code).toBe(JsonPathErrorCodes.Syntax);
		expect(err.expression).toBe('$..');
		expect(err.location?.offset).toBe(2);
		expect(err.pluginIds).toEqual(['@jsonpath/plugin-syntax-root']);
		expect(err.options).toEqual({ safe: true });
		expect(err.cause).toBe(cause);
	});
});
