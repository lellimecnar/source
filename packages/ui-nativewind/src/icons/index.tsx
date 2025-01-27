import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { cssInterop } from 'nativewind';

const RemappedMaterialIcons = cssInterop(MaterialIcons, {
	className: {
		target: 'style',
		nativeStyleToProp: {
			color: 'color',
			width: 'size',
			height: 'size',
		},
	},
});
export type IconProps = React.ComponentProps<typeof MaterialIcons>;
export const Ico = Object.assign(
	cssInterop(
		({ style, color, size, ...props }: IconProps): JSX.Element => {
			return (
				<RemappedMaterialIcons
					style={style}
					color={color}
					size={size}
					{...props}
				/>
			);
		},
		{
			className: {
				target: 'style',
				nativeStyleToProp: {
					color: 'color',
					width: 'size',
					height: 'size',
				},
			},
		},
	),
	{
		...MaterialIcons,
	},
);
