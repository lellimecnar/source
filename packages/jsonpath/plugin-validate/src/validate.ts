import type { Issue, ValidatorAdapter } from './types';

export function validateAll(
	values: readonly unknown[],
	adapter: ValidatorAdapter,
): Issue[] {
	const issues: Issue[] = [];
	for (const v of values) issues.push(...adapter.validate(v));
	return issues;
}
