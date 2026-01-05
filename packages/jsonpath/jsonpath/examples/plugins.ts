import { query } from '../src/index.js';

export function runPluginExample(): string[] {
	const calls: string[] = [];
	const loggerPlugin = {
		name: 'logger',
		beforeEvaluate: () => calls.push('before'),
		afterEvaluate: () => calls.push('after'),
	};

	const data = { a: 1 };
	query(data, '$.a', { plugins: [loggerPlugin] });
	return calls;
}
