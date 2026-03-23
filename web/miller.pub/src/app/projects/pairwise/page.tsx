'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';

import { FilterStep } from './components/FilterStep';
import { ResultsStep } from './components/ResultsStep';
import { StepIndicator } from './components/StepIndicator';
import { UploadStep } from './components/UploadStep';
import { VotingStep } from './components/VotingStep';
import type { ParsedCsv, ScoreList } from './types';

export default function PairwiseVoteApp(): JSX.Element {
	const [step, setStep] = useState(0);
	const [data, setData] = useState<ParsedCsv | null>(null);
	const [includedIndices, setIncludedIndices] = useState<number[] | null>(null);
	const [boostedIndices, setBoostedIndices] = useState<number[] | null>(null);
	const [finalScores, setFinalScores] = useState<ScoreList | null>(null);

	const steps = ['Upload', 'Filter', 'Vote', 'Results'];

	const handleDataLoaded = useCallback((loadedData: ParsedCsv) => {
		setData(loadedData);
		setStep(1);
	}, []);

	const handleFilterComplete = useCallback(
		(indices: number[], boosted: number[]) => {
			setIncludedIndices(indices);
			setBoostedIndices(boosted);
			setStep(2);
		},
		[],
	);

	const handleVotingComplete = useCallback((scores: ScoreList) => {
		setFinalScores(scores);
		setStep(3);
	}, []);

	const handleVotingRestart = useCallback(() => {
		setStep(1);
	}, []);

	const handleRestart = useCallback(() => {
		setStep(0);
		setData(null);
		setIncludedIndices(null);
		setBoostedIndices(null);
		setFinalScores(null);
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-br from-sky-50 via-sky-50 to-sky-100 dark:from-sky-950 dark:via-sky-950 dark:to-sky-900">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute right-0 top-0 size-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-700/20" />
				<div className="absolute bottom-0 left-0 size-[500px] -translate-x-1/3 translate-y-1/2 rounded-full bg-sky-200/25 blur-3xl dark:bg-sky-800/20" />
				<div className="absolute left-1/2 top-1/2 size-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/15 blur-3xl dark:bg-indigo-700/15" />
			</div>

			<div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
				<motion.header
					className="mb-8 text-center sm:mb-12"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<h1 className="text-foreground mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
						Pairwise
					</h1>
					<p className="text-muted-foreground text-base sm:text-lg">
						Rank items by comparing pairs
					</p>
				</motion.header>

				<StepIndicator currentStep={step} steps={steps} />

				<AnimatePresence mode="wait">
					{step === 0 ? (
						<UploadStep key="upload" onDataLoaded={handleDataLoaded} />
					) : null}
					{step === 1 && data ? (
						<FilterStep
							key="filter"
							data={data}
							onComplete={handleFilterComplete}
							onSkip={handleFilterComplete}
						/>
					) : null}
					{step === 2 && data && includedIndices && boostedIndices !== null ? (
						<VotingStep
							key="voting"
							data={data}
							includedIndices={includedIndices}
							boostedIndices={boostedIndices}
							onComplete={handleVotingComplete}
							onRestart={handleVotingRestart}
						/>
					) : null}
					{step === 3 && data && includedIndices && finalScores ? (
						<ResultsStep
							key="results"
							data={data}
							includedIndices={includedIndices}
							scores={finalScores}
							onRestart={handleRestart}
						/>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}
