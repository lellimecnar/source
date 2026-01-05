import { jsonpath } from '@jsonpath/compat-json-p3';

export function runCompatExample(): string[] {
	const data = { users: [{ name: 'A' }, { name: 'B' }] };
	const result = jsonpath.query('$.users[*].name', data);
	return result.values();
}
