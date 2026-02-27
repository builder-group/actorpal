import {
	TabList,
	TabListProps,
	Tabs,
	TabSlot,
	TabTrigger,
	TabTriggerSlotProps
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, MaxContentWidth, Spacing } from '@/environment';
import { useColorScheme } from '@/hooks';
import { ExternalLink } from './ExternalLink';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export const AppTabs: React.FC = () => {
	return (
		<Tabs>
			<TabSlot style={{ height: '100%' }} />
			<TabList asChild>
				<CustomTabList>
					<TabTrigger name="home" href="/" asChild>
						<TabButton>Home</TabButton>
					</TabTrigger>
					<TabTrigger name="explore" href="/explore" asChild>
						<TabButton>Explore</TabButton>
					</TabTrigger>
				</CustomTabList>
			</TabList>
		</Tabs>
	);
};

export const TabButton: React.FC<TTabButtonProps> = (props) => {
	const { children, isFocused, ...rest } = props;

	return (
		<Pressable {...rest} style={({ pressed }) => pressed && styles.pressed}>
			<ThemedView
				type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
				style={styles.tabButtonView}
			>
				<ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
					{children}
				</ThemedText>
			</ThemedView>
		</Pressable>
	);
};

type TTabButtonProps = TabTriggerSlotProps;

export const CustomTabList: React.FC<TCustomTabListProps> = (props) => {
	const { children } = props;
	const scheme = useColorScheme();
	const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

	return (
		<View {...props} style={styles.tabListContainer}>
			<ThemedView type="backgroundElement" style={styles.innerContainer}>
				<ThemedText type="smallBold" style={styles.brandText}>
					Expo Starter
				</ThemedText>

				{children}

				<ExternalLink href="https://docs.expo.dev" asChild>
					<Pressable style={styles.externalPressable}>
						<ThemedText type="link">Doc</ThemedText>
						<SymbolView
							tintColor={colors.text}
							name={{ ios: 'arrow.up.right.square', web: 'link' }}
							size={12}
						/>
					</Pressable>
				</ExternalLink>
			</ThemedView>
		</View>
	);
};

type TCustomTabListProps = TabListProps;

const styles = StyleSheet.create({
	tabListContainer: {
		position: 'absolute',
		width: '100%',
		padding: Spacing.three,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row'
	},
	innerContainer: {
		paddingVertical: Spacing.two,
		paddingHorizontal: Spacing.five,
		borderRadius: Spacing.five,
		flexDirection: 'row',
		alignItems: 'center',
		flexGrow: 1,
		gap: Spacing.two,
		maxWidth: MaxContentWidth
	},
	brandText: {
		marginRight: 'auto'
	},
	pressed: {
		opacity: 0.7
	},
	tabButtonView: {
		paddingVertical: Spacing.one,
		paddingHorizontal: Spacing.three,
		borderRadius: Spacing.three
	},
	externalPressable: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: Spacing.one,
		marginLeft: Spacing.three
	}
});
