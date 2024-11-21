import { FlatList, Text, View } from 'react-native';

const cards = Array.from({ length: 12 }).map((_, i) => i + 1);
export default function TabOneScreen(): JSX.Element {
	return (
		<View className="container justify-start py-0">
			<FlatList
				data={cards}
				className="flex flex-col py-2"
				renderItem={({ item }) => (
					<View className="card mb-2 min-h-32 w-full" key={`card-${item}`}>
						<Text className="text-xl font-bold">Card {item}</Text>
						<Text className="text-sm">Some stuff</Text>
						<Text className="text-sm">Some more stuff</Text>
						<Text className="text-sm">Some other stuff</Text>
					</View>
				)}
			/>
		</View>
	);
}
