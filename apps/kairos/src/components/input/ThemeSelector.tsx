import { useCompute } from 'feature-react/state';
import React from 'react';
import { Pressable, View } from 'react-native';
import {
	MoonIcon,
	SmartphoneIcon,
	SunIcon,
	type TNamedAppIconProps
} from '@/components/display/icons';
import { useSettingsCx, type TThemePreference } from '@/features/settings';
import { cn } from '@/lib';
import { useTheme } from '../provider';

export const ThemeSelector: React.FC = () => {
	const settingsCx = useSettingsCx();
	const themePreference = useCompute(settingsCx.$settings, (value) => value.appearance.theme);
	const { tokens } = useTheme();

	const options = React.useMemo<{ value: TThemePreference; Icon: React.FC<TNamedAppIconProps> }[]>(
		() => [
			{ value: 'system', Icon: SmartphoneIcon },
			{ value: 'light', Icon: SunIcon },
			{ value: 'dark', Icon: MoonIcon }
		],
		[]
	);

	// MARK: - UI

	return (
		<View className="border-base-200 bg-base-100 flex-row rounded-full border p-1">
			{options.map(({ value, Icon }) => (
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
					<Icon size={16} color={themePreference === value ? tokens.base900 : tokens.base500} />
				</Pressable>
			))}
		</View>
	);
};
