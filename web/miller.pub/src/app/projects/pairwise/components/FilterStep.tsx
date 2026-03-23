'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import type { ItemState, ItemStatus, ParsedCsv } from '../types';

export interface FilterStepProps {
	data: ParsedCsv;
	onComplete: (includedIndices: number[], boostedIndices: number[]) => void;
	onSkip: (includedIndices: number[], boostedIndices: number[]) => void;
}

export function FilterStep({
	data,
	onComplete,
	onSkip,
}: FilterStepProps): JSX.Element {
	const [itemStates, setItemStates] = useState<ItemState[]>(() =>
		data.rows.map(() => ({ status: 'neutral', boosted: false })),
	);
	const [currentIndex, setCurrentIndex] = useState(0);

	const handleVote = useCallback(
		(status: ItemStatus) => {
			setItemStates((prev) => {
				const newStates = [...prev];
				newStates[currentIndex] = {
					status,
					boosted: status === 'up',
				};
				return newStates;
			});

			if (currentIndex < data.rows.length - 1) {
				setCurrentIndex((prev) => prev + 1);
			}
		},
		[currentIndex, data.rows.length],
	);

	const handleFinish = useCallback(() => {
		const includedIndices: number[] = [];
		const boostedIndices: number[] = [];

		itemStates.forEach((state, idx) => {
			if (state.status !== 'down') {
				includedIndices.push(idx);
				if (state.boosted) {
					boostedIndices.push(includedIndices.length - 1);
				}
			}
		});

		if (includedIndices.length < 2) {
			return;
		}

		onComplete(includedIndices, boostedIndices);
	}, [itemStates, onComplete]);

	const handleSkip = useCallback(() => {
		const allIndices = data.rows.map((_, idx) => idx);
		onSkip(allIndices, []);
	}, [data.rows, onSkip]);

	const includedCount = itemStates.filter((s) => s.status !== 'down').length;
	const boostedCount = itemStates.filter((s) => s.boosted).length;
	const excludedCount = itemStates.filter((s) => s.status === 'down').length;

	const getItemDisplay = useCallback(
		(rowIndex: number) => {
			return data.rows[rowIndex]?.[0] ?? `Item ${rowIndex + 1}`;
		},
		[data.rows],
	);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent): void {
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				handleVote('up');
			} else if (event.key === 'ArrowDown') {
				event.preventDefault();
				handleVote('down');
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				handleVote('neutral');
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleVote]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="mx-auto max-w-3xl"
		>
			<div className="mb-6 text-center">
				<p className="text-muted-foreground mb-2">
					Pre-filter items before comparison
				</p>
				<p className="text-muted-foreground/70 text-sm">
					↑ Thumbs Up • ↓ Thumbs Down • → Skip
				</p>
			</div>

			<div className="mb-6 flex justify-center gap-4 text-sm">
				<span className="bg-primary/15 text-primary dark:bg-primary/25 rounded-full px-3 py-1.5 font-medium">
					{boostedCount} 👍
				</span>
				<span className="bg-muted text-muted-foreground rounded-full px-3 py-1.5 font-medium">
					{includedCount - boostedCount} skipped
				</span>
				<span className="bg-destructive/15 text-destructive dark:bg-destructive/25 rounded-full px-3 py-1.5 font-medium">
					{excludedCount} 👎
				</span>
			</div>

			<div className="mb-6">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-muted-foreground text-sm">Review progress</span>
					<span className="text-foreground text-sm font-medium">
						{currentIndex + 1} of {data.rows.length}
					</span>
				</div>
				<div className="bg-muted h-2 overflow-hidden rounded-full">
					<motion.div
						className="from-primary to-primary/70 h-full bg-gradient-to-r"
						animate={{
							width: `${((currentIndex + 1) / data.rows.length) * 100}%`,
						}}
						transition={{ duration: 0.3 }}
					/>
				</div>
			</div>

			<motion.div
				key={currentIndex}
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="border-border bg-card/90 mb-6 rounded-2xl border p-8 shadow-sm backdrop-blur-sm"
			>
				<h3 className="text-foreground mb-3 text-center text-2xl font-semibold">
					{getItemDisplay(currentIndex)}
				</h3>
				{data.headers.length > 1 ? (
					<div className="flex flex-wrap justify-center gap-3">
						{data.headers.slice(1).map((header, idx) => (
							<span
								key={header}
								className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm"
							>
								<span className="font-medium">{header}:</span>{' '}
								{data.rows[currentIndex]?.[idx + 1]}
							</span>
						))}
					</div>
				) : null}

				<div
					className={`mt-4 text-center text-sm font-medium ${
						// eslint-disable-next-line no-nested-ternary -- needed
						itemStates[currentIndex]?.status === 'up'
							? 'text-primary'
							: itemStates[currentIndex]?.status === 'down'
								? 'text-destructive'
								: 'text-muted-foreground'
					}`}
				>
					{itemStates[currentIndex]?.status === 'up' && '👍 Thumbs Up'}
					{itemStates[currentIndex]?.status === 'down' && '👎 Thumbs Down'}
					{itemStates[currentIndex]?.status === 'neutral' && '⏭ Skipped'}
				</div>
			</motion.div>

			<div className="mb-6 grid grid-cols-3 gap-4">
				<motion.button
					onClick={() => {
						handleVote('up');
					}}
					className={`rounded-xl border-2 p-4 transition-all ${
						itemStates[currentIndex]?.status === 'up'
							? 'border-primary bg-primary/10'
							: 'border-border bg-card/80 hover:border-primary/50'
					}`}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<div className="mb-1 text-3xl">👍</div>
					<div className="text-foreground text-sm font-medium">Thumbs Up</div>
					<div className="text-muted-foreground mt-1 text-xs">↑</div>
				</motion.button>

				<motion.button
					onClick={() => {
						handleVote('down');
					}}
					className={`rounded-xl border-2 p-4 transition-all ${
						itemStates[currentIndex]?.status === 'down'
							? 'border-destructive bg-destructive/10'
							: 'border-border bg-card/80 hover:border-destructive/50'
					}`}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<div className="mb-1 text-3xl">👎</div>
					<div className="text-foreground text-sm font-medium">Thumbs Down</div>
					<div className="text-muted-foreground mt-1 text-xs">↓</div>
				</motion.button>

				<motion.button
					onClick={() => {
						handleVote('neutral');
					}}
					className={`rounded-xl border-2 p-4 transition-all ${
						itemStates[currentIndex]?.status === 'neutral'
							? 'border-muted-foreground bg-muted'
							: 'border-border bg-card/80 hover:border-muted-foreground/50'
					}`}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<div className="mb-1 text-3xl">⏭</div>
					<div className="text-foreground text-sm font-medium">Skip</div>
					<div className="text-muted-foreground mt-1 text-xs">→</div>
				</motion.button>
			</div>

			<div className="bg-muted/50 mb-6 max-h-48 overflow-y-auto rounded-xl p-4">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
					{data.rows.map((row, idx) => (
						<motion.button
							key={idx}
							onClick={() => {
								setCurrentIndex(idx);
							}}
							className={`rounded-lg p-2 text-left text-sm transition-all ${
								// eslint-disable-next-line no-nested-ternary -- don't care
								idx === currentIndex
									? 'bg-card ring-ring shadow-sm ring-2'
									: // eslint-disable-next-line no-nested-ternary -- don't care
										itemStates[idx]?.status === 'down'
										? 'bg-destructive/15 text-destructive line-through opacity-60'
										: itemStates[idx]?.status === 'up'
											? 'bg-primary/15 text-primary'
											: 'bg-card hover:bg-muted'
							}`}
							whileHover={{ scale: 1.02 }}
						>
							<span className="block truncate">{row[0]}</span>
						</motion.button>
					))}
				</div>
			</div>

			<div className="flex gap-4">
				<motion.button
					onClick={handleSkip}
					className="border-border text-foreground hover:border-muted-foreground/50 hover:bg-muted flex-1 rounded-xl border-2 px-6 py-3 font-medium transition-all"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					Skip Filtering
				</motion.button>
				<motion.button
					onClick={handleFinish}
					disabled={includedCount < 2}
					className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl px-6 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
					whileHover={{ scale: includedCount >= 2 ? 1.02 : 1 }}
					whileTap={{ scale: includedCount >= 2 ? 0.98 : 1 }}
				>
					Continue with {includedCount} items
				</motion.button>
			</div>

			{includedCount < 2 ? (
				<p className="text-destructive mt-4 text-center text-sm">
					You need at least 2 items to compare
				</p>
			) : null}
		</motion.div>
	);
}
