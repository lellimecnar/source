import { Link, Stack } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function NotFoundScreen(): JSX.Element {
	return (
		<>
			<Stack.Screen options={{ title: 'Oops!' }} />
			<View className="container">
				<Text className="text-xl font-bold">
					This screen doesn&rsquo;t exist.
				</Text>

				<Link href="/" className="mt-2 py-2">
					<Text className="text-sky-400">Go to home screen!</Text>
				</Link>
			</View>
		</>
	);
}
