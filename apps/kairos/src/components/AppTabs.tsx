import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useTheme } from '@/hooks';

export const AppTabs: React.FC = () => {
	const theme = useTheme();

	return (
		<NativeTabs
			backgroundColor={theme.background}
			indicatorColor={theme.backgroundElement}
			labelStyle={{ selected: { color: theme.text } }}
		>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon
					src={require('@/assets/images/tabIcons/home.png')}
					renderingMode="template"
				/>
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="explore">
				<NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon
					src={require('@/assets/images/tabIcons/explore.png')}
					renderingMode="template"
				/>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
};
