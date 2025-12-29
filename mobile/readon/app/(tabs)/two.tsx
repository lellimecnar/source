import { useColorScheme } from 'nativewind';
import { Button, Text, View } from 'react-native';

export default function TabTwoScreen(): JSX.Element {
	// eslint-disable-next-line @typescript-eslint/unbound-method -- Don't care
	const { toggleColorScheme } = useColorScheme();
	return (
		<View className="container">
			<Text className="text-xl font-bold !text-sky-700">Tab Two</Text>
			<Button title="Toggle Color Scheme" onPress={toggleColorScheme} />
		</View>
	);
}
