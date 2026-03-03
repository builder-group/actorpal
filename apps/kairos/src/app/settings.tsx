import React from 'react';
import { Text, View } from 'react-native';
import { ThemeSelector, useTheme } from '@/components';

const Screen: React.FC = () => {
	const { theme } = useTheme();

	return (
		<View className="bg-base-0 flex-1 px-6 pt-16">
			<Text className="text-base-900 text-4xl font-semibold tracking-tight">Settings</Text>
			<Text className="text-base-500 mt-3 text-sm">Theme: {theme}</Text>

			<View className="border-base-200 bg-base-50 mt-8 rounded-2xl border p-5">
				<Text className="text-base-900 text-base font-medium">Appearance</Text>
				<Text className="text-base-500 mt-1 text-sm">
					Choose light, dark, or follow the system.
				</Text>
				<View className="mt-4 flex-row items-center justify-between">
					<Text className="text-base-900 text-sm font-medium">Theme</Text>
					<ThemeSelector />
				</View>
			</View>
		</View>
	);
};

export default Screen;
