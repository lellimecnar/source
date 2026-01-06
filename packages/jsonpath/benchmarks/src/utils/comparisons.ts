export interface BenchRow {
	name: string;
	hz?: number;
	mean?: number;
	rme?: number;
}

export function toMarkdownTable(rows: BenchRow[]): string {
	const header = ['Benchmark', 'Hz', 'Mean (ms)', 'RME (%)'];
	const lines = [
		`| ${header.join(' | ')} |`,
		`| ${header.map(() => '---').join(' | ')} |`,
	];
	for (const r of rows) {
		lines.push(
			`| ${r.name} | ${r.hz ?? ''} | ${r.mean ?? ''} | ${r.rme ?? ''} |`,
		);
	}
	return lines.join('\n');
}
