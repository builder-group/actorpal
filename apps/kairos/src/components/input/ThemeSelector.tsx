import Feather from '@expo/vector-icons/Feather';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSettingsCx, type TThemePreference } from '@/features/settings';
import { cn } from '@/lib';
import { useTheme } from '../provider';

export const ThemeSelector: React.FC = () => {
	const settingsCx = useSettingsCx();
	const themePreference = useCompute(settingsCx.$settings, ({ value }) => value.appearance.theme);
	const { tokens } = useTheme();

	const options = React.useMemo<
		{ value: TThemePreference; icon: React.ComponentProps<typeof Feather>['name'] }[]
	>(
		() => [
			{ value: 'system', icon: 'smartphone' },
			{ value: 'light', icon: 'sun' },
			{ value: 'dark', icon: 'moon' }
		],
		[]
	);

	// MARK: - UI

	return (
		<View className="border-base-200 bg-base-100 flex-row rounded-full border p-1">
			{options.map(({ value, icon }) => (
				<Pressable
					key={value}
					onPress={() => settingsCx.update({ appearance: { theme: value } })}
					accessibilityRole="radio"
					accessibilityState={{ checked: themePreference === value }}
					className={cn(
						'items-center justify-center rounded-full px-4 py-2',
						themePreference === value && 'bg-base-0'
					)}
				>
					<Feather
						name={icon}
						size={16}
						color={themePreference === value ? tokens.base900 : tokens.base500}
					/>
				</Pressable>
			))}
		</View>
	);
};
