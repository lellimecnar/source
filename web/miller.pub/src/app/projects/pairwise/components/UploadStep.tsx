'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
	type ChangeEvent,
	type DragEvent,
	useCallback,
	useRef,
	useState,
} from 'react';

import { parseCSV } from '../lib/csv';
import type { ParsedCsv } from '../types';

export interface UploadStepProps {
	onDataLoaded: (data: ParsedCsv) => void;
}

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === 'string') {
				resolve(result);
				return;
			}
			reject(new Error('Unexpected file contents'));
		};
		reader.readAsText(file);
	});
}

export function UploadStep({ onDataLoaded }: UploadStepProps): JSX.Element {
	const [dragActive, setDragActive] = useState(false);
	const [textInput, setTextInput] = useState('');
	const [error, setError] = useState('');
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const processData = useCallback(
		(text: string) => {
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

	const handleDrag = useCallback((event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (event.type === 'dragenter' || event.type === 'dragover') {
			setDragActive(true);
		} else if (event.type === 'dragleave') {
			setDragActive(false);
		}
	}, []);

	const handleDrop = useCallback(
		async (event: DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();
			setDragActive(false);

			const file = event.dataTransfer.files[0];
			if (!file) {
				return;
			}

			if (!(file.type === 'text/csv' || file.name.endsWith('.csv'))) {
				setError('Please drop a valid CSV file.');
				return;
			}

			try {
				const text = await readFileAsText(file);
				processData(text);
			} catch {
				setError('Failed to read the CSV file.');
			}
		},
		[processData],
	);

	const handleFileChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}

			try {
				void readFileAsText(file).then((text) => {
					processData(text);
				});
			} catch {
				setError('Failed to read the CSV file.');
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
						? 'border-primary bg-primary/10'
						: 'border-border bg-card/80 hover:border-muted-foreground/50 backdrop-blur-sm'
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
						className="text-muted-foreground mx-auto size-16"
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
				<p className="text-foreground mb-2 text-lg font-medium">
					Drop your CSV file here
				</p>
				<p className="text-muted-foreground text-sm">or click to browse</p>
			</motion.div>

			<div className="relative my-8">
				<div className="absolute inset-0 flex items-center">
					<div className="border-border w-full border-t" />
				</div>
				<div className="relative flex justify-center text-sm">
					<span className="bg-background text-muted-foreground px-4">
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
					onChange={(e) => {
						setTextInput(e.target.value);
					}}
					placeholder={`name,category\nItem 1,A\nItem 2,B\nItem 3,A`}
					className="border-border bg-card/80 text-foreground placeholder:text-muted-foreground focus:ring-ring h-48 w-full resize-none rounded-xl border p-4 font-mono text-sm backdrop-blur-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2"
				/>
				<motion.button
					onClick={handlePaste}
					disabled={!textInput.trim()}
					className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 w-full rounded-xl px-6 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
						className="text-destructive mt-4 text-center text-sm"
					>
						{error}
					</motion.p>
				) : null}
			</AnimatePresence>
		</motion.div>
	);
}
