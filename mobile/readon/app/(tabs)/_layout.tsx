/* eslint-disable react/no-unstable-nested-components -- ignore */
import { Link } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

import { Ico } from '@/components/icons';
import { Tabs } from '@/components/themed';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
	name: React.ComponentProps<typeof Ico>['name'];
	color: string;
}): JSX.Element {
	return <Ico size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout(): JSX.Element {
	return (
		<Tabs>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Tab One',
					tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
					headerRight: ({ tintColor }) => (
						<Link href="/modal" asChild>
							<Pressable>
								{({ pressed }) => (
									<Ico
										name="info-outline"
										size={25}
										color={tintColor}
										style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
									/>
								)}
							</Pressable>
						</Link>
					),
				}}
			/>
			<Tabs.Screen
				name="two"
				options={{
					title: 'Tab Two',
					tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
				}}
			/>
		</Tabs>
	);
}
