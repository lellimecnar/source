import { Header as DefaultHeader } from '@react-navigation/elements';
import { Stack as DefaultStack, Tabs as DefaultTabs } from 'expo-router';

import Colors from '@/const/colors';

type ScreenOptions = React.ComponentProps<
	typeof DefaultStack
>['screenOptions'] extends infer T | undefined
	? T extends (...args: any[]) => any
		? never
		: Required<T>
	: never;
type NativeStackHeaderProps = Parameters<ScreenOptions['header']>[0];

type TabHeaderProps = Parameters<
	Exclude<TabScreenOptions['header'], undefined>
>[0];
type DefaultHeaderProps = React.ComponentProps<typeof DefaultHeader>;
export type HeaderProps =
	| DefaultHeaderProps
	| NativeStackHeaderProps
	| TabHeaderProps;

export function Header(props: HeaderProps): React.JSX.Element;
export function Header(props: Record<string, any>): React.JSX.Element {
	let options: NativeStackHeaderProps['options'] | undefined;

	if ('options' in props && typeof props.options === 'object') {
		({ options, ...props } = props);
	}

	return (
		<DefaultHeader
			{...options}
			{...(props as DefaultHeaderProps)}
			headerStyle={[
				{
					backgroundColor: Colors.dark.headerBackground,
					borderBottomColor: Colors.dark.headerBorder,
				},
				options?.headerStyle,
				props.headerStyle,
			]}
		/>
	);
}

export type StackProps = React.ComponentProps<typeof DefaultStack>;

type StackScreenOptions = StackProps['screenOptions'] extends
	| undefined
	| infer T
	? T extends (...args: any[]) => any
		? never
		: T
	: never;

export function Stack({ screenOptions, ...props }: StackProps): JSX.Element {
	return (
		<DefaultStack
			{...props}
			screenOptions={(...args): StackScreenOptions => {
				if (typeof screenOptions === 'function') {
					screenOptions = screenOptions(...args);
				}

				const opts: StackScreenOptions = {
					header: Header,
					statusBarStyle: 'auto',
					...screenOptions,
					headerTintColor: Colors.dark.headerText,
					headerStyle: [
						{
							backgroundColor: Colors.dark.headerBackground,
							borderColor: Colors.dark.headerBorder,
							borderBottomWidth: 2,
						} as any,
						screenOptions?.headerStyle,
					],
					contentStyle: [
						{
							backgroundColor: Colors.dark.background,
						},
						screenOptions?.contentStyle,
					],
				};

				// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- false positive
				return opts;
			}}
		/>
	);
}

const DefaultStackScreen = DefaultStack.Screen;
export type StackScreenProps = React.ComponentProps<typeof DefaultStackScreen>;

Stack.Screen = DefaultStackScreen;
// Stack.Screen = function StackScreen(props: StackScreenProps): JSX.Element {
// 	return (
// 		<DefaultStackScreen
// 			{...props}
// 			options={{
// 				...props.options,
// 				sceneStyle: {
// 					backgroundColor: Colors.dark.background,
// 					...props.options?.sceneStyle,
// 				},
// 				// header: Header,
// 			}}
// 		/>
// 	);
// };

export type TabsProps = React.ComponentProps<typeof DefaultTabs>;

type TabScreenOptions = TabsProps['screenOptions'] extends infer T | undefined
	? T extends (...args: any[]) => any
		? never
		: T
	: never;

export function Tabs({ screenOptions, ...props }: TabsProps): JSX.Element {
	return (
		<DefaultTabs
			{...props}
			screenOptions={(...args): TabScreenOptions => {
				if (typeof screenOptions === 'function') {
					screenOptions = screenOptions(...args);
				}

				const opts: TabScreenOptions = {
					...screenOptions,
					tabBarActiveTintColor: Colors.dark.tint,
					headerStyle: [
						{
							backgroundColor: Colors.dark.headerBackground,
							borderColor: Colors.dark.headerBorder,
							borderBottomWidth: 2,
						},
						screenOptions?.headerStyle,
					],
					headerTintColor: Colors.dark.headerText,
					tabBarStyle: [
						{
							backgroundColor: Colors.dark.headerBackground,
							borderTopColor: Colors.dark.headerBorder,
							borderTopWidth: 2,
							borderColor: Colors.dark.headerBorder,
						},
						screenOptions?.tabBarStyle,
					],
					tabBarInactiveTintColor: Colors.dark.headerText,
					sceneStyle: [
						{
							backgroundColor: Colors.dark.background,
						},
						screenOptions?.sceneStyle,
					],
					header: Header,
				};

				// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- false positive
				return opts;
			}}
		/>
	);
}

const DefaultTabsScreen = DefaultTabs.Screen;
export type TabsScreenProps = React.ComponentProps<typeof DefaultTabsScreen>;

Tabs.Screen = DefaultTabsScreen;
// Tabs.Screen = function TabsScreen(props: TabsScreenProps): JSX.Element {
// 	return (
// 		<DefaultTabsScreen
// 			{...props}
// 			options={{
// 				...props.options,
// 				sceneStyle: {
// 					backgroundColor: Colors.dark.background,
// 					...props.options?.sceneStyle,
// 				},
// 				header: Header,
// 			}}
// 		/>
// 	);
// };
