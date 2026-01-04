/**
 * @jsonpath/evaluator
 *
 * Result class for JSONPath queries.
 *
 * @packageDocumentation
 */

export interface QueryResultNode {
	value: any;
	path: string[];
}

export class QueryResult {
	constructor(private readonly results: QueryResultNode[]) {}

	public get values(): any[] {
		return this.results.map((r) => r.value);
	}

	public get paths(): string[][] {
		return this.results.map((r) => r.path);
	}

	public get nodes(): QueryResultNode[] {
		return this.results;
	}

	public get first(): any | undefined {
		return this.results[0]?.value;
	}

	public get length(): number {
		return this.results.length;
	}

	public toStrings(): string[] {
		return this.results.map((r) => {
			return (
				'$' +
				r.path
					.map((p) => {
						if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p)) {
							return '.' + p;
						}
						return `["${p.replace(/"/g, '\\"')}"]`;
					})
					.join('')
			);
		});
	}
}
