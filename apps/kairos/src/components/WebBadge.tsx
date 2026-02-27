import { Image } from 'expo-image';
import { version } from 'expo/package.json';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Spacing } from '@/environment';
import { useColorScheme } from '@/hooks';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export const WebBadge: React.FC = () => {
	const scheme = useColorScheme();
	const isDark = scheme === 'dark';

	const imageSource = React.useMemo(
		() =>
			isDark
				? require('@/assets/images/expo-badge-white.png')
				: require('@/assets/images/expo-badge.png'),
		[isDark]
	);

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="code" themeColor="textSecondary" style={styles.versionText}>
				v{version}
			</ThemedText>
			<Image source={imageSource} style={styles.badgeImage} />
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: Spacing.five,
		alignItems: 'center',
		gap: Spacing.two
	},
	versionText: {
		textAlign: 'center'
	},
	badgeImage: {
		width: 123,
		aspectRatio: 123 / 24
	}
});
