import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useTheme } from '@/components/provider';
import { hexToRgba } from '@/lib';

export const AppTabs: React.FC = () => {
	const { tokens } = useTheme();

	const tabColors = React.useMemo(
		() => ({
			background: hexToRgba(tokens.base0, 0.85),
			indicator: tokens.primary,
			iconDefault: tokens.base500,
			iconSelected: tokens.base900,
			labelDefault: tokens.base500,
			labelSelected: tokens.base900
		}),
		[tokens]
	);

	return (
		<NativeTabs
			blurEffect="systemChromeMaterial"
			backgroundColor={tabColors.background}
			indicatorColor={tabColors.indicator}
			iconColor={{ default: tabColors.iconDefault, selected: tabColors.iconSelected }}
			labelStyle={{
				default: { color: tabColors.labelDefault, fontSize: 12, fontWeight: '500' },
				selected: { color: tabColors.labelSelected, fontSize: 12, fontWeight: '600' }
			}}
		>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="settings">
				<NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon
					sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
					md="settings"
				/>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
};
