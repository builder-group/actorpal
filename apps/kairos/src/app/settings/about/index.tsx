import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { appConfig } from '@/environment';

function openMail(subject: string): void {
	Linking.openURL(appConfig.support.mailto(subject)).catch(() => undefined);
}

function openURL(url: string): void {
	Linking.openURL(url).catch(() => undefined);
}

const Screen: React.FC = () => {
	const appStoreURL = appConfig.links.appStore;

	return (
		<ScrollView
			className="dark:bg-base-0 bg-base-50 flex-1"
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			<View className="items-center px-6 pt-8 pb-6">
				<Text className="text-base-900 dark:text-base-50 text-xl font-bold">{appConfig.name}</Text>
				<Text className="text-base-500 dark:text-base-400 mt-2 text-center text-sm">
					A reason to look up from your phone
				</Text>
			</View>

			<Section title="Feedback">
				<Row label="Send Feedback" onPress={() => openMail('Feedback')} />
				<Row label="Request a Feature" onPress={() => openMail('Feature Request')} />
				<Row label="Report a Bug" onPress={() => openMail('Bug Report')} />
			</Section>

			<Section title="Links">
				{appStoreURL != null ? <Row label="App Store" onPress={() => openURL(appStoreURL)} /> : null}
				<Row label="Website" onPress={() => openURL(appConfig.links.website)} />
				<Row label="GitHub" onPress={() => openURL(appConfig.links.github)} />
				<Row label="Privacy Policy" onPress={() => openURL(appConfig.links.privacyPolicy)} />
			</Section>

			<View className="items-center px-6 pt-6 pb-10">
				<Text className="text-base-400 dark:text-base-500 text-xs">Version {appConfig.version}</Text>
				<Text className="text-base-300 dark:text-base-600 mt-1 text-xs">© 2025 builder.group</Text>
			</View>
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

const Row: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
	return (
		<Pressable
			onPress={onPress}
			className="border-base-200 dark:border-base-200 flex-row items-center justify-between border-b px-4 py-4 last:border-b-0"
		>
			<Text className="text-base-900 dark:text-base-50 text-base">{label}</Text>
			<Text className="text-base-400 dark:text-base-500 text-base">›</Text>
		</Pressable>
	);
};

export default Screen;
