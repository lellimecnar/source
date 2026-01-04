import type { EvaluatorOptions } from '@jsonpath/core';
import * as facade from '@jsonpath/jsonpath';

export const jsonpath = {
	query(path: string, data: any, options?: EvaluatorOptions) {
		return facade.query(data, path, options);
	},
	value(path: string, data: any, options?: EvaluatorOptions) {
		return facade.value(data, path, options);
	},
};
