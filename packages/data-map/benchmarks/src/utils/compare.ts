export interface BaselineEntry {
	opsPerSec: number;
}

export type Baseline = Record<string, BaselineEntry>;

export interface ComparisonResult {
	key: string;
	baselineOpsPerSec: number;
	currentOpsPerSec: number;
	deltaPct: number;
	isRegression: boolean;
}

export function compareAgainstBaseline(params: {
	baseline: Baseline;
	currentOpsPerSec: Record<string, number>;
	regressionThresholdPct?: number;
}): ComparisonResult[] {
	const threshold = params.regressionThresholdPct ?? 10;
	const out: ComparisonResult[] = [];

	for (const [key, current] of Object.entries(params.currentOpsPerSec)) {
		const baseline = params.baseline[key]?.opsPerSec ?? 0;

		// Treat baseline=0 as "unset": do not flag regressions.
		if (baseline <= 0 || current <= 0) {
			out.push({
				key,
				baselineOpsPerSec: baseline,
				currentOpsPerSec: current,
				deltaPct: baseline > 0 ? ((current - baseline) / baseline) * 100 : 0,
				isRegression: false,
			});
			continue;
		}

		const deltaPct = ((current - baseline) / baseline) * 100;
		out.push({
			key,
			baselineOpsPerSec: baseline,
			currentOpsPerSec: current,
			deltaPct,
			isRegression: deltaPct < -threshold,
		});
	}

	out.sort((a, b) => a.key.localeCompare(b.key));
	return out;
}
