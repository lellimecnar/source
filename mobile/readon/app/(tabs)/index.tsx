import { Text, View } from 'react-native';

import { FlatList } from '@/components/themed';

const cards = Array.from({ length: 12 }).map((_, i) => i + 1);

export default function TabOneScreen(): JSX.Element {
	return (
		<View className="container justify-start p-0">
			<FlatList
				data={cards}
				contentContainerClassName="flex flex-col py-2 gap-2 !min-w-full"
				renderItem={({ item }) => (
					<View className="card min-h-32 w-full" key={`card_${item}`}>
						<Text className="text-xl font-bold">Card #{String(item)}</Text>
						<Text className="text-sm">Some stuff</Text>
						<Text className="text-sm">Some more stuff</Text>
						<Text className="text-sm">Some other stuff</Text>
					</View>
				)}
			/>
		</View>
	);
}
