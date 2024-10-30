import { useMemo } from 'react';

import { cn, tw } from '@lellimecnar/ui/lib';

import { SWATCH_GAP, SWATCH_H, SWATCH_W } from './_const';
import { type Color } from './_data';

export interface SectionProps {
	colors: Color[];
	count: number;
	index: number;
	width: number;
	showGrid: boolean;
	showNumber: boolean;
}

export function Section({
	colors,
	count,
	index,
	width,
	showGrid,
	showNumber,
}: SectionProps): JSX.Element {
	return (
		<div
			className={cn(
				'break-inside-avoid-page',
				'box-content text-black bg-white shadow-lg border border-neutral-400 rounded-sm',
				'print:mr-[-1px] print:mb-[-1px]print:border print:border-neutral-400 print:border-dashed print:shadow-none print:rounded-none',
			)}
			style={{
				minWidth: tw.w(width, true),
				maxWidth: tw.w(width, true),
				width: tw.w(width, true),
			}}
		>
			<div
				className={cn(
					'flex flex-row items-center justify-between',
					'w-full min-h-4',
					`p-${String(SWATCH_GAP)} pb-0`,
				)}
			>
				<span className="text-[0.8rem]">
					Ohuhu Honolulu Series{' '}
					{showNumber ? (
						<>– Color Swatch {count > 1 ? index + 1 : null}</>
					) : null}
				</span>
				{showGrid ? <SectionMap count={count} index={index} /> : null}
			</div>
			<div
				className={cn(
					`flex flex-wrap gap-${String(SWATCH_GAP)} p-${String(SWATCH_GAP)}`,
				)}
			>
				{colors.map((color) => (
					<Swatch {...color} key={color.name} />
				))}
			</div>
		</div>
	);
}

function SectionMap({
	count,
	index,
}: {
	count: number;
	index: number;
}): JSX.Element | null {
	const { cols, rows } = useMemo(
		() => ({
			cols: Math.ceil(Math.sqrt(count)),
			rows: Math.round(Math.sqrt(count)),
		}),
		[count],
	);

	if (count < 2) {
		return null;
	}

	return (
		<div className="flex flex-col justify-start border-l border-t border-black">
			{Array.from({ length: rows }).map((_, row) => (
				<div
					className="flex flex-row flex-nowrap justify-start"
					key={`${String(row)}_of_${String(rows)}`}
				>
					{Array.from({ length: cols }).map((_a, col) => {
						const num = row * cols + col;

						return num >= count ? null : (
							<div
								className={cn(
									'border-r border-b border-black size-3',
									index === num && 'bg-neutral-500',
								)}
								style={{
									printColorAdjust: 'exact',
								}}
							/>
						);
					})}
				</div>
			))}
		</div>
	);
}

type SwatchProps = Color;

function Swatch({ name, family, sequence }: SwatchProps): JSX.Element {
	return (
		<div
			className={cn(
				`w-${String(SWATCH_W)}`,
				'relative text-[0.4rem] leading-[1em] flex flex-col gap-[0.25em]',
			)}
		>
			<div
				className={cn(
					`h-${String(SWATCH_H)}`,
					'box-border border-2 border-black w-full relative',
				)}
			>
				<div className="absolute bottom-0 right-0 border-l border-t border-black p-[0.1rem] font-bold">
					{family}
					{sequence}
				</div>
			</div>
			<div
				className={cn('text-center text-[0.4rem] h-[2em] leading-[1em] grow')}
			>
				{name}
			</div>
		</div>
	);
}
