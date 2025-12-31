import type { JsonPathDiagnostic } from './types';

export class DiagnosticsCollector {
	private readonly items: JsonPathDiagnostic[] = [];
	public add(diag: JsonPathDiagnostic): void {
		this.items.push(diag);
	}
	public all(): readonly JsonPathDiagnostic[] {
		return this.items;
	}
}
