import { useMemo } from 'react';

import { useFormContext, useFormValues } from './_form';
import { toFraction } from './_utils';

declare module 'react' {
	interface SVGAttributes<T> extends AriaAttributes, DOMAttributes<T> {
		transformOrigin?: string;
	}
}

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
				className="mb-4 max-h-full max-w-full rounded-md border border-neutral-300 bg-white p-2 shadow-md"
			>
				<Grid />
				<Box />
				<Folds />
				<Dimensions />
			</svg>
			<h3>Instructions</h3>
			<ol className="max-w-2xl">
				<li>
					Cut out a{' '}
					<span className="rounded-md border border-background bg-foreground px-1 font-bold text-background">
						{sizeWFr}&quot;&nbsp;&times;&nbsp;{sizeHFr}&quot;
					</span>{' '}
					{isSquare ? `square` : 'rectangle'} of wrapping paper.
				</li>
				<li>
					Measure{' '}
					<span className="rounded-md border border-background bg-foreground px-1 font-bold text-background">
						{centerFr}&quot;
					</span>{' '}
					from the top to mark the center line.{' '}
					<span className="rounded-md border border-red-100 bg-red-700 px-1 font-semibold text-red-100">
						(red dotted line)
					</span>
				</li>
				<li>
					Measure{' '}
					<span className="rounded-md border border-background bg-foreground px-1 font-bold text-background">
						{fromEdgeFr}&quot;
					</span>{' '}
					from the left edge to mark the first corner of the box.
				</li>
				<li>
					Align two opposite corners of the box to the center line{' '}
					<span className="rounded-md border border-red-100 bg-red-700 px-1 font-semibold text-red-100">
						(red dotted line)
					</span>{' '}
					<span className="rounded-md border border-background bg-foreground px-1 font-bold text-background">
						{fromEdgeFr}&quot;
					</span>{' '}
					from the left edge, as shown in the diagram above.
				</li>
				<li>
					Starting at opposing edges, fold the wrapping paper over the top of
					the box, overlapping them in the middle.{' '}
					<span className="rounded-md border border-orange-600 bg-orange-300 px-1 font-semibold text-orange-600">
						(orange dotted line)
					</span>
				</li>
				<li>
					Fold over the other two edges, tucking the corners inward.{' '}
					<span className="rounded-md border border-green-100 bg-green-700 px-1 font-semibold text-green-100">
						(green dash-dotted line)
					</span>
				</li>
				<li>
					Tape down the wrapping paper over the top of the box, in an
					&ldquo;X&rdquo; pattern.{' '}
					<span className="rounded-md border border-yellow-600 bg-yellow-300 px-1 font-semibold text-yellow-600">
						(yellow dotted line)
					</span>
				</li>
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
			<defs>
				<g id="top" width={sizeW} height={sizeH}>
					<rect
						width={width}
						height={height}
						stroke="#0369a1"
						strokeWidth={3}
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
						strokeWidth={3}
						strokeDasharray="6 4"
					/>
					<line
						x1={x + width}
						y1={y + length + height}
						x2={x + width}
						y2={y + length * 10}
						stroke="#0369a1"
						opacity={0.5}
						strokeWidth={3}
						strokeDasharray="6 4"
					/>
				</g>
				<g id="right" width={sizeW} height={sizeH}>
					<rect
						width={height}
						height={length}
						stroke="#0369a1"
						strokeWidth={3}
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
						strokeWidth={3}
						strokeDasharray="6 4"
					/>
					<line
						x1={x - height}
						y1={y + length}
						x2={x * -10}
						y2={y + length}
						stroke="#0369a1"
						opacity={0.5}
						strokeWidth={3}
						strokeDasharray="6 4"
					/>
				</g>
				<g id="bottom" width={sizeW} height={sizeH}>
					<rect
						width={width}
						height={height}
						stroke="#0369a1"
						strokeWidth={3}
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
						strokeWidth={3}
						strokeDasharray="6 4"
						opacity={0.5}
					/>
					<line
						x1={x + width}
						y1={y - height}
						x2={x + width}
						y2={y * -10}
						stroke="#0369a1"
						strokeWidth={3}
						strokeDasharray="6 4"
						opacity={0.5}
					/>
				</g>
				<g id="left" width={sizeW} height={sizeH}>
					<rect
						width={height}
						height={length}
						stroke="#0369a1"
						strokeWidth={3}
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
						strokeWidth={3}
						strokeDasharray="6 4"
					/>
					<line
						x1={x + width + height}
						y1={y + length}
						x2={x + width * 10}
						y2={y + length}
						stroke="#0369a1"
						opacity={0.5}
						strokeWidth={3}
						strokeDasharray="6 4"
					/>
				</g>
				<g id="corners" width={sizeW} height={sizeH}>
					<line
						x1={x + width}
						y1={y + length}
						x2={x + width}
						y2={y + length * 10}
						stroke="#047857"
						opacity={0.5}
						strokeWidth={3}
						strokeDasharray="6 4 2 4"
						transform={`rotate(-45 ${x + width} ${y + length})`}
					/>
					<line
						x1={x}
						y1={y + length}
						x2={x * -10}
						y2={y + length}
						stroke="#047857"
						opacity={0.5}
						strokeWidth={3}
						strokeDasharray="6 4 2 4"
						transform={`rotate(-45 ${x} ${y + length})`}
					/>
					<line
						x1={x + width}
						y1={y}
						x2={x + width}
						y2={y * -10}
						stroke="#047857"
						strokeWidth={3}
						strokeDasharray="6 4 3 4"
						opacity={0.5}
						transform={`rotate(45 ${x + width} ${y})`}
					/>
					<line
						x1={x}
						y1={y}
						x2={x}
						y2={y * -10}
						stroke="#047857"
						strokeWidth={3}
						strokeDasharray="6 4 2 4"
						opacity={0.5}
						transform={`rotate(-45 ${x} ${y})`}
					/>
				</g>
				<mask id="box">
					<rect width={width} height={length} x={x} y={y} fill="white" />
				</mask>
				<mask id="paper" width={sizeW} height={sizeH}>
					<rect
						width={sizeW}
						height={sizeH}
						fill="white"
						transform={`rotate(${-rotate} ${sizeW / 2} ${sizeH / 2})`}
					/>
				</mask>
				<rect
					id="overlap"
					width={sizeW}
					height={sizeH}
					transform={`rotate(${-rotate} ${sizeW / 2} ${sizeH / 2})`}
				/>
				<g
					id="overlap"
					width={sizeW}
					height={sizeH}
					mask="url(#paper)"
					maskUnits="userSpaceOnUse"
					overflow="visible"
				>
					<rect x={x} y={y + length + height} width={width} height={sizeH} />
					<rect x={x - width - height} y={y} width={width} height={length} />
					<rect x={x} y={y - length - height} width={width} height={length} />
					<rect x={x + width + height} y={y} width={width} height={length} />
				</g>
			</defs>
			<g width={sizeW} height={sizeH}>
				<use href="#top" />
				<use href="#right" />
				<use href="#bottom" />
				<use href="#left" />
				<use href="#corners" />
			</g>
			<g
				width={sizeW}
				height={sizeH}
				stroke="#fde047"
				strokeWidth={3}
				strokeDasharray="3 3"
				fill="none"
				mask="url(#box)"
			>
				<use
					href="#overlap"
					transform={`scale(1 -1) translate(0 ${-length - height})`}
					transformOrigin={`${sizeW / 2} ${sizeH / 2}`}
				/>
				<use
					href="#overlap"
					transform={`scale(1 -1) translate(0 ${length + height})`}
					transformOrigin={`${sizeW / 2} ${sizeH / 2}`}
				/>
			</g>
			<g
				width={sizeW}
				height={sizeH}
				stroke="#fdba74"
				strokeWidth={3}
				strokeDasharray="3 3"
				fill="none"
				mask="url(#box)"
			>
				<use
					href="#overlap"
					transform={`scale(-1 1) translate(${-width - height} 0)`}
					transformOrigin={`${sizeW / 2} ${sizeH / 2}`}
				/>
				<use
					href="#overlap"
					transform={`scale(-1 1) translate(${width + height} 0)`}
					transformOrigin={`${sizeW / 2} ${sizeH / 2}`}
				/>
			</g>
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
			<path
				d={`M 0 ${sizeH / 2} L ${sizeW} ${sizeH / 2}`}
				fill="none"
				stroke="#b91c1c"
				strokeWidth="3"
				strokeDasharray="3 3"
			/>
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
					<path d={`M 0 0 L 0 ${capSize}`} stroke="black" strokeWidth="3" />
				</marker>
			</defs>
			<polyline
				points={`${start.join(',')} ${end.join(',')}`}
				stroke="black"
				strokeWidth="3"
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
