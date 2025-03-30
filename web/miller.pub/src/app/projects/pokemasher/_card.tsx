import { cn } from '@lellimecnar/ui/lib';

import {
	getPokemonImg,
	getPokemonTypeIcon,
	type Pokemon,
	type PokemonType,
} from './_data';

interface TypeIconProps
	extends Omit<React.HTMLAttributes<HTMLImageElement>, 'src'> {
	type: PokemonType;
}

function TypeIcon({ type, className, ...props }: TypeIconProps): JSX.Element {
	return (
		<div className="flex flex-row items-center space-x-2 px-4">
			<img
				src={getPokemonTypeIcon(type)}
				alt={type}
				className={cn(
					`border-white border-[3px]`,
					`w-full rounded-full m-0`,
					`shadow-[2px_2px_4px_2px_rgba(0,0,0,0.15),0_0_2px_2px_rgba(0,0,0,0.1)]`,
					className,
				)}
				{...props}
			/>
		</div>
	);
}

export interface PokemonCardProps {
	pokemon: Pokemon;
	unknown?: boolean;
}
export function PokemonCard({
	pokemon: { name, num, type, type2 },
	unknown,
}: PokemonCardProps): JSX.Element {
	return (
		<div
			className={cn(
				'w-[2.5in] h-[3.5in] rounded-lg border-[8px] border-[#FED104] px-2 py-1 flex flex-col items-center justify-start space-y-1',
				`shadow-poke-card-${type.toLowerCase()} bg-gradient-to-br from-poke-${type.toLowerCase()}-200 to-poke-${(type2 ?? type).toLowerCase()}-50`,
			)}
		>
			<div className="z-0 flex w-full flex-row items-center justify-between space-x-4">
				<h3 className="m-0 text-lg font-medium text-black">{name}</h3>
			</div>
			<div
				className={cn(
					'relative !min-h-[150px] !max-h-[150px] w-full shadow-[2px_2px_5px_2px_rgba(0,0,0,0.45)] p-[3px] flex items-center justify-center m-0',
					// `bg-conic-[from_315deg_at_50%_50%,#9C5C05_0%,#FDD855_12%,#FDD855_19%,#D0900B_25%,#FED104_30%,#FDD855_40%,#D4A707_49%,#E7BA07_50%,#F7DF8B_56%,#E7AE0A_72%,#9C5C05_75%,#F7DF8B_76%,#FED104_90%,#9C5C05_100%]`,
					// `backdrop-hue-rotate-[-45deg] backdrop-brightness-[0.7] backdrop-saturate-[1.4]`,
				)}
				style={{
					backgroundImage: `repeating-conic-gradient(from 305deg at 50% 50%, #9C5C05 0%, #FDD855 12%, #FDD855 19%, #D0900B 31%, #FED104 36%, #FDD855 40%, #D4A707 50%, #E7BA07 52%, #F7DF8B 56%, #E7AE0A 72%, #9C5C05 80.2%, #F7DF8B 80.7%, #FED104 90%, #9C5C05 100%)`,
				}}
			>
				<div
					className={cn(
						'absolute inset-[4px] overflow-hidden flex items-center justify-center',
						`bg-gradient-to-b to-poke-${type.toLowerCase()}-800 from-poke-${(type2 ?? type).toLowerCase()}-600`,
						`shadow-poke-img-${type.toLowerCase()}-inner`,
					)}
				>
					<img
						className={cn(
							'size-[140px]',
							`drop-shadow-poke-img-${type.toLowerCase()}`,
							unknown && 'brightness-0 opacity-30 blur-[3px] scale-150',
						)}
						src={getPokemonImg(num)}
						alt={name}
					/>
				</div>
				{unknown ? (
					<div
						className={cn(
							'absolute text-[80px] font-bold',
							`drop-shadow-poke-img-${type.toLowerCase()}-unknown`,
						)}
					>
						?
					</div>
				) : null}
				<div
					className="absolute bottom-0 right-[10%] flex h-[16px] w-[65px] translate-y-1/2 items-center justify-center rounded-full text-[12px] font-semibold leading-none text-black shadow-[1px_1px_3px_2px_rgba(0,0,0,0.3)]"
					style={{
						backgroundImage: `linear-gradient(-45deg, #9C5C05 0%, #FDD855 10%, #FDD855 30%, #D4A707 40%, #FED104 60%, #FDD855 70%, #D4A707 100%)`,
					}}
				>
					No. {`0000${num}`.slice(-4)}
				</div>
			</div>
			<div className="z-0 flex size-full flex-col justify-between space-y-4 py-4">
				<TypeIcon type={type} />
				{type2 ? <TypeIcon type={type2} /> : null}
			</div>
		</div>
	);
}
