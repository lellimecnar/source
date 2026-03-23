import type { ParsedCsv } from '../types';

export function parseCSV(text: string): Pick<ParsedCsv, 'headers' | 'rows'> {
	const lines = text.trim().split(/\r?\n/);
	if (lines.length < 2) {
		return { headers: [], rows: [] };
	}

	function parseRow(line: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = '';
			} else {
				current += char ?? '';
			}
		}

		result.push(current.trim());
		return result;
	}

	const headers = parseRow(lines[0] ?? '');
	const rows = lines
		.slice(1)
		.filter((line) => line.trim())
		.map(parseRow);

	return { headers, rows };
}

export function generateCSV(
	headers: string[],
	rows: (string | number)[][],
): string {
	function escapeField(field: string | number): string {
		const str = String(field);
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	}

	const headerLine = headers.map(escapeField).join(',');
	const dataLines = rows.map((row) => row.map(escapeField).join(','));

	return [headerLine, ...dataLines].join('\n');
}
