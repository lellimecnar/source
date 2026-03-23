/* eslint-disable no-nested-ternary -- don't care */
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	analyzeRankingConfidence,
	calculateScores,
	hasNoTies,
	shuffleArray,
} from '../lib/scoring';
import type { ParsedCsv, ScoreList } from '../types';

export interface VotingStepProps {
	data: ParsedCsv;
	includedIndices: number[];
	boostedIndices: number[];
	onComplete: (scores: ScoreList) => void;
	onRestart: () => void;
}

interface PreviousMatchup {
	left: number;
	right: number;
	winner: number;
}

type TournamentPhase = 'neutral' | 'boosted' | 'crossover' | 'allPairs';

interface HistoryState {
	wins: number[];
	losses: number[];
	activePool: number[];
	currentPairIndex: number;
	roundWinners: number[];
	roundNumber: number;
	allPairIndex: number;
	previousMatchup: PreviousMatchup | null;
	recentItems: number[];
	tournamentPhase: TournamentPhase;
	topNeutralItems: number[];
	topBoostedItems: number[];
}

type Mode = 'tournament' | 'all';

type SelectedSide = 'left' | 'right' | null;

export function VotingStep({
	data,
	includedIndices,
	boostedIndices,
	onComplete,
	onRestart,
}: VotingStepProps): JSX.Element | null {
	const itemCount = includedIndices.length;

	const [wins, setWins] = useState<number[]>(
		() => new Array(itemCount).fill(0) as number[],
	);
	const [losses, setLosses] = useState<number[]>(
		() => new Array(itemCount).fill(0) as number[],
	);

	// Tournament bracket state
	const [activePool, setActivePool] = useState<number[]>([]);
	const [currentPairIndex, setCurrentPairIndex] = useState(0);
	const [roundWinners, setRoundWinners] = useState<number[]>([]);
	const [roundNumber, setRoundNumber] = useState(1);

	// Tournament phase state
	const [tournamentPhase, setTournamentPhase] =
		useState<TournamentPhase>('neutral');
	const [topNeutralItems, setTopNeutralItems] = useState<number[]>([]);
	const [topBoostedItems, setTopBoostedItems] = useState<number[]>([]);

	const [history, setHistory] = useState<HistoryState[]>([]);
	const [recentItems, setRecentItems] = useState<number[]>([]);

	const [selectedSide, setSelectedSide] = useState<SelectedSide>(null);

	const [previousMatchup, setPreviousMatchup] =
		useState<PreviousMatchup | null>(null);
	const [canFinishEarly, setCanFinishEarly] = useState(false);
	const [tournamentComplete, setTournamentComplete] = useState(false);

	const [mode, setMode] = useState<Mode>('tournament');

	// Separate items into boosted and neutral groups
	const boostedSet = useMemo(() => new Set(boostedIndices), [boostedIndices]);
	const { boostedItems, neutralItems } = useMemo(() => {
		const boosted: number[] = [];
		const neutral: number[] = [];
		for (let i = 0; i < itemCount; i++) {
			if (boostedSet.has(includedIndices[i]!)) {
				boosted.push(i);
			} else {
				neutral.push(i);
			}
		}
		return { boostedItems: boosted, neutralItems: neutral };
	}, [itemCount, boostedSet, includedIndices]);

	// Initialize tournament with neutral items
	useEffect(() => {
		if (activePool.length === 0 && mode === 'tournament') {
			if (neutralItems.length > 1) {
				setActivePool(shuffleArray(neutralItems));
				setTournamentPhase('neutral');
			} else if (boostedItems.length > 1) {
				setActivePool(shuffleArray(boostedItems));
				setTournamentPhase('boosted');
			} else {
				// Not enough items for tournament, go straight to allPairs
				setTournamentPhase('allPairs');
			}
		}
	}, [activePool.length, mode, neutralItems, boostedItems]);

	// Generate all pairs for "All Pairs" mode
	// Prioritize pairs that ensure all items are seen before any repeats
	const [allPairs] = useState<[number, number][]>(() => {
		const pairs: [number, number][] = [];
		for (let i = 0; i < itemCount; i++) {
			for (let j = i + 1; j < itemCount; j++) {
				pairs.push(Math.random() > 0.5 ? [i, j] : [j, i]);
			}
		}

		// Reorder pairs so that each item appears once before any repeats
		// This ensures all items get scored in the first n/2 comparisons
		const seenItems = new Set<number>();
		const priorityPairs: [number, number][] = [];
		const remainingPairs: [number, number][] = [];

		// Shuffle first to randomize which pairs we pick
		const shuffled = shuffleArray(pairs);

		for (const pair of shuffled) {
			const [a, b] = pair;
			// If both items are new, this is a priority pair
			if (!seenItems.has(a) && !seenItems.has(b)) {
				priorityPairs.push(pair);
				seenItems.add(a);
				seenItems.add(b);
			} else {
				remainingPairs.push(pair);
			}
		}

		// If there's an odd number of items, one item won't be paired yet
		// Find a pair that includes it
		if (seenItems.size < itemCount) {
			for (let i = 0; i < remainingPairs.length; i++) {
				const pair = remainingPairs[i]!;
				const [a, b] = pair;
				if (!seenItems.has(a) || !seenItems.has(b)) {
					priorityPairs.push(pair);
					seenItems.add(a);
					seenItems.add(b);
					remainingPairs.splice(i, 1);
					break;
				}
			}
		}

		return [...priorityPairs, ...shuffleArray(remainingPairs)];
	});
	const [allPairIndex, setAllPairIndex] = useState(0);

	// Use a ref to track the "real" pair index for immediate access during rapid clicks
	const allPairIndexRef = useRef(0);

	// Lock to prevent overlapping vote processing - uses timestamp for timeout
	const lastVoteTimeRef = useRef(0);
	const VOTE_COOLDOWN_MS = 50; // Minimum ms between votes

	// Helper function to get the current pair based on a given index
	const getPairAtIndex = useCallback(
		(index: number): [number, number] | null => {
			if (mode === 'all' || tournamentPhase === 'allPairs') {
				if (index >= allPairs.length) {
					return null;
				}
				return allPairs[index] ?? null;
			}

			// Tournament mode
			if (activePool.length < 2) {
				return null;
			}

			const idx1 = currentPairIndex * 2;
			const idx2 = currentPairIndex * 2 + 1;

			if (idx2 >= activePool.length) {
				return null;
			}

			const item1 = activePool[idx1];
			const item2 = activePool[idx2];

			if (item1 === undefined || item2 === undefined) {
				return null;
			}

			return [item1, item2];
		},
		[mode, tournamentPhase, allPairs, activePool, currentPairIndex],
	);

	// Current pair for rendering
	const currentPair = useMemo<[number, number] | null>(() => {
		return getPairAtIndex(allPairIndex);
	}, [getPairAtIndex, allPairIndex]);

	const currentScores = useMemo(() => {
		return calculateScores(itemCount, wins, losses, boostedIndices);
	}, [itemCount, wins, losses, boostedIndices]);

	const rankingConfidence = useMemo(() => {
		return analyzeRankingConfidence(itemCount, wins, losses);
	}, [itemCount, wins, losses]);

	const hasTies = !hasNoTies(currentScores);

	// Check if all items have been scored at least once
	const allItemsScored = useMemo(() => {
		for (let i = 0; i < itemCount; i++) {
			if ((wins[i] ?? 0) + (losses[i] ?? 0) === 0) {
				return false;
			}
		}
		return true;
	}, [itemCount, wins, losses]);

	useEffect(() => {
		// Only offer early finish when there's a statistically confident winner
		// AND no ties in the scores (all items have unique rankings)
		// AND all items have been scored at least once
		if (
			rankingConfidence.hasConfidentWinner &&
			!hasTies &&
			!canFinishEarly &&
			history.length > 0 &&
			allItemsScored
		) {
			setCanFinishEarly(true);
		}
	}, [
		rankingConfidence.hasConfidentWinner,
		hasTies,
		canFinishEarly,
		history.length,
		allItemsScored,
	]);

	const handleVote = useCallback(
		(winnerLocalIdx: 0 | 1) => {
			// Throttle rapid votes using timestamp
			const now = Date.now();
			if (now - lastVoteTimeRef.current < VOTE_COOLDOWN_MS) {
				return;
			}
			lastVoteTimeRef.current = now;

			let pairToVote: [number, number] | null;
			let currentRefIndex: number;

			// For allPairs mode, use the ref to bypass React batching
			if (mode === 'all' || tournamentPhase === 'allPairs') {
				currentRefIndex = allPairIndexRef.current;
				pairToVote = getPairAtIndex(currentRefIndex);

				if (!pairToVote) {
					return;
				}

				// Increment ref immediately to prevent double-voting on same pair
				allPairIndexRef.current = currentRefIndex + 1;
			} else {
				// Tournament mode uses currentPairIndex which changes with each vote anyway
				pairToVote = getPairAtIndex(allPairIndex);
				currentRefIndex = allPairIndex;

				if (!pairToVote) {
					return;
				}
			}
			const winnerIdx = pairToVote[winnerLocalIdx];
			const loserIdx = pairToVote[1 - winnerLocalIdx]!;

			setSelectedSide(winnerLocalIdx === 0 ? 'left' : 'right');

			setHistory((prev) => [
				...prev,
				{
					wins: [...wins],
					losses: [...losses],
					activePool: [...activePool],
					currentPairIndex,
					roundWinners: [...roundWinners],
					roundNumber,
					allPairIndex: currentRefIndex,
					previousMatchup,
					recentItems: [...recentItems],
					tournamentPhase,
					topNeutralItems: [...topNeutralItems],
					topBoostedItems: [...topBoostedItems],
				},
			]);

			setWins((prev) => {
				const next = [...prev];
				next[winnerIdx]! += 1;
				return next;
			});

			setLosses((prev) => {
				const next = [...prev];
				next[loserIdx]! += 1;
				return next;
			});

			setRecentItems((prev) => [winnerIdx, loserIdx, ...prev].slice(0, 4));

			setPreviousMatchup({
				left: pairToVote[0],
				right: pairToVote[1],
				winner: winnerIdx,
			});

			// Sync React state with ref (triggers re-render with correct value)
			if (mode === 'all' || tournamentPhase === 'allPairs') {
				// Simple all-pairs mode - sync state with ref
				setAllPairIndex(allPairIndexRef.current);
			} else {
				// Tournament bracket mode
				const newRoundWinners = [...roundWinners, winnerIdx];
				const nextPairIndex = currentPairIndex + 1;
				const pairsInRound = Math.floor(activePool.length / 2);

				if (nextPairIndex >= pairsInRound) {
					// Round complete - handle odd item (bye)
					const finalWinners =
						activePool.length % 2 === 1
							? [...newRoundWinners, activePool[activePool.length - 1]!]
							: newRoundWinners;

					if (finalWinners.length === 1) {
						// Phase complete - transition to next phase

						if (tournamentPhase === 'neutral') {
							// Store top 1/4 of neutral items (minimum 1)
							const topCount = Math.max(1, Math.ceil(neutralItems.length / 4));
							// Get top items by current win ratio
							const sortedNeutral = [...neutralItems].sort((a, b) => {
								const aTotal = wins[a]! + losses[a]!;
								const bTotal = wins[b]! + losses[b]!;
								const aRatio = aTotal > 0 ? wins[a]! / aTotal : 0;
								const bRatio = bTotal > 0 ? wins[b]! / bTotal : 0;
								return bRatio - aRatio;
							});
							setTopNeutralItems(sortedNeutral.slice(0, topCount));

							// Move to boosted phase
							if (boostedItems.length > 1) {
								setActivePool(shuffleArray([...boostedItems]));
								setTournamentPhase('boosted');
							} else if (boostedItems.length === 1) {
								// Only 1 boosted item, add it to top and go to crossover
								setTopBoostedItems(boostedItems);
								const crossoverPool = [
									...sortedNeutral.slice(0, topCount),
									...boostedItems,
								];
								if (crossoverPool.length > 1) {
									setActivePool(shuffleArray(crossoverPool));
									setTournamentPhase('crossover');
								} else {
									setTournamentPhase('allPairs');
									setTournamentComplete(true);
								}
							} else {
								// No boosted items, go straight to allPairs
								setTournamentPhase('allPairs');
								setTournamentComplete(true);
							}
						} else if (tournamentPhase === 'boosted') {
							// Store top 1/4 of boosted items
							const topCount = Math.max(1, Math.ceil(boostedItems.length / 4));
							const sortedBoosted = [...boostedItems].sort((a, b) => {
								const aTotal = wins[a]! + losses[a]!;
								const bTotal = wins[b]! + losses[b]!;
								const aRatio = aTotal > 0 ? wins[a]! / aTotal : 0;
								const bRatio = bTotal > 0 ? wins[b]! / bTotal : 0;
								return bRatio - aRatio;
							});
							setTopBoostedItems(sortedBoosted.slice(0, topCount));

							// Move to crossover phase
							const crossoverPool = [
								...topNeutralItems,
								...sortedBoosted.slice(0, topCount),
							];
							if (crossoverPool.length > 1) {
								setActivePool(shuffleArray(crossoverPool));
								setTournamentPhase('crossover');
							} else {
								setTournamentPhase('allPairs');
								setTournamentComplete(true);
							}
						} else {
							// Crossover complete, move to allPairs
							setTournamentPhase('allPairs');
							setTournamentComplete(true);
						}

						setCurrentPairIndex(0);
						setRoundWinners([]);
						setRoundNumber(1);
					} else {
						// More rounds needed in current phase
						setActivePool(shuffleArray(finalWinners));
						setCurrentPairIndex(0);
						setRoundWinners([]);
						setRoundNumber((prev) => prev + 1);
					}
				} else {
					// Continue current round
					setRoundWinners(newRoundWinners);
					setCurrentPairIndex(nextPairIndex);
				}

				// Also advance allPairIndex to track progress (for tournament mode)
				allPairIndexRef.current += 1;
				setAllPairIndex(allPairIndexRef.current);
			}

			// Clear selection highlight after a brief delay (visual only)
			setTimeout(() => {
				setSelectedSide(null);
			}, 100);
		},
		[
			getPairAtIndex,
			mode,
			allPairIndex,
			wins,
			losses,
			activePool,
			currentPairIndex,
			roundWinners,
			roundNumber,
			previousMatchup,
			recentItems,
			tournamentPhase,
			topNeutralItems,
			topBoostedItems,
			neutralItems,
			boostedItems,
		],
	);

	const handleUndo = useCallback(() => {
		if (history.length === 0) {
			return;
		}

		const lastState = history[history.length - 1] ?? ({} as HistoryState);
		setWins(lastState.wins);
		setLosses(lastState.losses);
		setActivePool(lastState.activePool);
		setCurrentPairIndex(lastState.currentPairIndex);
		setRoundWinners(lastState.roundWinners);
		setRoundNumber(lastState.roundNumber);
		setAllPairIndex(lastState.allPairIndex);
		// Sync ref with restored state
		allPairIndexRef.current = lastState.allPairIndex;
		setPreviousMatchup(lastState.previousMatchup);
		setRecentItems(lastState.recentItems);
		setTournamentPhase(lastState.tournamentPhase);
		setTopNeutralItems(lastState.topNeutralItems);
		setTopBoostedItems(lastState.topBoostedItems);
		setHistory((prev) => prev.slice(0, -1));
	}, [history]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent): void {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				handleVote(0);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				handleVote(1);
			} else if (
				(event.key === 'z' || event.key === 'Z') &&
				(event.metaKey || event.ctrlKey)
			) {
				event.preventDefault();
				handleUndo();
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleVote, handleUndo]);

	const getItemDisplay = useCallback(
		(localIdx: number) => {
			const originalIdx = includedIndices[localIdx]!;
			return data.rows[originalIdx]?.[0] ?? `Item ${originalIdx + 1}`;
		},
		[data.rows, includedIndices],
	);

	const getItemDetails = useCallback(
		(localIdx: number) => {
			const originalIdx = includedIndices[localIdx]!;
			return data.rows[originalIdx];
		},
		[data.rows, includedIndices],
	);

	const progress = useMemo(() => {
		return (allPairIndex / allPairs.length) * 100;
	}, [allPairIndex, allPairs.length]);

	// Only auto-complete when ALL pairs are done
	const isComplete = allPairIndex >= allPairs.length;

	// Show finish button when tournament phase is done or statistical confidence is high
	// Only show if all items have been scored at least once
	const showFinishButton =
		allItemsScored &&
		(tournamentComplete ||
			(canFinishEarly && rankingConfidence.hasConfidentWinner));

	useEffect(() => {
		if (isComplete) {
			onComplete(currentScores);
		}
	}, [isComplete, onComplete, currentScores]);

	if (isComplete || !currentPair) {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="mx-auto max-w-4xl"
		>
			<AnimatePresence>
				{previousMatchup ? (
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						className="border-border bg-card/90 absolute left-4 top-4 hidden max-w-xs rounded-lg border p-3 shadow-sm backdrop-blur-sm lg:block"
					>
						<p className="text-muted-foreground mb-1 text-xs">Previous:</p>
						<p className="text-sm">
							<span
								className={
									previousMatchup.winner === previousMatchup.left
										? 'text-primary font-medium'
										: 'text-muted-foreground line-through'
								}
							>
								{getItemDisplay(previousMatchup.left)}
							</span>
							<span className="text-muted-foreground/50 mx-2">vs</span>
							<span
								className={
									previousMatchup.winner === previousMatchup.right
										? 'text-primary font-medium'
										: 'text-muted-foreground line-through'
								}
							>
								{getItemDisplay(previousMatchup.right)}
							</span>
						</p>
					</motion.div>
				) : null}
			</AnimatePresence>

			<AnimatePresence>
				{showFinishButton ? (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="from-primary to-primary/80 text-primary-foreground mb-6 flex items-center justify-between rounded-xl bg-gradient-to-r p-4"
					>
						<div className="flex items-center gap-3">
							<span className="text-2xl">
								{tournamentComplete ? '✨' : '🎯'}
							</span>
							<div>
								<p className="font-medium">
									{tournamentComplete
										? 'Quick ranking complete!'
										: 'Clear winner detected!'}{' '}
									<span className="text-primary-foreground/80">
										({Math.round(rankingConfidence.confidenceLevel * 100)}%
										confidence)
									</span>
								</p>
								<p className="text-primary-foreground/80 text-sm">
									{tournamentComplete
										? 'You can finish now or continue comparing all pairs.'
										: 'The ranking is statistically stable. Continue for more accuracy or finish now.'}
								</p>
							</div>
						</div>
						<motion.button
							onClick={() => {
								onComplete(currentScores);
							}}
							className="bg-background text-primary hover:bg-muted rounded-lg px-4 py-2 font-medium transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							Finish Now
						</motion.button>
					</motion.div>
				) : null}
			</AnimatePresence>

			<div className="mb-6 flex items-center justify-between">
				<motion.button
					onClick={handleUndo}
					disabled={history.length === 0}
					className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30"
					whileHover={{ scale: history.length > 0 ? 1.05 : 1 }}
					whileTap={{ scale: history.length > 0 ? 0.95 : 1 }}
				>
					<svg
						className="size-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
						/>
					</svg>
					Undo
					<kbd className="bg-muted hidden rounded px-1.5 py-0.5 text-xs sm:inline">
						⌘Z
					</kbd>
				</motion.button>

				<div className="bg-muted inline-flex rounded-lg p-1">
					<button
						onClick={() => {
							setMode('tournament');
						}}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
							mode === 'tournament'
								? 'bg-card text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						⚡ Quick
					</button>
					<button
						onClick={() => {
							setMode('all');
						}}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
							mode === 'all'
								? 'bg-card text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						📊 All Pairs
					</button>
				</div>
			</div>

			<div className="mb-6">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-muted-foreground text-sm">Progress</span>
					<span className="text-foreground text-sm font-medium">
						{allPairIndex + 1} of {allPairs.length}
					</span>
				</div>
				<div className="bg-muted h-2 overflow-hidden rounded-full">
					<motion.div
						className="from-primary to-primary/70 h-full bg-gradient-to-r"
						animate={{ width: `${progress}%` }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
					/>
				</div>
				{mode === 'tournament' && tournamentPhase !== 'allPairs' && (
					<div className="text-muted-foreground mt-2 flex items-center justify-center gap-2 text-xs">
						<span className="opacity-60">Phase:</span>
						<span className="font-medium capitalize">
							{tournamentPhase === 'neutral'
								? '1/3 – Neutral items'
								: tournamentPhase === 'boosted'
									? '2/3 – Boosted items'
									: '3/3 – Top items crossover'}
						</span>
					</div>
				)}
			</div>

			<p className="text-muted-foreground mb-6 text-center text-lg">
				Which do you prefer?
			</p>

			<div className="grid grid-cols-2 gap-4 sm:gap-6">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={`${currentPair[0]}-${currentPair[1]}`}
						className="contents"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<motion.button
							onClick={() => {
								handleVote(0);
							}}
							className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-150 sm:p-8 ${
								selectedSide === 'left'
									? 'border-primary bg-primary/10'
									: 'border-border bg-card/90 hover:border-primary/50 backdrop-blur-sm hover:shadow-lg'
							}`}
							initial={{ opacity: 0, x: -30 }}
							animate={{
								opacity: 1,
								x: 0,
								scale:
									selectedSide === 'left'
										? 1.02
										: selectedSide === 'right'
											? 0.98
											: 1,
							}}
							whileHover={{ scale: selectedSide ? 1 : 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<div className="bg-muted text-muted-foreground absolute right-3 top-3 rounded px-2 py-1 text-xs font-medium">
								←
							</div>
							<div className="pt-2 sm:pt-4">
								<h3 className="text-foreground mb-2 break-words pr-8 text-lg font-semibold sm:text-xl">
									{getItemDisplay(currentPair[0])}
								</h3>
								{data.headers.length > 1 ? (
									<div className="space-y-1">
										{data.headers.slice(1).map((header, idx) => (
											<p
												key={header}
												className="text-muted-foreground text-xs sm:text-sm"
											>
												<span className="font-medium">{header}:</span>{' '}
												{getItemDetails(currentPair[0])?.[idx + 1]}
											</p>
										))}
									</div>
								) : null}
							</div>
							{selectedSide === 'left' ? (
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									className="absolute bottom-3 right-3"
								>
									<svg
										className="text-primary size-6 sm:size-8"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
								</motion.div>
							) : null}
						</motion.button>

						<motion.button
							onClick={() => {
								handleVote(1);
							}}
							className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-150 sm:p-8 ${
								selectedSide === 'right'
									? 'border-primary bg-primary/10'
									: 'border-border bg-card/90 hover:border-primary/50 backdrop-blur-sm hover:shadow-lg'
							}`}
							initial={{ opacity: 0, x: 30 }}
							animate={{
								opacity: 1,
								x: 0,
								scale:
									selectedSide === 'right'
										? 1.02
										: selectedSide === 'left'
											? 0.98
											: 1,
							}}
							whileHover={{ scale: selectedSide ? 1 : 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<div className="bg-muted text-muted-foreground absolute right-3 top-3 rounded px-2 py-1 text-xs font-medium">
								→
							</div>
							<div className="pt-2 sm:pt-4">
								<h3 className="text-foreground mb-2 break-words pr-8 text-lg font-semibold sm:text-xl">
									{getItemDisplay(currentPair[1])}
								</h3>
								{data.headers.length > 1 ? (
									<div className="space-y-1">
										{data.headers.slice(1).map((header, idx) => (
											<p
												key={header}
												className="text-muted-foreground text-xs sm:text-sm"
											>
												<span className="font-medium">{header}:</span>{' '}
												{getItemDetails(currentPair[1])?.[idx + 1]}
											</p>
										))}
									</div>
								) : null}
							</div>
							{selectedSide === 'right' ? (
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									className="absolute bottom-3 right-3"
								>
									<svg
										className="text-primary size-6 sm:size-8"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
								</motion.div>
							) : null}
						</motion.button>
					</motion.div>
				</AnimatePresence>
			</div>

			<motion.p
				className="text-muted-foreground mt-6 text-center text-sm"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
			>
				Press{' '}
				<kbd className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
					←
				</kbd>{' '}
				or{' '}
				<kbd className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
					→
				</kbd>{' '}
				• Click to select
			</motion.p>

			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="mt-6 flex items-center justify-center gap-4"
			>
				<motion.button
					onClick={onRestart}
					className="bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg px-6 py-2 text-sm font-medium transition-colors"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					Restart Voting
				</motion.button>
				{history.length >= itemCount ? (
					<motion.button
						onClick={() => {
							onComplete(currentScores);
						}}
						className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2 text-sm font-medium transition-colors"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						Finish & See Results
					</motion.button>
				) : null}
			</motion.div>

			{/* Score Distribution Graph */}
			{history.length > 0 ? (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="border-border/50 mt-8 border-t pt-6"
				>
					<p className="text-muted-foreground mb-3 text-center text-xs">
						Score Distribution
					</p>
					<div className="flex h-16 items-end justify-center gap-0.5">
						{currentScores
							.map((score, idx) => ({ score, idx }))
							.sort((a, b) => b.score - a.score)
							.map(({ score, idx }) => {
								const maxScore = Math.max(...currentScores, 1);
								const barHeight = Math.max((score / maxScore) * 64, 4);
								return (
									<div
										key={idx}
										className="group relative flex flex-col items-center"
									>
										<div className="pointer-events-none absolute -top-14 left-1/2 z-10 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
											<div className="bg-foreground text-background whitespace-nowrap rounded px-2 py-1 text-xs font-medium shadow-lg">
												<p className="max-w-24 truncate">
													{getItemDisplay(idx)}
												</p>
												<p className="text-center opacity-70">
													{score.toFixed(1)}
												</p>
											</div>
											<div className="border-foreground mx-auto size-0 border-x-4 border-t-4 border-x-transparent" />
										</div>
										<motion.div
											className="w-2 cursor-pointer rounded-t bg-blue-500/60 transition-colors hover:bg-blue-500"
											initial={{ height: 0 }}
											animate={{ height: barHeight }}
											transition={{ duration: 0.15, ease: 'easeOut' }}
										/>
									</div>
								);
							})}
					</div>
				</motion.div>
			) : null}
		</motion.div>
	);
}
