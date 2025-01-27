import { Tabs as ERTabs } from 'expo-router';
import { cssInterop } from 'nativewind';

type DefaultTabsProps = React.ComponentProps<typeof ERTabs>;
const DefaultTabs = ERTabs as unknown as React.ComponentType<
	Omit<DefaultTabsProps, 'screenOptions'> & {
		screenOptions?: Exclude<
			DefaultTabsProps['screenOptions'],
			((...args: any[]) => any) | undefined
		>;
	}
>;

type DefaultTabsScreenProps = React.ComponentProps<typeof ERTabs.Screen>;
const DefaultTabsScreen =
	ERTabs.Screen as unknown as React.ForwardRefExoticComponent<
		Omit<DefaultTabsScreenProps, 'options'> & {
			options?: Exclude<
				DefaultTabsScreenProps['options'],
				((...args: any[]) => any) | undefined
			>;
		}
	>;

export const Tabs = Object.assign(
	cssInterop(DefaultTabs, {
		headerClassName: {
			target: 'headerStyle',
			nativeStyleToProp: { color: 'headerTintColor' },
		},
		headerPressClassName: {
			target: false,
			nativeStyleToProp: { color: 'headerPressColor' },
		},
		headerBackgroundClassName: 'headerBackgroundStyle',
		headerTitleClassName: 'headerTitleStyle',
		headerTitleContainerClassName: 'headerTitleContainerStyle',
		headerBackTitleClassName: 'headerBackTitleStyle',
		headerLeftContainerClassName: 'headerLeftContainerStyle',
		headerRightContainerClassName: 'headerRightContainerStyle',
		sceneClassName: 'sceneStyle',
		tabBarClassName: {
			target: 'tabBarStyle',
			nativeStyleToProp: {
				color: 'tabBarInactiveTintColor',
				backgroundColor: 'tabBarInactiveBackgroundColor',
			},
		},
		tabBarActiveClassName: {
			target: false,
			nativeStyleToProp: {
				color: 'tabBarActiveTintColor',
				backgroundColor: 'tabBarActiveBackgroundColor',
			},
		},
		tabBarItemClassName: 'tabBarItemStyle',
		tabBarItemContainerClassName: 'tabBarItemContainerStyle',
		tabBarIndicatorClassName: 'tabBarIndicatorStyle',
		tabBarLabelClassName: 'tabBarLabelStyle',
		tabBarLabelContainerClassName: 'tabBarLabelContainerStyle',
		tabBarIconClassName: 'tabBarIconStyle',
		tabBarBadgeClassName: 'tabBarBadgeStyle',
	}),
	{
		Screen: cssInterop(DefaultTabsScreen, {
			sceneClassName: 'options.sceneStyle',
			headerClassName: {
				target: 'options.headerStyle',
				nativeStyleToProp: { color: 'options.headerTintColor' },
			},
			headerPressClassName: {
				target: false,
				nativeStyleToProp: { color: 'options.headerPressColor' },
			},
			headerBackgroundContainerClassName:
				'options.headerBackgroundContainerStyle',
			headerTitleClassName: 'options.headerTitleStyle',
			headerTitleContainerClassName: 'options.headerTitleContainerStyle',
			headerBackTitleClassName: 'options.headerBackTitleStyle',
			headerLeftContainerClassName: 'options.headerLeftContainerStyle',
			headerRightContainerClassName: 'options.headerRightContainerStyle',
			tabBarClassName: {
				target: 'options.tabBarStyle',
				nativeStyleToProp: {
					color: 'options.tabBarInactiveTintColor',
					backgroundColor: 'options.tabBarInactiveBackgroundColor',
				},
			},
			tabBarActiveClassName: {
				target: false,
				nativeStyleToProp: {
					color: 'options.tabBarActiveTintColor',
					backgroundColor: 'options.tabBarActiveBackgroundColor',
				},
			},
			tabBarItemClassName: 'options.tabBarItemStyle',
			tabBarLabelClassName: 'options.tabBarLabelStyle',
			tabBarIconClassName: 'options.tabBarIconStyle',
			tabBarBadgeClassName: 'options.tabBarBadgeStyle',
		}),
	},
);

export type TabsProps = React.ComponentProps<typeof Tabs>;
export type TabsScreenProps = React.ComponentProps<typeof Tabs.Screen>;
