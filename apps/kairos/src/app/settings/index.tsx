import { useRouter } from 'expo-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ThemeSelector } from '@/components';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';

const Screen: React.FC = () => {
	const router = useRouter();
	const settingsCx = useSettingsCx();
	const timerCx = useTimerCx();
	const themePreference = useCompute(settingsCx.$settings, ({ value }) => value.appearance.theme);

	const handleClearRecents = (): void => {
		Alert.alert('Clear Recents', 'Remove all recent timer configurations?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Clear',
				style: 'destructive',
				onPress: () => timerCx.clearRecents()
			}
		]);
	};

	const handleResetApp = (): void => {
		Alert.alert(
			'Reset App',
			'This will reset all timer settings, recents, and preferences to their defaults.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Reset',
					style: 'destructive',
					onPress: () => {
						timerCx.reset();
						settingsCx.reset();
					}
				}
			]
		);
	};

	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			<Section title="App">
				<Row label="About" onPress={() => router.push('/settings/about')} />
			</Section>

			<Section title="Appearance">
				<View className="px-4 py-4">
					<Text className="text-base-500 dark:text-base-400 mb-3 text-sm">
						Theme: {themePreference}
					</Text>
					<ThemeSelector />
				</View>
			</Section>

			<Section title="Data">
				<Row label="Clear Recents" onPress={handleClearRecents} warning />
				<Row label="Reset App" onPress={handleResetApp} destructive />
			</Section>
		</ScrollView>
	);
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
	return (
		<View className="px-4 pb-6">
			<Text className="text-base-500 dark:text-base-400 mb-2 px-3 text-xs font-semibold uppercase">
				{title}
			</Text>
			<View className="bg-base-0 dark:bg-base-100 overflow-hidden rounded-2xl">{children}</View>
		</View>
	);
};

const Row: React.FC<{
	label: string;
	onPress: () => void;
	destructive?: boolean;
	warning?: boolean;
}> = ({ label, onPress, destructive = false, warning = false }) => {
	const tone = destructive
		? 'text-danger'
		: warning
			? 'text-warning'
			: 'text-base-900 dark:text-base-50';

	return (
		<Pressable
			onPress={onPress}
			className="border-base-200 dark:border-base-200 flex-row items-center justify-between border-b px-4 py-4 last:border-b-0"
		>
			<Text className={`${tone} text-base`}>{label}</Text>
			<Text className="text-base-400 dark:text-base-500 text-base">›</Text>
		</Pressable>
	);
};

export default Screen;
