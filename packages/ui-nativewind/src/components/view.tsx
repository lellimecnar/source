import { remapProps } from 'nativewind';
import { View as DefaultView } from 'react-native';

export const View = remapProps(DefaultView, {
	className: 'style',
});

export type ViewProps = React.ComponentProps<typeof View>;
