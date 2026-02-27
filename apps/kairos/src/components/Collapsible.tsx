import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Spacing } from '@/environment';
import { useTheme } from '@/hooks';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export const Collapsible: React.FC<TCollapsibleProps> = (props) => {
	const { children, title } = props;
	const [isOpen, setIsOpen] = React.useState(false);
	const theme = useTheme();

	const handlePress = React.useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	return (
		<ThemedView>
			<Pressable
				style={({ pressed }) => [styles.heading, pressed && styles.pressedHeading]}
				onPress={handlePress}
			>
				<ThemedView type="backgroundElement" style={styles.button}>
					<SymbolView
						name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
						size={14}
						weight="bold"
						tintColor={theme.text}
						style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
					/>
				</ThemedView>

				<ThemedText type="small">{title}</ThemedText>
			</Pressable>

			{isOpen && (
				<Animated.View entering={FadeIn.duration(200)}>
					<ThemedView type="backgroundElement" style={styles.content}>
						{children}
					</ThemedView>
				</Animated.View>
			)}
		</ThemedView>
	);
};

interface TCollapsibleProps {
	children?: React.ReactNode;
	title: string;
}

const styles = StyleSheet.create({
	heading: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.two
	},
	pressedHeading: {
		opacity: 0.7
	},
	button: {
		width: Spacing.four,
		height: Spacing.four,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	content: {
		marginTop: Spacing.three,
		borderRadius: Spacing.three,
		marginLeft: Spacing.four,
		padding: Spacing.four
	}
});
