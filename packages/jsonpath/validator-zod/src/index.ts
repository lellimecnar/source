import type { ZodTypeAny } from 'zod';

import type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';

export function createZodAdapter(schema: ZodTypeAny): ValidatorAdapter {
	return {
		id: '@jsonpath/validator-zod',
		validate: (value: unknown): Issue[] => {
			const result = schema.safeParse(value);
			if (result.success) return [];
			return result.error.issues.map((i) => ({
				message: i.message,
				code: i.code,
				path: i.path.length ? '/' + i.path.join('/') : '',
				meta: i,
			}));
		},
	};
}
