/* eslint-disable no-nested-ternary -- don't care */
'use client';

import { motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';

import { generateCSV } from '../lib/csv';
import type { ParsedCsv } from '../types';

export interface ResultsStepProps {
	data: ParsedCsv;
	includedIndices: number[];
	scores: number[];
	onRestart: () => void;
}

export function ResultsStep({
	data,
	includedIndices,
	scores,
	onRestart,
}: ResultsStepProps): JSX.Element {
	const [copied, setCopied] = useState(false);

	const sortedData = useMemo(() => {
		const indexed = includedIndices.map((originalIdx, localIdx) => ({
			row: data.rows[originalIdx]!,
			score: scores[localIdx]!,
			originalIndex: originalIdx,
		}));
		indexed.sort((a, b) => b.score - a.score);
		return indexed;
	}, [data.rows, includedIndices, scores]);

	const newHeaders = [...data.headers, 'score'];
	const newRows = sortedData.map(
		({ row, score }) => [...row, score.toFixed(2)] as string[],
	);
	const csvContent = generateCSV(newHeaders, newRows);

	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(csvContent);
		setCopied(true);
		setTimeout(() => {
			setCopied(false);
		}, 2000);
	}, [csvContent]);

	const handleDownload = useCallback(() => {
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'ranked-results.csv';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [csvContent]);

	const maxScore = Math.max(...scores);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="mx-auto max-w-3xl"
		>
			<motion.div
				className="mb-8 text-center"
				initial={{ scale: 0.9 }}
				animate={{ scale: 1 }}
			>
				<motion.div
					className="from-primary/20 to-primary/30 mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gradient-to-br"
					initial={{ rotate: -180, opacity: 0 }}
					animate={{ rotate: 0, opacity: 1 }}
					transition={{ type: 'spring', duration: 0.8 }}
				>
					<svg
						className="text-primary size-8"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</motion.div>
				<h2 className="text-foreground mb-2 text-2xl font-bold">
					Ranking Complete!
				</h2>
				<p className="text-muted-foreground">Here are your ranked results</p>
			</motion.div>

			<div className="border-border bg-card/90 mb-6 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm">
				<div className="max-h-96 overflow-auto">
					<table className="w-full">
						<thead className="border-border bg-muted sticky top-0 border-b">
							<tr>
								<th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
									Rank
								</th>
								<th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
									{data.headers[0]}
								</th>
								{data.headers.slice(1).map((header) => (
									<th
										key={header}
										className="text-muted-foreground hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sm:table-cell"
									>
										{header}
									</th>
								))}
								<th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
									Score
								</th>
							</tr>
						</thead>
						<tbody className="divide-border/50 divide-y">
							{sortedData.map(({ row, score }, idx) => (
								<motion.tr
									key={idx}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: idx * 0.05 }}
									className="hover:bg-muted/50 transition-colors"
								>
									<td className="whitespace-nowrap px-4 py-3">
										<span
											className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-medium ${
												idx === 0
													? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
													: idx === 1
														? 'bg-muted text-muted-foreground'
														: idx === 2
															? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
															: 'bg-muted text-muted-foreground'
											}`}
										>
											{idx + 1}
										</span>
									</td>
									<td className="text-foreground px-4 py-3 font-medium">
										{row[0]}
									</td>
									{row.slice(1).map((cell, cellIdx) => (
										<td
											key={cellIdx}
											className="text-muted-foreground hidden px-4 py-3 sm:table-cell"
										>
											{cell}
										</td>
									))}
									<td className="px-4 py-3">
										<div className="flex items-center gap-2">
											<div className="bg-muted h-2 max-w-20 flex-1 overflow-hidden rounded-full">
												<motion.div
													className="from-primary to-primary/70 h-full bg-gradient-to-r"
													initial={{ width: 0 }}
													animate={{
														width:
															maxScore > 0
																? `${(score / maxScore) * 100}%`
																: '0%',
													}}
													transition={{
														delay: idx * 0.05 + 0.3,
														duration: 0.5,
													}}
												/>
											</div>
											<span className="text-foreground w-12 text-right text-sm font-medium">
												{score.toFixed(2)}
											</span>
										</div>
									</td>
								</motion.tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="bg-muted mb-6 rounded-xl p-4">
				<div className="mb-3 flex items-center justify-between">
					<span className="text-muted-foreground text-sm font-medium">
						CSV Output
					</span>
					<div className="flex gap-2">
						<motion.button
							onClick={handleCopy}
							className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							{copied ? (
								<>
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
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Copied!
								</>
							) : (
								<>
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
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
									Copy
								</>
							)}
						</motion.button>
						<motion.button
							onClick={handleDownload}
							className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
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
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
								/>
							</svg>
							Download
						</motion.button>
					</div>
				</div>
				<pre className="text-muted-foreground max-h-40 overflow-auto font-mono text-xs leading-relaxed">
					{csvContent}
				</pre>
			</div>

			<motion.button
				onClick={onRestart}
				className="border-border text-foreground hover:border-muted-foreground/50 hover:bg-muted w-full rounded-xl border-2 px-6 py-3 font-medium transition-all"
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				Start New Comparison
			</motion.button>
		</motion.div>
	);
}
