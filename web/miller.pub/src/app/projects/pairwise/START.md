```tsx
import { motion, AnimatePresence } from 'framer-motion';
import React, {
	useState,
	useCallback,
	useMemo,
	useRef,
	useEffect,
} from 'react';

// Utility to parse CSV
function parseCSV(text) {
	const lines = text.trim().split(/\r?\n/);
	if (lines.length < 2) return { headers: [], rows: [] };

	const parseRow = (line) => {
		const result = [];
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
				current += char;
			}
		}
		result.push(current.trim());
		return result;
	};

	const headers = parseRow(lines[0]);
	const rows = lines
		.slice(1)
		.filter((line) => line.trim())
		.map(parseRow);

	return { headers, rows };
}

// Generate CSV string
function generateCSV(headers, rows) {
	const escapeField = (field) => {
		const str = String(field);
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	};

	const headerLine = headers.map(escapeField).join(',');
	const dataLines = rows.map((row) => row.map(escapeField).join(','));

	return [headerLine, ...dataLines].join('\n');
}

// Fisher-Yates shuffle
function shuffleArray(array) {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

// Calculate scores from win/loss data - returns decimal scores out of 10
function calculateScores(itemCount, wins, losses, boostedItems) {
	const scores = new Array(itemCount).fill(0);

	// Base score from boost (adds 0.5 to base)
	boostedItems.forEach((idx) => {
		scores[idx] += 0.5;
	});

	// Calculate win ratio for each item
	for (let i = 0; i < itemCount; i++) {
		const totalMatches = wins[i] + losses[i];
		if (totalMatches > 0) {
			const winRatio = wins[i] / totalMatches;
			// Scale to 0-9.5 range, add to existing score
			scores[i] += winRatio * 9.5;
		}
	}

	// Normalize to ensure unique scores
	const indexed = scores.map((s, i) => ({ score: s, idx: i }));
	indexed.sort((a, b) => b.score - a.score);

	// Redistribute to ensure uniqueness with proper spacing
	const finalScores = new Array(itemCount).fill(0);
	const step = 10 / (itemCount + 1);

	indexed.forEach((item, rank) => {
		// Base score from rank
		const baseScore = 10 - (rank + 1) * step;
		// Adjust slightly based on actual performance to differentiate ties
		const performanceBonus = (item.score / 10) * (step * 0.8);
		finalScores[item.idx] =
			Math.round((baseScore + performanceBonus) * 100) / 100;
	});

	return finalScores;
}

// Check if all scores are unique
function hasNoTies(scores) {
	const rounded = scores.map((s) => Math.round(s * 100));
	const unique = new Set(rounded);
	return unique.size === scores.length;
}

// Step indicator component
function StepIndicator({ currentStep, steps }) {
	return (
		<div className="mb-8 flex items-center justify-center gap-2 sm:gap-3">
			{steps.map((step, idx) => (
				<React.Fragment key={step}>
					<motion.div
						className="flex items-center gap-1.5 sm:gap-2"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: idx * 0.1 }}
					>
						<motion.div
							className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-500 sm:size-8 sm:text-sm ${
								idx < currentStep
									? 'bg-teal-600 text-white'
									: idx === currentStep
										? 'bg-slate-800 text-white'
										: 'bg-stone-200 text-stone-400'
							}`}
							animate={{
								scale: idx === currentStep ? 1.1 : 1,
							}}
						>
							{idx < currentStep ? (
								<svg
									className="size-3.5 sm:size-4"
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
							) : (
								idx + 1
							)}
						</motion.div>
						<span
							className={`hidden text-xs transition-colors duration-300 sm:text-sm md:block ${
								idx === currentStep
									? 'font-medium text-slate-800'
									: 'text-stone-400'
							}`}
						>
							{step}
						</span>
					</motion.div>
					{idx < steps.length - 1 && (
						<div
							className={`h-0.5 w-4 transition-colors duration-500 sm:w-8 ${
								idx < currentStep ? 'bg-teal-600' : 'bg-stone-200'
							}`}
						/>
					)}
				</React.Fragment>
			))}
		</div>
	);
}

// Upload step component
function UploadStep({ onDataLoaded }) {
	const [dragActive, setDragActive] = useState(false);
	const [textInput, setTextInput] = useState('');
	const [error, setError] = useState('');
	const fileInputRef = useRef(null);

	const processData = useCallback(
		(text) => {
			setError('');
			const { headers, rows } = parseCSV(text);

			if (headers.length === 0 || rows.length < 2) {
				setError('Please provide a CSV with at least one column and two rows.');
				return;
			}

			onDataLoaded({ headers, rows, originalText: text });
		},
		[onDataLoaded],
	);

	const handleDrag = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === 'dragenter' || e.type === 'dragover') {
			setDragActive(true);
		} else if (e.type === 'dragleave') {
			setDragActive(false);
		}
	}, []);

	const handleDrop = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);

			const file = e.dataTransfer.files?.[0];
			if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
				const reader = new FileReader();
				reader.onload = (e) => processData(e.target.result);
				reader.readAsText(file);
			} else {
				setError('Please drop a valid CSV file.');
			}
		},
		[processData],
	);

	const handleFileChange = useCallback(
		(e) => {
			const file = e.target.files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => processData(e.target.result);
				reader.readAsText(file);
			}
		},
		[processData],
	);

	const handlePaste = useCallback(() => {
		if (textInput.trim()) {
			processData(textInput);
		}
	}, [textInput, processData]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="mx-auto max-w-2xl"
		>
			<motion.div
				className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
					dragActive
						? 'border-teal-500 bg-teal-50'
						: 'border-stone-300 bg-white/80 backdrop-blur-sm hover:border-stone-400'
				}`}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.99 }}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept=".csv"
					onChange={handleFileChange}
					className="hidden"
				/>
				<motion.div
					animate={{ y: dragActive ? -5 : 0 }}
					className="mb-4 inline-block"
				>
					<svg
						className="mx-auto size-16 text-stone-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						/>
					</svg>
				</motion.div>
				<p className="mb-2 text-lg font-medium text-slate-700">
					Drop your CSV file here
				</p>
				<p className="text-sm text-stone-500">or click to browse</p>
			</motion.div>

			<div className="relative my-8">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-stone-200" />
				</div>
				<div className="relative flex justify-center text-sm">
					<span className="bg-gradient-to-b from-amber-50 to-orange-50 px-4 text-stone-500">
						or paste CSV content
					</span>
				</div>
			</div>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
			>
				<textarea
					value={textInput}
					onChange={(e) => setTextInput(e.target.value)}
					placeholder={`name,category\nItem 1,A\nItem 2,B\nItem 3,A`}
					className="h-48 w-full resize-none rounded-xl border border-stone-300 bg-white/80 p-4 font-mono text-sm backdrop-blur-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
				/>
				<motion.button
					onClick={handlePaste}
					disabled={!textInput.trim()}
					className="mt-4 w-full rounded-xl bg-slate-800 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
					whileHover={{ scale: textInput.trim() ? 1.02 : 1 }}
					whileTap={{ scale: textInput.trim() ? 0.98 : 1 }}
				>
					Load CSV Data
				</motion.button>
			</motion.div>

			<AnimatePresence>
				{error ? (
					<motion.p
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="mt-4 text-center text-sm text-rose-600"
					>
						{error}
					</motion.p>
				) : null}
			</AnimatePresence>
		</motion.div>
	);
}

// Filter step component
function FilterStep({ data, onComplete, onSkip }) {
	const [itemStates, setItemStates] = useState(() =>
		data.rows.map(() => ({ status: 'neutral', boosted: false })),
	);
	const [currentIndex, setCurrentIndex] = useState(0);

	const handleVote = useCallback(
		(status) => {
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
		const includedIndices = [];
		const boostedIndices = [];

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

	const getItemDisplay = (rowIndex) => {
		return data.rows[rowIndex][0] || `Item ${rowIndex + 1}`;
	};

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				handleVote('up');
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				handleVote('down');
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				handleVote('neutral');
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleVote]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="mx-auto max-w-3xl"
		>
			<div className="mb-6 text-center">
				<p className="mb-2 text-slate-600">
					Pre-filter items before comparison
				</p>
				<p className="text-sm text-stone-400">
					↑ Boost • ↓ Exclude • → Neutral
				</p>
			</div>

			<div className="mb-6 flex justify-center gap-4 text-sm">
				<span className="rounded-full bg-teal-100 px-3 py-1.5 font-medium text-teal-700">
					{boostedCount} boosted
				</span>
				<span className="rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-600">
					{includedCount - boostedCount} neutral
				</span>
				<span className="rounded-full bg-rose-100 px-3 py-1.5 font-medium text-rose-600">
					{excludedCount} excluded
				</span>
			</div>

			<div className="mb-6">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-sm text-stone-500">Review progress</span>
					<span className="text-sm font-medium text-slate-700">
						{currentIndex + 1} of {data.rows.length}
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-stone-200">
					<motion.div
						className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
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
				className="mb-6 rounded-2xl border border-stone-200 bg-white/90 p-8 shadow-sm backdrop-blur-sm"
			>
				<h3 className="mb-3 text-center text-2xl font-semibold text-slate-800">
					{getItemDisplay(currentIndex)}
				</h3>
				{data.headers.length > 1 && (
					<div className="flex flex-wrap justify-center gap-3">
						{data.headers.slice(1).map((header, idx) => (
							<span
								key={header}
								className="rounded-full bg-stone-50 px-3 py-1 text-sm text-stone-500"
							>
								<span className="font-medium">{header}:</span>{' '}
								{data.rows[currentIndex][idx + 1]}
							</span>
						))}
					</div>
				)}

				<div
					className={`mt-4 text-center text-sm font-medium ${
						itemStates[currentIndex].status === 'up'
							? 'text-teal-600'
							: itemStates[currentIndex].status === 'down'
								? 'text-rose-500'
								: 'text-stone-400'
					}`}
				>
					{itemStates[currentIndex].status === 'up' && '⬆ Boosted'}
					{itemStates[currentIndex].status === 'down' && '⬇ Excluded'}
					{itemStates[currentIndex].status === 'neutral' && '— Neutral'}
				</div>
			</motion.div>

			<div className="mb-6 grid grid-cols-3 gap-4">
				<motion.button
					onClick={() => handleVote('up')}
					className={`rounded-xl border-2 p-4 transition-all ${
						itemStates[currentIndex].status === 'up'
							? 'border-teal-500 bg-teal-50'
							: 'border-stone-200 bg-white/80 hover:border-teal-300'
					}`}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<div className="mb-1 text-3xl">⬆</div>
					<div className="text-sm font-medium text-slate-700">Boost</div>
					<div className="mt-1 text-xs text-stone-400">↑</div>
				</motion.button>

				<motion.button
					onClick={() => handleVote('down')}
					className={`rounded-xl border-2 p-4 transition-all ${
						itemStates[currentIndex].status === 'down'
							? 'border-rose-500 bg-rose-50'
							: 'border-stone-200 bg-white/80 hover:border-rose-300'
					}`}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<div className="mb-1 text-3xl">⬇</div>
					<div className="text-sm font-medium text-slate-700">Exclude</div>
					<div className="mt-1 text-xs text-stone-400">↓</div>
				</motion.button>

				<motion.button
					onClick={() => handleVote('neutral')}
					className={`rounded-xl border-2 p-4 transition-all ${
						itemStates[currentIndex].status === 'neutral'
							? 'border-stone-400 bg-stone-50'
							: 'border-stone-200 bg-white/80 hover:border-stone-300'
					}`}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<div className="mb-1 text-3xl">➡</div>
					<div className="text-sm font-medium text-slate-700">Neutral</div>
					<div className="mt-1 text-xs text-stone-400">→</div>
				</motion.button>
			</div>

			<div className="mb-6 max-h-48 overflow-y-auto rounded-xl bg-stone-100/80 p-4">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
					{data.rows.map((row, idx) => (
						<motion.button
							key={idx}
							onClick={() => setCurrentIndex(idx)}
							className={`rounded-lg p-2 text-left text-sm transition-all ${
								idx === currentIndex
									? 'bg-white shadow-sm ring-2 ring-slate-800'
									: itemStates[idx].status === 'down'
										? 'bg-rose-100 text-rose-600 line-through opacity-60'
										: itemStates[idx].status === 'up'
											? 'bg-teal-100 text-teal-700'
											: 'bg-white hover:bg-stone-50'
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
					className="flex-1 rounded-xl border-2 border-stone-300 px-6 py-3 font-medium text-slate-700 transition-all hover:border-stone-400 hover:bg-stone-50"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					Skip Filtering
				</motion.button>
				<motion.button
					onClick={handleFinish}
					disabled={includedCount < 2}
					className="flex-1 rounded-xl bg-slate-800 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
					whileHover={{ scale: includedCount >= 2 ? 1.02 : 1 }}
					whileTap={{ scale: includedCount >= 2 ? 0.98 : 1 }}
				>
					Continue with {includedCount} items
				</motion.button>
			</div>

			{includedCount < 2 && (
				<p className="mt-4 text-center text-sm text-rose-500">
					You need at least 2 items to compare
				</p>
			)}
		</motion.div>
	);
}

// Voting step component with improved tournament mode
function VotingStep({ data, includedIndices, boostedIndices, onComplete }) {
	const itemCount = includedIndices.length;

	// Track wins and losses for each item
	const [wins, setWins] = useState(() => new Array(itemCount).fill(0));
	const [losses, setLosses] = useState(() => new Array(itemCount).fill(0));

	// Tournament state
	const [activePool, setActivePool] = useState(() =>
		shuffleArray([...Array(itemCount).keys()]),
	);
	const [currentPairIndex, setCurrentPairIndex] = useState(0);
	const [roundWinners, setRoundWinners] = useState([]);
	const [roundNumber, setRoundNumber] = useState(1);

	// History for undo
	const [history, setHistory] = useState([]);

	// Track recent items to avoid repetition
	const [recentItems, setRecentItems] = useState([]);

	// Animation state
	const [isAnimating, setIsAnimating] = useState(false);
	const [selectedSide, setSelectedSide] = useState(null);

	// Previous matchup for reference
	const [previousMatchup, setPreviousMatchup] = useState(null);

	// No ties achieved state
	const [noTiesAchieved, setNoTiesAchieved] = useState(false);

	// Mode toggle
	const [mode, setMode] = useState('tournament');
	const [allPairs] = useState(() => {
		const pairs = [];
		for (let i = 0; i < itemCount; i++) {
			for (let j = i + 1; j < itemCount; j++) {
				pairs.push(Math.random() > 0.5 ? [i, j] : [j, i]);
			}
		}
		return shuffleArray(pairs);
	});
	const [allPairIndex, setAllPairIndex] = useState(0);

	// Get current pair based on mode
	const currentPair = useMemo(() => {
		if (mode === 'all') {
			if (allPairIndex >= allPairs.length) return null;
			return allPairs[allPairIndex];
		}

		// Tournament mode - get next pair from active pool
		if (activePool.length < 2) return null;

		const idx1 = currentPairIndex * 2;
		const idx2 = currentPairIndex * 2 + 1;

		if (idx2 >= activePool.length) return null;

		let item1 = activePool[idx1];
		let item2 = activePool[idx2];

		// Randomize left/right position
		if (Math.random() > 0.5) {
			[item1, item2] = [item2, item1];
		}

		return [item1, item2];
	}, [mode, allPairs, allPairIndex, activePool, currentPairIndex]);

	const [displayPair, setDisplayPair] = useState(currentPair);

	useEffect(() => {
		if (currentPair && !isAnimating) {
			setDisplayPair(currentPair);
		}
	}, [currentPair, isAnimating]);

	// Calculate current scores
	const currentScores = useMemo(() => {
		return calculateScores(itemCount, wins, losses, boostedIndices);
	}, [itemCount, wins, losses, boostedIndices]);

	// Check for ties
	const hasTies = !hasNoTies(currentScores);

	// Update no ties achieved
	useEffect(() => {
		if (!hasTies && !noTiesAchieved && history.length > 0) {
			setNoTiesAchieved(true);
		}
	}, [hasTies, noTiesAchieved, history.length]);

	const handleVote = useCallback(
		(winnerLocalIdx) => {
			if (isAnimating || !displayPair) return;

			const winnerIdx = displayPair[winnerLocalIdx];
			const loserIdx = displayPair[1 - winnerLocalIdx];

			setSelectedSide(winnerLocalIdx === 0 ? 'left' : 'right');
			setIsAnimating(true);

			// Save to history for undo
			setHistory((prev) => [
				...prev,
				{
					wins: [...wins],
					losses: [...losses],
					activePool: [...activePool],
					currentPairIndex,
					roundWinners: [...roundWinners],
					roundNumber,
					allPairIndex,
					previousMatchup,
					recentItems: [...recentItems],
				},
			]);

			// Update wins/losses
			setWins((prev) => {
				const newWins = [...prev];
				newWins[winnerIdx]++;
				return newWins;
			});

			setLosses((prev) => {
				const newLosses = [...prev];
				newLosses[loserIdx]++;
				return newLosses;
			});

			// Update recent items
			setRecentItems((prev) => {
				const updated = [winnerIdx, loserIdx, ...prev].slice(0, 4);
				return updated;
			});

			// Save as previous matchup
			setPreviousMatchup({
				left: displayPair[0],
				right: displayPair[1],
				winner: winnerIdx,
			});

			setTimeout(() => {
				if (mode === 'all') {
					setAllPairIndex((prev) => prev + 1);
				} else {
					// Tournament mode
					setRoundWinners((prev) => [...prev, winnerIdx]);

					const nextPairIndex = currentPairIndex + 1;
					const totalPairsInRound = Math.floor(activePool.length / 2);

					if (nextPairIndex >= totalPairsInRound) {
						// Round complete
						const newWinners = [...roundWinners, winnerIdx];

						// Handle odd item that didn't compete
						if (activePool.length % 2 === 1) {
							newWinners.push(activePool[activePool.length - 1]);
						}

						if (newWinners.length <= 1) {
							// Tournament complete - only one left
						} else {
							// Start new round with winners, shuffled to avoid repetition
							const shuffledWinners = shuffleArray(newWinners);
							setActivePool(shuffledWinners);
							setCurrentPairIndex(0);
							setRoundWinners([]);
							setRoundNumber((prev) => prev + 1);
						}
					} else {
						setCurrentPairIndex(nextPairIndex);
					}
				}

				setSelectedSide(null);
				setIsAnimating(false);
			}, 350);
		},
		[
			displayPair,
			isAnimating,
			mode,
			wins,
			losses,
			activePool,
			currentPairIndex,
			roundWinners,
			roundNumber,
			allPairIndex,
			previousMatchup,
			recentItems,
		],
	);

	// Undo handler
	const handleUndo = useCallback(() => {
		if (history.length === 0) return;

		const lastState = history[history.length - 1];
		setWins(lastState.wins);
		setLosses(lastState.losses);
		setActivePool(lastState.activePool);
		setCurrentPairIndex(lastState.currentPairIndex);
		setRoundWinners(lastState.roundWinners);
		setRoundNumber(lastState.roundNumber);
		setAllPairIndex(lastState.allPairIndex);
		setPreviousMatchup(lastState.previousMatchup);
		setRecentItems(lastState.recentItems);
		setHistory((prev) => prev.slice(0, -1));
	}, [history]);

	// Keyboard support
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				handleVote(0);
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				handleVote(1);
			} else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleUndo();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleVote, handleUndo]);

	const getItemDisplay = (localIdx) => {
		const originalIdx = includedIndices[localIdx];
		return data.rows[originalIdx][0] || `Item ${originalIdx + 1}`;
	};

	const getItemDetails = (localIdx) => {
		const originalIdx = includedIndices[localIdx];
		return data.rows[originalIdx];
	};

	// Calculate progress
	const progress = useMemo(() => {
		if (mode === 'all') {
			return (allPairIndex / allPairs.length) * 100;
		}
		// Tournament progress estimate
		const totalComparisons = history.length;
		const estimated = Math.ceil(Math.log2(itemCount)) * itemCount;
		return Math.min((totalComparisons / estimated) * 100, 95);
	}, [mode, allPairIndex, allPairs.length, history.length, itemCount]);

	const isComplete =
		mode === 'all'
			? allPairIndex >= allPairs.length
			: activePool.length <= 1 && roundWinners.length <= 1;

	if (isComplete || !displayPair) {
		// Auto-complete when tournament is done
		if (isComplete) {
			onComplete(currentScores);
		}
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="mx-auto max-w-4xl"
		>
			{/* Previous matchup reference */}
			<AnimatePresence>
				{previousMatchup ? (
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						className="absolute left-4 top-4 hidden max-w-xs rounded-lg border border-stone-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm lg:block"
					>
						<p className="mb-1 text-xs text-stone-400">Previous:</p>
						<p className="text-sm">
							<span
								className={
									previousMatchup.winner === previousMatchup.left
										? 'font-medium text-teal-600'
										: 'text-stone-400 line-through'
								}
							>
								{getItemDisplay(previousMatchup.left)}
							</span>
							<span className="mx-2 text-stone-300">vs</span>
							<span
								className={
									previousMatchup.winner === previousMatchup.right
										? 'font-medium text-teal-600'
										: 'text-stone-400 line-through'
								}
							>
								{getItemDisplay(previousMatchup.right)}
							</span>
						</p>
					</motion.div>
				) : null}
			</AnimatePresence>

			{/* No ties achieved banner */}
			<AnimatePresence>
				{noTiesAchieved ? (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="mb-6 flex items-center justify-between rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 p-4 text-white"
					>
						<div className="flex items-center gap-3">
							<span className="text-2xl">🎉</span>
							<div>
								<p className="font-medium">
									No ties! All items have unique scores.
								</p>
								<p className="text-sm text-teal-100">
									You can finish now or continue for more accuracy.
								</p>
							</div>
						</div>
						<motion.button
							onClick={() => onComplete(currentScores)}
							className="rounded-lg bg-white px-4 py-2 font-medium text-teal-600 transition-colors hover:bg-teal-50"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							Finish Now
						</motion.button>
					</motion.div>
				) : null}
			</AnimatePresence>

			{/* Mode toggle and undo */}
			<div className="mb-6 flex items-center justify-between">
				<motion.button
					onClick={handleUndo}
					disabled={history.length === 0}
					className="flex items-center gap-2 px-3 py-2 text-sm text-stone-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
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
					<kbd className="hidden rounded bg-stone-100 px-1.5 py-0.5 text-xs sm:inline">
						⌘Z
					</kbd>
				</motion.button>

				<div className="inline-flex rounded-lg bg-stone-100 p-1">
					<button
						onClick={() => setMode('tournament')}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
							mode === 'tournament'
								? 'bg-white text-slate-800 shadow-sm'
								: 'text-stone-500 hover:text-stone-700'
						}`}
					>
						⚡ Quick
					</button>
					<button
						onClick={() => setMode('all')}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
							mode === 'all'
								? 'bg-white text-slate-800 shadow-sm'
								: 'text-stone-500 hover:text-stone-700'
						}`}
					>
						📊 All Pairs
					</button>
				</div>
			</div>

			{/* Progress */}
			<div className="mb-6">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-sm text-stone-500">
						{mode === 'tournament' ? `Round ${roundNumber}` : 'Progress'}
					</span>
					<span className="text-sm font-medium text-slate-700">
						{mode === 'all'
							? `${allPairIndex + 1} of ${allPairs.length}`
							: `${history.length + 1} comparisons`}
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-stone-200">
					<motion.div
						className="h-full bg-gradient-to-r from-teal-400 to-cyan-500"
						animate={{ width: `${progress}%` }}
						transition={{ duration: 0.5, ease: 'easeOut' }}
					/>
				</div>
				{mode === 'tournament' && (
					<p className="mt-2 text-center text-xs text-stone-400">
						{activePool.length} items remaining in pool
					</p>
				)}
			</div>

			<p className="mb-6 text-center text-lg text-slate-600">
				Which do you prefer?
			</p>

			{/* Voting cards - side by side */}
			<div className="grid grid-cols-2 gap-4 sm:gap-6">
				<AnimatePresence mode="wait">
					<motion.button
						key={`${displayPair[0]}-left-${history.length}`}
						onClick={() => handleVote(0)}
						disabled={isAnimating}
						className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-300 sm:p-8 ${
							selectedSide === 'left'
								? 'border-teal-500 bg-teal-50'
								: 'border-stone-200 bg-white/90 backdrop-blur-sm hover:border-teal-300 hover:shadow-lg'
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
						exit={{ opacity: 0, x: -30 }}
						whileHover={{ scale: selectedSide ? 1 : 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<div className="absolute right-3 top-3 rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-400">
							←
						</div>
						<div className="pt-2 sm:pt-4">
							<h3 className="mb-2 break-words pr-8 text-lg font-semibold text-slate-800 sm:text-xl">
								{getItemDisplay(displayPair[0])}
							</h3>
							{data.headers.length > 1 && (
								<div className="space-y-1">
									{data.headers.slice(1).map((header, idx) => (
										<p
											key={header}
											className="text-xs text-stone-500 sm:text-sm"
										>
											<span className="font-medium">{header}:</span>{' '}
											{getItemDetails(displayPair[0])[idx + 1]}
										</p>
									))}
								</div>
							)}
						</div>
						{selectedSide === 'left' && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="absolute bottom-3 right-3"
							>
								<svg
									className="size-6 text-teal-500 sm:size-8"
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
						)}
					</motion.button>

					<motion.button
						key={`${displayPair[1]}-right-${history.length}`}
						onClick={() => handleVote(1)}
						disabled={isAnimating}
						className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-300 sm:p-8 ${
							selectedSide === 'right'
								? 'border-teal-500 bg-teal-50'
								: 'border-stone-200 bg-white/90 backdrop-blur-sm hover:border-teal-300 hover:shadow-lg'
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
						exit={{ opacity: 0, x: 30 }}
						whileHover={{ scale: selectedSide ? 1 : 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<div className="absolute right-3 top-3 rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-400">
							→
						</div>
						<div className="pt-2 sm:pt-4">
							<h3 className="mb-2 break-words pr-8 text-lg font-semibold text-slate-800 sm:text-xl">
								{getItemDisplay(displayPair[1])}
							</h3>
							{data.headers.length > 1 && (
								<div className="space-y-1">
									{data.headers.slice(1).map((header, idx) => (
										<p
											key={header}
											className="text-xs text-stone-500 sm:text-sm"
										>
											<span className="font-medium">{header}:</span>{' '}
											{getItemDetails(displayPair[1])[idx + 1]}
										</p>
									))}
								</div>
							)}
						</div>
						{selectedSide === 'right' && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="absolute bottom-3 right-3"
							>
								<svg
									className="size-6 text-teal-500 sm:size-8"
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
						)}
					</motion.button>
				</AnimatePresence>
			</div>

			<motion.p
				className="mt-6 text-center text-sm text-stone-400"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.5 }}
			>
				Press{' '}
				<kbd className="rounded bg-stone-200 px-2 py-0.5 font-mono text-xs text-stone-600">
					←
				</kbd>{' '}
				or{' '}
				<kbd className="rounded bg-stone-200 px-2 py-0.5 font-mono text-xs text-stone-600">
					→
				</kbd>{' '}
				• Click to select
			</motion.p>

			{/* Finish early button */}
			{history.length >= itemCount && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="mt-6 text-center"
				>
					<motion.button
						onClick={() => onComplete(currentScores)}
						className="rounded-lg bg-stone-100 px-6 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						Finish & See Results
					</motion.button>
				</motion.div>
			)}
		</motion.div>
	);
}

// Results step component
function ResultsStep({ data, includedIndices, scores, onRestart }) {
	const [copied, setCopied] = useState(false);

	const sortedData = useMemo(() => {
		const indexed = includedIndices.map((originalIdx, localIdx) => ({
			row: data.rows[originalIdx],
			score: scores[localIdx],
			originalIndex: originalIdx,
		}));
		indexed.sort((a, b) => b.score - a.score);
		return indexed;
	}, [data.rows, includedIndices, scores]);

	const newHeaders = [...data.headers, 'score'];
	const newRows = sortedData.map(({ row, score }) => [
		...row,
		score.toFixed(2),
	]);
	const csvContent = generateCSV(newHeaders, newRows);

	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(csvContent);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
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
					className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-cyan-100"
					initial={{ rotate: -180, opacity: 0 }}
					animate={{ rotate: 0, opacity: 1 }}
					transition={{ type: 'spring', duration: 0.8 }}
				>
					<svg
						className="size-8 text-teal-600"
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
				<h2 className="mb-2 text-2xl font-bold text-slate-800">
					Ranking Complete!
				</h2>
				<p className="text-stone-500">Here are your ranked results</p>
			</motion.div>

			<div className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white/90 shadow-sm backdrop-blur-sm">
				<div className="max-h-96 overflow-auto">
					<table className="w-full">
						<thead className="sticky top-0 border-b border-stone-200 bg-stone-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
									Rank
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
									{data.headers[0]}
								</th>
								{data.headers.slice(1).map((header) => (
									<th
										key={header}
										className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 sm:table-cell"
									>
										{header}
									</th>
								))}
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
									Score
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-stone-100">
							{sortedData.map(({ row, score }, idx) => (
								<motion.tr
									key={idx}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: idx * 0.05 }}
									className="transition-colors hover:bg-stone-50"
								>
									<td className="whitespace-nowrap px-4 py-3">
										<span
											className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-medium ${
												idx === 0
													? 'bg-amber-100 text-amber-700'
													: idx === 1
														? 'bg-stone-200 text-stone-600'
														: idx === 2
															? 'bg-orange-100 text-orange-700'
															: 'bg-stone-100 text-stone-500'
											}`}
										>
											{idx + 1}
										</span>
									</td>
									<td className="px-4 py-3 font-medium text-slate-800">
										{row[0]}
									</td>
									{row.slice(1).map((cell, cellIdx) => (
										<td
											key={cellIdx}
											className="hidden px-4 py-3 text-stone-600 sm:table-cell"
										>
											{cell}
										</td>
									))}
									<td className="px-4 py-3">
										<div className="flex items-center gap-2">
											<div className="h-2 max-w-20 flex-1 overflow-hidden rounded-full bg-stone-100">
												<motion.div
													className="h-full bg-gradient-to-r from-teal-400 to-cyan-500"
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
											<span className="w-12 text-right text-sm font-medium text-slate-700">
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

			<div className="mb-6 rounded-xl bg-slate-800 p-4">
				<div className="mb-3 flex items-center justify-between">
					<span className="text-sm font-medium text-slate-400">CSV Output</span>
					<div className="flex gap-2">
						<motion.button
							onClick={handleCopy}
							className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-600"
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
							className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-teal-500"
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
				<pre className="max-h-40 overflow-auto font-mono text-xs leading-relaxed text-slate-400">
					{csvContent}
				</pre>
			</div>

			<motion.button
				onClick={onRestart}
				className="w-full rounded-xl border-2 border-stone-300 px-6 py-3 font-medium text-slate-700 transition-all hover:border-stone-400 hover:bg-stone-50"
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				Start New Comparison
			</motion.button>
		</motion.div>
	);
}

// Main App component
export default function PairwiseVote() {
	const [step, setStep] = useState(0);
	const [data, setData] = useState(null);
	const [includedIndices, setIncludedIndices] = useState(null);
	const [boostedIndices, setBoostedIndices] = useState(null);
	const [finalScores, setFinalScores] = useState(null);

	const steps = ['Upload', 'Filter', 'Vote', 'Results'];

	const handleDataLoaded = useCallback((loadedData) => {
		setData(loadedData);
		setStep(1);
	}, []);

	const handleFilterComplete = useCallback((indices, boosted) => {
		setIncludedIndices(indices);
		setBoostedIndices(boosted);
		setStep(2);
	}, []);

	const handleVotingComplete = useCallback((scores) => {
		setFinalScores(scores);
		setStep(3);
	}, []);

	const handleRestart = useCallback(() => {
		setStep(0);
		setData(null);
		setIncludedIndices(null);
		setBoostedIndices(null);
		setFinalScores(null);
	}, []);

	return (
		<div
			className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50"
			style={{
				fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
			}}
		>
			<link
				href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
				rel="stylesheet"
			/>

			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute right-0 top-0 size-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-teal-200 opacity-20 blur-3xl" />
				<div className="absolute bottom-0 left-0 size-[500px] -translate-x-1/3 translate-y-1/2 rounded-full bg-amber-200 opacity-25 blur-3xl" />
				<div className="absolute left-1/2 top-1/2 size-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-200 opacity-15 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
				<motion.header
					className="mb-8 text-center sm:mb-12"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
						Pairwise
					</h1>
					<p className="text-base text-stone-500 sm:text-lg">
						Rank items by comparing pairs
					</p>
				</motion.header>

				<StepIndicator currentStep={step} steps={steps} />

				<AnimatePresence mode="wait">
					{step === 0 && (
						<UploadStep key="upload" onDataLoaded={handleDataLoaded} />
					)}
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
```