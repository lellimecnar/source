import { useMemo } from 'react';

import { useFormContext, useFormValues } from './_form';
import { toFraction } from './_utils';

export function Preview(): JSX.Element {
	const form = useFormContext();
	const { sizeW, sizeH, sizeWIN, sizeHIN, fromEdgeIN } = useFormValues(form);
	const sizeWFr = toFraction(sizeWIN);
	const sizeHFr = toFraction(sizeHIN);
	const isSquare = sizeWFr === sizeHFr;
	const centerFr = toFraction(sizeHIN / 2);
	const fromEdgeFr = toFraction(fromEdgeIN);

	return (
		<div className="box-border flex max-h-full max-w-full grow flex-col items-center justify-center">
			<svg
				viewBox={`0 0 ${String(sizeW)} ${String(sizeH)}`}
				xmlns="http://www.w3.org/2000/svg"
				vectorEffect="non-scaling-stroke"
				className="mb-4 max-h-full max-w-full bg-white shadow-md lg:max-w-[75%]"
			>
				<Grid />
				<Folds />
				<Box />
				<Dimensions />
				{/* <Form /> */}
			</svg>
			<h3>Instructions</h3>
			<ol className="max-w-2xl">
				<li>
					Cut out a{' '}
					<span className="font-bold">
						{sizeWFr}&quot;&nbsp;&times;&nbsp;{sizeHFr}&quot;{' '}
					</span>
					{isSquare ? `square` : 'rectangle'} of wrapping paper.
				</li>
				<li>
					Measure <span className="font-bold">{centerFr}&quot;</span> from the
					top to mark the center line. (red dashed line)
				</li>
				<li>
					Measure <span className="font-bold">{fromEdgeFr}&quot;</span> from the
					left edge to mark the first corner of the box.
				</li>
				<li>
					Align two opposite corners of the box to the center line (red dashed
					line) <span className="font-bold">{fromEdgeFr}&quot;</span> from the
					left edge, as shown in the diagram above.
				</li>
				<li />
				<li />
			</ol>
		</div>
	);
}

function Grid(): JSX.Element {
	const { IN, sizeInches, sizeW, sizeH } = useFormValues();

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
				width={sizeW}
				height={sizeH}
				fill="url(#grid)"
				stroke="black"
				strokeWidth="1"
			/>
			<path
				d={`M 0 ${sizeH / 2} L ${sizeW} ${sizeH / 2}`}
				fill="none"
				stroke="#b91c1c"
				strokeWidth="2"
				strokeDasharray="4 3"
			/>
			{squares.map((n, i) => (
				<>
					{Math.ceil(sizeW) / IN >= i && (
						<text
							x={IN * i + IN - 6}
							y={6}
							dominantBaseline="hanging"
							textAnchor="end"
							fontSize="14"
						>
							{n}
						</text>
					)}
					{Math.ceil(sizeH / IN) >= i && (
						<text
							x={6}
							y={IN * i + IN - 6}
							dominantBaseline="end"
							fontSize="14"
						>
							{n}
						</text>
					)}
				</>
			))}
		</>
	);
}

function Box(): JSX.Element {
	const { rotate, width, sizeW, sizeH, length } = useFormValues();
	const x = useMemo(() => (sizeW - width) / 2, [sizeW, width]);
	const y = useMemo(() => (sizeH - length) / 2, [sizeH, length]);

	return (
		<g
			width={sizeW}
			height={sizeH}
			transform={`rotate(${rotate} ${sizeW / 2} ${sizeH / 2})`}
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
	const { sizeW, sizeH, rotate, width, length, height } = useFormValues();
	const x = useMemo(() => (sizeW - width) / 2, [sizeW, width]);
	const y = useMemo(() => (sizeH - length) / 2, [sizeH, length]);

	return (
		<g
			width={sizeW}
			height={sizeH}
			transform={`rotate(${rotate} ${sizeW / 2} ${sizeH / 2})`}
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
			<line
				x1={x}
				y1={y - height}
				x2={x}
				y2={y * -10}
				stroke="#0369a1"
				strokeWidth="2"
				strokeDasharray="6 4"
				opacity={0.5}
			/>
			<line
				x1={x + width}
				y1={y - height}
				x2={x + width}
				y2={y * -10}
				stroke="#0369a1"
				strokeWidth="2"
				strokeDasharray="6 4"
				opacity={0.5}
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
			<line
				x1={x - height}
				y1={y}
				x2={x * -10}
				y2={y}
				stroke="#0369a1"
				opacity={0.5}
				strokeWidth="2"
				strokeDasharray="6 4"
			/>
			<line
				x1={x - height}
				y1={y + length}
				x2={x * -10}
				y2={y + length}
				stroke="#0369a1"
				opacity={0.5}
				strokeWidth="2"
				strokeDasharray="6 4"
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
			<line
				x1={x + width + height}
				y1={y}
				x2={x + width * 10}
				y2={y}
				stroke="#0369a1"
				opacity={0.5}
				strokeWidth="2"
				strokeDasharray="6 4"
			/>
			<line
				x1={x + width + height}
				y1={y + length}
				x2={x + width * 10}
				y2={y + length}
				stroke="#0369a1"
				opacity={0.5}
				strokeWidth="2"
				strokeDasharray="6 4"
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
			<line
				x1={x}
				y1={y + length + height}
				x2={x}
				y2={y + length * 10}
				stroke="#0369a1"
				opacity={0.5}
				strokeWidth="2"
				strokeDasharray="6 4"
			/>
			<line
				x1={x + width}
				y1={y + length + height}
				x2={x + width}
				y2={y + length * 10}
				stroke="#0369a1"
				opacity={0.5}
				strokeWidth="2"
				strokeDasharray="6 4"
			/>
		</g>
	);
}

function Dimensions(): JSX.Element {
	const { diagonal, sizeW, sizeH, sizeWIN, sizeHIN, rotate, width, length } =
		useFormValues();
	const _length = useMemo(() => (sizeW - diagonal) / 2, [sizeW, diagonal]);

	const α = (rotate * Math.PI) / 180;
	const a = Math.abs(width * Math.cos(α));
	const b = Math.abs(length * Math.cos(α));

	const x = a + _length;
	const len = sizeH / 2 - b;

	return (
		<g width={sizeW} height={sizeH} x={0} y={0}>
			<Dimension start={[1, sizeH / 2]} length={_length} />
			<Dimension start={[x, 1]} length={len} vertical />
			<Dimension start={[sizeW - _length, 1]} length={sizeH / 2} vertical />
			<text
				x={sizeW - 24}
				y={sizeH - 24}
				dominantBaseline="end"
				textAnchor="end"
				fontSize="24"
				fontWeight={700}
			>
				{toFraction(sizeWIN)}&quot;&nbsp;&times;&nbsp;{toFraction(sizeHIN)}
				&quot;
			</text>
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
					<path d={`M 0 0 L 0 ${capSize}`} stroke="black" strokeWidth="2" />
				</marker>
			</defs>
			<polyline
				points={`${start.join(',')} ${end.join(',')}`}
				stroke="black"
				strokeWidth="2"
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
