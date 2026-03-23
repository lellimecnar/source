export function shuffleArray<T>(array: readonly T[]): T[] {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]] as [T, T];
	}
	return arr;
}

// Calculate scores from win/loss data - returns decimal scores out of 10
export function calculateScores(
	itemCount: number,
	wins: readonly number[],
	losses: readonly number[],
	boostedItems: readonly number[],
): number[] {
	const scores = new Array<number>(itemCount).fill(0);

	// Base score from boost (adds 0.5 to base)
	boostedItems.forEach((idx) => {
		if (idx >= 0 && idx < itemCount) {
			scores[idx]! += 0.5;
		}
	});

	// Calculate win ratio for each item
	for (let i = 0; i < itemCount; i++) {
		const totalMatches = wins[i]! + losses[i]!;
		if (totalMatches > 0) {
			const winRatio = wins[i]! / totalMatches;
			// Scale to 0-9.5 range, add to existing score
			scores[i]! += winRatio * 9.5;
		}
	}

	// Round to 2 decimal places and return - no artificial tie-breaking
	return scores.map((s) => Math.round(s * 100) / 100);
}

export function hasNoTies(scores: readonly number[]): boolean {
	const rounded = scores.map((s) => Math.round(s * 100));
	const unique = new Set(rounded);
	return unique.size === scores.length;
}

/**
 * Statistical analysis of ranking confidence.
 * Uses Wilson score interval to calculate confidence bounds for win rates.
 */
export interface RankingConfidence {
	/** Whether the ranking has a statistically confident winner */
	hasConfidentWinner: boolean;
	/** Confidence level (0-1) that current ranking is correct */
	confidenceLevel: number;
	/** Minimum comparisons needed per item for reliable ranking */
	minComparisonsNeeded: number;
	/** Average comparisons per item so far */
	avgComparisonsPerItem: number;
	/** The score gap between #1 and #2 (normalized 0-1) */
	topGap: number;
}

/**
 * Calculate Wilson score lower bound for binomial proportion.
 * This gives us a conservative estimate of the true win rate.
 * @param wins - Number of wins
 * @param total - Total matches
 * @param z - Z-score for confidence (1.96 for 95%, 1.645 for 90%)
 */
function wilsonScoreLower(wins: number, total: number, z = 1.96): number {
	if (total === 0) return 0;
	const p = wins / total;
	const denominator = 1 + (z * z) / total;
	const centre = p + (z * z) / (2 * total);
	const adjustment =
		z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
	return Math.max(0, (centre - adjustment) / denominator);
}

/**
 * Calculate Wilson score upper bound for binomial proportion.
 */
function wilsonScoreUpper(wins: number, total: number, z = 1.96): number {
	if (total === 0) return 1;
	const p = wins / total;
	const denominator = 1 + (z * z) / total;
	const centre = p + (z * z) / (2 * total);
	const adjustment =
		z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
	return Math.min(1, (centre + adjustment) / denominator);
}

/**
 * Analyze the statistical confidence of the current ranking.
 * Returns confidence that the current leader won't be replaced by more voting.
 */
export function analyzeRankingConfidence(
	itemCount: number,
	wins: readonly number[],
	losses: readonly number[],
): RankingConfidence {
	if (itemCount < 2) {
		return {
			hasConfidentWinner: true,
			confidenceLevel: 1,
			minComparisonsNeeded: 0,
			avgComparisonsPerItem: 0,
			topGap: 1,
		};
	}

	// Calculate matches per item and total comparisons
	const matchesPerItem = wins.map((w, i) => w + losses[i]!);
	const totalComparisons = matchesPerItem.reduce((a, b) => a + b, 0) / 2;
	const avgComparisonsPerItem = totalComparisons / itemCount;

	// Total possible pairs: n * (n-1) / 2
	const totalPossiblePairs = (itemCount * (itemCount - 1)) / 2;
	const completionRatio = Math.min(1, totalComparisons / totalPossiblePairs);

	// Minimum comparisons for basic ranking (each item compared at least once)
	const minComparisonsNeeded = Math.max(2, Math.ceil(Math.log2(itemCount)));

	// Calculate win rates for each item
	const itemStats = wins.map((w, i) => {
		const total = w + losses[i]!;
		return {
			idx: i,
			wins: w,
			losses: losses[i]!,
			total,
			winRate: total > 0 ? w / total : 0.5,
			lowerBound: wilsonScoreLower(w, total),
			upperBound: wilsonScoreUpper(w, total),
		};
	});

	// Sort by win rate (current ranking)
	const sorted = [...itemStats].sort((a, b) => b.winRate - a.winRate);
	const leader = sorted[0]!;
	const runnerUp = sorted[1];

	// If leader has no comparisons, confidence is 0
	if (leader.total === 0) {
		return {
			hasConfidentWinner: false,
			confidenceLevel: 0,
			minComparisonsNeeded,
			avgComparisonsPerItem,
			topGap: 0,
		};
	}

	// Calculate confidence based on multiple factors:

	// 1. Completion factor (0-1): How much of all possible pairs have been compared
	// More comparisons = more stable rankings
	const completionFactor = completionRatio;

	// 2. Leader strength factor (0-1): How dominant is the leader's win rate
	// A leader with 100% wins is more confident than one with 60%
	const leaderStrength = leader.winRate;

	// 3. Gap factor (0-1): How far ahead is the leader from #2
	// Larger gaps mean less likely to be overtaken
	const gapFromRunnerUp = runnerUp ? leader.winRate - runnerUp.winRate : 1;
	const gapFactor = Math.min(1, gapFromRunnerUp * 2); // Scale: 50% gap = 100% factor

	// 4. Sample size factor (0-1): Does the leader have enough comparisons?
	// More comparisons on the leader = more reliable win rate
	const leaderSampleFactor = Math.min(1, leader.total / (itemCount - 1));

	// 5. Statistical separation: Is leader's lower bound > runner-up's upper bound?
	const hasStatisticalSeparation = runnerUp
		? leader.lowerBound > runnerUp.upperBound
		: true;
	const separationBonus = hasStatisticalSeparation ? 0.15 : 0;

	// Combine factors with weights:
	// - Completion: 25% (more data = more stable)
	// - Leader strength: 25% (winning more = more confident)
	// - Gap: 25% (bigger lead = harder to overtake)
	// - Sample size: 25% (leader tested enough)
	// - Separation bonus: up to 15% extra for statistical significance
	const confidenceLevel = Math.min(
		1,
		completionFactor * 0.25 +
			leaderStrength * 0.25 +
			gapFactor * 0.25 +
			leaderSampleFactor * 0.25 +
			separationBonus,
	);

	// A confident winner requires:
	// 1. At least 50% overall confidence
	// 2. Leader has faced at least half the other items
	// 3. Either statistical separation OR a clear win rate gap (>20%)
	const hasConfidentWinner =
		confidenceLevel >= 0.5 &&
		leader.total >= Math.ceil((itemCount - 1) / 2) &&
		(hasStatisticalSeparation || gapFromRunnerUp > 0.2);

	return {
		hasConfidentWinner,
		confidenceLevel,
		minComparisonsNeeded,
		avgComparisonsPerItem,
		topGap: Math.max(0, gapFromRunnerUp),
	};
}
