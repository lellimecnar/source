import { UISpecError } from '../errors';
import {
	isPlainObject,
	type UISpecSchema,
	type UISpecVersion,
} from '../schema';
import { validateSchema } from './validate';

function assertUISpecVersion(value: unknown): asserts value is UISpecVersion {
	if (value !== '1.0') {
		throw new UISpecError(
			'INVALID_SCHEMA_VERSION',
			'Invalid or unsupported $uispec version; expected "1.0".',
			'$.$uispec',
		);
	}
}

export function parseUISpecSchema(input: unknown): UISpecSchema {
	if (!isPlainObject(input)) {
		throw new UISpecError(
			'INVALID_SCHEMA',
			'UI-Spec schema must be a JSON object.',
			'$',
		);
	}

	assertUISpecVersion((input as any).$uispec);

	const schema = input as unknown as UISpecSchema;
	validateSchema(schema);
	return schema;
}
