import { FlatList, Text, View } from 'react-native';

const cards = Array.from({ length: 12 }).map((_, i) => i + 1);
export default function TabOneScreen(): JSX.Element {
	return (
		<View className="container justify-start">
			<FlatList
				data={cards}
				className="flex flex-col gap-2"
				renderItem={({ item }) => (
					<View
						className={`card min-h-32 w-full ${item > 1 ? 'mt-2' : ''}`}
						key={`card-${item}`}
					>
						<Text className="text-xl font-bold">Card {item}</Text>
					</View>
				)}
			/>
		</View>
	);
}
