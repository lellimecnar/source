import { Text, View } from 'react-native';

export default function ModalScreen(): React.JSX.Element {
	return (
		<View className="container !bg-transparent">
			<Text className="text-xl font-bold text-green-700">Modal</Text>

			{/* Use a light status bar on iOS to account for the black space above the modal */}
			{/* <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} /> */}
		</View>
	);
}
