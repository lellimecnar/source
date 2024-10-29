import { useMemo } from 'react';

import { XIcon } from '@lellimecnar/ui/icons';
import { cn } from '@lellimecnar/ui/lib';

import { useFormContext, useFormValues } from './_form';
import { toFraction } from './_utils';

export function Preview(): JSX.Element {
	const form = useFormContext();
	const { size } = useFormValues(form);

	return (
		<div className="box-border flex max-h-full max-w-full grow items-center justify-center">
			<svg
				viewBox={`0 0 ${String(size)} ${String(size)}`}
				xmlns="http://www.w3.org/2000/svg"
				vectorEffect="non-scaling-stroke"
				className="aspect-square max-h-full max-w-full bg-white shadow-md lg:max-w-[75%]"
			>
				<Grid />
				<Folds />
				<Box />
				<Dimensions />
				<Form />
			</svg>
		</div>
	);
}

// let formTimeout: NodeJS.Timeout | string | number | undefined;

const inputStyle = cn(
	'w-[60px] rounded-md border-[3px] border-sky-700 bg-white px-[8px] py-[6px] text-center text-[18px] font-bold',
);
function Form(): JSX.Element {
	const form = useFormContext();

	return (
		<foreignObject width="100%" height="100%" x="0" y="0">
			<div className="absolute inset-0 flex items-center justify-center align-middle text-[20px] leading-none text-black">
				<div className="grid grid-cols-5 items-center justify-center text-center text-sm font-bold">
					<span className="">width</span>
					<span className="" />
					<span className="">length</span>
					<span className="" />
					<span className="">height</span>
					<input
						type="text"
						{...form.register('width')}
						className={inputStyle}
					/>
					<span className="flex items-center justify-center">
						<XIcon size={24} />
					</span>
					<input
						type="text"
						{...form.register('length')}
						className={inputStyle}
					/>
					<span className="flex items-center justify-center">
						<XIcon size={24} />
					</span>
					<input
						type="text"
						{...form.register('height')}
						className={inputStyle}
					/>
				</div>
			</div>
		</foreignObject>
	);
}

function Grid(): JSX.Element {
	const { IN, center, sizeInches, size } = useFormValues();

	const squares = useMemo(
		() => Array.from({ length: sizeInches }).map((_, i) => i + 1),
		[sizeInches],
	);

	return (
		<>
			<defs>
				<pattern id="grid" width={IN} height={IN} patternUnits="userSpaceOnUse">
					<path
						d={`M ${IN} 0 L 0 0 0 ${IN}`}
						fill="none"
						stroke="#94a3b8"
						strokeWidth="1"
						strokeDasharray="4 3"
					/>
					<path
						d={`M ${IN * 0.25} 0 L ${IN * 0.25} ${IN}`}
						fill="none"
						stroke="rgba(0,0,0,0.3)"
						strokeWidth="0.5"
						strokeDasharray={`1 ${IN / 4 - 1}`}
					/>
					<path
						d={`M ${IN * 0.5} 0 L ${IN * 0.5} ${IN}`}
						fill="none"
						stroke="rgba(0,0,0,0.3)"
						strokeWidth="0.5"
						strokeDasharray={`1 ${IN / 4 - 1}`}
					/>
					<path
						d={`M ${IN * 0.75} 0 L ${IN * 0.75} ${IN}`}
						fill="none"
						stroke="rgba(0,0,0,0.3)"
						strokeWidth="0.5"
						strokeDasharray={`1 ${IN / 4 - 1}`}
					/>
				</pattern>
			</defs>
			<rect
				width={size}
				height={size}
				fill="url(#grid)"
				stroke="black"
				strokeWidth="1"
			/>
			<path
				d={`M 0 ${center} L ${size} ${center}`}
				fill="none"
				stroke="#b91c1c"
				strokeWidth="2"
				strokeDasharray="4 3"
			/>
			{squares.map((n, i) => (
				<>
					<text
						x={IN * i + IN - 6}
						y={5}
						dominantBaseline="hanging"
						textAnchor="end"
						fontSize="14"
					>
						{n}
					</text>
					<text x={5} y={IN * i + IN - 6} dominantBaseline="end" fontSize="14">
						{n}
					</text>
				</>
			))}
		</>
	);
}

function Box(): JSX.Element {
	const { rotate, size, width, length, center } = useFormValues();
	const x = useMemo(() => (size - width) / 2, [size, width]);
	const y = useMemo(() => (size - length) / 2, [size, length]);

	return (
		<g
			width={size}
			height={size}
			transform={`rotate(${rotate} ${center} ${center})`}
		>
			<rect
				width={width}
				height={length}
				fill="rgb(14 165 233 / 0.8)"
				stroke="#0369a1"
				strokeWidth="4"
				x={x}
				y={y}
			/>
		</g>
	);
}

function Folds(): JSX.Element {
	const { size, rotate, center, width, length, height } = useFormValues();
	const x = useMemo(() => (size - width) / 2, [size, width]);
	const y = useMemo(() => (size - length) / 2, [size, length]);

	return (
		<g
			width={size}
			height={size}
			transform={`rotate(${rotate} ${center} ${center})`}
		>
			<rect
				width={width}
				height={height}
				stroke="#0369a1"
				strokeWidth={2}
				strokeDasharray="6 4"
				fill="none"
				x={x}
				y={y - height}
			/>
			<rect
				width={height}
				height={length}
				stroke="#0369a1"
				strokeWidth={2}
				strokeDasharray="6 4"
				fill="none"
				x={x - height}
				y={y}
			/>
			<rect
				width={height}
				height={length}
				stroke="#0369a1"
				strokeWidth={2}
				strokeDasharray="6 4"
				fill="none"
				x={x + width}
				y={y}
			/>
			<rect
				width={width}
				height={height}
				stroke="#0369a1"
				strokeWidth={2}
				strokeDasharray="6 4"
				fill="none"
				x={x}
				y={y + length}
			/>
		</g>
	);
}

function Dimensions(): JSX.Element {
	const { center, diagonal, size, rotate, length } = useFormValues();
	const _length = useMemo(() => (size - diagonal) / 2, [size, diagonal]);

	const α = (rotate * Math.PI) / 180;
	const c = length;
	const a = c * Math.sin(α);
	const b = c * Math.cos(α);

	const x = a + _length;
	const len = size / 2 - b;

	return (
		<g width={size} height={size} x={0} y={0}>
			<Dimension start={[1, center]} length={_length} />
			<Dimension start={[x, 1]} length={len} vertical />
			<Dimension start={[size - _length, 1]} length={center} vertical />
		</g>
	);
}

const capSize = 24;

function Dimension({
	start,
	length,
	vertical,
}: {
	start: [number, number];
	length: number;
	vertical?: true;
}): JSX.Element {
	start = useMemo(() => [start[0], start[1] - capSize], [...start, vertical]);
	const end = useMemo(
		() => [start[0] + length, start[1]],
		[...start, length, vertical],
	);
	const { IN } = useFormValues();
	const label = useMemo(() => toFraction(length / IN), [length]);

	return (
		<g
			transform={
				vertical ? `rotate(90 ${start[0]} ${start[1] + capSize})` : undefined
			}
		>
			<defs>
				<marker
					id="bracket-cap"
					refX="0"
					refY="0"
					markerUnits="userSpaceOnUse"
					viewBox={`0 0 1 ${capSize}`}
					markerWidth={capSize}
					markerHeight={capSize}
					orient="auto"
				>
					<path d={`M 0 0 L 0 ${capSize}`} stroke="black" strokeWidth="1" />
				</marker>
			</defs>
			<polyline
				points={`${start.join(',')} ${end.join(',')}`}
				stroke="black"
				strokeWidth="1"
				fill="none"
				markerStart="url(#bracket-cap)"
				markerEnd="url(#bracket-cap)"
			/>
			<text
				x={start[0] + length / 2}
				y={start[1]}
				textAnchor={vertical ? 'start' : 'middle'}
				transform={
					vertical
						? `rotate(-90, ${start[0] + length / 2} ${start[1] - 9})`
						: `translate(0, -8)`
				}
				fontSize="24"
				fontWeight={600}
			>
				{label}&quot;
			</text>
		</g>
	);
}
