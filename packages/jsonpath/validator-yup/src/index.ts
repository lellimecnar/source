import type { AnySchema, ValidationError } from 'yup';

import type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';

export function createYupAdapter(schema: AnySchema): ValidatorAdapter {
	return {
		id: '@jsonpath/validator-yup',
		validate: (value: unknown): Issue[] => {
			try {
				schema.validateSync(value, { abortEarly: false });
				return [];
			} catch (err) {
				const e = err as ValidationError;
				const inner = e.inner?.length ? e.inner : [e];
				return inner.map((i) => ({
					message: i.message,
					code: i.type ?? 'yup',
					path: i.path ? '/' + String(i.path).split('.').join('/') : '',
					meta: i,
				}));
			}
		},
	};
}
